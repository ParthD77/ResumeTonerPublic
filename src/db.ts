import Dexie, { type EntityTable } from "dexie";
import type {
  ApplicationRecord,
  CareerEvidence,
  ResumeProfile,
  TailoringRun,
  UserSettings,
} from "./domain";
import { BackupEnvelopeSchema, nowIso } from "./domain";
export type ResumeSource = {
  id: "base";
  filename: string;
  pdf: Blob;
  importedAt: string;
};
class ResumeTonerDatabase extends Dexie {
  profiles!: EntityTable<ResumeProfile, "id">;
  evidence!: EntityTable<CareerEvidence, "id">;
  runs!: EntityTable<TailoringRun, "id">;
  applications!: EntityTable<ApplicationRecord, "id">;
  settings!: EntityTable<UserSettings, "id">;
  resumeSources!: EntityTable<ResumeSource, "id">;
  constructor() {
    super("resume-toner");
    this.version(1).stores({
      profiles: "id, updatedAt",
      evidence: "id, entryId",
      runs: "id, createdAt, status",
      applications: "id, exportedAt",
      settings: "id",
    });
    this.version(2)
      .stores({
        profiles: "id, updatedAt",
        evidence: "id, entryId",
        runs: "id, createdAt, status",
        applications: "id, exportedAt",
        settings: "id",
      })
      .upgrade((transaction) =>
        transaction
          .table("profiles")
          .toCollection()
          .modify((profile: ResumeProfile) => {
            profile.education = profile.education.map((education) => ({
              ...education,
              coursework: education.coursework ?? [],
            }));
          }),
      );
    this.version(3).stores({
      profiles: "id, updatedAt",
      evidence: "id, entryId",
      runs: "id, createdAt, status",
      applications: "id, exportedAt",
      settings: "id",
      resumeSources: "id, importedAt",
    });
  }
}
export const db = new ResumeTonerDatabase();
export async function getSettings(): Promise<UserSettings> {
  const defaults: UserSettings = {
    id: "settings",
    consentVersion: 0,
    termsVersion: 0,
    pageTarget: 1,
    modelOverride: "",
    stressAcknowledged: false,
  };
  return { ...defaults, ...(await db.settings.get("settings")) };
}
export async function saveImport(
  profile: ResumeProfile,
  evidence: CareerEvidence[],
  source?: { filename: string; pdf: Blob } | null,
) {
  await db.transaction("rw", db.profiles, db.evidence, db.resumeSources, async () => {
    await db.profiles.clear();
    await db.evidence.clear();
    await db.profiles.put({ ...profile, updatedAt: nowIso() });
    await db.evidence.bulkPut(evidence);
    if (source !== undefined) {
      await db.resumeSources.clear();
      if (source)
        await db.resumeSources.put({
          id: "base",
          filename: source.filename,
          pdf: source.pdf,
          importedAt: nowIso(),
        });
    }
  });
}
export async function getLocalDataSummary() {
  const [profiles, evidence, runs, applications, settings] = await Promise.all([
    db.profiles.toArray(),
    db.evidence.toArray(),
    db.runs.toArray(),
    db.applications.toArray(),
    db.settings.toArray(),
  ]);
  const value = { profiles, evidence, runs, applications, settings };
  return {
    bytes: new TextEncoder().encode(JSON.stringify(value)).byteLength,
    profiles: profiles.length,
    evidence: evidence.length,
    runs: runs.length,
    applications: applications.length,
  };
}
export async function exportBackup() {
  return BackupEnvelopeSchema.parse({
    schemaVersion: 1,
    exportedAt: nowIso(),
    profiles: await db.profiles.toArray(),
    evidence: await db.evidence.toArray(),
    runs: await db.runs.toArray(),
    applications: await db.applications.toArray(),
    settings: await getSettings(),
  });
}
export async function restoreBackup(value: unknown) {
  const b = BackupEnvelopeSchema.parse(value);
  await db.transaction(
    "rw",
    [
      db.profiles,
      db.evidence,
      db.runs,
      db.applications,
      db.settings,
      db.resumeSources,
    ],
    async () => {
      await Promise.all([
        db.profiles.clear(),
        db.evidence.clear(),
        db.runs.clear(),
        db.applications.clear(),
        db.settings.clear(),
        db.resumeSources.clear(),
      ]);
      await db.profiles.bulkPut(b.profiles);
      await db.evidence.bulkPut(b.evidence);
      await db.runs.bulkPut(b.runs);
      await db.applications.bulkPut(b.applications);
      await db.settings.put(b.settings);
    },
  );
}
export async function deleteAllData() {
  await db.delete();
  await db.open();
}
