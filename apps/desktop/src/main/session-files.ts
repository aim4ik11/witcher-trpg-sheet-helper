import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { normalizeNickname, type Character, type SessionConfig } from '@wilmak/shared';

const EXAMPLE_SESSION = 'example-session.json';
const isDev = !!process.env.ELECTRON_RENDERER_URL;

let activeSessionFile: string | null = null;

export function sessionsDir(): string {
  const dir = isDev
    ? path.join(__dirname, '../../../../sessions')
    : path.join(app.getPath('userData'), 'sessions');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getActiveSessionFile(): string | null {
  return activeSessionFile;
}

function isValidCharacter(value: unknown): value is Character {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Character;
  return typeof c.id === 'string'
    && (c.type === 'player' || c.type === 'enemy')
    && typeof c.name === 'string';
}

function normalizeCharacters(characters: unknown): Character[] {
  if (!Array.isArray(characters)) return [];
  return characters.filter(isValidCharacter);
}

export function normalizeSessionConfig(config: Partial<SessionConfig>): SessionConfig {
  const players = Array.isArray(config.players)
    ? config.players
      .filter((p) => typeof p?.nickname === 'string' && typeof p?.code === 'string')
      .map((p) => ({ ...p, nickname: normalizeNickname(p.nickname) }))
    : [];

  const normalized: SessionConfig = {
    sessionName: typeof config.sessionName === 'string' ? config.sessionName : '',
    port: typeof config.port === 'number' && Number.isFinite(config.port) ? config.port : 4317,
    players,
  };

  if (config.characters !== undefined) {
    normalized.characters = normalizeCharacters(config.characters);
  }

  return normalized;
}

function slugifySessionName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0400-\u04FF-]+/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function sessionBaseName(config: SessionConfig): string {
  const slug = slugifySessionName(config.sessionName);
  return slug || `session-${config.port}`;
}

export function sessionFilePath(config: SessionConfig): string {
  const dir = sessionsDir();
  const base = sessionBaseName(config);
  const defaultPath = path.join(dir, `${base}.json`);

  if (!fs.existsSync(defaultPath)) return defaultPath;

  try {
    const existing = normalizeSessionConfig(
      JSON.parse(fs.readFileSync(defaultPath, 'utf-8')) as Partial<SessionConfig>,
    );
    if (existing.sessionName === config.sessionName && existing.port === config.port) {
      return defaultPath;
    }
  } catch {
    // Fall through to port-suffixed name.
  }

  return path.join(dir, `${base}-${config.port}.json`);
}

function readRawSessionFile(filePath: string): Partial<SessionConfig> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Partial<SessionConfig>;
  } catch {
    return null;
  }
}

export function readSessionFromFile(filePath: string): SessionConfig | null {
  const raw = readRawSessionFile(filePath);
  if (!raw) return null;
  const normalized = normalizeSessionConfig(raw);
  return {
    ...normalized,
    characters: normalized.characters ?? normalizeCharacters(raw.characters),
  };
}

function listSessionFiles(): string[] {
  const dir = sessionsDir();
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json') && name !== EXAMPLE_SESSION)
    .map((name) => path.join(dir, name))
    .filter((filePath) => {
      try {
        return fs.statSync(filePath).isFile();
      } catch {
        return false;
      }
    });
}

export function loadMostRecentSession(): SessionConfig | null {
  const files = listSessionFiles();
  if (files.length === 0) return null;

  const newest = files.sort(
    (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs,
  )[0];

  const config = readSessionFromFile(newest);
  if (config) activeSessionFile = newest;
  return config;
}

export function loadActiveSession(): SessionConfig | null {
  if (activeSessionFile) return readSessionFromFile(activeSessionFile);
  return loadMostRecentSession();
}

export function saveSession(config: SessionConfig): SessionConfig {
  const normalized = normalizeSessionConfig(config);
  const target = sessionFilePath(normalized);
  const onDisk = readRawSessionFile(target);
  const characters = normalized.characters ?? normalizeCharacters(onDisk?.characters);
  const toSave: SessionConfig = { ...normalized, characters };
  const { sessionName, port, players } = toSave;

  fs.writeFileSync(
    target,
    JSON.stringify({ sessionName, port, players, characters }, null, 2),
    'utf-8',
  );
  activeSessionFile = target;
  return toSave;
}

export function migrateLegacyLastSession(): void {
  const legacy = path.join(app.getPath('userData'), 'last-session.json');
  if (!fs.existsSync(legacy)) return;

  try {
    const raw = JSON.parse(fs.readFileSync(legacy, 'utf-8')) as Partial<SessionConfig>;
    saveSession(normalizeSessionConfig(raw));
    fs.unlinkSync(legacy);
  } catch {
    // Keep legacy file if migration fails.
  }
}
