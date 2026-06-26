import { useEffect, useMemo, useState } from "react";
import type { Character } from "@wilmak/shared";
import {
  catalogToEnemy,
  getMonsterById,
  monsterCatalogGroups,
} from "@wilmak/game-data";
import { normalizeNickname } from "../../../utils/session";
import {
  RaceSelect,
  OccupationSelect,
  occupationAfterRaceChange,
} from "../../RaceOccupationSelect";
import Modal from "../../Modal";
import "./EnemyCreationModal.css";
import "../styles.css";

type EnemyMode = "bestiary" | "custom";

interface Props {
  onSubmit: (data: Partial<Character>) => void;
  onClose: () => void;
}

const FORM_ID = "create-enemy-form";

export default function EnemyCreationModal({ onSubmit, onClose }: Props) {
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
    if (enemyMode === "bestiary") {
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
          <div className="field">
            <label>Creature <span className="required">*</span></label>
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
          </div>
        )}

        <div className="field">
          <label>Name <span className="required">*</span></label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g. Geralt of Rivia"
            autoFocus
          />
        </div>

        {enemyMode === "custom" && (
          <>
            <div className="field">
              <label>Race</label>
              <RaceSelect value={race} onChange={setRace} />
            </div>
            <div className="field">
              <label>Occupation</label>
              <OccupationSelect
                race={race}
                value={occupation}
                onChange={setOccupation}
              />
            </div>
          </>
        )}

        {error && <p className="modal-error">{error}</p>}
      </form>
    </Modal>
  );
}
