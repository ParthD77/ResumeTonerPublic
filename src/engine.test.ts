import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyProposals,
  deterministicJob,
  deterministicRequirements,
  recalculateRun,
  scoreResume,
  testGemini,
} from "./engine";
import { fictionalImport } from "./sample";
import type { JobCapture, TailoringRun } from "./domain";

const capture: JobCapture = {
  company: "Example Robotics",
  role: "Software Engineer",
  location: "Remote",
  url: "https://example.invalid/job",
  source: "test",
  capturedAt: "2026-01-15T12:00:00.000Z",
  description:
    "Required: TypeScript, PostgreSQL, REST APIs, Git, and Docker. Preferred: React and CI/CD. Build scalable APIs and write integration tests.",
};
describe("deterministic technical engine", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("canonicalizes requirements and marks required context", () => {
    const requirements = deterministicRequirements(capture.description);
    expect(
      requirements.some((r) => r.canonicalName === "TypeScript" && r.required),
    ).toBe(true);
    expect(requirements.some((r) => r.canonicalName === "PostgreSQL")).toBe(
      true,
    );
    expect(requirements.some((r) => r.canonicalName === "CI/CD")).toBe(true);
  });
  it("scores coverage reproducibly and caps missing required skills", () => {
    const job = deterministicJob(capture),
      score = scoreResume(fictionalImport.profile, job);
    expect(score.algorithmVersion).toBe("v1");
    expect(score.covered).toContain("TypeScript");
    expect(score.cap).toBe(82);
    expect(score.overall).toBeLessThanOrEqual(82);
  });
  it("applies accepted rewrites and additions without mutating base", () => {
    const base = fictionalImport.profile;
    const changed = applyProposals(base, [
      {
        id: "p1",
        type: "rewrite",
        targetEntryId: "experience.northstar",
        targetBulletId: "experience.northstar.b1",
        oldValue: base.experience[0].bullets[0].text,
        newValue:
          "Built typed REST API integrations with TypeScript, reducing reconciliation time by 30%",
        reason: "Test",
        evidenceIds: ["evidence.northstar"],
        requirementIds: [],
        estimatedScoreDelta: 1,
        factuality: "verified",
        decision: "accepted",
      },
      {
        id: "p2",
        type: "add",
        targetEntryId: "experience.northstar",
        oldValue: "",
        newValue: "Containerized integration services with Docker",
        reason: "Test",
        evidenceIds: ["evidence.northstar"],
        requirementIds: [],
        estimatedScoreDelta: 1,
        factuality: "verified",
        decision: "accepted",
      },
    ]);
    expect(changed.experience[0].bullets).toHaveLength(3);
    expect(changed.experience[0].bullets[0].text).toContain("TypeScript");
    expect(base.experience[0].bullets).toHaveLength(2);
  });
  it("recalculates proposed score from decisions", () => {
    const job = deterministicJob(capture),
      baseScore = scoreResume(fictionalImport.profile, job);
    const run: TailoringRun = {
      id: "run.test",
      createdAt: capture.capturedAt,
      updatedAt: capture.capturedAt,
      status: "review",
      mode: "evidence_only",
      pageTarget: 1,
      baseProfile: fictionalImport.profile,
      job,
      baseScore,
      proposedScore: baseScore,
      proposals: [
        {
          id: "p1",
          type: "rewrite",
          targetEntryId: "experience.northstar",
          targetBulletId: "experience.northstar.b2",
          oldValue:
            "Added integration tests and CI checks for critical account workflows",
          newValue:
            "Implemented integration testing and CI/CD checks for critical account workflows",
          reason: "Coverage",
          evidenceIds: ["evidence.northstar"],
          requirementIds: [],
          estimatedScoreDelta: 2,
          factuality: "verified",
          decision: "accepted",
        },
      ],
      generation: { engine: "gemini", model: "test", calls: 3 },
      warnings: [],
    };
    const next = recalculateRun(run);
    expect(next.status).toBe("ready");
    expect(next.proposedScore.covered).toContain("CI/CD");
  });
  it("verifies a candidate key with a real generation request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      testGemini("gemini-3.7-flash", "candidate-key-with-enough-characters"),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(":generateContent"),
      expect.objectContaining({ method: "POST" }),
    );
  });
  it("reports invalid or unauthorized candidate keys", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    await expect(
      testGemini("gemini-3.7-flash", "candidate-key-with-enough-characters"),
    ).rejects.toThrow("invalid, blocked, or not permitted");
  });
  it("retries temporary Gemini failures before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      testGemini("gemini-3.7-flash", "candidate-key-with-enough-characters"),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
