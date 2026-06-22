"use strict";
const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const node_crypto = require("node:crypto");
const isDev = !!process.env.ELECTRON_RENDERER_URL;
let win = null;
let serverProc = null;
const pending = /* @__PURE__ */ new Map();
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
  if (isDev) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools();
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
function handleServerMessage(msg) {
  switch (msg.type) {
    case "players":
      win?.webContents.send("players:update", msg.players);
      break;
    case "characters:result": {
      const p = pending.get(msg.requestId);
      if (p) {
        p.resolve(msg.data);
        pending.delete(msg.requestId);
      }
      break;
    }
    case "characters:error": {
      const p = pending.get(msg.requestId);
      if (p) {
        p.reject(new Error(msg.message));
        pending.delete(msg.requestId);
      }
      break;
    }
    case "characters:changed":
      win?.webContents.send("characters:changed");
      break;
    case "character:updated":
      win?.webContents.send("character:updated", msg.character);
      break;
  }
}
function startServer(config) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const proc = electron.utilityProcess.fork(serverEntry(), [], { serviceName: "wilmak-server" });
    serverProc = proc;
    proc.on("message", (msg) => {
      if (!resolved) {
        if (msg.type === "ready") {
          resolved = true;
          resolve({ urls: msg.urls, port: msg.port });
        } else if (msg.type === "error") {
          resolved = true;
          reject(new Error(msg.message));
        }
        return;
      }
      handleServerMessage(msg);
    });
    proc.on("spawn", () => {
      proc.postMessage({ type: "start", config: { ...config, playerWebDir: playerWebDir() } });
    });
    proc.on("exit", () => {
      if (serverProc === proc) serverProc = null;
    });
  });
}
function requestServer(msg) {
  return new Promise((resolve, reject) => {
    if (!serverProc) {
      reject(new Error("Server not running"));
      return;
    }
    pending.set(msg.requestId, { resolve: (data) => resolve(data), reject });
    serverProc.postMessage(msg);
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
electron.ipcMain.handle(
  "characters:getAll",
  () => requestServer({ type: "characters:getAll", requestId: node_crypto.randomUUID() })
);
electron.ipcMain.handle(
  "characters:get",
  (_e, id) => requestServer({ type: "characters:get", requestId: node_crypto.randomUUID(), id })
);
electron.ipcMain.handle(
  "characters:create",
  (_e, data) => requestServer({ type: "characters:create", requestId: node_crypto.randomUUID(), data })
);
electron.ipcMain.handle(
  "characters:update",
  (_e, id, character) => requestServer({ type: "characters:update", requestId: node_crypto.randomUUID(), id, character })
);
electron.ipcMain.handle(
  "characters:delete",
  (_e, id) => requestServer({ type: "characters:delete", requestId: node_crypto.randomUUID(), id })
);
