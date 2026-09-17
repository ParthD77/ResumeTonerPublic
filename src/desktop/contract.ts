import { z } from "zod";
import { extractJsonFromChat } from "../import-compat";

const ResearchUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") return "";
  const candidate = value.trim();
  if (!/^https?:\/\//i.test(candidate)) return "";
  try {
    return new URL(candidate).toString();
  } catch {
    return "";
  }
}, z.string().url().or(z.literal("")));

export const DesktopProposalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  currentLatex: z.string().min(1).max(5000),
  proposedLatex: z.string().min(1).max(5000),
  why: z.string().min(1).max(2500),
  recommendation: z.enum(["STRONGLY ACCEPT", "ACCEPT", "OPTIONAL", "REJECT"]),
  factuality: z.enum(["verified", "extrapolated", "synthetic"]),
});

export const TailoringResponseSchema = z.object({
  company: z.string().default(""),
  role: z.string().default(""),
  eligibility: z.object({
    status: z.enum(["eligible", "possible_blocker", "hard_blocker", "unknown"]),
    summary: z.string(),
    blockers: z.array(z.string()).default([]),
  }),
  targetProfile: z.string().min(1),
  biggestGaps: z.array(z.string()).max(8).default([]),
  researchNotes: z
    .array(
      z.object({
        finding: z.string(),
        sourceTitle: z.string().default(""),
        // ChatGPT sometimes emits an internal :contentReference marker even
        // when asked for a URL. Research links are optional, so discard those
        // markers instead of rejecting an otherwise useful response.
        sourceUrl: ResearchUrlSchema.default(""),
      }),
    )
    .default([]),
  proposals: z.array(DesktopProposalSchema).max(20),
  syntheticIdeasToVerify: z.array(z.string()).default([]),
  recruiterStory: z.string().default(""),
});

export type TailoringResponse = z.infer<typeof TailoringResponseSchema>;
export type DesktopProposal = z.infer<typeof DesktopProposalSchema>;

export function parseTailoringResponse(value: string) {
  return TailoringResponseSchema.parse(extractJsonFromChat(value));
}

export function validateLatexSource(value: string) {
  const latex = value.trim();
  if (
    !latex.includes("\\documentclass") ||
    !latex.includes("\\begin{document}") ||
    !latex.includes("\\end{document}")
  )
    throw new Error(
      "Choose a complete LaTeX resume containing documentclass and a document environment.",
    );
  if (/%%[A-Z_]+%%/.test(latex))
    throw new Error(
      "This is an unrendered LaTeX template with %%PLACEHOLDER%% fields. Open the generated current.tex resume instead.",
    );
  if (latex.length > 500_000)
    throw new Error("The LaTeX source is larger than 500 KB.");
  return `${latex}\n`;
}

export function validateResponseTargets(
  response: TailoringResponse,
  latex: string,
) {
  const seen = new Set<string>();
  for (const proposal of response.proposals) {
    if (seen.has(proposal.id))
      throw new Error(`Duplicate proposal ID: ${proposal.id}`);
    seen.add(proposal.id);
    const occurrences = latex.split(proposal.currentLatex).length - 1;
    if (occurrences !== 1)
      throw new Error(
        `${proposal.id} must target one exact LaTeX snippet, but it matched ${occurrences}. Nothing was imported.`,
      );
    if (!proposal.proposedLatex.includes("\\"))
      throw new Error(`${proposal.id} proposedLatex does not look like LaTeX.`);
  }
  return response;
}

export function applyLatexChanges(
  latex: string,
  proposals: DesktopProposal[],
  reviews: Record<string, { decision: string; text: string; scope: string }>,
  include: "current" | "base",
) {
  let output = latex;
  for (const proposal of proposals) {
    const review = reviews[proposal.id];
    if (
      !review ||
      review.decision !== "accepted" ||
      (include === "base" && review.scope !== "base")
    )
      continue;
    const occurrences = output.split(proposal.currentLatex).length - 1;
    if (occurrences !== 1)
      throw new Error(
        `${proposal.id} can no longer be applied uniquely. Reset the run and import the response again.`,
      );
    output = output.replace(proposal.currentLatex, review.text);
  }
  return output;
}

