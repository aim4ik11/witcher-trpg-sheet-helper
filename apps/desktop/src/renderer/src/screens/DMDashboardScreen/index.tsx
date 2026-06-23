import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Character } from "@wilmak/shared";
import { api } from "../../api";
import { useAppStore } from "../../store";
import CreateCharacterModal from "../../components/CreateCharacterModal";
import AddInviteModal from "../../components/AddInviteModal";
import QrConnectModal from "../../components/QrConnectModal";
import PlayerInvitesList from "../../components/PlayerInvitesList";
import "../../components/PlayerInvitesList/PlayerInvitesList.css";
import { useCredentialsSync } from "../../hooks/useCredentialsSync";
import { normalizeNickname } from "../../utils/session";
import { raceLabel, occupationLabel } from "@wilmak/game-data";
import "./DMDashboard.css";

function threatBadgeClass(threat: string): string {
  const t = threat.toLowerCase();
  if (t.includes("deadly") || t.includes("hard") || t.includes("difficult"))
    return "badge badge--danger";
  if (t.includes("easy") || t.includes("simple") || t.includes("medium"))
    return "badge badge--gold";
  return "badge badge--muted";
}

function urlLabel(url: string, index: number): string {
  if (url.includes("192.168.") || url.includes("10.0.") || url.includes("172."))
    return index === 0 ? "Wi-Fi" : "Network";
  return "URL";
}

