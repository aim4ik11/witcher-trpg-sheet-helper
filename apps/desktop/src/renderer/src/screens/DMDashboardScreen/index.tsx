import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Character } from '@wilmak/shared';
import { api } from '../../api';
import { useAppStore } from '../../store';
import CreateCharacterModal from '../../components/CreateCharacterModal';
import AddInviteModal from '../../components/AddInviteModal';
import QrConnectModal from '../../components/QrConnectModal';
import PlayerInvitesList from '../../components/PlayerInvitesList';
import '../../components/PlayerInvitesList/PlayerInvitesList.css';
import { useCredentialsSync } from '../../hooks/useCredentialsSync';
import { normalizeNickname } from '../../utils/session';
import './DMDashboard.css';

export default function DMDashboardScreen() {
  const navigate = useNavigate();
  const server = useAppStore((s) => s.server);
  const connected = useAppStore((s) => s.players);
  const credentials = useAppStore((s) => s.credentials);
  const syncCredentials = useCredentialsSync();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [createType, setCreateType] = useState<'player' | 'enemy' | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const playUrls = useMemo(() => {
    if (!server?.urls?.length) return [];
    return server.urls.map((u) => u.replace(/\/$/, '') + '/');
  }, [server]);

  const credentialByNick = useMemo(
    () => new Map(credentials.map((c) => [c.nickname, c.code])),
    [credentials],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const chars = await api.getCharacters();
      setCharacters(chars);
    } catch {
      setCharacters([]);
      navigate('/local');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    return window.api.onCharactersChanged(() => void load());
  }, [load]);

  useEffect(() => {
    return window.api.onCredentialsUpdate((creds) => { void syncCredentials(creds); });
  }, [syncCredentials]);

  useEffect(() => {
    if (!server) return;
    void window.api.getCredentials().then((creds) => { void syncCredentials(creds); });
  }, [server, syncCredentials]);

  async function handleCreate(data: Partial<Character>) {
    await api.createCharacter(data);
    setCreateType(null);
    void load();
  }

  async function handleAddInvite(nickname: string) {
    if (!server) throw new Error('Start the session first.');
    await window.api.addCredential(nickname);
    setInviteOpen(false);
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
      {inviteOpen && (
        <AddInviteModal
          onSubmit={handleAddInvite}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {createType && (
        <CreateCharacterModal type={createType} onSubmit={handleCreate} onClose={() => setCreateType(null)} />
      )}

      <section className="dm-section">
        <div className="section-header">
          <h2>Player invites ({credentials.length})</h2>
          <button onClick={() => setInviteOpen(true)} disabled={!server}>+ Add invite</button>
        </div>
        <p className="muted-text invite-hint">Share nickname + code with each player. They enter these on the login page.</p>
        <PlayerInvitesList
          credentials={credentials}
          connected={connected}
          onCopyCode={(code) => void navigator.clipboard.writeText(code)}
        />
      </section>

      <section className="dm-section">
        <div className="section-header">
          <h2>Player characters ({players.length})</h2>
          <button className="primary" onClick={() => setCreateType('player')}>+ New Player</button>
        </div>
        {loading ? (
          <p className="muted-text">Loading...</p>
        ) : players.length === 0 ? (
          <p className="muted-text">No character sheets yet. Creating one also adds a login invite if needed.</p>
        ) : (
          <div className="char-list">
            {players.map((c) => (
              <CharCard
                key={c.id}
                character={c}
                loginCode={c.nickname ? credentialByNick.get(normalizeNickname(c.nickname)) : undefined}
                onOpen={() => navigate(`/session/character/${c.id}`)}
                onDelete={() => handleDelete(c.id, c.name)}
              />
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
  character, loginCode, onOpen, onDelete,
}: { character: Character; loginCode?: string; onOpen: () => void; onDelete: () => void }) {
  return (
    <div className="char-card">
      <div className="char-card-info">
        <button className="char-name-btn" onClick={onOpen}>{character.name}</button>
        {character.race && <span className="char-race">{character.race}</span>}
        {character.occupation && <span className="char-prof">{character.occupation}</span>}
        {character.type === 'player' && (
          <span className="char-nick">
            Login: <strong>{character.nickname || '(not set)'}</strong>
            {loginCode && <> · code <strong>{loginCode}</strong></>}
          </span>
        )}
      </div>
      <div className="char-card-actions">
        <button onClick={onOpen}>Open Sheet</button>
        <button className="danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
