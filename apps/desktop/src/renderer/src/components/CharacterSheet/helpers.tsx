import type React from "react";

export interface ColDef {
  key: string;
  label: string;
  type?: string;
}
export interface DynRow {
  id?: string;
  [key: string]: unknown;
}

interface CounterProps {
  current: number;
  max: number;
  label: string;
  readOnly?: boolean;
  onChange: (v: number) => void;
  layout?: "row" | "card";
}
export function Counter({
  current,
  max,
  label,
  readOnly,
  onChange,
  layout = "row",
}: CounterProps) {
  const body = readOnly ? (
    <span className="counter-readonly">
      {current} <span className="max">/ {max}</span>
    </span>
  ) : (
    <div className="counter">
      <button type="button" onClick={() => onChange(Math.max(0, current - 1))}>
        −
      </button>
      <span className="value">{current}</span>
      <span className="max">/ {max}</span>
      <button type="button" onClick={() => onChange(Math.min(max, current + 1))}>
        +
      </button>
    </div>
  );

  if (layout === "card") {
    return (
      <div className="vital-card">
        <div className="vital-card-label">{label}</div>
        {body}
      </div>
    );
  }

  return (
    <div className="vital-row">
      <span className="vital-label">{label}</span>
      {body}
    </div>
  );
}

interface NumInputProps {
  value?: number;
  onChange: (v: number) => void;
  className?: string;
  readOnly?: boolean;
}
export function NumInput({ value, onChange, className = "", readOnly }: NumInputProps) {
  if (readOnly)
    return <span className={`readonly-value ${className}`}>{value ?? 0}</span>;
  return (
    <input
      type="number"
      className={className}
      value={value ?? 0}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
    />
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  readOnly?: boolean;
}
export function TextInput({ value, onChange, readOnly, ...props }: TextInputProps) {
  if (readOnly) return <span className="readonly-value">{value || "—"}</span>;
  return <input value={value ?? ""} onChange={onChange} {...props} />;
}

interface DynamicTableProps {
  columns: ColDef[];
  rows: DynRow[];
  onChange: (rows: DynRow[]) => void;
  onAdd: (empty: DynRow) => void;
  onRemove: (i: number) => void;
  emptyRow: DynRow;
  readOnly?: boolean;
  renderAddActions?: () => React.ReactNode;
  renderRowActions?: (row: DynRow, index: number) => React.ReactNode;
  rowActionsHeader?: string;
  renderCell?: (row: DynRow, col: ColDef, rowIndex: number) => React.ReactNode | null | undefined;
}
export function DynamicTable({
  columns,
  rows,
  onChange,
  onAdd,
  onRemove,
  emptyRow,
  readOnly,
  renderAddActions,
  renderRowActions,
  rowActionsHeader,
  renderCell,
}: DynamicTableProps) {
  if (readOnly && rows.length === 0) return <p className="readonly-empty">None</p>;
  return (
    <div className="dynamic-table-wrap">
      <table className="dynamic-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {renderRowActions && <th>{rowActionsHeader ?? ""}</th>}
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={(row.id as string) ?? i}>
              {columns.map((col) => (
                <td key={col.key}>
                  {(() => {
                    const custom = renderCell?.(row, col, i);
                    if (custom != null) return custom;
                    if (readOnly) {
                      return (
                        <span>
                          {(row[col.key] as string | number) ??
                            (col.type === "number" ? 0 : "—")}
                        </span>
                      );
                    }
                    return (
                      <input
                        type={col.type === "number" ? "number" : "text"}
                        value={
                          (row[col.key] as string | number) ??
                          (col.type === "number" ? 0 : "")
                        }
                        onChange={(e) => {
                          const val =
                            col.type === "number"
                              ? parseInt(e.target.value, 10) || 0
                              : e.target.value;
                          const updated = [...rows];
                          updated[i] = { ...updated[i], [col.key]: val };
                          onChange(updated);
                        }}
                      />
                    );
                  })()}
                </td>
              ))}
              {renderRowActions && <td>{renderRowActions(row, i)}</td>}
              {!readOnly && (
                <td>
                  <button type="button" className="danger" onClick={() => onRemove(i)}>
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly &&
        (renderAddActions ? (
          <div className="add-actions">{renderAddActions()}</div>
        ) : (
          <button type="button" className="add-row-btn" onClick={() => onAdd(emptyRow)}>
            + Add row
          </button>
        ))}
    </div>
  );
}
