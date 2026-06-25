import { useEffect, useMemo } from "react";
import type { Character, CombatParticipant, CombatState, ServerInfo } from "@wilmak/shared";
import { createCombatState, addParticipantsToCombat } from "@wilmak/game-data";
import { useAppStore } from "../../../store";

interface Options {
  server: ServerInfo | null;
  characters: Character[];
  onCombatStart: () => void;
}

export function useCombat({ server, characters, onCombatStart }: Options) {
  const combat = useAppStore((s) => s.combat);
  const setCombat = useAppStore((s) => s.setCombat);

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
    if (saved?.active) onCombatStart();
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

  const combatParticipantIds = useMemo(
    () => new Set(combat?.participants.map((p) => p.characterId) ?? []),
    [combat],
  );

  const canAddToCombat =
    !!combat?.active && characters.some((c) => !combatParticipantIds.has(c.id));

  return {
    combat,
    canAddToCombat,
    handleStartCombat,
    handleAddToCombat,
    handleCombatChange,
    handleEndCombat,
  };
}
