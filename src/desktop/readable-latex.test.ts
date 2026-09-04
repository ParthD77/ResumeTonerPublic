import { describe, expect, it } from "vitest";
import { readableLatex } from "./readable-latex";

describe("readable LaTeX preview", () => {
  it("shows wording and escaped punctuation without formatting commands", () => {
    expect(readableLatex(String.raw`\resumeItem{Built \textbf{APIs} with 35\% less cost \& C\#}`))
      .toBe("• Built APIs with 35% less cost & C#");
  });
  it("shows link labels, not hidden URLs", () => {
    expect(readableLatex(String.raw`\href{https://example.com}{\underline{Live Site}}`)).toBe("Live Site");
  });
  it("keeps headings and multiple bullets readable without spacing arguments", () => {
    const text = readableLatex(String.raw`\resumeSubheading{Engineer}{2026}{Company}{Toronto}
\resumeItemListStart
\resumeItem{One}\resumeItem{Two}\resumeItemListEnd\vspace{-5pt}`);
    expect(text).toContain("Engineer | 2026\nCompany | Toronto");
    expect(text).toContain("• One\n\n• Two");
    expect(text).not.toContain("-5pt");
  });
  it("ignores comments but preserves escaped percent signs", () => {
    expect(readableLatex("Hello % hidden\nworld \\%" )).toBe("Hello\nworld %");
  });
});
