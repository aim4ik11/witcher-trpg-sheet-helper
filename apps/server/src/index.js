// Standalone server module.
//   LOCAL mode  : forked by Electron via utilityProcess (process.parentPort exists).
//   REMOTE mode : run with plain `node` on a VPS (variant 2) — configured via env.
// The Electron main process is the ONLY privileged channel: GM commands arrive
// here over parentPort, never over the public socket.

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createServer } from 'node:http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';

const forked = !!process.parentPort; // true when launched by Electron
let io;
let httpServer;
let config = { port: 4317, players: [], playerWebDir: null };
const connected = new Map(); // socketId -> { nickname }

function notifyHost(msg) {
  if (forked) process.parentPort.postMessage(msg);
}

function lanUrls(port) {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(`http://${ni.address}:${port}`);
    }
  }
  return out.length ? out : [`http://localhost:${port}`];
}

function pushRoster() {
  const players = [...connected.entries()].map(([socketId, v]) => ({ socketId, nickname: v.nickname }));
  notifyHost({ type: 'players', players }); // -> GM (via Electron main)
  io?.emit('players:update', players);       // -> players' lobby view
}

function start(cfg) {
  config = { port: 4317, players: [], playerWebDir: null, ...cfg };

  const app = express();
  if (config.playerWebDir) app.use(express.static(config.playerWebDir)); // same-origin SPA -> no CORS

  httpServer = createServer(app);
  console.log('tested');
  io = new SocketServer(httpServer, { cors: { origin: true } }); // origin:true matters only in dev

  io.on('connection', (socket) => {
    // Unauthenticated guest until it joins.
    socket.on('join', ({ nickname, code }, ack) => {
      const allowed = config.players.find(
        (p) => p.nickname === nickname && String(p.code) === String(code),
      );
      if (!allowed) return ack?.({ ok: false, error: 'Невірний нікнейм або код' });
      if ([...connected.values()].some((v) => v.nickname === nickname)) {
        return ack?.({ ok: false, error: 'Цей нікнейм уже в лобі' });
      }
      connected.set(socket.id, { nickname });
      socket.data.nickname = nickname;
      ack?.({ ok: true, nickname });
      pushRoster();
    });

    socket.on('player:action', (payload) => {
      if (!socket.data.nickname) return; // server-side authorization on every action
      io.emit('game:event', { from: socket.data.nickname, payload });
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

function handleGmMessage(msg) {
  switch (msg.type) {
    case 'start':
      start(msg.config);
      break;
    case 'gm:kick':
      io?.sockets?.sockets?.get(msg.socketId)?.disconnect(true);
      break;
    case 'gm:broadcast':
      io?.emit('game:event', { from: 'GM', payload: msg.payload });
      break;
    case 'stop':
      httpServer?.close();
      process.exit(0);
      break;
  }
}

if (forked) {
  // LOCAL: wait for the Electron main process to send config + commands.
  process.parentPort.on('message', (e) => handleGmMessage(e.data));
} else {
  // REMOTE: configure from env / session file and start immediately.
  const sessionFile = process.env.SESSION_FILE;
  const fileCfg = sessionFile ? JSON.parse(fs.readFileSync(sessionFile, 'utf-8')) : {};
  start({
    port: Number(process.env.PORT) || fileCfg.port || 4317,
    players: fileCfg.players || [],
    playerWebDir: process.env.PLAYER_WEB_DIR || null,
  });
}
