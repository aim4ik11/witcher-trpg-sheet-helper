import { normalizeNickname } from "../../../../utils/session";
import { RaceSelect, OccupationSelect } from "../../../RaceOccupationSelect";

interface Props {
  name: string;
  onNameChange: (v: string) => void;
  race: string;
  onRaceChange: (v: string) => void;
  occupation: string;
  onOccupationChange: (v: string) => void;
  nickname: string;
  onNicknameChange: (v: string) => void;
}

export default function IdentityTab({
  name,
  onNameChange,
  race,
  onRaceChange,
  occupation,
  onOccupationChange,
  nickname,
  onNicknameChange,
}: Props) {
  return (
    <>
      <div className="field">
        <label>Name <span className="required">*</span></label>
        <input value={name} onChange={(e) => onNameChange(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Race</label>
        <RaceSelect value={race} onChange={onRaceChange} />
      </div>
      <div className="field">
        <label>Occupation</label>
        <OccupationSelect race={race} value={occupation} onChange={onOccupationChange} />
      </div>
      <div className="field">
        <label>Player nickname</label>
        <input
          value={nickname}
          onChange={(e) => onNicknameChange(normalizeNickname(e.target.value))}
          placeholder="Leave blank to create an unassigned preset"
        />
      </div>
    </>
  );
}
