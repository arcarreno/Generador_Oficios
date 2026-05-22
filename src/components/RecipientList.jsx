export default function RecipientList({ recipients, onSelect, onBack }) {
  return (
    <div className="recipient-container">
      <div className="recipient-header">
        <h2>Destinatarios encontrados</h2>
        <button className="btn btn-secondary" onClick={onBack}>← Volver</button>
      </div>
      <p className="recipient-subtitle">
        Se encontraron {recipients.length} destinatarios. Selecciona uno para generar su oficio:
      </p>
      <div className="recipient-grid">
        {recipients.map((r, idx) => (
          <button
            key={`${r.name}-${idx}`}
            className="btn recipient-card"
            onClick={() => onSelect(r)}
          >
            <span className="recipient-name">{r.name}</span>
            <span className="recipient-count">{r.rows.length} solicitudes</span>
          </button>
        ))}
      </div>
    </div>
  )
}
