"use strict";
const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const isDev = !!process.env.ELECTRON_RENDERER_URL;
let win = null;
let serverProc = null;
function serverEntry() {
  return isDev ? path.join(__dirname, "../../../server/dist/server.cjs") : path.join(process.resourcesPath, "server", "server.cjs");
}
function playerWebDir() {
  return isDev ? path.join(__dirname, "../../../player-web/dist") : path.join(process.resourcesPath, "player-web");
}
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1100,
    height: 740,
    frame: false,
    backgroundColor: "#14131a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  if (isDev) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(path.join(__dirname, "../renderer/index.html"));
}
function startServer(config) {
  return new Promise((resolve, reject) => {
    const proc = electron.utilityProcess.fork(serverEntry(), [], { serviceName: "wilmak-server" });
    serverProc = proc;
    proc.on("message", (msg) => {
      if (msg.type === "ready") resolve({ urls: msg.urls, port: msg.port });
      else if (msg.type === "players") win?.webContents.send("players:update", msg.players);
      else if (msg.type === "error") reject(new Error(msg.message));
    });
    proc.on("spawn", () => {
      proc.postMessage({ type: "start", config: { ...config, playerWebDir: playerWebDir() } });
    });
    proc.on("exit", () => {
      if (serverProc === proc) serverProc = null;
    });
  });
}
void electron.app.whenReady().then(createWindow);
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
electron.app.on("window-all-closed", () => {
  serverProc?.postMessage({ type: "stop" });
  if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.handle("session:pickConfig", async () => {
  const r = await electron.dialog.showOpenDialog(win, {
    filters: [{ name: "Session config", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return JSON.parse(fs.readFileSync(r.filePaths[0], "utf-8"));
});
electron.ipcMain.handle("session:start", (_e, config) => startServer(config));
electron.ipcMain.handle("player:kick", (_e, socketId) => serverProc?.postMessage({ type: "gm:kick", socketId }));
electron.ipcMain.handle("gm:broadcast", (_e, payload) => serverProc?.postMessage({ type: "gm:broadcast", payload }));
