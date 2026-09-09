import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const {
  getDesktopPlatform,
  getLatexCompilerCandidates,
  missingLatexMessage,
  resolveLatexCompiler,
} = require("../../desktop/platform.cjs");

describe("desktop platform integration", () => {
  it("uses platform-specific labels", () => {
    expect(getDesktopPlatform("darwin")).toEqual({
      osLabel: "MAC",
      latexDistribution: "MacTeX",
    });
    expect(getDesktopPlatform("win32")).toEqual({
      osLabel: "WINDOWS",
      latexDistribution: "MiKTeX",
    });
  });

  it("checks the stable MacTeX location before the inherited PATH", () => {
    expect(
      getLatexCompilerCandidates("darwin", { PATH: "/custom/bin" }),
    ).toEqual([
      "/Library/TeX/texbin/pdflatex",
      "/usr/local/bin/pdflatex",
      "/opt/homebrew/bin/pdflatex",
      "/custom/bin/pdflatex",
    ]);
  });

  it("selects the first accessible compiler", async () => {
    const access = vi.fn(async (candidate: string) => {
      if (candidate !== "/usr/local/bin/pdflatex") throw new Error("missing");
    });
    await expect(
      resolveLatexCompiler("darwin", { PATH: "" }, access),
    ).resolves.toBe("/usr/local/bin/pdflatex");
    expect(access).toHaveBeenCalledTimes(2);
  });

  it("returns an actionable error when MacTeX is unavailable", async () => {
    const access = vi.fn(async () => {
      throw new Error("missing");
    });
    await expect(
      resolveLatexCompiler("darwin", { PATH: "" }, access),
    ).resolves.toBeNull();
    expect(missingLatexMessage("darwin")).toMatch(/Install MacTeX/);
  });

  it("finds the Windows executable from PATH", () => {
    const candidates = getLatexCompilerCandidates("win32", {
      PATH: "C:\\MiKTeX\\bin",
    });
    expect(candidates).toContain("C:\\MiKTeX\\bin\\pdflatex.exe");
  });
});
