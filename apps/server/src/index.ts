// Standalone server module (dual-mode):
//   LOCAL  — forked by Electron via utilityProcess (process.parentPort exists);
//   REMOTE — `node dist/server.cjs` / `tsx src/index.ts` on a VPS (env config).

import os from 'node:os';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createServer, type Server as HttpServer } from 'node:http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import type {
  SessionConfig,
  Player,
  Character,
  HostToServer,
  ServerToHost,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@wilmak/shared';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Process {
      parentPort?: {
        postMessage(message: unknown): void;
        on(event: 'message', listener: (e: { data: HostToServer }) => void): void;
      };
    }
  }
}

type Io = SocketServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const forked = !!process.parentPort;
let io: Io | undefined;
let httpServer: HttpServer | undefined;
let config: SessionConfig = { sessionName: '', port: 4317, players: [], playerWebDir: null };

const connected     = new Map<string, { nickname: string }>();
const characters    = new Map<string, Character>();
const playerTokens  = new Map<string, string>(); // token → nickname

function notifyHost(msg: ServerToHost): void {
  process.parentPort?.postMessage(msg);
}

function lanUrls(port: number): string[] {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(`http://${ni.address}:${port}`);
    }
  }
  return out.length ? out : [`http://localhost:${port}`];
}

function pushRoster(): void {
  const players: Player[] = [...connected.entries()].map(([socketId, v]) => ({
    socketId,
    nickname: v.nickname,
  }));
  notifyHost({ type: 'players', players });
  io?.emit('players:update', players);
}

function makeCharacter(init: Partial<Character> & { type: Character['type']; name: string }): Character {
  const id = randomUUID();
  const defaults: Character = {
    id,
    type:              init.type,
    name:              init.name,
    race:              '',
    occupation:        '',
    nickname:          '',
    attributes:        { ref: 1, emp: 1, int: 1, dex: 1, will: 1, cra: 1, body: 1 },
    skills:            {},
    vitals: {
      hp:      { current: 0, max: 0 },
      sta:     { current: 0, max: 0 },
      resolve: { current: 0, max: 0 },
      woundThreshold: 0,
    },
    luck:               { max: 5, used: 0 },
    speed:              0,
    adrenaline:         0,
    movement:           { run: 0, leap: 0 },
    recovery:           { stun: 0, rec: 0 },
    improvementPoints:  { ip: 0, trainingIp: 0 },
    weapons:            [],
    armor: [
      { slot: 'head',  name: '', sp: 0, damage: 0, effects: '', weight: 0 },
      { slot: 'torso', name: '', sp: 0, damage: 0, effects: '', weight: 0 },
      { slot: 'rArm',  name: '', sp: 0, damage: 0, effects: '', weight: 0 },
      { slot: 'lArm',  name: '', sp: 0, damage: 0, effects: '', weight: 0 },
      { slot: 'rLeg',  name: '', sp: 0, damage: 0, effects: '', weight: 0 },
      { slot: 'lLeg',  name: '', sp: 0, damage: 0, effects: '', weight: 0 },
    ],
    armorNotes:          '',
    bonusMelee:          { punch: '', kick: '' },
    consumables:         [],
    spells:              [],
    professionAbilities: [],
    wounds:              [],
    statusEffects:       [],
  };
  return { ...defaults, ...init, id };
}

