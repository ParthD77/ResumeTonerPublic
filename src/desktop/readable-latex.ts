/** A display-only text preview, never used to rewrite the exported LaTeX. */
export function readableLatex(source: string): string {
  let i = 0;
  const group = (): string => {
    while (/\s/.test(source[i] ?? "") && i < source.length) i++;
    if (source[i] !== "{") return "";
    i++;
    return read(true);
  };
  const read = (nested = false): string => {
    let output = "";
    while (i < source.length) {
      const char = source[i++];
      if (char === "}" && nested) break;
      if (char === "{") { output += read(true); continue; }
      if (char === "%") {
        while (i < source.length && source[i] !== "\n") i++;
        continue;
      }
      if (char !== "\\") {
        output += char === "$" || char === "}" ? "" : char === "~" ? " " : char;
        continue;
      }
      const command = source.slice(i).match(/^[a-zA-Z]+/)?.[0];
      if (!command) {
        const symbol = source[i++] ?? "";
        output += symbol === "\\" ? "\n" : symbol === "," || symbol === ";" || symbol === " " ? " " : symbol;
        continue;
      }
      i += command.length;
      if (command === "href") { group(); output += group(); }
      else if (["vspace", "hspace", "begin", "end", "label"].includes(command)) {
        if (source[i] === "*") i++;
        group();
        if (source[i] === "[") {
          while (i < source.length && source[i++] !== "]") { /* options */ }
        }
      }
      else if (command === "resumeSubheading") {
        output += `\n${group()} | ${group()}\n${group()} | ${group()}\n`;
      }
      else if (["resumeProjectHeading", "resumeSubSubheading"].includes(command)) {
        output += `\n${group()} | ${group()}\n`;
      }
      else if (["resumeItem", "resumeSubItem"].includes(command)) output += `\n• ${group()}\n`;
      else if (command === "item") output += "\n• ";
      else if (command === "section") output += `\n${group()}\n`;
      else if (command === "textbackslash") output += "\\";
      else if (command === "textasciitilde") output += "~";
      else if (command === "textasciicircum") output += "^";
      else if (command === "LaTeX") output += "LaTeX";
      // Formatting and list wrapper commands contribute no visible text.
      // Their braced content is still read on the next iteration.
    }
    return output;
  };
  return read().replace(/[ \t\r]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
