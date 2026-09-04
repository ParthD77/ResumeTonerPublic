export type DiffPart = { text: string; kind: "same" | "removed" | "added" };

/** Preserve every character while comparing words, punctuation and whitespace. */
export function wordDiff(before: string, after: string): DiffPart[] {
  const tokenize = (text: string) => text.match(/[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu) ?? [];
  const a = tokenize(before), b = tokenize(after);
  const parts: DiffPart[] = [];
  const append = (text: string, kind: DiffPart["kind"]) => {
    if (!text) return;
    const last = parts[parts.length - 1];
    if (last?.kind === kind) last.text += text;
    else parts.push({ text, kind });
  };
  // Bound memory for unusually large manually edited proposals.
  if ((a.length + 1) * (b.length + 1) > 4_000_000) {
    if (before === after) append(before, "same");
    else { append(before, "removed"); append(after, "added"); }
    return parts;
  }
  const rows = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      append(a[i++], "same"); j++;
    } else if (i < a.length && (j === b.length || rows[i + 1][j] >= rows[i][j + 1])) {
      append(a[i++], "removed");
    } else append(b[j++], "added");
  }
  return parts;
}
