import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
import SessionSection from "./SessionSection";
import RosterSection from "./RosterSection";
import CombatSection from "./CombatSection";
import { useCredentialsSync } from "../../hooks/useCredentialsSync";
import { normalizeNickname } from "../../utils/session";
import { useCharacters } from "./hooks/useCharacters";
import { useCombat } from "./hooks/useCombat";
import "./DMDashboard.css";

type DmTab = "session" | "roster" | "combat";

const DM_TABS: { id: DmTab; label: string }[] = [
  { id: "session", label: "Session" },
  { id: "roster", label: "Roster" },
  { id: "combat", label: "Combat" },
];

export default function DMDashboardScreen() {
  const server = useAppStore((s) => s.server);
  const config = useAppStore((s) => s.config);
  const connected = useAppStore((s) => s.players);
  const credentials = useAppStore((s) => s.credentials);
  const syncCredentials = useCredentialsSync();

  const [activeTab, setActiveTab] = useState<DmTab>("session");

  const navigate = useNavigate();

  const { characters, loading, players, enemies, handleCreateCharacter, handleDelete, handleRest, handleUpdateCharacter } =
    useCharacters();

  const { combat, canAddToCombat, handleStartCombat, handleAddToCombat, handleCombatChange, handleEndCombat } =
    useCombat({
      server,
      characters,
      onCombatStart: () => setActiveTab("combat"),
    });

  const playUrls = useMemo(() => {
    if (!server?.urls?.length) return [];
    return server.urls.map((u) => u.replace(/\/$/, "") + "/");
  }, [server]);

  const credentialByNick = useMemo(
    () => new Map(credentials.map((c) => [normalizeNickname(c.nickname), c.code])),
    [credentials],
  );

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

  async function handleAddInvite(nickname: string) {
    if (!server) throw new Error("Start the session first.");
    await window.api.addCredential(nickname);
  }

  return (
    <div className="dm-dashboard">
      <header className="page-topbar">
        <div className="page-topbar__inner">
          <div className="page-topbar__title">GM Console</div>
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
        <nav className="dm-tabs-wrap" aria-label="GM Console sections">
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
            <SessionSection
              playUrls={playUrls}
              credentials={credentials}
              connected={connected}
              serverActive={!!server}
              onAddInvite={handleAddInvite}
            />
          )}

          {activeTab === "roster" && (
            <RosterSection
              players={players}
              enemies={enemies}
              loading={loading}
              credentialByNick={credentialByNick}
              onOpen={(id) => navigate(`/session/character/${id}`)}
              onDelete={handleDelete}
              onRest={handleRest}
              onCreateCharacter={handleCreateCharacter}
            />
          )}

          {activeTab === "combat" && (
            <CombatSection
              combat={combat}
              characters={characters}
              serverActive={!!server}
              loading={loading}
              canAdd={canAddToCombat}
              onCombatChange={handleCombatChange}
              onUpdateCharacter={handleUpdateCharacter}
              onStartCombat={handleStartCombat}
              onAddToCombat={handleAddToCombat}
              onEndCombat={handleEndCombat}
            />
          )}
        </div>
      </div>
    </div>
  );
}
