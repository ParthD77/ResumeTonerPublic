import { ResumeImportSchema, nowIso, type ResumeImport } from "./domain";

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.trim() || fallback : fallback;
const boolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

export function extractJsonFromChat(value: string) {
  const trimmed = value.trim();
  const unfenced = trimmed
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end < start)
    throw new SyntaxError("No complete JSON object was found.");
  return JSON.parse(unfenced.slice(start, end + 1)) as unknown;
}

const cleanChatText = (value: unknown, fallback = "") => {
  let result = text(value, fallback);
  result = result.replace(/\[([^\]]+)\]\((?:mailto:)?[^)]+\)/gi, "$1");
  result = result.replace(/^([^[]*?)\]\(https?:\/\/.*\)(.*)$/i, "$1$2");
  return result.trim() || fallback;
};
const cleanEmail = (value: unknown) => {
  const match = text(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? "";
};
const cleanUrl = (value: unknown) => {
  const raw = text(value);
  const match = raw.match(/https?:\/\/[^\s\])"'}>,%]+/i);
  if (!match) return "";
  try {
    const parsed = new URL(match[0]);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
};
const timestamp = (value: unknown) => {
  const candidate = text(value);
  return candidate && !Number.isNaN(Date.parse(candidate))
    ? new Date(candidate).toISOString()
    : nowIso();
};
const strings = (value: unknown) =>
  array(value)
    .map((item) => cleanChatText(item))
    .filter(Boolean);

const bullet = (value: unknown, index: number, prefix: string) => {
  const source = object(value);
  return {
    id: text(source.id, `${prefix}.b${index + 1}`),
    text: cleanChatText(source.text, "Details provided by the user"),
    factuality: ["verified", "extrapolated", "synthetic"].includes(
      text(source.factuality),
    )
      ? text(source.factuality)
      : "verified",
    locked: boolean(source.locked),
    evidenceIds: strings(source.evidenceIds),
  };
};
const entry = (
  value: unknown,
  index: number,
  kind: "experience" | "project",
) => {
  const source = object(value);
  const id = text(source.id, `${kind}.${index + 1}`);
  const suppliedName = cleanChatText(source.name);
  return {
    id,
    organization: cleanChatText(
      source.organization,
      suppliedName || (kind === "project" ? "Project" : "Experience"),
    ),
    title: cleanChatText(source.title, kind === "project" ? "Project" : "Role"),
    dates: cleanChatText(source.dates),
    location: cleanChatText(source.location),
    url: cleanUrl(source.url),
    technologies: strings(source.technologies),
    locked: boolean(source.locked),
    bullets: array(source.bullets).map((item, bulletIndex) =>
      bullet(item, bulletIndex, id),
    ),
  };
};

export function normalizeResumeImport(value: unknown): ResumeImport {
  const root = object(value);
  const source = object(root.profile);
  const profileId = text(source.id, "profile.base");
  const createdAt = timestamp(source.createdAt);
  const normalized = {
    schemaVersion: 1,
    profile: {
      schemaVersion: 1,
      id: profileId,
      label: cleanChatText(source.label, "Base resume"),
      name: cleanChatText(source.name, "Resume owner"),
      email: cleanEmail(source.email),
      phone: cleanChatText(source.phone),
      location: cleanChatText(source.location),
      links: array(source.links)
        .map((item, index) => {
          const link = object(item);
          return {
            label: cleanChatText(link.label, `Link ${index + 1}`),
            url: cleanUrl(link.url),
          };
        })
        .filter((link) => Boolean(link.url)),
      education: array(source.education).map((item, index) => {
        const education = object(item);
        return {
          id: text(education.id, `education.${index + 1}`),
          institution: cleanChatText(education.institution, "Education"),
          credential: cleanChatText(education.credential, "Credential"),
          dates: cleanChatText(education.dates),
          location: cleanChatText(education.location),
          coursework: strings(education.coursework),
        };
      }),
      experience: array(source.experience).map((item, index) =>
        entry(item, index, "experience"),
      ),
      projects: array(source.projects).map((item, index) =>
        entry(item, index, "project"),
      ),
      skills: Object.fromEntries(
        Object.entries(object(source.skills)).map(([category, values]) => [
          category,
          strings(values),
        ]),
      ),
      createdAt,
      updatedAt: timestamp(source.updatedAt || createdAt),
    },
    evidence: array(root.evidence).map((item, index) => {
      const evidence = object(item);
      return {
        id: text(evidence.id, `evidence.${index + 1}`),
        entryId: text(evidence.entryId) || undefined,
        source: cleanChatText(evidence.source, "User-provided information"),
        facts: strings(evidence.facts),
        technologies: strings(evidence.technologies),
        metrics: array(evidence.metrics).map((item) => {
          const metric = object(item);
          return {
            value: cleanChatText(metric.value, "Not specified"),
            meaning: cleanChatText(metric.meaning, "User-provided metric"),
          };
        }),
        trusted: boolean(evidence.trusted, true),
      };
    }),
  };
  return ResumeImportSchema.parse(normalized);
}

export function parseResumeImport(value: string) {
  return normalizeResumeImport(extractJsonFromChat(value));
}
