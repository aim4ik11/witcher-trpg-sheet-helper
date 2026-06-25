import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Character, CombatParticipant, CombatState } from "@wilmak/shared";
import { api } from "../../api";
import { useAppStore } from "../../store";
import CreateCharacterModal from "../../components/CreateCharacterModal";
import AddInviteModal from "../../components/AddInviteModal";
import QrConnectModal from "../../components/QrConnectModal";
import StartCombatModal, {
  type CombatParticipantsMode,
} from "../../components/StartCombatModal";
import CombatTracker from "../../components/CombatTracker";
import PlayerInvitesList from "../../components/PlayerInvitesList";
import "../../components/PlayerInvitesList/PlayerInvitesList.css";
import { useCredentialsSync } from "../../hooks/useCredentialsSync";
import { normalizeNickname } from "../../utils/session";
import {
  raceLabel,
  occupationLabel,
  createCombatState,
  addParticipantsToCombat,
  restCharacterVitals,
} from "@wilmak/game-data";
import "./DMDashboard.css";

type DmTab = "session" | "roster" | "combat";

const DM_TABS: { id: DmTab; label: string }[] = [
  { id: "session", label: "Session" },
  { id: "roster", label: "Roster" },
  { id: "combat", label: "Combat" },
];

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
  const combat = useAppStore((s) => s.combat);
  const setCombat = useAppStore((s) => s.setCombat);
  const syncCredentials = useCredentialsSync();

  const [activeTab, setActiveTab] = useState<DmTab>("session");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [createType, setCreateType] = useState<"player" | "enemy" | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [combatModal, setCombatModal] = useState<CombatParticipantsMode | null>(null);

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

  useEffect(() => {
    if (!server) {
      setCombat(null);
      return;
    }
    void window.api.getCombat().then(setCombat);
    return window.api.onCombatUpdate(setCombat);
  }, [server, setCombat]);

  async function persistCombat(next: CombatState | null) {
    if (!server) throw new Error("Start the session first.");
    const saved = await window.api.setCombat(next);
    setCombat(saved);
    setCombatModal(null);
    if (saved?.active) setActiveTab("combat");
  }

  async function handleStartCombat(participants: CombatParticipant[]) {
    await persistCombat(createCombatState(participants));
  }

  async function handleAddToCombat(participants: CombatParticipant[]) {
    if (!combat?.active) throw new Error("No active combat.");
    await persistCombat(addParticipantsToCombat(combat, participants));
  }

  async function handleCombatChange(next: CombatState) {
    if (!server) throw new Error("Start the session first.");
    const saved = await window.api.setCombat(next);
    setCombat(saved);
  }

  async function handleEndCombat() {
    if (!confirm("End combat and clear initiative order?")) return;
    await window.api.setCombat(null);
    setCombat(null);
  }

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

  async function handleRest(character: Character) {
    const rested = restCharacterVitals(character);
    await api.updateCharacter(rested.id, rested);
    setCharacters((prev) => prev.map((c) => (c.id === rested.id ? rested : c)));
  }

  const players = characters.filter((c) => c.type === "player");
  const enemies = characters.filter((c) => c.type === "enemy");

  const combatParticipantIds = useMemo(
    () => new Set(combat?.participants.map((p) => p.characterId) ?? []),
    [combat],
  );
  const canAddToCombat =
    combat?.active && characters.some((c) => !combatParticipantIds.has(c.id));

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
        <nav className="dm-tabs-wrap" aria-label="DM console sections">
          <div className="tab-bar dm-tab-bar">
            {DM_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === "combat" && combat?.active && (
                  <span className="dm-tab-badge">R{combat.round}</span>
                )}
                {tab.id === "roster" && characters.length > 0 && (
                  <span className="dm-tab-count">{characters.length}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="dm-tab-panel">
          {activeTab === "session" && (
            <>
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
            </>
          )}

          {activeTab === "roster" && (
            <>
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
                        onRest={() => void handleRest(c)}
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
                        onRest={() => void handleRest(c)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === "combat" && (
            <section className="dm-section dm-section--flush">
              <div className="dm-section-head">
                <h2>Combat</h2>
                <div className="dm-section-actions">
                  {!combat?.active && (
                    <button
                      type="button"
                      className="primary btn-sm"
                      onClick={() => setCombatModal("start")}
                      disabled={!server || loading || characters.length === 0}
                    >
                      Start combat
                    </button>
                  )}
                </div>
              </div>
              {combat?.active ? (
                <CombatTracker
                  combat={combat}
                  characters={characters}
                  onCombatChange={handleCombatChange}
                  onUpdateCharacter={async (character) => {
                    await api.updateCharacter(character.id, character);
                    setCharacters((prev) =>
                      prev.map((c) => (c.id === character.id ? character : c)),
                    );
                  }}
                  onAdd={() => setCombatModal("add")}
                  onEnd={handleEndCombat}
                  canAdd={canAddToCombat}
                />
              ) : (
                <div className="dm-combat-empty panel">
                  <p className="dm-combat-empty-title">No active combat</p>
                  <p className="dm-section-hint">
                    Roll initiative (REF + d10) and track turn order. Open-ended crit/fumble
                    chains apply to attacks and skill checks, not initiative.
                  </p>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setCombatModal("start")}
                    disabled={!server || loading || characters.length === 0}
                  >
                    Start combat
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {qrOpen && <QrConnectModal playUrls={playUrls} onClose={() => setQrOpen(false)} />}
      {inviteOpen && (
        <AddInviteModal onSubmit={handleAddInvite} onClose={() => setInviteOpen(false)} />
      )}
      {createType && (
        <CreateCharacterModal
          type={createType}
          onSubmit={handleCreate}
          onClose={() => setCreateType(null)}
        />
      )}
      {combatModal && (
        <StartCombatModal
          mode={combatModal}
          characters={characters}
          existingParticipantIds={
            combat?.active ? combat.participants.map((p) => p.characterId) : []
          }
          onSubmit={combatModal === "start" ? handleStartCombat : handleAddToCombat}
          onClose={() => setCombatModal(null)}
        />
      )}
    </div>
  );
}

function CharCard({
  character,
  loginCode,
  onOpen,
  onDelete,
  onRest,
}: {
  character: Character;
  loginCode?: string;
  onOpen: () => void;
  onDelete: () => void;
  onRest: () => void;
}) {
  const isMonster = character.enemyKind === "monster";
  const profile = character.monsterProfile;
  const subtitleParts: string[] = [];
  const atFullHealth =
    character.vitals.hp.current >= character.vitals.hp.max &&
    character.vitals.sta.current >= character.vitals.sta.max;

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
      <div className="char-vitals">
        HP{" "}
        <span className="mono">
          {character.vitals.hp.current}/{character.vitals.hp.max}
        </span>
        <span className="char-vitals-sep">·</span>
        STA{" "}
        <span className="mono">
          {character.vitals.sta.current}/{character.vitals.sta.max}
        </span>
      </div>
      <div className="char-card-actions">
        <button type="button" className="btn-sm" onClick={onOpen}>
          Open sheet
        </button>
        <button
          type="button"
          className="btn-sm"
          onClick={onRest}
          disabled={atFullHealth}
          title={atFullHealth ? "Already at full HP and STA" : "Restore HP and STA to max"}
        >
          Rest
        </button>
        <button type="button" className="danger btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
