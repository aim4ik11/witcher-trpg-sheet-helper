import { RACES, OCCUPATIONS } from '@wilmak/game-data';
import './RaceOccupationSelect.css';

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  required?: boolean;
}

export function RaceSelect({ value, onChange, id, required }: SelectProps) {
  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required}>
      {RACES.map((race) => (
        <option key={race.value || 'empty'} value={race.value}>{race.label}</option>
      ))}
    </select>
  );
}

export function OccupationSelect({ value, onChange, id, required }: SelectProps) {
  return (
    <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={required}>
      {OCCUPATIONS.map((occ) => (
        <option key={occ.value || 'empty'} value={occ.value}>{occ.label}</option>
      ))}
    </select>
  );
}

export function RaceOccupationDisplay({ race, occupation }: { race?: string; occupation?: string }) {
  return (
    <>
      {race && <span>{race}</span>}
      {occupation && <span>{occupation}</span>}
    </>
  );
}
