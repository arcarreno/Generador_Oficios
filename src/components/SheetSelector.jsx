export default function SheetSelector({ sheets, onSelect, error }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Selecciona la hoja de datos</h2>
        <p>Se detectaron las siguientes hojas en el archivo:</p>
        {error && <p className="upload-error">{error}</p>}
        <div className="sheet-list">
          {sheets.map(name => (
            <button
              key={name}
              className="btn btn-sheet"
              onClick={() => onSelect(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
