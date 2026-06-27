import { useMemo, useState } from "react";
import type {
  Character,
  CombatAttackResult,
  CombatAttackType,
  CombatDefenseType,
  CombatState,
  HitLocation,
  Weapon,
} from "@wilmak/shared";
import {
  AIM_LOCATION_PENALTIES,
  applyDamageWithSnapshot,
  attackBase,
  attackOptionsForAttacker,
  attackTypeConfig,
  attackTypeConfigForAttacker,
  buildModifierList,
  defenseBase,

  getAllowedDefenseTypes,
  getEffectiveArmorSp,
  inferDefenderBlockSkill,
  isDefenseAllowed,
  isMonsterAttacker,
  parseManualDieRolls,
  resolveAttackActionWithDamage,
  unarmedCombatWeapon,
  weaponRateOfFire,
  weaponToCombatWeapon,
  type RangeBand,
} from "@wilmak/game-data";
import Modal from "../Modal";
import CombatantStrip from "./CombatantStrip";
import DamagePreview from "./DamagePreview";
import "./AttackModal.css";
import "../StartCombatModal/StartCombatModal.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type WeaponChoice =
  | { kind: "weapon"; weaponId: string }
  | { kind: "unarmed"; unarmed: "punch" | "kick" };

export interface AttackSubmitPayload {
  results: CombatAttackResult[];
  updatedCharacters: Character[];
}

