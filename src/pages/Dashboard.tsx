import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const horaStr = now.toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit',
  });

  const fechaStr = now.toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500"
      style={{
        background: isDark
          ? 'radial-gradient(ellipse at 50% 40%, #0f2235 0%, #070f1a 55%, #020812 100%)'
          : 'radial-gradient(ellipse at 50% 40%, #dbeafe 0%, #e8f4fd 45%, #f0f7ff 100%)',
      }}
    >

      {/* Botón tema — esquina superior derecha */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className={`fixed top-3 right-4 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors
          ${isDark
            ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            : 'bg-white/80 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white'
          } backdrop-blur-sm`}
      >
        {isDark
          ? <><Sun size={14} /><span className="hidden sm:inline">Claro</span></>
          : <><Moon size={14} /><span className="hidden sm:inline">Oscuro</span></>
        }
      </button>

      {/* Halo de fondo decorativo */}
      <div
        className="absolute pointer-events-none rounded-full blur-[140px] opacity-30"
        style={{
          width: 600,
          height: 300,
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: isDark ? '#38bdf8' : '#3b82f6',
        }}
      />

      {/* Contenido centrado */}
      <div className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">

        {/* Logo */}
        <img
          src="/MARVIC_logo.png"
          alt="Agrícola Marvic"
          className="w-full max-w-xs sm:max-w-sm md:max-w-md select-none"
          draggable={false}
          style={{
            filter: isDark
              ? 'brightness(0) invert(1) drop-shadow(0 0 32px rgba(56,189,248,0.25))'
              : 'drop-shadow(0 2px 16px rgba(59,130,246,0.18))',
          }}
        />

        {/* Separador */}
        <div
          className="h-px w-48 rounded-full"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent, rgba(56,189,248,0.5), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)',
          }}
        />

        {/* Fecha y hora */}
        <div className="flex flex-col items-center gap-2">
          <p
            className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight"
            style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
          >
            {horaStr}
          </p>
          <p
            className="text-sm sm:text-base font-medium capitalize tracking-wide"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            {fechaStr}
          </p>
        </div>

      </div>

      {/* Versión — esquina inferior */}
      <p
        className="fixed bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-widest z-10"
        style={{ color: isDark ? '#334155' : '#94a3b8' }}
      >
        Agrícola Marvic 360 · v4.0
      </p>

    </div>
  );
}
