import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Character } from '@wilmak/shared';
import { api } from '../../api';
import { useSocket } from '../../useSocket';
import { useAppStore } from '../../store';
import CreateCharacterModal from '../../components/CreateCharacterModal';
import QrConnectModal from '../../components/QrConnectModal';
import './DMDashboard.css';

export default function DMDashboardScreen() {
  const navigate = useNavigate();
  const server = useAppStore((s) => s.server);
  const socket = useSocket(server?.port);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [createType, setCreateType] = useState<'player' | 'enemy' | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const playUrls = useMemo(() => {
    if (!server?.urls?.length) return [];
    return server.urls.map((u) => u.replace(/\/$/, '') + '/');
  }, [server]);

  const load = useCallback(async () => {
    if (!server?.port) return;
    const chars = await api.getCharacters();
    setCharacters(chars);
    setLoading(false);
  }, [server?.port]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on('characters-changed', () => void load());
    return () => { socket.off('characters-changed'); };
  }, [socket, load]);

  async function handleCreate(data: Partial<Character>) {
    await api.createCharacter(data);
    setCreateType(null);
    void load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.deleteCharacter(id);
    void load();
  }

  const players = characters.filter((c) => c.type === 'player');
  const enemies = characters.filter((c) => c.type === 'enemy');

  return (
    <div className="dm-dashboard">
      <header className="dm-header">
        <button className="ghost back-btn-sm" onClick={() => navigate('/local')}>← Back</button>
        <h1>DM Console</h1>
      </header>

      <section className="panel host-info">
        <div className="host-info-header">
          <div className="panel-title">Player Connection (same WiFi)</div>
          <button type="button" className="primary qr-open-btn" onClick={() => setQrOpen(true)}>QR Code</button>
        </div>
        {playUrls.length > 0 ? (
          <ul className="host-urls">
            {playUrls.map((url) => (
              <li key={url} className="host-url-primary">
                <code>{url}</code>
                <button type="button" className="copy-btn" onClick={() => navigator.clipboard.writeText(url)}>Copy</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="host-warn">No network URLs available.</p>
        )}
      </section>

      {qrOpen && <QrConnectModal playUrls={playUrls} onClose={() => setQrOpen(false)} />}
      {createType && (
        <CreateCharacterModal type={createType} onSubmit={handleCreate} onClose={() => setCreateType(null)} />
      )}

      <section className="dm-section">
        <div className="section-header">
          <h2>Players ({players.length})</h2>
          <button className="primary" onClick={() => setCreateType('player')}>+ New Player</button>
        </div>
        {loading ? (
          <p className="muted-text">Loading...</p>
        ) : players.length === 0 ? (
          <p className="muted-text">No player characters yet.</p>
        ) : (
          <div className="char-list">
            {players.map((c) => (
              <CharCard key={c.id} character={c}
                onOpen={() => navigate(`/session/character/${c.id}`)}
                onDelete={() => handleDelete(c.id, c.name)} />
            ))}
          </div>
        )}
      </section>

      <section className="dm-section">
        <div className="section-header">
          <h2>Enemies & NPCs ({enemies.length})</h2>
          <button onClick={() => setCreateType('enemy')}>+ New Enemy</button>
        </div>
        {enemies.length === 0 ? (
          <p className="muted-text">No enemies yet.</p>
        ) : (
          <div className="char-list">
            {enemies.map((c) => (
              <CharCard key={c.id} character={c}
                onOpen={() => navigate(`/session/character/${c.id}`)}
                onDelete={() => handleDelete(c.id, c.name)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CharCard({
  character, onOpen, onDelete,
}: { character: Character; onOpen: () => void; onDelete: () => void }) {
  return (
    <div className="char-card">
      <div className="char-card-info">
        <button className="char-name-btn" onClick={onOpen}>{character.name}</button>
        {character.race && <span className="char-race">{character.race}</span>}
        {character.occupation && <span className="char-prof">{character.occupation}</span>}
        {character.type === 'player' && (
          <span className="char-nick">Nickname: <strong>{character.nickname || '(not set)'}</strong></span>
        )}
      </div>
      <div className="char-card-actions">
        <button onClick={onOpen}>Open Sheet</button>
        <button className="danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
