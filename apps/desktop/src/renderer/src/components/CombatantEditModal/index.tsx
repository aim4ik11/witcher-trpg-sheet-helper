import { useState } from "react";
import type { Character, CombatParticipant, CombatState } from "@wilmak/shared";
import Modal from "../Modal";
import "./CombatantEditModal.css";

interface Props {
  participant: CombatParticipant;
  character: Character;
  combat: CombatState;
  onUpdateCharacter: (c: Character) => void | Promise<void>;
  onCombatChange: (c: CombatState) => void | Promise<void>;
  onClose: () => void;
}

function VitalBar({
  current,
  max,
  tier,
}: {
  current: number;
  max: number;
  tier: "hp" | "sta";
}) {
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  const fillClass =
    tier === "sta"
      ? "cedit-bar-fill--sta"
      : pct > 60
        ? "cedit-bar-fill--ok"
        : pct > 25
          ? "cedit-bar-fill--mid"
          : "cedit-bar-fill--low";
  return (
    <div className="cedit-bar">
      <div className={`cedit-bar-fill ${fillClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CombatantEditModal({
  participant,
  character,
  combat,
  onUpdateCharacter,
  onCombatChange,
  onClose,
}: Props) {
  const [hp, setHp] = useState(character.vitals.hp.current);
  const [sta, setSta] = useState(character.vitals.sta.current);
  const [initiative, setInitiative] = useState(String(participant.initiative));
  const [submitting, setSubmitting] = useState(false);

  const hpMax = character.vitals.hp.max;
  const staMax = character.vitals.sta.max;

  function clampHp(v: number) { setHp(Math.max(0, Math.min(hpMax, v))); }
  function clampSta(v: number) { setSta(Math.max(0, Math.min(staMax, v))); }

  async function handleApply() {
    setSubmitting(true);
    try {
      const updatedChar: Character = {
        ...character,
        vitals: {
          ...character.vitals,
          hp: { ...character.vitals.hp, current: hp },
          sta: { ...character.vitals.sta, current: sta },
        },
      };
      await onUpdateCharacter(updatedChar);

      const newInit = Number(initiative);
      if (Number.isFinite(newInit) && newInit !== participant.initiative) {
        const currentParticipant = combat.participants[combat.currentTurnIndex];
        const sorted = combat.participants
          .map((p) =>
            p.characterId === participant.characterId
              ? { ...p, initiative: newInit }
              : p,
          )
          .sort((a, b) => b.initiative - a.initiative);
        const newIdx = currentParticipant
          ? sorted.findIndex((p) => p.characterId === currentParticipant.characterId)
          : 0;
        await onCombatChange({
          ...combat,
          participants: sorted,
          currentTurnIndex: Math.max(0, newIdx),
        });
      }

      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function handleRemove() {
    if (!confirm(`Remove ${participant.name} from combat?`)) return;
    const removedIndex = combat.participants.findIndex(
      (p) => p.characterId === participant.characterId,
    );
    const remaining = combat.participants.filter(
      (p) => p.characterId !== participant.characterId,
    );
    let newTurnIndex = combat.currentTurnIndex;
    if (removedIndex < combat.currentTurnIndex) {
      newTurnIndex = Math.max(0, combat.currentTurnIndex - 1);
    } else if (removedIndex === combat.currentTurnIndex) {
      newTurnIndex = Math.min(combat.currentTurnIndex, Math.max(0, remaining.length - 1));
    }
    void onCombatChange({ ...combat, participants: remaining, currentTurnIndex: newTurnIndex });
    onClose();
  }

  const isWounded = hp < character.vitals.woundThreshold;

  const footer = (
    <>
      <button
        type="button"
        className="ghost danger cedit-footer-remove"
        onClick={handleRemove}
        disabled={submitting}
      >
        Remove from combat
      </button>
      <button type="button" onClick={onClose} disabled={submitting}>
        Cancel
      </button>
      <button
        type="button"
        className="primary"
        onClick={() => void handleApply()}
        disabled={submitting}
      >
        {submitting ? "Saving…" : "Apply"}
      </button>
    </>
  );

  return (
    <Modal
      title={participant.name}
      size="sm"
      onClose={onClose}
      footer={footer}
    >
      <div className="cedit-body">
        {/* Header chips */}
        <div className="cedit-chips">
          <span className="cedit-chip">{participant.type === "player" ? "Player" : "NPC"}</span>
          {isWounded && <span className="cedit-chip cedit-chip--danger">Wounded</span>}
          <span className="cedit-chip cedit-chip--muted">
            Initiative {participant.initiative} · Init {participant.ref}+{participant.dieRoll}
          </span>
        </div>

        {/* HP */}
        <div className="cedit-vital">
          <div className="cedit-vital-head">
            <span className="cedit-vital-label">HP</span>
            <span className="cedit-vital-nums">{hp} / {hpMax}</span>
          </div>
          <VitalBar current={hp} max={hpMax} tier="hp" />
          <div className="cedit-stepper">
            <button type="button" className="cedit-step" onClick={() => clampHp(hp - 5)}>−5</button>
            <button type="button" className="cedit-step" onClick={() => clampHp(hp - 1)}>−1</button>
            <input
              type="number"
              className="cedit-input"
              value={hp}
              min={0}
              max={hpMax}
              onChange={(e) => clampHp(Number(e.target.value))}
            />
            <button type="button" className="cedit-step" onClick={() => clampHp(hp + 1)}>+1</button>
            <button type="button" className="cedit-step" onClick={() => clampHp(hp + 5)}>+5</button>
          </div>
        </div>

        {/* STA */}
        <div className="cedit-vital">
          <div className="cedit-vital-head">
            <span className="cedit-vital-label">STA</span>
            <span className="cedit-vital-nums cedit-vital-nums--sta">{sta} / {staMax}</span>
          </div>
          <VitalBar current={sta} max={staMax} tier="sta" />
          <div className="cedit-stepper">
            <button type="button" className="cedit-step" onClick={() => clampSta(sta - 5)}>−5</button>
            <button type="button" className="cedit-step" onClick={() => clampSta(sta - 1)}>−1</button>
            <input
              type="number"
              className="cedit-input"
              value={sta}
              min={0}
              max={staMax}
              onChange={(e) => clampSta(Number(e.target.value))}
            />
            <button type="button" className="cedit-step" onClick={() => clampSta(sta + 1)}>+1</button>
            <button type="button" className="cedit-step" onClick={() => clampSta(sta + 5)}>+5</button>
          </div>
        </div>

        {/* Initiative */}
        <div className="cedit-initiative">
          <label className="cedit-vital-label">Initiative</label>
          <input
            type="number"
            className="cedit-input cedit-input--init"
            value={initiative}
            onChange={(e) => setInitiative(e.target.value)}
          />
          <span className="cedit-init-hint">Changing this will reorder turn order on Apply</span>
        </div>
      </div>
    </Modal>
  );
}
