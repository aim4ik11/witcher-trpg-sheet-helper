import { RACES, OCCUPATIONS } from '../gameOptions';
import './RaceOccupationSelect.css';

export function RaceSelect({ value, onChange, id, required }) {
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      {RACES.map((race) => (
        <option key={race.value || 'empty'} value={race.value}>
          {race.label}
        </option>
      ))}
    </select>
  );
}

export function OccupationSelect({ value, onChange, id, required }) {
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      {OCCUPATIONS.map((occ) => (
        <option key={occ.value || 'empty'} value={occ.value}>
          {occ.label}
        </option>
      ))}
    </select>
  );
}

export function RaceOccupationDisplay({ race, occupation }) {
  return (
    <>
      {race && <span>{race}</span>}
      {occupation && <span>{occupation}</span>}
    </>
  );
}
