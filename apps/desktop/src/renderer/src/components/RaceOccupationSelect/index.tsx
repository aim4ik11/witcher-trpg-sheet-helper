import {
  RACES,
  raceLabel,
  occupationLabel,
  occupationsForRace,
  normalizeRace,
  normalizeOccupation,
  reconcileOccupation,
} from "@wilmak/game-data";
import "./RaceOccupationSelect.css";

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  required?: boolean;
}

export function RaceSelect({ value, onChange, id, required }: SelectProps) {
  const normalized = normalizeRace(value);
  return (
    <select
      id={id}
      value={normalized}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      {RACES.map((race) => (
        <option key={race.value || "empty"} value={race.value}>
          {race.label}
        </option>
      ))}
    </select>
  );
}

interface OccupationSelectProps extends SelectProps {
  race?: string;
}

export function OccupationSelect({
  value,
  onChange,
  race = "",
  id,
  required,
}: OccupationSelectProps) {
  const normalizedRace = normalizeRace(race);
  const options = occupationsForRace(normalizedRace);
  const normalizedValue = reconcileOccupation(normalizedRace, value) || value || "";

  return (
    <select
      id={id}
      value={options.some((o) => o.value === normalizedValue) ? normalizedValue : ""}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      {options.map((occ) => (
        <option key={occ.value || "empty"} value={occ.value}>
          {occ.label}
        </option>
      ))}
    </select>
  );
}

export function RaceOccupationDisplay({
  race,
  occupation,
}: {
  race?: string;
  occupation?: string;
}) {
  const r = normalizeRace(race);
  const o = reconcileOccupation(r, occupation) || normalizeOccupation(occupation ?? "");
  return (
    <>
      {r && <span>{raceLabel(r)}</span>}
      {o && <span>{occupationLabel(o)}</span>}
    </>
  );
}

/** When race changes, clear or fix incompatible occupation. */
export function occupationAfterRaceChange(race: string, occupation: string): string {
  return reconcileOccupation(normalizeRace(race), occupation);
}
