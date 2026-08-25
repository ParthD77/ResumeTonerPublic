import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { db, exportBackup, restoreBackup, saveImport } from "./db";
import { fictionalImport } from "./sample";
afterEach(async () => {
  await db.delete();
  await db.open();
});
describe("local backup", () => {
  it("round trips structured data without credentials", async () => {
    await saveImport(fictionalImport.profile, fictionalImport.evidence);
    const backup = await exportBackup();
    expect(JSON.stringify(backup)).not.toContain("geminiApiKey");
    await db.profiles.clear();
    await restoreBackup(backup);
    expect((await db.profiles.toArray())[0].name).toBe("Jordan Lee");
  });
});
