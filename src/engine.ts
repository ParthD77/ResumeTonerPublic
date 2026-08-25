import { z } from "zod";
import type {
  CareerEvidence,
  Job,
  JobCapture,
  JobRequirement,
  ResumeEntry,
  ResumeProfile,
  Score,
  TailoringMode,
  TailoringProposal,
  TailoringRun,
} from "./domain";
import {
  FactualitySchema,
  JobSchema,
  newId,
  nowIso,
  ProposalSchema,
} from "./domain";
import { getGeminiKey } from "./key-store";

export const DEFAULT_MODEL = "gemini-3.7-flash";
export const ALIASES: Record<string, string> = {
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  "react.js": "React",
  reactjs: "React",
  "react native": "React Native",
  "node.js": "Node.js",
  nodejs: "Node.js",
  "amazon web services": "AWS",
  aws: "AWS",
  "restful api": "REST API",
  "rest apis": "REST API",
  "ci cd": "CI/CD",
  "ci/cd": "CI/CD",
  k8s: "Kubernetes",
  "github actions": "GitHub Actions",
  "unit tests": "Testing",
  "integration tests": "Testing",
  "end-to-end tests": "Testing",
  oauth2: "OAuth",
  "object oriented programming": "OOP",
  ml: "machine learning",
  mlops: "MLOps",
  "google cloud platform": "GCP",
  "generative ai": "Generative AI",
  "large language models": "LLMs",
};
export const KNOWN = [
  "Python",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "JavaScript",
  "TypeScript",
  "SQL",
  "HTML",
  "CSS",
  "React Native",
  "React",
  "Angular",
  "Vue",
  "Svelte",
  "Node.js",
  "FastAPI",
  "Django",
  "Flask",
  "Spring",
  "Next.js",
  "Express",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQLite",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Git",
  "Linux",
  "REST API",
  "GraphQL",
  "CI/CD",
  "Testing",
  "OAuth",
  "JWT",
  "SSO",
  "RBAC",
  "OOP",
  "Agile",
  "Scrum",
  "system design",
  "observability",
  "security",
  "accessibility",
  "optimization",
  "data structures",
  "algorithms",
  "microservices",
  "distributed systems",
  "machine learning",
  "Generative AI",
  "Deep Learning",
  "NLP",
  "Computer Vision",
  "LLMs",
  "PyTorch",
  "TensorFlow",
  "scikit-learn",
  "NumPy",
  "pandas",
  "MLOps",
  "RAG",
  "vector databases",
  "API design",
  "performance tuning",
  "scalability",
  "fault tolerance",
  "cross-functional",
  "stakeholder management",
  "technical documentation",
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const canonical = (s: string) => ALIASES[s.trim().toLowerCase()] ?? s.trim();
const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
};
const termsFor = (name: string, aliases: string[] = []) => [
  name,
  ...aliases,
  ...Object.entries(ALIASES)
    .filter(([, v]) => v.toLowerCase() === name.toLowerCase())
    .map(([k]) => k),
];
const hasTerm = (text: string, terms: string[]) =>
  terms.some((t) =>
    new RegExp(`(^|[^\\w])${esc(t)}([^\\w]|$)`, "i").test(text),
  );
const allText = (r: ResumeProfile) =>
  [
    r.name,
    r.email,
    r.phone,
    r.location,
    ...r.education.flatMap((x) => [
      x.institution,
      x.credential,
      x.dates,
      x.location,
    ]),
    ...[...r.experience, ...r.projects].flatMap((x) => [
      x.organization,
      x.title,
      x.dates,
      x.location,
      ...x.technologies,
      ...x.bullets.map((b) => b.text),
    ]),
    ...Object.values(r.skills).flat(),
  ].join(" ");

