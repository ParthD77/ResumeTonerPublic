import type { ResumeEntry, ResumeProfile } from "./domain";
import { newId } from "./domain";

export function ResumeEditor({
  profile,
  onChange,
}: {
  profile: ResumeProfile;
  onChange: (p: ResumeProfile) => void;
}) {
  const set = <K extends keyof ResumeProfile>(
    key: K,
    value: ResumeProfile[K],
  ) =>
    onChange({ ...profile, [key]: value, updatedAt: new Date().toISOString() });
  const editEntries = (
    kind: "experience" | "projects",
    entries: ResumeEntry[],
  ) => set(kind, entries);
  const addEntry = (kind: "experience" | "projects") => {
    const id = newId(kind === "experience" ? "experience" : "project");
    editEntries(kind, [
      ...profile[kind],
      {
        id,
        organization: "New organization",
        title: "New role or project",
        dates: "",
        location: "",
        url: "",
        technologies: [],
        locked: false,
        bullets: [],
      },
    ]);
  };
  const entryList = (kind: "experience" | "projects") =>
    profile[kind].map((entry, index) => (
      <article className="editor-entry" key={entry.id}>
        <div className="row">
          <label>
            Organization
            <input
              value={entry.organization}
              onChange={(e) => {
                const a = structuredClone(profile[kind]);
                a[index].organization = e.target.value;
                editEntries(kind, a);
              }}
            />
          </label>
          <label>
            Title
            <input
              value={entry.title}
              onChange={(e) => {
                const a = structuredClone(profile[kind]);
                a[index].title = e.target.value;
                editEntries(kind, a);
              }}
            />
          </label>
        </div>
        <div className="row">
          <label>
            Dates
            <input
              value={entry.dates}
              onChange={(e) => {
                const a = structuredClone(profile[kind]);
                a[index].dates = e.target.value;
                editEntries(kind, a);
              }}
            />
          </label>
          <label>
            Location
            <input
              value={entry.location}
              onChange={(e) => {
                const a = structuredClone(profile[kind]);
                a[index].location = e.target.value;
                editEntries(kind, a);
              }}
            />
          </label>
        </div>
        <label>
          Technologies
          <input
            value={entry.technologies.join(", ")}
            onChange={(e) => {
              const a = structuredClone(profile[kind]);
              a[index].technologies = e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean);
              editEntries(kind, a);
            }}
          />
        </label>
        {entry.bullets.map((b, bi) => (
          <div className="bullet-edit" key={b.id}>
            <textarea
              value={b.text}
              onChange={(e) => {
                const a = structuredClone(profile[kind]);
                a[index].bullets[bi].text = e.target.value;
                editEntries(kind, a);
              }}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={b.locked}
                onChange={(e) => {
                  const a = structuredClone(profile[kind]);
                  a[index].bullets[bi].locked = e.target.checked;
                  editEntries(kind, a);
                }}
              />
              Lock
            </label>
            <button
              className="danger-link"
              onClick={() => {
                const a = structuredClone(profile[kind]);
                a[index].bullets.splice(bi, 1);
                editEntries(kind, a);
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="actions">
          <button
            className="secondary"
            onClick={() => {
              const a = structuredClone(profile[kind]);
              a[index].bullets.push({
                id: newId(`${entry.id}.bullet`),
                text: "New evidence-supported accomplishment",
                factuality: "verified",
                locked: false,
                evidenceIds: [],
              });
              editEntries(kind, a);
            }}
          >
            Add bullet
          </button>
          <label className="check">
            <input
              type="checkbox"
              checked={entry.locked}
              onChange={(e) => {
                const a = structuredClone(profile[kind]);
                a[index].locked = e.target.checked;
                editEntries(kind, a);
              }}
            />
            Lock entry
          </label>
          <button
            className="danger-link"
            onClick={() =>
              editEntries(
                kind,
                profile[kind].filter((x) => x.id !== entry.id),
              )
            }
          >
            Remove entry
          </button>
        </div>
      </article>
    ));
  return (
    <section className="panel">
      <h2>Base resume editor</h2>
      <p className="muted">
        Changes here update only your base resume. Tailored exports never
        overwrite it.
      </p>
      <div className="row">
        <label>
          Name
          <input
            value={profile.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </label>
        <label>
          Location
          <input
            value={profile.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </label>
      </div>
      <div className="row">
        <label>
          Email
          <input
            value={profile.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </label>
        <label>
          Phone
          <input
            value={profile.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </label>
      </div>
      <h3>Education</h3>
      {profile.education.map((item, index) => (
        <div className="editor-entry" key={item.id}>
          <div className="row">
            <label>
              Institution
              <input
                value={item.institution}
                onChange={(e) => {
                  const a = structuredClone(profile.education);
                  a[index].institution = e.target.value;
                  set("education", a);
                }}
              />
            </label>
            <label>
              Credential
              <input
                value={item.credential}
                onChange={(e) => {
                  const a = structuredClone(profile.education);
                  a[index].credential = e.target.value;
                  set("education", a);
                }}
              />
            </label>
          </div>
          <button
            className="danger-link"
            onClick={() =>
              set(
                "education",
                profile.education.filter((x) => x.id !== item.id),
              )
            }
          >
            Remove education
          </button>
        </div>
      ))}
      <button
        className="secondary"
        onClick={() =>
          set("education", [
            ...profile.education,
            {
              id: newId("education"),
              institution: "New institution",
              credential: "New credential",
              dates: "",
              location: "",
            },
          ])
        }
      >
        Add education
      </button>
      <h3>Experience</h3>
      {entryList("experience")}
      <button className="secondary" onClick={() => addEntry("experience")}>
        Add experience
      </button>
      <h3>Projects</h3>
      {entryList("projects")}
      <button className="secondary" onClick={() => addEntry("projects")}>
        Add project
      </button>
      <h3>Skills</h3>
      {Object.entries(profile.skills).map(([group, values]) => (
        <label key={group}>
          {group}
          <input
            value={values.join(", ")}
            onChange={(e) =>
              set("skills", {
                ...profile.skills,
                [group]: e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      ))}
    </section>
  );
}
