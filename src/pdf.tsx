import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import type { ResumeEntry, ResumeProfile } from "./domain";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 10.4,
    paddingTop: 28,
    paddingBottom: 26,
    paddingHorizontal: 36,
    color: "#000",
    lineHeight: 1.12,
  },
  header: { textAlign: "center", marginBottom: 8 },
  name: {
    fontFamily: "Times-Bold",
    fontSize: 25,
    lineHeight: 1.05,
    minHeight: 28,
    marginBottom: 3,
  },
  contact: { fontSize: 9.2, lineHeight: 1.1 },
  contactLink: { color: "#000", textDecoration: "underline" },
  section: { marginTop: 5 },
  sectionTitle: {
    fontSize: 12.5,
    textTransform: "uppercase",
    borderBottomWidth: 0.55,
    borderBottomColor: "#000",
    paddingBottom: 1,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "97%",
    marginLeft: 10.8,
  },
  left: { flexGrow: 1, maxWidth: "78%" },
  projectLeft: { flexGrow: 1, maxWidth: "84%" },
  right: { textAlign: "right", maxWidth: "24%" },
  bold: { fontFamily: "Times-Bold" },
  italic: { fontFamily: "Times-Italic" },
  link: { color: "#000", textDecoration: "underline" },
  entry: { marginBottom: 3 },
  bulletRow: {
    flexDirection: "row",
    paddingLeft: 25,
    paddingRight: 8,
    marginTop: 0.7,
  },
  bullet: { width: 10, fontSize: 8.5 },
  bulletText: { flex: 1, fontSize: 9.7 },
  coursework: { marginLeft: 10.8, marginTop: 3, fontSize: 9.7 },
  skills: { marginLeft: 10.8, fontSize: 9.7, lineHeight: 1.13 },
});

const displayUrl = (url: string) =>
  url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");

const linkLabel = (entry: ResumeEntry, project = false) => {
  if (!entry.url) return "";
  if (/apps\.apple\.com/i.test(entry.url)) return "App Store";
  if (/youtu(?:be\.com|\.be)/i.test(entry.url)) return "YouTube";
  return project ? "Live Demo" : "Live Site";
};

function Bullets({ entry }: { entry: ResumeEntry }) {
  return (
    <>
      {entry.bullets.map((bullet) => (
        <View key={bullet.id} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{bullet.text}</Text>
        </View>
      ))}
    </>
  );
}

function Experience({ entries }: { entries: ResumeEntry[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Experience</Text>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.entry} wrap={false}>
          <View style={styles.row}>
            <Text style={[styles.bold, styles.left]}>{entry.title}</Text>
            <Text style={styles.right}>{entry.dates}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.italic, styles.left]}>
              {entry.organization}
              {entry.url ? (
                <>
                  {" "}
                  <Link src={entry.url} style={styles.link}>
                    {linkLabel(entry)}
                  </Link>
                </>
              ) : null}
              {entry.technologies.length
                ? ` | ${entry.technologies.join(", ")}`
                : ""}
            </Text>
            <Text style={[styles.italic, styles.right]}>{entry.location}</Text>
          </View>
          <Bullets entry={entry} />
        </View>
      ))}
    </View>
  );
}

function Projects({ entries }: { entries: ResumeEntry[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Projects</Text>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.entry} wrap={false}>
          <View style={styles.row}>
            <Text style={styles.projectLeft}>
              <Text style={styles.bold}>{entry.organization}</Text>
              {entry.url ? (
                <>
                  {" "}
                  <Link src={entry.url} style={styles.link}>
                    {linkLabel(entry, true)}
                  </Link>
                </>
              ) : null}
              {entry.title && entry.title !== "Project"
                ? ` | ${entry.title}`
                : ""}
              {entry.technologies.length ? (
                <Text style={styles.italic}>
                  {" | "}
                  {entry.technologies.join(", ")}
                </Text>
              ) : null}
            </Text>
            <Text style={styles.right}>{entry.dates}</Text>
          </View>
          <Bullets entry={entry} />
        </View>
      ))}
    </View>
  );
}

export function ResumePdf({ profile }: { profile: ResumeProfile }) {
  const headerParts: Array<{ text: string; url?: string }> = [];
  if (profile.phone) headerParts.push({ text: profile.phone });
  if (profile.email)
    headerParts.push({ text: profile.email, url: `mailto:${profile.email}` });
  profile.links.forEach((link) =>
    headerParts.push({ text: displayUrl(link.url), url: link.url }),
  );
  return (
    <Document
      title={`${profile.name} Resume`}
      author={profile.name}
      subject="Technical resume"
    >
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.contact}>
            {headerParts.map((part, index) => (
              <Text key={part.url || part.text}>
                {index ? " | " : ""}
                {part.url ? (
                  <Link src={part.url} style={styles.contactLink}>
                    {part.text}
                  </Link>
                ) : (
                  part.text
                )}
              </Text>
            ))}
          </Text>
        </View>
        {profile.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {profile.education.map((education) => (
              <View key={education.id} wrap={false}>
                <View style={styles.row}>
                  <Text style={[styles.bold, styles.left]}>
                    {education.institution}
                  </Text>
                  <Text style={styles.right}>{education.location}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.italic, styles.left]}>
                    {education.credential}
                  </Text>
                  <Text style={[styles.italic, styles.right]}>
                    {education.dates}
                  </Text>
                </View>
                {education.coursework.length > 0 && (
                  <Text style={styles.coursework}>
                    <Text style={styles.bold}>Relevant Coursework: </Text>
                    {education.coursework.join(", ")}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        <Experience entries={profile.experience} />
        <Projects entries={profile.projects} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technical Skills</Text>
          {Object.entries(profile.skills).map(([group, values]) => (
            <Text key={group} style={styles.skills}>
              <Text style={styles.bold}>
                {group === "Tools" ? "Developer Tools" : group}:{" "}
              </Text>
              {values.join(", ")}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function renderResumePdf(profile: ResumeProfile) {
  if (!profile.name || (!profile.experience.length && !profile.projects.length))
    throw new Error(
      "Resume must contain a name and at least one experience or project.",
    );
  const blob = await pdf(<ResumePdf profile={profile} />).toBlob();
  const bytes = await blob.arrayBuffer();
  const parsed = await PDFDocument.load(bytes);
  return { blob, pages: parsed.getPageCount(), bytes: bytes.byteLength };
}

export async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const cleanFilename = filename.replace(/[^a-z0-9._-]+/gi, "_");
  try {
    if (typeof chrome !== "undefined" && chrome.downloads?.download) {
      await chrome.downloads.download({
        url,
        filename: cleanFilename,
        conflictAction: "overwrite",
        saveAs: false,
      });
    } else {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = cleanFilename;
      anchor.click();
    }
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
