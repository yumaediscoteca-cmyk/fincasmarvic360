import React, { useState } from 'react'

interface SelectWithOtherProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  onCreateNew: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
}

export default function SelectWithOther({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = 'Seleccionar...',
  label,
  required,
}: SelectWithOtherProps) {
  const [showInput, setShowInput] = useState(false)
  const [newText, setNewText] = useState('')

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value
    if (selected === '__other__') {
      setShowInput(true)
      setNewText('')
    } else {
      setShowInput(false)
      onChange(selected)
    }
  }

  function handleSave() {
    const trimmed = newText.trim()
    if (!trimmed) return
    onCreateNew(trimmed)
    onChange(trimmed)
    setShowInput(false)
    setNewText('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setShowInput(false)
    }
  }

  const selectValue = showInput ? '__other__' : (value || '')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-200">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <select
        value={selectValue}
        onChange={handleSelectChange}
        required={required}
        className="w-full rounded border border-slate-600 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value="__other__">Otros / Añadir nuevo</option>
      </select>

      {showInput && (
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe el nuevo valor..."
            autoFocus
            className="flex-1 rounded border border-slate-600 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!newText.trim()}
            className="px-3 py-2 rounded bg-sky-400 text-slate-900 text-sm font-medium disabled:opacity-40"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setShowInput(false)}
            className="px-3 py-2 rounded border border-slate-600 text-slate-300 text-sm"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
