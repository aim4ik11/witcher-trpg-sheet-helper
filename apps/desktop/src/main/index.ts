import { app, BrowserWindow, ipcMain, dialog, utilityProcess, type UtilityProcess } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { SessionConfig, ServerInfo, ServerToHost, Character, HostToServer } from '@wilmak/shared';

const isDev = !!process.env.ELECTRON_RENDERER_URL;
let win: BrowserWindow | null = null;
let serverProc: UtilityProcess | null = null;

type PendingRequest = { resolve: (data: unknown) => void; reject: (err: Error) => void };
const pending = new Map<string, PendingRequest>();

// __dirname here is .../out/main (electron-vite output).
function serverEntry(): string {
  return isDev
    ? path.join(__dirname, '../../../server/dist/server.cjs') // apps/server/dist/server.cjs
    : path.join(process.resourcesPath, 'server', 'server.cjs');
}
function playerWebDir(): string {
  return isDev
    ? path.join(__dirname, '../../../player-web/dist') // apps/player-web/dist
    : path.join(process.resourcesPath, 'player-web');
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1100,
    height: 740,
    frame: false,
    backgroundColor: '#14131a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  if (isDev) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL!);
    win.webContents.openDevTools();
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function handleServerMessage(msg: ServerToHost): void {
  switch (msg.type) {
    case 'players':
      win?.webContents.send('players:update', msg.players);
      break;
    case 'characters:result': {
      const p = pending.get(msg.requestId);
      if (p) { p.resolve(msg.data); pending.delete(msg.requestId); }
      break;
    }
    case 'characters:error': {
      const p = pending.get(msg.requestId);
      if (p) { p.reject(new Error(msg.message)); pending.delete(msg.requestId); }
      break;
    }
    case 'characters:changed':
      win?.webContents.send('characters:changed');
      break;
    case 'character:updated':
      win?.webContents.send('character:updated', msg.character);
      break;
  }
}

// The server is forked as a separate process; electron-vite does not manage it.
function startServer(config: SessionConfig): Promise<ServerInfo> {
  return new Promise<ServerInfo>((resolve, reject) => {
    let resolved = false;
    const proc = utilityProcess.fork(serverEntry(), [], { serviceName: 'wilmak-server' });
    serverProc = proc;
    proc.on('message', (msg: ServerToHost) => {
      if (!resolved) {
        if (msg.type === 'ready') { resolved = true; resolve({ urls: msg.urls, port: msg.port }); }
        else if (msg.type === 'error') { resolved = true; reject(new Error(msg.message)); }
        return;
      }
      handleServerMessage(msg);
    });
    proc.on('spawn', () => {
      proc.postMessage({ type: 'start', config: { ...config, playerWebDir: playerWebDir() } });
    });
    proc.on('exit', () => {
      if (serverProc === proc) serverProc = null;
    });
  });
}

function requestServer<T>(msg: Extract<HostToServer, { requestId: string }>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (!serverProc) { reject(new Error('Server not running')); return; }
    pending.set(msg.requestId, { resolve: (data) => resolve(data as T), reject });
    serverProc.postMessage(msg);
  });
}

void app.whenReady().then(createWindow);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => {
  serverProc?.postMessage({ type: 'stop' });
  if (process.platform !== 'darwin') app.quit();
});

// GM privileged control surface (renderer -> IPC -> main -> server).
ipcMain.handle('session:pickConfig', async (): Promise<SessionConfig | null> => {
  const r = await dialog.showOpenDialog(win!, {
    filters: [{ name: 'Session config', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return JSON.parse(fs.readFileSync(r.filePaths[0], 'utf-8')) as SessionConfig;
});
ipcMain.handle('session:start', (_e, config: SessionConfig) => startServer(config));
ipcMain.handle('player:kick', (_e, socketId: string) => serverProc?.postMessage({ type: 'gm:kick', socketId }));
ipcMain.handle('gm:broadcast', (_e, payload: unknown) => serverProc?.postMessage({ type: 'gm:broadcast', payload }));

// Character CRUD over IPC.
ipcMain.handle('characters:getAll', () =>
  requestServer<Character[]>({ type: 'characters:getAll', requestId: randomUUID() }),
);
ipcMain.handle('characters:get', (_e, id: string) =>
  requestServer<Character>({ type: 'characters:get', requestId: randomUUID(), id }),
);
ipcMain.handle('characters:create', (_e, data: Partial<Character>) =>
  requestServer<Character>({ type: 'characters:create', requestId: randomUUID(), data }),
);
ipcMain.handle('characters:update', (_e, id: string, character: Character) =>
  requestServer<Character>({ type: 'characters:update', requestId: randomUUID(), id, character }),
);
ipcMain.handle('characters:delete', (_e, id: string) =>
  requestServer<void>({ type: 'characters:delete', requestId: randomUUID(), id }),
);
