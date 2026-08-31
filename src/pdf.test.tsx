import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderResumePdf } from "./pdf";
import { applyProposals } from "./engine";
import { fictionalImport } from "./sample";
describe("PDF export", () => {
  it("renders a valid selectable-text resume container on US Letter", async () => {
    const result = await renderResumePdf(fictionalImport.profile);
    expect(result.pages).toBe(1);
    expect(result.bytes).toBeGreaterThan(1_000);
    expect(result.blob.type).toBe("application/pdf");
    const document = await PDFDocument.load(await result.blob.arrayBuffer());
    const page = document.getPage(0);
    expect(page.getWidth()).toBe(612);
    expect(page.getHeight()).toBe(792);
  });
  it("contains accepted wording and no rejected/original wording", async () => {
    const base = structuredClone(fictionalImport.profile);
    const bullet = base.experience[0].bullets[0];
    bullet.text = "ORIGINAL_SECRET_WORDING";
    const finalProfile = applyProposals(base, [
      {
        id: "proposal.redaction-regression",
        type: "rewrite",
        targetEntryId: base.experience[0].id,
        targetBulletId: bullet.id,
        oldValue: "ORIGINAL_SECRET_WORDING",
        newValue: "NEW_VISIBLE_WORDING",
        reason: "Regression test",
        evidenceIds: [],
        requirementIds: [],
        estimatedScoreDelta: 0,
        factuality: "verified",
        decision: "accepted",
      },
    ]);
    const result = await renderResumePdf(finalProfile);
    const task = getDocument({
      data: new Uint8Array(await result.blob.arrayBuffer()),
    });
    const document = await task.promise;
    const extracted: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const content = await (await document.getPage(pageNumber)).getTextContent();
      extracted.push(
        content.items
          .filter((item) => "str" in item)
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );
    }
    await task.destroy();
    const text = extracted.join(" ").replace(/\s+/g, " ");
    expect(text).toContain("NEW_VISIBLE_WORDING");
    expect(text).not.toContain("ORIGINAL_SECRET_WORDING");
  });
});
