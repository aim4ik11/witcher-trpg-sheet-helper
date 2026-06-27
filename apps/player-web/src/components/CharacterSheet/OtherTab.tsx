import type { Character } from "@wilmak/shared";

interface Props {
  character: Character;
}

export default function OtherTab({ character }: Props) {
  const wounds = character.wounds ?? [];
  const statusEffects = character.statusEffects ?? [];

  return (
    <>
      <section className="panel">
        <div className="panel-title">Wounds</div>
        {wounds.length === 0 ? (
          <p className="readonly-empty">None</p>
        ) : (
          <div className="dynamic-table-wrap">
            <table className="dynamic-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>S/T</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {wounds.map((w) => (
                  <tr key={w.id ?? w.description}>
                    <td>{w.description}</td>
                    <td>{w.severity}</td>
                    <td>{w.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">Status Effects</div>
        {statusEffects.length === 0 ? (
          <p className="readonly-empty">None</p>
        ) : (
          <ul className="status-effects-list">
            {statusEffects.map((e) => (
              <li key={e.id ?? e.description}>{e.description}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
