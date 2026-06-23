import { randomUUID } from 'node:crypto';
import type { Character, ResumeAck, ClientToServerEvents, ServerToClientEvents, SocketData } from '@wilmak/shared';
import type { Socket } from 'socket.io';
import type { Io } from '../store';
import { state } from '../store';
import { pushRoster, notifyHost, normalizeNickname } from '../utils';

type PlayerSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

function registerPlayer(socket: PlayerSocket, nick: string, token: string): void {
  state.connected.set(socket.id, { nickname: nick });
  socket.data.nickname = nick;
  socket.data.token = token;
  state.playerTokens.set(token, nick);
}

function clearTokensForNickname(nick: string): void {
  for (const [token, nickname] of state.playerTokens.entries()) {
    if (nickname === nick) state.playerTokens.delete(token);
  }
}

export function registerSocketHandlers(io: Io): void {
  io.on('connection', (socket) => {
    socket.on('join', ({ nickname, code }, ack) => {
      const nick = normalizeNickname(nickname);
      const allowed = state.config.players.find(
        (p) => p.nickname === nick && String(p.code) === String(code),
      );
      if (!allowed) {
        return ack({ ok: false, error: 'Невірний нікнейм або код' });
      }
      const isConnected = [...state.connected.values()].some((v) => v.nickname === nick);
      if (isConnected) {
        return ack({ ok: false, error: 'Цей нікнейм уже в лобі' });
      }
      const token = randomUUID();
      clearTokensForNickname(nick);
      registerPlayer(socket, nick, token);
      ack({ ok: true, nickname: nick, token });
      pushRoster();
    });

    socket.on('resume', ({ token }, ack: (res: ResumeAck) => void) => {
      const nick = state.playerTokens.get(token);
      if (!nick) {
        return ack({ ok: false, error: 'Сесія закінчилась' });
      }
      // Replace stale socket for this player if they reconnected (e.g. page refresh).
      for (const [socketId, v] of state.connected.entries()) {
        if (v.nickname === nick && socketId !== socket.id) {
          state.connected.delete(socketId);
          const old = io.sockets.sockets.get(socketId);
          old?.disconnect(true);
        }
      }
      registerPlayer(socket, nick, token);
      ack({ ok: true, nickname: nick });
      pushRoster();
    });

    socket.on('join-character', ({ characterId }) => {
      void socket.join(`character:${characterId}`);
    });

    socket.on('update-character', ({ characterId, character }) => {
      const existing = state.characters.get(characterId);
      if (!existing) {
        return;
      }
      const updated: Character = { ...existing, ...character, id: characterId };
      state.characters.set(characterId, updated);
      socket.to(`character:${characterId}`).emit('character-updated', updated);
      notifyHost({ type: 'character:updated', character: updated });
    });

    socket.on('player:action', (payload) => {
      if (!socket.data.nickname) {
        return;
      }
      io.emit('game:event', { from: socket.data.nickname, payload });
    });

    socket.on('disconnect', () => {
      if (state.connected.delete(socket.id)) {
        pushRoster();
      }
      // Keep playerTokens so HTTP API and resume still work after reconnect.
    });
  });
}

export function revokePlayer(socketId: string): void {
  const sock = state.io?.sockets.sockets.get(socketId);
  const nick = sock?.data.nickname ?? state.connected.get(socketId)?.nickname;
  if (nick) clearTokensForNickname(nick);
  sock?.disconnect(true);
  if (state.connected.delete(socketId)) {
    pushRoster();
  }
}
