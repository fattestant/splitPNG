const { shell, app, BrowserWindow, Menu, ipcMain } = require("electron")
const fs = require("fs");
const path = require("path");

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 400,
        height: 200,
        center: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        }
    });

    mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
});

ipcMain.on("saveFile", (_, fileInfo) => {
    let saveFile = (path, data) => {
        fs.writeFile(path, data, "base64", function (error) {
            if (error) {
                console.error(error);
            }
        });
    };
    
    if (fs.existsSync(fileInfo.path)) {
        saveFile(fileInfo.path + fileInfo.name, fileInfo.data);
    } else {
        fs.mkdir(fileInfo.path, function(error) {
            if (error) {
                console.error(error);
            } else {
                saveFile(fileInfo.path + fileInfo.name, fileInfo.data);
            }
        });
    } 
});

ipcMain.on("openFolder", (_, path) => {
    if (fs.existsSync(path)) {
        shell.openPath(path);
    }
});