import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { SidebarProvider } from "./context/SidebarContext";
import AppLayout from "./components/AppLayout";
import PageLoadingFallback from "./components/PageLoadingFallback";

const FarmSelector = lazy(() => import("./pages/FarmSelector"));
const FarmMap = lazy(() => import("./pages/FarmMap"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventario = lazy(() => import("./pages/Inventario"));
const InventarioUbicacion = lazy(() => import("./pages/InventarioUbicacion"));
const ParteDiario = lazy(() => import("./pages/ParteDiario"));
const Trabajos = lazy(() => import("./pages/Trabajos"));
const Logistica = lazy(() => import("./pages/Logistica"));
const Maquinaria = lazy(() => import("./pages/Maquinaria"));
const Personal = lazy(() => import("./pages/Personal"));
const QRCuadrilla = lazy(() => import("./pages/QRCuadrilla"));
const EstadoGeneral = lazy(() => import("./pages/EstadoGeneral"));
const Historicos = lazy(() => import("./pages/Historicos"));
const ExportarPDF = lazy(() => import("./pages/ExportarPDF"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ThemeProvider>
    <SidebarProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/qr/:cuadrilla_id"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <QRCuadrilla />
                  </Suspense>
                }
              />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/farm" element={<FarmSelector />} />
                <Route path="/farm/:farmName" element={<FarmMap />} />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/inventario/:ubicacionId" element={<InventarioUbicacion />} />
                <Route path="/parte-diario" element={<ParteDiario />} />
                <Route path="/trabajos" element={<Trabajos />} />
                <Route path="/logistica" element={<Logistica />} />
                <Route path="/maquinaria" element={<Maquinaria />} />
                <Route path="/personal" element={<Personal />} />
                <Route path="/estado-general" element={<EstadoGeneral />} />
                <Route path="/historicos" element={<Historicos />} />
                <Route path="/exportar-pdf" element={<ExportarPDF />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </SidebarProvider>
  </ThemeProvider>
);

export default App;
