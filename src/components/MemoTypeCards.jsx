import { useMemo } from 'react'

export default function MemoTypeCards({ groups, onSelect, onBack }) {
  const sorted = useMemo(() => {
    return [...groups].sort((a, b) => a.order - b.order)
  }, [groups])

  if (sorted.length === 0) {
    return (
      <div className="memo-empty">
        <p>No se encontraron tipos de memorandum en este archivo.</p>
        <button className="btn btn-secondary" onClick={onBack}>← Volver</button>
      </div>
    )
  }

  return (
    <div className="memo-cards-screen">
      <div className="memo-cards-header">
        <button className="btn btn-secondary" onClick={onBack}>← Volver</button>
        <h2 className="memo-cards-title">Selecciona el tipo de memorandum</h2>
      </div>

      <div className="memo-cards-grid">
        {sorted.map((group) => (
          <button
            key={group.key}
            className="memo-card"
            onClick={() => onSelect(group)}
          >
            <div className="memo-card-count">{group.rows.length}</div>
            <div className="memo-card-label">{group.label}</div>
            <div className="memo-card-sub">{group.rows.length} solicitud{group.rows.length !== 1 ? 'es' : ''}</div>
          </button>
        ))}
      </div>

      <style>{`
        .memo-cards-screen {
          min-height: 100vh;
          background: #fff;
          padding: 2rem;
        }
        .memo-cards-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .memo-cards-title {
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
        }
        .memo-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .memo-card {
          position: relative;
          border: 2px solid #7D2447;
          border-radius: 1.25rem;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #000;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .memo-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(125,36,71,0.15);
          border-color: #9B3059;
        }
        .memo-card-count {
          font-size: 3rem;
          font-weight: 700;
          color: #7D2447;
          margin-bottom: 0.5rem;
          line-height: 1;
        }
        .memo-card-label {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #000;
        }
        .memo-card-sub {
          font-size: 0.85rem;
          color: #666;
        }
        .memo-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          color: #999;
          gap: 1rem;
        }
      `}</style>
    </div>
  )
}
