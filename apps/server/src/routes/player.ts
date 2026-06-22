import { Router } from 'express';
import { state } from '../store';

const router = Router();

router.get('/me', (req, res) => {
  const token = req.headers['x-player-token'] as string | undefined;
  if (!token) { res.status(401).json({ error: 'No token' }); return; }
  const nickname = state.playerTokens.get(token);
  if (!nickname) { res.status(401).json({ error: 'Invalid token' }); return; }
  const char = [...state.characters.values()].find((c) => c.nickname === nickname);
  if (!char) { res.status(404).json({ error: 'No character for this player' }); return; }
  res.json(char);
});

export default router;
