import { useState } from "react";
import type { Character, Spell } from "@wilmak/shared";
import { spellsForCategory } from "@wilmak/game-data";
import SpellDetailModal, { SpellNameButton } from "../SpellDetailModal";
import "../SpellDetailModal/SpellDetailModal.css";

interface MagicSection {
  key: string;
  label: string;
}

interface Props {
  character: Character;
  magicSections: MagicSection[];
}

export default function MagicTab({ character, magicSections }: Props) {
  const [detailSpell, setDetailSpell] = useState<Spell | null>(null);

  return (
    <>
      {magicSections.map((section) => {
        const rows = spellsForCategory(character.spells, section.key);
        return (
          <section key={section.key} className="panel">
            <div className="panel-title">{section.label}</div>
            {rows.length === 0 ? (
              <p className="readonly-empty">None</p>
            ) : (
              <>
                <p className="spell-table-hint">Tap a spell name for full details.</p>
                <div className="dynamic-table-wrap">
                  <table className="dynamic-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>STA</th>
                        <th>Defense</th>
                        <th>Range</th>
                        <th>Duration</th>
                        <th>Effect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s) => (
                        <tr key={s.id ?? s.name}>
                          <td>
                            <SpellNameButton spell={s} onOpen={setDetailSpell} />
                          </td>
                          <td>{s.staCostText || s.staCost || "—"}</td>
                          <td>{s.defense ?? "—"}</td>
                          <td>{s.range || "—"}</td>
                          <td>{s.duration || "—"}</td>
                          <td>{s.effect || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        );
      })}

      {detailSpell && (
        <SpellDetailModal spell={detailSpell} onClose={() => setDetailSpell(null)} />
      )}
    </>
  );
}
