import { describe, expect, it } from "vitest";
import { editReadableLatex } from "./editable-latex";
import { readableLatex } from "./readable-latex";

describe("readable LaTeX editing", () => {
  it("edits wording while preserving commands", () => {
    const source = String.raw`\resumeItem{Built \textbf{fast APIs} with React}`;
    const edited = editReadableLatex(source, "• Built fast APIs with TypeScript");
    expect(edited).toBe(String.raw`\resumeItem{Built \textbf{fast APIs} with TypeScript}`);
    expect(readableLatex(edited)).toBe("• Built fast APIs with TypeScript");
  });

  it("escapes LaTeX-sensitive characters typed in plain text", () => {
    const source = String.raw`\resumeItem{Reduced cost}`;
    const edited = editReadableLatex(source, "• Reduced cost by 35% & improved C# tooling");
    expect(edited).toContain(String.raw`35\% \& improved C\#`);
    expect(readableLatex(edited)).toBe("• Reduced cost by 35% & improved C# tooling");
  });

  it("supports deletion and insertion", () => {
    const source = String.raw`\resumeItem{Built APIs}`;
    expect(readableLatex(editReadableLatex(source, "• Built secure APIs"))).toBe("• Built secure APIs");
    expect(readableLatex(editReadableLatex(source, "• Built"))).toBe("• Built");
  });
});
