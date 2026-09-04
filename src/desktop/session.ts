import { z } from "zod";
import { TailoringResponseSchema, validateResponseTargets } from "./contract";

export const SESSION_KEY = "resume-toner-desktop.session.v1";
const ReviewSchema = z.object({
  decision: z.enum(["pending", "accepted", "rejected"]),
  text: z.string(), scope: z.enum(["current", "base"]), syntheticVerified: z.boolean(),
});
export type Review = z.infer<typeof ReviewSchema>;
export const SessionSchema = z.object({
  savedBase: z.string(), base: z.string(), latexInput: z.string(), job: z.string(),
  responseText: z.string(), result: TailoringResponseSchema.nullable(),
  reviews: z.record(ReviewSchema), sideOpen: z.boolean(),
}).superRefine((session, context) => {
  if (!session.result) return;
  try {
    validateResponseTargets(session.result, session.base);
    for (const proposal of session.result.proposals) {
      const review = session.reviews[proposal.id];
      if (!review) throw new Error("Missing saved review.");
      if (proposal.factuality === "synthetic" && review.decision === "accepted" && !review.syntheticVerified)
        throw new Error("Unconfirmed synthetic claim.");
    }
  } catch (error) {
    context.addIssue({ code: "custom", message: String(error) });
  }
});
export type Session = z.infer<typeof SessionSchema>;
export const ArchiveSchema = z.object({
  version: z.literal(1), session: SessionSchema,
  history: z.array(z.object({ id: z.string(), label: z.string(), date: z.string(), session: SessionSchema })).max(5),
});
export type Archive = z.infer<typeof ArchiveSchema>;
export function emptySession(base = ""): Session {
  return { savedBase: base, base, latexInput: "", job: "", responseText: "", result: null, reviews: {}, sideOpen: true };
}
export function addSnapshot(history: Archive["history"], session: Session, label: string): Archive["history"] {
  return [{ id: crypto.randomUUID(), date: new Date().toISOString(), label, session }, ...history].slice(0, 5);
}
export function readArchive(storage: Pick<Storage, "getItem">): Archive {
  const value = storage.getItem(SESSION_KEY);
  if (value) return ArchiveSchema.parse(JSON.parse(value));
  return { version: 1, session: emptySession(storage.getItem("resume-toner-desktop.latex-base.v1") ?? ""), history: [] };
}
