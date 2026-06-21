const { app, BrowserWindow, ipcMain, dialog, utilityProcess } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !!process.env.VITE_DEV_SERVER_URL;
let win = null;
let serverProc = null;

function serverEntry() {
  return isDev
    ? path.join(__dirname, '..', '..', 'server', 'src', 'index.js')   // ESM source in dev
    : path.join(process.resourcesPath, 'server', 'server.cjs');        // bundled in prod
}

function playerWebDir() {
  return isDev
    ? path.join(__dirname, '..', '..', 'player-web', 'dist')
    : path.join(process.resourcesPath, 'player-web');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 740,
    backgroundColor: '#14131a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (isDev) win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

function startServer(config) {
  return new Promise((resolve, reject) => {
    serverProc = utilityProcess.fork(serverEntry(), [], { serviceName: 'wilmak-server' });
    serverProc.on('message', (msg) => {
      if (msg.type === 'ready') resolve({ urls: msg.urls, port: msg.port });
      else if (msg.type === 'players') win?.webContents.send('players:update', msg.players);
      else if (msg.type === 'error') reject(new Error(msg.message));
    });
    serverProc.on('spawn', () => {
      serverProc.postMessage({ type: 'start', config: { ...config, playerWebDir: playerWebDir() } });
    });
    serverProc.on('exit', () => { serverProc = null; });
  });
}

app.whenReady().then(createWindow);
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('window-all-closed', () => {
  serverProc?.postMessage({ type: 'stop' });
  if (process.platform !== 'darwin') app.quit();
});

// GM privileged control surface (IPC -> main -> server). Players cannot reach this.
ipcMain.handle('session:pickConfig', async () => {
  const r = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Session config', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  return JSON.parse(fs.readFileSync(r.filePaths[0], 'utf-8'));
});
ipcMain.handle('session:start', (_e, config) => startServer(config));
ipcMain.handle('player:kick', (_e, socketId) => serverProc?.postMessage({ type: 'gm:kick', socketId }));
ipcMain.handle('gm:broadcast', (_e, payload) => serverProc?.postMessage({ type: 'gm:broadcast', payload }));