export function deterministicRequirements(
  description: string,
): JobRequirement[] {
  const out: JobRequirement[] = [];
  for (const term of KNOWN) {
    const aliases = termsFor(term);
    if (!hasTerm(description, aliases)) continue;
    const lower = description.toLowerCase();
    const first = Math.min(
      ...aliases
        .map((a) => lower.indexOf(a.toLowerCase()))
        .filter((i) => i >= 0),
    );
    const start = Math.max(
      description.lastIndexOf(".", first) + 1,
      description.lastIndexOf("\n", first) + 1,
    );
    let end = description.indexOf(".", first);
    if (end < 0) end = Math.min(description.length, first + 500);
    const originalText = description.slice(start, end).trim() || term;
    const context = description
      .slice(
        Math.max(0, first - 250),
        Math.min(description.length, first + 250),
      )
      .toLowerCase();
    const required =
      /(required|must have|minimum qualification|what you.?ll need)/.test(
        context,
      );
    const preferred = /(preferred|nice to have|bonus)/.test(context);
    out.push({
      id: `req.${hash(term.toLowerCase())}`,
      canonicalName: canonical(term),
      originalText,
      importance: required ? 0.92 : preferred ? 0.52 : 0.72,
      required,
      aliases: Object.entries(ALIASES)
        .filter(([, v]) => v.toLowerCase() === term.toLowerCase())
        .map(([k]) => k),
      category: "skill",
    });
  }
  return out.sort(
    (a, b) =>
      b.importance - a.importance ||
      a.canonicalName.localeCompare(b.canonicalName),
  );
}

export function deterministicJob(c: JobCapture): Job {
  return JobSchema.parse({
    ...c,
    requirements: deterministicRequirements(c.description),
    seniority:
      ["staff", "senior", "junior", "intern"].find((x) =>
        c.description.toLowerCase().includes(x),
      ) ?? "unknown",
    parserEngine: "deterministic",
  });
}

export function scoreResume(
  resume: ResumeProfile,
  job: Job,
  stress = false,
): Score {
  const text = allText(resume),
    total = job.requirements.reduce((n, r) => n + r.importance, 0) || 1;
  let earned = 0;
  const covered: string[] = [],
    missing: string[] = [],
    requiredMissing: string[] = [],
    explanations: Score["explanations"] = [];
  for (const req of job.requirements) {
    const matched = hasTerm(text, termsFor(req.canonicalName, req.aliases));
    const contribution = matched ? (req.importance / total) * 90 : 0;
    earned += contribution;
    (matched ? covered : missing).push(req.canonicalName);
    if (req.required && !matched) requiredMissing.push(req.canonicalName);
    explanations.push({
      requirement: req.canonicalName,
      matched,
      weight: +req.importance.toFixed(2),
      contribution: +contribution.toFixed(2),
    });
  }
  const jobMatch = Math.min(
    100,
    earned +
      (resume.name &&
      resume.experience.length &&
      Object.keys(resume.skills).length
        ? 10
        : 5),
  );
  const bullets = [...resume.experience, ...resume.projects].flatMap((e) =>
    e.bullets.map((b) => b.text),
  );
  const relevant = bullets.filter((b) =>
    covered.some((x) => b.toLowerCase().includes(x.toLowerCase())),
  ).length;
  const impact = bullets.filter((b) =>
    /\b\d+(?:\.\d+)?\s*(?:%|x|ms|s|users?|requests?|hours?)?\b/i.test(b),
  ).length;
  const technical = bullets.filter((b) =>
    /\b(?:built|developed|implemented|designed|optimized|deployed|engineered|automated)\b/i.test(
      b,
    ),
  ).length;
  const d = Math.max(1, bullets.length);
  const resumeQuality = Math.min(
    100,
    (35 * relevant) / d + (25 * impact) / d + (20 * technical) / d + 20,
  );
  const cap = stress ? 100 : requiredMissing.length ? 82 : 100;
  const overall = Math.min(cap, 0.55 * jobMatch + 0.45 * resumeQuality);
  return {
    overall: +overall.toFixed(1),
    jobMatch: +jobMatch.toFixed(1),
    resumeQuality: +resumeQuality.toFixed(1),
    cap,
    covered,
    missing,
    explanations,
    algorithmVersion: "v1",
  };
}

