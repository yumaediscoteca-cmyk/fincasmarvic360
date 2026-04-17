interface RecordActionsProps {
  /** Si no se pasa, no se muestra el botón Editar (p. ej. historial solo lectura). */
  onEdit?: () => void
  onDelete: () => void
  confirmMessage?: string
}

export default function RecordActions({
  onEdit,
  onDelete,
  confirmMessage = '¿Eliminar este registro?',
}: RecordActionsProps) {
  function handleDelete() {
    if (window.confirm(confirmMessage)) {
      onDelete()
    }
  }

  return (
    <div className="flex gap-3 justify-end">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Editar
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        className="text-sm text-red-500/70 hover:text-red-400 transition-colors"
      >
        Eliminar
      </button>
    </div>
  )
}
