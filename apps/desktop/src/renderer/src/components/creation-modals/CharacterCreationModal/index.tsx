import { useEffect, useMemo, useState } from "react";
import type { Character } from "@wilmak/shared";
import {
  defaultAttributes,
  validateCharacterCreation,
  validateCreationAttributes,
  professionPackageRefs,
  professionPackagePointsUsed,
  pickupSkillBudget,
  pickupSkillPointsUsed,
  coreAbilityId,
} from "@wilmak/game-data";
import { normalizeNickname } from "../../../utils/session";
import { occupationAfterRaceChange } from "../../RaceOccupationSelect";
import Modal from "../../Modal";
import IdentityTab from "./tabs/IdentityTab";
import StatsTab from "./tabs/StatsTab";
import SkillsTab from "./tabs/SkillsTab";
import ReviewTab from "./tabs/ReviewTab";
import "./CharacterCreationModal.css";

interface Props {
  onSubmit: (data: Partial<Character>) => void;
  onClose: () => void;
}

type Tab = "identity" | "stats" | "skills" | "review";

const TABS: { id: Tab; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "stats", label: "Stats" },
  { id: "skills", label: "Skills" },
  { id: "review", label: "Review" },
];

export default function CharacterCreationModal({ onSubmit, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("identity");
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [occupation, setOccupation] = useState("");
  const [nickname, setNickname] = useState("");
  const [pointBuy, setPointBuy] = useState(70);
  const [level, setLevel] = useState(1);
  const [attributes, setAttributes] = useState(defaultAttributes);
  const [skills, setSkills] = useState<Record<string, Record<string, { level: number }>>>({});
  const [professionTree, setProfessionTree] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  const packageRefs = useMemo(() => professionPackageRefs(occupation), [occupation]);
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
    setOccupation((prev) => occupationAfterRaceChange(race, prev));
  }, [race]);

  useEffect(() => {
    setSkills({});
    setProfessionTree({});
  }, [occupation]);

  function handleCreate() {
    const creation = { complete: true, pointBuy, level };
    const err =
      (!name.trim() ? "Name is required" : null) ??
      (!race || !occupation ? "Race and occupation are required" : null) ??
      validateCreationAttributes(attributes, pointBuy) ??
      validateCharacterCreation({ race, occupation, attributes, skills, professionTree, creation });
    if (err) {
      setError(err);
      return;
    }
    const coreId = coreAbilityId(occupation);
    onSubmit({
      name: name.trim(),
      race,
      occupation,
      ...(normalizeNickname(nickname) && { nickname: normalizeNickname(nickname) }),
      type: "player",
      attributes,
      skills,
      professionTree,
      definingSkillLevel: professionTree[coreId],
      creation,
      improvementPoints: { ip: 0, trainingIp: 0 },
    });
  }

  function switchTab(t: Tab) {
    setError("");
    setTab(t);
  }

  return (
    <Modal
      title="New player character"
      size="xl"
      onClose={onClose}
      subheader={
        <div className="wizard-tabs" role="tablist" aria-label="Creation steps">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`wizard-tab${tab === id ? " active" : ""}`}
              onClick={() => switchTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      }
      footer={
        <>
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={handleCreate}>
            Create character
          </button>
        </>
      }
    >
      <div className="create-modal-form">
        {tab === "identity" && (
          <IdentityTab
            name={name}
            onNameChange={setName}
            race={race}
            onRaceChange={setRace}
            occupation={occupation}
            onOccupationChange={setOccupation}
            nickname={nickname}
            onNicknameChange={setNickname}
          />
        )}
        {tab === "stats" && (
          <StatsTab
            pointBuy={pointBuy}
            onPointBuyChange={setPointBuy}
            level={level}
            onLevelChange={setLevel}
            attributes={attributes}
            onAttributeChange={(key, v) => setAttributes((prev) => ({ ...prev, [key]: v }))}
            pickupBudget={pickupBudget}
          />
        )}
        {tab === "skills" && (
          <SkillsTab
            occupation={occupation}
            skills={skills}
            onSkillsChange={setSkills}
            professionTree={professionTree}
            onProfessionTreeChange={setProfessionTree}
            packageRefs={packageRefs}
            packageUsed={packageUsed}
            pickupBudget={pickupBudget}
            pickupUsed={pickupUsed}
          />
        )}
        {tab === "review" && (
          <ReviewTab
            name={name}
            race={race}
            occupation={occupation}
            level={level}
            attributes={attributes}
            packageUsed={packageUsed}
            pickupUsed={pickupUsed}
            pickupBudget={pickupBudget}
          />
        )}
        {error && <p className="modal-error">{error}</p>}
      </div>
    </Modal>
  );
}
