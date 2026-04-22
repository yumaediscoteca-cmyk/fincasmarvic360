/** Fallback mínimo para rutas cargadas con React.lazy (Etapa 5). */
export default function PageLoadingFallback() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 px-6 text-slate-500">
      <div
        className="h-8 w-8 rounded-full border-2 border-slate-600 border-t-emerald-500 animate-spin"
        aria-hidden
      />
      <p className="text-xs font-semibold uppercase tracking-widest">Cargando módulo…</p>
    </div>
  );
}
