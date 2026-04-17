import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';
import { NAV_ITEMS } from '../constants/navItems';
import { useStability } from '@/stability';

// Devuelve el id del módulo raíz que contiene la ruta actual
function getActiveRootId(pathname: string): string | null {
  for (const item of NAV_ITEMS) {
    if (item.children?.length) {
      if (item.children.some(c => pathname === c.ruta || pathname.startsWith(c.ruta + '/'))) {
        return item.id;
      }
    } else if (item.ruta) {
      if (pathname === item.ruta || pathname.startsWith(item.ruta + '/')) {
        return item.id;
      }
    }
  }
  return null;
}

export default function GlobalSidebar() {
  const { isOpen, toggle, close } = useSidebar();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const { pendingQueueCount, queueErrorCount } = useStability();

  const isDark = theme === 'dark';
  const queueTitle =
    pendingQueueCount > 0
      ? `${pendingQueueCount} envío(s) en cola${queueErrorCount ? ` · ${queueErrorCount} con error` : ''}`
      : '';

  // Accordion: id del módulo raíz expandido
  const [openId, setOpenId] = useState<string | null>(
    () => getActiveRootId(location.pathname)
  );

  // Sincronizar openId con cambios de ruta — abrir el módulo activo
  useEffect(() => {
    const activeRoot = getActiveRootId(location.pathname);
    if (activeRoot) {
      setOpenId(activeRoot);
    }
    close();
  }, [location.pathname, close]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  // Scroll automático al elemento activo cuando se abre el sidebar
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      if (activeItemRef.current && navRef.current) {
        const nav = navRef.current;
        const el = activeItemRef.current;
        const navRect = nav.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const isOutside = elRect.top < navRect.top || elRect.bottom > navRect.bottom;
        if (isOutside) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Click en módulo raíz:
  //   - si tiene children → toggle accordion
  //   - si no tiene → navegar
  const handleRootClick = (item: typeof NAV_ITEMS[0]) => {
    if (!item.activo) return;
    if (item.children?.length) {
      setOpenId(prev => (prev === item.id ? null : item.id));
    } else if (item.ruta) {
      navigate(item.ruta);
      close();
    }
  };

  // Click en chevron: solo toggle accordion (no navega)
  const handleChevronClick = (e: React.MouseEvent, item: typeof NAV_ITEMS[0]) => {
    e.stopPropagation();
    if (!item.activo) return;
    setOpenId(prev => (prev === item.id ? null : item.id));
  };

  const handleChildClick = (ruta: string) => {
    navigate(ruta);
    close();
  };

  return (
    <>
      {/* Botón hamburguesa */}
      <button
        onClick={toggle}
        className="fixed z-[60] flex items-center justify-center w-10 h-10 rounded-lg
          top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))]
          backdrop-blur-sm border border-border bg-card/95 text-foreground hover:bg-muted transition-colors duration-200"
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        title={queueTitle || undefined}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {pendingQueueCount > 0 && (
        <span
          className={`fixed z-[60] pointer-events-none text-[10px] font-bold tabular-nums leading-none px-1.5 py-0.5 rounded
            top-[max(0.75rem,env(safe-area-inset-top))] left-[max(3.25rem,calc(0.75rem+2.5rem+0.25rem+env(safe-area-inset-left)))]
            ${queueErrorCount > 0
              ? isDark
                ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                : 'bg-amber-100 text-amber-900 border border-amber-400/60'
              : isDark
                ? 'bg-muted text-muted-foreground border border-border'
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          title={queueTitle}
          aria-live="polite"
        >
          {pendingQueueCount}
        </span>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[70] transition-opacity duration-200"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Panel lateral */}
      <div
        className={`fixed top-0 left-0 h-full w-72 z-[80] flex flex-col
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
          transition-transform duration-300 ease-in-out
          bg-sidebar text-sidebar-foreground border-r border-sidebar-border
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border shrink-0">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-sidebar-foreground">
            Agrícola Marvic 360
          </span>
          <button
            onClick={close}
            className="flex items-center justify-center w-8 h-8 rounded transition-colors duration-200
              text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de módulos */}
        <nav ref={navRef} className="flex-1 overflow-y-auto py-1">
          {NAV_ITEMS.map(item => {
            const hasChildren = !!item.children?.length;
            const isExpanded = openId === item.id;

            const isActive = item.children?.length
              ? item.children.some(c =>
                  location.pathname === c.ruta ||
                  location.pathname.startsWith(c.ruta + '/'))
              : item.ruta
                ? location.pathname === item.ruta ||
                  location.pathname.startsWith(item.ruta + '/')
                : false;

            const Icon = item.icono;

            return (
              <div
                key={item.id}
                ref={isActive ? activeItemRef : undefined}
                className="mb-0.5"
              >
                {/* Botón raíz */}
                <button
                  onClick={() => handleRootClick(item)}
                  disabled={!item.activo}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left
                    transition-all duration-200 ease-in-out border-l-2 group
                    ${!item.activo
                      ? 'opacity-35 cursor-not-allowed border-transparent'
                      : isActive
                        ? 'bg-sidebar-accent border-transparent'
                        : 'hover:bg-sidebar-accent/60 border-transparent'
                    }`}
                  style={isActive && item.activo ? { borderLeftColor: item.color } : undefined}
                >
                  {/* Icono */}
                  <span className="shrink-0 flex items-center justify-center w-5 h-5">
                    <Icon
                      size={18}
                      style={{ color: item.activo ? item.color : undefined }}
                      className={!item.activo ? 'text-muted-foreground/50' : ''}
                    />
                  </span>

                  {/* Label */}
                  <span className={`text-sm font-semibold flex-1 leading-none
                    ${!item.activo
                      ? 'text-muted-foreground/50'
                      : isActive
                        ? 'text-sidebar-foreground'
                        : 'text-muted-foreground group-hover:text-sidebar-foreground'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* WIP badge */}
                  {!item.activo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground"
                    >
                      WIP
                    </span>
                  )}

                  {/* Chevron accordion — click independiente */}
                  {hasChildren && item.activo && (
                    <span
                      role="button"
                      aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
                      onClick={(e) => handleChevronClick(e, item)}
                      className="shrink-0 flex items-center justify-center w-5 h-5 rounded
                        transition-colors duration-150
                        text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    >
                      <ChevronRight
                        size={14}
                        className={`transition-transform duration-200 ease-in-out
                          ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </span>
                  )}

                  {/* Punto activo (solo raíces sin hijos) */}
                  {!hasChildren && isActive && item.activo && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                </button>

                {/* Hijos (accordion) */}
                {hasChildren && isExpanded && (
                  <div className="ml-7 border-l border-sidebar-border/80">
                    {item.children!.map(child => {
                      const childActive =
                        location.pathname === child.ruta ||
                        location.pathname.startsWith(child.ruta + '/');
                      const ChildIcon = child.icono;

                      return (
                        <button
                          key={child.id}
                          onClick={() => handleChildClick(child.ruta)}
                          className={`w-full flex items-center gap-2.5 pl-3 pr-4 py-2 text-left
                            transition-all duration-200 ease-in-out group
                            ${childActive
                              ? 'bg-sidebar-accent'
                              : 'hover:bg-sidebar-accent/50'
                            }`}
                        >
                          <span className="shrink-0 flex items-center justify-center w-4 h-4">
                            <ChildIcon
                              size={13}
                              style={{ color: childActive ? item.color : undefined }}
                              className={
                                childActive
                                  ? ''
                                  : 'text-muted-foreground group-hover:text-sidebar-foreground'
                              }
                            />
                          </span>
                          <span className={`text-xs font-medium flex-1
                            ${childActive
                              ? 'text-sidebar-foreground'
                              : 'text-muted-foreground group-hover:text-sidebar-foreground'
                            }`}
                          >
                            {child.label}
                          </span>
                          {childActive && (
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Pie */}
        <div className="px-4 py-3 border-t border-sidebar-border text-xs shrink-0 text-muted-foreground">
          v4.0
        </div>
      </div>
    </>
  );
}
