import { ATTRIBUTES } from "@wilmak/game-data";

interface Props {
  name: string;
  race: string;
  occupation: string;
  level: number;
  attributes: Record<string, number>;
  packageUsed: number;
  pickupUsed: number;
  pickupBudget: number;
}

export default function ReviewTab({
  name,
  race,
  occupation,
  level,
  attributes,
  packageUsed,
  pickupUsed,
  pickupBudget,
}: Props) {
  return (
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
  );
}
