import { useState } from "react";
import type { Character, CombatParticipant, CombatState } from "@wilmak/shared";
import CombatTracker from "../../../components/CombatTracker";
import StartCombatModal, {
  type CombatParticipantsMode,
} from "../../../components/StartCombatModal";

interface Props {
  combat: CombatState | null;
  characters: Character[];
  serverActive: boolean;
  loading: boolean;
  canAdd: boolean;
  onCombatChange: (next: CombatState) => Promise<void>;
  onUpdateCharacter: (character: Character) => Promise<void>;
  onStartCombat: (participants: CombatParticipant[]) => Promise<void>;
  onAddToCombat: (participants: CombatParticipant[]) => Promise<void>;
  onEndCombat: () => Promise<void>;
}

export default function CombatSection({
  combat,
  characters,
  serverActive,
  loading,
  canAdd,
  onCombatChange,
  onUpdateCharacter,
  onStartCombat,
  onAddToCombat,
  onEndCombat,
}: Props) {
  const [combatModal, setCombatModal] = useState<CombatParticipantsMode | null>(null);

  async function handleModalSubmit(participants: CombatParticipant[]) {
    if (combatModal === "start") {
      await onStartCombat(participants);
    } else {
      await onAddToCombat(participants);
    }
    setCombatModal(null);
  }

  return (
    <>
      <section className="dm-section dm-section--flush">
        <div className="dm-section-head">
          <h2>Combat</h2>
          <div className="dm-section-actions">
            {!combat?.active && (
              <button
                type="button"
                className="primary btn-sm"
                onClick={() => setCombatModal("start")}
                disabled={!serverActive || loading || characters.length === 0}
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
            onCombatChange={onCombatChange}
            onUpdateCharacter={onUpdateCharacter}
            onAdd={() => setCombatModal("add")}
            onEnd={onEndCombat}
            canAdd={canAdd}
          />
        ) : (
          <div className="dm-combat-empty panel">
            <p className="dm-combat-empty-title">No active combat</p>
            <p className="dm-section-hint">
              Roll initiative (REF + d10) and track turn order. Open-ended crit/fumble chains
              apply to attacks and skill checks, not initiative.
            </p>
            <button
              type="button"
              className="primary"
              onClick={() => setCombatModal("start")}
              disabled={!serverActive || loading || characters.length === 0}
            >
              Start combat
            </button>
          </div>
        )}
      </section>

      {combatModal && (
        <StartCombatModal
          mode={combatModal}
          characters={characters}
          existingParticipantIds={
            combat?.active ? combat.participants.map((p) => p.characterId) : []
          }
          onSubmit={handleModalSubmit}
          onClose={() => setCombatModal(null)}
        />
      )}
    </>
  );
}