export default function DMDashboardScreen() {
  const navigate = useNavigate();
  const server = useAppStore((s) => s.server);
  const config = useAppStore((s) => s.config);
  const connected = useAppStore((s) => s.players);
  const credentials = useAppStore((s) => s.credentials);
  const syncCredentials = useCredentialsSync();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [createType, setCreateType] = useState<"player" | "enemy" | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const playUrls = useMemo(() => {
    if (!server?.urls?.length) return [];
    return server.urls.map((u) => u.replace(/\/$/, "") + "/");
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
      navigate("/local");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return window.api.onCharactersChanged(() => void load());
  }, [load]);

  useEffect(() => {
    return window.api.onCredentialsUpdate((creds) => {
      void syncCredentials(creds);
    });
  }, [syncCredentials]);

  useEffect(() => {
    if (!server) return;
    void window.api.getCredentials().then((creds) => {
      void syncCredentials(creds);
    });
  }, [server, syncCredentials]);

  async function handleCreate(data: Partial<Character>) {
    await api.createCharacter(data);
    setCreateType(null);
    void load();
  }

  async function handleAddInvite(nickname: string) {
    if (!server) throw new Error("Start the session first.");
    await window.api.addCredential(nickname);
    setInviteOpen(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.deleteCharacter(id);
    void load();
  }

  const players = characters.filter((c) => c.type === "player");
  const enemies = characters.filter((c) => c.type === "enemy");

  return (
    <div className="dm-dashboard">
      <header className="page-topbar">
        <div className="page-topbar__inner">
          <button type="button" className="ghost" onClick={() => navigate("/local")}>
            ← Local Session
          </button>
          <div className="page-topbar__title">DM Console</div>
          <div className="dm-topbar-meta">
            {server && (
              <span className="status-pill status-pill--online">
                <span className="status-pill__dot" />
                Server running
              </span>
            )}
            {config?.sessionName && (
              <span className="dm-session-name">
                Session <strong>{config.sessionName}</strong>
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="dm-dashboard__body">
        <section className="dm-section">
          <div className="dm-section-head">
            <h2>Player connection</h2>
            <span className="dm-section-sub">same WiFi</span>
            <div className="dm-section-actions">
              <button type="button" className="btn-sm" onClick={() => setQrOpen(true)}>
                QR Code
              </button>
            </div>
          </div>
          {playUrls.length > 0 ? (
            <div className="host-panel">
              {playUrls.map((url, i) => (
                <div key={url} className="host-url-row">
                  <span className="host-url-label">{urlLabel(url, i)}</span>
                  <code>{url}</code>
                  <button
                    type="button"
                    className="btn-sm"
                    onClick={() => navigator.clipboard.writeText(url)}
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="host-warn">No network URLs available.</p>
          )}
        </section>

        {qrOpen && (
          <QrConnectModal playUrls={playUrls} onClose={() => setQrOpen(false)} />
        )}
        {inviteOpen && (
          <AddInviteModal
            onSubmit={handleAddInvite}
            onClose={() => setInviteOpen(false)}
          />
        )}
        {createType && (
          <CreateCharacterModal
            type={createType}
            onSubmit={handleCreate}
            onClose={() => setCreateType(null)}
          />
        )}

        <section className="dm-section">
          <div className="dm-section-head">
            <h2>Player invites</h2>
            <span className="badge badge--count">{credentials.length}</span>
            <div className="dm-section-actions">
              <button
                type="button"
                className="btn-sm"
                onClick={() => setInviteOpen(true)}
                disabled={!server}
              >
                + Add invite
              </button>
            </div>
          </div>
          <p className="dm-section-hint">
            Players log in from a browser with their nickname and 4-digit code.
          </p>
          <div className="invite-panel">
            <PlayerInvitesList
              credentials={credentials}
              connected={connected}
              onCopyCode={(code) => void navigator.clipboard.writeText(code)}
            />
          </div>
        </section>

        <section className="dm-section">
          <div className="dm-section-head">
            <h2>Player characters</h2>
            <span className="badge badge--count">{players.length}</span>
            <div className="dm-section-actions">
              <button
                type="button"
                className="primary btn-sm"
                onClick={() => setCreateType("player")}
              >
                + New Player
              </button>
            </div>
          </div>
          {loading ? (
            <p className="dm-section-hint">Loading...</p>
          ) : players.length === 0 ? (
            <p className="dm-section-hint">
              No character sheets yet. Creating one also adds a login invite if needed.
            </p>
          ) : (
            <div className="char-grid">
              {players.map((c) => (
                <CharCard
                  key={c.id}
                  character={c}
                  loginCode={
                    c.nickname
                      ? credentialByNick.get(normalizeNickname(c.nickname))
                      : undefined
                  }
                  onOpen={() => navigate(`/session/character/${c.id}`)}
                  onDelete={() => handleDelete(c.id, c.name)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="dm-section">
          <div className="dm-section-head">
            <h2>Enemies & NPCs</h2>
            <span className="badge badge--count">{enemies.length}</span>
            <div className="dm-section-actions">
              <button
                type="button"
                className="btn-sm"
                onClick={() => setCreateType("enemy")}
              >
                + New Enemy
              </button>
            </div>
          </div>
          {enemies.length === 0 ? (
            <p className="dm-section-hint">No enemies yet.</p>
          ) : (
            <div className="char-grid">
              {enemies.map((c) => (
                <CharCard
                  key={c.id}
                  character={c}
                  onOpen={() => navigate(`/session/character/${c.id}`)}
                  onDelete={() => handleDelete(c.id, c.name)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CharCard({
  character,
  loginCode,
  onOpen,
  onDelete,
}: {
  character: Character;
  loginCode?: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const isMonster = character.enemyKind === "monster";
  const profile = character.monsterProfile;
  const subtitleParts: string[] = [];

  if (isMonster && profile?.monsterType) {
    subtitleParts.push(profile.monsterType);
  } else {
    if (character.race) subtitleParts.push(raceLabel(character.race));
    if (character.occupation) subtitleParts.push(occupationLabel(character.occupation));
  }

  const threatBadge =
    character.type === "enemy" &&
    (profile?.threat ? (
      <span className={threatBadgeClass(profile.threat)}>
        {profile.threat.split("/")[0]?.trim() ?? profile.threat}
      </span>
    ) : !isMonster ? (
      <span className="badge badge--muted">NPC</span>
    ) : null);

  return (
    <div className="char-card">
      <div className="char-card-top">
        <div className="char-card-info">
          <button type="button" className="char-name-btn" onClick={onOpen}>
            {character.name}
          </button>
          {subtitleParts.length > 0 && (
            <div className="char-subtitle">{subtitleParts.join(" · ")}</div>
          )}
        </div>
        {threatBadge}
      </div>
      {character.type === "player" && (
        <div className="char-login-meta">
          <span>
            nick <span className="mono">{character.nickname || "—"}</span>
          </span>
          {loginCode && (
            <span>
              code <span className="code">{loginCode}</span>
            </span>
          )}
        </div>
      )}
      <div className="char-card-actions">
        <button type="button" className="btn-sm" onClick={onOpen}>
          Open sheet
        </button>
        <button type="button" className="danger btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
