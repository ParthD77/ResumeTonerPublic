import type { ResumeImport } from "./domain";
const createdAt = "2026-01-15T12:00:00.000Z";
export const fictionalImport: ResumeImport = {
  schemaVersion: 1,
  profile: {
    schemaVersion: 1,
    id: "profile.fictional",
    label: "Fictional example",
    name: "Jordan Lee",
    email: "jordan.lee@example.invalid",
    phone: "+1 555 010 2048",
    location: "Example City, ON",
    links: [{ label: "Portfolio", url: "https://example.invalid" }],
    education: [
      {
        id: "education.example",
        institution: "Example Polytechnic",
        credential: "B.Sc. Computer Science",
        dates: "2022 – 2026",
        location: "Example City, ON",
      },
    ],
    experience: [
      {
        id: "experience.northstar",
        organization: "Northstar Software",
        title: "Software Engineering Intern",
        dates: "May 2025 – Aug. 2025",
        location: "Example City, ON",
        url: "",
        technologies: ["TypeScript", "React", "PostgreSQL", "Docker"],
        locked: false,
        bullets: [
          {
            id: "experience.northstar.b1",
            text: "Built typed REST API integrations that reduced manual reconciliation time by 30%",
            factuality: "verified",
            locked: false,
            evidenceIds: ["evidence.northstar"],
          },
          {
            id: "experience.northstar.b2",
            text: "Added integration tests and CI checks for critical account workflows",
            factuality: "verified",
            locked: false,
            evidenceIds: ["evidence.northstar"],
          },
        ],
      },
    ],
    projects: [
      {
        id: "project.signalboard",
        organization: "SignalBoard",
        title: "Personal Project",
        dates: "2025",
        location: "",
        url: "https://example.invalid/signalboard",
        technologies: ["React", "Node.js", "PostgreSQL"],
        locked: false,
        bullets: [
          {
            id: "project.signalboard.b1",
            text: "Developed a dashboard for monitoring service health and deployment events",
            factuality: "verified",
            locked: false,
            evidenceIds: ["evidence.signalboard"],
          },
        ],
      },
    ],
    skills: {
      Languages: ["TypeScript", "Python", "SQL"],
      Frameworks: ["React", "Node.js"],
      Tools: ["Git", "Docker", "PostgreSQL"],
    },
    createdAt,
    updatedAt: createdAt,
  },
  evidence: [
    {
      id: "evidence.northstar",
      entryId: "experience.northstar",
      source: "Fictional example data",
      trusted: true,
      technologies: ["TypeScript", "React", "PostgreSQL", "Docker", "CI/CD"],
      facts: [
        "Built REST API integrations.",
        "Added integration and CI tests.",
      ],
      metrics: [
        { value: "30%", meaning: "reduction in manual reconciliation time" },
      ],
    },
    {
      id: "evidence.signalboard",
      entryId: "project.signalboard",
      source: "Fictional example data",
      trusted: true,
      technologies: ["React", "Node.js", "PostgreSQL"],
      facts: ["Developed a service-health dashboard."],
      metrics: [],
    },
  ],
};
export const RESUME_IMPORT_PROMPT = `I am setting up Resume Toner. Convert the resume attached to this chat into the JSON format below.

Use the attached resume as the primary source. You may also use relevant career facts from memory or earlier chats if I explicitly asked you to use them. Treat the information I provided as true. Preserve employers, roles, dates, technologies, responsibilities, and metrics without trying to independently verify them.

FORMAT RULES — follow these exactly:
- Return exactly one JSON object inside a \`\`\`json code block. Put nothing before or after the block.
- Use plain JSON strings. Never create Markdown links. An email must look like "person@example.com", never "[person@example.com](mailto:...)".
- Every URL must be a raw absolute URL beginning with https://, never Markdown and never descriptive text.
- Use every property shown below with exactly the same property names. Do not substitute "name" for a project's "organization" or "title".
- Use an empty string for an unknown optional string, an empty array for an unknown list, and false for an unknown boolean.
- Required display fields may not be empty. If a project has only one known name, put that name in "organization" and use "Project" for "title". If an experience title is unknown, use "Role". If an education credential is unknown, use "Credential".
- Use unique stable IDs in the patterns shown. Link each bullet to at least one evidence ID when evidence exists.
- Use schemaVersion 1 and valid ISO 8601 timestamps.

Required top-level shape:
{"schemaVersion":1,"profile":{"schemaVersion":1,"id":"profile.base","label":"Base resume","name":"Resume owner","email":"","phone":"","location":"","links":[{"label":"Portfolio","url":"https://example.com"}],"education":[{"id":"education.1","institution":"School name","credential":"Credential","dates":"","location":""}],"experience":[{"id":"experience.1","organization":"Employer name","title":"Role","dates":"","location":"","url":"","technologies":[],"locked":false,"bullets":[{"id":"experience.1.b1","text":"User-provided accomplishment","factuality":"verified","locked":false,"evidenceIds":["evidence.1"]}]}],"projects":[{"id":"project.1","organization":"Project name","title":"Project","dates":"","location":"","url":"","technologies":[],"locked":false,"bullets":[{"id":"project.1.b1","text":"User-provided project accomplishment","factuality":"verified","locked":false,"evidenceIds":["evidence.2"]}]}],"skills":{"Languages":[],"Frameworks":[],"Tools":[]},"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"},"evidence":[{"id":"evidence.1","entryId":"experience.1","source":"Attached resume","facts":[],"technologies":[],"metrics":[],"trusted":true},{"id":"evidence.2","entryId":"project.1","source":"Attached resume","facts":[],"technologies":[],"metrics":[],"trusted":true}]}

Include all relevant career information the user supplied. Exclude passwords, API keys, government identification numbers, banking information, health information, and references' private contact details.`;
