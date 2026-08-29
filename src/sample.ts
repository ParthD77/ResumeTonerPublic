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
        coursework: ["Data Structures", "Algorithms", "Software Design"],
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

Use only the attached resume. Transcribe it faithfully: do not rewrite, summarize, improve, infer, merge, or omit content. Preserve every visible section, employer, role, date, course, technology, responsibility, bullet, and metric. Information supplied by the user is not independently verified.

FORMAT RULES — follow these exactly:
- Return exactly one JSON object inside a \`\`\`json code block. Put nothing before or after the block.
- Use plain JSON strings. Never create Markdown links. An email must look like "person@example.com", never "[person@example.com](mailto:...)".
- Every URL must be a raw absolute URL beginning with https://, never Markdown and never descriptive text.
- Use every property shown below with exactly the same property names. Do not substitute "name" for a project's "organization" or "title".
- Use an empty string for an unknown optional string, an empty array for an unknown list, and false for an unknown boolean.
- Required display fields may not be empty. If a project has only one known name, put that name in "organization" and use "Project" for "title". If an experience title is unknown, use "Role". If an education credential is unknown, use "Credential".
- Every education object must include "coursework" as an array of individual course names; use [] when none were supplied.
- Use unique stable IDs in the patterns shown. Link each bullet to at least one evidence ID when evidence exists.
- Use schemaVersion 1 and valid ISO 8601 timestamps.

Required top-level shape:
{"schemaVersion":1,"profile":{"schemaVersion":1,"id":"profile.base","label":"Base resume","name":"Resume owner","email":"","phone":"","location":"","links":[{"label":"Portfolio","url":"https://example.com"}],"education":[{"id":"education.1","institution":"School name","credential":"Credential","dates":"","location":"","coursework":[]}],"experience":[{"id":"experience.1","organization":"Employer name","title":"Role","dates":"","location":"","url":"","technologies":[],"locked":false,"bullets":[{"id":"experience.1.b1","text":"User-provided accomplishment","factuality":"verified","locked":false,"evidenceIds":["evidence.1"]}]}],"projects":[{"id":"project.1","organization":"Project name","title":"Project","dates":"","location":"","url":"","technologies":[],"locked":false,"bullets":[{"id":"project.1.b1","text":"User-provided project accomplishment","factuality":"verified","locked":false,"evidenceIds":["evidence.2"]}]}],"skills":{"Languages":[],"Frameworks":[],"Tools":[]},"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"},"evidence":[{"id":"evidence.1","entryId":"experience.1","source":"Attached resume","facts":[],"technologies":[],"metrics":[],"trusted":true},{"id":"evidence.2","entryId":"project.1","source":"Attached resume","facts":[],"technologies":[],"metrics":[],"trusted":true}]}

Include all relevant career information the user supplied. Exclude passwords, API keys, government identification numbers, banking information, health information, and references' private contact details.`;

export const ADDITIONAL_CONTEXT_PROMPT = `Help me export optional career context for Resume Toner from information I previously told you or that appears in this conversation.

This is not a request to improve my resume. Return only concrete claims that I personally supplied. Do not infer, embellish, combine uncertain memories, estimate dates or metrics, or treat your prior suggestions as facts. If a detail is uncertain, contradictory, merely inferred, or not attributable to something I said, omit it. Do not repeat facts already visible in my attached resume if one is available.

Before returning the JSON, silently check each claim against these rules:
1. It describes my own work, education, project, skill, or measurable outcome.
2. I was the source of the claim; it was not invented by an assistant.
3. Exact numbers, dates, technologies, employers, and titles appear only when I supplied them.
4. Sensitive information is excluded: passwords, API keys, government IDs, financial or health data, and other people's private contact details.

Return exactly one JSON object inside a \`\`\`json code block and nothing else, using this shape:
{"evidence":[{"id":"memory.1","entryId":"experience.1","source":"User-confirmed chatbot context","facts":["A single concrete user-supplied fact"],"technologies":["Technology explicitly supplied by the user"],"metrics":[{"value":"Exact user-supplied value","meaning":"What that value measured"}],"trusted":false}]}

Rules:
- Use unique IDs beginning with "memory.".
- entryId is optional; omit it unless the matching Resume Toner entry ID is known.
- Keep each fact atomic and quote no assistant-generated prose.
- Set trusted to false. Resume Toner will require me to review and confirm the information before using it.
- If there is no qualifying information, return {"evidence":[]}.`;
