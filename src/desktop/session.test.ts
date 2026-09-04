import { describe, expect, it } from "vitest";
import { SESSION_KEY, ArchiveSchema, addSnapshot, emptySession, readArchive } from "./session";
import { applyLatexChanges, parseTailoringResponse } from "./contract";

describe("local desktop sessions", () => {
  it("migrates the existing saved base", () => {
    const archive = readArchive({ getItem: key => key === SESSION_KEY ? null : "original latex" });
    expect(archive.session.base).toBe("original latex");
    expect(archive.session.savedBase).toBe("original latex");
  });
  it("round trips base, current workspace, drafts and UI state", () => {
    const session = { ...emptySession("original"), savedBase: "updated base", job: "job draft", responseText: "JSON draft", latexInput: "source draft", sideOpen: false };
    const archive = { version: 1, session, history: addSnapshot([], session, "saved") };
    expect(readArchive({ getItem: () => JSON.stringify(archive) })).toEqual(archive);
  });
  it("keeps only the newest five snapshots", () => {
    let history = addSnapshot([], emptySession(), "first");
    for (let i = 0; i < 8; i++) history = addSnapshot(history, emptySession(), String(i));
    expect(history).toHaveLength(5);
    expect(history.map(item => item.label)).toEqual(["7", "6", "5", "4", "3"]);
  });
  it("rejects corrupt data rather than silently overwriting it", () => {
    expect(() => readArchive({ getItem: () => "broken json" })).toThrow();
    expect(() => ArchiveSchema.parse({ version: 2 })).toThrow();
  });
  it("restores accepted edits without applying them twice to the promoted base", () => {
    const result = parseTailoringResponse(JSON.stringify({
      company: "Example", role: "Engineer", eligibility: { status: "unknown", summary: "Check" },
      targetProfile: "Engineer", proposals: [{ id: "1", title: "Edit", currentLatex: "\\resumeItem{Old}", proposedLatex: "\\resumeItem{New}", why: "Clearer", recommendation: "ACCEPT", factuality: "verified" }],
    }));
    const session = { ...emptySession("\\resumeItem{Old}"), savedBase: "\\resumeItem{New}", result,
      reviews: { "1": { decision: "accepted" as const, scope: "base" as const, text: "\\resumeItem{New}", syntheticVerified: false } } };
    const restored = readArchive({ getItem: () => JSON.stringify({ version: 1, session, history: [] }) }).session;
    expect(applyLatexChanges(restored.base, restored.result!.proposals, restored.reviews, "current")).toBe("\\resumeItem{New}");
    expect(restored.savedBase).toBe("\\resumeItem{New}");
    expect(restored.base).toBe("\\resumeItem{Old}");
  });
});
