import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminLogin({ errorInicial = null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(errorInicial);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function iniciarSesion(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) setError('Email o contraseña incorrectos.');
  }

  // "¿Olvidaste tu contraseña?": le llega un mail con un link para elegir una nueva.
  async function olvideClave() {
    setError(null);
    setAviso(null);
    if (!email.trim()) { setError('Escribí tu email y volvé a tocar "¿Olvidaste tu contraseña?".'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/panel` });
    if (error) setError('No pudimos mandar el mail. Probá de nuevo en unos minutos.');
    else setAviso('Listo: si ese email tiene acceso, te llega un mail con un link para elegir tu contraseña.');
  }

  return (
    <div className="login-shell">
    <div className="login-box">
      <h2>Panel del complejo</h2>
      <form onSubmit={iniciarSesion}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="error-msg">{error}</p>}
        {aviso && <p style={{ color: 'var(--p-ok)', fontSize: 'var(--pt-chico)', margin: '0 0 10px' }}>{aviso}</p>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
        <button type="button" className="btn-texto" style={{ width: '100%', marginTop: 12 }} onClick={olvideClave}>
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    </div>
    </div>
  );
}
