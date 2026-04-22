import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import GlobalSidebar from './GlobalSidebar';
import PageLoadingFallback from './PageLoadingFallback';

export default function AppLayout() {
  return (
    <>
      <GlobalSidebar />
      <Suspense fallback={<PageLoadingFallback />}>
        <Outlet />
      </Suspense>
    </>
  );
}
