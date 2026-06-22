import { Router } from 'express';
import type { Character } from '@wilmak/shared';
import { state } from '../store';
import { makeCharacter } from '../utils';

const router = Router();

router.get('/', (_req, res) => {
  res.json([...state.characters.values()]);
});

router.post('/', (req, res) => {
  const char = makeCharacter(
    req.body as Partial<Character> & { type: Character['type']; name: string },
  );
  state.characters.set(char.id, char);
  state.io?.emit('characters-changed');
  res.json(char);
});

router.get('/:id', (req, res) => {
  const char = state.characters.get(req.params.id);
  if (!char) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(char);
});

router.put('/:id', (req, res) => {
  const existing = state.characters.get(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
  const updated: Character = { ...existing, ...(req.body as Partial<Character>), id: req.params.id };
  state.characters.set(req.params.id, updated);
  state.io?.to(`character:${req.params.id}`).emit('character-updated', updated);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  state.characters.delete(req.params.id);
  state.io?.emit('characters-changed');
  res.json({ ok: true });
});

export default router;