const JobExtractionSchema = z.object({
  company: z.string(),
  role: z.string(),
  location: z.string(),
  seniority: z.string(),
  requirements: z.array(
    z.object({
      canonicalName: z.string(),
      originalText: z.string(),
      importance: z.number().min(0).max(1),
      required: z.boolean(),
      aliases: z.array(z.string()),
      category: z.string(),
    }),
  ),
});
const CandidateSchema = z.object({
  candidateId: z.string(),
  type: z.enum(["rewrite", "add"]),
  targetEntryId: z.string(),
  targetBulletId: z.string().optional(),
  text: z.string(),
  reason: z.string(),
  evidenceIds: z.array(z.string()),
  matchedRequirements: z.array(z.string()),
  factuality: FactualitySchema,
});
const CandidateSetSchema = z.object({ candidates: z.array(CandidateSchema) });
const CritiqueSetSchema = z.object({
  rankings: z.array(
    z.object({
      candidateId: z.string(),
      score: z.number().min(0).max(100),
      critique: z.string(),
    }),
  ),
});

const schemas = {
  job: {
    type: "object",
    properties: {
      company: { type: "string" },
      role: { type: "string" },
      location: { type: "string" },
      seniority: { type: "string" },
      requirements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            canonicalName: { type: "string" },
            originalText: { type: "string" },
            importance: { type: "number", minimum: 0, maximum: 1 },
            required: { type: "boolean" },
            aliases: { type: "array", items: { type: "string" } },
            category: { type: "string" },
          },
          required: [
            "canonicalName",
            "originalText",
            "importance",
            "required",
            "aliases",
            "category",
          ],
        },
      },
    },
    required: ["company", "role", "location", "seniority", "requirements"],
  },
  candidates: {
    type: "object",
    properties: {
      candidates: {
        type: "array",
        items: {
          type: "object",
          properties: {
            candidateId: { type: "string" },
            type: { type: "string", enum: ["rewrite", "add"] },
            targetEntryId: { type: "string" },
            targetBulletId: { type: "string" },
            text: { type: "string" },
            reason: { type: "string" },
            evidenceIds: { type: "array", items: { type: "string" } },
            matchedRequirements: { type: "array", items: { type: "string" } },
            factuality: {
              type: "string",
              enum: ["verified", "extrapolated", "synthetic"],
            },
          },
          required: [
            "candidateId",
            "type",
            "targetEntryId",
            "text",
            "reason",
            "evidenceIds",
            "matchedRequirements",
            "factuality",
          ],
        },
      },
    },
    required: ["candidates"],
  },
  critiques: {
    type: "object",
    properties: {
      rankings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            candidateId: { type: "string" },
            score: { type: "number", minimum: 0, maximum: 100 },
            critique: { type: "string" },
          },
          required: ["candidateId", "score", "critique"],
        },
      },
    },
    required: ["rankings"],
  },
} as const;

async function geminiJson<T>(
  model: string,
  system: string,
  prompt: string,
  schema: object,
  validator: z.ZodType<T>,
  maxOutputTokens: number,
): Promise<T> {
  const key = await getGeminiKey();
  if (!key) throw new Error("Add and test a Gemini API key in Settings first.");
  if (!/^[a-zA-Z0-9._-]+$/.test(model))
    throw new Error("The Gemini model identifier is invalid.");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens,
          thinkingConfig: { thinkingLevel: "medium", includeThoughts: false },
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      }),
    },
  );
  if (!response.ok)
    throw new Error(
      `Gemini request failed (${response.status}). Check the key, model, quota, and billing settings.`,
    );
  const body = await response.json();
  const text = (body.candidates?.[0]?.content?.parts ?? [])
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) throw new Error("Gemini returned no structured result.");
  const parsed = (() => {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Gemini returned malformed JSON; nothing was applied.");
    }
  })();
  const result = validator.safeParse(parsed);
  if (!result.success)
    throw new Error(
      `Gemini response failed validation: ${result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  return result.data;
}

export async function testGemini(model = DEFAULT_MODEL) {
  const key = await getGeminiKey();
  if (!key) throw new Error("Enter an API key first.");
  if (!/^[a-zA-Z0-9._-]+$/.test(model))
    throw new Error("Invalid model identifier.");
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}`,
    { headers: { "x-goog-api-key": key } },
  );
  if (!r.ok) throw new Error(`Gemini connection failed (${r.status}).`);
  return true;
}

