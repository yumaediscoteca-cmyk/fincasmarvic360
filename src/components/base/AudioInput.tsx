import React, { useRef, useState } from 'react'

interface AudioInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  rows?: number
}

// Extiende Window para reconocimiento de voz (no estándar en todos los navegadores)
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export default function AudioInput({
  value,
  onChange,
  placeholder,
  label,
  rows = 3,
}: AudioInputProps) {
  const [recording, setRecording] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const SpeechAPI =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null

  function startDictation() {
    if (!SpeechAPI) return
    if (recording) {
      recognitionRef.current?.stop()
      return
    }

    const rec = new SpeechAPI()
    rec.lang = 'es-ES'
    rec.interimResults = false
    rec.maxAlternatives = 1

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      onChange(value ? value + ' ' + transcript : transcript)
    }

    rec.onerror = () => {
      setRecording(false)
    }

    rec.onend = () => {
      setRecording(false)
    }

    recognitionRef.current = rec
    rec.start()
    setRecording(true)
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-200">{label}</label>
      )}

      <div className="relative">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded border border-slate-600 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-sky-400 resize-y pr-10"
        />

        {SpeechAPI && (
          <button
            type="button"
            onClick={startDictation}
            title={recording ? 'Detener dictado' : 'Dictar'}
            className={`absolute top-2 right-2 p-1 rounded transition-colors ${
              recording
                ? 'text-red-400 bg-red-400/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="9" y1="22" x2="15" y2="22" />
            </svg>
          </button>
        )}
      </div>

      {recording && (
        <p className="text-xs text-red-400">Escuchando... (pulsa el icono para detener)</p>
      )}
    </div>
  )
}
