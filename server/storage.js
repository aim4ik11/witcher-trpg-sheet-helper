import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createEmptyCharacter, applyCalculatedVitals } from './characterSchema.js';

function normalizeCharacter(character) {
  const next = { ...character };
  if (!next.race) next.race = '';
  if (!next.occupation && next.profession) next.occupation = next.profession;
  if (!next.occupation) next.occupation = '';
  return next;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const CHARACTERS_DIR = path.join(DATA_DIR, 'characters');
const SESSION_FILE = path.join(DATA_DIR, 'session.json');

async function ensureDataDir() {
  await fs.mkdir(CHARACTERS_DIR, { recursive: true });
  try {
    await fs.access(SESSION_FILE);
  } catch {
    await fs.writeFile(
      SESSION_FILE,
      JSON.stringify({ playerTokens: {} }, null, 2)
    );
  }
}

export async function initStorage() {
  await ensureDataDir();
  const files = await fs.readdir(CHARACTERS_DIR);
  if (files.length === 0) {
    const sample = applyCalculatedVitals(
      createEmptyCharacter({
        id: uuidv4(),
        name: 'Geralt',
        type: 'player',
        nickname: 'geralt',
        race: 'Witcher',
        occupation: 'Witcher',
        attributes: { ref: 8, emp: 3, int: 5, dex: 7, will: 6, cra: 5, body: 8 },
      })
    );
    await saveCharacter(sample);
  }
}

async function readSession() {
  const raw = await fs.readFile(SESSION_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeSession(session) {
  await fs.writeFile(SESSION_FILE, JSON.stringify(session, null, 2));
}

export async function listCharacters() {
  const files = await fs.readdir(CHARACTERS_DIR);
  const characters = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(CHARACTERS_DIR, file), 'utf-8');
    characters.push(normalizeCharacter(JSON.parse(raw)));
  }
  return characters.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCharacter(id) {
  const filePath = path.join(CHARACTERS_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return normalizeCharacter(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveCharacter(character) {
  const updated = applyCalculatedVitals(normalizeCharacter(character));
  const filePath = path.join(CHARACTERS_DIR, `${updated.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
  return updated;
}

export async function createCharacter(data = {}) {
  const character = applyCalculatedVitals(
    createEmptyCharacter({
      id: uuidv4(),
      ...data,
    })
  );
  return saveCharacter(character);
}

export async function deleteCharacter(id) {
  const filePath = path.join(CHARACTERS_DIR, `${id}.json`);
  await fs.unlink(filePath);
  const session = await readSession();
  for (const [token, charId] of Object.entries(session.playerTokens)) {
    if (charId === id) delete session.playerTokens[token];
  }
  await writeSession(session);
}

export async function loginPlayer(nickname) {
  const normalized = nickname.trim().toLowerCase();
  if (!normalized) return { error: 'Nickname required' };

  const characters = await listCharacters();
  const character = characters.find(
    (c) => c.type === 'player' && c.nickname?.toLowerCase() === normalized
  );
  if (!character) {
    return { error: 'No character found for this nickname. Ask your DM to set one up.' };
  }

  const session = await readSession();
  let token = Object.entries(session.playerTokens).find(([, id]) => id === character.id)?.[0];
  if (!token) {
    token = uuidv4();
    session.playerTokens[token] = character.id;
    await writeSession(session);
  }

  return { token, characterId: character.id, name: character.name };
}

export async function getPlayerByToken(token) {
  const session = await readSession();
  const characterId = session.playerTokens[token];
  if (!characterId) return null;
  return getCharacter(characterId);
}

export async function validatePlayerToken(token, characterId) {
  const session = await readSession();
  return session.playerTokens[token] === characterId;
}
