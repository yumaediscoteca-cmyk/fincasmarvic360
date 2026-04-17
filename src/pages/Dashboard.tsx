import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, Map as MapIcon, Tractor, AlertTriangle,
  CheckCircle2, Leaf, FileText, CloudRain, Wind,
  Loader2, ClipboardList, ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { generarPDFCorporativoBase, PDF_COLORS, pdfCorporateSection, pdfCorporateTable } from '@/utils/pdfUtils';

// ── Hook de Datos del Dashboard ─────────────────────────────────────────────

function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard_data'],
    queryFn: async () => {
      const hoy = new Date();
      const hoyStr = hoy.toISOString().split('T')[0];
      const hace7dias = new Date(hoy.getTime() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const hace4horas = new Date(hoy.getTime() - 4 * 3600 * 1000).toISOString();

      // 1. KPIs Globales: Parcelas y Hectáreas
      const { data: parcels } = await supabase.from('parcels').select('status, area_hectares');
      let parcelasActivas = 0;
      let haPlantadas = 0;
      for (const p of parcels || []) {
        if (p.status !== 'vacia') parcelasActivas++;
        if (p.status === 'plantada' || p.status === 'en_produccion') haPlantadas += (p.area_hectares || 0);
      }

      // 2. Trabajos de la semana
      const { count: trabajosSemana } = await supabase.from('work_records')
        .select('id', { count: 'exact', head: true })
        .gte('date', hace7dias);

      // 3. Trabajos hoy & Presencia en curso
      const { data: trabajosHoy } = await supabase.from('work_records')
        .select('*, cuadrillas(nombre)')
        .eq('date', hoyStr)
        .order('created_at', { ascending: false });
      
      const wrIds = (trabajosHoy || []).map(w => w.id);
      let presencia: { work_record_id: string | null }[] = [];
      if (wrIds.length > 0) {
        const { data: pres } = await supabase.from('presencia_tiempo_real')
          .select('work_record_id')
          .in('work_record_id', wrIds)
          .eq('activo', true);
        presencia = pres || [];
      }
      const trabajosDelDia = (trabajosHoy || []).map(w => ({
        id: w.id,
        work_type: w.work_type,
        parcel_id: w.parcel_id,
        cuadrilla_nombre: (w as unknown as { cuadrillas?: { nombre: string } }).cuadrillas?.nombre,
        hours_worked: w.hours_worked,
        enCurso: presencia.some(p => p.work_record_id === w.id)
      }));

      // 4. Maquinaria Activa
      const { data: tractoresList } = await supabase.from('maquinaria_tractores').select('id, matricula').eq('activo', true);
      const trMap = new Map<string, string>((tractoresList || []).map(t => [t.id, t.matricula]));

      // Consultamos los trabajos registrados hoy que tengan un tractor asignado
      const { data: usosRaw } = await supabase
        .from('trabajos_registro')
        .select('tractor_id, finca')
        .eq('fecha', hoyStr)
        .not('tractor_id', 'is', null);
      const usos = usosRaw as unknown as { tractor_id: string; finca: string | null }[] | null;

      const { data: posiciones } = await supabase.from('vehicle_positions')
        .select('vehicle_id, latitude, longitude, timestamp')
        .eq('vehicle_type', 'tractor').gte('timestamp', hace4horas).order('timestamp', { ascending: true });

      const activeMachineryMap = new Map<string, { id: string, matricula: string, ubicacion: string, tipo: string }>();
      for (const u of usos || []) {
        if (u.tractor_id && trMap.has(u.tractor_id)) {
          activeMachineryMap.set(u.tractor_id, { id: u.tractor_id, matricula: trMap.get(u.tractor_id) || '—', ubicacion: u.finca || 'En campo', tipo: 'registro' });
        }
      }
      for (const p of posiciones || []) {
        if (p.vehicle_id && trMap.has(p.vehicle_id)) {
          const gpsLabel =
            p.latitude != null && p.longitude != null
              ? `GPS ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`
              : 'En movimiento'
          activeMachineryMap.set(p.vehicle_id, { id: p.vehicle_id, matricula: trMap.get(p.vehicle_id) || '—', ubicacion: gpsLabel, tipo: 'gps' });
        }
      }
      const maquinariaActiva = Array.from(activeMachineryMap.values());

      // 5. Alertas Críticas
      const alertasCriticas: Array<{ id: string, titulo: string, modulo: string }> = [];
      let totalAlertas = 0;

      const { data: trItv } = await supabase.from('maquinaria_tractores').select('matricula, fecha_proxima_itv').eq('activo', true);
      const { data: cmItv } = await supabase.from('camiones').select('matricula, fecha_proxima_itv').eq('activo', true);
      const { data: incidencias } = await supabase.from('trabajos_incidencias').select('id, titulo, urgente').in('estado', ['abierta', 'en_proceso']);

      for (const t of trItv || []) {
        if (!t.fecha_proxima_itv) continue;
        const diff = (new Date(t.fecha_proxima_itv).getTime() - hoy.getTime()) / 86400000;
        if (diff < 0) { alertasCriticas.push({ id: `tr-${t.matricula}`, titulo: `ITV Vencida: ${t.matricula}`, modulo: 'MAQUINARIA' }); totalAlertas++; }
        else if (diff <= 30) totalAlertas++;
      }
      for (const c of cmItv || []) {
        if (!c.fecha_proxima_itv) continue;
        const diff = (new Date(c.fecha_proxima_itv).getTime() - hoy.getTime()) / 86400000;
        if (diff < 0) { alertasCriticas.push({ id: `cm-${c.matricula}`, titulo: `ITV Vencida: ${c.matricula}`, modulo: 'LOGÍSTICA' }); totalAlertas++; }
        else if (diff <= 30) totalAlertas++;
      }
      for (const i of incidencias || []) {
        totalAlertas++;
        if (i.urgente) alertasCriticas.push({ id: i.id, titulo: i.titulo, modulo: 'TRABAJOS' });
      }

      return { kpis: { parcelasActivas, haPlantadas, trabajosSemana: trabajosSemana || 0, alertasActivas: totalAlertas }, trabajosDelDia, maquinariaActiva, alertasCriticas: alertasCriticas.slice(0, 5) };
    },
    refetchInterval: 60000 // Actualiza cada minuto
  });
}

