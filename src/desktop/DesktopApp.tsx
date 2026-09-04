import { useEffect, useMemo, useState } from "react";
import { ResumeComparison } from "./ResumeComparison";
import { ArchiveSchema, SESSION_KEY, addSnapshot, emptySession, readArchive, type Archive, type Review, type Session } from "./session";
import {
  applyLatexChanges,
  buildChatPrompt,
  parseTailoringResponse,
  validateLatexSource,
  validateResponseTargets,
  type TailoringResponse,
} from "./contract";

export function DesktopApp() {
  const [initial] = useState(() => {
    try { return { archive: readArchive(localStorage), error: "" }; }
    catch { return { archive: { version: 1 as const, session: emptySession(), history: [] }, error: "Saved session could not be read. Export a backup of the stored data before replacing it." }; }
  });
  const [savedBase, setSavedBase] = useState(initial.archive.session.savedBase);
  const [base, setBase] = useState(initial.archive.session.base);
  const [latexInput, setLatexInput] = useState(initial.archive.session.latexInput);
  const [job, setJob] = useState(initial.archive.session.job);
  const [responseText, setResponseText] = useState(initial.archive.session.responseText);
  const [result, setResult] = useState<TailoringResponse | null>(initial.archive.session.result);
  const [reviews, setReviews] = useState<Record<string, Review>>(initial.archive.session.reviews);
  const [sideOpen, setSideOpen] = useState(initial.archive.session.sideOpen);
  const [history, setHistory] = useState<Archive["history"]>(initial.archive.history);
  const [storageError, setStorageError] = useState(initial.error);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState("");
  const [compileLog, setCompileLog] = useState("");
  const [busy, setBusy] = useState(false);

  const session = useMemo<Session>(() => ({ savedBase, base, latexInput, job, responseText, result, reviews, sideOpen }), [savedBase, base, latexInput, job, responseText, result, reviews, sideOpen]);
  useEffect(() => {
    if (initial.error) return; // Never overwrite unreadable saved data automatically.
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ version: 1, session, history }));
      setStorageError("");
    } catch { setStorageError("Local autosave failed (storage may be full). Download a backup before closing the app."); }
  }, [session, history, initial.error]);
  const checkpoint = (label: string) => setHistory(all => addSnapshot(all, session, label));
  const restore = (value: Session) => {
    setSavedBase(value.savedBase); setBase(value.base); setLatexInput(value.latexInput);
    setJob(value.job); setResponseText(value.responseText); setResult(value.result);
    setReviews(value.reviews); setSideOpen(value.sideOpen); setPreview(""); setError("");
  };
  const library = (
    <details className="panel local-library">
      <summary>Local saves & history · {storageError ? "Needs attention" : "Autosaved on this device"}</summary>
      <p>Resumes, job text, edits and decisions stay on this device. Keeps the last 5 snapshots. Back up before switching from development to the installed app.</p>
      {storageError && <p className="error" role="alert">{storageError}</p>}
      <div className="actions">
        <button className="secondary" onClick={() => checkpoint("Manual snapshot")}>Save snapshot</button>
        <button className="secondary" onClick={() => {
          const content = initial.error ? localStorage.getItem(SESSION_KEY) ?? "" : JSON.stringify({ version: 1, session, history }, null, 2);
          const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
          const anchor = document.createElement("a"); anchor.href = url; anchor.download = "resume-toner-private-backup.json"; anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Download private backup</button>
        <button className="secondary" disabled={!savedBase} onClick={() => void guard(async () => { await window.resumeDesktop?.saveLatex(savedBase); })}>Export saved base .tex</button>
        <label>Restore backup <input type="file" accept=".json" onChange={e => {
          const file = e.target.files?.[0]; e.target.value = "";
          if (!file) return;
          void guard(async () => {
            if (file.size > 20_000_000) throw new Error("Backup exceeds 20 MB.");
            const archive = ArchiveSchema.parse(JSON.parse(await file.text()));
            if (!window.confirm("Restore this backup? Your current session will be kept as a history snapshot.")) return;
            const nextHistory = addSnapshot(archive.history, session, "Before backup restore");
            localStorage.setItem(SESSION_KEY, JSON.stringify({ ...archive, history: nextHistory }));
            window.location.reload();
          });
        }} /></label>
      </div>
      {history.map(item => <div className="history-row" key={item.id}>
        <span>{item.label} · {new Date(item.date).toLocaleString()}</span>
        <button className="secondary" onClick={() => {
          if (!window.confirm("Restore this session and its saved base? Your current work will be kept in history.")) return;
          checkpoint("Before history restore"); restore(item.session);
        }}>Restore</button>
      </div>)}
    </details>
  );

  const baseAfterReview = useMemo(
    () =>
      base && result
        ? applyLatexChanges(base, result.proposals, reviews, "base")
        : base,
    [base, result, reviews],
  );
  const current = useMemo(
    () =>
      base && result
        ? applyLatexChanges(base, result.proposals, reviews, "current")
        : base,
    [base, result, reviews],
  );

  const guard = async (fn: () => Promise<void> | void) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const saveBase = (latex: string) => {
    const valid = validateLatexSource(latex);
    setSavedBase(valid);
    setBase(valid);
  };
  const setReview = (id: string, patch: Partial<Review>) =>
    setReviews((all) => ({ ...all, [id]: { ...all[id], ...patch } }));
  const compile = async (latex: string) => {
    if (!window.resumeDesktop)
      throw new Error(
        "LaTeX compilation is available in the installed desktop app.",
      );
    const response = await window.resumeDesktop.compileLatex(latex);
    setCompileLog(response.log);
    if (!response.ok || !response.pdf)
      throw new Error(
        response.error || "LaTeX compilation failed. See the compiler log.",
      );
    return response.pdf;
  };

  useEffect(() => {
    if (!current || !window.resumeDesktop) return;
    let active = true,
      url = "";
    const timer = window.setTimeout(
      () =>
        void compile(current)
          .then((pdf) => {
            if (!active) return;
            url = URL.createObjectURL(
              new Blob([pdf], { type: "application/pdf" }),
            );
            setPreview(url);
          })
          .catch((e) => {
            if (active) setError(e instanceof Error ? e.message : String(e));
          }),
      350,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [current]);

  if (!base)
    return (
      <main className="shell desktop-setup">
        <header className="topbar">
          <div>
            <p className="eyebrow">WINDOWS · LOCAL LATEX</p>
            <h1>Resume Toner Desktop</h1>
          </div>
        </header>
        {library}
        <section className="panel empty-state setup-card">
          <h2>Add your base LaTeX resume</h2>
          <p>
            Open a complete `.tex` file or paste its source. The app compiles it
            locally with MiKTeX.
          </p>
          <textarea
            className="prompt latex-source"
            value={latexInput}
            onChange={(e) => setLatexInput(e.target.value)}
            placeholder="\\documentclass…"
          />
          {error && <p className="error">{error}</p>}
          <div className="actions">
            <button
              className="secondary"
              onClick={() =>
                void guard(async () => {
                  if (!window.resumeDesktop) return;
                  const loaded = await window.resumeDesktop.openLatex();
                  if (loaded) setLatexInput(loaded);
                })
              }
            >
              Open .tex file
            </button>
            <button
              disabled={!latexInput.trim()}
              onClick={() =>
                void guard(async () => {
                  const valid = validateLatexSource(latexInput);
                  await compile(valid);
                  saveBase(valid);
                })
              }
            >
              Compile and save base
            </button>
          </div>
          {compileLog && (
            <details>
              <summary>Compiler log</summary>
              <pre className="compile-log">{compileLog}</pre>
            </details>
          )}
        </section>
      </main>
    );

  const prompt = job.trim().length >= 50 ? buildChatPrompt(base, job) : "";
  const unresolved = Object.values(reviews).some(
    (x) => x.decision === "pending",
  );
  const resolved = Object.values(reviews).filter(
    (x) => x.decision !== "pending",
  ).length;

  return (
    <main className="shell desktop-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">CHATGPT-ASSISTED · LOCAL LATEX</p>
          <h1>Resume Toner Desktop</h1>
        </div>
        <div className="top-actions">
          <span className="cloud-badge">MiKTeX · no API key</span>
          <button className="secondary" onClick={() => setSideOpen((x) => !x)}>
            {sideOpen ? "Hide" : "Show"} analysis
          </button>
          <button
            className="secondary"
            onClick={() => {
              if (!window.confirm("Replace the base resume? Your current session will be kept in local history.")) return;
              checkpoint("Before replacing base");
              restore(emptySession());
            }}
          >
            Replace base .tex
          </button>
        </div>
      </header>
      {library}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="success">{notice}</p>}
      {!result ? (
        <div className="desktop-flow">
          <section className="panel">
            <p className="eyebrow">STEP 1</p>
            <h2>Paste the job posting</h2>
            <textarea
              rows={18}
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="Paste the complete posting…"
            />
          </section>
          <section className="panel">
            <p className="eyebrow">STEP 2</p>
            <h2>Use your ChatGPT window</h2>
            <p className="muted">
              The prompt contains your LaTeX source and asks for exact,
              reviewable replacements.
            </p>
            <textarea className="prompt" readOnly value={prompt} />
            <div className="actions">
              <button
                disabled={!prompt}
                onClick={() =>
                  void guard(async () => {
                    await navigator.clipboard.writeText(prompt);
                    setNotice("Prompt copied. Paste it into ChatGPT.");
                  })
                }
              >
                Copy prompt
              </button>
              <button
                className="secondary"
                onClick={() => void window.resumeDesktop?.openChatGPT()}
              >
                Open ChatGPT
              </button>
            </div>
          </section>
          <section className="panel response-panel">
            <p className="eyebrow">STEP 3</p>
            <h2>Paste ChatGPT’s JSON</h2>
            <textarea
              className="prompt"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Paste the complete JSON response…"
            />
            <button
              disabled={!responseText.trim()}
              onClick={() =>
                void guard(() => {
                  const parsed = validateResponseTargets(
                    parseTailoringResponse(responseText),
                    base,
                  );
                  setResult(parsed);
                  setReviews(
                    Object.fromEntries(
                      parsed.proposals.map((p) => [
                        p.id,
                        {
                          decision: "pending",
                          text: p.proposedLatex,
                          scope: "current",
                          syntheticVerified: false,
                        },
                      ]),
                    ),
                  );
                })
              }
            >
              Review resume changes
            </button>
          </section>
        </div>
      ) : (
        <div className={`desktop-review ${sideOpen ? "with-analysis" : ""}`}>
          {sideOpen && (
            <aside className="analysis-panel panel">
              <p className="eyebrow">ROLE ANALYSIS</p>
              <h2>
                {result.company} · {result.role}
              </h2>
              <div className={`eligibility ${result.eligibility.status}`}>
                <strong>
                  {result.eligibility.status.replaceAll("_", " ")}
                </strong>
                <p>{result.eligibility.summary}</p>
                {result.eligibility.blockers.map((x) => (
                  <div key={x}>• {x}</div>
                ))}
              </div>
              <h3>Target profile</h3>
              <p>{result.targetProfile}</p>
              <h3>Biggest gaps</h3>
              <ul>
                {result.biggestGaps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <h3>Research</h3>
              {result.researchNotes.map((x, i) => (
                <p key={i}>
                  {x.finding}{" "}
                  {x.sourceUrl && (
                    <a href={x.sourceUrl}>{x.sourceTitle || "Source"}</a>
                  )}
                </p>
              ))}
            </aside>
          )}
          <section className="changes-column">
            <nav className="run-nav">
              <button
                className="secondary"
                onClick={() => {
                  checkpoint(result.company + " · " + result.role);
                  setBase(savedBase);
                  setResult(null);
                  setReviews({});
                  setJob("");
                  setResponseText("");
                  setPreview("");
                }}
              >
                ← New job
              </button>
              <span>
                {resolved}/{result.proposals.length} reviewed
              </span>
            </nav>
            {result.proposals.map((p, index) => {
              const review = reviews[p.id];
              return (
                <article
                  className={`proposal ${review.decision} ${p.factuality === "synthetic" ? "synthetic" : ""}`}
                  key={p.id}
                >
                  <div className="proposal-top">
                    <span>
                      CHANGE {index + 1} · {p.title}
                    </span>
                    <mark>{p.factuality}</mark>
                  </div>
                  <ResumeComparison before={p.currentLatex} after={review.text} />
                  <details className="source-editor">
                    <summary>View / edit LaTeX source</summary>
                    <p className="muted">Text preview above; the compiled PDF shows exact formatting.</p>
                  <label>Current LaTeX</label>
                  <pre className="latex-diff old">{p.currentLatex}</pre>
                  <label>Proposed LaTeX</label>
                  <textarea
                    className="latex-edit"
                    value={review.text}
                    onChange={(e) =>
                      setReview(p.id, {
                        text: e.target.value,
                        decision: "pending",
                      })
                    }
                  />
                  </details>
                  <small>{p.why}</small>
                  <div className="recommendation">{p.recommendation}</div>
                  <div className="scope-switch">
                    <span>Apply to</span>
                    <button
                      className={review.scope === "current" ? "" : "secondary"}
                      onClick={() => setReview(p.id, { scope: "current" })}
                    >
                      This job only
                    </button>
                    <button
                      className={review.scope === "base" ? "" : "secondary"}
                      onClick={() => setReview(p.id, { scope: "base" })}
                    >
                      This job + saved base
                    </button>
                  </div>
                  <p className="muted">{review.scope === "base" ? "After acceptance, this also updates the saved base when you successfully export the PDF." : "After acceptance, this changes only this job’s resume. Your saved base stays unchanged."}</p>
                  {p.factuality === "synthetic" && (
                    <label className="synthetic-check">
                      <input
                        type="checkbox"
                        checked={review.syntheticVerified}
                        onChange={(e) =>
                          setReview(p.id, {
                            syntheticVerified: e.target.checked,
                            decision: "pending",
                          })
                        }
                      />{" "}
                      I confirm this claim is true and I can defend it in an
                      interview.
                    </label>
                  )}
                  <div className="actions">
                    <button
                      disabled={
                        p.factuality === "synthetic" &&
                        !review.syntheticVerified
                      }
                      onClick={() => setReview(p.id, { decision: "accepted" })}
                    >
                      Accept
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setReview(p.id, { decision: "rejected" })}
                    >
                      Reject
                    </button>
                    <button
                      className="link-button"
                      onClick={() =>
                        setReview(p.id, {
                          decision: "pending",
                          text: p.proposedLatex,
                        })
                      }
                    >
                      Reset
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
          <section className="preview-panel">
            <p className="eyebrow">COMPILED LATEX</p>
            <h2>Current resume</h2>
            {preview ? (
              <iframe title="Compiled LaTeX PDF" src={preview} />
            ) : (
              <div className="preview-empty">Compiling with MiKTeX…</div>
            )}
            <button
              disabled={busy || unresolved}
              onClick={() =>
                void guard(async () => {
                  const pdf = await compile(current);
                  if (!window.resumeDesktop) return;
                  const path = await window.resumeDesktop.saveResume(pdf);
                  if (path) {
                    checkpoint(result.company + " · " + result.role + " (exported)");
                    setSavedBase(baseAfterReview);
                  }
                  setNotice(path ? `Saved ${path}` : "Save cancelled.");
                })
              }
            >
              Download resume PDF
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void guard(async () => {
                  if (!window.resumeDesktop) return;
                  const path = await window.resumeDesktop.saveLatex(current);
                  setNotice(path ? `Saved ${path}` : "Save cancelled.");
                })
              }
            >
              Save resume LaTeX
            </button>
            {compileLog && (
              <details>
                <summary>Compiler log</summary>
                <pre className="compile-log">{compileLog}</pre>
              </details>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
