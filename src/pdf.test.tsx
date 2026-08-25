import { describe, expect, it } from "vitest";
import { renderResumePdf } from "./pdf";
import { fictionalImport } from "./sample";
describe("PDF export", () => {
  it("renders a valid selectable-text resume container on US Letter", async () => {
    const result = await renderResumePdf(fictionalImport.profile);
    expect(result.pages).toBe(1);
    expect(result.bytes).toBeGreaterThan(1_000);
    expect(result.blob.type).toBe("application/pdf");
  });
});