const RESPONSE_CONTRACT = `{
  "company":"Company", "role":"Role",
  "eligibility":{"status":"eligible|possible_blocker|hard_blocker|unknown","summary":"...","blockers":[]},
  "targetProfile":"3-6 line summary", "biggestGaps":["..."],
  "researchNotes":[{"finding":"...","sourceTitle":"...","sourceUrl":"https://..."}],
  "proposals":[{"id":"change.1","title":"Short name","currentLatex":"one exact, unique, complete LaTeX command or block copied verbatim from the source","proposedLatex":"the complete replacement LaTeX command or block","why":"...","recommendation":"STRONGLY ACCEPT|ACCEPT|OPTIONAL|REJECT","factuality":"verified|extrapolated|synthetic"}],
  "syntheticIdeasToVerify":["..."], "recruiterStory":"..."
}`;

export function buildChatPrompt(latex: string, jobPosting: string) {
  return `You are my software engineering resume tailoring assistant.

Research the company and role on the web before making recommendations. Check hard eligibility requirements first, then determine the actual engineering profile the employer is targeting.

Your main goal is to REORIENT the candidate's existing experience toward the job posting as strongly as possible.

Do not create entirely new jobs, companies, internships, or unrelated projects. Instead, work from the experiences and projects already present in the resume and your chat history/memory with the user, reshape them to emphasize the parts most relevant to the target role.

You have flexibility to modify how an existing experience is presented when the change is reasonably plausible within that experience.

For example:
- If an existing mobile app uses a database and the role strongly values database engineering, rewrite the bullets to emphasize schema design, queries, persistence, backend integration, data modeling, or performance.
- If a project already involves APIs and the role emphasizes backend development, shift the bullet toward API design, request handling, authentication, services, or data flow.
- If an experience involves cloud infrastructure and the posting emphasizes reliability, emphasize deployment, uptime, monitoring, scaling, or fault tolerance.
- If the exact implementation detail is not stated in the resume, you may introduce or adjust a technical detail that naturally fits the existing project or responsibility.
- You may substitute or add a related technology when it would be realistic for that same project to have used it and it substantially improves alignment with the posting.
- You may create realistic metrics, implementation details, or technical depth around an EXISTING accomplishment when needed to make the bullet stronger.
- If a expirence uses tehcnology X but the job posting requires Y then you may swap X to Y is its realistic for the expirence to use Y instead of X. This will be your main method of implementing things into the resume. Use this to add things the resume dosent cover but can cover.
-Your are allowed to reorder bullets if you deem it fit just ensure you dont mess up formatting or consistency. It should remain exactly the same just position swapped.

However, stay within the basic reality and scope of each experience:
- Do not invent a completely different project.
- Do not invent a new employer or position.

Think of each existing experience as a flexible foundation. Preserve what the candidate fundamentally worked on, but reconstruct the bullet around the skills, technologies, engineering problems, and outcomes that matter most for this particular job.

Prefer substantial reorientation over synonym changes.

A strong rewritten bullet should usually communicate:
1. What was built, changed, or solved.
2. The technical implementation.
3. The aspect most relevant to the target job.
4. A concrete result, metric, scale, or engineering improvement where plausible.

Prioritize:
1. Company and role relevance
2. Required and preferred technical skills
3. Technical depth
4. Strong engineering evidence
5. Measurable impact
6. Natural ATS keyword coverage
7. Plausibility within the existing experience

If you add or materially change a technical detail that is not directly supported by the original resume, mark that specific recommendation as synthetic.

Return ONLY one valid JSON object in a json code fence, with no prose before or after it. Use this exact shape:
${RESPONSE_CONTRACT}

LaTeX targeting rules:
- currentLatex must be copied byte-for-byte from the source below and must occur exactly once.
- proposedLatex must be a complete drop-in replacement, preserving valid LaTeX commands and escaping.
- To add material, target one complete existing surrounding block and return that block plus the addition.
- Never change the preamble, packages, margins, fonts, contact details, dates, or factual content unless the proposal specifically justifies it.
- Encode every LaTeX backslash correctly inside the JSON string.
- Mark plausible but unconfirmed claims extrapolated. Mark invented or aggressive examples synthetic.
- Give 4-10 high-impact proposals. Every sourceUrl must be a complete http:// or https:// URL copied as plain text. Never use citation placeholders such as :contentReference or oaicite; use an empty string when no real URL is available.

BASE RESUME LATEX:
${latex}

JOB POSTING:
${jobPosting.trim()}`;
}
