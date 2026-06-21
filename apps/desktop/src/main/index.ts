import { app, BrowserWindow, ipcMain, dialog, utilityProcess, type UtilityProcess } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { SessionConfig, ServerInfo, ServerToHost } from '@wilmak/shared';

const isDev = !!process.env.ELECTRON_RENDERER_URL;
let win: BrowserWindow | null = null;
let serverProc: UtilityProcess | null = null;

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
    backgroundColor: '#14131a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  if (isDev) void win.loadURL(process.env.ELECTRON_RENDERER_URL!);
  else void win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

// The server is forked as a separate process; electron-vite does not manage it.
function startServer(config: SessionConfig): Promise<ServerInfo> {
  return new Promise<ServerInfo>((resolve, reject) => {
    const proc = utilityProcess.fork(serverEntry(), [], { serviceName: 'wilmak-server' });
    serverProc = proc;
    proc.on('message', (msg: ServerToHost) => {
      if (msg.type === 'ready') resolve({ urls: msg.urls, port: msg.port });
      else if (msg.type === 'players') win?.webContents.send('players:update', msg.players);
      else if (msg.type === 'error') reject(new Error(msg.message));
    });
    proc.on('spawn', () => {
      proc.postMessage({ type: 'start', config: { ...config, playerWebDir: playerWebDir() } });
    });
    proc.on('exit', () => {
      if (serverProc === proc) serverProc = null;
    });
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
