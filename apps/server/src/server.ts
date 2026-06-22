import { createServer } from 'node:http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import type { SessionConfig } from '@wilmak/shared';
import { state } from './store';
import { lanUrls, notifyHost } from './utils';
import charactersRouter from './routes/characters';
import playerRouter from './routes/player';
import { registerSocketHandlers } from './socket/handlers';

const forked = !!process.parentPort;

export function start(cfg: Partial<SessionConfig>): void {
  state.config = { sessionName: '', port: 4317, players: [], playerWebDir: null, ...cfg };

  const app = express();
  app.use(express.json());
  if (state.config.playerWebDir) app.use(express.static(state.config.playerWebDir));

  app.get('/api/host-info', (_req, res) => {
    res.json({ urls: lanUrls(state.config.port) });
  });
  app.use('/api/characters', charactersRouter);
  app.use('/api/player', playerRouter);

  state.httpServer = createServer(app);
  state.io = new SocketServer(state.httpServer, { cors: { origin: true } });

  registerSocketHandlers(state.io);

  state.httpServer.listen(state.config.port, () => {
    notifyHost({ type: 'ready', port: state.config.port, urls: lanUrls(state.config.port) });
    if (!forked) console.log('[server] listening on', lanUrls(state.config.port).join(', '));
  });
}
