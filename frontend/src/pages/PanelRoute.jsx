import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';

// Ruta /panel. Acá vive la sesión de Supabase y se carga bajo demanda
// (React.lazy en App.jsx): quien entra al sitio público no descarga el panel
// ni el cliente de Supabase.
export default function PanelRoute() {
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

  if (cargando) return <div className="cargando">Cargando...</div>;
  return session ? <AdminPanel /> : <AdminLogin />;
}
