"use strict";
const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const node_crypto = require("node:crypto");
function normalizeNickname(nickname) {
  return nickname.trim().toLowerCase().replace(/\s/g, "");
}
const EXAMPLE_SESSION = "example-session.json";
const isDev$1 = !!process.env.ELECTRON_RENDERER_URL;
let activeSessionFile = null;
function sessionsDir() {
  const dir = isDev$1 ? path.join(__dirname, "../../../../sessions") : path.join(electron.app.getPath("userData"), "sessions");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function isValidCharacter(value) {
  if (typeof value !== "object" || value === null) return false;
  const c = value;
  return typeof c.id === "string" && (c.type === "player" || c.type === "enemy") && typeof c.name === "string";
}
function normalizeCharacters(characters) {
  if (!Array.isArray(characters)) return [];
  return characters.filter(isValidCharacter);
}
function normalizeSessionConfig(config) {
  const players = Array.isArray(config.players) ? config.players.filter((p) => typeof p?.nickname === "string" && typeof p?.code === "string").map((p) => ({ ...p, nickname: normalizeNickname(p.nickname) })) : [];
  const normalized = {
    sessionName: typeof config.sessionName === "string" ? config.sessionName : "",
    port: typeof config.port === "number" && Number.isFinite(config.port) ? config.port : 4317,
    players
  };
  if (config.characters !== void 0) {
    normalized.characters = normalizeCharacters(config.characters);
  }
  return normalized;
}
function slugifySessionName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u0400-\u04FF-]+/gi, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
function sessionBaseName(config) {
  const slug = slugifySessionName(config.sessionName);
  return slug || `session-${config.port}`;
}
function sessionFilePath(config) {
  const dir = sessionsDir();
  const base = sessionBaseName(config);
  const defaultPath = path.join(dir, `${base}.json`);
  if (!fs.existsSync(defaultPath)) return defaultPath;
  try {
    const existing = normalizeSessionConfig(
      JSON.parse(fs.readFileSync(defaultPath, "utf-8"))
    );
    if (existing.sessionName === config.sessionName && existing.port === config.port) {
      return defaultPath;
    }
  } catch {
  }
  return path.join(dir, `${base}-${config.port}.json`);
}
function readRawSessionFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}
function readSessionFromFile(filePath) {
  const raw = readRawSessionFile(filePath);
  if (!raw) return null;
  const normalized = normalizeSessionConfig(raw);
  return {
    ...normalized,
    characters: normalized.characters ?? normalizeCharacters(raw.characters)
  };
}
function listSessionFiles() {
  const dir = sessionsDir();
  return fs.readdirSync(dir).filter((name) => name.endsWith(".json") && name !== EXAMPLE_SESSION).map((name) => path.join(dir, name)).filter((filePath) => {
    try {
      return fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  });
}
function loadMostRecentSession() {
  const files = listSessionFiles();
  if (files.length === 0) return null;
  const newest = files.sort(
    (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs
  )[0];
  const config = readSessionFromFile(newest);
  if (config) activeSessionFile = newest;
  return config;
}
function loadActiveSession() {
  if (activeSessionFile) return readSessionFromFile(activeSessionFile);
  return loadMostRecentSession();
}
function saveSession(config) {
  const normalized = normalizeSessionConfig(config);
  const target = sessionFilePath(normalized);
  const onDisk = readRawSessionFile(target);
  const characters = normalized.characters ?? normalizeCharacters(onDisk?.characters);
  const toSave = { ...normalized, characters };
  const { sessionName, port, players } = toSave;
  fs.writeFileSync(
    target,
    JSON.stringify({ sessionName, port, players, characters }, null, 2),
    "utf-8"
  );
  activeSessionFile = target;
  return toSave;
}
function migrateLegacyLastSession() {
  const legacy = path.join(electron.app.getPath("userData"), "last-session.json");
  if (!fs.existsSync(legacy)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(legacy, "utf-8"));
    saveSession(normalizeSessionConfig(raw));
    fs.unlinkSync(legacy);
  } catch {
  }
}
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
let persistCharactersTimer = null;
function schedulePersistCharacters() {
  if (persistCharactersTimer) clearTimeout(persistCharactersTimer);
  persistCharactersTimer = setTimeout(() => {
    persistCharactersTimer = null;
    void persistCharactersFromServer();
  }, 500);
}
async function persistCharactersFromServer() {
  if (!serverProc) return;
  try {
    const characters = await requestServer({
      type: "characters:getAll",
      requestId: node_crypto.randomUUID()
    });
    const existing = loadActiveSession();
    if (!existing) return;
    saveSession({ ...existing, characters });
  } catch {
  }
}
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1100,
    height: 740,
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
    case "credentials":
      win?.webContents.send("credentials:update", msg.credentials);
      break;
    case "characters:result": {
      const p = pending.get(msg.requestId);
      if (p) {
        clearTimeout(p.timer);
        p.resolve(msg.data);
        pending.delete(msg.requestId);
      }
      break;
    }
    case "characters:error": {
      const p = pending.get(msg.requestId);
      if (p) {
        clearTimeout(p.timer);
        p.reject(new Error(msg.message));
        pending.delete(msg.requestId);
      }
      break;
    }
    case "characters:changed":
      win?.webContents.send("characters:changed");
      schedulePersistCharacters();
      break;
    case "character:updated":
      win?.webContents.send("character:updated", msg.character);
      schedulePersistCharacters();
      break;
  }
}
function rejectPending(error) {
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(error);
  }
  pending.clear();
}
function stopServer() {
  if (persistCharactersTimer) {
    clearTimeout(persistCharactersTimer);
    persistCharactersTimer = null;
  }
  return persistCharactersFromServer().then(() => {
    if (!serverProc) return;
    const proc = serverProc;
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(killTimer);
        if (serverProc === proc) serverProc = null;
        resolve();
      };
      const killTimer = setTimeout(() => {
        proc.kill();
        done();
      }, 3e3);
      proc.once("exit", done);
      try {
        proc.postMessage({ type: "stop" });
      } catch {
        proc.kill();
        done();
      }
      rejectPending(new Error("Server stopped"));
    });
  });
}
function startServer(config) {
  return stopServer().then(() => new Promise((resolve, reject) => {
    let resolved = false;
    let proc = null;
    const fail = (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(startTimer);
      if (proc && serverProc === proc) {
        serverProc = null;
        proc.kill();
      }
      reject(err);
    };
    const startTimer = setTimeout(() => fail(new Error("Server failed to start (timeout)")), 15e3);
    proc = electron.utilityProcess.fork(serverEntry(), [], { serviceName: "wilmak-server" });
    serverProc = proc;
    proc.on("message", (msg) => {
      if (!resolved) {
        if (msg.type === "ready") {
          resolved = true;
          clearTimeout(startTimer);
          resolve({ urls: msg.urls, port: msg.port });
        } else if (msg.type === "error") {
          fail(new Error(msg.message));
        }
        return;
      }
      handleServerMessage(msg);
    });
    proc.on("spawn", () => {
      proc.postMessage({ type: "start", config: { ...config, playerWebDir: playerWebDir() } });
    });
    proc.on("exit", (code) => {
      if (serverProc === proc) serverProc = null;
      if (!resolved) fail(new Error(code ? `Server exited (${code})` : "Server exited"));
    });
  }));
}
function requestServer(msg) {
  return new Promise((resolve, reject) => {
    if (!serverProc) {
      reject(new Error("Server not running"));
      return;
    }
    const timer = setTimeout(() => {
      pending.delete(msg.requestId);
      reject(new Error("Server request timed out"));
    }, 1e4);
    pending.set(msg.requestId, { resolve: (data) => resolve(data), reject, timer });
    serverProc.postMessage(msg);
  });
}
void electron.app.whenReady().then(() => {
  migrateLegacyLastSession();
  createWindow();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
electron.app.on("window-all-closed", () => {
  void stopServer();
  if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.handle("session:loadLast", () => loadMostRecentSession());
electron.ipcMain.handle("session:saveLast", (_e, config) => {
  saveSession(config);
});
electron.ipcMain.handle("session:pickConfig", async () => {
  const r = await electron.dialog.showOpenDialog(win, {
    defaultPath: sessionsDir(),
    filters: [{ name: "Session config", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const config = readSessionFromFile(r.filePaths[0]) ?? normalizeSessionConfig(JSON.parse(fs.readFileSync(r.filePaths[0], "utf-8")));
  return saveSession(config);
});
electron.ipcMain.handle("session:start", async (_e, config) => {
  const saved = saveSession(config);
  return startServer(saved);
});
electron.ipcMain.handle("session:stop", () => stopServer());
electron.ipcMain.handle("player:kick", (_e, socketId) => serverProc?.postMessage({ type: "gm:kick", socketId }));
electron.ipcMain.handle("gm:broadcast", (_e, payload) => serverProc?.postMessage({ type: "gm:broadcast", payload }));
electron.ipcMain.handle(
  "credentials:getAll",
  () => requestServer({ type: "credentials:getAll", requestId: node_crypto.randomUUID() })
);
electron.ipcMain.handle(
  "credentials:add",
  (_e, nickname, code) => requestServer({ type: "credentials:add", requestId: node_crypto.randomUUID(), nickname, code })
);
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
