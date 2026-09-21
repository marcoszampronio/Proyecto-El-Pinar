import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicPage from './pages/PublicPage';

// El panel de Mateo (y Supabase) se descarga solo cuando alguien entra a /panel.
const PanelRoute = lazy(() => import('./pages/PanelRoute'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicPage />} />
      <Route
        path="/panel"
        element={
          <Suspense fallback={<div className="cargando">Cargando...</div>}>
            <PanelRoute />
          </Suspense>
        }
      />
    </Routes>
  );
}
