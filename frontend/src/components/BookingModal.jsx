import { useState } from 'react';
import { api } from '../api';

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
      const payload = {
        ...form,
        date: slotInfo.date,
      };
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

  const linkWhatsapp = resultado
    ? `https://wa.me/${resultado.numeroWhatsapp}?text=${encodeURIComponent(resultado.mensajeWhatsapp)}`
    : null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {!resultado && (
          <>
            <h3>Solicitar turno</h3>
            <p style={{ fontSize: 13, color: '#5C6B60', marginTop: 0 }}>
              {esCanchaFutbol
                ? `Cancha ${slotInfo.court.slice(1)} · ${slotInfo.turn} · ${slotInfo.date}`
                : `Pádel · ${slotInfo.startTime.slice(0, 5)} a ${slotInfo.endTime.slice(0, 5)} · ${slotInfo.date}`}
            </p>

            <div className="field">
              <label>Tu nombre / equipo</label>
              <input value={form.clientName} onChange={(e) => actualizar('clientName', e.target.value)} />
            </div>
            <div className="field">
              <label>WhatsApp</label>
              <input value={form.clientPhone} onChange={(e) => actualizar('clientPhone', e.target.value)} placeholder="Ej: 3434551234" />
            </div>
            <div className="field">
              <label>Email (para la confirmación)</label>
              <input value={form.clientEmail} onChange={(e) => actualizar('clientEmail', e.target.value)} type="email" />
            </div>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={form.lookingForRival}
                  onChange={(e) => actualizar('lookingForRival', e.target.checked)}
                  style={{ width: 'auto', marginRight: 8 }}
                />
                Estoy buscando rival
              </label>
            </div>
            {form.lookingForRival && (
              <div className="field">
                <label>Categoría del equipo</label>
                <input value={form.category} onChange={(e) => actualizar('category', e.target.value)} placeholder="Ej: Veteranos +40" />
              </div>
            )}

            {error && <p className="error-msg">{error}</p>}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={enviarSolicitud} disabled={enviando}>
                {enviando ? 'Enviando...' : 'Continuar'}
              </button>
            </div>
          </>
        )}

        {resultado && (
          <>
            <h3>¡Ya casi!</h3>
            <p style={{ fontSize: 14 }}>
              Transferí a: <strong>{resultado.aliasTransferencia}</strong>
            </p>
            <div className="codigo-box">
              <div style={{ fontSize: 12, marginBottom: 4 }}>Tu código de reserva</div>
              <div className="codigo">{resultado.reserva.code}</div>
            </div>
            <p style={{ fontSize: 13, color: '#5C6B60' }}>
              Enviá el comprobante de pago junto con este código por WhatsApp para confirmar tu turno.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
              <a className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }} href={linkWhatsapp} target="_blank" rel="noreferrer">
                Enviar WhatsApp
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
