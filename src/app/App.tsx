import { useEffect, useMemo, useState } from "react";
import { db, getSettings } from "../db";
import type {
  ApplicationRecord,
  JobCapture,
  ResumeProfile,
  TailoringMode,
  TailoringRun,
  UserSettings,
} from "../domain";
import { JobCaptureSchema, newId, nowIso } from "../domain";
import {
  applyProposals,
  compactRun,
  DEFAULT_MODEL,
  generateRun,
  parseJob,
  recalculateRun,
  testGemini,
} from "../engine";
import { downloadBlob, renderResumePdf } from "../pdf";
import "../styles.css";

function ScoreCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="score-card">
      <span>{label}</span>
      <strong>{value.toFixed(1)}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

export function App() {
  const [profile, setProfile] = useState<ResumeProfile | null>(null),
    [settings, setSettings] = useState<UserSettings | null>(null),
    [capture, setCapture] = useState<JobCapture | null>(null),
    [run, setRun] = useState<TailoringRun | null>(null),
    [history, setHistory] = useState<ApplicationRecord[]>([]),
    [view, setView] = useState<"tailor" | "history">("tailor"),
    [mode, setMode] = useState<TailoringMode>("evidence_extrapolation"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [preview, setPreview] = useState(""),
    [previewPages, setPreviewPages] = useState(0);
  const model = settings?.modelOverride || DEFAULT_MODEL;
  const refresh = async () => {
    const [p, s, h] = await Promise.all([
      db.profiles.toCollection().first(),
      getSettings(),
      db.applications.orderBy("exportedAt").reverse().toArray(),
    ]);
    setProfile(p ?? null);
    setSettings(s);
    setHistory(h);
  };
  useEffect(() => {
    void (async () => {
      await refresh();
      if (new URLSearchParams(location.search).get("capture")) {
        const value = (await chrome.storage.local.get("pendingCapture"))
          .pendingCapture;
        if (value) {
          const parsed = JobCaptureSchema.safeParse(value);
          if (parsed.success) setCapture(parsed.data);
          await chrome.storage.local.remove("pendingCapture");
          window.history.replaceState({}, "", location.pathname);
        }
      }
    })();
  }, []);
  const finalProfile = useMemo(
    () => (run ? applyProposals(run.baseProfile, run.proposals) : profile),
    [run, profile],
  );
  useEffect(() => {
    let active = true,
      url = "";
    if (!run || !finalProfile) return;
    void renderResumePdf(finalProfile)
      .then((x) => {
        if (!active) return;
        url = URL.createObjectURL(x.blob);
        setPreview(url);
        setPreviewPages(x.pages);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [run, finalProfile]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const analyze = () =>
    act(async () => {
      if (!profile || !capture || !settings)
        throw new Error(
          "Complete resume onboarding and review a job capture first.",
        );
      if (settings.consentVersion < 1)
        throw new Error(
          "Cloud consent is required in Settings before Analyze.",
        );
      if (mode === "stress_test" && !settings.stressAcknowledged)
        throw new Error(
          "Acknowledge advanced stress-test mode in Settings first.",
        );
      await testGemini(model);
      const job = await parseJob(capture, model);
      const evidence = await db.evidence.toArray();
      const next = await generateRun(
        profile,
        evidence,
        job,
        mode,
        settings.pageTarget,
        model,
      );
      next.generation.calls += 1;
      await db.runs.put(next);
      setRun(next);
    });
  const decide = (
    id: string,
    decision: "accepted" | "rejected" | "edited",
    newValue?: string,
  ) => {
    if (!run) return;
    const next = recalculateRun({
      ...run,
      proposals: run.proposals.map((p) =>
        p.id === id ? { ...p, decision, newValue: newValue ?? p.newValue } : p,
      ),
    });
    setRun(next);
    void db.runs.put(next);
  };
  const editProposal = (id: string, newValue: string) => {
    if (!run) return;
    const next = recalculateRun({
      ...run,
      proposals: run.proposals.map((proposal) =>
        proposal.id === id
          ? { ...proposal, newValue, decision: "edited" }
          : proposal,
      ),
    });
    setRun(next);
    void db.runs.put(next);
  };
  const exportPdf = () =>
    act(async () => {
      if (!run || !finalProfile)
        throw new Error("No reviewed resume to export.");
      if (run.proposals.some((p) => p.decision === "pending"))
        throw new Error("Resolve every proposal before export.");
      if (
        run.proposals.some(
          (p) =>
            ["accepted", "edited"].includes(p.decision) &&
            p.factuality === "synthetic",
        )
      )
        throw new Error(
          "Synthetic stress-test claims cannot be exported. Reject or remove them first.",
        );
      const rendered = await renderResumePdf(finalProfile);
      if (rendered.pages > run.pageTarget)
        throw new Error(
          `The resume is ${rendered.pages} pages, above the selected ${run.pageTarget}-page limit. Use Compact or edit content.`,
        );
      const filename = `${finalProfile.name}-${run.job.company}-${run.job.role}-resume.pdf`;
      downloadBlob(rendered.blob, filename);
      const stamp = nowIso(),
        exported: { run: TailoringRun; record: ApplicationRecord } = {
          run: { ...run, status: "exported", updatedAt: stamp },
          record: {
            id: newId("application"),
            createdAt: run.createdAt,
            exportedAt: stamp,
            run: { ...run, status: "exported", updatedAt: stamp },
            finalProfile,
          },
        };
      await db.transaction("rw", db.runs, db.applications, async () => {
        await db.runs.put(exported.run);
        await db.applications.put(exported.record);
      });
      setRun(exported.run);
      setNotice(
        "PDF exported and structured application history saved locally.",
      );
      await refresh();
    });
  const compact = () =>
    act(async () => {
      if (!run) throw new Error("No run to compact.");
      const additions = await compactRun(run, model);
      if (!additions.length)
        throw new Error(
          "Gemini found no fact-preserving compactions that passed validation.",
        );
      const next = recalculateRun({
        ...run,
        proposals: [...run.proposals, ...additions],
        generation: { ...run.generation, calls: run.generation.calls + 1 },
      });
      await db.runs.put(next);
      setRun(next);
      setNotice(
        `${additions.length} page-fit proposal${additions.length === 1 ? "" : "s"} added for review.`,
      );
    });
  if (!settings)
    return (
      <main className="shell">
        <p>Loading local workspace…</p>
      </main>
    );
  if (!profile)
    return (
      <main className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">LOCAL-FIRST BYOK</p>
            <h1>Resume Toner</h1>
          </div>
        </header>
        <section className="panel empty-state">
          <h2>Set up your base resume</h2>
          <p>
            A guided, four-step setup explains your Gemini key, privacy and
            responsibilities before helping you prepare and import your career
            information. Resume Toner has no hosted backend.
          </p>
          <a className="button" href="options.html?onboarding=1">
            Start guided setup
          </a>
        </section>
      </main>
    );
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">TECHNICAL RESUME TAILOR</p>
          <h1>Resume Toner</h1>
        </div>
        <div className="top-actions">
          <span className="cloud-badge">
            Gemini BYOK · entire resume + listing
          </span>
          <button
            className={view === "tailor" ? "" : "secondary"}
            onClick={() => setView("tailor")}
          >
            Tailor
          </button>
          <button
            className={view === "history" ? "" : "secondary"}
            onClick={() => setView("history")}
          >
            History
          </button>
          <a className="button secondary" href="options.html">
            Settings
          </a>
        </div>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="success">{notice}</p>}
      {view === "history" ? (
        <section className="panel">
          <h2>Application history</h2>
          {!history.length && (
            <p className="muted">No exported applications yet.</p>
          )}
          {history.map((item) => (
            <article className="history-item" key={item.id}>
              <div>
                <strong>{item.run.job.role}</strong>
                <p>
                  {item.run.job.company} ·{" "}
                  {new Date(item.exportedAt).toLocaleString()}
                </p>
                <small>
                  Overall {item.run.proposedScore.overall} · Job Match{" "}
                  {item.run.proposedScore.jobMatch} · Resume Quality{" "}
                  {item.run.proposedScore.resumeQuality}
                </small>
              </div>
              <button
                className="danger-link"
                onClick={() =>
                  void act(async () => {
                    await db.applications.delete(item.id);
                    await refresh();
                  })
                }
              >
                Delete
              </button>
            </article>
          ))}
        </section>
      ) : !run ? (
        <section className="panel capture-form">
          <div className="section-head">
            <div>
              <p className="eyebrow">STEP 1</p>
              <h2>Review job capture</h2>
            </div>
            {!capture && (
              <span className="muted">
                Open a listing and use the toolbar popup, or paste manually.
              </span>
            )}
          </div>
          <div className="row">
            <label>
              Company
              <input
                value={capture?.company ?? ""}
                onChange={(e) =>
                  setCapture({
                    ...(capture ?? {
                      role: "",
                      location: "",
                      url: "https://manual.invalid",
                      description: "",
                      source: "manual",
                      capturedAt: nowIso(),
                    }),
                    company: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Role
              <input
                value={capture?.role ?? ""}
                onChange={(e) =>
                  setCapture({
                    ...(capture ?? {
                      company: "",
                      location: "",
                      url: "https://manual.invalid",
                      description: "",
                      source: "manual",
                      capturedAt: nowIso(),
                    }),
                    role: e.target.value,
                  })
                }
              />
            </label>
          </div>
          <label>
            Location
            <input
              value={capture?.location ?? ""}
              onChange={(e) =>
                setCapture({
                  ...(capture ?? {
                    company: "",
                    role: "",
                    url: "https://manual.invalid",
                    description: "",
                    source: "manual",
                    capturedAt: nowIso(),
                  }),
                  location: e.target.value,
                })
              }
            />
          </label>
          <label>
            Job description
            <textarea
              rows={14}
              value={capture?.description ?? ""}
              onChange={(e) =>
                setCapture({
                  ...(capture ?? {
                    company: "",
                    role: "",
                    location: "",
                    url: "https://manual.invalid",
                    source: "manual",
                    capturedAt: nowIso(),
                  }),
                  description: e.target.value,
                })
              }
            />
          </label>
          <div className="row">
            <label>
              Factuality mode
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as TailoringMode)}
              >
                <option value="evidence_only">Evidence only</option>
                <option value="evidence_extrapolation">
                  Evidence + conservative extrapolation
                </option>
                {settings.stressAcknowledged && (
                  <option value="stress_test">Advanced stress test</option>
                )}
              </select>
            </label>
            <label>
              Page target
              <select
                value={settings.pageTarget}
                onChange={(e) => {
                  const pageTarget = Number(e.target.value) as 1 | 2;
                  const next = { ...settings, pageTarget };
                  setSettings(next);
                  void db.settings.put(next);
                }}
              >
                <option value={1}>One page</option>
                <option value={2}>Two pages</option>
              </select>
            </label>
          </div>
          <div className="payload-notice">
            <b>Cloud transfer:</b> Analyze makes three Gemini calls and sends
            the full job listing, full resume, and career evidence directly to
            Google using your key.
          </div>
          <button
            disabled={busy || !capture || capture.description.length < 50}
            onClick={analyze}
          >
            {busy ? "Analyzing with Gemini…" : "Analyze and tailor"}
          </button>
        </section>
      ) : (
        <>
          <nav className="run-nav">
            <button
              className="secondary"
              onClick={() => {
                setRun(null);
                setPreview("");
                setPreviewPages(0);
              }}
            >
              ← New job
            </button>
            <span>
              {run.job.company} · {run.job.role} · {run.generation.model} ·{" "}
              {run.generation.calls} calls
            </span>
          </nav>
          <div className="score-grid">
            <ScoreCard
              label="Overall Match"
              value={run.baseScore.overall}
              detail={`Proposed ${run.proposedScore.overall}`}
            />
            <ScoreCard
              label="Job Match"
              value={run.baseScore.jobMatch}
              detail={`Proposed ${run.proposedScore.jobMatch}`}
            />
            <ScoreCard
              label="Resume Quality"
              value={run.baseScore.resumeQuality}
              detail={`Proposed ${run.proposedScore.resumeQuality}`}
            />
          </div>
          <section className="coverage">
            <b>Covered:</b> {run.proposedScore.covered.join(", ") || "None"}
            <br />
            <b>Missing:</b> {run.proposedScore.missing.join(", ") || "None"}
            <p>
              Deterministic estimates only; these scores do not predict an
              employer’s ATS or hiring decision.
            </p>
          </section>
          <div className="review-grid">
            <section>
              <div className="section-head">
                <h2>Proposed changes</h2>
                <span>
                  {run.proposals.filter((p) => p.decision === "pending").length}{" "}
                  pending
                </span>
              </div>
              {!run.proposals.length && (
                <div className="panel">
                  No candidate passed the evidence and quality checks.
                </div>
              )}
              {run.proposals.map((p, i) => (
                <article className={`proposal ${p.decision}`} key={p.id}>
                  <div className="proposal-top">
                    <span>
                      CHANGE {i + 1} · {p.type.toUpperCase()} · +
                      {p.estimatedScoreDelta}
                    </span>
                    <mark>{p.factuality}</mark>
                  </div>
                  {p.oldValue && (
                    <>
                      <label>Original</label>
                      <p className="old">{p.oldValue}</p>
                    </>
                  )}
                  <label>Proposed</label>
                  <textarea
                    value={p.newValue}
                    onChange={(e) => editProposal(p.id, e.target.value)}
                  />
                  <small>{p.reason}</small>
                  <div className="evidence-tags">
                    {p.evidenceIds.map((id) => (
                      <span key={id}>{id}</span>
                    ))}
                  </div>
                  <div className="actions">
                    <button onClick={() => decide(p.id, "accepted")}>
                      Accept
                    </button>
                    <button
                      className="secondary"
                      onClick={() => decide(p.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </section>
            <aside className="preview-panel">
              <div className="section-head">
                <h2>PDF preview</h2>
                <span
                  className={previewPages > run.pageTarget ? "overflow" : ""}
                >
                  {previewPages || "…"} / {run.pageTarget} page
                  {run.pageTarget === 1 ? "" : "s"}
                </span>
              </div>
              {preview ? (
                <iframe title="Resume PDF preview" src={preview} />
              ) : (
                <div className="preview-empty">Rendering…</div>
              )}
              {previewPages > run.pageTarget && (
                <div className="overflow-box">
                  The resume exceeds the selected limit. Compact uses one
                  additional Gemini call and adds shortening proposals for
                  review.
                </div>
              )}
              <button
                disabled={busy || previewPages <= run.pageTarget}
                onClick={compact}
              >
                {busy ? "Working…" : "Compact with Gemini"}
              </button>
              <button
                disabled={
                  busy ||
                  run.proposals.some((p) => p.decision === "pending") ||
                  previewPages > run.pageTarget
                }
                onClick={exportPdf}
              >
                Export PDF
              </button>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
