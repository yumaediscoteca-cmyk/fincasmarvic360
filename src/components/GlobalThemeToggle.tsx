import { Moon, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';

/** Botón fijo esquina superior derecha: AppLayout y Login. En /inventario* el tema va en la barra de la página. */
export default function GlobalThemeToggle() {
  const { pathname } = useLocation();
  if (pathname === '/inventario' || pathname.startsWith('/inventario/')) {
    return null;
  }

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="pointer-events-none fixed z-chrome top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] flex justify-end">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
        className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}
