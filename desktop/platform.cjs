const path = require("node:path");

const MAC_LATEX_LOCATIONS = [
  "/Library/TeX/texbin/pdflatex",
  "/usr/local/bin/pdflatex",
  "/opt/homebrew/bin/pdflatex",
];

function getDesktopPlatform(platform = process.platform) {
  if (platform === "darwin")
    return { osLabel: "MAC", latexDistribution: "MacTeX" };
  if (platform === "win32")
    return { osLabel: "WINDOWS", latexDistribution: "MiKTeX" };
  return { osLabel: "DESKTOP", latexDistribution: "TeX" };
}

function getLatexCompilerCandidates(
  platform = process.platform,
  environment = process.env,
) {
  const platformPath = platform === "win32" ? path.win32 : path.posix;
  const executable = platform === "win32" ? "pdflatex.exe" : "pdflatex";
  const fromPath = (environment.PATH || "")
    .split(platformPath.delimiter)
    .filter(Boolean)
    .map((directory) => platformPath.join(directory, executable));
  const candidates =
    platform === "darwin" ? [...MAC_LATEX_LOCATIONS, ...fromPath] : fromPath;
  return [...new Set(candidates)];
}

async function resolveLatexCompiler(
  platform = process.platform,
  environment = process.env,
  access,
) {
  const canAccess = access || require("node:fs/promises").access;
  for (const candidate of getLatexCompilerCandidates(platform, environment)) {
    try {
      await canAccess(candidate);
      return candidate;
    } catch {
      // Try the next known location.
    }
  }
  return null;
}

function missingLatexMessage(platform = process.platform) {
  if (platform === "darwin")
    return "MacTeX was not found. Install MacTeX, then quit and reopen Resume Toner.";
  if (platform === "win32")
    return "MiKTeX was not found. Install MiKTeX and make sure pdflatex is available on PATH, then reopen Resume Toner.";
  return "pdflatex was not found. Install a TeX distribution, then reopen Resume Toner.";
}

module.exports = {
  getDesktopPlatform,
  getLatexCompilerCandidates,
  missingLatexMessage,
  resolveLatexCompiler,
};
