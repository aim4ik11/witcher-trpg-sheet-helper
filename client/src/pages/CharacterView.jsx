import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCharacter } from '../api';
import { useSocket } from '../useSocket';
import CharacterSheet from '../components/CharacterSheet';

export default function CharacterView() {
  const { id } = useParams();
  const [character, setCharacter] = useState(null);
  const navigate = useNavigate();
  const socket = useSocket();

  const load = useCallback(async () => {
    try {
      const char = await fetchCharacter(id);
      setCharacter(char);
    } catch {
      navigate('/dm');
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!character?.id) return;

    function joinRoom() {
      socket.emit('join-character', {
        characterId: character.id,
        isDM: true,
      });
    }

    function onUpdate(updated) {
      if (updated.id === character.id) setCharacter(updated);
    }

    joinRoom();
    socket.on('connect', joinRoom);
    socket.on('character-updated', onUpdate);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('character-updated', onUpdate);
    };
  }, [character?.id, socket]);

  function handleChange(updated) {
    setCharacter(updated);
    socket.emit('update-character', {
      characterId: updated.id,
      character: updated,
      isDM: true,
    });
  }

  if (!character) return <p className="loading-msg">Loading...</p>;

  return (
    <CharacterSheet
      character={character}
      onChange={handleChange}
      isDM={true}
      onBack={() => navigate('/dm')}
      backLabel="← DM Console"
    />
  );
}
