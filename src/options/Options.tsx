import { useEffect, useState } from "react";
import { ZodError } from "zod";
import {
  db,
  deleteAllData,
  exportBackup,
  getSettings,
  restoreBackup,
  saveImport,
} from "../db";
import {
  ResumeImportSchema,
  nowIso,
  type CareerEvidence,
  type ResumeProfile,
  type UserSettings,
} from "../domain";
import { DEFAULT_MODEL, testGemini } from "../engine";
import { forgetGeminiKey, getGeminiKey, setGeminiKey } from "../key-store";
import { parseResumeImport } from "../import-compat";
import { downloadBlob } from "../pdf";
import { ResumeEditor } from "../resume-editor";
import { fictionalImport, RESUME_IMPORT_PROMPT } from "../sample";
import "../styles.css";
import "./onboarding.css";

const TERMS_VERSION = 1;
const steps = [
  "Gemini key",
  "Your responsibilities",
  "Prepare with AI",
  "Import JSON",
];
const issueText = (error: unknown) =>
  error instanceof ZodError
    ? error.issues
        .map(
          (issue) => `${issue.path.join(".") || "document"}: ${issue.message}`,
        )
        .join("\n")
    : error instanceof SyntaxError
      ? "That is not valid JSON. Copy the complete object, including its opening and closing braces."
      : error instanceof Error
        ? error.message
        : String(error);

