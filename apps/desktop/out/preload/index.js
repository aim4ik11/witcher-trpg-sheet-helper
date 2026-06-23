"use strict";
const electron = require("electron");
const api = {
  loadLastSession: () => electron.ipcRenderer.invoke("session:loadLast"),
  saveLastSession: (config) => electron.ipcRenderer.invoke("session:saveLast", config),
  pickConfig: () => electron.ipcRenderer.invoke("session:pickConfig"),
  startSession: (config) => electron.ipcRenderer.invoke("session:start", config),
  stopSession: () => electron.ipcRenderer.invoke("session:stop"),
  kickPlayer: (socketId) => electron.ipcRenderer.invoke("player:kick", socketId),
  broadcast: (payload) => electron.ipcRenderer.invoke("gm:broadcast", payload),
  onPlayersUpdate: (cb) => {
    const handler = (_e, players) => cb(players);
    electron.ipcRenderer.on("players:update", handler);
    return () => electron.ipcRenderer.removeListener("players:update", handler);
  },
  getCredentials: () => electron.ipcRenderer.invoke("credentials:getAll"),
  addCredential: (nickname, code) => electron.ipcRenderer.invoke("credentials:add", nickname, code),
  onCredentialsUpdate: (cb) => {
    const handler = (_e, credentials) => cb(credentials);
    electron.ipcRenderer.on("credentials:update", handler);
    return () => electron.ipcRenderer.removeListener("credentials:update", handler);
  },
  characters: {
    getAll: () => electron.ipcRenderer.invoke("characters:getAll"),
    get: (id) => electron.ipcRenderer.invoke("characters:get", id),
    create: (data) => electron.ipcRenderer.invoke("characters:create", data),
    update: (id, character) => electron.ipcRenderer.invoke("characters:update", id, character),
    delete: (id) => electron.ipcRenderer.invoke("characters:delete", id)
  },
  onCharactersChanged: (cb) => {
    const handler = () => cb();
    electron.ipcRenderer.on("characters:changed", handler);
    return () => electron.ipcRenderer.removeListener("characters:changed", handler);
  },
  onCharacterUpdated: (cb) => {
    const handler = (_e, character) => cb(character);
    electron.ipcRenderer.on("character:updated", handler);
    return () => electron.ipcRenderer.removeListener("character:updated", handler);
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
