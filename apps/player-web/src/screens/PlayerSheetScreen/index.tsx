import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Character } from '@wilmak/shared';
import { fetchPlayerCharacter, getToken, clearToken } from '../../api';
import CharacterSheet from '../../components/CharacterSheet';

export default function PlayerSheetScreen() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) { navigate('/'); return; }
    try {
      const char = await fetchPlayerCharacter(token);
      setCharacter(char);
    } catch {
      clearToken();
      navigate('/');
    }
  }, [token, navigate]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!character?.id || !token) return;
    const socket = io({ path: '/socket.io', autoConnect: true });

    const joinRoom = () => socket.emit('join-character', { characterId: character.id });
    const onUpdate = (updated: Character) => { if (updated.id === character.id) setCharacter(updated); };

    socket.on('connect', joinRoom);
    socket.on('character-updated', onUpdate);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('character-updated', onUpdate);
      socket.disconnect();
    };
  }, [character?.id, token]);

  function handleLogout() { clearToken(); navigate('/'); }

  if (error) return <p style={{ padding: '2rem', color: '#b44' }}>{error}</p>;
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
