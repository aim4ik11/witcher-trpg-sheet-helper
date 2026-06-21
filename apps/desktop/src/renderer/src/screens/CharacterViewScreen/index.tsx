import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Character } from '@wilmak/shared';
import { api } from '../../api';
import { useSocket } from '../../useSocket';
import { useAppStore } from '../../store';
import CharacterSheet from '../../components/CharacterSheet';

export default function CharacterViewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const server = useAppStore((s) => s.server);
  const socket = useSocket(server?.port);
  const [character, setCharacter] = useState<Character | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const char = await api.getCharacter(id);
      setCharacter(char);
    } catch {
      navigate('/session');
    }
  }, [id, navigate]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!character?.id || !socket) return;
    const joinRoom = () => socket.emit('join-character', { characterId: character.id, isDM: true });
    const onUpdate = (updated: Character) => { if (updated.id === character.id) setCharacter(updated); };
    joinRoom();
    socket.on('connect', joinRoom);
    socket.on('character-updated', onUpdate);
    return () => { socket.off('connect', joinRoom); socket.off('character-updated', onUpdate); };
  }, [character?.id, socket]);

  async function handleChange(updated: Character) {
    setCharacter(updated);
    await api.updateCharacter(updated.id, updated);
    socket?.emit('update-character', { characterId: updated.id, character: updated });
  }

  if (!character) return <p className="loading-msg">Loading...</p>;

  return (
    <CharacterSheet
      character={character}
      onChange={handleChange}
      isDM
      onBack={() => navigate('/session')}
      backLabel="← DM Console"
    />
  );
}
