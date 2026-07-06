import type { HitLocation } from "@wilmak/shared";
import { AIM_LOCATION_PENALTIES } from "@wilmak/game-data";

interface Props {
  aimLocation: HitLocation | "";
  onAimLocationChange: (loc: HitLocation | "") => void;
  customModifier: string;
  onCustomModifierChange: (val: string) => void;
  targetDodging: boolean;
  onTargetDodgingChange: (v: boolean) => void;
  fastDraw: boolean;
  onFastDrawChange: (v: boolean) => void;
  ambush: boolean;
  onAmbushChange: (v: boolean) => void;
  outsideVisionCone: boolean;
  onOutsideVisionConeChange: (v: boolean) => void;
}

export default function AttackModifiers({
  aimLocation, onAimLocationChange,
  customModifier, onCustomModifierChange,
  targetDodging, onTargetDodgingChange,
  fastDraw, onFastDrawChange,
  ambush, onAmbushChange,
  outsideVisionCone, onOutsideVisionConeChange,
}: Props) {
  return (
    <fieldset className="attack-modifiers">
      <legend>Modifiers</legend>
      <div className="attack-mod-toprow">
        <div className="field">
          <label>Aim location</label>
          <select
            value={aimLocation}
            onChange={(e) => onAimLocationChange(e.target.value as HitLocation | "")}
          >
            <option value="">Unaimed</option>
            {Object.entries(AIM_LOCATION_PENALTIES).map(([loc, pen]) => (
              <option key={loc} value={loc}>{loc} ({pen})</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Custom modifier</label>
          <input
            type="number"
            value={customModifier}
            onChange={(e) => onCustomModifierChange(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div className="attack-mod-checks">
        <label className="attack-mod-check" data-sign="neg">
          <input type="checkbox" checked={targetDodging} onChange={(e) => onTargetDodgingChange(e.target.checked)} />
          <div className="attack-mod-check-body">
            <div className="attack-mod-check-head">
              <span className="attack-mod-check-name">Target dodging</span>
              <span className="attack-mod-check-val attack-mod-check-val--neg">−2</span>
            </div>
            <span className="attack-mod-check-desc">Target actively evading</span>
          </div>
        </label>
        <label className="attack-mod-check" data-sign="pos">
          <input type="checkbox" checked={ambush} onChange={(e) => onAmbushChange(e.target.checked)} />
          <div className="attack-mod-check-body">
            <div className="attack-mod-check-head">
              <span className="attack-mod-check-name">Ambush</span>
              <span className="attack-mod-check-val attack-mod-check-val--pos">+5</span>
            </div>
            <span className="attack-mod-check-desc">Target is unaware</span>
          </div>
        </label>
        <label className="attack-mod-check" data-sign="neg">
          <input type="checkbox" checked={fastDraw} onChange={(e) => onFastDrawChange(e.target.checked)} />
          <div className="attack-mod-check-body">
            <div className="attack-mod-check-head">
              <span className="attack-mod-check-name">Fast draw</span>
              <span className="attack-mod-check-val attack-mod-check-val--neg">−3</span>
            </div>
            <span className="attack-mod-check-desc">Draw and strike in one action</span>
          </div>
        </label>
        <label className="attack-mod-check" data-sign="neg">
          <input type="checkbox" checked={outsideVisionCone} onChange={(e) => onOutsideVisionConeChange(e.target.checked)} />
          <div className="attack-mod-check-body">
            <div className="attack-mod-check-head">
              <span className="attack-mod-check-name">Outside vision cone</span>
              <span className="attack-mod-check-val attack-mod-check-val--neg">−3</span>
            </div>
            <span className="attack-mod-check-desc">Rear or blind spot</span>
          </div>
        </label>
      </div>
    </fieldset>
  );
}
