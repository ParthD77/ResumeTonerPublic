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
  type CareerEvidence,
  type ResumeProfile,
  type UserSettings,
} from "../domain";
import { DEFAULT_MODEL, testGemini } from "../engine";
import { forgetGeminiKey, getGeminiKey, setGeminiKey } from "../key-store";
import { ResumeEditor } from "../resume-editor";
import { fictionalImport, RESUME_IMPORT_PROMPT } from "../sample";
import { downloadBlob } from "../pdf";
import "../styles.css";

const issueText = (e: unknown) =>
  e instanceof ZodError
    ? e.issues
        .map((i) => `${i.path.join(".") || "document"}: ${i.message}`)
        .join("\n")
    : e instanceof Error
      ? e.message
      : String(e);

export function Options() {
  const [settings, setSettings] = useState<UserSettings | null>(null),
    [profile, setProfile] = useState<ResumeProfile | null>(null),
    [evidence, setEvidence] = useState<CareerEvidence[]>([]),
    [key, setKey] = useState(""),
    [hasKey, setHasKey] = useState(false),
    [importText, setImportText] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [storage, setStorage] = useState("Calculating…"),
    [busy, setBusy] = useState(false);
  const refresh = async () => {
    const [s, p, e, k, estimate] = await Promise.all([
      getSettings(),
      db.profiles.toCollection().first(),
      db.evidence.toArray(),
      getGeminiKey(),
      navigator.storage.estimate(),
    ]);
    setSettings(s);
    setProfile(p ?? null);
    setEvidence(e);
    setHasKey(Boolean(k));
    setStorage(`${((estimate.usage ?? 0) / 1024 / 1024).toFixed(2)} MB used`);
  };
  useEffect(() => {
    void refresh();
  }, []);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(issueText(e));
    } finally {
      setBusy(false);
    }
  };
  const saveSettings = async (next: UserSettings) => {
    setSettings(next);
    await db.settings.put(next);
  };
  const importResume = () =>
    act(async () => {
      const parsed = ResumeImportSchema.parse(JSON.parse(importText));
      await saveImport(parsed.profile, parsed.evidence);
      setProfile(parsed.profile);
      setEvidence(parsed.evidence);
      setMessage("Resume imported and saved locally.");
      await refresh();
    });
  const saveProfile = () =>
    act(async () => {
      if (!profile) return;
      await saveImport(
        ResumeImportSchema.parse({ schemaVersion: 1, profile, evidence })
          .profile,
        evidence,
      );
      setMessage("Base resume saved locally.");
      await refresh();
    });
  const saveKey = () =>
    act(async () => {
      await setGeminiKey(key);
      await testGemini(settings?.modelOverride || DEFAULT_MODEL);
      setKey("");
      setHasKey(true);
      setMessage("Gemini key saved locally and connection verified.");
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
            Your key stays in this Chrome profile. It is never synced or
            included in backups. Anyone with access to your unlocked browser
            profile may be able to recover it.
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
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <label>
            Advanced model override
            <input
              value={settings.modelOverride}
              placeholder={DEFAULT_MODEL}
              onChange={(e) =>
                void saveSettings({
                  ...settings,
                  modelOverride: e.target.value,
                })
              }
            />
          </label>
          <div className="actions">
            <button disabled={busy || !key.trim()} onClick={saveKey}>
              {hasKey ? "Replace and test" : "Save and test"}
            </button>
            <button
              className="secondary"
              disabled={!hasKey}
              onClick={() =>
                act(async () => {
                  await forgetGeminiKey();
                  setHasKey(false);
                  setMessage("Gemini key forgotten.");
                })
              }
            >
              Forget key
            </button>
          </div>
          <p className="muted">
            Use a dedicated key restricted to the Gemini API. Calls use your
            quota and may incur charges.
          </p>
        </section>
        <section className="panel">
          <h2>Cloud consent</h2>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.consentVersion >= 1}
              onChange={(e) =>
                void saveSettings({
                  ...settings,
                  consentVersion: e.target.checked ? 1 : 0,
                })
              }
            />
            I understand that Analyze and Compact send my entire resume and full
            job listing directly to Google Gemini using my key.
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.stressAcknowledged}
              onChange={(e) =>
                void saveSettings({
                  ...settings,
                  stressAcknowledged: e.target.checked,
                })
              }
            />
            Enable advanced stress-test mode. It may create synthetic claims,
            which cannot be exported.
          </label>
        </section>
      </div>
      {!profile && (
        <section className="panel">
          <h2>1. Prepare your resume data</h2>
          <p>
            Copy this prompt into an AI assistant of your choice together with
            your resume and career notes. Review its JSON before importing it
            here.
          </p>
          <textarea className="prompt" readOnly value={RESUME_IMPORT_PROMPT} />
          <button
            className="secondary"
            onClick={() =>
              void navigator.clipboard.writeText(RESUME_IMPORT_PROMPT)
            }
          >
            Copy prompt
          </button>
          <h2>2. Import the JSON</h2>
          <textarea
            rows={14}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste the complete JSON response here. Invalid imports are never partially saved."
          />
          <div className="actions">
            <button
              disabled={busy || !importText.trim()}
              onClick={importResume}
            >
              Validate and import
            </button>
            <button
              className="secondary"
              onClick={() => {
                setImportText(JSON.stringify(fictionalImport, null, 2));
                setError("");
              }}
            >
              Load fictional example
            </button>
          </div>
        </section>
      )}
      {profile && (
        <>
          <ResumeEditor profile={profile} onChange={setProfile} />
          <div className="sticky-save">
            <button disabled={busy} onClick={saveProfile}>
              Save base resume
            </button>
          </div>
        </>
      )}
      <section className="panel">
        <h2>Local data and backup</h2>
        <p>
          {storage}. Structured history remains on this device until you delete
          it. Chrome removes extension storage when the extension is
          uninstalled.
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
              onChange={(e) => {
                const file = e.target.files?.[0];
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
                  setMessage("All structured local data deleted.");
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
