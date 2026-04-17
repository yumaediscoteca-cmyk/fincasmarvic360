import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map as MapIcon, ChevronRight, ArrowLeft, Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { FINCAS_DATA as FINCAS } from '../constants/farms';

export default function FarmSelector() {
  const navigate  = useNavigate();
  const { theme } = useTheme();
  const isDark    = theme === 'dark';

  const resumenFincas = useMemo(() => {
    const n = FINCAS.length;
    const totalHa = FINCAS.reduce((s, f) => s + f.ha, 0);
    const totalSectores = FINCAS.reduce((s, f) => s + f.sectores, 0);
    return { n, totalHa, totalSectores };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">

      {/* BARRA SUPERIOR */}
      <header className="w-full bg-white/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 pl-14 pr-6 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-[#6d9b7d] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
        </button>
        <span className="text-[10px] text-slate-300 dark:text-slate-600">|</span>
        <div className="flex items-center gap-2">
          <MapIcon className="w-3.5 h-3.5 text-[#22c55e]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Seleccionar Finca
          </span>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="flex-1 flex flex-col items-center px-6 py-10">

        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/MARVIC_logo.png"
              className="h-7 opacity-80"
              style={{ filter: isDark ? 'brightness(0) invert(1)' : 'none' }}
            />
            <div className="h-px flex-1 bg-gradient-to-r from-[#22c55e]/30 to-transparent" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500 [font-variant-numeric:tabular-nums]">
              {resumenFincas.n} fincas · {resumenFincas.totalHa.toFixed(2)} ha · {resumenFincas.totalSectores} sectores
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FINCAS.map((f) => (
              <button
                key={f.nombre}
                onClick={() => navigate(`/farm/${encodeURIComponent(f.nombre)}`)}
                className="group text-left p-4 rounded-xl border bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 hover:border-[#22c55e]/50 hover:shadow-md dark:hover:shadow-none hover:scale-[1.01] transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#22c55e]/10">
                      <MapIcon className="w-4 h-4 text-[#22c55e]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wide leading-tight">
                        {f.nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Activity className="w-2.5 h-2.5" />{f.sectores} sectores
                        </span>
                        <span className="text-[9px] text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">{f.ha} ha</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#22c55e] transition-colors mt-1" />
                </div>
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
