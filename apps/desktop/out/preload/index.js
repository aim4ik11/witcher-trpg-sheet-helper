"use strict";
const electron = require("electron");
const api = {
  pickConfig: () => electron.ipcRenderer.invoke("session:pickConfig"),
  startSession: (config) => electron.ipcRenderer.invoke("session:start", config),
  kickPlayer: (socketId) => electron.ipcRenderer.invoke("player:kick", socketId),
  broadcast: (payload) => electron.ipcRenderer.invoke("gm:broadcast", payload),
  onPlayersUpdate: (cb) => {
    const handler = (_e, players) => cb(players);
    electron.ipcRenderer.on("players:update", handler);
    return () => electron.ipcRenderer.removeListener("players:update", handler);
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
