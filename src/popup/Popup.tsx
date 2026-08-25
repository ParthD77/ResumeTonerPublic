import { useEffect, useState } from "react";
import { extractJobFromPage } from "../capture";
import type { JobCapture } from "../domain";
import "../styles.css";

export function Popup() {
  const [capture, setCapture] = useState<JobCapture | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  const read = async () => {
    setBusy(true);
    setError("");
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id || !/^https?:/.test(tab.url ?? ""))
        throw new Error("Open a regular job-listing webpage first.");
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractJobFromPage,
      });
      const value = {
        ...result,
        capturedAt: new Date().toISOString(),
      } as JobCapture;
      if (value.description.length < 50)
        throw new Error(
          "No job description found. Select its text on the page and click Re-read.",
        );
      setCapture(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void read();
  }, []);
  const open = async () => {
    if (!capture) return;
    await chrome.storage.local.set({ pendingCapture: capture });
    await chrome.tabs.create({
      url: chrome.runtime.getURL("app.html?capture=pending"),
    });
    window.close();
  };
  return (
    <main className="popup">
      <header className="popup-head">
        <div className="brand-mark">RT</div>
        <div>
          <b>Resume Toner</b>
          <small>Local-first BYOK tailoring</small>
        </div>
      </header>
      {capture && (
        <div className="capture-summary">
          <span>{capture.source} extraction</span>
          <strong>{capture.role || "Unknown role"}</strong>
          <p>
            {capture.company || "Unknown company"}
            {capture.location ? ` · ${capture.location}` : ""}
          </p>
          <small>
            {capture.description.length.toLocaleString()} characters captured
          </small>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button disabled={!capture || busy} onClick={open}>
        {busy ? "Reading page…" : "Review capture"}
      </button>
      <button className="secondary" disabled={busy} onClick={read}>
        Re-read page
      </button>
      <button
        className="link-button"
        onClick={() => chrome.runtime.openOptionsPage()}
      >
        Settings & resume
      </button>
    </main>
  );
}