export async function parseJob(
  capture: JobCapture,
  model = DEFAULT_MODEL,
): Promise<Job> {
  const baseline = deterministicJob(capture);
  const out = await geminiJson(
    model,
    "Extract technical job requirements conservatively. Preserve original wording and never invent requirements.",
    JSON.stringify({
      capture,
      deterministicRequirements: baseline.requirements,
    }),
    schemas.job,
    JobExtractionSchema,
    2200,
  );
  const merged = new Map(
    baseline.requirements.map((r) => [r.canonicalName.toLowerCase(), r]),
  );
  for (const r of out.requirements) {
    const name = canonical(r.canonicalName),
      prior = merged.get(name.toLowerCase());
    merged.set(name.toLowerCase(), {
      id: `req.${hash(name.toLowerCase())}`,
      canonicalName: name,
      originalText: r.originalText,
      importance: Math.max(r.importance, prior?.importance ?? 0),
      required: r.required || (prior?.required ?? false),
      aliases: [...new Set([...r.aliases, ...(prior?.aliases ?? [])])],
      category: r.category,
    });
  }
  return JobSchema.parse({
    ...capture,
    company: capture.company || out.company,
    role: capture.role || out.role,
    location: capture.location || out.location,
    seniority: out.seniority,
    requirements: [...merged.values()].sort(
      (a, b) => b.importance - a.importance,
    ),
    parserEngine: "gemini",
  });
}

const numbers = (s: string) =>
  new Set(s.toLowerCase().match(/\b\d+(?:[.,]\d+)?(?:%|\+|x)?\b/g) ?? []);
const subset = (a: Set<string>, b: Set<string>) =>
  [...a].every((x) => b.has(x));
const coverage = (s: string, j: Job) =>
  new Set(
    j.requirements
      .filter((r) => hasTerm(s, termsFor(r.canonicalName, r.aliases)))
      .map((r) => r.id),
  );
const similarity = (a: string, b: string) => {
  const aa = a.toLowerCase(),
    bb = b.toLowerCase();
  const pairs = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const p = s.slice(i, i + 2);
      m.set(p, (m.get(p) ?? 0) + 1);
    }
    return m;
  };
  const x = pairs(aa),
    y = pairs(bb);
  let hit = 0,
    total = 0;
  for (const n of x.values()) total += n;
  for (const n of y.values()) total += n;
  for (const [k, n] of x) hit += Math.min(n, y.get(k) ?? 0);
  return total
    ? (2 * hit) / (total + [...y.values()].reduce((a, n) => a + n, 0))
    : 1;
};
export function applyProposals(
  base: ResumeProfile,
  proposals: TailoringProposal[],
): ResumeProfile {
  const copy = structuredClone(base);
  for (const p of proposals) {
    if (!["accepted", "edited"].includes(p.decision)) continue;
    const entry = [...copy.experience, ...copy.projects].find(
      (e) => e.id === p.targetEntryId,
    );
    if (!entry || entry.locked) continue;
    if (p.type === "rewrite") {
      const b = entry.bullets.find((x) => x.id === p.targetBulletId);
      if (b && !b.locked) {
        b.text = p.newValue;
        b.factuality = p.factuality;
        b.evidenceIds = p.evidenceIds;
      }
    } else
      entry.bullets.push({
        id: `${entry.id}.bullet.${hash(p.id)}`,
        text: p.newValue,
        factuality: p.factuality,
        locked: false,
        evidenceIds: p.evidenceIds,
      });
  }
  copy.updatedAt = nowIso();
  return copy;
}

