import { useMemo, useState } from "react";
import type {
  Character,
  CombatAttackResult,
  CombatAttackType,
  CombatDefenseType,
  CombatState,
  HitLocation,
} from "@wilmak/shared";
import {
  applyDamageWithSnapshot,
  attackBase,
  attackOptionsForAttacker,
  attackTypeConfigForAttacker,
  buildModifierList,
  defenseBase,
  getAllowedDefenseTypes,
  getEffectiveArmorSp,
  inferDefenderBlockSkill,
  isDefenseAllowed,
  parseManualDieRolls,
  resolveAttackActionWithDamage,
  unarmedCombatWeapon,
  weaponRateOfFire,
  weaponToCombatWeapon,
  type RangeBand,
} from "@wilmak/game-data";
import type { AttackSubmitPayload, WeaponChoice } from "./types";

const ARMOR_LOCATIONS: { loc: HitLocation; label: string }[] = [
  { loc: "head", label: "Hd" },
  { loc: "torso", label: "Tr" },
  { loc: "rArm", label: "Arm" },
  { loc: "rLeg", label: "Leg" },
];

interface Params {
  combat: CombatState;
  attacker: Character;
  characters: Character[];
  onSubmit: (payload: AttackSubmitPayload) => void | Promise<void>;
}

export function useAttackForm({ combat, attacker, characters, onSubmit }: Params) {
  const targets = useMemo(
    () =>
      combat.participants
        .filter((p) => p.characterId !== attacker.id)
        .map((p) => characters.find((c) => c.id === p.characterId))
        .filter((c): c is Character => !!c),
    [combat.participants, attacker.id, characters],
  );

  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [weaponChoice, setWeaponChoice] = useState<WeaponChoice>(() => {
    if (attacker.weapons?.[0]) return { kind: "weapon", weaponId: attacker.weapons[0].id };
    return { kind: "unarmed", unarmed: "punch" };
  });
  const [attackType, setAttackType] = useState<CombatAttackType>("normal");
  const [defenseType, setDefenseType] = useState<CombatDefenseType>("dodge");
  const [rangeBand, setRangeBand] = useState<RangeBand>("close");
  const [defenseDc, setDefenseDc] = useState("10");
  const [attackerRollInput, setAttackerRollInput] = useState("");
  const [defenderRollInputs, setDefenderRollInputs] = useState<string[]>(["", ""]);
  const [aimLocation, setAimLocation] = useState<HitLocation | "">("");
  const [targetDodging, setTargetDodging] = useState(false);
  const [fastDraw, setFastDraw] = useState(false);
  const [ambush, setAmbush] = useState(false);
  const [outsideVisionCone, setOutsideVisionCone] = useState(false);
  const [customModifier, setCustomModifier] = useState("");
  const [step, setStep] = useState<"attack" | "damage">("attack");
  const [preview, setPreview] = useState<CombatAttackResult[] | null>(null);
  const [applyDamage, setApplyDamage] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const target = targets.find((c) => c.id === targetId);
  const isPlayerAttacker = attacker.type === "player";
  const isPlayerDefender = target?.type === "player";
  const isEnemyAttacker = attacker.type === "enemy";
  const attackerWeapons = attacker.weapons ?? [];
  const showUnarmed = !isEnemyAttacker || attackerWeapons.length === 0;
  const attackOptions = attackOptionsForAttacker(attacker);

  const selectedSourceWeapon = useMemo(
    () =>
      weaponChoice.kind === "weapon"
        ? attackerWeapons.find((w) => w.id === weaponChoice.weaponId)
        : undefined,
    [weaponChoice, attackerWeapons],
  );

  const selectedWeapon = useMemo(() => {
    if (weaponChoice.kind === "unarmed") {
      const dmg =
        weaponChoice.unarmed === "punch"
          ? (attacker.bonusMelee?.punch ?? "1d6")
          : (attacker.bonusMelee?.kick ?? "1d6+2");
      return unarmedCombatWeapon(weaponChoice.unarmed, dmg);
    }
    const w = attacker.weapons?.find((item) => item.id === weaponChoice.weaponId);
    return w ? weaponToCombatWeapon(w) : null;
  }, [weaponChoice, attacker]);

  const selectedRof = selectedSourceWeapon
    ? weaponRateOfFire(selectedSourceWeapon, attacker)
    : (selectedWeapon?.rateOfFire ?? 1);

  const typeConfig = selectedWeapon
    ? attackTypeConfigForAttacker(attacker, attackType, selectedWeapon, selectedSourceWeapon)
    : null;
  const fastStrikeCount = typeConfig?.attackCount ?? 1;

  const allowedDefenses = useMemo(() => {
    if (!selectedWeapon || !target) return [];
    return getAllowedDefenseTypes(selectedWeapon).filter((d) =>
      isDefenseAllowed(d, selectedWeapon, target),
    );
  }, [selectedWeapon, target]);

  const resolvedDefenseType: CombatDefenseType =
    allowedDefenses.length > 0 && !allowedDefenses.includes(defenseType)
      ? allowedDefenses[0]!
      : defenseType;
  const resolvedAttackType: CombatAttackType =
    isEnemyAttacker && attackType !== "normal" ? "normal" : attackType;

  const attackBasePreview =
    selectedWeapon && attacker
      ? attackBase(attacker, selectedWeapon, selectedWeapon.isRanged ? rangeBand : undefined)
      : null;

  const defenderBlockSkill =
    target && (resolvedDefenseType === "block" || resolvedDefenseType === "parry")
      ? inferDefenderBlockSkill(target, resolvedDefenseType)
      : undefined;

  const effectiveAtkBase =
    attackBasePreview !== null ? attackBasePreview + (typeConfig?.attackModifier ?? 0) : null;
  const defBaseValue =
    target && resolvedDefenseType !== "none"
      ? defenseBase(target, resolvedDefenseType, defenderBlockSkill)
      : null;
  const margin =
    effectiveAtkBase !== null && defBaseValue !== null ? effectiveAtkBase - defBaseValue : null;

  const targetArmorSp = useMemo(
    () => {
      const t = characters.find((c) => c.id === targetId);
      return t
        ? ARMOR_LOCATIONS.map(({ loc, label }) => ({
            label,
            sp: getEffectiveArmorSp(t, loc),
          })).filter((entry) => entry.sp > 0)
        : [];
    },
    [targetId, characters],
  );

  function buildOptions() {
    if (!target || !selectedWeapon) return null;

    const modifiers = buildModifierList({
      aimLocation: aimLocation || undefined,
      targetDodging,
      fastDraw,
      ambush,
      outsideVisionCone,
      custom: customModifier.trim() ? Number(customModifier) : 0,
    });

    let attackerDieRolls: number[] | undefined;
    if (isPlayerAttacker) {
      const parsed = parseManualDieRolls(attackerRollInput);
      if (!parsed) return null;
      attackerDieRolls = parsed;
    }

    let defenderDieRollsPerAttack: (number[] | undefined)[] | undefined;
    if (isPlayerDefender && resolvedDefenseType !== "none") {
      defenderDieRollsPerAttack = [];
      for (let i = 0; i < fastStrikeCount; i++) {
        const parsed = parseManualDieRolls(defenderRollInputs[i] ?? "");
        if (!parsed) return null;
        defenderDieRollsPerAttack.push(parsed);
      }
    }

    const dc = resolvedDefenseType === "none" ? Number(defenseDc) : undefined;
    if (resolvedDefenseType === "none" && (!Number.isFinite(dc) || dc! < 0)) return null;

    return {
      attacker,
      target,
      weapon: selectedWeapon,
      attackType: resolvedAttackType,
      defenseType: resolvedDefenseType,
      modifiers,
      rangeBand: selectedWeapon.isRanged ? rangeBand : undefined,
      defenseDc: dc,
      blockSkillKey:
        resolvedDefenseType === "block" || resolvedDefenseType === "parry"
          ? inferDefenderBlockSkill(target, resolvedDefenseType)
          : undefined,
      attackerDieRolls,
      defenderDieRollsPerAttack,
      aimedLocation: aimLocation || undefined,
      round: combat.round,
    };
  }

  function handlePreview() {
    setError("");
    if (!typeConfig?.allowed) {
      setError(typeConfig?.disallowReason ?? "Attack type not allowed.");
      return;
    }
    if (target && selectedWeapon && !isDefenseAllowed(resolvedDefenseType, selectedWeapon, target)) {
      setError("That defense is not allowed against this attack.");
      return;
    }
    const options = buildOptions();
    if (!options) {
      setError("Fill in required rolls and options.");
      return;
    }
    try {
      const results = resolveAttackActionWithDamage(options);
      setPreview(results);
      setStep("damage");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve attack.");
      setPreview(null);
    }
  }

  async function handleConfirm() {
    setError("");
    if (!typeConfig?.allowed) {
      setError(typeConfig?.disallowReason ?? "Attack type not allowed.");
      return;
    }
    const options = buildOptions();
    if (!options) {
      setError("Fill in required rolls and options.");
      return;
    }
    setSubmitting(true);
    try {
      let results = preview ?? resolveAttackActionWithDamage(options);
      const updatedById = new Map<string, Character>();

      if (applyDamage && target) {
        results = results.map((result) => {
          if (!result.hit || result.finalDamage === undefined) return result;
          const current = updatedById.get(target.id) ?? target;
          const { character, result: patched } = applyDamageWithSnapshot(current, result);
          updatedById.set(target.id, character);
          return patched;
        });
      }

      await onSubmit({ results, updatedCharacters: [...updatedById.values()] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record attack.");
      setSubmitting(false);
    }
  }

  return {
    targets,
    targetId, setTargetId,
    weaponChoice, setWeaponChoice,
    attackType, setAttackType,
    defenseType, setDefenseType,
    rangeBand, setRangeBand,
    defenseDc, setDefenseDc,
    attackerRollInput, setAttackerRollInput,
    defenderRollInputs, setDefenderRollInputs,
    aimLocation, setAimLocation,
    targetDodging, setTargetDodging,
    fastDraw, setFastDraw,
    ambush, setAmbush,
    outsideVisionCone, setOutsideVisionCone,
    customModifier, setCustomModifier,
    step, setStep,
    preview,
    applyDamage, setApplyDamage,
    error,
    submitting,
    target,
    isPlayerAttacker,
    isPlayerDefender,
    isEnemyAttacker,
    attackerWeapons,
    showUnarmed,
    attackOptions,
    selectedSourceWeapon,
    selectedWeapon,
    selectedRof,
    typeConfig,
    fastStrikeCount,
    allowedDefenses,
    resolvedDefenseType,
    resolvedAttackType,
    attackBasePreview,
    defenderBlockSkill,
    effectiveAtkBase,
    defBaseValue,
    margin,
    targetArmorSp,
    handlePreview,
    handleConfirm,
  };
}

export type AttackFormState = ReturnType<typeof useAttackForm>;
