import { useState } from 'react';
import { api } from '../api';
import { fechaLarga, hhmm } from '../lib/fechas';

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Paddle' };
const NOMBRES_TURNO = { T1: '20:00 a 21:30', T2: '21:30 a 22:30', T3: '22:30 a 23:30' };

export default function BookingModal({ slotInfo, onClose }) {
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    category: '',
    lookingForRival: false,
  });
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const esCanchaFutbol = slotInfo.court !== 'PAD';

  function actualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviarSolicitud() {
    setError(null);
    if (!form.clientName || !form.clientPhone) {
      setError('Completá tu nombre y teléfono.');
      return;
    }
    if (form.lookingForRival && !form.category) {
      setError('Si buscás rival, indicá la categoría del equipo.');
      return;
    }
    setEnviando(true);
    try {
      const payload = { ...form, date: slotInfo.date };
      const data = esCanchaFutbol
        ? await api.reservarFutbol({ ...payload, court: slotInfo.court, turn: slotInfo.turn })
        : await api.reservarPadel({ ...payload, startTime: slotInfo.startTime, endTime: slotInfo.endTime });
      setResultado(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const horario = esCanchaFutbol
    ? NOMBRES_TURNO[slotInfo.turn]
    : `${hhmm(slotInfo.startTime)} a ${hhmm(slotInfo.endTime)}`;

  const linkWhatsapp = resultado?.numeroWhatsapp
    ? `https://wa.me/${resultado.numeroWhatsapp}?text=${encodeURIComponent(resultado.mensajeWhatsapp || '')}`
    : null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {!resultado && (
          <>
            <h3>Solicitar turno</h3>
            <p className="subtitulo">
              {NOMBRE_CANCHA[slotInfo.court]} · {horario} · {fechaLarga(slotInfo.date)}
            </p>

            <div className="field">
              <label htmlFor="nombre">Tu nombre / equipo</label>
              <input id="nombre" value={form.clientName} onChange={(e) => actualizar('clientName', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="tel">WhatsApp</label>
              <input id="tel" inputMode="tel" value={form.clientPhone} onChange={(e) => actualizar('clientPhone', e.target.value)} placeholder="Ej: 3434551234" />
            </div>
            <div className="field">
              <label htmlFor="email">Email (para la confirmación)</label>
              <input id="email" type="email" value={form.clientEmail} onChange={(e) => actualizar('clientEmail', e.target.value)} />
            </div>
            <div className="field">
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.lookingForRival}
                  onChange={(e) => actualizar('lookingForRival', e.target.checked)}
                />
                Estoy buscando rival
              </label>
            </div>
            {form.lookingForRival && (
              <div className="field">
                <label htmlFor="categoria">Categoría del equipo</label>
                <input id="categoria" value={form.category} onChange={(e) => actualizar('category', e.target.value)} placeholder="Ej: Veteranos +40" />
              </div>
            )}

            {error && <p className="error-msg">{error}</p>}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-navy" onClick={enviarSolicitud} disabled={enviando}>
                {enviando ? 'Enviando...' : 'Continuar'}
              </button>
            </div>
          </>
        )}

        {resultado && (
          <>
            <h3>¡Ya casi!</h3>
            <p className="subtitulo">
              Transferí a: <strong>{resultado.aliasTransferencia || 'consultá el alias por WhatsApp'}</strong>
            </p>
            <div className="codigo-box">
              <div style={{ fontSize: 12, marginBottom: 4 }}>Tu código de reserva</div>
              <div className="codigo">{resultado.reserva.code}</div>
            </div>
            <p className="subtitulo">
              Enviá el comprobante de pago junto con este código por WhatsApp para confirmar tu turno.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
              {linkWhatsapp && (
                <a className="btn btn-gold" href={linkWhatsapp} target="_blank" rel="noreferrer">
                  Enviar WhatsApp
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
