import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type {
  Api,
  SessionConfig,
  Player,
  Character,
  PlayerCredential,
  CombatState,
  SkillCheckRequest,
  SkillCheckResolved,
} from "@wilmak/shared";

const api: Api = {
  loadLastSession: () => ipcRenderer.invoke("session:loadLast"),
  saveLastSession: (config: SessionConfig) =>
    ipcRenderer.invoke("session:saveLast", config),
  pickConfig: () => ipcRenderer.invoke("session:pickConfig"),
  startSession: (config: SessionConfig) => ipcRenderer.invoke("session:start", config),
  stopSession: () => ipcRenderer.invoke("session:stop"),
  kickPlayer: (socketId: string) => ipcRenderer.invoke("player:kick", socketId),
  broadcast: (payload: unknown) => ipcRenderer.invoke("gm:broadcast", payload),
  onPlayersUpdate: (cb: (players: Player[]) => void) => {
    const handler = (_e: IpcRendererEvent, players: Player[]) => cb(players);
    ipcRenderer.on("players:update", handler);
    return () => ipcRenderer.removeListener("players:update", handler);
  },
  getCredentials: () => ipcRenderer.invoke("credentials:getAll"),
  addCredential: (nickname: string, code?: string) =>
    ipcRenderer.invoke("credentials:add", nickname, code),
  onCredentialsUpdate: (cb: (credentials: PlayerCredential[]) => void) => {
    const handler = (_e: IpcRendererEvent, credentials: PlayerCredential[]) =>
      cb(credentials);
    ipcRenderer.on("credentials:update", handler);
    return () => ipcRenderer.removeListener("credentials:update", handler);
  },
  characters: {
    getAll: () => ipcRenderer.invoke("characters:getAll"),
    get: (id: string) => ipcRenderer.invoke("characters:get", id),
    create: (data: Partial<Character>) => ipcRenderer.invoke("characters:create", data),
    update: (id: string, character: Character) =>
      ipcRenderer.invoke("characters:update", id, character),
    delete: (id: string) => ipcRenderer.invoke("characters:delete", id),
  },
  onCharactersChanged: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on("characters:changed", handler);
    return () => ipcRenderer.removeListener("characters:changed", handler);
  },
  onCharacterUpdated: (cb: (character: Character) => void) => {
    const handler = (_e: IpcRendererEvent, character: Character) => cb(character);
    ipcRenderer.on("character:updated", handler);
    return () => ipcRenderer.removeListener("character:updated", handler);
  },
  getCombat: () => ipcRenderer.invoke("combat:get"),
  setCombat: (combat: CombatState | null) => ipcRenderer.invoke("combat:set", combat),
  onCombatUpdate: (cb: (combat: CombatState | null) => void) => {
    const handler = (_e: IpcRendererEvent, combat: CombatState | null) => cb(combat);
    ipcRenderer.on("combat:update", handler);
    return () => ipcRenderer.removeListener("combat:update", handler);
  },
  requestSkillCheck: (request: SkillCheckRequest) =>
    ipcRenderer.invoke("skill-check:request", request),
  resolveSkillCheck: (result: SkillCheckResolved) =>
    ipcRenderer.invoke("skill-check:resolve", result),
  cancelSkillCheck: (characterId: string, skillCheckId: string) =>
    ipcRenderer.invoke("skill-check:cancel", characterId, skillCheckId),
  onSkillCheckRequest: (cb: (request: SkillCheckRequest) => void) => {
    const handler = (_e: IpcRendererEvent, request: SkillCheckRequest) => cb(request);
    ipcRenderer.on("skill-check:request", handler);
    return () => ipcRenderer.removeListener("skill-check:request", handler);
  },
  onSkillCheckResolved: (cb: (result: SkillCheckResolved) => void) => {
    const handler = (_e: IpcRendererEvent, result: SkillCheckResolved) => cb(result);
    ipcRenderer.on("skill-check:resolved", handler);
    return () => ipcRenderer.removeListener("skill-check:resolved", handler);
  },
};

contextBridge.exposeInMainWorld("api", api);
