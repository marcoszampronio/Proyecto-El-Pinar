import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { api } from '../api';

const API_URL = import.meta.env.VITE_API_URL;

async function tokenAdmin() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

function ExportPanel() {
  const hoy = new Date().toISOString().slice(0, 10);
  const haceTresMeses = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [desde, setDesde] = useState(haceTresMeses);
  const [hasta, setHasta] = useState(hoy);
  const [descargando, setDescargando] = useState(false);

  async function descargarCSV() {
    setDescargando(true);
    try {
      const token = await tokenAdmin();
      const res = await fetch(
        `${API_URL}/admin/export/csv?desde=${desde}&hasta=${hasta}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reservas-${desde}-a-${hasta}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('No se pudo descargar el historial: ' + e.message);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="stat-card" style={{ margin: '12px 20px' }}>
      <h3 style={{ marginTop: 0 }}>Exportar historial</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="field" style={{ flex: 1, minWidth: 120 }}>
          <label>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 120 }}>
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-primary" onClick={descargarCSV} disabled={descargando} style={{ width: '100%' }}>
        {descargando ? 'Generando...' : '⬇ Descargar Excel / CSV'}
      </button>
      <p style={{ fontSize: 12, color: '#5C6B60', marginBottom: 0 }}>
        El archivo se abre directamente en Excel. Incluye todas las reservas en el rango de fechas.
      </p>
    </div>
  );
}

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel' };

export default function AdminPanel() {
  const [tab, setTab] = useState('buscar'); // 'buscar' | 'stats'
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [stats, setStats] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    cargarPendientes();
  }, []);

  useEffect(() => {
    if (tab === 'stats') cargarStats();
  }, [tab]);

  async function cargarPendientes() {
    try {
      const data = await api.adminPendientes();
      setPendientes(data.pendientes);
    } catch (e) {
      console.error(e);
    }
  }

  async function cargarStats() {
    try {
      const data = await api.adminStats(7);
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function buscar(codigoBuscado) {
    const c = (codigoBuscado || codigo).trim().toUpperCase();
    if (!c) return;
    setError(null);
    setAviso(null);
    try {
      const data = await api.adminBuscar(c);
      setResultado(data);
      setCodigo(c);
    } catch (e) {
      setResultado(null);
      setError(e.message);
    }
  }

  async function confirmar() {
    setProcesando(true);
    try {
      await api.adminConfirmar(resultado.reserva.code);
      setAviso('Reserva confirmada. Email enviado al cliente.');
      setResultado(null);
      setCodigo('');
      cargarPendientes();
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  async function cancelar() {
    setProcesando(true);
    try {
      await api.adminCancelar(resultado.reserva.code);
      setAviso('Reserva cancelada. Email enviado al cliente.');
      setResultado(null);
      setCodigo('');
      cargarPendientes();
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="admin-header">
        <strong>Complejo El Pinar — Panel</strong>
        <button className="btn btn-ghost" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => supabase.auth.signOut()}>
          Salir
        </button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'buscar' ? 'active' : ''}`} onClick={() => setTab('buscar')}>Buscar</button>
        <button className={`tab-btn ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>Estadísticas</button>
      </div>

      {tab === 'buscar' && (
        <>
          <div className="stat-card">
            <h3 style={{ marginTop: 0 }}>Ingresá el código de la reserva</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1.5px solid var(--line)', fontFamily: 'monospace' }}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
                placeholder="Ej: RES-C1-30AGO-T1"
              />
              <button className="btn btn-primary" onClick={() => buscar()}>Buscar</button>
            </div>
            {error && <p className="error-msg">{error}</p>}
            {aviso && <p style={{ color: 'var(--pitch)', fontWeight: 600, marginTop: 8 }}>{aviso}</p>}
          </div>

          {resultado && (
            <div className="stat-card">
              <div style={{ fontFamily: 'monospace', fontWeight: 700, marginBottom: 4 }}>{resultado.reserva.code}</div>
              <p style={{ margin: '4px 0' }}>{resultado.reserva.client_name} {resultado.reserva.category ? `· ${resultado.reserva.category}` : ''}</p>
              <p style={{ margin: '4px 0', fontSize: 13, color: '#5C6B60' }}>
                {NOMBRE_CANCHA[resultado.reserva.court]} · {resultado.reserva.reservation_date} · {resultado.reserva.start_time.slice(0, 5)} a {resultado.reserva.end_time.slice(0, 5)}
              </p>
              <p style={{ fontSize: 13 }}>Tel: {resultado.reserva.client_phone}</p>

              {resultado.accionSugerida === 'confirmar' && (
                <div className="modal-actions">
                  <button className="btn btn-primary" disabled={procesando} onClick={confirmar}>Sí, confirmar</button>
                  <button className="btn btn-ghost" onClick={() => setResultado(null)}>Atrás</button>
                </div>
              )}
              {resultado.accionSugerida === 'cancelar' && (
                <div className="modal-actions">
                  <button className="btn btn-danger" disabled={procesando} onClick={cancelar}>Sí, cancelar</button>
                  <button className="btn btn-ghost" onClick={() => setResultado(null)}>Atrás</button>
                </div>
              )}
              {resultado.accionSugerida === 'ninguna' && (
                <p style={{ fontStyle: 'italic', color: '#5C6B60' }}>Este turno ya fue cancelado. No hay acciones disponibles.</p>
              )}
            </div>
          )}

          <div className="stat-card">
            <h3 style={{ marginTop: 0 }}>Pendientes de confirmación</h3>
            {pendientes.length === 0 && <p style={{ color: '#5C6B60' }}>No hay reservas pendientes.</p>}
            {pendientes.map((p) => (
              <div
                key={p.id}
                style={{ padding: 10, borderRadius: 8, background: '#FCE4B8', marginBottom: 8, cursor: 'pointer' }}
                onClick={() => buscar(p.code)}
              >
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{p.code}</div>
                <div style={{ fontSize: 12, color: '#7A4A00' }}>{p.client_name} · {p.reservation_date}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'stats' && stats && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div style={{ fontSize: 13, color: '#5C6B60' }}>Confirmadas (7 días)</div>
              <div className="big-num">{stats.totalConfirmadas}</div>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: 13, color: '#5C6B60' }}>Pendientes</div>
              <div className="big-num">{stats.totalPendientes}</div>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: 13, color: '#5C6B60' }}>Cancha 1</div>
              <div className="big-num">{stats.reservasPorCancha.C1}</div>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: 13, color: '#5C6B60' }}>Cancha 2</div>
              <div className="big-num">{stats.reservasPorCancha.C2}</div>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: 13, color: '#5C6B60' }}>Pádel</div>
              <div className="big-num">{stats.reservasPorCancha.PAD}</div>
            </div>
          </div>

          <ExportPanel />
        </>
      )}
    </div>
  );
}
