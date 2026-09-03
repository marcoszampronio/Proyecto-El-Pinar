import { useState } from 'react';
import { api } from '../api';
import { fechaLargaCompleta } from '../lib/fechas';

const TEXTO_ESTADO = {
  pendiente: { txt: 'Pendiente de confirmación', color: '#A57F2E' },
  confirmada: { txt: '✓ Confirmada', color: '#2E7D5B' },
  cancelada: { txt: 'Cancelada', color: '#B3382E' },
};

export default function ConsultaReserva({ onCerrar }) {
  const [code, setCode] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(null);
  const [reserva, setReserva] = useState(null);

  async function buscar() {
    const c = code.trim();
    if (!c) return;
    setBuscando(true);
    setError(null);
    setReserva(null);
    try {
      setReserva(await api.consultarReserva(c));
    } catch (e) {
      setError(e.message);
    } finally {
      setBuscando(false);
    }
  }

  const e = reserva ? (TEXTO_ESTADO[reserva.estado] || { txt: reserva.estado, color: '#555' }) : null;
  const fecha = reserva ? fechaLargaCompleta(reserva.fecha) : '';

  return (
    <div className="consulta">
      <div className="consulta-top">
        <strong>Buscar mi reserva</strong>
        <button className="consulta-x" onClick={onCerrar} aria-label="Cerrar">✕</button>
      </div>
      <div className="consulta-form">
        <input
          autoFocus
          value={code}
          onChange={(ev) => setCode(ev.target.value)}
          onKeyDown={(ev) => ev.key === 'Enter' && buscar()}
          placeholder="RES-C1-02SEP-T1"
        />
        <button className="btn btn-navy" onClick={buscar} disabled={buscando}>
          {buscando ? '...' : 'Buscar'}
        </button>
      </div>

      {error && <p className="consulta-error">{error}</p>}

      {reserva && (
        <div className="consulta-result">
          <div className="consulta-estado" style={{ color: e.color }}>{e.txt}</div>
          <div>{fecha.charAt(0).toUpperCase() + fecha.slice(1)}</div>
          <div>{reserva.cancha} · {reserva.inicio} a {reserva.fin} hs</div>
          {reserva.parrilla && <div>🔥 Consultaste por la parrilla</div>}
          {reserva.estado === 'pendiente' && (
            <p className="consulta-nota">
              Esperando que confirmemos tu comprobante. Si ya lo mandaste por WhatsApp, aguardá un rato.
            </p>
          )}
          {reserva.estado === 'cancelada' && reserva.vencioPorSistema && (
            <p className="consulta-nota">
              Se liberó por falta de comprobante. Si transferiste, escribinos por WhatsApp con tu código.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
