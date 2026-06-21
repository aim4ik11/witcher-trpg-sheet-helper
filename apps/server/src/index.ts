// Standalone server module (dual-mode):
//   LOCAL  — forked by Electron via utilityProcess (process.parentPort exists);
//   REMOTE — `node dist/server.cjs` / `tsx src/index.ts` on a VPS (env config).
// The Electron main process is the ONLY privileged channel for GM commands.

import os from 'node:os';
import fs from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import type {
  SessionConfig,
  Player,
  HostToServer,
  ServerToHost,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@wilmak/shared';

// process.parentPort is present only under Electron's utilityProcess.
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
const connected = new Map<string, { nickname: string }>();

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
  const players: Player[] = [...connected.entries()].map(([socketId, v]) => ({ socketId, nickname: v.nickname }));
  notifyHost({ type: 'players', players });
  io?.emit('players:update', players);
}

function start(cfg: Partial<SessionConfig>): void {
  config = { sessionName: '', port: 4317, players: [], playerWebDir: null, ...cfg };

  const app = express();
  if (config.playerWebDir) app.use(express.static(config.playerWebDir)); // same-origin SPA -> no CORS

  httpServer = createServer(app);
  io = new SocketServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: true },
  });

  io.on('connection', (socket) => {
    socket.on('join', ({ nickname, code }, ack) => {
      const allowed = config.players.find((p) => p.nickname === nickname && String(p.code) === String(code));
      if (!allowed) return ack({ ok: false, error: 'Невірний нікнейм або код' });
      if ([...connected.values()].some((v) => v.nickname === nickname)) {
        return ack({ ok: false, error: 'Цей нікнейм уже в лобі' });
      }
      connected.set(socket.id, { nickname });
      socket.data.nickname = nickname;
      ack({ ok: true, nickname });
      pushRoster();
    });

    socket.on('player:action', (payload) => {
      if (!socket.data.nickname) return; // server-side authorization on every action
      io?.emit('game:event', { from: socket.data.nickname, payload });
    });

    socket.on('disconnect', () => {
      if (connected.delete(socket.id)) pushRoster();
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
    port: Number(process.env.PORT) || fileCfg.port || 4317,
    players: fileCfg.players ?? [],
    playerWebDir: process.env.PLAYER_WEB_DIR ?? null,
  });
}
