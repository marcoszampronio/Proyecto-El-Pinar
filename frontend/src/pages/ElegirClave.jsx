import { useState } from 'react';
import { supabase } from '../supabaseClient';
import CampoClave from '../components/panel/CampoClave';

// Pantalla para elegir la contraseña propia: se muestra cuando alguien llega desde el link de una invitación
// (empleado nuevo) o de "¿Olvidaste tu contraseña?". La contraseña la escribe la persona; nadie más la ve.
export default function ElegirClave({ alTerminar }) {
  const [clave, setClave] = useState('');
  const [repetida, setRepetida] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    if (clave.length < 8) { setError('Usá al menos 8 caracteres.'); return; }
    if (clave !== repetida) { setError('Las dos contraseñas no coinciden.'); return; }
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password: clave });
    setCargando(false);
    if (error) {
      setError(/same|different/i.test(error.message) ? 'Elegí una contraseña distinta a la anterior.' : 'No se pudo guardar la contraseña. Probá de nuevo o pedí otra invitación.');
      return;
    }
    alTerminar();
  }

  return (
    <div className="login-shell">
      <div className="login-box">
        <h2>Elegí tu contraseña</h2>
        <p style={{ color: 'var(--p-mut)', fontSize: 'var(--pt-chico)', marginTop: 0 }}>
          Con esta contraseña y tu email vas a entrar al panel del complejo.
        </p>
        <form onSubmit={guardar}>
          <div className="field">
            <label>Contraseña nueva</label>
            <CampoClave value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="new-password" required minLength={8} mostrar={mostrar} onMostrar={setMostrar} />
          </div>
          <div className="field">
            <label>Repetila</label>
            <CampoClave value={repetida} onChange={(e) => setRepetida(e.target.value)} autoComplete="new-password" required minLength={8} mostrar={mostrar} onMostrar={setMostrar} />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={cargando}>
            {cargando ? 'Guardando...' : 'Guardar y entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
