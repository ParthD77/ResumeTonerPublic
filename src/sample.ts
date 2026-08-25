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
export const RESUME_IMPORT_PROMPT = `You are converting my resume and career notes into Resume Toner JSON.
Return JSON only. Do not invent, infer, improve, or embellish facts. Preserve exact employers, roles, dates, technologies, responsibilities, and metrics. Give every profile, entry, bullet, education item, and evidence record a stable unique id. Link each bullet to one or more evidenceIds. Use schemaVersion 1 and ISO timestamps.

Required top-level shape:
{"schemaVersion":1,"profile":{"schemaVersion":1,"id":"profile.base","label":"Base resume","name":"","email":"","phone":"","location":"","links":[{"label":"","url":"https://..."}],"education":[{"id":"education.1","institution":"","credential":"","dates":"","location":""}],"experience":[{"id":"experience.1","organization":"","title":"","dates":"","location":"","url":"","technologies":[],"locked":false,"bullets":[{"id":"experience.1.b1","text":"","factuality":"verified","locked":false,"evidenceIds":["evidence.1"]}]}],"projects":[],"skills":{"Languages":[],"Frameworks":[],"Tools":[]},"createdAt":"ISO timestamp","updatedAt":"ISO timestamp"},"evidence":[{"id":"evidence.1","entryId":"experience.1","source":"User-provided resume","facts":[],"technologies":[],"metrics":[{"value":"","meaning":""}],"trusted":true}]}

Here is my resume and additional career information:
[PASTE YOUR INFORMATION HERE]`;
