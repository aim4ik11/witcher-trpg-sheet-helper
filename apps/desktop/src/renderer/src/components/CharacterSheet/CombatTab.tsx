import type { Character, Weapon } from "@wilmak/shared";
import { ARMOR_LABELS } from "@wilmak/game-data";
import { DynamicTable, NumInput, TextInput } from "./helpers";
import type { DynRow } from "./helpers";

const WEAPON_EMPTY: Partial<Weapon> = {
  name: "",
  type: "",
  wa: 0,
  dmg: "",
  rel: "",
  hand: "",
  rng: "",
  effect: "",
  conc: "",
  enhancements: "",
  weight: 0,
};

interface PickerState {
  kind: "weapon" | "armor" | "magic";
  slotIndex?: number;
  slot?: string;
  category?: string;
  label?: string;
}

interface Props {
  character: Character;
  update: (patch: Partial<Character>) => void;
  updateNested: (path: string[], value: unknown) => void;
  readOnly: boolean;
  setPicker: (s: PickerState | null) => void;
}

export default function CombatTab({
  character,
  update,
  updateNested,
  readOnly,
  setPicker,
}: Props) {
  return (
    <>
      <section className="panel">
        <div className="panel-title">Weapons</div>
        <DynamicTable
          readOnly={readOnly}
          columns={[
            { key: "name", label: "Name" },
            { key: "type", label: "T" },
            { key: "wa", label: "WA", type: "number" },
            { key: "dmg", label: "DMG" },
            { key: "rel", label: "Rel" },
            { key: "hand", label: "Hand" },
            { key: "rng", label: "RNG" },
            { key: "effect", label: "Effect" },
            { key: "conc", label: "Conc." },
            { key: "enhancements", label: "EN" },
            { key: "weight", label: "Wt", type: "number" },
          ]}
          rows={(character.weapons ?? []) as unknown as DynRow[]}
          onChange={(rows) => update({ weapons: rows as unknown as Weapon[] })}
          onAdd={() => {}}
          onRemove={(i) =>
            update({ weapons: character.weapons!.filter((_, idx) => idx !== i) })
          }
          emptyRow={WEAPON_EMPTY as DynRow}
          renderAddActions={() => (
            <button
              type="button"
              className="primary"
              onClick={() => setPicker({ kind: "weapon" })}
            >
              + Add from catalog
            </button>
          )}
        />
      </section>

      <section className="panel bonus-melee">
        <div className="panel-title">Bonus Melee</div>
        <div className="stat-grid">
          <label>
            Punch{" "}
            <TextInput
              readOnly={readOnly}
              value={character.bonusMelee?.punch ?? ""}
              onChange={(e) => updateNested(["bonusMelee", "punch"], e.target.value)}
            />
          </label>
          <label>
            Kick{" "}
            <TextInput
              readOnly={readOnly}
              value={character.bonusMelee?.kick ?? ""}
              onChange={(e) => updateNested(["bonusMelee", "kick"], e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Armor</div>
        <table>
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
            {(character.armor ?? []).map((piece, i) => (
              <tr key={piece.slot}>
                <td>{ARMOR_LABELS[piece.slot] ?? piece.slot}</td>
                <td>
                  <div className="armor-name-cell">
                    {piece.name && (
                      <span className="armor-piece-name">{piece.name}</span>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        className="armor-pick-btn"
                        onClick={() =>
                          setPicker({ kind: "armor", slotIndex: i, slot: piece.slot })
                        }
                      >
                        {piece.name ? "Change" : "Pick armor"}
                      </button>
                    )}
                    {readOnly && !piece.name && (
                      <span className="readonly-value">—</span>
                    )}
                  </div>
                </td>
                <td>
                  <NumInput
                    readOnly={readOnly}
                    value={piece.sp}
                    onChange={(v) => {
                      const a = [...character.armor!];
                      a[i] = { ...a[i], sp: v };
                      update({ armor: a });
                    }}
                  />
                </td>
                <td>
                  <NumInput
                    readOnly={readOnly}
                    value={piece.damage}
                    onChange={(v) => {
                      const a = [...character.armor!];
                      a[i] = { ...a[i], damage: v };
                      update({ armor: a });
                    }}
                  />
                </td>
                <td>
                  <TextInput
                    readOnly={readOnly}
                    value={piece.effects ?? ""}
                    onChange={(e) => {
                      const a = [...character.armor!];
                      a[i] = { ...a[i], effects: e.target.value };
                      update({ armor: a });
                    }}
                  />
                </td>
                <td>
                  <NumInput
                    readOnly={readOnly}
                    value={piece.weight}
                    onChange={(v) => {
                      const a = [...character.armor!];
                      a[i] = { ...a[i], weight: v };
                      update({ armor: a });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {readOnly ? (
          character.armorNotes ? (
            <p className="readonly-notes">{character.armorNotes}</p>
          ) : null
        ) : (
          <textarea
            className="armor-notes"
            placeholder="Armor notes..."
            value={character.armorNotes ?? ""}
            onChange={(e) => update({ armorNotes: e.target.value })}
            rows={2}
          />
        )}
      </section>
    </>
  );
}
