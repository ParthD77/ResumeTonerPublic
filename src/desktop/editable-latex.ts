type SourceSpan = { start: number; end: number } | null;

function escapeLatexText(value: string) {
  return value.replace(/[\\#$%&_{}~^]/g, (character) => {
    const escaped: Record<string, string> = {
      "\\": "\\textbackslash{}",
      "#": "\\#",
      "$": "\\$",
      "%": "\\%",
      "&": "\\&",
      "_": "\\_",
      "{": "\\{",
      "}": "\\}",
      "~": "\\textasciitilde{}",
      "^": "\\textasciicircum{}",
    };
    return escaped[character];
  });
}

/**
 * Replaces one user edit in the readable preview while retaining the LaTeX
 * around it. The UI calls this for every textarea change, so even a sequence
 * of edits is applied as small, formatting-preserving replacements.
 */
export function editReadableLatex(source: string, nextReadable: string): string {
  let i = 0;
  let visible = "";
  const spans: SourceSpan[] = [];
  const emit = (text: string, span: SourceSpan = null) => {
    visible += text;
    for (let index = 0; index < text.length; index++) spans.push(span);
  };
  const group = (): void => {
    while (/\s/.test(source[i] ?? "") && i < source.length) i++;
    if (source[i] !== "{") return;
    i++;
    read(true);
  };
  const discardGroup = () => {
    while (/\s/.test(source[i] ?? "") && i < source.length) i++;
    if (source[i] !== "{") return;
    let depth = 0;
    do {
      const character = source[i++];
      if (character === "{") depth++;
      else if (character === "}") depth--;
    } while (i < source.length && depth > 0);
  };
  const read = (nested = false): void => {
    while (i < source.length) {
      const start = i;
      const character = source[i++];
      if (character === "}" && nested) return;
      if (character === "{") { read(true); continue; }
      if (character === "%") {
        while (i < source.length && source[i] !== "\n") i++;
        continue;
      }
      if (character !== "\\") {
        if (character === "~") emit(" ", { start, end: i });
        else if (character !== "$" && character !== "}") emit(character, { start, end: i });
        continue;
      }
      const command = source.slice(i).match(/^[a-zA-Z]+/)?.[0];
      if (!command) {
        const symbol = source[i++] ?? "";
        const shown = symbol === "\\" ? "\n" : symbol === "," || symbol === ";" || symbol === " " ? " " : symbol;
        emit(shown, { start, end: i });
        continue;
      }
      i += command.length;
      if (command === "href") { discardGroup(); group(); }
      else if (["vspace", "hspace", "begin", "end", "label"].includes(command)) {
        if (source[i] === "*") i++;
        discardGroup();
        if (source[i] === "[") while (i < source.length && source[i++] !== "]") { /* options */ }
      } else if (command === "resumeSubheading") {
        emit("\n"); group(); emit(" | "); group(); emit("\n"); group(); emit(" | "); group(); emit("\n");
      } else if (["resumeProjectHeading", "resumeSubSubheading"].includes(command)) {
        emit("\n"); group(); emit(" | "); group(); emit("\n");
      } else if (["resumeItem", "resumeSubItem"].includes(command)) {
        emit("\n• "); group(); emit("\n");
      } else if (command === "item") emit("\n• ");
      else if (command === "section") { emit("\n"); group(); emit("\n"); }
      else if (command === "textbackslash") { if (source[i] === "{" && source[i + 1] === "}") i += 2; emit("\\", { start, end: i }); }
      else if (command === "textasciitilde") { if (source[i] === "{" && source[i + 1] === "}") i += 2; emit("~", { start, end: i }); }
      else if (command === "textasciicircum") { if (source[i] === "{" && source[i + 1] === "}") i += 2; emit("^", { start, end: i }); }
      else if (command === "LaTeX") emit("LaTeX", { start, end: i });
      // Formatting commands are omitted; their following group is read normally.
    }
  };
  read();

  // Match readableLatex's whitespace cleanup while retaining source mapping.
  const normalized: { text: string; span: SourceSpan }[] = [];
  for (let index = 0; index < visible.length; index++) {
    let text = visible[index];
    if (/[ \t\r]/.test(text)) text = " ";
    if (text === " " && (normalized.at(-1)?.text === " " || normalized.at(-1)?.text === "\n")) continue;
    if (text === "\n" && normalized.at(-1)?.text === " ") normalized.pop();
    normalized.push({ text, span: spans[index] });
  }
  while (normalized[0]?.text === "\n" || normalized[0]?.text === " ") normalized.shift();
  while (normalized.at(-1)?.text === "\n" || normalized.at(-1)?.text === " ") normalized.pop();
  // readableLatex collapses 3+ newlines to two.
  for (let index = normalized.length - 1; index >= 2; index--)
    if (normalized[index].text === "\n" && normalized[index - 1].text === "\n" && normalized[index - 2].text === "\n") normalized.splice(index, 1);

  const current = normalized.map((part) => part.text).join("");
  if (current === nextReadable) return source;
  let prefix = 0;
  while (prefix < current.length && prefix < nextReadable.length && current[prefix] === nextReadable[prefix]) prefix++;
  let suffix = 0;
  while (suffix < current.length - prefix && suffix < nextReadable.length - prefix && current[current.length - 1 - suffix] === nextReadable[nextReadable.length - 1 - suffix]) suffix++;

  const oldEnd = current.length - suffix;
  const replacement = escapeLatexText(nextReadable.slice(prefix, nextReadable.length - suffix));
  const affected = normalized.slice(prefix, oldEnd).map((part) => part.span).filter((span): span is Exclude<SourceSpan, null> => span !== null);
  const left = normalized.slice(0, prefix).map((part) => part.span).filter((span): span is Exclude<SourceSpan, null> => span !== null).at(-1);
  const right = normalized.slice(oldEnd).map((part) => part.span).find((span): span is Exclude<SourceSpan, null> => span !== null);
  const start = affected[0]?.start ?? right?.start ?? left?.end;
  const end = affected.at(-1)?.end ?? start;
  if (start === undefined || end === undefined) return source;
  return source.slice(0, start) + replacement + source.slice(end);
}
