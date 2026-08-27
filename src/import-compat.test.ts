import { describe, expect, it } from "vitest";
import { normalizeResumeImport, parseResumeImport } from "./import-compat";

describe("compatible resume import", () => {
  it("accepts fenced JSON and normalizes common AI formatting", () => {
    const value = {
      schemaVersion: 1,
      profile: {
        schemaVersion: 1,
        id: "profile.base",
        label: "Base resume",
        name: "Jordan Lee",
        email: "[jordan@example.com](mailto:jordan@example.com)",
        links: [{ label: "Portfolio", url: "[https://example.com/" }],
        experience: [{ organization: "Example Co", bullets: [] }],
        projects: [
          {
            name: "SignalBoard",
            technologies: ["React](https://example.com) Native"],
            bullets: [],
          },
        ],
        education: [],
        skills: {},
      },
      evidence: [],
    };
    const parsed = parseResumeImport(
      `Here is the result:\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\``,
    );
    expect(parsed.profile.email).toBe("jordan@example.com");
    expect(parsed.profile.links[0].url).toBe("https://example.com/");
    expect(parsed.profile.experience[0].title).toBe("Role");
    expect(parsed.profile.projects[0]).toMatchObject({
      organization: "SignalBoard",
      title: "Project",
      technologies: ["React Native"],
    });
  });

  it("fills safe structural defaults without judging user facts", () => {
    const parsed = normalizeResumeImport({ profile: { name: "Jordan Lee" } });
    expect(parsed.profile.label).toBe("Base resume");
    expect(parsed.profile.experience).toEqual([]);
    expect(parsed.evidence).toEqual([]);
  });
});
