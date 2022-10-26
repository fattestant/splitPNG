const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electron", {
    saveFile: (fileInfo) => {
        ipcRenderer.send("saveFile", fileInfo);
    },
    openFolder: (path) => {
        ipcRenderer.send("openFolder", path);
    }
});