import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';
import { NAV_ITEMS } from '../constants/navItems';

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

  const isDark = theme === 'dark';

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
        className={`fixed top-3 left-3 z-[60] flex items-center justify-center w-10 h-10 rounded-lg
          backdrop-blur-sm border transition-colors duration-200
          ${isDark
            ? 'bg-slate-900/95 hover:bg-slate-800 text-slate-200 border-slate-700'
            : 'bg-slate-100/95 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

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
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isDark
            ? 'bg-slate-950 border-r border-slate-700/80'
            : 'bg-slate-50 border-r border-slate-300'
          }`}
      >
        {/* Cabecera */}
        <div className={`flex items-center justify-between px-4 py-4 border-b shrink-0
          ${isDark ? 'border-slate-700/80' : 'border-slate-300'}`}
        >
          <span className={`text-xs font-semibold tracking-widest uppercase
            ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
          >
            Agrícola Marvic 360
          </span>
          <button
            onClick={close}
            className={`flex items-center justify-center w-8 h-8 rounded transition-colors duration-200
              ${isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
              }`}
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
                        ? isDark
                          ? 'bg-slate-800/80 border-transparent'
                          : 'bg-slate-200/90 border-transparent'
                        : isDark
                          ? 'hover:bg-slate-800/50 border-transparent'
                          : 'hover:bg-slate-100/80 border-transparent'
                    }`}
                  style={isActive && item.activo ? { borderLeftColor: item.color } : undefined}
                >
                  {/* Icono */}
                  <span className="shrink-0 flex items-center justify-center w-5 h-5">
                    <Icon
                      size={18}
                      style={{ color: item.activo ? item.color : undefined }}
                      className={!item.activo
                        ? isDark ? 'text-slate-600' : 'text-slate-400'
                        : ''
                      }
                    />
                  </span>

                  {/* Label */}
                  <span className={`text-sm font-semibold flex-1 leading-none
                    ${!item.activo
                      ? isDark ? 'text-slate-600' : 'text-slate-400'
                      : isActive
                        ? isDark ? 'text-white' : 'text-slate-900'
                        : isDark
                          ? 'text-slate-300 group-hover:text-slate-100'
                          : 'text-slate-700 group-hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* WIP badge */}
                  {!item.activo && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
                      ${isDark
                        ? 'bg-slate-800 text-slate-500'
                        : 'bg-slate-200 text-slate-400'
                      }`}
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
                      className={`shrink-0 flex items-center justify-center w-5 h-5 rounded
                        transition-colors duration-150
                        ${isDark
                          ? 'hover:bg-slate-700 text-slate-500 hover:text-slate-300'
                          : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
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
                  <div
                    className={`ml-7 border-l
                      ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}
                  >
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
                              ? isDark
                                ? 'bg-slate-800/60'
                                : 'bg-slate-200/60'
                              : isDark
                                ? 'hover:bg-slate-800/40'
                                : 'hover:bg-slate-100/80'
                            }`}
                        >
                          <span className="shrink-0 flex items-center justify-center w-4 h-4">
                            <ChildIcon
                              size={13}
                              style={{ color: childActive ? item.color : undefined }}
                              className={
                                childActive
                                  ? ''
                                  : isDark
                                    ? 'text-slate-600 group-hover:text-slate-400'
                                    : 'text-slate-400 group-hover:text-slate-600'
                              }
                            />
                          </span>
                          <span className={`text-xs font-medium flex-1
                            ${childActive
                              ? isDark ? 'text-white' : 'text-slate-900'
                              : isDark
                                ? 'text-slate-400 group-hover:text-slate-200'
                                : 'text-slate-500 group-hover:text-slate-800'
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
        <div className={`px-4 py-3 border-t text-xs shrink-0
          ${isDark
            ? 'border-slate-700/80 text-slate-600'
            : 'border-slate-300 text-slate-400'
          }`}
        >
          v4.0
        </div>
      </div>
    </>
  );
}
