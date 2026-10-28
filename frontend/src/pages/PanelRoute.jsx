import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import AdminLogin from './AdminLogin';
import ElegirClave from './ElegirClave';
import AdminPanel from './AdminPanel';
import { activarAppPanel } from '../lib/appPanel';
import { marcarComoInterno } from '../lib/visitas';

// Ruta /panel. Acá vive la sesión de Supabase y se carga bajo demanda
// (React.lazy en App.jsx): quien entra al sitio público no descarga el panel
// ni el cliente de Supabase.
export default function PanelRoute() {
  const [session, setSession] = useState(null);
  const [cargando, setCargando] = useState(true);
  // Llegó desde el link de una invitación o de "¿Olvidaste tu contraseña?": hay que elegir una contraseña antes de entrar.
  const [eligiendoClave, setEligiendoClave] = useState(() => /[#&]type=(invite|recovery)\b/.test(window.location.hash));
  // Link vencido o ya usado: el login avisa qué hacer.
  const [linkVencido] = useState(() => /error_code=otp_expired|error=access_denied/.test(window.location.hash));

  // App instalable: el manifest, los íconos y el service worker solo existen mientras se está en el panel.
  useEffect(() => activarAppPanel(), []);

  // Quien abre el panel es del equipo: este navegador deja de contar como visita de la página pública.
  useEffect(() => { marcarComoInterno(); }, []);

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
  if (session && eligiendoClave) {
    return <ElegirClave alTerminar={() => { window.history.replaceState(null, '', window.location.pathname); setEligiendoClave(false); }} />;
  }
  return session ? <AdminPanel /> : <AdminLogin errorInicial={linkVencido ? 'El link venció o ya se usó. Tocá "¿Olvidaste tu contraseña?" para recibir uno nuevo.' : null} />;
}
