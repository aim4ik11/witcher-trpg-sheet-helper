import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { Api, SessionConfig, Player } from '@wilmak/shared';

const api: Api = {
  pickConfig: () => ipcRenderer.invoke('session:pickConfig'),
  startSession: (config: SessionConfig) => ipcRenderer.invoke('session:start', config),
  kickPlayer: (socketId: string) => ipcRenderer.invoke('player:kick', socketId),
  broadcast: (payload: unknown) => ipcRenderer.invoke('gm:broadcast', payload),
  onPlayersUpdate: (cb: (players: Player[]) => void) => {
    const handler = (_e: IpcRendererEvent, players: Player[]) => cb(players);
    ipcRenderer.on('players:update', handler);
    return () => ipcRenderer.removeListener('players:update', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);