// ── Hook de Meteorología (Open-Meteo) ───────────────────────────────────────

const FINCAS_COORDENADAS = [
  { nombre: 'FINCA LA BARDA', lat: 38.10, lon: -0.90 },
  { nombre: 'LA CONCEPCION', lat: 38.20, lon: -0.95 },
  { nombre: 'LONSORDO', lat: 38.25, lon: -1.00 },
  { nombre: 'FINCA COLLADOS', lat: 38.30, lon: -1.05 },
  { nombre: 'FINCA BRAZO DE LA VIRGEN', lat: 38.35, lon: -1.10 },
  { nombre: 'FINCA LA NUEVA', lat: 38.40, lon: -1.15 },
  { nombre: 'FINCA MAYORAZGO', lat: 39.40, lon: -0.30 }, // Zona Valencia
];

interface WeatherData {
  current?: { temperature_2m?: number; precipitation?: number; windspeed_10m?: number };
  daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_sum?: number[] };
}

function useWeather(lat: number, lon: number) {
  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: async (): Promise<WeatherData | null> => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FMadrid`);
        if (!res.ok) return null;
        return (await res.json()) as WeatherData;
      } catch (e) {
        console.warn('Weather API fallida (offline/error):', e);
        return null;
      }
    },
    retry: false,
    refetchInterval: 300000, // Actualiza cada 5 mins
  });
}

function KpiCard({ title, value, icon: Icon, color }: { title: string, value: React.ReactNode, icon: React.ElementType, color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{value ?? '-'}</p>
    </div>
  );
}

export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Panel LIA
  const [liaEventos, setLiaEventos] = useState<number>(0);
  const [liaUltimaMemoria, setLiaUltimaMemoria] = useState<string>('');

  const { user } = useAuth();
  const { data, isLoading } = useDashboardData();
  const [fincaClima, setFincaClima] = useState(FINCAS_COORDENADAS[0]);
  const { data: weather } = useWeather(fincaClima.lat, fincaClima.lon);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Cargar datos LIA
  useEffect(() => {
    const cargarLia = async () => {
      try {
        // Silenciamos las tablas LIA temporalmente hasta que se creen en la BD
        // para evitar el error 406 de consola
        setLiaEventos(0);
        setLiaUltimaMemoria('');
      } catch (error) {
        // Silent fail
      }
    };
    
    cargarLia();
  }, []);

  const horaStr = now.toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit',
  });

  const fechaStr = now.toLocaleDateString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleGenerarInforme = async () => {
    setGeneratingPdf(true);
    try {
      const hoyStr = new Date().toISOString().split('T')[0];
      const { data: cosechas } = await supabase.from('harvests').select('production_kg').eq('date', hoyStr);
      const kgCosechados = (cosechas || []).reduce((acc, c) => acc + (c.production_kg || 0), 0);
      const activeCrews = new Set((data?.trabajosDelDia || []).filter(t => t.cuadrilla_nombre).map(t => t.cuadrilla_nombre)).size;

      await generarPDFCorporativoBase({
        titulo: "Informe Operativo Diario",
        subtitulo: `Resumen de actividad - ${new Date().toLocaleDateString('es-ES')}`,
        fecha: new Date(),
        filename: `Informe_Diario_${hoyStr}.pdf`,
        accentColor: PDF_COLORS.accent,
        bloques: [
          async (ctx) => {
            pdfCorporateSection(ctx, 'Resumen Ejecutivo');
            ctx.kpiRow([
              { label: 'Parcelas Act.', value: data?.kpis?.parcelasActivas ?? 0 },
              { label: 'Kg Cosechados', value: kgCosechados },
              { label: 'Cuadrillas', value: activeCrews },
              { label: 'Alertas', value: data?.kpis?.alertasActivas || 0 }
            ]);
            ctx.separator();

            pdfCorporateSection(ctx, 'Trabajos del Día');
            if (!data?.trabajosDelDia?.length) {
              ctx.writeLine('Estado', 'Sin trabajos registrados hoy');
            } else {
              pdfCorporateTable(ctx,
                ['TIPO', 'CUADRILLA', 'PARCELA', 'HORAS', 'ESTADO'],
                [40, 45, 35, 20, 40],
                (data?.trabajosDelDia || []).map(t => [
                  t.work_type ?? '—',
                  t.cuadrilla_nombre || '—',
                  t.parcel_id || '—',
                  t.hours_worked != null ? String(t.hours_worked) : '—',
                  t.enCurso ? 'En curso' : 'Completado/Pendiente'
                ])
              );
            }
            ctx.separator();

            pdfCorporateSection(ctx, 'Maquinaria Activa');
            if (!data?.maquinariaActiva?.length) {
              ctx.writeLine('Estado', 'Sin maquinaria activa reportada');
            } else {
              pdfCorporateTable(ctx,
                ['MATRÍCULA', 'UBICACIÓN', 'ORIGEN SEÑAL'],
                [50, 80, 50],
                (data?.maquinariaActiva || []).map(m => [
                  m.matricula || '—',
                  m.ubicacion || '—',
                  m.tipo === 'gps' ? 'Telemetría GPS' : 'Parte de trabajo'
                ])
              );
            }
            ctx.separator();

            pdfCorporateSection(ctx, 'Alertas Críticas');
            if (!data?.alertasCriticas?.length) {
              ctx.writeLine('Estado', 'No hay alertas críticas');
            } else {
              (data?.alertasCriticas || []).forEach(a => {
                ctx.writeLine(a.modulo, a.titulo);
              });
            }
          }
        ]
      });
    } catch (e) {
      console.error('Error generando informe:', e);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-y-auto bg-slate-50 dark:bg-[#020617] transition-colors pb-10">
      
      {/* Usuario (tema global en AppLayout → GlobalThemeToggle) */}
      {user && (
        <div className="fixed z-[60] hidden sm:flex items-center gap-3 top-[max(1rem,env(safe-area-inset-top))] right-[4.75rem] max-w-[min(50vw,calc(100%-5.5rem))]">
          <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{user.email}</span>
          <button type="button" onClick={handleSignOut} className="shrink-0 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Salir</button>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-16 sm:pt-10 space-y-6">
        
        {/* Cabecera: títulos a la izquierda; logo + CTA agrupados (logo más grande, alineado con Informe) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white sm:text-3xl">Dashboard Operativo</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{fechaStr} · <span className="font-mono">{horaStr}</span></p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-end">
            <img
              src="/MARVIC_logo.png"
              alt="Marvic"
              className={`h-14 w-auto max-w-[220px] self-center object-contain sm:h-20 sm:max-w-[280px] sm:self-end ${isDark ? 'brightness-0 invert opacity-90' : ''}`}
              draggable={false}
            />
            <button
              type="button"
              onClick={handleGenerarInforme}
              disabled={generatingPdf}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 sm:w-auto"
            >
              {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Informe del Día
            </button>
          </div>
        </div>

        {/* Fila 1: KPIs & Metereología */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Widget Meteorología */}
          {weather?.current ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm lg:col-span-1 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Meteorología</p>
                  <div className="relative flex items-center">
                    <select 
                      value={fincaClima.nombre}
                      onChange={(e) => {
                        const selected = FINCAS_COORDENADAS.find(f => f.nombre === e.target.value);
                        if (selected) setFincaClima(selected);
                      }}
                      className="appearance-none text-sm font-bold text-slate-700 dark:text-slate-200 bg-transparent border-none p-0 pr-4 focus:ring-0 cursor-pointer outline-none hover:text-[#6d9b7d] transition-colors z-10"
                    >
                      {FINCAS_COORDENADAS.map(f => (
                        <option key={f.nombre} value={f.nombre} className="text-slate-900">{f.nombre}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 pointer-events-none z-0" />
                  </div>
                </div>
                <div className="text-right">
              <p className="text-3xl font-black text-[#6d9b7d]">{Math.round(weather?.current?.temperature_2m || 0)}°</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-5">
            <span className="flex items-center gap-1.5"><CloudRain className="w-4 h-4 text-blue-400"/> {weather?.current?.precipitation ?? 0} mm</span>
            <span className="flex items-center gap-1.5"><Wind className="w-4 h-4 text-slate-400"/> {weather?.current?.windspeed_10m ?? 0} km/h</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
            {weather?.daily?.time?.slice(0, 3).map((t: string, i: number) => (
                  <div key={t} className="text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{i===0 ? 'Hoy' : new Date(t).toLocaleDateString('es-ES', {weekday:'short'})}</p>
                <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">{Math.round(weather?.daily?.temperature_2m_max?.[i] || 0)}°</p>
                <p className="text-[10px] font-medium text-slate-400">{Math.round(weather?.daily?.temperature_2m_min?.[i] || 0)}°</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm lg:col-span-1 flex items-center justify-center">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Cargando clima...</p>
            </div>
          )}

          {/* KPIs Base */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Parcelas Activas" value={isLoading ? '...' : data?.kpis?.parcelasActivas} icon={MapIcon} color="text-emerald-500" />
            <KpiCard title="Hectáreas" value={isLoading ? '...' : Math.round(data?.kpis?.haPlantadas || 0)} icon={Leaf} color="text-green-500" />
            <KpiCard title="Trabajos Sem." value={isLoading ? '...' : data?.kpis?.trabajosSemana} icon={Activity} color="text-blue-500" />
            <KpiCard title="Alertas Activas" value={isLoading ? '...' : data?.kpis?.alertasActivas} icon={AlertTriangle} color={(data?.kpis?.alertasActivas || 0) > 0 ? "text-red-500" : "text-slate-400"} />
          </div>
        </div>

        {/* Fila 2: Listas Detalladas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Trabajos del Día */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <ClipboardList className="w-4 h-4 text-emerald-500"/>
              <h3 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Trabajos Hoy</h3>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {isLoading ? <p className="text-xs text-slate-400">Cargando...</p> : data?.trabajosDelDia?.map(t => (
                <div key={t.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 transition-colors hover:border-[#6d9b7d]/30">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">{t.work_type}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{t.cuadrilla_nombre || 'Sin cuadrilla'} · Sec. {t.parcel_id}</p>
                  </div>
                  {t.enCurso ? (
                    <span className="shrink-0 ml-2 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Activo
                    </span>
                  ) : (
                    <span className="shrink-0 ml-2 text-[10px] font-bold text-slate-400">{t.hours_worked != null ? `${t.hours_worked}h` : 'Fin'}</span>
                  )}
                </div>
              ))}
              {!isLoading && !data?.trabajosDelDia?.length && <p className="text-xs text-slate-500 text-center py-6">Sin trabajos registrados hoy</p>}
            </div>
          </div>

          {/* Maquinaria Activa */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <Tractor className="w-4 h-4 text-orange-500"/>
              <h3 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Maquinaria Activa</h3>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {isLoading ? <p className="text-xs text-slate-400">Cargando...</p> : data?.maquinariaActiva?.map(m => (
                <div key={m.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 transition-colors hover:border-orange-500/30">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">{m.matricula}</span>
                    <span className="text-[9px] text-orange-500 font-medium uppercase mt-0.5 block">{m.tipo === 'gps' ? 'GPS En vivo' : 'En parte'}</span>
                  </div>
                  <span className="shrink-0 ml-2 text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-md shadow-sm max-w-[100px] truncate">{m.ubicacion}</span>
                </div>
              ))}
              {!isLoading && !data?.maquinariaActiva?.length && <p className="text-xs text-slate-500 text-center py-6">Sin maquinaria activa</p>}
            </div>
          </div>

          {/* Alertas Críticas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500"/>
              <h3 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Alertas Urgentes</h3>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {isLoading ? <p className="text-xs text-slate-400">Cargando...</p> : data?.alertasCriticas?.map(a => (
                <div key={a.id} className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 transition-colors hover:border-red-300 dark:hover:border-red-400/40">
                  <p className="font-bold text-red-700 dark:text-red-400 text-xs line-clamp-2">{a.titulo}</p>
                  <p className="text-[9px] font-black text-red-500/70 uppercase tracking-widest mt-1.5 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-400"/> {a.modulo}</p>
                </div>
              ))}
              {!isLoading && !data?.alertasCriticas?.length && <div className="text-center py-8 flex flex-col items-center"><CheckCircle2 className="w-8 h-8 text-emerald-400/50 mb-2"/><p className="text-xs text-slate-500">Todo en orden</p></div>}
            </div>
          </div>
        </div>

        {/* Panel LIA - Background observation */}
        {(liaEventos > 0 || liaUltimaMemoria) && (
          <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 border border-sky-500/30">
              <span className="text-sky-600 dark:text-sky-400 font-black text-[10px] uppercase tracking-widest">LIA</span>
            </div>
            <div className="text-xs text-sky-800 dark:text-sky-300 font-medium">
              <p className="font-bold mb-0.5">Modo observación activo · {liaEventos} eventos analizados hoy</p>
              {liaUltimaMemoria && <p className="opacity-80 line-clamp-2 sm:line-clamp-1">{liaUltimaMemoria}</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