export async function generateRun(
  profile: ResumeProfile,
  evidence: CareerEvidence[],
  job: Job,
  mode: TailoringMode,
  pageTarget: 1 | 2,
  model = DEFAULT_MODEL,
): Promise<TailoringRun> {
  const entries = [...profile.experience, ...profile.projects],
    editable = entries
      .filter((e) => !e.locked)
      .map((e) => ({ ...e, bullets: e.bullets.filter((b) => !b.locked) }));
  const prompt = JSON.stringify({
    mode,
    resume: profile,
    careerEvidence: evidence.filter((e) => e.trusted),
    job,
    editableTargets: editable,
    instructions:
      "Generate useful candidates only. Rewrites must add job signal or shorten without loss. Adds must be supported by evidence and target an existing entry. Never invent facts, technologies, roles, dates, or metrics.",
  });
  const candidates = await geminiJson(
    model,
    "You are a careful technical resume writer. Use only supplied evidence. Prefer fewer material changes. Synthetic claims are allowed only in stress_test mode.",
    prompt,
    schemas.candidates,
    CandidateSetSchema,
    4500,
  );
  const allowed = new Set(
    mode === "evidence_only"
      ? ["verified"]
      : mode === "evidence_extrapolation"
        ? ["verified", "extrapolated"]
        : ["verified", "extrapolated", "synthetic"],
  );
  const evidenceIds = new Set(
    evidence.filter((e) => e.trusted).map((e) => e.id),
  );
  const evidenceNums = numbers(JSON.stringify({ profile, evidence }));
  const existing = entries.flatMap((e) => e.bullets.map((b) => b.text));
  const valid = candidates.candidates.filter((c) => {
    const entry = editable.find((e) => e.id === c.targetEntryId);
    if (!entry || !allowed.has(c.factuality) || !c.text.trim()) return false;
    if (
      c.factuality !== "synthetic" &&
      (!c.evidenceIds.length ||
        c.evidenceIds.some((id) => !evidenceIds.has(id)) ||
        !subset(numbers(c.text), evidenceNums))
    )
      return false;
    if (
      existing.some(
        (x) =>
          similarity(c.text, x) >= 0.82 &&
          x !== entry.bullets.find((b) => b.id === c.targetBulletId)?.text,
      )
    )
      return false;
    if (c.type === "rewrite") {
      const old = entry.bullets.find((b) => b.id === c.targetBulletId)?.text;
      if (!old) return false;
      const newSignals = [...coverage(c.text, job)].some(
        (x) => !coverage(old, job).has(x),
      );
      const shortened =
        c.text.length <= old.length * 0.9 &&
        subset(coverage(old, job), coverage(c.text, job));
      if (mode !== "stress_test" && !newSignals && !shortened) return false;
      if (
        mode !== "stress_test" &&
        c.text.length > Math.max(old.length + 25, old.length * 1.15)
      )
        return false;
    }
    return true;
  });
  const critiques = valid.length
    ? await geminiJson(
        model,
        "Rank technical resume candidates. Penalize unsupported, vague, redundant, keyword-stuffed, or overly long writing.",
        JSON.stringify({ requirements: job.requirements, candidates: valid }),
        schemas.critiques,
        CritiqueSetSchema,
        2200,
      )
    : { rankings: [] };
  const ranks = new Map(critiques.rankings.map((x) => [x.candidateId, x]));
  const best = new Map<string, (typeof valid)[number]>();
  for (const c of valid) {
    const key = c.type === "rewrite" ? c.targetBulletId! : c.targetEntryId;
    const prior = best.get(key);
    if (
      !prior ||
      (ranks.get(c.candidateId)?.score ?? 0) >
        (ranks.get(prior.candidateId)?.score ?? 0)
    )
      best.set(key, c);
  }
  let growth = 0;
  const proposals: TailoringProposal[] = [];
  for (const c of [...best.values()]
    .sort(
      (a, b) =>
        (ranks.get(b.candidateId)?.score ?? 0) -
        (ranks.get(a.candidateId)?.score ?? 0),
    )
    .slice(0, 7)) {
    const entry = entries.find((e) => e.id === c.targetEntryId)!;
    const old =
      c.type === "rewrite"
        ? (entry.bullets.find((b) => b.id === c.targetBulletId)?.text ?? "")
        : "";
    const delta = c.text.length - old.length;
    if (mode !== "stress_test" && delta > 0 && growth + delta > 60) continue;
    growth += Math.max(0, delta);
    const rank = ranks.get(c.candidateId);
    proposals.push(
      ProposalSchema.parse({
        id: newId("proposal"),
        type: c.type,
        targetEntryId: c.targetEntryId,
        targetBulletId: c.targetBulletId,
        oldValue: old,
        newValue: c.text.trim(),
        reason: `${c.reason}${rank?.critique ? ` Quality review: ${rank.critique}` : ""}`,
        evidenceIds: c.evidenceIds,
        requirementIds: job.requirements
          .filter((r) =>
            c.matchedRequirements.some(
              (x) => x.toLowerCase() === r.canonicalName.toLowerCase(),
            ),
          )
          .map((r) => r.id),
        estimatedScoreDelta: +Math.max(
          0,
          ((rank?.score ?? 50) - 50) / 12.5,
        ).toFixed(1),
        factuality: c.factuality,
        decision: "pending",
      }),
    );
  }
  const baseScore = scoreResume(profile, job, mode === "stress_test"),
    createdAt = nowIso();
  return {
    id: newId("run"),
    createdAt,
    updatedAt: createdAt,
    status: proposals.length ? "review" : "ready",
    mode,
    pageTarget,
    baseProfile: structuredClone(profile),
    job,
    baseScore,
    proposedScore: baseScore,
    proposals,
    generation: { engine: "gemini", model, calls: valid.length ? 2 : 1 },
    warnings: proposals.length
      ? []
      : [
          "Gemini returned no proposals that passed the evidence, relevance, duplication, metric, and length checks.",
        ],
  };
}