interface Props {
  combat: CombatState;
  attacker: Character;
  characters: Character[];
  onSubmit: (payload: AttackSubmitPayload) => void | Promise<void>;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGE_BANDS: { id: RangeBand; label: string }[] = [
  { id: "pointBlank", label: "Point blank (+5)" },
  { id: "close", label: "Close (+0)" },
  { id: "medium", label: "Medium (−2)" },
  { id: "long", label: "Long (−4)" },
  { id: "extreme", label: "Extreme (−6)" },
];

const ARMOR_LOCATIONS: { loc: HitLocation; label: string }[] = [
  { loc: "head", label: "Hd" },
  { loc: "torso", label: "Tr" },
  { loc: "rArm", label: "Arm" },
  { loc: "rLeg", label: "Leg" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defenseLabel(type: CombatDefenseType): string {
  if (type === "none") return "None (DC)";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function weaponOptionLabel(weapon: Weapon, attacker?: Character): string {
  const rof = weaponRateOfFire(weapon, attacker);
  const parts = [`ROF ${rof}`, weapon.dmg];
  if (weapon.wa) parts.push(`WA ${weapon.wa >= 0 ? `+${weapon.wa}` : weapon.wa}`);
  if (weapon.effect && weapon.effect !== "N/A") parts.push(weapon.effect);
  return `${weapon.name} — ${parts.join(" · ")}`;
}

function formatRofSummary(rof: number): string {
  if (rof <= 1) return "ROF 1 — one attack roll per action";
  return `ROF ${rof} — ${rof} separate attack rolls per action`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttackModal({
  combat,
  attacker,
  characters,
  onSubmit,
  onClose,
}: Props) {
  // ── Targets ────────────────────────────────────────────────────────────────
  const targets = useMemo(
    () =>
      combat.participants
        .filter((p) => p.characterId !== attacker.id)
        .map((p) => characters.find((c) => c.id === p.characterId))
        .filter((c): c is Character => !!c),
    [combat.participants, attacker.id, characters],
  );

  // ── Form state ─────────────────────────────────────────────────────────────
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

  // ── Step / result state ────────────────────────────────────────────────────
  const [step, setStep] = useState<"attack" | "damage">("attack");
  const [preview, setPreview] = useState<CombatAttackResult[] | null>(null);
  const [applyDamage, setApplyDamage] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Derived values ─────────────────────────────────────────────────────────
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

  // Resolve select values without triggering re-renders via useEffect
  const resolvedDefenseType =
    allowedDefenses.length > 0 && !allowedDefenses.includes(defenseType)
      ? allowedDefenses[0]!
      : defenseType;
  const resolvedAttackType =
    isEnemyAttacker && attackType !== "normal" ? "normal" : attackType;

  const attackBasePreview =
    selectedWeapon && attacker
      ? attackBase(attacker, selectedWeapon, selectedWeapon.isRanged ? rangeBand : undefined)
      : null;

  const defenderBlockSkill =
    target && (resolvedDefenseType === "block" || resolvedDefenseType === "parry")
      ? inferDefenderBlockSkill(target, resolvedDefenseType)
      : undefined;

  // ── Combatant strip data ───────────────────────────────────────────────────
  const effectiveAtkBase =
    attackBasePreview !== null
      ? attackBasePreview + (typeConfig?.attackModifier ?? 0)
      : null;
  const defBaseValue =
    target && resolvedDefenseType !== "none"
      ? defenseBase(target, resolvedDefenseType, defenderBlockSkill)
      : null;
  const margin =
    effectiveAtkBase !== null && defBaseValue !== null
      ? effectiveAtkBase - defBaseValue
      : null;

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

  // ── Options builder ────────────────────────────────────────────────────────
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

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handlePreview() {
    setError("");
    setStep("attack");
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
      if (results.some((r) => r.hit)) setStep("damage");
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

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footer = (
    <>
      <button type="button" onClick={onClose} disabled={submitting}>
        Cancel
      </button>
      {step === "damage" && (
        <button type="button" className="btn-sm" onClick={() => setStep("attack")} disabled={submitting}>
          ← Back
        </button>
      )}
      {step === "attack" && (
        <button type="button" className="btn-sm" onClick={handlePreview} disabled={submitting}>
          Preview
        </button>
      )}
      <button
        type="button"
        className="primary"
        onClick={() => void handleConfirm()}
        disabled={submitting || (step === "damage" && !preview)}
      >
        {submitting
          ? "Recording…"
          : step === "damage"
            ? applyDamage ? "Apply & confirm" : "Log only"
            : preview ? "Confirm attack" : "Resolve & confirm"}
      </button>
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal title={`Attack — Round ${combat.round}`} size="xl" onClose={onClose} footer={footer}>
      {isMonsterAttacker(attacker) && step === "attack" && (
        <p className="attack-modal-monster-note">
          Monsters use bestiary weapons only — each weapon&apos;s ROF is how many attacks it
          makes per action. No fast/strong/extra strikes.
        </p>
      )}

      {/* Always-visible combatant comparison */}
      <CombatantStrip
        attacker={attacker}
        targets={targets}
        target={target}
        targetId={targetId}
        onTargetChange={setTargetId}
        effectiveAtkBase={effectiveAtkBase}
        attackModifier={typeConfig?.attackModifier ?? 0}
        defBaseValue={defBaseValue}
        margin={margin}
        resolvedDefenseType={resolvedDefenseType}
        isThrown={selectedWeapon?.isThrown}
        targetArmorSp={targetArmorSp}
      />

      {/* Step 1: Attack setup */}
      {step === "attack" && (
        <div className="attack-modal-form">
          <div className="attack-modal-grid">
            {/* Weapon */}
            <div className="field">
              <label>{isEnemyAttacker ? "Attack" : "Weapon"}</label>
              <select
                value={
                  weaponChoice.kind === "weapon"
                    ? `w:${weaponChoice.weaponId}`
                    : `u:${weaponChoice.unarmed}`
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.startsWith("u:")) {
                    setWeaponChoice({ kind: "unarmed", unarmed: v.slice(2) as "punch" | "kick" });
                  } else {
                    setWeaponChoice({ kind: "weapon", weaponId: v.slice(2) });
                  }
                }}
              >
                {attackerWeapons.map((w) => (
                  <option key={w.id} value={`w:${w.id}`}>
                    {weaponOptionLabel(w, attacker)}
                  </option>
                ))}
                {showUnarmed && (
                  <>
                    <option value="u:punch">Punch ({attacker.bonusMelee?.punch ?? "1d6"})</option>
                    <option value="u:kick">Kick ({attacker.bonusMelee?.kick ?? "1d6+2"})</option>
                  </>
                )}
              </select>
            </div>

            {/* Attack type or ROF summary */}
            {attackOptions.showAttackTypes ? (
              <div className="field">
                <label>Attack type</label>
                <select
                  value={resolvedAttackType}
                  onChange={(e) => setAttackType(e.target.value as CombatAttackType)}
                >
                  {attackOptions.attackTypes.map((t) => {
                    const cfg = selectedWeapon ? attackTypeConfig(t, selectedWeapon) : null;
                    return (
                      <option key={t} value={t} disabled={cfg ? !cfg.allowed : false}>
                        {cfg?.label ?? t}
                        {cfg && !cfg.allowed ? " (N/A)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              selectedWeapon && (
                <div className="attack-base-preview attack-rof-summary">
                  <span className="attack-rof-badge">ROF {selectedRof}</span>
                  <div>
                    <strong>{selectedWeapon.name}</strong>
                    {selectedWeapon.dmg && (
                      <span className="attack-rof-dmg"> · {selectedWeapon.dmg} damage</span>
                    )}
                  </div>
                  <div className="attack-rof-detail">{formatRofSummary(selectedRof)}</div>
                  {selectedWeapon.effect && selectedWeapon.effect !== "N/A" && (
                    <div className="attack-rof-effect">{selectedWeapon.effect}</div>
                  )}
                </div>
              )
            )}

            {/* Defense type */}
            <div className="field">
              <label>Defense</label>
              <select
                value={resolvedDefenseType}
                onChange={(e) => setDefenseType(e.target.value as CombatDefenseType)}
              >
                {allowedDefenses.map((d) => (
                  <option key={d} value={d}>
                    {defenseLabel(d)}
                    {d === "block" && selectedWeapon?.isRanged && !selectedWeapon.isThrown && " (shield only)"}
                    {d === "parry" && selectedWeapon?.isThrown && " (−5 vs thrown)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Range band (ranged weapons only) */}
            {selectedWeapon?.isRanged && (
              <div className="field">
                <label>Range</label>
                <select
                  value={rangeBand}
                  onChange={(e) => setRangeBand(e.target.value as RangeBand)}
                >
                  {RANGE_BANDS.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Defense DC or block/parry skill info */}
            {resolvedDefenseType === "none" ? (
              <div className="field">
                <label>Defense DC</label>
                <input
                  type="number"
                  min={0}
                  value={defenseDc}
                  onChange={(e) => setDefenseDc(e.target.value)}
                />
                <span className="attack-dc-hint">Attacker must meet or beat this</span>
              </div>
            ) : (
              target && defenderBlockSkill && (
                <div className="attack-def-detail">
                  <span className="attack-def-detail-label">Def skill</span>
                  <span className="attack-def-detail-name">
                    {defenderBlockSkill.charAt(0).toUpperCase() + defenderBlockSkill.slice(1)}
                  </span>
                  {resolvedDefenseType === "parry" && (
                    <span className="attack-def-detail-pen">
                      {selectedWeapon?.isThrown ? "−5 vs thrown" : "−3 parry penalty"}
                    </span>
                  )}
                </div>
              )
            )}
          </div>

          {/* Attack type modifier note */}
          {attackBasePreview !== null && typeConfig && typeConfig.attackModifier !== 0 && (
            <div className="attack-base-preview">
              Weapon base: <strong>{attackBasePreview}</strong>
              <span>
                {" · "}type modifier: {typeConfig.attackModifier > 0 ? "+" : ""}
                {typeConfig.attackModifier}
              </span>
            </div>
          )}

          {/* Modifiers */}
          <fieldset className="attack-modifiers">
            <legend>Modifiers</legend>
            <div className="attack-mod-toprow">
              <div className="field">
                <label>Aim location</label>
                <select
                  value={aimLocation}
                  onChange={(e) => setAimLocation(e.target.value as HitLocation | "")}
                >
                  <option value="">Unaimed</option>
                  {Object.entries(AIM_LOCATION_PENALTIES).map(([loc, pen]) => (
                    <option key={loc} value={loc}>{loc} ({pen})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Custom modifier</label>
                <input
                  type="number"
                  value={customModifier}
                  onChange={(e) => setCustomModifier(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="attack-mod-checks">
              <label className="attack-mod-check" data-sign="neg">
                <input type="checkbox" checked={targetDodging} onChange={(e) => setTargetDodging(e.target.checked)} />
                <div className="attack-mod-check-body">
                  <div className="attack-mod-check-head">
                    <span className="attack-mod-check-name">Target dodging</span>
                    <span className="attack-mod-check-val attack-mod-check-val--neg">−2</span>
                  </div>
                  <span className="attack-mod-check-desc">Target actively evading</span>
                </div>
              </label>
              <label className="attack-mod-check" data-sign="pos">
                <input type="checkbox" checked={ambush} onChange={(e) => setAmbush(e.target.checked)} />
                <div className="attack-mod-check-body">
                  <div className="attack-mod-check-head">
                    <span className="attack-mod-check-name">Ambush</span>
                    <span className="attack-mod-check-val attack-mod-check-val--pos">+5</span>
                  </div>
                  <span className="attack-mod-check-desc">Target is unaware</span>
                </div>
              </label>
              <label className="attack-mod-check" data-sign="neg">
                <input type="checkbox" checked={fastDraw} onChange={(e) => setFastDraw(e.target.checked)} />
                <div className="attack-mod-check-body">
                  <div className="attack-mod-check-head">
                    <span className="attack-mod-check-name">Fast draw</span>
                    <span className="attack-mod-check-val attack-mod-check-val--neg">−3</span>
                  </div>
                  <span className="attack-mod-check-desc">Draw and strike in one action</span>
                </div>
              </label>
              <label className="attack-mod-check" data-sign="neg">
                <input type="checkbox" checked={outsideVisionCone} onChange={(e) => setOutsideVisionCone(e.target.checked)} />
                <div className="attack-mod-check-body">
                  <div className="attack-mod-check-head">
                    <span className="attack-mod-check-name">Outside vision cone</span>
                    <span className="attack-mod-check-val attack-mod-check-val--neg">−3</span>
                  </div>
                  <span className="attack-mod-check-desc">Rear or blind spot</span>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Dice rolls */}
          <div className="attack-rolls">
            <div className="field">
              <label>Attacker d10{isPlayerAttacker ? "" : " (auto if empty)"}</label>
              <input
                value={attackerRollInput}
                onChange={(e) => setAttackerRollInput(e.target.value)}
                placeholder={isPlayerAttacker ? "e.g. 7 or 10,7" : "Leave empty to simulate"}
              />
            </div>
            {resolvedDefenseType !== "none" &&
              Array.from({ length: fastStrikeCount }, (_, i) => (
                <div key={i} className="field">
                  <label>
                    Defender d10
                    {fastStrikeCount > 1 ? ` (strike #${i + 1})` : ""}
                    {isPlayerDefender ? "" : " (auto if empty)"}
                  </label>
                  <input
                    value={defenderRollInputs[i] ?? ""}
                    onChange={(e) => {
                      const next = [...defenderRollInputs];
                      next[i] = e.target.value;
                      setDefenderRollInputs(next);
                    }}
                    placeholder={isPlayerDefender ? "e.g. 6" : "Leave empty to simulate"}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Step 2: Damage preview */}
      {step === "damage" && preview && (
        <DamagePreview
          preview={preview}
          target={target}
          applyDamage={applyDamage}
          onApplyDamageChange={setApplyDamage}
        />
      )}

      {error && <p className="modal-error">{error}</p>}
    </Modal>
  );
}
