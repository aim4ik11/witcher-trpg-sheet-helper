import { create } from 'zustand';
import type { SessionConfig, ServerInfo, Player } from '@wilmak/shared';

interface AppState {
  config: SessionConfig | null;
  server: ServerInfo | null;
  players: Player[];
  setConfig: (config: SessionConfig | null) => void;
  setServer: (server: ServerInfo | null) => void;
  setPlayers: (players: Player[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  config: null,
  server: null,
  players: [],
  setConfig: (config) => set({ config }),
  setServer: (server) => set({ server }),
  setPlayers: (players) => set({ players }),
}));
