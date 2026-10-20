import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';
import { activarAppPanel } from '../lib/appPanel';

// Ruta /panel. Acá vive la sesión de Supabase y se carga bajo demanda
// (React.lazy en App.jsx): quien entra al sitio público no descarga el panel
// ni el cliente de Supabase.
export default function PanelRoute() {
  const [session, setSession] = useState(null);
  const [cargando, setCargando] = useState(true);

  // App instalable: el manifest, los íconos y el service worker solo existen mientras se está en el panel.
  useEffect(() => activarAppPanel(), []);

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
