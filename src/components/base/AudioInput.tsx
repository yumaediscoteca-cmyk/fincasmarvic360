import React, { useEffect, useRef, useState } from 'react'

interface AudioInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  rows?: number
}

type SpeechRecInstance = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}

export default function AudioInput({
  value,
  onChange,
  placeholder,
  label,
  rows = 3,
}: AudioInputProps) {
  const [recording, setRecording] = useState(false)
  const [dictadoError, setDictadoError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecInstance | null>(null)
  /** Evita cierre obsoleto: onresult se dispara después y el `value` del render del click estaría desactualizado. */
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const SpeechAPI: (new () => SpeechRecInstance) | null =
    typeof window !== 'undefined'
      ? ((window as unknown as { SpeechRecognition?: new () => SpeechRecInstance; webkitSpeechRecognition?: new () => SpeechRecInstance })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecInstance }).webkitSpeechRecognition ||
        null)
      : null

  function startDictation() {
    setDictadoError(null)
    if (!SpeechAPI) return
    if (recording) {
      recognitionRef.current?.stop()
      return
    }

    const rec = new SpeechAPI()
    rec.lang = 'es-ES'
    rec.interimResults = false
    rec.maxAlternatives = 1

    rec.onresult = event => {
      const transcript = event.results[0][0].transcript
      const prev = valueRef.current
      onChange(prev ? `${prev} ${transcript}` : transcript)
    }

    rec.onerror = ev => {
      setRecording(false)
      const msg =
        ev.error === 'not-allowed'
          ? 'Permiso de micrófono denegado (revisa ajustes del navegador).'
          : ev.error === 'no-speech'
            ? 'No se detectó voz. Prueba de nuevo.'
            : `Dictado: ${ev.error}`
      setDictadoError(msg)
    }

    rec.onend = () => {
      setRecording(false)
    }

    recognitionRef.current = rec
    try {
      rec.start()
      setRecording(true)
    } catch {
      setDictadoError('No se pudo iniciar el dictado.')
      setRecording(false)
    }
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
        <p className="text-xs text-sky-400">Escuchando… (pulsa el micrófono para detener)</p>
      )}
      {dictadoError && !recording && (
        <p className="text-xs text-amber-400">{dictadoError}</p>
      )}
    </div>
  )
}
