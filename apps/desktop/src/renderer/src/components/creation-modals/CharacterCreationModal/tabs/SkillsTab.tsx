import type { Dispatch, SetStateAction } from "react";
import {
  ATTRIBUTE_SKILLS,
  PROFESSION_PACKAGE_POINTS,
  coreAbilityId,
  professionPackageRefs,
} from "@wilmak/game-data";
import Stepper from "../../../Stepper";

type SkillsState = Record<string, Record<string, { level: number }>>;
type PackageRef = ReturnType<typeof professionPackageRefs>[number];

interface Props {
  occupation: string;
  skills: SkillsState;
  onSkillsChange: Dispatch<SetStateAction<SkillsState>>;
  professionTree: Record<string, number>;
  onProfessionTreeChange: Dispatch<SetStateAction<Record<string, number>>>;
  packageRefs: PackageRef[];
  packageUsed: number;
  pickupBudget: number;
  pickupUsed: number;
}

export default function SkillsTab({
  occupation,
  skills,
  onSkillsChange,
  professionTree,
  onProfessionTreeChange,
  packageRefs,
  packageUsed,
  pickupBudget,
  pickupUsed,
}: Props) {
  function packageLevel(ref: PackageRef): number {
    if (ref.isDefining && occupation) {
      return professionTree[coreAbilityId(occupation)] ?? 0;
    }
    return skills[ref.attrKey]?.[ref.skillKey]?.level ?? 0;
  }

  function canRaisePackage(ref: PackageRef): boolean {
    if (packageLevel(ref) >= 6) return false;
    const cost = ref.special ? 2 : 1;
    return packageUsed + cost <= PROFESSION_PACKAGE_POINTS;
  }

  function canRaisePickup(attrKey: string, skillKey: string, special?: boolean): boolean {
    if ((skills[attrKey]?.[skillKey]?.level ?? 0) >= 6) return false;
    const cost = special ? 2 : 1;
    return pickupUsed + cost <= pickupBudget;
  }

  function setPackageLevel(ref: PackageRef, lvl: number) {
    const v = Math.max(0, Math.min(6, lvl));
    if (ref.isDefining && occupation) {
      onProfessionTreeChange((prev) => ({ ...prev, [coreAbilityId(occupation)]: v }));
      return;
    }
    onSkillsChange((prev) => ({
      ...prev,
      [ref.attrKey]: { ...(prev[ref.attrKey] ?? {}), [ref.skillKey]: { level: v } },
    }));
  }

  function setPickupLevel(attrKey: string, skillKey: string, lvl: number) {
    const v = Math.max(0, Math.min(6, lvl));
    onSkillsChange((prev) => ({
      ...prev,
      [attrKey]: { ...(prev[attrKey] ?? {}), [skillKey]: { level: v } },
    }));
  }

  return (
    <>
      <section className="wizard-skill-section">
        <h3>Profession package</h3>
        <p className="wizard-hint">
          {PROFESSION_PACKAGE_POINTS} points · min 1 each · max 6 at creation · (2) = double
          cost
        </p>
        <p className="wizard-counter">
          {packageUsed} / {PROFESSION_PACKAGE_POINTS}
        </p>
        <div className="wizard-skill-list">
          {packageRefs.map((ref) => (
            <div key={`${ref.attrKey}-${ref.skillKey}`} className="wizard-skill-row">
              <span>
                {ref.label}
                {ref.special ? " (2)" : ""}
              </span>
              <Stepper
                value={packageLevel(ref)}
                min={0}
                max={6}
                onChange={(v) => setPackageLevel(ref, v)}
                disableIncrease={!canRaisePackage(ref)}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="wizard-skill-section">
        <h3>Pickup skills (INT + REF)</h3>
        <p className="wizard-counter">
          {pickupUsed} / {pickupBudget}
        </p>
        <div className="wizard-pickup-grid">
          {Object.entries(ATTRIBUTE_SKILLS).map(([attrKey, list]) =>
            list.map((skill) => (
              <div key={`${attrKey}-${skill.key}`} className="wizard-skill-row">
                <span>
                  {skill.label}
                  {skill.special ? " (2)" : ""}
                </span>
                <Stepper
                  value={skills[attrKey]?.[skill.key]?.level ?? 0}
                  min={0}
                  max={6}
                  onChange={(v) => setPickupLevel(attrKey, skill.key, v)}
                  disableIncrease={!canRaisePickup(attrKey, skill.key, skill.special)}
                />
              </div>
            )),
          )}
        </div>
      </section>
    </>
  );
}
