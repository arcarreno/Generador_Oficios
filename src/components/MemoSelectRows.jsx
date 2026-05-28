import { useState, useMemo } from 'react'

export default function MemoSelectRows({ group, onGenerate, onBack }) {
  const [rows, setRows] = useState(() =>
    group.rows.map(r => ({ ...r }))
  )
  const [searchQuery, setSearchQuery] = useState('')

  const toggleRow = (idx) => {
    setRows(prev => prev.map(r => r._idx === idx ? { ...r, selected: !r.selected } : r))
  }

  const selectAll = () => {
    setRows(prev => prev.map(r => ({ ...r, selected: true })))
  }

  const deselectAll = () => {
    setRows(prev => prev.map(r => ({ ...r, selected: false })))
  }

  const selectedCount = useMemo(() => rows.filter(r => r.selected).length, [rows])
  const selectedRows = useMemo(() => rows.filter(r => r.selected), [rows])

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.trim().toLowerCase()
    return rows.filter(r =>
      r.st.toLowerCase().includes(q) ||
      r.ciudadano.toLowerCase().includes(q)
    )
  }, [rows, searchQuery])

  return (
    <div className="memo-select-screen">
      <div className="memo-select-header">
        <button className="btn btn-secondary" onClick={onBack}>← Volver</button>
        <div className="memo-select-header-info">
          <h2 className="memo-select-title">{group.label}</h2>
          <span className="memo-select-count">{selectedCount} de {rows.length} seleccionados</span>
        </div>
        <input
          className="memo-search-input"
          type="text"
          placeholder="Buscar por ST o Ciudadano..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div className="memo-select-actions">
          <button className="btn btn-sm" onClick={selectAll}>Seleccionar todos</button>
          <button className="btn btn-sm" onClick={deselectAll}>Deseleccionar todos</button>
          <button
            className="btn btn-primary"
            disabled={selectedCount === 0}
            onClick={() => onGenerate(selectedRows, group)}
          >
            Generar Memorandum
          </button>
        </div>
      </div>

      <div className="memo-select-table-wrapper">
        <table className="memo-select-table">
          <thead>
            <tr>
              <th className="col-check"></th>
              <th className="col-no">No.</th>
              <th className="col-st">ST</th>
              <th className="col-oficio">OFICIO RECIBIDO</th>
              <th className="col-ciudadano">CIUDADANO</th>
              <th className="col-fecha">FECHA RECIBIDO</th>
              <th className="col-peticion">PETICIÓN</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(r => (
              <tr
                key={r._idx}
                className={`memo-select-row${r.selected ? ' selected' : ''}`}
                onClick={() => toggleRow(r._idx)}
              >
                <td className="col-check" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={() => toggleRow(r._idx)}
                    className="memo-checkbox"
                  />
                </td>
                <td className="col-no">{r._no}</td>
                <td className="col-st">{r.st}</td>
                <td className="col-oficio">{r.oficioRecibido}</td>
                <td className="col-ciudadano">{r.ciudadano}</td>
                <td className="col-fecha">{r.fechaRecibido}</td>
                <td className="col-peticion">{r.peticion}</td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr><td colSpan={7} className="memo-no-rows">
                {searchQuery ? 'No se encontraron resultados para tu búsqueda.' : 'No hay solicitudes para este tipo'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .memo-select-screen {
          min-height: 100vh;
          background: #fff;
          display: flex;
          flex-direction: column;
        }
        .memo-select-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #fff;
          border-bottom: 1px solid #e0e0e0;
          flex-wrap: wrap;
        }
        .memo-select-header-info {
          flex: 1;
        }
        .memo-select-title {
          color: #333;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }
        .memo-select-count {
          color: #888;
          font-size: 0.85rem;
        }
        .memo-search-input {
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          border-radius: 0.5rem;
          font-size: 0.85rem;
          font-family: inherit;
          outline: none;
          width: 240px;
          transition: border-color 0.15s;
        }
        .memo-search-input:focus {
          border-color: #7D2447;
          box-shadow: 0 0 0 2px rgba(125,36,71,0.1);
        }
        .memo-select-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .btn-sm {
          background: #f5f5f5;
          border: 1px solid #ddd;
          color: #555;
          padding: 0.4rem 0.8rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.15s;
        }
        .btn-sm:hover {
          background: #eee;
        }
        .memo-select-table-wrapper {
          flex: 1;
          overflow: auto;
          border-radius: 0.75rem;
          border: 1px solid #e0e0e0;
          background: #fff;
        }
        .memo-select-table {
          width: 100%;
          border-collapse: collapse;
          color: #333;
          font-size: 0.85rem;
        }
        .memo-select-table th {
          background: #7D2447;
          padding: 0.75rem 0.6rem;
          text-align: left;
          font-weight: 600;
          color: #fff;
          position: sticky;
          top: 0;
          white-space: nowrap;
        }
        .memo-select-table td {
          padding: 0.6rem;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }
        .memo-select-row {
          cursor: pointer;
          transition: background 0.1s;
        }
        .memo-select-row:hover {
          background: #f9f0f3;
        }
        .memo-select-row.selected {
          background: #f2e6eb;
        }
        .col-check { width: 40px; text-align: center; }
        .col-no { width: 50px; }
        .col-st { width: 70px; }
        .col-fecha { width: 100px; white-space: nowrap; }
        .memo-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #7D2447;
          cursor: pointer;
        }
        .memo-no-rows {
          text-align: center;
          padding: 2rem;
          color: #aaa;
        }
      `}</style>
    </div>
  )
}
