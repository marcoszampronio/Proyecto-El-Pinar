import { useState, useEffect } from 'react';
import { api } from '../api';
import { fechaLargaCompleta, hhmm } from '../lib/fechas';
import MapaCanchaElegida from './MapaCanchaElegida';
import { IconRival } from './site/iconos';

const CATEGORIAS = ['M30', 'M40', 'Libre'];
const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel' };
// Fútbol usa el mapa (MapaCanchaElegida); solo el pádel lleva foto.
const FOTO_CANCHA = {
  PAD: { src: '/canchas/padel.jpg', pos: 'center 50%' },
};

export default function BookingModal({ slotInfo, onClose }) {
  const [form, setForm] = useState({
    clientName: '',
    phoneArea: '',
    phoneNum: '',
    lookingForRival: false,
    teamName: '',
    category: '',
    contacto_alterno: '', // honeypot: campo oculto, solo un bot lo completa
  });
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [errs, setErrs] = useState({}); // { campo: true } — campos que faltan
  const [enviando, setEnviando] = useState(false);

  // Mientras el modal está abierto, bloqueamos el scroll del fondo. El modal
  // NO se cierra tocando fuera: sólo con los botones (Cancelar / Cerrar), así
  // nadie pierde su turno guardado por un toque accidental.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, []);

  // El botón "atrás" del navegador cierra el modal y vuelve a la grilla de
  // turnos, en vez de sacar al cliente de la página. Empujamos una entrada
  // de historial al abrir (solo si no está puesta ya — en StrictMode el
  // efecto se monta/desmonta dos veces seguidas) y, si el cliente vuelve con
  // el botón atrás, cerramos el modal.
  useEffect(() => {
    if (window.history.state?.turnoModal !== true) {
      window.history.pushState({ turnoModal: true }, '');
    }
    const onPopState = () => onClose();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const esCanchaFutbol = slotInfo.court !== 'PAD';

  function actualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    const k = campo === 'phoneArea' || campo === 'phoneNum' ? 'telefono' : campo;
    setErrs((e) => (e[k] ? { ...e, [k]: false } : e));
  }

  const area = form.phoneArea.replace(/\D/g, '');
  const num = form.phoneNum.replace(/\D/g, '');
  const telefonoCompleto = area && num ? `54 9 ${area} ${num}` : '';

  async function enviarSolicitud() {
    const faltan = {};
    if (!form.clientName.trim()) faltan.clientName = true;
    if (area.length < 2 || num.length < 6) faltan.telefono = true;
    if (esCanchaFutbol && form.lookingForRival && !form.teamName.trim()) faltan.teamName = true;
    if (esCanchaFutbol && form.lookingForRival && !form.category) faltan.category = true;
    setErrs(faltan);
    if (Object.keys(faltan).length) {
      setError('Faltan datos por completar (marcados en rojo).');
      return;
    }
    setError(null);

    setEnviando(true);
    try {
      const payload = {
        clientName: form.clientName.trim(),
        clientPhone: telefonoCompleto,
        lookingForRival: esCanchaFutbol ? form.lookingForRival : false,
        teamName: esCanchaFutbol ? (form.teamName.trim() || null) : null,
        category: esCanchaFutbol ? (form.category || null) : null,
        date: slotInfo.date,
        contacto_alterno: form.contacto_alterno,
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

  const foto = FOTO_CANCHA[slotInfo.court];

  if (!resultado) {
    return (
      <div className="overlay" role="dialog" aria-modal="true">
        <div className="modal">
          {esCanchaFutbol ? (
            <MapaCanchaElegida court={slotInfo.court} />
          ) : foto && (
            <div className="modal-foto">
              <img src={foto.src} alt={`${NOMBRE_CANCHA[slotInfo.court]} de Complejo El Pinar, Paraná`} style={{ objectPosition: foto.pos }} />
              <span>{NOMBRE_CANCHA[slotInfo.court]}</span>
            </div>
          )}
          <h3 className="modal-titulo">Solicitar turno</h3>
          {(() => {
            const f = fechaLargaCompleta(slotInfo.date);
            const fecha = f.charAt(0).toUpperCase() + f.slice(1);
            const horario = esCanchaFutbol
              ? `${hhmm(slotInfo.start)} a ${hhmm(slotInfo.end)}`
              : `${hhmm(slotInfo.startTime)} a ${hhmm(slotInfo.endTime)}`;
            const cancha = esCanchaFutbol
              ? `${NOMBRE_CANCHA[slotInfo.court]} · Fútbol 11`
              : NOMBRE_CANCHA[slotInfo.court];
            return (
              <div className="resumen-turno">
                <div className="resumen-item">
                  <span className="resumen-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Fecha
                  </span>
                  <span className="resumen-valor">{fecha}</span>
                </div>
                <div className="resumen-item">
                  <span className="resumen-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15.5 14"></polyline></svg>
                    Horario
                  </span>
                  <span className="resumen-valor">{horario}</span>
                </div>
                <div className="resumen-item resumen-full">
                  <span className="resumen-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20 C4 15 8 15 8 11 C8 8 6 7 6 4"></path><path d="M12 20 C12 14 17 15 17 10 C17 6 14 6 14 3"></path></svg>
                    Cancha
                  </span>
                  <span className="resumen-valor">{cancha}</span>
                </div>
              </div>
            );
          })()}

          <div className={'field' + (errs.clientName ? ' field--error' : '')}>
            <label>Nombre completo</label>
            <input
              value={form.clientName}
              onChange={(e) => actualizar('clientName', e.target.value)}
              placeholder="Tu nombre y apellido"
            />
          </div>

          <div className={'field' + (errs.telefono ? ' field--error' : '')}>
            <label>Teléfono / WhatsApp</label>
            <div className="tel-split">
              <span className="tel-fijo">+54&nbsp;9</span>
              <input
                className="tel-area"
                value={form.phoneArea}
                onChange={(e) => actualizar('phoneArea', e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="343"
                inputMode="numeric"
                aria-label="Característica"
              />
              <span className="tel-fijo">15</span>
              <input
                className="tel-num"
                value={form.phoneNum}
                onChange={(e) => actualizar('phoneNum', e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="5134747"
                inputMode="numeric"
                aria-label="Número"
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--s-niebla)', marginTop: 4 }}>
              Poné la característica de tu zona y los números de tu celular (lo que va después del 15).
            </div>
          </div>

          {esCanchaFutbol && (
            <div className={'rival-opcion' + (form.lookingForRival ? ' on' : '')}>
              {/* Interruptor: toda la tarjeta es tocable. El checkbox real queda
                  oculto pero sigue siendo accesible por teclado y lector de pantalla. */}
              <label className="rival-opcion-cab">
                <input
                  type="checkbox"
                  role="switch"
                  checked={form.lookingForRival}
                  onChange={(e) => actualizar('lookingForRival', e.target.checked)}
                />
                <span className="rival-opcion-ico"><IconRival s={22} /></span>
                <span className="rival-opcion-txt">
                  <strong>Estoy buscando rival</strong>
                  <span>Tu equipo aparece en “Busco rival” para que otros te escriban.</span>
                </span>
                <span className="rival-switch" aria-hidden="true" />
              </label>

              {form.lookingForRival && (
                <div className="rival-campos">
                  <div className={'field' + (errs.teamName ? ' field--error' : '')}>
                    <label>Nombre del equipo</label>
                    <input
                      value={form.teamName}
                      onChange={(e) => actualizar('teamName', e.target.value)}
                      placeholder="Ej: Los Pibes FC"
                    />
                  </div>
                  <div className={'field' + (errs.category ? ' field--error' : '')}>
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

          <p className="modal-nota-parrilla">Contamos con parrilla y cantina</p>

          {/* Honeypot anti-bot: oculto para personas, los bots suelen completarlo igual. */}
          <input
            type="text"
            name="contacto_alterno"
            value={form.contacto_alterno}
            onChange={(e) => actualizar('contacto_alterno', e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          />

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
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h3 className="modal-titulo">¡Ya casi!</h3>
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          Tu turno está guardado. Mandanos el WhatsApp para dejarlo reservado.
        </p>

        <div className="resumen-reserva">
          <div className="resumen-titulo">Tu reserva</div>
          <p><strong>{NOMBRE_CANCHA[resultado.reserva.court] || resultado.reserva.court}</strong></p>
          <p>{(() => { const f = fechaLargaCompleta(resultado.reserva.reservation_date); return f.charAt(0).toUpperCase() + f.slice(1); })()}</p>
          <p>{hhmm(resultado.reserva.start_time)} a {hhmm(resultado.reserva.end_time)} hs</p>
        </div>

        <p style={{ fontSize: 13, color: 'var(--s-oro)', margin: '0 0 16px' }}>
          Si no apretás “Enviar WhatsApp” en {resultado.holdMinutos || 10} minutos, el turno se libera para otras personas.
        </p>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          <a
            className="btn btn-primary"
            style={{ textDecoration: 'none', textAlign: 'center' }}
            href={linkWhatsapp}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              // Deja el turno firme. No bloquea el link: si el aviso falla, Mateo igual
              // recibe el WhatsApp y puede reactivar el turno desde el panel.
              api
                .avisarWhatsappEnviado({
                  code: resultado.reserva.code,
                  clientPhone: resultado.reserva.client_phone,
                })
                .catch(() => {});
            }}
          >
            Enviar WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
