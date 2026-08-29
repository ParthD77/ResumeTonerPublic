import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { TailoringProposal } from "./domain";

GlobalWorkerOptions.workerSrc = workerUrl;

type PositionedText = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const normalized = (value: string) => value.replace(/\s+/g, " ").trim();

function findTextRange(items: PositionedText[], target: string) {
  const needle = normalized(target);
  for (let start = 0; start < items.length; start += 1) {
    let combined = "";
    for (let end = start; end < items.length; end += 1) {
      combined = normalized(`${combined} ${items[end].text}`);
      if (combined === needle || combined.includes(needle))
        return { items: items.slice(start, end + 1), combined };
      if (combined.length > needle.length + 80) break;
    }
  }
  return null;
}

function wrapToLines(
  text: string,
  widths: number[],
  measure: (value: string) => number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cursor = 0;
  for (const width of widths) {
    let line = "";
    while (cursor < words.length) {
      const candidate = line ? `${line} ${words[cursor]}` : words[cursor];
      if (line && measure(candidate) > width) break;
      if (!line && measure(candidate) > width) return null;
      line = candidate;
      cursor += 1;
    }
    lines.push(line);
  }
  return cursor === words.length ? lines : null;
}

export async function renderOriginalLayoutPdf(
  source: Blob,
  proposals: TailoringProposal[],
) {
  const bytes = await source.arrayBuffer();
  const [editable, loadingTask] = [
    await PDFDocument.load(bytes),
    getDocument({ data: new Uint8Array(bytes.slice(0)) }),
  ];
  const readable = await loadingTask.promise;
  const font = await editable.embedFont(StandardFonts.Helvetica);
  const accepted = proposals.filter(
    (proposal) =>
      proposal.type === "rewrite" &&
      ["accepted", "edited"].includes(proposal.decision),
  );

  for (const proposal of accepted) {
    let replaced = false;
    for (let pageIndex = 0; pageIndex < readable.numPages && !replaced; pageIndex += 1) {
      const page = await readable.getPage(pageIndex + 1);
      const content = await page.getTextContent();
      const items = content.items
        .filter((item) => "str" in item && Boolean(item.str.trim()))
        .map((raw) => {
          const item = raw as {
            str: string;
            transform: number[];
            width: number;
            height: number;
          };
          return ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: Math.abs(item.height || item.transform[3]) || 10,
          });
        });
      const match = findTextRange(items, proposal.oldValue);
      if (!match) continue;

      const lines = new Map<number, PositionedText[]>();
      for (const item of match.items) {
        const key = [...lines.keys()].find((value) => Math.abs(value - item.y) < 2) ?? item.y;
        lines.set(key, [...(lines.get(key) ?? []), item]);
      }
      const boxes = [...lines.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, lineItems]) => ({
          x: Math.min(...lineItems.map((item) => item.x)),
          y: Math.min(...lineItems.map((item) => item.y)),
          width:
            Math.max(...lineItems.map((item) => item.x + item.width)) -
            Math.min(...lineItems.map((item) => item.x)),
          height: Math.max(...lineItems.map((item) => item.height)),
        }));
      const replacement = match.combined.replace(
        normalized(proposal.oldValue),
        normalized(proposal.newValue),
      );
      const fontSize = Math.max(7.5, Math.min(12, boxes[0].height * 0.9));
      const wrapped = wrapToLines(
        replacement,
        boxes.map((box) => box.width + 2),
        (value) => font.widthOfTextAtSize(value, fontSize),
      );
      if (!wrapped)
        throw new Error(
          `“${proposal.newValue}” does not fit its original PDF text area. Shorten it or reject that change.`,
        );

      const editablePage = editable.getPage(pageIndex);
      boxes.forEach((box, index) => {
        editablePage.drawRectangle({
          x: box.x - 1,
          y: box.y - 1,
          width: box.width + 3,
          height: box.height + 3,
          color: rgb(1, 1, 1),
        });
        if (wrapped[index])
          editablePage.drawText(wrapped[index], {
            x: box.x,
            y: box.y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
      });
      replaced = true;
    }
    if (!replaced)
      throw new Error(
        `The original PDF text for “${proposal.oldValue}” could not be located exactly. Reject that change or use the template export.`,
      );
  }
  await loadingTask.destroy();
  const output = await editable.save();
  return {
    blob: new Blob([new Uint8Array(output).buffer as ArrayBuffer], {
      type: "application/pdf",
    }),
    pages: editable.getPageCount(),
    bytes: output.byteLength,
  };
}
