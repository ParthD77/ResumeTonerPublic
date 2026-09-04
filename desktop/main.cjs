const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const devUrl = "http://127.0.0.1:5173/desktop.html";

function createWindow() {
  const window = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1080,
    minHeight: 720,
    title: "Resume Toner Desktop",
    backgroundColor: "#f3f5f1",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (process.argv.includes("--dev")) window.loadURL(devUrl);
  else window.loadFile(path.join(__dirname, "../dist/desktop.html"));
  window.webContents.on(
    "did-fail-load",
    (_event, code, description, validatedUrl, isMainFrame) => {
      if (!isMainFrame || code === -3) return;
      dialog.showErrorBox(
        "Resume Toner could not start",
        `${description} (${code})\n${validatedUrl}`,
      );
    },
  );
  window.webContents.on("render-process-gone", (_event, details) => {
    dialog.showErrorBox(
      "Resume Toner stopped unexpectedly",
      `The app renderer exited: ${details.reason}.`,
    );
  });
  window.webContents.on("will-navigate", (event, url) => {
    event.preventDefault();
    if (url.startsWith("https://")) shell.openExternal(url);
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
}

ipcMain.handle("open-chatgpt", () =>
  shell.openExternal("https://chatgpt.com/"),
);
ipcMain.handle("open-latex", async () => {
  const result = await dialog.showOpenDialog({
    title: "Open base LaTeX resume",
    properties: ["openFile"],
    filters: [{ name: "LaTeX", extensions: ["tex"] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const value = await fs.readFile(result.filePaths[0], "utf8");
  if (Buffer.byteLength(value, "utf8") > 500_000)
    throw new Error("The LaTeX source is larger than 500 KB.");
  return value;
});
ipcMain.handle("save-latex", async (_event, latex) => {
  const result = await dialog.showSaveDialog({
    title: "Save tailored LaTeX",
    defaultPath: path.join(app.getPath("downloads"), "Resume.tex"),
    filters: [{ name: "LaTeX", extensions: ["tex"] }],
  });
  if (result.canceled || !result.filePath) return null;
  await fs.writeFile(result.filePath, latex, "utf8");
  return result.filePath;
});
ipcMain.handle("compile-latex", async (_event, latex) => {
  if (typeof latex !== "string" || Buffer.byteLength(latex, "utf8") > 500_000)
    return { ok: false, error: "Invalid or oversized LaTeX source.", log: "" };
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "resume-toner-latex-"));
  const source = path.join(work, "resume.tex");
  let log = "";
  try {
    await fs.writeFile(source, latex, "utf8");
    for (let pass = 0; pass < 2; pass += 1) {
      const outcome = await new Promise((resolve) => {
        const child = spawn(
          "pdflatex",
          [
            "-no-shell-escape",
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-file-line-error",
            "-output-directory",
            work,
            source,
          ],
          { cwd: work, windowsHide: true },
        );
        let output = "";
        child.stdout.on("data", (data) => {
          output += data.toString();
        });
        child.stderr.on("data", (data) => {
          output += data.toString();
        });
        child.on("error", (error) =>
          resolve({ code: -1, output: `${output}\n${error.message}` }),
        );
        child.on("close", (code) => resolve({ code, output }));
      });
      log += `PASS ${pass + 1}\n${outcome.output}\n`;
      if (outcome.code !== 0)
        return {
          ok: false,
          error:
            "MiKTeX could not compile this LaTeX. Open the compiler log for the exact line error.",
          log: log.slice(-30_000),
        };
    }
    const pdf = await fs.readFile(path.join(work, "resume.pdf"));
    return {
      ok: true,
      pdf: pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength),
      log: log.slice(-30_000),
    };
  } finally {
    await fs.rm(work, { recursive: true, force: true }).catch(() => undefined);
  }
});
ipcMain.handle("save-resume", async (_event, bytes) => {
  const result = await dialog.showSaveDialog({
    title: "Save tailored resume",
    defaultPath: path.join(app.getPath("downloads"), "Resume.pdf"),
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (result.canceled || !result.filePath) return null;
  await fs.writeFile(result.filePath, Buffer.from(bytes));
  return result.filePath;
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => app.quit());