export function recalculateRun(run: TailoringRun): TailoringRun {
  const final = applyProposals(run.baseProfile, run.proposals);
  return {
    ...run,
    updatedAt: nowIso(),
    status: run.proposals.some((p) => p.decision === "pending")
      ? "review"
      : "ready",
    proposedScore: scoreResume(final, run.job, run.mode === "stress_test"),
  };
}

export async function compactRun(
  run: TailoringRun,
  model = DEFAULT_MODEL,
): Promise<TailoringProposal[]> {
  const current = applyProposals(run.baseProfile, run.proposals);
  const entries = [...current.experience, ...current.projects];
  const payload = {
    requirements: run.job.requirements,
    bullets: entries
      .flatMap((e) =>
        e.bullets
          .filter((b) => !b.locked)
          .map((b) => ({
            candidateId: `compact.${b.id}`,
            type: "rewrite",
            targetEntryId: e.id,
            targetBulletId: b.id,
            text: b.text,
            evidenceIds: b.evidenceIds,
            factuality: b.factuality,
          })),
      )
      .sort((a, b) => b.text.length - a.text.length)
      .slice(0, 10),
  };
  const out = await geminiJson(
    model,
    "Shorten technical resume bullets by 15-30%. Preserve every number, technology, accomplishment, evidence relationship, and job requirement. Return only useful candidates.",
    JSON.stringify(payload),
    schemas.candidates,
    CandidateSetSchema,
    3000,
  );
  return out.candidates.flatMap((c) => {
    const entry = entries.find((e) => e.id === c.targetEntryId),
      old = entry?.bullets.find((b) => b.id === c.targetBulletId);
    if (
      !old ||
      old.locked ||
      c.text.length > old.text.length * 0.9 ||
      !subset(numbers(old.text), numbers(c.text)) ||
      !subset(coverage(old.text, run.job), coverage(c.text, run.job))
    )
      return [];
    return [
      ProposalSchema.parse({
        id: newId("compact"),
        type: "rewrite",
        targetEntryId: c.targetEntryId,
        targetBulletId: c.targetBulletId,
        oldValue: old.text,
        newValue: c.text,
        reason: `Page-fit compaction saves ${old.text.length - c.text.length} characters while preserving metrics and job coverage.`,
        evidenceIds: old.evidenceIds,
        requirementIds: [...coverage(old.text, run.job)],
        estimatedScoreDelta: 0,
        factuality: old.factuality,
        decision: "pending",
      }),
    ];
  });
}
