import { useEffect, useMemo, useState } from "react";
import type { Character, CombatParticipant } from "@wilmak/shared";
import {
  buildCombatParticipant,
  characterRef,
  rollInitiativeRoll,
} from "@wilmak/game-data";
import "../CreateCharacterModal/CreateCharacterModal.css";
import "./StartCombatModal.css";

export type CombatParticipantsMode = "start" | "add";

interface Props {
  mode: CombatParticipantsMode;
  characters: Character[];
  /** Already in combat — hidden in add mode. */
  existingParticipantIds?: string[];
  onSubmit: (participants: CombatParticipant[]) => void | Promise<void>;
  onClose: () => void;
}

type NpcRoll = { dieRoll: number; initiative: number };

function parsePlayerDie(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 10) return null;
  return n;
}

const COPY: Record<
  CombatParticipantsMode,
  { title: string; hint: string; submit: string; submitting: string; empty: string }
> = {
  start: {
    title: "Start combat",
    hint: "Select everyone in the fight. Initiative is REF + a single d10 (no crit/fumble chains). NPC rolls are automatic; enter each player's d10.",
    submit: "Start combat",
    submitting: "Starting…",
    empty: "No characters in this session yet.",
  },
  add: {
    title: "Add to combat",
    hint: "New fighters join at the end of the turn order this round, after everyone already fighting. Initiative is still REF + one d10.",
    submit: "Add to combat",
    submitting: "Adding…",
    empty: "Everyone is already in this fight.",
  },
};

export default function StartCombatModal({
  mode,
  characters,
  existingParticipantIds = [],
  onSubmit,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [npcRolls, setNpcRolls] = useState<Record<string, NpcRoll>>({});
  const [playerDice, setPlayerDice] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const existingIds = useMemo(
    () => new Set(existingParticipantIds),
    [existingParticipantIds],
  );

  const available = useMemo(
    () => characters.filter((c) => !existingIds.has(c.id)),
    [characters, existingIds],
  );

  const players = useMemo(
    () => available.filter((c) => c.type === "player"),
    [available],
  );
  const enemies = useMemo(
    () => available.filter((c) => c.type === "enemy"),
    [available],
  );

  const copy = COPY[mode];

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

  function rollNpc(character: Character) {
    const ref = characterRef(character);
    const roll = rollInitiativeRoll(ref);
    setNpcRolls((prev) => ({
      ...prev,
      [character.id]: { dieRoll: roll.dieRoll, initiative: roll.initiative },
    }));
  }

  function toggleParticipant(character: Character, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(character.id);
      else next.delete(character.id);
      return next;
    });
    setError("");

    if (checked && character.type === "enemy") {
      rollNpc(character);
    }
    if (!checked) {
      setNpcRolls((prev) => {
        const next = { ...prev };
        delete next[character.id];
        return next;
      });
      setPlayerDice((prev) => {
        const next = { ...prev };
        delete next[character.id];
        return next;
      });
    }
  }

  function allReady(): boolean {
    if (selected.size === 0) return false;
    for (const id of selected) {
      const character = available.find((c) => c.id === id);
      if (!character) return false;
      if (character.type === "player") {
        if (parsePlayerDie(playerDice[id] ?? "") === null) return false;
      } else if (!npcRolls[id]) {
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allReady()) {
      setError("Select participants and enter every player’s d10 roll (1–10).");
      return;
    }

    const participants = [...selected].map((id) => {
      const character = available.find((c) => c.id === id)!;
      if (character.type === "player") {
        const dieRoll = parsePlayerDie(playerDice[id] ?? "")!;
        return buildCombatParticipant(character, dieRoll);
      }
      const roll = npcRolls[id]!;
      return buildCombatParticipant(character, roll.dieRoll);
    });

    setSubmitting(true);
    setError("");
    try {
      await onSubmit(participants);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "start"
            ? "Failed to start combat."
            : "Failed to add participants.",
      );
      setSubmitting(false);
    }
  }

  function renderRow(character: Character) {
    const checked = selected.has(character.id);
    const ref = characterRef(character);
    const isPlayer = character.type === "player";
    const dieValue = playerDice[character.id] ?? "";
    const npc = npcRolls[character.id];
    const playerDie = parsePlayerDie(dieValue);
    const previewInitiative =
      isPlayer && playerDie !== null ? ref + playerDie : npc?.initiative;

    return (
      <label
        key={character.id}
        className={`combat-participant-row${checked ? " combat-participant-row--selected" : ""}`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => toggleParticipant(character, e.target.checked)}
        />
        <div className="combat-participant-main">
          <span className="combat-participant-name">{character.name}</span>
          <span className="combat-participant-meta">
            {isPlayer ? "Player" : "NPC"} · REF {ref}
          </span>
        </div>
        {checked && (
          <div className="combat-participant-init">
            {isPlayer ? (
              <>
                <label className="combat-die-input">
                  <span>d10</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={dieValue}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setPlayerDice((prev) => ({
                        ...prev,
                        [character.id]: e.target.value,
                      }));
                      setError("");
                    }}
                    placeholder="1–10"
                    inputMode="numeric"
                  />
                </label>
                <span className="combat-init-total">
                  = <strong>{previewInitiative ?? "—"}</strong>
                </span>
              </>
            ) : (
              <>
                <span className="combat-npc-roll">
                  d10 <strong>{npc?.dieRoll ?? "—"}</strong>
                </span>
                <span className="combat-init-total">
                  = <strong>{npc?.initiative ?? "—"}</strong>
                </span>
                <button
                  type="button"
                  className="btn-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    rollNpc(character);
                  }}
                >
                  Reroll
                </button>
              </>
            )}
          </div>
        )}
      </label>
    );
  }

  return (
    <div className="create-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="create-modal create-modal--wide panel start-combat-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="create-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="create-modal-title">{copy.title}</h2>
        <p className="start-combat-hint">{copy.hint}</p>

        <form onSubmit={(e) => void handleSubmit(e)} className="start-combat-form">
          {available.length === 0 ? (
            <p className="start-combat-empty">{copy.empty}</p>
          ) : (
            <>
              {players.length > 0 && (
                <section className="start-combat-group">
                  <h3>Players</h3>
                  <div className="combat-participant-list">{players.map(renderRow)}</div>
                </section>
              )}
              {enemies.length > 0 && (
                <section className="start-combat-group">
                  <h3>Enemies & NPCs</h3>
                  <div className="combat-participant-list">{enemies.map(renderRow)}</div>
                </section>
              )}
            </>
          )}

          {error && <p className="create-modal-error">{error}</p>}

          <div className="create-modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              disabled={submitting || !allReady()}
            >
              {submitting ? copy.submitting : copy.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
