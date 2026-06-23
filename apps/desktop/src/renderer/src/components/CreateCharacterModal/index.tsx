import { useState, useEffect, useMemo } from "react";
import type { Character } from "@wilmak/shared";
import {
  catalogToEnemy,
  getMonsterById,
  monsterCatalogGroups,
} from "@wilmak/game-data";
import { normalizeNickname } from "../../utils/session";
import {
  RaceSelect,
  OccupationSelect,
  occupationAfterRaceChange,
} from "../RaceOccupationSelect";
import "./CreateCharacterModal.css";

type EnemyMode = "bestiary" | "custom";

interface Props {
  type: "player" | "enemy";
  onSubmit: (data: Partial<Character>) => void;
  onClose: () => void;
}

export default function CreateCharacterModal({ type, onSubmit, onClose }: Props) {
  const isPlayer = type === "player";
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [occupation, setOccupation] = useState("");
  const [nickname, setNickname] = useState("");
  const [enemyMode, setEnemyMode] = useState<EnemyMode>("bestiary");
  const [catalogId, setCatalogId] = useState("");
  const [error, setError] = useState("");

  const catalogGroups = useMemo(() => monsterCatalogGroups(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    setOccupation((prev) => occupationAfterRaceChange(race, prev));
  }, [race]);

  function handleCatalogChange(id: string) {
    setCatalogId(id);
    setError("");
    const entry = getMonsterById(id);
    if (entry) setName(entry.name);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setError("Name is required.");
      return;
    }
    if (isPlayer) {
      const nick = normalizeNickname(nickname);
      if (!nick) {
        setError("Nickname is required so the player can log in.");
        return;
      }
      onSubmit({ name: n, race, occupation, nickname: nick, type: "player" });
    } else if (enemyMode === "bestiary") {
      if (!catalogId) {
        setError("Pick a creature from the bestiary.");
        return;
      }
      const entry = getMonsterById(catalogId);
      if (!entry) {
        setError("Invalid bestiary entry.");
        return;
      }
      onSubmit(catalogToEnemy(n, entry));
    } else {
      onSubmit({ name: n, race, occupation, type: "enemy", enemyKind: "npc" });
    }
  }

  return (
    <div className="create-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`create-modal${!isPlayer ? " create-modal--wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="create-modal-header">
          <h2 className="create-modal-title">
            {isPlayer ? "New player" : "New enemy"}
          </h2>
          <button
            type="button"
            className="create-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="create-modal-form">
          {!isPlayer && (
            <div className="create-modal-mode" role="tablist" aria-label="Enemy type">
              <button
                type="button"
                role="tab"
                aria-selected={enemyMode === "bestiary"}
                className={enemyMode === "bestiary" ? "active" : ""}
                onClick={() => setEnemyMode("bestiary")}
              >
                Bestiary
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={enemyMode === "custom"}
                className={enemyMode === "custom" ? "active" : ""}
                onClick={() => setEnemyMode("custom")}
              >
                Custom NPC
              </button>
            </div>
          )}

          <div className="create-modal-body">
            {!isPlayer && enemyMode === "bestiary" && (
              <label>
                Creature <span className="required">*</span>
                <select
                  value={catalogId}
                  onChange={(e) => handleCatalogChange(e.target.value)}
                >
                  <option value="">— Select from rulebook —</option>
                  {catalogGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.entries.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                          {entry.threat ? ` (${entry.threat})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            )}

            <label>
              Name <span className="required">*</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Geralt of Rivia"
                autoFocus
              />
            </label>

            {(isPlayer || enemyMode === "custom") && (
              <>
                <label>
                  Race <RaceSelect value={race} onChange={setRace} />
                </label>
                <label>
                  Occupation{" "}
                  <OccupationSelect
                    race={race}
                    value={occupation}
                    onChange={setOccupation}
                  />
                </label>
              </>
            )}

            {isPlayer && (
              <label>
                Player nickname <span className="required">*</span>
                <input
                  value={nickname}
                  onChange={(e) => {
                    setNickname(normalizeNickname(e.target.value));
                    setError("");
                  }}
                  placeholder="e.g. yennefer"
                  autoComplete="off"
                />
              </label>
            )}

            {error && <p className="create-modal-error">{error}</p>}
          </div>

          <div className="create-modal-actions">
            <button type="button" className="ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
