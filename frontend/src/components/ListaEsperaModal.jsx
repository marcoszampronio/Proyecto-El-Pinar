import { useState } from 'react';
import { api } from '../api';
import { fechaLargaCompleta } from '../lib/fechas';

// Formulario chico: el cliente deja su WhatsApp para que le avisen si se
// libera un turno de fútbol ese día (cualquier cancha). No reserva nada.
export default function ListaEsperaModal({ fecha, onCerrar }) {
  const [nombre, setNombre] = useState('');
  const [area, setArea] = useState('');
  const [num, setNum] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const areaLimpia = area.replace(/\D/g, '');
  const numLimpio = num.replace(/\D/g, '');

  async function enviar() {
    setError(null);
    if (!nombre.trim()) { setError('Completá tu nombre.'); return; }
    if (areaLimpia.length < 2 || numLimpio.length < 6) {
      setError('Completá tu WhatsApp: característica y número.');
      return;
    }
    setEnviando(true);
    try {
      await api.anotarseEspera({
        date: fecha,
        clientName: nombre.trim(),
        clientPhone: `54 9 ${areaLimpia} ${numLimpio}`,
      });
      setListo(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const f = fechaLargaCompleta(fecha);
  const fechaTxt = f.charAt(0).toUpperCase() + f.slice(1);

  return (
    <div className="overlay" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {listo ? (
          <>
            <h3 className="modal-titulo">¡Listo!</h3>
            <p style={{ fontSize: 14 }}>
              Si se libera un turno de fútbol el <strong>{fechaTxt.toLowerCase()}</strong>,
              te escribimos por WhatsApp.
            </p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={onCerrar}>Cerrar</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="modal-titulo">Lista de espera</h3>
            <p className="modal-sub">Fútbol · {fechaTxt}</p>
            <p style={{ fontSize: 13, color: '#5C6B60', marginTop: 0 }}>
              Te avisamos por WhatsApp si se libera un turno para este día.
            </p>

            <div className="field">
              <label>Nombre</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            </div>

            <div className="field">
              <label>WhatsApp</label>
              <div className="tel-split">
                <span className="tel-fijo">+54&nbsp;9</span>
                <input
                  className="tel-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="343"
                  inputMode="numeric"
                  aria-label="Característica"
                />
                <span className="tel-fijo">15</span>
                <input
                  className="tel-num"
                  value={num}
                  onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="5134744"
                  inputMode="numeric"
                  aria-label="Número"
                />
              </div>
            </div>

            {error && <p className="error-msg">{error}</p>}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
              <button className="btn btn-primary" onClick={enviar} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Anotarme'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
