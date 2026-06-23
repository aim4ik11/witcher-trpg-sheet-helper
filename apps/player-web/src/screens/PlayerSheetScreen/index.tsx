import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Character } from '@wilmak/shared';
import { fetchPlayerCharacter, getToken, clearToken } from '../../api';
import { disconnectPlayerSocket, getPlayerSocket, watchSessionResume } from '../../socket';
import CharacterSheet from '../../components/CharacterSheet';

export default function PlayerSheetScreen() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [waitingForSheet, setWaitingForSheet] = useState(false);
  const navigate = useNavigate();
  const token = getToken();

  const invalidateSession = useCallback(() => {
    clearToken();
    disconnectPlayerSocket();
    navigate('/');
  }, [navigate]);

  const load = useCallback(async () => {
    if (!token) { navigate('/'); return; }
    try {
      const char = await fetchPlayerCharacter(token);
      setCharacter(char);
      setWaitingForSheet(false);
    } catch (err) {
      if (err instanceof Error && err.message === 'no-character') {
        setWaitingForSheet(true);
        return;
      }
      invalidateSession();
    }
  }, [token, navigate, invalidateSession]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!token) return;

    const joinCharacterRoom = () => {
      if (character?.id) {
        getPlayerSocket().emit('join-character', { characterId: character.id });
      }
    };

    const stopResume = watchSessionResume(
      token,
      joinCharacterRoom,
      invalidateSession,
    );

    const socket = getPlayerSocket();
    const onUpdate = (updated: Character) => {
      if (updated.id === character?.id) setCharacter(updated);
    };
    socket.on('character-updated', onUpdate);

    return () => {
      stopResume();
      socket.off('character-updated', onUpdate);
    };
  }, [token, character?.id, invalidateSession]);

  function handleLogout() {
    clearToken();
    disconnectPlayerSocket();
    navigate('/');
  }

  if (waitingForSheet) {
    return (
      <div className="player-login">
        <div className="login-card panel">
          <div className="medallion-sm">🐺</div>
          <h1>Logged in</h1>
          <p className="login-hint">
            Your DM has not created a character sheet for your nickname yet. Ask them to add one with the same login nickname.
          </p>
          <button type="button" className="primary" onClick={() => void load()}>Check again</button>
          <button type="button" style={{ marginTop: '0.5rem' }} onClick={handleLogout}>Logout</button>
        </div>
      </div>
    );
  }

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
