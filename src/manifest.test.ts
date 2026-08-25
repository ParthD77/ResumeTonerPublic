import { describe, expect, it } from "vitest";
import manifest from "../public/manifest.json";
describe("Manifest V3 privacy boundary", () => {
  it("uses only approved permissions and Gemini host access", () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions.sort()).toEqual(
      ["activeTab", "scripting", "storage"].sort(),
    );
    expect(manifest.host_permissions).toEqual([
      "https://generativelanguage.googleapis.com/*",
    ]);
    expect(JSON.stringify(manifest)).not.toMatch(/localhost|127\.0\.0\.1/);
  });
  it("ships a self-only extension CSP", () =>
    expect(manifest.content_security_policy.extension_pages).toContain(
      "script-src 'self'",
    ));
});
