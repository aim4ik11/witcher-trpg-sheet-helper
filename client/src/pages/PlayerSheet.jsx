import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPlayerCharacter } from '../api';
import { getPlayerToken, clearPlayerToken } from './PlayerLogin';
import { useSocket } from '../useSocket';
import CharacterSheet from '../components/CharacterSheet';

export default function PlayerSheet() {
  const [character, setCharacter] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const socket = useSocket();
  const token = getPlayerToken();

  const load = useCallback(async () => {
    if (!token) {
      navigate('/play');
      return;
    }
    try {
      const char = await fetchPlayerCharacter(token);
      setCharacter(char);
    } catch {
      clearPlayerToken();
      navigate('/play');
    }
  }, [token, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!character?.id || !token) return;

    function joinRoom() {
      socket.emit('join-character', {
        characterId: character.id,
        playerToken: token,
        isDM: false,
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
  }, [character?.id, token, socket]);

  function handleLogout() {
    clearPlayerToken();
    navigate('/play');
  }

  if (error) return <p>{error}</p>;
  if (!character) return <p className="loading-msg">Loading sheet...</p>;

  return (
    <CharacterSheet
      character={character}
      isDM={false}
      onBack={handleLogout}
      backLabel="Logout"
    />
  );
}
