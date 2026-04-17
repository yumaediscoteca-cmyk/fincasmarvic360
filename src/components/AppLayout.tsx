import { Outlet, useLocation } from 'react-router-dom';
import GlobalSidebar from './GlobalSidebar';
import GlobalThemeToggle from './GlobalThemeToggle';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/** Rutas donde el mapa debe llegar al borde derecho (sin hueco reservado al tema). */
function isFarmMapFullBleed(pathname: string) {
  return /^\/farm\/[^/]+$/.test(pathname);
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const reserveThemeLane = !isFarmMapFullBleed(pathname);

  return (
    <>
      <GlobalSidebar />
      <GlobalThemeToggle />
      <ErrorBoundary>
        <div
          className={
            reserveThemeLane
              ? 'min-h-screen pr-[calc(3.5rem+env(safe-area-inset-right,0px))]'
              : 'min-h-screen'
          }
        >
          <Outlet />
        </div>
      </ErrorBoundary>
    </>
  );
}
