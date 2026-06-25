import type { Character, HostToServer, CombatState } from "@wilmak/shared";
import { state } from "../store";
import {
  notifyHost,
  makeCharacter,
  ensureCredential,
  normalizeNickname,
} from "../utils";
import { normalizeCharacter, normalizeCombatState } from "@wilmak/game-data";
import { revokePlayer } from "../socket/handlers";
import { start } from "../server";

export function handleGmMessage(msg: HostToServer): void {
  switch (msg.type) {
    case "start":
      start(msg.config);
      break;
    case "gm:kick":
      revokePlayer(msg.socketId);
      break;
    case "gm:broadcast":
      state.io?.emit("game:event", { from: "GM", payload: msg.payload });
      break;
    case "stop":
      state.httpServer?.close();
      process.exit(0);

    case "characters:getAll": {
      const all = [...state.characters.values()].map((c) => {
        const normalized = normalizeCharacter(c);
        state.characters.set(c.id, normalized);
        return normalized;
      });
      notifyHost({ type: "characters:result", requestId: msg.requestId, data: all });
      break;
    }
    case "characters:get": {
      const char = state.characters.get(msg.id);
      if (!char) {
        notifyHost({
          type: "characters:error",
          requestId: msg.requestId,
          message: "Not found",
        });
        break;
      }
      const normalized = normalizeCharacter(char);
      state.characters.set(msg.id, normalized);
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: normalized,
      });
      break;
    }
    case "characters:create": {
      const char = makeCharacter(
        msg.data as Partial<Character> & { type: Character["type"]; name: string },
      );
      if (char.type === "player" && char.nickname) {
        char.nickname = normalizeNickname(char.nickname);
        ensureCredential(char.nickname);
      }
      state.characters.set(char.id, char);
      state.io?.emit("characters-changed");
      notifyHost({ type: "characters:result", requestId: msg.requestId, data: char });
      notifyHost({ type: "characters:changed" });
      break;
    }
    case "characters:update": {
      const existing = state.characters.get(msg.id);
      if (!existing) {
        notifyHost({
          type: "characters:error",
          requestId: msg.requestId,
          message: "Not found",
        });
        break;
      }
      const updated: Character = normalizeCharacter({
        ...existing,
        ...msg.character,
        id: msg.id,
      });
      if (updated.type === "player" && updated.nickname) {
        updated.nickname = normalizeNickname(updated.nickname);
        ensureCredential(updated.nickname);
      }
      state.characters.set(msg.id, updated);
      state.io?.to(`character:${msg.id}`).emit("character-updated", updated);
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: updated,
      });
      break;
    }
    case "characters:delete":
      state.characters.delete(msg.id);
      state.io?.emit("characters-changed");
      notifyHost({ type: "characters:result", requestId: msg.requestId, data: null });
      notifyHost({ type: "characters:changed" });
      break;
    case "credentials:getAll":
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: [...state.config.players],
      });
      break;
    case "credentials:add": {
      const cred = ensureCredential(msg.nickname, msg.code);
      notifyHost({ type: "characters:result", requestId: msg.requestId, data: cred });
      break;
    }
    case "combat:get":
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: state.combat ? normalizeCombatState(state.combat) : null,
      });
      break;
    case "combat:set": {
      state.combat = msg.combat ? normalizeCombatState(msg.combat) : null;
      state.io?.emit("combat:update", msg.combat);
      notifyHost({ type: "combat:updated", combat: msg.combat });
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: msg.combat,
      });
      break;
    }
    case "skill-check:request": {
      state.io
        ?.to(`character:${msg.data.characterId}`)
        .emit("skill-check:request", msg.data);
      notifyHost({ type: "skill-check:requested", request: msg.data });
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: msg.data,
      });
      break;
    }
    case "skill-check:resolve": {
      state.io
        ?.to(`character:${msg.data.characterId}`)
        .emit("skill-check:resolved", msg.data);
      notifyHost({ type: "skill-check:resolved", result: msg.data });
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: msg.data,
      });
      break;
    }
    case "skill-check:cancel": {
      state.io
        ?.to(`character:${msg.characterId}`)
        .emit("skill-check:cancel", msg.skillCheckId);
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: null,
      });
      break;
    }
    case "magic-cast:request": {
      state.io
        ?.to(`character:${msg.data.characterId}`)
        .emit("magic-cast:request", msg.data);
      notifyHost({ type: "magic-cast:requested", request: msg.data });
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: msg.data,
      });
      break;
    }
    case "magic-cast:resolve": {
      state.io
        ?.to(`character:${msg.data.characterId}`)
        .emit("magic-cast:resolved", msg.data);
      notifyHost({ type: "magic-cast:resolved", result: msg.data });
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: msg.data,
      });
      break;
    }
    case "magic-cast:cancel": {
      state.io
        ?.to(`character:${msg.characterId}`)
        .emit("magic-cast:cancel", msg.magicCastId);
      notifyHost({
        type: "characters:result",
        requestId: msg.requestId,
        data: null,
      });
      break;
    }
  }
}
