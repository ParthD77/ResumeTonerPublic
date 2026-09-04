const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("resumeDesktop", {
  openChatGPT: () => ipcRenderer.invoke("open-chatgpt"),
  openLatex: () => ipcRenderer.invoke("open-latex"),
  compileLatex: (latex) => ipcRenderer.invoke("compile-latex", latex),
  saveLatex: (latex) => ipcRenderer.invoke("save-latex", latex),
  saveResume: (bytes) => ipcRenderer.invoke("save-resume", bytes),
});
