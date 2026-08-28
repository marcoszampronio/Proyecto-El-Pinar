import { useState } from 'react';
import { api } from '../api';

const CATEGORIAS = ['M30', 'M40', 'Libre'];

export default function BookingModal({ slotInfo, onClose }) {
  const [form, setForm] = useState({
    clientName: '', clientPhone: '', clientEmail: '',
    lookingForRival: false, teamName: '', category: '',
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
    if (!form.clientName.trim()) return setError('Completá tu nombre.');
    if (!form.clientPhone.trim()) return setError('Completá tu teléfono.');
    if (!form.clientEmail.trim()) return setError('Completá tu email.');
    if (esCanchaFutbol && form.lookingForRival && !form.teamName.trim()) return setError('Completá el nombre de tu equipo.');
    if (esCanchaFutbol && form.lookingForRival && !form.category) return setError('Elegí la categoría del equipo.');

    setEnviando(true);
    try {
      const payload = {
        clientName: form.clientName.trim(),
        clientPhone: form.clientPhone.trim(),
        clientEmail: form.clientEmail.trim(),
        lookingForRival: esCanchaFutbol ? form.lookingForRival : false,
        teamName: esCanchaFutbol ? (form.teamName.trim() || null) : null,
        category: esCanchaFutbol ? (form.category || null) : null,
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
        {!resultado ? (
          <>
            <h3 className="modal-titulo">Solicitar turno</h3>
            <p className="modal-sub">
              {esCanchaFutbol
                ? `Cancha ${slotInfo.court.slice(1)} · ${slotInfo.turn} · ${slotInfo.date}`
                : `Paddle · ${slotInfo.startTime?.slice(0,5)} a ${slotInfo.endTime?.slice(0,5)} · ${slotInfo.date}`}
            </p>

            <div className="field">
              <label>Nombre completo</label>
              <input
                value={form.clientName}
                onChange={(e) => actualizar('clientName', e.target.value)}
                placeholder="Tu nombre y apellido"
              />
            </div>
            <div className="field">
              <label>Teléfono / WhatsApp</label>
              <input
                value={form.clientPhone}
                onChange={(e) => actualizar('clientPhone', e.target.value)}
                placeholder="Ej: 3434551234"
                type="tel"
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                value={form.clientEmail}
                onChange={(e) => actualizar('clientEmail', e.target.value)}
                placeholder="Para recibir la confirmación"
                type="email"
              />
            </div>

            {esCanchaFutbol && (
              <>
                <div className="field-check">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.lookingForRival}
                      onChange={(e) => actualizar('lookingForRival', e.target.checked)}
                    />
                    Estoy buscando rival
                  </label>
                </div>

                {form.lookingForRival && (
                  <>
                    <div className="field">
                      <label>Nombre del equipo</label>
                      <input
                        value={form.teamName}
                        onChange={(e) => actualizar('teamName', e.target.value)}
                        placeholder="Ej: Los Pibes FC"
                      />
                    </div>
                    <div className="field">
                      <label>Categoría</label>
                      <select
                        value={form.category}
                        onChange={(e) => actualizar('category', e.target.value)}
                      >
                        <option value="">Seleccioná una categoría</option>
                        {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {error && <p className="error-msg">{error}</p>}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={enviarSolicitud} disabled={enviando}>
                {enviando ? 'Enviando...' : 'Continuar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="modal-titulo">¡Ya casi!</h3>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              Transferí el monto al alias:<br />
              <strong style={{ fontSize: 16 }}>
                {resultado.aliasTransferencia || 'Consultá el alias por WhatsApp'}
              </strong>
            </p>
            <div className="codigo-box">
              <div style={{ fontSize: 12, marginBottom: 6, opacity: 0.8 }}>Tu código de reserva</div>
              <div className="codigo">{resultado.reserva.code}</div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
                Guardá este código — lo vas a necesitar para confirmar
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#5C6B60', marginBottom: 16 }}>
              Enviá el comprobante de pago junto con este código por WhatsApp para confirmar tu turno.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
              
                className="btn btn-primary"
                style={{ textDecoration: 'none', textAlign: 'center' }}
                href={linkWhatsapp}
                target="_blank"
                rel="noreferrer"
              >
                📲 Enviar WhatsApp
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}