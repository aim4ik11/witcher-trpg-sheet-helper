import { useMemo, useState } from "react";
import type {
  Character,
  CombatAttackResult,
  CombatDefenseType,
  CombatState,
  Spell,
} from "@wilmak/shared";
import {
  applyDamageWithSnapshot,
  defenseBase,
  getEffectiveArmorSp,
  parseManualDieRolls,
  resolveSpellAttack,
  skillBase,
  spellAttackBase,
  casterVigorThreshold,
  focusAdjustedStaCost,
  overexertionHpCost,
  resolveStaSpent,
  magicCastModifierFromArmor,
  evaluateSkillCheck,
} from "@wilmak/game-data";
import type { AttackSubmitPayload } from "../AttackModal/types";

const ARMOR_LOCATIONS = [
  { loc: "head" as const, label: "Hd" },
  { loc: "torso" as const, label: "Tr" },
  { loc: "rArm" as const, label: "Arm" },
  { loc: "rLeg" as const, label: "Leg" },
];

export type SpellDefenseType = Extract<CombatDefenseType, "dodge" | "reposition" | "none">;

interface Params {
  combat: CombatState;
  attacker: Character;
  characters: Character[];
  onSubmit: (payload: AttackSubmitPayload) => void | Promise<void>;
}

export function useSpellAttackForm({ combat, attacker, characters, onSubmit }: Params) {
  const targets = useMemo(
    () =>
      combat.participants
        .filter((p) => p.characterId !== attacker.id)
        .map((p) => characters.find((c) => c.id === p.characterId))
        .filter((c): c is Character => !!c),
    [combat.participants, attacker.id, characters],
  );

  const attackerSpells = attacker.spells ?? [];

  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [spellId, setSpellId] = useState(attackerSpells[0]?.id ?? "");
  const [defenseType, setDefenseType] = useState<SpellDefenseType>("dodge");
  const [defenseDc, setDefenseDc] = useState("10");
  const [customModifier, setCustomModifier] = useState("");
  const [staSpent, setStaSpent] = useState(() => String(attackerSpells[0]?.staCost ?? 0));
  const [dmgExpression, setDmgExpression] = useState("");
  const [attackerRollInput, setAttackerRollInput] = useState("");
  const [defenderRollInput, setDefenderRollInput] = useState("");
  const [fumbleRollInput, setFumbleRollInput] = useState("");
  const [focusExplosionRollInput, setFocusExplosionRollInput] = useState("");
  const [step, setStep] = useState<"cast" | "result">("cast");
  const [preview, setPreview] = useState<CombatAttackResult | null>(null);
  const [previewUpdatedAttacker, setPreviewUpdatedAttacker] = useState<Character | null>(null);
  const [applyDamage, setApplyDamage] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const target = targets.find((c) => c.id === targetId);
  const spell = attackerSpells.find((s) => s.id === spellId) ?? attackerSpells[0];
  const isPlayerAttacker = attacker.type === "player";
  const isPlayerDefender = target?.type === "player";

  // Update staSpent default when spell changes
  const handleSpellChange = (id: string) => {
    setSpellId(id);
    const s = attackerSpells.find((sp) => sp.id === id);
    if (s) setStaSpent(String(s.staCost || 0));
  };

  // Derived casting stats
  const castingBase = spell ? spellAttackBase(attacker) : 0;
  const armorEvMod = magicCastModifierFromArmor(attacker);
  const customMod = customModifier.trim() ? Number(customModifier) : 0;
  const totalModifier = customMod + armorEvMod;

  const staSpentNum = spell ? resolveStaSpent(spell, Number(staSpent) || 0) : 0;
  const effectiveSta = focusAdjustedStaCost(staSpentNum, 0);
  const vigorThreshold = casterVigorThreshold(attacker);
  const overexertionPreview = overexertionHpCost(effectiveSta, vigorThreshold);

  const defBaseValue =
    target && defenseType !== "none"
      ? defenseBase(target, defenseType)
      : null;

  const targetArmorSp = useMemo(
    () => {
      const t = characters.find((c) => c.id === targetId);
      return t
        ? ARMOR_LOCATIONS.map(({ loc, label }) => ({
            label,
            sp: getEffectiveArmorSp(t, loc),
          })).filter((e) => e.sp > 0)
        : [];
    },
    [targetId, characters],
  );

  // Preview spell casting check from roll input (to detect fumble)
  const castingPreview = useMemo(() => {
    const rolls = parseManualDieRolls(attackerRollInput);
    if (!rolls) return null;
    try {
      return evaluateSkillCheck({ base: castingBase, modifier: totalModifier, dieRolls: rolls });
    } catch {
      return null;
    }
  }, [attackerRollInput, castingBase, totalModifier]);

  const isFumble = castingPreview?.outcome === "fumble";
  const isCatastrophicFumble = isFumble && Number(fumbleRollInput) === 10;

  function buildOptions() {
    if (!target || !spell) return null;

    const dc = defenseType === "none" ? Number(defenseDc) : undefined;
    if (defenseType === "none" && (!Number.isFinite(dc) || dc! < 0)) return null;

    let attackerDieRolls: number[] | undefined;
    if (isPlayerAttacker) {
      const parsed = parseManualDieRolls(attackerRollInput);
      if (!parsed) return null;
      attackerDieRolls = parsed;
    }

    let defenderDieRolls: number[] | undefined;
    if (isPlayerDefender && defenseType !== "none") {
      const parsed = parseManualDieRolls(defenderRollInput);
      if (!parsed) return null;
      defenderDieRolls = parsed;
    }

    // If fumble (first roll = 1), require fumble second d10
    const isFumbleRoll = attackerDieRolls?.[0] === 1;
    let fumbleSecondRoll: number | undefined;
    let focusExplosionRoll: number | undefined;
    if (isPlayerAttacker && isFumbleRoll) {
      const f = Number(fumbleRollInput);
      if (!Number.isInteger(f) || f < 1 || f > 10) return null;
      fumbleSecondRoll = f;
      if (f === 10) {
        const boom = Number(focusExplosionRollInput);
        if (!Number.isInteger(boom) || boom < 1 || boom > 10) return null;
        focusExplosionRoll = boom;
      }
    }

    const modifiers = customMod !== 0 ? [{ label: "Custom", value: customMod }] : [];

    return {
      attacker,
      target,
      spell,
      defenseType,
      modifiers,
      defenseDc: dc,
      attackerDieRolls,
      defenderDieRolls,
      fumbleSecondRoll,
      focusExplosionRoll,
      dmgExpression: dmgExpression.trim() || undefined,
      staSpent: staSpentNum,
      round: combat.round,
    };
  }

  function handlePreview() {
    setError("");
    if (!spell) {
      setError("Select a spell.");
      return;
    }
    const options = buildOptions();
    if (!options) {
      setError("Fill in required rolls and options.");
      return;
    }
    try {
      const { result, updatedAttacker } = resolveSpellAttack(options);
      setPreview(result);
      setPreviewUpdatedAttacker(updatedAttacker);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve spell attack.");
      setPreview(null);
    }
  }

  async function handleConfirm() {
    setError("");
    if (!spell) {
      setError("Select a spell.");
      return;
    }
    setSubmitting(true);
    try {
      const { result, updatedAttacker } =
        preview && previewUpdatedAttacker
          ? { result: preview, updatedAttacker: previewUpdatedAttacker }
          : resolveSpellAttack(buildOptions()!);

      const updatedById = new Map<string, Character>();

      // Always update attacker (STA/HP costs)
      updatedById.set(updatedAttacker.id, updatedAttacker);

      // Optionally apply damage to target
      if (applyDamage && target && result.hit && result.finalDamage !== undefined) {
        const { character } = applyDamageWithSnapshot(target, result);
        updatedById.set(target.id, character);
      }

      await onSubmit({
        results: [result],
        updatedCharacters: [...updatedById.values()],
      });
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record spell attack.");
      setSubmitting(false);
    }
  }

  return {
    targets,
    targetId, setTargetId,
    spellId, handleSpellChange,
    defenseType, setDefenseType,
    defenseDc, setDefenseDc,
    customModifier, setCustomModifier,
    staSpent, setStaSpent,
    dmgExpression, setDmgExpression,
    attackerRollInput, setAttackerRollInput,
    defenderRollInput, setDefenderRollInput,
    fumbleRollInput, setFumbleRollInput,
    focusExplosionRollInput, setFocusExplosionRollInput,
    step, setStep,
    preview,
    applyDamage, setApplyDamage,
    error,
    submitting,
    target,
    spell,
    attackerSpells,
    isPlayerAttacker,
    isPlayerDefender,
    castingBase,
    armorEvMod,
    totalModifier,
    effectiveSta,
    vigorThreshold,
    overexertionPreview,
    defBaseValue,
    targetArmorSp,
    isFumble,
    isCatastrophicFumble,
    handlePreview,
    handleConfirm,
  };
}

export type SpellAttackFormState = ReturnType<typeof useSpellAttackForm>;
