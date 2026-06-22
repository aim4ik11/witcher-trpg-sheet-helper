import { randomUUID } from 'node:crypto';
import type { Character } from '@wilmak/shared';
import type { Io } from '../store';
import { state } from '../store';
import { pushRoster, notifyHost } from '../utils';

export function registerSocketHandlers(io: Io): void {
  io.on('connection', (socket) => {
    socket.on('join', ({ nickname, code }, ack) => {
      const allowed = state.config.players.find(
        (p) => p.nickname === nickname && String(p.code) === String(code),
      );
      if (!allowed) return ack({ ok: false, error: 'Невірний нікнейм або код' });
      if ([...state.connected.values()].some((v) => v.nickname === nickname)) {
        return ack({ ok: false, error: 'Цей нікнейм уже в лобі' });
      }
      const token = randomUUID();
      state.connected.set(socket.id, { nickname });
      socket.data.nickname = nickname;
      socket.data.token    = token;
      state.playerTokens.set(token, nickname);
      ack({ ok: true, nickname, token });
      pushRoster();
    });

    socket.on('join-character', ({ characterId }) => {
      void socket.join(`character:${characterId}`);
    });

    socket.on('update-character', ({ characterId, character }) => {
      const existing = state.characters.get(characterId);
      if (!existing) return;
      const updated: Character = { ...existing, ...character, id: characterId };
      state.characters.set(characterId, updated);
      socket.to(`character:${characterId}`).emit('character-updated', updated);
      notifyHost({ type: 'character:updated', character: updated });
    });

    socket.on('player:action', (payload) => {
      if (!socket.data.nickname) return;
      io.emit('game:event', { from: socket.data.nickname, payload });
    });

    socket.on('disconnect', () => {
      if (state.connected.delete(socket.id)) pushRoster();
      if (socket.data.token) state.playerTokens.delete(socket.data.token);
    });
  });
}
