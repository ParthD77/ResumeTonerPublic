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
  it("allows only packaged scripts plus the PDF engine's local WebAssembly", () => {
    const policy = manifest.content_security_policy.extension_pages;
    expect(policy).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toMatch(/https?:|localhost|127\.0\.0\.1/);
  });
});
