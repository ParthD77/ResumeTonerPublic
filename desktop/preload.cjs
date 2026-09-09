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
  saveResume: (bytes) => ipcRenderer.invoke("save-resume", bytes),
});
