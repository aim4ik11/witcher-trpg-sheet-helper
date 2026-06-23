import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  utilityProcess,
  type UtilityProcess,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import {
  loadMostRecentSession,
  loadActiveSession,
  migrateLegacyLastSession,
  normalizeSessionConfig,
  readSessionFromFile,
  saveSession,
  sessionsDir,
} from "./session-files";

import type {
  Character,
  HostToServer,
  PlayerCredential,
  ServerInfo,
  ServerToHost,
  SessionConfig,
} from "@wilmak/shared";

const isDev = !!process.env.ELECTRON_RENDERER_URL;
let win: BrowserWindow | null = null;
let serverProc: UtilityProcess | null = null;

type PendingRequest = {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
};
const pending = new Map<string, PendingRequest>();

// __dirname here is .../out/main (electron-vite output).
function serverEntry(): string {
  return isDev
    ? path.join(__dirname, "../../../server/dist/server.cjs") // apps/server/dist/server.cjs
    : path.join(process.resourcesPath, "server", "server.cjs");
}
function playerWebDir(): string {
  return isDev
    ? path.join(__dirname, "../../../player-web/dist") // apps/player-web/dist
    : path.join(process.resourcesPath, "player-web");
}

let persistCharactersTimer: NodeJS.Timeout | null = null;

function schedulePersistCharacters(): void {
  if (persistCharactersTimer) clearTimeout(persistCharactersTimer);
  persistCharactersTimer = setTimeout(() => {
    persistCharactersTimer = null;
    void persistCharactersFromServer();
  }, 500);
}

async function persistCharactersFromServer(): Promise<void> {
  if (!serverProc) return;
  try {
    const characters = await requestServer<Character[]>({
      type: "characters:getAll",
      requestId: randomUUID(),
    });
    const existing = loadActiveSession();
    if (!existing) return;
    saveSession({ ...existing, characters });
  } catch {
    // Server stopped or request failed — ignore.
  }
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1100,
    height: 740,
    backgroundColor: "#14131a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  if (isDev) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL!);
    win.webContents.openDevTools();
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function handleServerMessage(msg: ServerToHost): void {
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

function rejectPending(error: Error): void {
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(error);
  }
  pending.clear();
}

function stopServer(): Promise<void> {
  if (persistCharactersTimer) {
    clearTimeout(persistCharactersTimer);
    persistCharactersTimer = null;
  }

  return persistCharactersFromServer().then(() => {
    if (!serverProc) return;
    const proc = serverProc;
    return new Promise<void>((resolve) => {
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
      }, 3000);
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

// The server is forked as a separate process; electron-vite does not manage it.
function startServer(config: SessionConfig): Promise<ServerInfo> {
  return stopServer().then(
    () =>
      new Promise<ServerInfo>((resolve, reject) => {
        let resolved = false;
        let proc: UtilityProcess | null = null;
        const fail = (err: Error) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(startTimer);
          if (proc && serverProc === proc) {
            serverProc = null;
            proc.kill();
          }
          reject(err);
        };
        const startTimer = setTimeout(
          () => fail(new Error("Server failed to start (timeout)")),
          15_000,
        );

        proc = utilityProcess.fork(serverEntry(), [], { serviceName: "wilmak-server" });
        serverProc = proc;
        proc.on("message", (msg: ServerToHost) => {
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
          proc.postMessage({
            type: "start",
            config: { ...config, playerWebDir: playerWebDir() },
          });
        });
        proc.on("exit", (code) => {
          if (serverProc === proc) serverProc = null;
          if (!resolved)
            fail(new Error(code ? `Server exited (${code})` : "Server exited"));
        });
      }),
  );
}

function requestServer<T>(
  msg: Extract<HostToServer, { requestId: string }>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (!serverProc) {
      reject(new Error("Server not running"));
      return;
    }
    const timer = setTimeout(() => {
      pending.delete(msg.requestId);
      reject(new Error("Server request timed out"));
    }, 10_000);
    pending.set(msg.requestId, {
      resolve: (data) => resolve(data as T),
      reject,
      timer,
    });
    serverProc.postMessage(msg);
  });
}

void app.whenReady().then(() => {
  migrateLegacyLastSession();
  createWindow();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("window-all-closed", () => {
  void stopServer();
  if (process.platform !== "darwin") app.quit();
});

// GM privileged control surface (renderer -> IPC -> main -> server).
ipcMain.handle("session:loadLast", (): SessionConfig | null => loadMostRecentSession());
ipcMain.handle("session:saveLast", (_e, config: SessionConfig) => {
  saveSession(config);
});
ipcMain.handle("session:pickConfig", async (): Promise<SessionConfig | null> => {
  const r = await dialog.showOpenDialog(win!, {
    defaultPath: sessionsDir(),
    filters: [{ name: "Session config", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const config =
    readSessionFromFile(r.filePaths[0]) ??
    normalizeSessionConfig(
      JSON.parse(fs.readFileSync(r.filePaths[0], "utf-8")) as Partial<SessionConfig>,
    );
  return saveSession(config);
});
ipcMain.handle("session:start", async (_e, config: SessionConfig) => {
  const saved = saveSession(config);
  return startServer(saved);
});
ipcMain.handle("session:stop", () => stopServer());
ipcMain.handle("player:kick", (_e, socketId: string) =>
  serverProc?.postMessage({ type: "gm:kick", socketId }),
);
ipcMain.handle("gm:broadcast", (_e, payload: unknown) =>
  serverProc?.postMessage({ type: "gm:broadcast", payload }),
);
ipcMain.handle("credentials:getAll", () =>
  requestServer<PlayerCredential[]>({
    type: "credentials:getAll",
    requestId: randomUUID(),
  }),
);
ipcMain.handle("credentials:add", (_e, nickname: string, code?: string) =>
  requestServer<PlayerCredential>({
    type: "credentials:add",
    requestId: randomUUID(),
    nickname,
    code,
  }),
);

// Character CRUD over IPC.
ipcMain.handle("characters:getAll", () =>
  requestServer<Character[]>({ type: "characters:getAll", requestId: randomUUID() }),
);
ipcMain.handle("characters:get", (_e, id: string) =>
  requestServer<Character>({ type: "characters:get", requestId: randomUUID(), id }),
);
ipcMain.handle("characters:create", (_e, data: Partial<Character>) =>
  requestServer<Character>({
    type: "characters:create",
    requestId: randomUUID(),
    data,
  }),
);
ipcMain.handle("characters:update", (_e, id: string, character: Character) =>
  requestServer<Character>({
    type: "characters:update",
    requestId: randomUUID(),
    id,
    character,
  }),
);
ipcMain.handle("characters:delete", (_e, id: string) =>
  requestServer<void>({ type: "characters:delete", requestId: randomUUID(), id }),
);
