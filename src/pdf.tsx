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
import type { ResumeProfile } from "./domain";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.2,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 36,
    color: "#111",
    lineHeight: 1.2,
  },
  header: { textAlign: "center", marginBottom: 7 },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contact: { fontSize: 8.5, marginTop: 2 },
  section: { marginTop: 5 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    borderBottomWidth: 0.7,
    borderBottomColor: "#222",
    paddingBottom: 1.5,
    marginBottom: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  grow: { flexGrow: 1, maxWidth: "78%" },
  right: { textAlign: "right", maxWidth: "30%" },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  entry: { marginBottom: 3 },
  subline: { fontSize: 8.2, marginTop: 1 },
  bulletRow: { flexDirection: "row", paddingLeft: 8, marginTop: 1.4 },
  bullet: { width: 9 },
  bulletText: { flex: 1 },
  skills: { fontSize: 8.7, marginTop: 1 },
  link: { color: "#111", textDecoration: "none" },
});

export function ResumePdf({ profile }: { profile: ResumeProfile }) {
  const contact = [profile.location, profile.phone, profile.email]
    .filter(Boolean)
    .join(" · ");
  const entries = (title: string, items: ResumeProfile["experience"]) => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {items.map((e) => (
        <View key={e.id} style={s.entry} wrap={false}>
          <View style={s.row}>
            <Text style={[s.bold, s.grow]}>{e.title}</Text>
            <Text style={s.right}>{e.dates}</Text>
          </View>
          <View style={s.row}>
            <Text style={[s.italic, s.grow]}>
              {e.organization}
              {e.technologies.length ? ` | ${e.technologies.join(", ")}` : ""}
            </Text>
            <Text style={[s.italic, s.right]}>{e.location}</Text>
          </View>
          {e.bullets.map((b) => (
            <View key={b.id} style={s.bulletRow}>
              <Text style={s.bullet}>•</Text>
              <Text style={s.bulletText}>{b.text}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
  return (
    <Document
      title={`${profile.name} Resume`}
      author={profile.name}
      subject="Technical resume"
    >
      <Page size="LETTER" style={s.page} wrap>
        <View style={s.header}>
          <Text style={s.name}>{profile.name}</Text>
          <Text style={s.contact}>{contact}</Text>
          <Text style={s.contact}>
            {profile.links.map((x, i) => (
              <Link key={x.url} src={x.url} style={s.link}>
                {i ? " · " : ""}
                {x.label}
              </Link>
            ))}
          </Text>
        </View>
        {profile.education.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Education</Text>
            {profile.education.map((e) => (
              <View key={e.id}>
                <View style={s.row}>
                  <Text style={[s.bold, s.grow]}>{e.institution}</Text>
                  <Text style={s.right}>{e.dates}</Text>
                </View>
                <View style={s.row}>
                  <Text style={[s.italic, s.grow]}>{e.credential}</Text>
                  <Text style={[s.italic, s.right]}>{e.location}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {entries("Experience", profile.experience)}
        {entries("Projects", profile.projects)}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Technical Skills</Text>
          {Object.entries(profile.skills).map(([group, values]) => (
            <Text key={group} style={s.skills}>
              <Text style={s.bold}>{group}: </Text>
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
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^a-z0-9._-]+/gi, "-");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
