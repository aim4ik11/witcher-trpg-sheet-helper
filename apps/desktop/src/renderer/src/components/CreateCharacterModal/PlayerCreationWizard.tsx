import { useEffect, useMemo, useState } from "react";
import type { Character } from "@wilmak/shared";
import {
  ATTRIBUTES,
  ATTRIBUTE_SKILLS,
  POINT_BUY_OPTIONS,
  defaultAttributes,
  validateCharacterCreation,
  validateCreationAttributes,
  professionPackageRefs,
  professionPackagePointsUsed,
  pickupSkillBudget,
  pickupSkillPointsUsed,
  PROFESSION_PACKAGE_POINTS,
  coreAbilityId,
} from "@wilmak/game-data";
import { normalizeNickname } from "../../utils/session";
import {
  RaceSelect,
  OccupationSelect,
  occupationAfterRaceChange,
} from "../RaceOccupationSelect";
import Stepper from "../Stepper";
import "./PlayerCreationWizard.css";

interface Props {
  onSubmit: (data: Partial<Character>) => void;
  onClose: () => void;
}

type Step = "identity" | "stats" | "skills" | "review";

function stepIndex(step: Step): number {
  return { identity: 0, stats: 1, skills: 2, review: 3 }[step];
}

export default function PlayerCreationWizard({ onSubmit, onClose }: Props) {
  const [step, setStep] = useState<Step>("identity");
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [occupation, setOccupation] = useState("");
  const [nickname, setNickname] = useState("");
  const [pointBuy, setPointBuy] = useState(70);
  const [level, setLevel] = useState(1);
  const [attributes, setAttributes] = useState(defaultAttributes);
  const [skills, setSkills] = useState<Record<string, Record<string, { level: number }>>>(
    {},
  );
  const [professionTree, setProfessionTree] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  const packageRefs = useMemo(
    () => professionPackageRefs(occupation),
    [occupation],
  );
  const packageUsed = useMemo(
    () => professionPackagePointsUsed(occupation, skills, professionTree),
    [occupation, skills, professionTree],
  );
  const pickupBudget = useMemo(() => pickupSkillBudget(attributes), [attributes]);
  const pickupUsed = useMemo(
    () => pickupSkillPointsUsed(occupation, skills),
    [occupation, skills],
  );

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

  useEffect(() => {
    setOccupation((prev) => occupationAfterRaceChange(race, prev));
  }, [race]);

  useEffect(() => {
    setSkills({});
    setProfessionTree({});
  }, [occupation]);

  function canRaisePackage(ref: (typeof packageRefs)[0]): boolean {
    const current = packageLevel(ref);
    if (current >= 6) return false;
    const cost = ref.special ? 2 : 1;
    return packageUsed + cost <= PROFESSION_PACKAGE_POINTS;
  }

  function canRaisePickup(attrKey: string, skillKey: string, special?: boolean): boolean {
    const current = skills[attrKey]?.[skillKey]?.level ?? 0;
    if (current >= 6) return false;
    const cost = special ? 2 : 1;
    return pickupUsed + cost <= pickupBudget;
  }

  function setPackageLevel(ref: (typeof packageRefs)[0], level: number) {
    const v = Math.max(0, Math.min(6, level));
    if (ref.isDefining && occupation) {
      setProfessionTree((prev) => ({ ...prev, [coreAbilityId(occupation)]: v }));
      return;
    }
    setSkills((prev) => ({
      ...prev,
      [ref.attrKey]: {
        ...(prev[ref.attrKey] ?? {}),
        [ref.skillKey]: { level: v },
      },
    }));
  }

  function packageLevel(ref: (typeof packageRefs)[0]): number {
    if (ref.isDefining && occupation) {
      return professionTree[coreAbilityId(occupation)] ?? 0;
    }
    return skills[ref.attrKey]?.[ref.skillKey]?.level ?? 0;
  }

  function setPickupLevel(attrKey: string, skillKey: string, level: number) {
    const v = Math.max(0, Math.min(6, level));
    setSkills((prev) => ({
      ...prev,
      [attrKey]: {
        ...(prev[attrKey] ?? {}),
        [skillKey]: { level: v },
      },
    }));
  }

  function handleCreate() {
    const creation = { complete: true, pointBuy, level };
    const err =
      validateCharacterCreation({
        race,
        occupation,
        attributes,
        skills,
        professionTree,
        creation,
      }) ??
      (!name.trim() ? "Name is required" : null) ??
      (!normalizeNickname(nickname) ? "Nickname is required" : null);
    if (err) {
      setError(err);
      return;
    }
    const coreId = coreAbilityId(occupation);
    onSubmit({
      name: name.trim(),
      race,
      occupation,
      nickname: normalizeNickname(nickname),
      type: "player",
      attributes,
      skills,
      professionTree,
      definingSkillLevel: professionTree[coreId],
      creation,
      improvementPoints: { ip: 0, trainingIp: 0 },
    });
  }

  function next() {
    setError("");
    if (step === "identity") {
      if (!name.trim()) return setError("Name is required");
      if (!normalizeNickname(nickname)) return setError("Nickname is required");
      if (!race || !occupation) return setError("Race and occupation are required");
      setStep("stats");
      return;
    }
    if (step === "stats") {
      const err = validateCreationAttributes(attributes, pointBuy);
      if (err) return setError(err);
      setStep("skills");
      return;
    }
    if (step === "skills") {
      const err = validateCharacterCreation({
        race,
        occupation,
        attributes,
        skills,
        professionTree,
        creation: { complete: false, pointBuy, level },
      });
      if (err) return setError(err);
      setStep("review");
    }
  }

  function back() {
    setError("");
    if (step === "stats") setStep("identity");
    else if (step === "skills") setStep("stats");
    else if (step === "review") setStep("skills");
  }

  const steps: Step[] = ["identity", "stats", "skills", "review"];

  return (
    <div className="create-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="create-modal create-modal--wizard"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="create-modal-header">
          <h2 className="create-modal-title">New player character</h2>
          <button type="button" className="create-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="wizard-steps" aria-label="Creation steps">
          {steps.map((s, i) => (
            <span
              key={s}
              className={`wizard-step${stepIndex(step) >= i ? " active" : ""}${
                step === s ? " current" : ""
              }`}
            >
              {s}
            </span>
          ))}
        </div>

        <div className="create-modal-body wizard-body">
          {step === "identity" && (
            <>
              <label>
                Name <span className="required">*</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </label>
              <label>
                Race <RaceSelect value={race} onChange={setRace} />
              </label>
              <label>
                Occupation{" "}
                <OccupationSelect race={race} value={occupation} onChange={setOccupation} />
              </label>
              <label>
                Player nickname <span className="required">*</span>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(normalizeNickname(e.target.value))}
                />
              </label>
            </>
          )}

          {step === "stats" && (
            <>
              <div className="wizard-row">
                <label>
                  Campaign power
                  <select
                    value={pointBuy}
                    onChange={(e) => setPointBuy(Number(e.target.value))}
                  >
                    {POINT_BUY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wizard-level-row">
                  Level
                  <Stepper
                    value={level}
                    min={1}
                    max={99}
                    onChange={setLevel}
                  />
                </label>
              </div>
              <p className="wizard-hint">
                Distribute {pointBuy} points across stats (min 1, max 10 each). Pickup skill
                budget = INT + REF = {pickupBudget}.
              </p>
              <div className="wizard-stat-grid">
                {Object.entries(ATTRIBUTES).map(([key, attr]) => (
                  <div key={key} className="wizard-stat">
                    <span className="wizard-stat-label">{attr.short}</span>
                    <Stepper
                      value={attributes[key] ?? 1}
                      min={1}
                      max={10}
                      onChange={(v) =>
                        setAttributes((prev) => ({ ...prev, [key]: v }))
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="wizard-counter">
                Stat points: {Object.values(attributes).reduce((a, b) => a + b, 0)} / {pointBuy}
              </p>
            </>
          )}

          {step === "skills" && (
            <>
              <section className="wizard-skill-section">
                <h3>Profession package</h3>
                <p className="wizard-hint">
                  {PROFESSION_PACKAGE_POINTS} points · min 1 each · max 6 at creation · (2) =
                  double cost
                </p>
                <p className="wizard-counter">
                  {packageUsed} / {PROFESSION_PACKAGE_POINTS}
                </p>
                <div className="wizard-skill-list">
                  {packageRefs.map((ref) => {
                    const lvl = packageLevel(ref);
                    return (
                      <div key={`${ref.attrKey}-${ref.skillKey}`} className="wizard-skill-row">
                        <span>
                          {ref.label}
                          {ref.special ? " (2)" : ""}
                        </span>
                        <Stepper
                          value={lvl}
                          min={0}
                          max={6}
                          onChange={(v) => setPackageLevel(ref, v)}
                          disableIncrease={!canRaisePackage(ref)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="wizard-skill-section">
                <h3>Pickup skills (INT + REF)</h3>
                <p className="wizard-counter">
                  {pickupUsed} / {pickupBudget}
                </p>
                <div className="wizard-pickup-grid">
                  {Object.entries(ATTRIBUTE_SKILLS).map(([attrKey, list]) =>
                    list.map((skill) => {
                      const lvl = skills[attrKey]?.[skill.key]?.level ?? 0;
                      return (
                        <div key={`${attrKey}-${skill.key}`} className="wizard-skill-row">
                          <span>
                            {skill.label}
                            {skill.special ? " (2)" : ""}
                          </span>
                          <Stepper
                            value={lvl}
                            min={0}
                            max={6}
                            onChange={(v) => setPickupLevel(attrKey, skill.key, v)}
                            disableIncrease={!canRaisePickup(attrKey, skill.key, skill.special)}
                          />
                        </div>
                      );
                    }),
                  )}
                </div>
              </section>
            </>
          )}

          {step === "review" && (
            <dl className="wizard-review">
              <dt>Name</dt>
              <dd>{name}</dd>
              <dt>Race / occupation</dt>
              <dd>
                {race} · {occupation}
              </dd>
              <dt>Level</dt>
              <dd>{level}</dd>
              <dt>Stats</dt>
              <dd>
                {Object.entries(attributes)
                  .map(([k, v]) => `${ATTRIBUTES[k]?.short ?? k} ${v}`)
                  .join(", ")}
              </dd>
              <dt>Package skills</dt>
              <dd>{packageUsed} pts allocated</dd>
              <dt>Pickup skills</dt>
              <dd>
                {pickupUsed} / {pickupBudget} pts
              </dd>
            </dl>
          )}

          {error && <p className="create-modal-error">{error}</p>}
        </div>

        <div className="create-modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          {step !== "identity" && (
            <button type="button" className="ghost" onClick={back}>
              Back
            </button>
          )}
          {step !== "review" ? (
            <button type="button" className="primary" onClick={next}>
              Next
            </button>
          ) : (
            <button type="button" className="primary" onClick={handleCreate}>
              Create character
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
