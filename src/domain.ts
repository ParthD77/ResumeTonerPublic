import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;
export const FactualitySchema = z.enum([
  "verified",
  "extrapolated",
  "synthetic",
]);
export const DecisionSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "edited",
]);
export const TailoringModeSchema = z.enum([
  "evidence_only",
  "evidence_extrapolation",
  "stress_test",
]);
export const BulletSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(1000),
  factuality: FactualitySchema.default("verified"),
  locked: z.boolean().default(false),
  evidenceIds: z.array(z.string()).default([]),
});
export const ResumeEntrySchema = z.object({
  id: z.string().min(1),
  organization: z.string().min(1).max(300),
  title: z.string().min(1).max(300),
  dates: z.string().max(200).default(""),
  location: z.string().max(200).default(""),
  url: z.string().url().optional().or(z.literal("")),
  technologies: z.array(z.string().min(1).max(100)).default([]),
  bullets: z.array(BulletSchema).default([]),
  locked: z.boolean().default(false),
});
export const EducationSchema = z.object({
  id: z.string().min(1),
  institution: z.string().min(1).max(300),
  credential: z.string().min(1).max(500),
  dates: z.string().max(200).default(""),
  location: z.string().max(200).default(""),
});
export const ResumeProfileSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  label: z.string().min(1).max(100).default("Base resume"),
  name: z.string().min(1).max(200),
  email: z.string().email().or(z.literal("")).default(""),
  phone: z.string().max(100).default(""),
  location: z.string().max(200).default(""),
  links: z
    .array(z.object({ label: z.string().min(1), url: z.string().url() }))
    .default([]),
  education: z.array(EducationSchema).default([]),
  experience: z.array(ResumeEntrySchema).default([]),
  projects: z.array(ResumeEntrySchema).default([]),
  skills: z.record(z.array(z.string().min(1).max(100))).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const CareerEvidenceSchema = z.object({
  id: z.string().min(1),
  entryId: z.string().optional(),
  source: z.string().min(1).max(500),
  facts: z.array(z.string().min(1).max(2000)).default([]),
  technologies: z.array(z.string().min(1).max(100)).default([]),
  metrics: z
    .array(z.object({ value: z.string().min(1), meaning: z.string().min(1) }))
    .default([]),
  trusted: z.boolean().default(true),
});
export const ResumeImportSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  profile: ResumeProfileSchema,
  evidence: z.array(CareerEvidenceSchema).default([]),
});
export const JobCaptureSchema = z.object({
  company: z.string().max(300).default(""),
  role: z.string().max(300).default(""),
  location: z.string().max(300).default(""),
  url: z.string().url(),
  description: z.string().min(50).max(100_000),
  source: z.string().max(100).default("generic"),
  capturedAt: z.string().datetime(),
});
export const JobRequirementSchema = z.object({
  id: z.string().min(1),
  canonicalName: z.string().min(1).max(200),
  originalText: z.string().min(1).max(2000),
  importance: z.number().min(0).max(1),
  required: z.boolean().default(false),
  aliases: z.array(z.string()).default([]),
  category: z.string().default("skill"),
});
export const JobSchema = JobCaptureSchema.extend({
  requirements: z.array(JobRequirementSchema),
  seniority: z.string().default("unknown"),
  parserEngine: z.string().default("gemini"),
});
export const ScoreSchema = z.object({
  overall: z.number(),
  jobMatch: z.number(),
  resumeQuality: z.number(),
  cap: z.number(),
  covered: z.array(z.string()),
  missing: z.array(z.string()),
  explanations: z.array(
    z.object({
      requirement: z.string(),
      matched: z.boolean(),
      weight: z.number(),
      contribution: z.number(),
    }),
  ),
  algorithmVersion: z.literal("v1"),
});
export const ProposalSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["rewrite", "add"]),
  targetEntryId: z.string().min(1),
  targetBulletId: z.string().optional(),
  oldValue: z.string().default(""),
  newValue: z.string().min(1).max(1500),
  reason: z.string().min(1).max(2000),
  evidenceIds: z.array(z.string()).default([]),
  requirementIds: z.array(z.string()).default([]),
  estimatedScoreDelta: z.number().default(0),
  factuality: FactualitySchema,
  decision: DecisionSchema.default("pending"),
});
export const TailoringRunSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(["review", "ready", "exported"]),
  mode: TailoringModeSchema,
  pageTarget: z.union([z.literal(1), z.literal(2)]),
  baseProfile: ResumeProfileSchema,
  job: JobSchema,
  baseScore: ScoreSchema,
  proposedScore: ScoreSchema,
  proposals: z.array(ProposalSchema),
  generation: z.object({
    engine: z.literal("gemini"),
    model: z.string(),
    calls: z.number(),
  }),
  warnings: z.array(z.string()).default([]),
});
export const ApplicationRecordSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  exportedAt: z.string().datetime(),
  run: TailoringRunSchema,
  finalProfile: ResumeProfileSchema,
});
export const UserSettingsSchema = z.object({
  id: z.literal("settings"),
  consentVersion: z.number().int().min(0).default(0),
  termsVersion: z.number().int().min(0).default(0),
  onboardingCompletedAt: z.string().datetime().optional(),
  pageTarget: z.union([z.literal(1), z.literal(2)]).default(1),
  modelOverride: z.string().max(200).default(""),
  stressAcknowledged: z.boolean().default(false),
});
export const BackupEnvelopeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  profiles: z.array(ResumeProfileSchema),
  evidence: z.array(CareerEvidenceSchema),
  runs: z.array(TailoringRunSchema),
  applications: z.array(ApplicationRecordSchema),
  settings: UserSettingsSchema,
});

export type Bullet = z.infer<typeof BulletSchema>;
export type ResumeEntry = z.infer<typeof ResumeEntrySchema>;
export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;
export type CareerEvidence = z.infer<typeof CareerEvidenceSchema>;
export type ResumeImport = z.infer<typeof ResumeImportSchema>;
export type JobCapture = z.infer<typeof JobCaptureSchema>;
export type JobRequirement = z.infer<typeof JobRequirementSchema>;
export type Job = z.infer<typeof JobSchema>;
export type Score = z.infer<typeof ScoreSchema>;
export type TailoringProposal = z.infer<typeof ProposalSchema>;
export type TailoringRun = z.infer<typeof TailoringRunSchema>;
export type ApplicationRecord = z.infer<typeof ApplicationRecordSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type BackupEnvelope = z.infer<typeof BackupEnvelopeSchema>;
export type TailoringMode = z.infer<typeof TailoringModeSchema>;
export const nowIso = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}.${crypto.randomUUID()}`;
