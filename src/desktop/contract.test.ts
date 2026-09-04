import { describe, expect, it } from "vitest";
import {
  applyLatexChanges,
  buildChatPrompt,
  parseTailoringResponse,
  validateLatexSource,
  validateResponseTargets,
} from "./contract";

const latex = String.raw`\documentclass{article}
\begin{document}
\resumeItem{Built typed REST APIs that reduced reconciliation time by 30\%}
\end{document}`;
const valid = {
  company: "Example",
  role: "SWE",
  eligibility: {
    status: "eligible",
    summary: "No blocker found",
    blockers: [],
  },
  targetProfile: "A product engineer who ships tested APIs.",
  biggestGaps: [],
  researchNotes: [],
  proposals: [
    {
      id: "change.1",
      title: "Show API evidence",
      currentLatex: String.raw`\resumeItem{Built typed REST APIs that reduced reconciliation time by 30\%}`,
      proposedLatex: String.raw`\resumeItem{Built and tested typed REST APIs, reducing reconciliation time by 30\%}`,
      why: "Adds supported testing evidence.",
      recommendation: "ACCEPT",
      factuality: "verified",
    },
  ],
  syntheticIdeasToVerify: [],
  recruiterStory: "Tested product engineering.",
};

describe("desktop LaTeX ChatGPT contract", () => {
  it("parses fenced JSON and validates an exact unique target", () => {
    const parsed = parseTailoringResponse(
      `\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``,
    );
    expect(validateResponseTargets(parsed, latex).proposals).toHaveLength(1);
  });
  it("discards ChatGPT citation placeholders without rejecting the response", () => {
    const changed = {
      ...structuredClone(valid),
      researchNotes: [
        {
          finding: "The role values Unix experience.",
          sourceTitle: "Role posting",
          sourceUrl: ":contentReference[oaicite:2]{index=2}",
        },
      ],
    };
    const parsed = parseTailoringResponse(JSON.stringify(changed));
    expect(parsed.researchNotes[0].sourceUrl).toBe("");
    expect(parsed.proposals).toHaveLength(1);
  });
  it("keeps complete web research URLs", () => {
    const changed = {
      ...structuredClone(valid),
      researchNotes: [
        {
          finding: "The role values Unix experience.",
          sourceTitle: "Role posting",
          sourceUrl: "https://example.com/jobs/software-intern",
        },
      ],
    };
    const parsed = parseTailoringResponse(JSON.stringify(changed));
    expect(parsed.researchNotes[0].sourceUrl).toBe(
      "https://example.com/jobs/software-intern",
    );
  });
  it("rejects an absent source snippet", () => {
    const changed = structuredClone(valid);
    changed.proposals[0].currentLatex = String.raw`\resumeItem{Invented}`;
    expect(() =>
      validateResponseTargets(
        parseTailoringResponse(JSON.stringify(changed)),
        latex,
      ),
    ).toThrow(/matched 0/);
  });
  it("applies accepted current and base scopes deterministically", () => {
    const parsed = parseTailoringResponse(JSON.stringify(valid));
    const reviews = {
      "change.1": {
        decision: "accepted",
        text: parsed.proposals[0].proposedLatex,
        scope: "current",
      },
    };
    expect(
      applyLatexChanges(latex, parsed.proposals, reviews, "current"),
    ).toContain("Built and tested");
    expect(applyLatexChanges(latex, parsed.proposals, reviews, "base")).toBe(
      latex,
    );
  });
  it("validates source and puts it in the prompt", () => {
    expect(validateLatexSource(latex)).toContain("documentclass");
    expect(
      buildChatPrompt(
        latex,
        "A detailed software engineering posting with APIs and testing.",
      ),
    ).toContain(latex);
    expect(buildChatPrompt(latex, "A sufficiently detailed job posting.")).toContain(
      "Never use citation placeholders",
    );
  });
  it("rejects an unrendered placeholder template", () => {
    expect(() =>
      validateLatexSource(
        latex.replace("\\begin{document}", "\\begin{document}\n%%NAME%%"),
      ),
    ).toThrow(/unrendered/);
  });
});
