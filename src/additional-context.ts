import { z } from "zod";
import { CareerEvidenceSchema, type CareerEvidence } from "./domain";
import { extractJsonFromChat } from "./import-compat";

const AdditionalContextSchema = z.object({
  evidence: z.array(CareerEvidenceSchema),
});

export function parseAdditionalContext(value: string): CareerEvidence[] {
  const parsed = AdditionalContextSchema.parse(extractJsonFromChat(value));
  return parsed.evidence.map((item, index) => ({
    ...item,
    id: item.id.startsWith("memory.") ? item.id : `memory.${index + 1}`,
    source: item.source || "User-confirmed chatbot context",
    trusted: true,
  }));
}
