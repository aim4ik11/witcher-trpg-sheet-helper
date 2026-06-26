import { useEffect, useMemo, useState } from "react";
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
  formatCritWoundTier,
  formatDamageBreakdown,
  getAllowedDefenseTypes,
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
import "./AttackModal.css";

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

const RANGE_BANDS: { id: RangeBand; label: string }[] = [
  { id: "pointBlank", label: "Point blank (+5)" },
  { id: "close", label: "Close (+0)" },
  { id: "medium", label: "Medium (−2)" },
  { id: "long", label: "Long (−4)" },
  { id: "extreme", label: "Extreme (−6)" },
];

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

export default function AttackModal({
  combat,
  attacker,
  characters,
  onSubmit,
  onClose,
}: Props) {
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

  const selectedSourceWeapon = useMemo(() => {
    if (weaponChoice.kind !== "weapon") return undefined;
    return attackerWeapons.find((w) => w.id === weaponChoice.weaponId);
  }, [weaponChoice, attackerWeapons]);

  const selectedWeapon = useMemo(() => {
    if (weaponChoice.kind === "unarmed") {
      const dmg =
        weaponChoice.unarmed === "punch"
          ? attacker.bonusMelee?.punch ?? "1d6"
          : attacker.bonusMelee?.kick ?? "1d6+2";
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

  useEffect(() => {
    if (isEnemyAttacker && attackType !== "normal") {
      setAttackType("normal");
    }
  }, [isEnemyAttacker, attackType]);

  const allowedDefenses = useMemo(() => {
    if (!selectedWeapon || !target) return [];
    return getAllowedDefenseTypes(selectedWeapon).filter((d) =>
      isDefenseAllowed(d, selectedWeapon, target),
    );
  }, [selectedWeapon, target]);

  useEffect(() => {
    if (allowedDefenses.length > 0 && !allowedDefenses.includes(defenseType)) {
      setDefenseType(allowedDefenses[0]!);
    }
  }, [allowedDefenses, defenseType]);

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
    if (isPlayerDefender && defenseType !== "none") {
      defenderDieRollsPerAttack = [];
      for (let i = 0; i < fastStrikeCount; i++) {
        const input = defenderRollInputs[i] ?? "";
        const parsed = parseManualDieRolls(input);
        if (!parsed) return null;
        defenderDieRollsPerAttack.push(parsed);
      }
    }

    const dc = defenseType === "none" ? Number(defenseDc) : undefined;
    if (defenseType === "none" && (!Number.isFinite(dc) || dc! < 0)) return null;

    const blockSkillKey =
      defenseType === "block" || defenseType === "parry"
        ? inferDefenderBlockSkill(target, defenseType)
        : undefined;

    return {
      attacker,
      target,
      weapon: selectedWeapon,
      attackType,
      defenseType,
      modifiers,
      rangeBand: selectedWeapon.isRanged ? rangeBand : undefined,
      defenseDc: dc,
      blockSkillKey,
      attackerDieRolls,
      defenderDieRollsPerAttack,
      aimedLocation: aimLocation || undefined,
      round: combat.round,
    };
  }

  function handlePreview() {
    setError("");
    setStep("attack");
    if (!typeConfig?.allowed) {
      setError(typeConfig?.disallowReason ?? "Attack type not allowed.");
      return;
    }
    if (target && selectedWeapon && !isDefenseAllowed(defenseType, selectedWeapon, target)) {
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
      if (results.some((r) => r.hit)) {
        setStep("damage");
      }
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

      await onSubmit({
        results,
        updatedCharacters: [...updatedById.values()],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record attack.");
      setSubmitting(false);
    }
  }

  const attackBasePreview =
    selectedWeapon && attacker
      ? attackBase(attacker, selectedWeapon, selectedWeapon.isRanged ? rangeBand : undefined)
      : null;

  const defenderBlockSkill =
    target && (defenseType === "block" || defenseType === "parry")
      ? inferDefenderBlockSkill(target, defenseType)
      : undefined;

  const footer = (
    <>
      <button type="button" onClick={onClose} disabled={submitting}>
        Cancel
      </button>
      {step === "damage" && (
        <button
          type="button"
          className="btn-sm"
          onClick={() => setStep("attack")}
          disabled={submitting}
        >
          ← Back
        </button>
      )}
      {step === "attack" && (
        <button
          type="button"
          className="btn-sm"
          onClick={handlePreview}
          disabled={submitting}
        >
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
            ? applyDamage
              ? "Apply & confirm"
              : "Log only"
            : preview
              ? "Confirm attack"
              : "Resolve & confirm"}
      </button>
    </>
  );

  return (
    <Modal title={`Attack — ${attacker.name}`} size="xl" onClose={onClose} footer={footer}>
      <p className="attack-modal-hint">
        Round {combat.round}. Step {step === "attack" ? "1" : "2"}:{" "}
        {step === "attack" ? "Attack vs defense" : "Damage resolution"}
      </p>

      {isMonsterAttacker(attacker) && step === "attack" && (
        <p className="attack-modal-monster-note">
          Monsters use bestiary weapons only — each weapon&apos;s ROF is how many attacks it
          makes per action. No fast/strong/extra strikes.
        </p>
      )}

      {step === "attack" && (
        <div className="attack-modal-form">
          <div className="attack-modal-grid">
            <label>
              Target
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                {targets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === "player" ? "Player" : "NPC"})
                  </option>
                ))}
              </select>
            </label>

            <label>
              {isEnemyAttacker ? "Attack" : "Weapon"}
              <select
                value={
                  weaponChoice.kind === "weapon"
                    ? `w:${weaponChoice.weaponId}`
                    : `u:${weaponChoice.unarmed}`
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.startsWith("u:")) {
                    setWeaponChoice({
                      kind: "unarmed",
                      unarmed: v.slice(2) as "punch" | "kick",
                    });
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
                    <option value="u:punch">
                      Punch ({attacker.bonusMelee?.punch ?? "1d6"})
                    </option>
                    <option value="u:kick">
                      Kick ({attacker.bonusMelee?.kick ?? "1d6+2"})
                    </option>
                  </>
                )}
              </select>
            </label>

            {attackOptions.showAttackTypes ? (
              <label>
                Attack type
                <select
                  value={attackType}
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
              </label>
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

            <label>
              Defense
              <select
                value={defenseType}
                onChange={(e) => setDefenseType(e.target.value as CombatDefenseType)}
              >
                {allowedDefenses.map((d) => (
                  <option key={d} value={d}>
                    {defenseLabel(d)}
                    {d === "block" &&
                      selectedWeapon?.isRanged &&
                      !selectedWeapon.isThrown &&
                      " (shield only)"}
                    {d === "parry" && selectedWeapon?.isThrown && " (−5 vs thrown)"}
                  </option>
                ))}
              </select>
            </label>

            {selectedWeapon?.isRanged && (
              <label>
                Range
                <select
                  value={rangeBand}
                  onChange={(e) => setRangeBand(e.target.value as RangeBand)}
                >
                  {RANGE_BANDS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {defenseType === "none" ? (
              <label>
                Defense DC
                <input
                  type="number"
                  min={0}
                  value={defenseDc}
                  onChange={(e) => setDefenseDc(e.target.value)}
                />
              </label>
            ) : (
              target && (
                <div className="attack-base-preview">
                  Defense base:{" "}
                  <strong>
                    {defenseBase(target, defenseType, defenderBlockSkill)}
                  </strong>
                  {defenseType === "parry" && selectedWeapon?.isThrown && " (−5 thrown)"}
                  {defenseType === "parry" && !selectedWeapon?.isThrown && " (−3 parry)"}
                  {defenderBlockSkill && ` · ${defenderBlockSkill}`}
                </div>
              )
            )}
          </div>

          {attackBasePreview !== null && (
            <div className="attack-base-preview">
              Attack base: <strong>{attackBasePreview}</strong>
              {typeConfig && typeConfig.attackModifier !== 0 && (
                <span> (incl. {typeConfig.attackModifier} from attack type)</span>
              )}
            </div>
          )}

          <fieldset className="attack-modifiers">
            <legend>Modifiers</legend>
            <div className="attack-modifier-grid">
              <label>
                Aim location
                <select
                  value={aimLocation}
                  onChange={(e) => setAimLocation(e.target.value as HitLocation | "")}
                >
                  <option value="">Unaimed</option>
                  {Object.entries(AIM_LOCATION_PENALTIES).map(([loc, pen]) => (
                    <option key={loc} value={loc}>
                      {loc} ({pen})
                    </option>
                  ))}
                </select>
              </label>
              <label className="attack-check">
                <input
                  type="checkbox"
                  checked={targetDodging}
                  onChange={(e) => setTargetDodging(e.target.checked)}
                />
                Target dodging (−2)
              </label>
              <label className="attack-check">
                <input
                  type="checkbox"
                  checked={fastDraw}
                  onChange={(e) => setFastDraw(e.target.checked)}
                />
                Fast draw (−3)
              </label>
              <label className="attack-check">
                <input
                  type="checkbox"
                  checked={ambush}
                  onChange={(e) => setAmbush(e.target.checked)}
                />
                Ambush (+5)
              </label>
              <label className="attack-check">
                <input
                  type="checkbox"
                  checked={outsideVisionCone}
                  onChange={(e) => setOutsideVisionCone(e.target.checked)}
                />
                Outside vision cone (−3)
              </label>
              <label>
                Custom
                <input
                  type="number"
                  value={customModifier}
                  onChange={(e) => setCustomModifier(e.target.value)}
                  placeholder="0"
                />
              </label>
            </div>
          </fieldset>

          <div className="attack-rolls">
            <label>
              Attacker d10{isPlayerAttacker ? "" : " (auto if empty)"}
              <input
                value={attackerRollInput}
                onChange={(e) => setAttackerRollInput(e.target.value)}
                placeholder={isPlayerAttacker ? "e.g. 7 or 10,7" : "Leave empty to simulate"}
              />
            </label>
            {defenseType !== "none" &&
              Array.from({ length: fastStrikeCount }, (_, i) => (
                <label key={i}>
                  Defender d10
                  {fastStrikeCount > 1 ? ` (strike #${i + 1})` : ""}
                  {isPlayerDefender ? "" : " (auto if empty)"}
                  <input
                    value={defenderRollInputs[i] ?? ""}
                    onChange={(e) => {
                      const next = [...defenderRollInputs];
                      next[i] = e.target.value;
                      setDefenderRollInputs(next);
                    }}
                    placeholder={isPlayerDefender ? "e.g. 6" : "Leave empty to simulate"}
                  />
                </label>
              ))}
          </div>
        </div>
      )}

      {step === "damage" && preview && (
        <div className="attack-modal-form">
          <label className="attack-check attack-apply-toggle">
            <input
              type="checkbox"
              checked={applyDamage}
              onChange={(e) => setApplyDamage(e.target.checked)}
            />
            Apply damage to character sheet
          </label>

          <div className="attack-preview panel">
            <h3>Damage breakdown</h3>
            {preview.map((r) => (
              <div key={r.id} className="attack-preview-row">
                {r.attackIndex && <span className="attack-preview-tag">#{r.attackIndex}</span>}
                <div>
                  <strong>{r.hit ? "HIT" : "MISS"}</strong>
                  {!r.hit && (
                    <span>
                      {" "}
                      — attack {r.attackRoll.total}
                      {r.defenseRoll ? ` vs ${r.defenseRoll.total}` : ""}
                    </span>
                  )}
                  {r.hit && r.finalDamage !== undefined && (
                    <span className="attack-preview-margin">
                      {" "}
                      · {r.hitLocation} ×{r.locationMultiplier} →{" "}
                      <strong>{r.finalDamage} dmg</strong>
                      {r.critWoundTier !== "none" && (
                        <> · {formatCritWoundTier(r.critWoundTier)}</>
                      )}
                    </span>
                  )}
                </div>
                {r.hit && (
                  <ol className="attack-damage-breakdown">
                    {formatDamageBreakdown(r).map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                    {r.criticalWoundEffect && (
                      <li className="attack-crit-wound">
                        Crit wound table ({r.criticalWoundRoll}): {r.criticalWoundEffect}
                      </li>
                    )}
                    {target && applyDamage && (
                      <li className="attack-hp-delta">
                        HP: {target.vitals.hp.current} →{" "}
                        {Math.max(0, target.vitals.hp.current - (r.finalDamage ?? 0))}
                      </li>
                    )}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="modal-error">{error}</p>}
    </Modal>
  );
}
