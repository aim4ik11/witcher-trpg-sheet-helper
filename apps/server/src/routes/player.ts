import { Router } from "express";
import type { Character } from "@wilmak/shared";
import { normalizeCharacter, validatePlayerProgression } from "@wilmak/game-data";
import { state } from "../store";
import { normalizeNickname } from "../utils";

const router = Router();

router.get("/me", (req, res) => {
  const token = req.headers["x-player-token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "No token" });
    return;
  }
  const nickname = state.playerTokens.get(token);
  if (!nickname) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const nick = normalizeNickname(nickname);
  const char = [...state.characters.values()].find(
    (c) => c.nickname && normalizeNickname(c.nickname) === nick,
  );
  if (!char) {
    res.status(404).json({ error: "No character for this player" });
    return;
  }
  res.json(char);
});

router.put("/me", (req, res) => {
  const token = req.headers["x-player-token"] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "No token" });
    return;
  }
  const nickname = state.playerTokens.get(token);
  if (!nickname) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const nick = normalizeNickname(nickname);
  const existing = [...state.characters.values()].find(
    (c) => c.nickname && normalizeNickname(c.nickname) === nick,
  );
  if (!existing) {
    res.status(404).json({ error: "No character for this player" });
    return;
  }

  const proposed = normalizeCharacter({
    ...existing,
    ...(req.body as Partial<Character>),
    id: existing.id,
  });

  const result = validatePlayerProgression(existing, proposed);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  const updated = normalizeCharacter(result.character as Character);
  state.characters.set(existing.id, updated);
  state.io?.to(`character:${existing.id}`).emit("character-updated", updated);
  res.json(updated);
});

export default router;
