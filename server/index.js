import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  initStorage,
  listCharacters,
  getCharacter,
  saveCharacter,
  createCharacter,
  deleteCharacter,
  loginPlayer,
  getPlayerByToken,
  validatePlayerToken,
} from './storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3456;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  // In dev, phones connect via LAN IP (not localhost) — allow any origin.
  cors: { origin: isProd ? false : true, methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function getLocalAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        addresses.push(addr.address);
      }
    }
  }
  return addresses;
}

// --- REST API ---

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, port: PORT });
});

app.get('/api/host-info', (_req, res) => {
  const addresses = getLocalAddresses();
  res.json({
    port: PORT,
    urls: addresses.map((ip) => `http://${ip}:${PORT}`),
    localUrl: `http://localhost:${PORT}`,
  });
});

app.get('/api/characters', async (_req, res) => {
  const characters = await listCharacters();
  res.json(characters.map(({ id, name, type, nickname, race, occupation }) => ({
    id, name, type, nickname, race, occupation,
  })));
});

app.get('/api/characters/:id', async (req, res) => {
  const character = await getCharacter(req.params.id);
  if (!character) return res.status(404).json({ error: 'Not found' });
  res.json(character);
});

app.post('/api/characters', async (req, res) => {
  const character = await createCharacter(req.body);
  io.emit('characters-changed');
  res.status(201).json(character);
});

app.put('/api/characters/:id', async (req, res) => {
  const existing = await getCharacter(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const updated = await saveCharacter({ ...req.body, id: req.params.id });
  io.to(`character:${req.params.id}`).emit('character-updated', updated);
  io.emit('characters-changed');
  res.json(updated);
});

app.delete('/api/characters/:id', async (req, res) => {
  await deleteCharacter(req.params.id);
  io.emit('characters-changed');
  res.status(204).end();
});

app.post('/api/player/login', async (req, res) => {
  const result = await loginPlayer(req.body.nickname ?? '');
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/player/me', async (req, res) => {
  const token = req.headers['x-player-token'];
  if (!token) return res.status(401).json({ error: 'No token' });
  const character = await getPlayerByToken(token);
  if (!character) return res.status(401).json({ error: 'Invalid token' });
  res.json(character);
});

// --- Socket.io ---

io.on('connection', (socket) => {
  socket.on('join-character', async ({ characterId, playerToken, isDM }) => {
    if (isDM) {
      socket.join(`character:${characterId}`);
      socket.data.isDM = true;
      return;
    }
    if (!playerToken) return;
    const valid = await validatePlayerToken(playerToken, characterId);
    if (valid) {
      socket.join(`character:${characterId}`);
      socket.data.playerToken = playerToken;
    }
  });

  socket.on('update-character', async ({ characterId, character, playerToken, isDM }) => {
    if (isDM) {
      const updated = await saveCharacter({ ...character, id: characterId });
      io.to(`character:${characterId}`).emit('character-updated', updated);
      io.emit('characters-changed');
      return;
    }
    if (!playerToken) return;
    const valid = await validatePlayerToken(playerToken, characterId);
    if (!valid) return;
    // Players are view-only for now; DM edits only.
    return;
  });
});

// --- Static files (production) ---

if (isProd) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

await initStorage();

httpServer.listen(PORT, '0.0.0.0', () => {
  const addresses = getLocalAddresses();
  console.log('\n🐺 Witcher TRPG Sheet Helper');
  if (isProd) {
    console.log(`   Local:   http://localhost:${PORT}`);
    for (const ip of addresses) {
      console.log(`   Network: http://${ip}:${PORT}`);
    }
    console.log('   Players: open Network URL → /play');
  } else {
    console.log(`   API:     http://localhost:${PORT} (backend only)`);
    console.log(`   App:     run "npm run dev" — use the Vite Network URL (port 5173)`);
    for (const ip of addresses) {
      console.log(`   Phones:  http://${ip}:5173/play`);
    }
  }
  console.log('');
});
