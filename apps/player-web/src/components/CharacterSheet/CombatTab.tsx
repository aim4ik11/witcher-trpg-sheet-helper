import type { Character } from "@wilmak/shared";
import { ARMOR_LABELS } from "@wilmak/game-data";

interface Props {
  character: Character;
}

export default function CombatTab({ character }: Props) {
  const weapons = character.weapons ?? [];
  const armor = character.armor ?? [];
  const punch = character.bonusMelee?.punch;
  const kick = character.bonusMelee?.kick;

  return (
    <>
      <section className="panel">
        <div className="panel-title">Weapons</div>
        {weapons.length === 0 ? (
          <p className="readonly-empty">None</p>
        ) : (
          <div className="dynamic-table-wrap">
            <table className="dynamic-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>WA</th>
                  <th>DMG</th>
                  <th>Rel</th>
                  <th>Hand</th>
                </tr>
              </thead>
              <tbody>
                {weapons.map((w) => (
                  <tr key={w.id ?? w.name}>
                    <td>{w.name}</td>
                    <td>{w.type}</td>
                    <td>{w.wa}</td>
                    <td>{w.dmg}</td>
                    <td>{w.rel}</td>
                    <td>{w.hand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(punch || kick) && (
        <section className="panel">
          <div className="panel-title">Bonus Melee</div>
          <div className="derived-compact-grid">
            <div className="derived-chip">
              <span className="derived-chip-label">Punch</span>
              <span className="derived-chip-value">{punch || "—"}</span>
            </div>
            <div className="derived-chip">
              <span className="derived-chip-label">Kick</span>
              <span className="derived-chip-value">{kick || "—"}</span>
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-title">Armor</div>
        {armor.length === 0 ? (
          <p className="readonly-empty">None</p>
        ) : (
          <div className="dynamic-table-wrap">
            <table className="dynamic-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Piece</th>
                  <th>SP</th>
                  <th>Dam</th>
                  <th>Effects</th>
                  <th>Wt</th>
                </tr>
              </thead>
              <tbody>
                {armor.map((piece) => (
                  <tr key={piece.slot}>
                    <td>{ARMOR_LABELS[piece.slot] ?? piece.slot}</td>
                    <td>{piece.name || "—"}</td>
                    <td>{piece.sp}</td>
                    <td>{piece.damage}</td>
                    <td>{piece.effects || "—"}</td>
                    <td>{piece.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {character.armorNotes && (
          <p className="readonly-notes">{character.armorNotes}</p>
        )}
      </section>
    </>
  );
}