function start(cfg: Partial<SessionConfig>): void {
  config = { sessionName: '', port: 4317, players: [], playerWebDir: null, ...cfg };

  const app = express();
  app.use(express.json());
  if (config.playerWebDir) app.use(express.static(config.playerWebDir));

  // ── REST API ─────────────────────────────────────────────────────────────

  app.get('/api/host-info', (_req, res) => {
    res.json({ urls: lanUrls(config.port) });
  });

  app.get('/api/characters', (_req, res) => {
    res.json([...characters.values()]);
  });

  app.post('/api/characters', (req, res) => {
    const char = makeCharacter(req.body as Partial<Character> & { type: Character['type']; name: string });
    characters.set(char.id, char);
    io?.emit('characters-changed');
    res.json(char);
  });

  app.get('/api/characters/:id', (req, res) => {
    const char = characters.get(req.params.id);
    if (!char) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(char);
  });

  app.put('/api/characters/:id', (req, res) => {
    const existing = characters.get(req.params.id);
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    const updated: Character = { ...existing, ...(req.body as Partial<Character>), id: req.params.id };
    characters.set(req.params.id, updated);
    io?.to(`character:${req.params.id}`).emit('character-updated', updated);
    res.json(updated);
  });

  app.delete('/api/characters/:id', (req, res) => {
    characters.delete(req.params.id);
    io?.emit('characters-changed');
    res.json({ ok: true });
  });

  app.get('/api/player/me', (req, res) => {
    const token = req.headers['x-player-token'] as string | undefined;
    if (!token) { res.status(401).json({ error: 'No token' }); return; }
    const nickname = playerTokens.get(token);
    if (!nickname) { res.status(401).json({ error: 'Invalid token' }); return; }
    const char = [...characters.values()].find((c) => c.nickname === nickname);
    if (!char) { res.status(404).json({ error: 'No character for this player' }); return; }
    res.json(char);
  });

  // ── Socket.IO ─────────────────────────────────────────────────────────────

  httpServer = createServer(app);
  io = new SocketServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    httpServer,
    { cors: { origin: true } },
  );

  io.on('connection', (socket) => {
    socket.on('join', ({ nickname, code }, ack) => {
      const allowed = config.players.find(
        (p) => p.nickname === nickname && String(p.code) === String(code),
      );
      if (!allowed) return ack({ ok: false, error: 'Невірний нікнейм або код' });
      if ([...connected.values()].some((v) => v.nickname === nickname)) {
        return ack({ ok: false, error: 'Цей нікнейм уже в лобі' });
      }
      const token = randomUUID();
      connected.set(socket.id, { nickname });
      socket.data.nickname = nickname;
      socket.data.token    = token;
      playerTokens.set(token, nickname);
      ack({ ok: true, nickname, token });
      pushRoster();
    });

    socket.on('join-character', ({ characterId }) => {
      void socket.join(`character:${characterId}`);
    });

    socket.on('update-character', ({ characterId, character }) => {
      const existing = characters.get(characterId);
      if (!existing) return;
      const updated: Character = { ...existing, ...character, id: characterId };
      characters.set(characterId, updated);
      socket.to(`character:${characterId}`).emit('character-updated', updated);
    });

    socket.on('player:action', (payload) => {
      if (!socket.data.nickname) return;
      io?.emit('game:event', { from: socket.data.nickname, payload });
    });

    socket.on('disconnect', () => {
      if (connected.delete(socket.id)) pushRoster();
      if (socket.data.token) playerTokens.delete(socket.data.token);
    });
  });

  httpServer.listen(config.port, () => {
    notifyHost({ type: 'ready', port: config.port, urls: lanUrls(config.port) });
    if (!forked) console.log('[server] listening on', lanUrls(config.port).join(', '));
  });
}

function handleGmMessage(msg: HostToServer): void {
  switch (msg.type) {
    case 'start':
      start(msg.config);
      break;
    case 'gm:kick':
      io?.sockets.sockets.get(msg.socketId)?.disconnect(true);
      break;
    case 'gm:broadcast':
      io?.emit('game:event', { from: 'GM', payload: msg.payload });
      break;
    case 'stop':
      httpServer?.close();
      process.exit(0);
  }
}

if (forked) {
  process.parentPort!.on('message', (e) => handleGmMessage(e.data));
} else {
  const sessionFile = process.env.SESSION_FILE;
  const fileCfg: Partial<SessionConfig> = sessionFile
    ? (JSON.parse(fs.readFileSync(sessionFile, 'utf-8')) as Partial<SessionConfig>)
    : {};
  start({
    sessionName: fileCfg.sessionName ?? '',
    port:        Number(process.env.PORT) || fileCfg.port || 4317,
    players:     fileCfg.players ?? [],
    playerWebDir: process.env.PLAYER_WEB_DIR ?? null,
  });
}
