const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("musicAgent", {
  planMusic: (request) => ipcRenderer.invoke("music-agent:plan", request),
  platform: process.platform,
});
