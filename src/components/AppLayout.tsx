import { Outlet } from 'react-router-dom';
import GlobalSidebar from './GlobalSidebar';
import GlobalThemeToggle from './GlobalThemeToggle';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AppLayout() {
  return (
    <>
      <GlobalSidebar />
      <GlobalThemeToggle />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </>
  );
}
