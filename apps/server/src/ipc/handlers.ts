import type { Character, HostToServer } from '@wilmak/shared';
import { state } from '../store';
import { notifyHost, makeCharacter } from '../utils';
import { start } from '../server';

export function handleGmMessage(msg: HostToServer): void {
  switch (msg.type) {
    case 'start':
      start(msg.config);
      break;
    case 'gm:kick':
      state.io?.sockets.sockets.get(msg.socketId)?.disconnect(true);
      break;
    case 'gm:broadcast':
      state.io?.emit('game:event', { from: 'GM', payload: msg.payload });
      break;
    case 'stop':
      state.httpServer?.close();
      process.exit(0);

    case 'characters:getAll':
      notifyHost({ type: 'characters:result', requestId: msg.requestId, data: [...state.characters.values()] });
      break;
    case 'characters:get': {
      const char = state.characters.get(msg.id);
      if (!char) {
        notifyHost({ type: 'characters:error', requestId: msg.requestId, message: 'Not found' });
      } else {
        notifyHost({ type: 'characters:result', requestId: msg.requestId, data: char });
      }
      break;
    }
    case 'characters:create': {
      const char = makeCharacter(msg.data as Partial<Character> & { type: Character['type']; name: string });
      state.characters.set(char.id, char);
      state.io?.emit('characters-changed');
      notifyHost({ type: 'characters:result', requestId: msg.requestId, data: char });
      notifyHost({ type: 'characters:changed' });
      break;
    }
    case 'characters:update': {
      const existing = state.characters.get(msg.id);
      if (!existing) {
        notifyHost({ type: 'characters:error', requestId: msg.requestId, message: 'Not found' });
        break;
      }
      const updated: Character = { ...existing, ...msg.character, id: msg.id };
      state.characters.set(msg.id, updated);
      state.io?.to(`character:${msg.id}`).emit('character-updated', updated);
      notifyHost({ type: 'characters:result', requestId: msg.requestId, data: updated });
      break;
    }
    case 'characters:delete':
      state.characters.delete(msg.id);
      state.io?.emit('characters-changed');
      notifyHost({ type: 'characters:result', requestId: msg.requestId, data: null });
      notifyHost({ type: 'characters:changed' });
      break;
  }
}