export function Options() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [evidence, setEvidence] = useState<CareerEvidence[]>([]);
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [keyVerified, setKeyVerified] = useState(false);
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState([false, false, false]);
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [storage, setStorage] = useState("Calculating…");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [nextSettings, nextProfile, nextEvidence, savedKey, estimate] =
      await Promise.all([
        getSettings(),
        db.profiles.toCollection().first(),
        db.evidence.toArray(),
        getGeminiKey(),
        navigator.storage.estimate(),
      ]);
    setSettings(nextSettings);
    setProfile(nextProfile ?? null);
    setEvidence(nextEvidence);
    setHasKey(Boolean(savedKey));
    setStorage(`${((estimate.usage ?? 0) / 1024 / 1024).toFixed(2)} MB used`);
  };
  useEffect(() => void refresh(), []);
  const act = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (caught) {
      setError(issueText(caught));
    } finally {
      setBusy(false);
    }
  };
  const saveSettings = async (next: UserSettings) => {
    setSettings(next);
    await db.settings.put(next);
  };
  const verifyKey = () =>
    act(async () => {
      if (key.trim()) await setGeminiKey(key.trim());
      if (!key.trim() && !hasKey)
        throw new Error("Paste a Gemini API key first.");
      await testGemini(settings?.modelOverride || DEFAULT_MODEL);
      setKey("");
      setHasKey(true);
      setKeyVerified(true);
      setMessage(
        "Connection verified. Your key is stored only in this Chrome profile.",
      );
    });
  const importResume = () =>
    act(async () => {
      const parsed = parseResumeImport(importText);
      await saveImport(parsed.profile, parsed.evidence);
      if (settings)
        await saveSettings({ ...settings, onboardingCompletedAt: nowIso() });
      setProfile(parsed.profile);
      setEvidence(parsed.evidence);
      setMessage(
        "Setup complete. Your resume data was validated and saved locally.",
      );
      await refresh();
    });
  const saveProfile = () =>
    act(async () => {
      if (!profile) return;
      const parsed = ResumeImportSchema.parse({
        schemaVersion: 1,
        profile,
        evidence,
      });
      await saveImport(parsed.profile, evidence);
      setMessage("Base resume saved locally.");
      await refresh();
    });
  const backup = () =>
    act(async () => {
      const value = await exportBackup();
      downloadBlob(
        new Blob([JSON.stringify(value, null, 2)], {
          type: "application/json",
        }),
        `resume-toner-backup-${new Date().toISOString().slice(0, 10)}.json`,
      );
    });
  const restore = (file: File) =>
    act(async () => {
      await restoreBackup(JSON.parse(await file.text()));
      setMessage("Backup restored.");
      await refresh();
    });

  if (!settings)
    return (
      <main className="shell">
        <p>Loading local settings…</p>
      </main>
    );
  if (!profile)
    return (
      <main className="shell onboarding-shell">
        <header className="onboarding-header">
          <div>
            <p className="eyebrow">PRIVATE, LOCAL-FIRST SETUP</p>
            <h1>Set up Resume Toner</h1>
            <p>
              Bring your own Gemini key, prepare your career record, then review
              it before tailoring.
            </p>
          </div>
          <a className="button secondary" href="app.html">
            Back to workspace
          </a>
        </header>
        <nav className="stepper" aria-label="Onboarding progress">
          {steps.map((label, index) => (
            <div
              key={label}
              className={
                index === step
                  ? "step active"
                  : index < step
                    ? "step done"
                    : "step"
              }
              aria-current={index === step ? "step" : undefined}
            >
              <span>{index < step ? "✓" : index + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </nav>
        <p className="step-count">Step {step + 1} of 4</p>
        {error && (
          <pre className="error" role="alert">
            {error}
          </pre>
        )}
        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}

        {step === 0 && (
          <section className="panel onboarding-card">
            <p className="eyebrow">BRING YOUR OWN KEY</p>
            <h2>Connect your Gemini key</h2>
            <p className="lede">
              Resume Toner has no account or hosted backend. Gemini requests go
              directly from this extension to Google and use your Google
              project’s quota.
            </p>
            <div className="notice-grid">
              <div>
                <strong>Stored on this device</strong>
                <p>
                  The key stays in Chrome extension storage, never syncs, and is
                  excluded from backups. Chrome storage is not encrypted.
                </p>
              </div>
              <div>
                <strong>You control cost</strong>
                <p>
                  Google may apply quotas or charges. Use a dedicated key,
                  restrict it to Gemini, and set billing alerts.
                </p>
              </div>
              <div>
                <strong>Treat it like a password</strong>
                <p>
                  Someone with access to your unlocked Chrome profile may
                  recover it. Revoke it in Google if exposed.
                </p>
              </div>
            </div>
            <label>
              Gemini API key
              <input
                type="password"
                autoComplete="off"
                value={key}
                placeholder={
                  hasKey
                    ? "Saved key — test it or enter a replacement"
                    : "Paste a dedicated Gemini key"
                }
                onChange={(event) => {
                  setKey(event.target.value);
                  setKeyVerified(false);
                }}
              />
            </label>
            <details>
              <summary>Advanced: use a different model</summary>
              <label>
                Model ID
                <input
                  value={settings.modelOverride}
                  placeholder={DEFAULT_MODEL}
                  onChange={(event) =>
                    void saveSettings({
                      ...settings,
                      modelOverride: event.target.value,
                    })
                  }
                />
              </label>
            </details>
            <div className="actions">
              <button
                disabled={busy || (!key.trim() && !hasKey)}
                onClick={verifyKey}
              >
                {hasKey ? "Test saved key" : "Save and test key"}
              </button>
              <button
                className="secondary"
                disabled={!keyVerified}
                onClick={() => {
                  setMessage("");
                  setStep(1);
                }}
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="panel onboarding-card">
            <p className="eyebrow">TERMS & RESPONSIBILITIES</p>
            <h2>Know what you are responsible for</h2>
            <p className="lede">
              Resume Toner is an editing aid provided “as is.” It cannot verify
              every claim, guarantee interviews, predict an employer’s ATS, or
              control Google or another AI service.
            </p>
            <div className="terms-summary">
              <p>
                <strong>You remain the author.</strong> Review every imported
                fact, suggestion, score, and exported resume.
              </p>
              <p>
                <strong>You choose the services.</strong> You are responsible
                for your API key, Google account, usage charges, and any
                separate AI assistant.
              </p>
              <p>
                <strong>Your data choices matter.</strong> Analyze and Compact
                send your full resume and job listing directly to Google. Local
                records stay in Chrome until deletion or uninstall.
              </p>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={checks[0]}
                onChange={(e) =>
                  setChecks([e.target.checked, checks[1], checks[2]])
                }
              />
              I will verify that every resume claim is truthful and appropriate
              before I use or export it.
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={checks[1]}
                onChange={(e) =>
                  setChecks([checks[0], e.target.checked, checks[2]])
                }
              />
              I understand my full resume and job listing are sent directly to
              Google only when I choose Analyze or Compact.
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={checks[2]}
                onChange={(e) =>
                  setChecks([checks[0], checks[1], e.target.checked])
                }
              />
              I accept responsibility for my key, provider terms, quota or
              charges, and use of generated output.
            </label>
            <details className="legal-details">
              <summary>Read the concise terms</summary>
              <p>
                Use is at your own risk and subject to applicable law. The
                software is provided without warranties under the MPL-2.0.
                Nothing here is legal, hiring, or financial advice. These terms
                do not exclude rights or liabilities that cannot legally be
                excluded.
              </p>
            </details>
            <div className="actions split-actions">
              <button className="secondary" onClick={() => setStep(0)}>
                Back
              </button>
              <button
                disabled={busy || !checks.every(Boolean)}
                onClick={() =>
                  void act(async () => {
                    await saveSettings({
                      ...settings,
                      termsVersion: TERMS_VERSION,
                      consentVersion: 1,
                    });
                    setMessage("");
                    setStep(2);
                  })
                }
              >
                Accept and continue
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="panel onboarding-card">
            <p className="eyebrow">PREPARE YOUR CAREER RECORD</p>
            <h2>Ask an AI assistant to structure your information</h2>
            <p className="lede">
              This optional helper step happens outside Resume Toner. Choose an
              assistant you trust; its own privacy policy and data controls
              apply.
            </p>
            <ol className="instruction-list">
              <li>
                <strong>Open a new chat</strong>
                <span>
                  Use any assistant that can read an attached resume and return
                  JSON.
                </span>
              </li>
              <li>
                <strong>Attach your current resume</strong>
                <span>
                  Remove anything you do not want that provider to process.
                  Never share passwords, API keys, government IDs, banking or
                  health information.
                </span>
              </li>
              <li>
                <strong>Decide whether to use memory or chat history</strong>
                <span>
                  Optional: if supported and you are comfortable, ask it to use
                  relevant career context. Memory can be wrong or outdated;
                  uncertain or conflicting facts must be omitted.
                </span>
              </li>
              <li>
                <strong>Paste the prompt below</strong>
                <span>
                  Send it with the resume, then copy the complete JSON response
                  without markdown fences.
                </span>
              </li>
            </ol>
            <div className="memory-warning">
              <strong>Before using AI memory:</strong> check its memory/history
              settings and remove irrelevant or sensitive memories. You can skip
              memory and use only your resume.
            </div>
            <textarea
              className="prompt"
              readOnly
              value={RESUME_IMPORT_PROMPT}
              aria-label="Resume structuring prompt"
            />
            <div className="actions split-actions">
              <button className="secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(RESUME_IMPORT_PROMPT)
                      .then(() =>
                        setMessage(
                          "Prompt copied. Paste it into the AI chat with your resume attached.",
                        ),
                      )
                  }
                >
                  Copy prompt
                </button>
                <button
                  onClick={() => {
                    setMessage("");
                    setStep(3);
                  }}
                >
                  I have the JSON
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="panel onboarding-card">
            <p className="eyebrow">VALIDATE BEFORE SAVING</p>
            <h2>Import your JSON</h2>
            <p className="lede">
              Paste the complete response. Resume Toner validates every field
              first and saves nothing if any part is invalid.
            </p>
            <label>
              Resume Toner JSON
              <textarea
                rows={16}
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder={
                  "Paste one complete JSON object here, starting with { and ending with }"
                }
              />
            </label>
            <p className="muted">
              After import, review contact details, dates, employers,
              technologies, and metrics. Imported information is treated as
              trusted evidence.
            </p>
            <div className="actions split-actions">
              <button className="secondary" onClick={() => setStep(2)}>
                Back
              </button>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() => {
                    setImportText(JSON.stringify(fictionalImport, null, 2));
                    setError("");
                  }}
                >
                  Try fictional example
                </button>
                <button
                  disabled={busy || !importText.trim()}
                  onClick={importResume}
                >
                  Validate and import
                </button>
              </div>
            </div>
          </section>
        )}
        <p className="onboarding-footnote">
          Nothing is sent to Resume Toner. Delete local data and forget your key
          at any time in Settings.
        </p>
      </main>
    );

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">CLIENT-SIDE SETTINGS</p>
          <h1>Resume Toner</h1>
        </div>
        <a className="button secondary" href="app.html">
          Open workspace
        </a>
      </header>
      {error && (
        <pre className="error" role="alert">
          {error}
        </pre>
      )}
      {message && <p className="success">{message}</p>}
      <div className="settings-grid">
        <section className="panel">
          <h2>Gemini BYOK</h2>
          <p>
            Your key stays in this Chrome profile, never syncs, and is excluded
            from backups. Extension storage is not encrypted.
          </p>
          <label>
            Gemini API key
            <input
              type="password"
              autoComplete="off"
              value={key}
              placeholder={
                hasKey
                  ? "Key saved — enter a replacement"
                  : "Paste a dedicated Gemini key"
              }
              onChange={(event) => setKey(event.target.value)}
            />
          </label>
          <div className="actions">
            <button
              disabled={busy || (!key.trim() && !hasKey)}
              onClick={verifyKey}
            >
              {hasKey ? "Test or replace key" : "Save and test"}
            </button>
            <button
              className="secondary"
              disabled={!hasKey}
              onClick={() =>
                void act(async () => {
                  await forgetGeminiKey();
                  setHasKey(false);
                  setKeyVerified(false);
                  setMessage("Gemini key forgotten.");
                })
              }
            >
              Forget key
            </button>
          </div>
        </section>
        <section className="panel">
          <h2>Consent and advanced options</h2>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.consentVersion >= 1}
              onChange={(event) =>
                void saveSettings({
                  ...settings,
                  consentVersion: event.target.checked ? 1 : 0,
                })
              }
            />
            I understand Analyze and Compact send my entire resume and full job
            listing directly to Google Gemini.
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.stressAcknowledged}
              onChange={(event) =>
                void saveSettings({
                  ...settings,
                  stressAcknowledged: event.target.checked,
                })
              }
            />
            Enable stress-test mode. It may create synthetic claims, which
            cannot be exported.
          </label>
        </section>
      </div>
      <ResumeEditor profile={profile} onChange={setProfile} />
      <div className="sticky-save">
        <button disabled={busy} onClick={saveProfile}>
          Save base resume
        </button>
      </div>
      <section className="panel">
        <h2>Local data and backup</h2>
        <p>
          {storage}. Structured history remains on this device until deletion.
          Chrome removes extension storage when the extension is uninstalled.
        </p>
        <div className="actions">
          <button className="secondary" onClick={backup}>
            Export JSON backup
          </button>
          <label className="button secondary file-button">
            Restore backup
            <input
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void restore(file);
              }}
            />
          </label>
          <button
            className="danger"
            onClick={() => {
              if (
                confirm(
                  "Delete all Resume Toner profiles, evidence, runs, and history from this device? The API key is handled separately.",
                )
              )
                void act(async () => {
                  await deleteAllData();
                  setProfile(null);
                  setEvidence([]);
                  setStep(0);
                  await refresh();
                });
            }}
          >
            Delete all local data
          </button>
        </div>
      </section>
    </main>
  );
}
