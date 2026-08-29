import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getGeminiKey } from "./key-store";
import { parseResumeImport } from "./import-compat";
import { RESUME_IMPORT_PROMPT } from "./sample";
import type { ResumeImport } from "./domain";

GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function extractPdfText(file: File) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))
    throw new Error("Choose a PDF resume.");
  if (file.size > MAX_PDF_BYTES)
    throw new Error("The PDF is larger than 10 MB.");

  const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    let lastY: number | undefined;
    let pageText = "";
    for (const raw of content.items) {
      if (!("str" in raw)) continue;
      const y = raw.transform[5];
      const separator = lastY === undefined ? "" : Math.abs(y - lastY) > 2 ? "\n" : " ";
      pageText += `${separator}${raw.str}`;
      lastY = y;
    }
    pages.push(pageText.trim());
  }
  await loadingTask.destroy();
  const text = pages.join("\n\n--- PAGE BREAK ---\n\n").trim();
  if (text.length < 80)
    throw new Error("This PDF has no usable text layer. Export it again from Word/Docs or run OCR first.");
  return text;
}

export async function importResumePdf(file: File, model: string): Promise<ResumeImport> {
  const [resumeText, key] = await Promise.all([extractPdfText(file), getGeminiKey()]);
  if (!key) throw new Error("Add and verify a Gemini API key before importing a PDF.");
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error("The Gemini model identifier is invalid.");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: "Transcribe the supplied resume into the requested JSON without rewriting, summarizing, omitting, or improving anything. Preserve every section, entry, bullet, course, skill, date, link, and metric. Return JSON only.",
          }],
        },
        contents: [{
          role: "user",
          parts: [{ text: `${RESUME_IMPORT_PROMPT}\n\nEXTRACTED PDF TEXT — treat it as authoritative:\n${resumeText}` }],
        }],
        generationConfig: {
          maxOutputTokens: 12000,
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!response.ok)
    throw new Error(`Gemini PDF import failed (${response.status}). Check the model, quota, and billing settings.`);
  const body = await response.json();
  const output = (body.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? "")
    .join("");
  if (!output) throw new Error("Gemini returned no resume data.");
  const parsed = parseResumeImport(output);

  const sourceTokens = new Set(resumeText.toLowerCase().match(/[a-z0-9+#.]+/g) ?? []);
  const importedText = JSON.stringify(parsed.profile).toLowerCase();
  const missingLongTokens = [...sourceTokens].filter((token) => token.length >= 8 && !importedText.includes(token));
  if (missingLongTokens.length > Math.max(8, sourceTokens.size * 0.08))
    throw new Error("The PDF import appears incomplete, so nothing was saved. Try exporting a text-based PDF or import the JSON manually.");
  return parsed;
}
