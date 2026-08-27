import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';
import PublicPage from './pages/PublicPage';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  const [session, setSession] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<PublicPage />} />
      <Route
        path="/panel"
        element={
          cargando ? (
            <div className="cargando">Cargando...</div>
          ) : session ? (
            <AdminPanel />
          ) : (
            <AdminLogin />
          )
        }
      />
    </Routes>
  );
}
