const { contextBridge, ipcRenderer } = require('electron');

// The ONLY bridge between the GM UI and Node. Players never see this.
contextBridge.exposeInMainWorld('api', {
  pickConfig: () => ipcRenderer.invoke('session:pickConfig'),
  startSession: (config) => ipcRenderer.invoke('session:start', config),
  kickPlayer: (socketId) => ipcRenderer.invoke('player:kick', socketId),
  broadcast: (payload) => ipcRenderer.invoke('gm:broadcast', payload),
  onPlayersUpdate: (cb) => {
    const handler = (_e, players) => cb(players);
    ipcRenderer.on('players:update', handler);
    return () => ipcRenderer.removeListener('players:update', handler);
  },
});
