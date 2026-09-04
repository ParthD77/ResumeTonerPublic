import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { wordDiff } from "./word-diff";
import { ResumeComparison } from "./ResumeComparison";

describe("resume wording diff", () => {
  it("highlights only the replaced word", () => {
    expect(wordDiff("Built APIs", "Tested APIs")).toEqual([
      { text: "Built", kind: "removed" },
      { text: "Tested", kind: "added" },
      { text: " APIs", kind: "same" },
    ]);
  });
  it.each([
    ["", "Added"], ["Removed", ""], ["Same", "Same"],
    ["Reduced cost by 35%.", "Reduced cost by 40%!"],
    ["• Built APIs\n• Tested APIs", "• Tested APIs\n• Built APIs"],
    ["C++ and C#", "C# and C++"], ["développé vite", "développé mieux"],
  ])("preserves both original texts: %s → %s", (before, after) => {
    const parts = wordDiff(before, after);
    expect(parts.filter(p => p.kind !== "added").map(p => p.text).join("")).toBe(before);
    expect(parts.filter(p => p.kind !== "removed").map(p => p.text).join("")).toBe(after);
  });
  it("renders semantic change markers on readable wording", () => {
    const html = renderToStaticMarkup(createElement(ResumeComparison, {
      before: String.raw`\resumeItem{Built APIs}`,
      after: String.raw`\resumeItem{Tested APIs}`,
    }));
    expect(html).toContain('<del class="diff-removed">Built</del>');
    expect(html).toContain('<ins class="diff-added">Tested</ins>');
    expect(html).not.toContain("resumeItem");
  });
  it("explains formatting-only changes", () => {
    const html = renderToStaticMarkup(createElement(ResumeComparison, {
      before: String.raw`\textbf{APIs}`, after: String.raw`\textit{APIs}`,
    }));
    expect(html).toContain("No visible wording changes");
  });
});
