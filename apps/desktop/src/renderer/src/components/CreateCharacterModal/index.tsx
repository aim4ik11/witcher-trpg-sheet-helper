import { useEffect, useMemo, useState } from "react";
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
import Modal from "../Modal";
import PlayerCreationWizard from "./PlayerCreationWizard";
import "./CreateCharacterModal.css";
import "./PlayerCreationWizard.css";

type EnemyMode = "bestiary" | "custom";

interface Props {
  type: "player" | "enemy";
  onSubmit: (data: Partial<Character>) => void;
  onClose: () => void;
}

const FORM_ID = "create-enemy-form";

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

  if (isPlayer) {
    return <PlayerCreationWizard onSubmit={onSubmit} onClose={onClose} />;
  }

  return (
    <Modal
      title="New enemy"
      size="lg"
      onClose={onClose}
      subheader={
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
      }
      footer={
        <>
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="primary">
            Create
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="create-modal-form">
        {enemyMode === "bestiary" && (
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

        {enemyMode === "custom" && (
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

        {error && <p className="modal-error">{error}</p>}
      </form>
    </Modal>
  );
}
