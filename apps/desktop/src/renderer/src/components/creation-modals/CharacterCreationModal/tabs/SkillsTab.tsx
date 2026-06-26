import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  ATTRIBUTE_SKILLS,
  PROFESSION_PACKAGE_POINTS,
  coreAbilityId,
  professionPackageRefs,
} from "@wilmak/game-data";
import Stepper from "../../../Stepper";
import ValueInputModal from "../../../ValueInputModal";

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
  type PickupEdit = { attrKey: string; skillKey: string; label: string; special?: boolean };

  const [search, setSearch] = useState("");
  const [editingRef, setEditingRef] = useState<PackageRef | null>(null);
  const [editingPickup, setEditingPickup] = useState<PickupEdit | null>(null);
  const pickupGridRef = useRef<HTMLDivElement>(null);

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

  function handleSearch(query: string) {
    setSearch(query);
    const container = pickupGridRef.current;
    if (!container) return;
    if (!query.trim()) {
      container.scrollTop = 0;
      return;
    }
    const q = query.toLowerCase();
    const rows = container.querySelectorAll<HTMLElement>("[data-label]");
    for (const row of rows) {
      if (row.dataset.label?.toLowerCase().includes(q)) {
        const containerRect = container.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        container.scrollTop += rowRect.top - containerRect.top;
        break;
      }
    }
  }

  function validatePackageLevel(ref: PackageRef, value: number): string | null {
    const current = packageLevel(ref);
    const cost = ref.special ? 2 : 1;
    const newUsed = packageUsed + (value - current) * cost;
    if (newUsed > PROFESSION_PACKAGE_POINTS) {
      return `Exceeds budget by ${newUsed - PROFESSION_PACKAGE_POINTS} pt(s)`;
    }
    return null;
  }

  function validatePickupLevel(pick: PickupEdit, value: number): string | null {
    const current = skills[pick.attrKey]?.[pick.skillKey]?.level ?? 0;
    const cost = pick.special ? 2 : 1;
    const newUsed = pickupUsed + (value - current) * cost;
    if (newUsed > pickupBudget) {
      return `Exceeds budget by ${newUsed - pickupBudget} pt(s)`;
    }
    return null;
  }

  const searchQuery = search.toLowerCase();

  return (
    <>
      <section className="wizard-skill-section">
        <span className="section-heading">
          <h3>Profession package</h3>
          <p className="wizard-counter">
            {packageUsed} / {PROFESSION_PACKAGE_POINTS}
          </p>
        </span>
        <p className="wizard-hint">
          {PROFESSION_PACKAGE_POINTS} points · min 1 each · max 6 at creation · (2) = double
          cost
        </p>
        <div className="wizard-skill-list scrollbar">
          {packageRefs.map((ref) => (
            <div key={`${ref.attrKey}-${ref.skillKey}`} className="wizard-skill-row">
              <span className="wizard-skill-field-label">
                {ref.label}
                {ref.special ? " (2)" : ""}
              </span>
              <Stepper
                value={packageLevel(ref)}
                min={0}
                max={6}
                onValClick={() => setEditingRef(ref)}
                onChange={(v) => setPackageLevel(ref, v)}
                disableIncrease={!canRaisePackage(ref)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="wizard-skill-section">
        <span className="section-heading">
          <h3>Pickup skills (INT + REF)</h3>
          <p className="wizard-counter">
            {pickupUsed} / {pickupBudget}
          </p>
        </span>
        <input
          className="wizard-skill-search"
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search skills…"
        />
        <div className="wizard-pickup-grid scrollbar" ref={pickupGridRef}>
          {Object.entries(ATTRIBUTE_SKILLS).map(([attrKey, list]) =>
            list.map((skill) => {
              const isMatch = searchQuery && skill.label.toLowerCase().includes(searchQuery);
              return (
                <div
                  key={`${attrKey}-${skill.key}`}
                  className={`wizard-skill-row${isMatch ? " wizard-skill-row--match" : ""}`}
                  data-label={skill.label}
                >
                  <span>
                    {skill.label}
                    {skill.special ? " (2)" : ""}
                  </span>
                  <Stepper
                    value={skills[attrKey]?.[skill.key]?.level ?? 0}
                    min={0}
                    max={6}
                    onValClick={() =>
                      setEditingPickup({
                        attrKey,
                        skillKey: skill.key,
                        label: skill.label,
                        special: skill.special,
                      })
                    }
                    onChange={(v) => setPickupLevel(attrKey, skill.key, v)}
                    disableIncrease={!canRaisePickup(attrKey, skill.key, skill.special)}
                  />
                </div>
              );
            }),
          )}
        </div>
      </section>

      {editingPickup && (
        <ValueInputModal
          type="number"
          title={editingPickup.label}
          initial={skills[editingPickup.attrKey]?.[editingPickup.skillKey]?.level ?? 0}
          min={0}
          max={6}
          validate={(v) => validatePickupLevel(editingPickup, v)}
          onConfirm={(v) => {
            setPickupLevel(editingPickup.attrKey, editingPickup.skillKey, v);
            setEditingPickup(null);
          }}
          onClose={() => setEditingPickup(null)}
        />
      )}

      {editingRef && (
        <ValueInputModal
          type="number"
          title={editingRef.label}
          initial={packageLevel(editingRef)}
          min={0}
          max={6}
          validate={(v) => validatePackageLevel(editingRef, v)}
          onConfirm={(v) => {
            setPackageLevel(editingRef, v);
            setEditingRef(null);
          }}
          onClose={() => setEditingRef(null)}
        />
      )}
    </>
  );
}
