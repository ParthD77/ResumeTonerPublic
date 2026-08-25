import { describe, expect, it } from "vitest";
import { ResumeImportSchema } from "./domain";
import { fictionalImport } from "./sample";
describe("versioned import", () => {
  it("accepts the fictional fixture", () =>
    expect(ResumeImportSchema.parse(fictionalImport).profile.name).toBe(
      "Jordan Lee",
    ));
  it("rejects incomplete input atomically", () =>
    expect(
      ResumeImportSchema.safeParse({
        schemaVersion: 1,
        profile: { name: "Incomplete" },
      }).success,
    ).toBe(false));
});
