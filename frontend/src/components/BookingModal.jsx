import { useEffect, useState } from 'react';
import { api } from '../api';

const CATEGORIAS = ['M30', 'M40', 'Libre'];

export default function BookingModal({ slotInfo, onClose }) {
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    lookingForRival: false,
    teamName: '',
    category: '',
    parrilla: false,
  });
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [parrilla, setParrilla] = useState(null); // { disponibles, capacidad }

  const esCanchaFutbol = slotInfo.court !== 'PAD';

  useEffect(() => {
    api.disponibilidadParrilla(slotInfo.date)
      .then(setParrilla)
      .catch(() => setParrilla(null));
  }, [slotInfo.date]);

  const parrillaDisponible = parrilla ? parrilla.disponibles > 0 : true;

  function actualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviarSolicitud() {
    setError(null);
    if (!form.clientName.trim()) { setError('Completá tu nombre.'); return; }
    if (!form.clientPhone.trim()) { setError('Completá tu teléfono.'); return; }
    if (!form.clientEmail.trim()) { setError('Completá tu email.'); return; }
    if (esCanchaFutbol && form.lookingForRival && !form.teamName.trim()) {
      setError('Completá el nombre de tu equipo.');
      return;
    }
    if (esCanchaFutbol && form.lookingForRival && !form.category) {
      setError('Elegí la categoría del equipo.');
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        clientName: form.clientName.trim(),
        clientPhone: form.clientPhone.trim(),
        clientEmail: form.clientEmail.trim(),
        lookingForRival: esCanchaFutbol ? form.lookingForRival : false,
        teamName: esCanchaFutbol ? (form.teamName.trim() || null) : null,
        category: esCanchaFutbol ? (form.category || null) : null,
        parrilla: form.parrilla,
        date: slotInfo.date,
      };

      let data;
      if (esCanchaFutbol) {
        data = await api.reservarFutbol({ ...payload, court: slotInfo.court, turn: slotInfo.turn });
      } else {
        data = await api.reservarPadel({ ...payload, startTime: slotInfo.startTime, endTime: slotInfo.endTime });
      }
      setResultado(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const linkWhatsapp = resultado
    ? 'https://wa.me/' + resultado.numeroWhatsapp + '?text=' + encodeURIComponent(resultado.mensajeWhatsapp)
    : null;

  if (!resultado) {
    return (
      <div className="overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3 className="modal-titulo">Solicitar turno</h3>
          <p className="modal-sub">
            {esCanchaFutbol
              ? 'Cancha ' + slotInfo.court.slice(1) + ' · ' + slotInfo.turn + ' · ' + slotInfo.date
              : 'Paddle · ' + (slotInfo.startTime ? slotInfo.startTime.slice(0, 5) : '') + ' a ' + (slotInfo.endTime ? slotInfo.endTime.slice(0, 5) : '') + ' · ' + slotInfo.date}
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
              placeholder="Ej: 343 5134744"
              type="tel"
            />
            <div style={{ fontSize: 12, color: '#5C6B60', marginTop: 2 }}>
              Con característica. Sin +54. El 0 y el 15 podés ponerlos o no.
            </div>
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
            <div>
              <div className="field-check">
                <label>
                  <input
                    type="checkbox"
                    checked={form.lookingForRival}
                    onChange={(e) => actualizar('lookingForRival', e.target.checked)}
                  />
                  {' Estoy buscando rival'}
                </label>
              </div>

              {form.lookingForRival && (
                <div>
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
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parrilla: adicional opcional, por cantidad (hay 2 por noche) */}
          <div className="field-check">
            <label style={{ opacity: parrillaDisponible ? 1 : 0.5 }}>
              <input
                type="checkbox"
                checked={form.parrilla}
                disabled={!parrillaDisponible}
                onChange={(e) => actualizar('parrilla', e.target.checked)}
              />
              {' Sumar parrilla para el asado 🔥'}
            </label>
            <div style={{ fontSize: 12, color: '#5C6B60', marginTop: 2 }}>
              {parrilla == null
                ? ''
                : parrilla.disponibles > 0
                ? `Quedan ${parrilla.disponibles} de ${parrilla.capacidad} parrillas para esa fecha`
                : 'No quedan parrillas para esa fecha'}
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={enviarSolicitud} disabled={enviando}>
              {enviando ? 'Enviando...' : 'Continuar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-titulo">¡Ya casi!</h3>
        <p style={{ fontSize: 14, marginBottom: 8 }}>
          {'Transferí el monto al alias:'}<br />
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

        {resultado.reserva.parrilla && (
          <p style={{ fontSize: 13, fontWeight: 600, color: '#B45309', margin: '0 0 10px' }}>
            🔥 Incluye parrilla para asado
          </p>
        )}

        <p style={{ fontSize: 13, color: '#5C6B60', marginBottom: 16 }}>
          Enviá el comprobante de pago junto con este código por WhatsApp para confirmar tu turno.
        </p>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <a
            className="btn btn-primary"
            style={{ textDecoration: 'none', textAlign: 'center' }}
            href={linkWhatsapp}
            target="_blank"
            rel="noreferrer"
          >
            Enviar WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
