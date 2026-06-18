import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchCharacters, fetchHostInfo, createCharacter, deleteCharacter } from '../api';
import { useSocket } from '../useSocket';
import QrConnectModal, { buildPlayUrls } from '../components/QrConnectModal';
import CreateCharacterModal from '../components/CreateCharacterModal';
import './DMDashboard.css';

export default function DMDashboard() {
  const [characters, setCharacters] = useState([]);
  const [hostInfo, setHostInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [createType, setCreateType] = useState(null);
  const socket = useSocket();
  const playUrls = useMemo(() => buildPlayUrls(hostInfo), [hostInfo]);

  const load = useCallback(async () => {
    const [chars, info] = await Promise.all([fetchCharacters(), fetchHostInfo()]);
    setCharacters(chars);
    setHostInfo(info);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    socket.on('characters-changed', load);
    return () => socket.off('characters-changed', load);
  }, [load, socket]);

  async function handleCreateSubmit(data) {
    await createCharacter(data);
    setCreateType(null);
    load();
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteCharacter(id);
    load();
  }

  const players = characters.filter((c) => c.type === 'player');
  const enemies = characters.filter((c) => c.type === 'enemy');

  return (
    <div className="dm-dashboard">
      <header className="dm-header">
        <Link to="/" className="back-link">← Home</Link>
        <h1>DM Console</h1>
      </header>

      <section className="panel host-info">
        <div className="host-info-header">
          <div className="panel-title">Player Connection (same WiFi)</div>
          <button type="button" className="primary qr-open-btn" onClick={() => setQrOpen(true)}>
            QR Code
          </button>
        </div>
        <p className="host-hint">
          Phones cannot use <code>localhost</code> — share a <strong>Network</strong> link or scan the QR code.
          Everyone must be on the same WiFi as this computer.
        </p>
        {playUrls.length > 0 ? (
          <ul className="host-urls">
            {playUrls.map((playUrl) => (
              <li key={playUrl} className="host-url-primary">
                <code>{playUrl}</code>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(playUrl)}
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="host-warn">
            No WiFi IP detected. Use production mode: <code>npm run lan</code>, then share
            the Network URL from the terminal.
          </p>
        )}
        <p className="host-note">
          DM on this machine: <code>{window.location.origin}</code>
        </p>
      </section>

      {qrOpen && (
        <QrConnectModal playUrls={playUrls} onClose={() => setQrOpen(false)} />
      )}

      {createType && (
        <CreateCharacterModal
          type={createType}
          onSubmit={handleCreateSubmit}
          onClose={() => setCreateType(null)}
        />
      )}

      <section className="dm-section">
        <div className="section-header">
          <h2>Players ({players.length})</h2>
          <button className="primary" onClick={() => setCreateType('player')}>+ New Player</button>
        </div>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : players.length === 0 ? (
          <p className="muted">No player characters yet.</p>
        ) : (
          <div className="char-list">
            {players.map((c) => (
              <CharCard key={c.id} character={c} onDelete={handleDelete} />
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
          <p className="muted">No enemies yet.</p>
        ) : (
          <div className="char-list">
            {enemies.map((c) => (
              <CharCard key={c.id} character={c} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CharCard({ character, onDelete }) {
  return (
    <div className="char-card">
      <div className="char-card-info">
        <Link to={`/dm/character/${character.id}`} className="char-name">
          {character.name}
        </Link>
        {character.race && <span className="char-race">{character.race}</span>}
        {(character.occupation || character.profession) && (
          <span className="char-prof">{character.occupation || character.profession}</span>
        )}
        {character.type === 'player' && (
          <span className="char-nick">
            Nickname: <strong>{character.nickname || '(not set)'}</strong>
          </span>
        )}
      </div>
      <div className="char-card-actions">
        <Link to={`/dm/character/${character.id}`}>
          <button>Open Sheet</button>
        </Link>
        <button className="danger" onClick={() => onDelete(character.id, character.name)}>Delete</button>
      </div>
    </div>
  );
}
