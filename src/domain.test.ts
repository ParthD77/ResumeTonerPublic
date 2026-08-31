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
  it.each(["javascript:alert(1)", "data:text/html,unsafe", "file:///secret"])(
    "rejects an unsafe resume link protocol: %s",
    (url) => {
      const candidate = structuredClone(fictionalImport);
      candidate.profile.links = [{ label: "Unsafe", url }];
      expect(ResumeImportSchema.safeParse(candidate).success).toBe(false);
    },
  );
  it("accepts HTTPS resume links", () => {
    const candidate = structuredClone(fictionalImport);
    candidate.profile.links = [{ label: "Portfolio", url: "https://example.com" }];
    expect(ResumeImportSchema.safeParse(candidate).success).toBe(true);
  });
});
