const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("resumeDesktop", {
  platform:
    process.platform === "darwin"
      ? { osLabel: "MAC", latexDistribution: "MacTeX" }
      : process.platform === "win32"
        ? { osLabel: "WINDOWS", latexDistribution: "MiKTeX" }
        : { osLabel: "DESKTOP", latexDistribution: "TeX" },
  openChatGPT: () => ipcRenderer.invoke("open-chatgpt"),
  openLatex: () => ipcRenderer.invoke("open-latex"),
  compileLatex: (latex) => ipcRenderer.invoke("compile-latex", latex),
  saveLatex: (latex) => ipcRenderer.invoke("save-latex", latex),
  getResumeFilename: () => ipcRenderer.invoke("get-resume-filename"),
  setResumeFilename: (filename) =>
    ipcRenderer.invoke("set-resume-filename", filename),
  saveResume: (bytes, filename) =>
    ipcRenderer.invoke("save-resume", bytes, filename),
});
