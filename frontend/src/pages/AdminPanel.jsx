import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { api } from '../api';
import { nombreEquipo } from '../lib/equipo';
import { fechaCorta, primerNombre, unir } from '../lib/mensajes';
import ImagenBuscoRivalModal from '../components/ImagenBuscoRival';
import { DeshacerProvider, useDeshacer } from '../components/panel/Deshacer';
import EstadisticasDecidir from '../components/panel/EstadisticasDecidir';
import {
  hoyISO, proximoDiaHabilitado, fechaLargaCompleta, partesFecha,
  hhmm, sumarDias, esDiaHabilitado, lunesDeLaSemana,
} from '../lib/fechas';

const API_URL = import.meta.env.VITE_API_URL;
const SITIO_URL = import.meta.env.VITE_SITIO_URL || 'https://complejo-el-pinar.pages.dev';

// Mensaje de WhatsApp para avisarle a un contacto que hay turnos libres.
// libres: texto con los turnos, ej. "martes 20/10: 20:30 y 21:30 · miércoles 21/10: 22:30".
function mensajeAvisoTurnos(nombre, libres) {
  const que = libres
    ? `Tenemos turnos de fútbol libres: ${libres}. `
    : `Esta semana tenemos turnos de fútbol libres. `;
  return `Hola ${primerNombre(nombre)}! ${que}Reservá acá: ${SITIO_URL}`;
}

async function tokenAdmin() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// Botón con confirmación en dos pasos (sin window.confirm, que algunos navegadores bloquean).
function BotonConfirmar({ label, confirmLabel = '¿Seguro? Tocá de nuevo', onConfirm, className = 'btn btn-danger', disabled, style }) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(t);
  }, [armado]);
  return (
    <button
      className={className}
      style={style}
      disabled={disabled}
      onClick={() => {
        if (armado) { setArmado(false); onConfirm(); }
        else setArmado(true);
      }}
    >
      {armado ? confirmLabel : label}
    </button>
  );
}

// Navegador de fecha: ‹  Martes 1 de septiembre  ›  + acceso a un date picker.
function NavegadorFecha({ fecha, onCambiar, soloHabilitados = true }) {
  const [abrirPicker, setAbrirPicker] = useState(false);
  const p = partesFecha(fecha);

  function saltar(dir) {
    let f = sumarDias(fecha, dir);
    if (soloHabilitados) {
      for (let i = 0; i < 7 && !esDiaHabilitado(f); i++) f = sumarDias(f, dir);
    }
    onCambiar(f);
  }

  return (
    <div className="agenda-nav">
      <div className="agenda-nav-row">
        <button className="agenda-flecha" onClick={() => saltar(-1)} aria-label="Día anterior">‹</button>
        <button className="agenda-fecha" onClick={() => setAbrirPicker((v) => !v)}>
          <span className="agenda-fecha-dia">{p.diaSemana} {p.diaNum}</span>
          <span className="agenda-fecha-mes">{p.mes} {p.anio}</span>
        </button>
        <button className="agenda-flecha" onClick={() => saltar(1)} aria-label="Día siguiente">›</button>
      </div>
      {abrirPicker && (
        <input
          type="date"
          className="agenda-datepicker"
          value={fecha}
          onChange={(e) => { if (e.target.value) { onCambiar(e.target.value); setAbrirPicker(false); } }}
        />
      )}
    </div>
  );
}

const TURNOS_FUTBOL_LABEL = {
  T1: '20:30 a 21:30',
  T2: '21:30 a 22:30',
  T3: '22:30 a 23:30',
};

// Modal para que Mateo agende un turno el mismo (cliente que le escribe
// directo por WhatsApp), ya confirmado. Puede marcarlo "busca rival".
function ManualBookingModal({ contacto, inicial, onCerrar, onCreado }) {
  const [cancha, setCancha] = useState(inicial?.court || 'C1');
  const [fecha, setFecha] = useState(() => inicial?.date || proximoDiaHabilitado(hoyISO()));
  const [turn, setTurn] = useState(inicial?.turn || 'T1');

  // Si no viene de un contacto (se tocó una celda libre), se piden el nombre y el WhatsApp acá.
  const [nombreIn, setNombreIn] = useState('');
  const [area, setArea] = useState('');
  const [num, setNum] = useState('');
  const areaLimpia = area.replace(/\D/g, '');
  const numLimpio = num.replace(/\D/g, '');
  const quien = contacto || { nombre: nombreIn.trim(), telefono: `54 9 ${areaLimpia} ${numLimpio}` };
  const [padelStart, setPadelStart] = useState(inicial?.padelStart || '20:00');
  const [padelEnd, setPadelEnd] = useState(inicial?.padelEnd || '21:00');
  const [lookingForRival, setLookingForRival] = useState(false);
  const [teamName, setTeamName] = useState(contacto?.equipo || '');
  const [category, setCategory] = useState('');

  // Buscador de contactos (cuando no viene de un contacto): se busca por equipo, nombre o teléfono.
  const [contactos, setContactos] = useState([]);
  const [foco, setFoco] = useState(false);
  useEffect(() => {
    if (!contacto) api.adminContactos().then((d) => setContactos(d.contactos || [])).catch(() => {});
    // eslint-disable-next-line
  }, []);
  const sugerencias = nombreIn.trim().length >= 1
    ? contactos
        .filter((c) => `${c.equipo || ''} ${c.nombre} ${c.telefono}`.toLowerCase().includes(nombreIn.trim().toLowerCase()))
        .slice(0, 6)
    : [];
  function elegirContacto(c) {
    setNombreIn(c.nombre);
    const p = partirTelefono(c.telefono);
    setArea(p.area);
    setNum(p.num);
    if (c.equipo) setTeamName(c.equipo);
    setFoco(false);
  }

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [hecho, setHecho] = useState(null);
  const [waConfirm, setWaConfirm] = useState(null);
  const [waAbierto, setWaAbierto] = useState(false);
  const [imagenAbierta, setImagenAbierta] = useState(false);

  const esFutbol = cancha !== 'PAD';

  // Disponibilidad real de la cancha/fecha elegida, para no ofrecer turnos
  // que ya están ocupados (antes solo se enteraba al chocar con el error
  // del servidor después de completar todo el formulario).
  const [disponibilidad, setDisponibilidad] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setDisponibilidad(null);
    const pedido = cancha === 'PAD'
      ? api.disponibilidadPadel(fecha, { sinAnticipacion: true })
      : api.disponibilidadFutbol(cancha, fecha, { sinAnticipacion: true });
    pedido.then((d) => { if (!cancelado) setDisponibilidad(d); }).catch(() => {});
    return () => { cancelado = true; };
  }, [cancha, fecha]);

  // si el turno elegido queda ocupado al cambiar cancha/fecha, saltar al
  // primer turno libre para que el formulario nunca quede en un estado
  // que el servidor va a rechazar.
  useEffect(() => {
    if (!esFutbol || !disponibilidad?.turnos) return;
    const actual = disponibilidad.turnos.find((x) => x.turn === turn);
    if (actual && actual.status !== 'libre') {
      const libre = disponibilidad.turnos.find((x) => x.status === 'libre');
      if (libre) setTurn(libre.turn);
    }
  }, [disponibilidad, esFutbol]);

  // Avisar y frenar el botón acá mismo, en vez de que Mateo se entere recién
  // con el error del servidor después de completar todo.
  const turnoActual = esFutbol ? disponibilidad?.turnos?.find((x) => x.turn === turn) : null;
  const turnoOcupado = !!turnoActual && turnoActual.status !== 'libre';
  const sinTurnosLibres = esFutbol && !!disponibilidad?.turnos && disponibilidad.turnos.every((x) => x.status !== 'libre');
  const padelRangoInvalido = !esFutbol && padelStart >= padelEnd;
  const padelSolapa = !esFutbol && !padelRangoInvalido && !!disponibilidad?.ocupados
    && disponibilidad.ocupados.some((o) => padelStart < hhmm(o.end_time) && padelEnd > hhmm(o.start_time));
  const bloqueoMsg = padelRangoInvalido
    ? 'La hora "Hasta" tiene que ser posterior a "Desde".'
    : padelSolapa
    ? 'Ese horario se pisa con otra reserva de pádel. Elegí otro rango.'
    : sinTurnosLibres
    ? 'No quedan turnos libres ese día en esta cancha. Probá con otro día u otra cancha.'
    : null;
  const bloqueado = !!bloqueoMsg || turnoOcupado;

  async function agendar() {
    setError(null);
    if (!contacto && !nombreIn.trim()) {
      setError('Completá el nombre del cliente.');
      return;
    }
    if (!contacto && (areaLimpia.length < 2 || numLimpio.length < 6)) {
      setError('Completá el WhatsApp: característica y número.');
      return;
    }
    if (esFutbol && lookingForRival && !teamName.trim()) {
      setError('Completá el nombre del equipo.');
      return;
    }
    if (esFutbol && lookingForRival && !category) {
      setError('Elegí la categoría del equipo.');
      return;
    }
    setEnviando(true);
    try {
      const payload = {
        court: cancha,
        date: fecha,
        clientName: quien.nombre,
        clientPhone: quien.telefono,
        lookingForRival: esFutbol && lookingForRival,
        teamName: esFutbol ? (teamName.trim() || null) : null,
        category: esFutbol && lookingForRival ? category : null,
        ...(esFutbol ? { turn } : { startTime: `${padelStart}:00`, endTime: `${padelEnd}:00` }),
      };
      const data = await api.adminAgendarManual(payload);
      setHecho(data.reserva);
      setWaConfirm(data.linkWhatsappConfirmacion || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (hecho) {
    return (
      <div className="overlay" role="dialog" aria-modal="true">
        <div className="modal">
          <h3 className="modal-titulo">¡Turno agendado y confirmado!</h3>
          <p style={{ fontSize: 'var(--pt-chico)' }}>
            {hecho.client_name} — {NOMBRE_CANCHA[hecho.court]} · {hhmm(hecho.start_time)} a {hhmm(hecho.end_time)} · {hecho.reservation_date}
            {hecho.looking_for_rival ? ' · en Busco rival' : ''}
          </p>
          <p style={{ fontSize: 'var(--pt-chico)', color: 'var(--p-mut)', marginTop: 0 }}>
            {waConfirm
              ? 'Mandale la confirmación por WhatsApp con todos los datos del turno.'
              : 'El teléfono del contacto no sirve para WhatsApp — avisale vos por otro medio.'}
          </p>
          {hecho.looking_for_rival && ['C1', 'C2'].includes(hecho.court) && (
            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginBottom: 12 }}
              onClick={() => setImagenAbierta(true)}
            >
              Generar imagen para Instagram
            </button>
          )}
          {imagenAbierta && (
            <ImagenBuscoRivalModal
              reserva={hecho}
              fecha={hecho.reservation_date || fecha}
              nombreCancha={NOMBRE_CANCHA[hecho.court]}
              onCerrar={() => setImagenAbierta(false)}
            />
          )}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => onCreado(hecho)}>Listo</button>
            {waConfirm && (
              <a
                className="btn btn-primary"
                style={{ textDecoration: 'none', textAlign: 'center' }}
                href={waConfirm}
                target="_blank"
                rel="noreferrer"
                onClick={() => setWaAbierto(true)}
              >
                {waAbierto ? '✓ WhatsApp abierto' : 'Enviar confirmación por WhatsApp'}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h3 className="modal-titulo">Agendar turno manual</h3>
        {contacto ? (
          <p className="modal-sub">{contacto.nombre} · {contacto.telefono}</p>
        ) : (
          <>
            <div className="field" style={{ position: 'relative' }}>
              <label>Cliente o equipo</label>
              <input
                value={nombreIn}
                onChange={(e) => { setNombreIn(e.target.value); setFoco(true); }}
                onFocus={() => setFoco(true)}
                onBlur={() => setTimeout(() => setFoco(false), 150)}
                placeholder="Buscá un contacto o escribí un nombre"
                autoComplete="off"
              />
              {foco && sugerencias.length > 0 && (
                <div className="ac-lista">
                  {sugerencias.map((c) => (
                    <button
                      key={c.manualId || c.telefonoWa || c.telefono}
                      type="button"
                      className="ac-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => elegirContacto(c)}
                    >
                      <strong>{c.equipo ? nombreEquipo(c.equipo) : c.nombre}</strong>
                      <span>{c.equipo ? `${c.nombre} · ` : ''}{c.telefono}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="field">
              <label>WhatsApp</label>
              <div className="tel-split">
                <span className="tel-fijo">+54&nbsp;9</span>
                <input className="tel-area" value={area} onChange={(e) => setArea(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="343" inputMode="numeric" aria-label="Característica" />
                <span className="tel-fijo">15</span>
                <input className="tel-num" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="5134747" inputMode="numeric" aria-label="Número" />
              </div>
            </div>
          </>
        )}

        <div className="field">
          <label>Cancha</label>
          <select value={cancha} onChange={(e) => setCancha(e.target.value)}>
            <option value="C1">Cancha 1</option>
            <option value="C2">Cancha 2</option>
            <option value="PAD">Pádel</option>
          </select>
        </div>

        <NavegadorFecha fecha={fecha} onCambiar={setFecha} />

        {esFutbol ? (
          <div className="field">
            <label>Turno</label>
            <select value={turn} onChange={(e) => setTurn(e.target.value)}>
              {Object.entries(TURNOS_FUTBOL_LABEL).map(([t, label]) => {
                const info = disponibilidad?.turnos?.find((x) => x.turn === t);
                const ocupado = info && info.status !== 'libre';
                return (
                  <option key={t} value={t} disabled={ocupado}>
                    {label}{ocupado ? ' — ocupado' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Desde</label>
              <input type="time" value={padelStart} onChange={(e) => setPadelStart(e.target.value)} min="20:00" max="23:00" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Hasta</label>
              <input type="time" value={padelEnd} onChange={(e) => setPadelEnd(e.target.value)} min="20:30" max="23:30" />
            </div>
          </div>
        )}

        {!esFutbol && disponibilidad?.ocupados?.length > 0 && (
          <p style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)', margin: '-6px 0 14px' }}>
            Ya ocupado ese día: {disponibilidad.ocupados.map((o) => `${hhmm(o.start_time)}–${hhmm(o.end_time)}`).join(', ')}
          </p>
        )}

        {esFutbol && (
          <>
            <div className="field">
              <label>Equipo (opcional)</label>
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ej: Los Pibes FC" />
            </div>
            <div className="field-check">
              <label>
                <input type="checkbox" checked={lookingForRival} onChange={(e) => setLookingForRival(e.target.checked)} />
                {' Poner en Busco rival'}
              </label>
            </div>
            {lookingForRival && (
              <>
                <div className="field">
                  <label>Categoría</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Seleccioná una categoría</option>
                    {['M30', 'M40', 'Libre'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
          </>
        )}

        {bloqueoMsg && <p className="error-msg">{bloqueoMsg}</p>}
        {error && <p className="error-msg">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-primary" onClick={agendar} disabled={enviando || bloqueado}>
            {enviando ? 'Agendando…' : 'Agendar y confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportPanel() {
  const hoy = new Date().toISOString().slice(0, 10);
  const haceTresMeses = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [desde, setDesde] = useState(haceTresMeses);
  const [hasta, setHasta] = useState(hoy);
  const [descargando, setDescargando] = useState(false);
  const [backup, setBackup] = useState(null);

  async function backupAhora() {
    setBackup('...');
    try {
      const r = await api.adminBackupAhora();
      setBackup(
        r.enviado
          ? `Backup enviado a ${r.destinatarios.join(', ')} (${r.total} reservas)${r.simulado ? ' — SIMULADO, falta configurar el email' : ''}`
          : `No se envió: ${r.error || r.omitido}`
      );
    } catch (e) {
      setBackup('Error: ' + e.message);
    }
  }

  async function descargarExcel() {
    setDescargando(true);
    try {
      const token = await tokenAdmin();
      const res = await fetch(
        `${API_URL}/admin/export/excel?desde=${desde}&hasta=${hasta}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('El servidor no pudo generar el reporte');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-el-pinar-${desde}-a-${hasta}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('No se pudo descargar el reporte: ' + e.message);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="stat-card" style={{ margin: '12px 20px' }}>
      <h3 style={{ marginTop: 0 }}>Reporte en Excel</h3>
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
      <button className="btn btn-primary" onClick={descargarExcel} disabled={descargando} style={{ width: '100%' }}>
        {descargando ? 'Generando...' : '⬇ Descargar reporte (.xlsx)'}
      </button>
      <hr style={{ border: 'none', borderTop: '1px solid var(--p-linea)', margin: '14px 0' }} />
      <button className="btn btn-ghost" onClick={backupAhora} disabled={backup === '...'} style={{ width: '100%' }}>
        {backup === '...' ? 'Enviando...' : 'Enviar backup por email ahora'}
      </button>
      {backup && backup !== '...' && (
        <p style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)', marginBottom: 0 }}>{backup}</p>
      )}
    </div>
  );
}

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel', PAR: 'Parrilla' };

// 'Martes 27 de octubre' (en vez de la fecha cruda 2026-10-27).
const fechaLinda = (iso) => {
  const f = fechaLargaCompleta(iso);
  return f.charAt(0).toUpperCase() + f.slice(1);
};

// Una cifra de las Estadísticas.
function Cifra({ titulo, valor, sub }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: 'var(--pt-chico)', color: 'var(--p-mut)' }}>{titulo}</div>
      <div className="big-num">{valor}</div>
      {sub && <div style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)' }}>{sub}</div>}
    </div>
  );
}

function Semaforo({ ok, label, detalle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0' }}>
      <span style={{ fontSize: 'var(--pt-cuerpo)', lineHeight: 1.3 }}>{ok ? '🟢' : '🔴'}</span>
      <div>
        <div style={{ fontSize: 'var(--pt-chico)', fontWeight: 600 }}>{label}</div>
        {detalle && <div style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)' }}>{detalle}</div>}
      </div>
    </div>
  );
}

function EstadoSistema() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setD(await api.adminDiagnostico());
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  return (
    <details className="stat-card estado-sistema" style={{ margin: '12px 20px 0' }}>
      <summary>
        <span>Estado del sistema</span>
        {d && <span aria-hidden="true">{d.baseDatos.ok && d.email.ok ? '🟢' : '🔴'}</span>}
      </summary>
      <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 'var(--pt-micro)', marginTop: 10 }} onClick={cargar} disabled={cargando}>
        {cargando ? '...' : 'Actualizar'}
      </button>
      {error && <p className="error-msg">{error}</p>}
      {d && (
        <div style={{ marginTop: 8 }}>
          <Semaforo ok label="Backend en línea" detalle={`Prendido hace ${Math.round(d.uptimeSegundos / 60)} min`} />
          <Semaforo ok={d.baseDatos.ok} label="Base de datos" detalle={d.baseDatos.ok ? 'Conecta OK' : d.baseDatos.error} />
          <Semaforo
            ok={d.email.ok}
            label="Email (envío de confirmaciones y backup)"
            detalle={
              d.email.ok
                ? `OK vía ${d.email.proveedor}, sale de ${d.email.remitente}`
                : d.email.configurado
                ? `${d.email.proveedor}: ${d.email.error}`
                : d.email.error || 'Sin configurar — los emails NO se envían'
            }
          />
          <Semaforo
            ok={!!d.email.ok}
            label="Backup por email"
            detalle={
              (d.backup.ultimoEnvio ? `Último: ${d.backup.ultimoEnvio}. ` : '') +
              `Automático ${d.backup.frecuencia || 'cada viernes'} a las ${d.backup.horaProgramadaART}:00`
            }
          />
          <Semaforo
            ok={d.corsOrigenes.length > 0}
            label="CORS (seguridad)"
            detalle={d.corsOrigenes.length ? d.corsOrigenes.join(', ') : 'Abierto a cualquier origen — conviene restringirlo'}
          />
        </div>
      )}
    </details>
  );
}

// Activa/desactiva "busco rival" en una reserva confirmada de fútbol:
// "Ya consiguió rival" la saca del calendario público, "Poner en Busco rival"
// la agrega (con equipo/categoría).
function RivalToggle({ reserva, fecha, onCambio }) {
  const [abrir, setAbrir] = useState(false);
  const [teamName, setTeamName] = useState(reserva.team_name || '');
  const [category, setCategory] = useState(reserva.category || '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [imagenAbierta, setImagenAbierta] = useState(false);

  async function sacar() {
    setEnviando(true);
    setError(null);
    try {
      const data = await api.adminRival(reserva.code, { lookingForRival: false });
      onCambio(data.reserva);
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  async function activar() {
    if (!teamName.trim()) { setError('Completá el nombre del equipo.'); return; }
    if (!category) { setError('Elegí la categoría del equipo.'); return; }
    setEnviando(true);
    setError(null);
    try {
      const data = await api.adminRival(reserva.code, { lookingForRival: true, teamName: teamName.trim(), category });
      onCambio(data.reserva);
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  if (reserva.looking_for_rival) {
    return (
      <div style={{ marginTop: 8 }}>
        <BotonConfirmar
          label={enviando ? 'Actualizando…' : 'Ya consiguió rival (sacar de Busco rival)'}
          confirmLabel="Confirmar: sacar de Busco rival"
          onConfirm={sacar}
          disabled={enviando}
          className="btn btn-ghost"
          style={{ width: '100%' }}
        />
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setImagenAbierta(true)}>
          Generar imagen para Instagram
        </button>
        {imagenAbierta && (
          <ImagenBuscoRivalModal
            reserva={reserva}
            fecha={reserva.reservation_date || fecha}
            nombreCancha={NOMBRE_CANCHA[reserva.court]}
            onCerrar={() => setImagenAbierta(false)}
          />
        )}
        {error && <p className="error-msg">{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      {!abrir ? (
        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setAbrir(true)}>
          Poner en Busco rival
        </button>
      ) : (
        <div style={{ marginTop: 4 }}>
          <div className="field">
            <label>Nombre del equipo</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ej: Los Pibes FC" />
          </div>
          <div className="field">
            <label>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Seleccioná una categoría</option>
              {['M30', 'M40', 'Libre'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setAbrir(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={activar} disabled={enviando}>
              {enviando ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetalleReserva({ reserva, espera = [], fecha, onCancelado }) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const [waAbierto, setWaAbierto] = useState(false);
  const [cancelado, setCancelado] = useState(false);

  async function cancelar() {
    setProcesando(true);
    setError(null);
    try {
      await api.adminCancelar(reserva.code);
      // Si hay gente en la lista de espera, la mostramos acá mismo para
      // avisarles. Si no, refrescamos directamente.
      if (espera.length > 0 && ['C1', 'C2'].includes(reserva.court)) setCancelado(true);
      else onCancelado();
    } catch (e) {
      setError(e.message);
      setProcesando(false);
    }
  }

  // Mensaje de "se liberó" con el turno puntual, reusando el número ya
  // normalizado por el backend (wa.me/<num>?text=...).
  function linkLiberado(e) {
    if (!e.linkWhatsapp) return null;
    const base = e.linkWhatsapp.split('?text=')[0];
    const msg =
      `Hola ${primerNombre(e.client_name)}! Se liberó la ${NOMBRE_CANCHA[reserva.court]} el ${fechaCorta(fecha)} ` +
      `a las ${hhmm(reserva.start_time)} 🙌 ¿La querés? Respondenos y te la reservamos.`;
    return `${base}?text=${encodeURIComponent(msg)}`;
  }

  if (cancelado) {
    return (
      <div className="agenda-detalle">
        <p style={{ color: 'var(--p-ok)', fontWeight: 600, marginTop: 0 }}>
          Turno cancelado. Se liberó {NOMBRE_CANCHA[reserva.court]} {hhmm(reserva.start_time)}–{hhmm(reserva.end_time)}.
        </p>
        <p style={{ fontSize: 'var(--pt-chico)', fontWeight: 600, margin: '10px 0 6px' }}>
          Avisá a la lista de espera ({espera.length}):
        </p>
        {espera.map((e) => (
          <EsperaItem key={e.id} e={{ ...e, linkWhatsapp: linkLiberado(e) }} onAccion={() => {}} />
        ))}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} onClick={onCancelado}>
          Listo
        </button>
      </div>
    );
  }

  return (
    <div className="agenda-detalle">
      <div className="agenda-detalle-cancha">
        {NOMBRE_CANCHA[reserva.court]} · {hhmm(reserva.start_time)} a {hhmm(reserva.end_time)}
      </div>
      <div className={`agenda-detalle-estado ${reserva.status}`}>
        {reserva.status === 'pendiente' ? 'Pendiente de confirmar' : 'Confirmada'}
      </div>
      <div className="agenda-detalle-cliente">
        {reserva.team_name ? `${nombreEquipo(reserva.team_name)} · ${reserva.client_name}` : reserva.client_name}
        {reserva.looking_for_rival && reserva.category ? ` (${reserva.category})` : ''}
      </div>
      <div className="agenda-detalle-meta">
        Tel: {reserva.client_phone}{reserva.client_email ? ` · ${reserva.client_email}` : ''}
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="modal-actions" style={{ marginTop: 10 }}>
        <BotonConfirmar
          label={procesando ? 'Cancelando…' : 'Cancelar turno'}
          confirmLabel="Confirmar cancelación"
          onConfirm={cancelar}
          disabled={procesando}
        />
        {reserva.linkWhatsappCancelacion ? (
          <a
            className={`btn ${waAbierto ? 'btn-ghost' : 'btn-primary'}`}
            style={{ textDecoration: 'none', textAlign: 'center' }}
            href={reserva.linkWhatsappCancelacion}
            target="_blank"
            rel="noreferrer"
            onClick={() => setWaAbierto(true)}
          >
            {waAbierto ? '✓ WhatsApp abierto' : 'Avisar por WhatsApp'}
          </a>
        ) : (
          <span style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-bad)' }}>Sin número válido para WhatsApp</span>
        )}
      </div>

      {reserva.status === 'confirmada' && ['C1', 'C2'].includes(reserva.court) && (
        <RivalToggle reserva={reserva} fecha={fecha} onCambio={onCancelado} />
      )}
    </div>
  );
}

const ESTADO_BADGE = {
  libre: { txt: 'Libre', cls: 'agenda-badge libre' },
  pendiente: { txt: 'A confirmar', cls: 'agenda-badge pendiente' },
  confirmada: { txt: 'Reservado', cls: 'agenda-badge ocupada' },
};

const TXT_ESTADO = { libre: 'Libre', pendiente: 'A confirmar', confirmada: 'Reservado', bloqueado: 'Bloqueado' };

// Grilla visual de fútbol: Cancha 1 y Cancha 2 en columnas, turnos en filas.
function GrillaFutbol({ agenda, sel, onCelda, onLibre }) {
  const turnos = agenda.futbol.C1.map((s) => ({ turn: s.turn, start: s.start, end: s.end }));
  return (
    <div className="grilla">
      <div className="grilla-esq" />
      <div className="grilla-cab">Cancha 1</div>
      <div className="grilla-cab">Cancha 2</div>

      {turnos.map((t, i) => (
        <div className="grilla-fila" key={t.turn} style={{ display: 'contents' }}>
          <div className="grilla-hora">{hhmm(t.start)}<span>{hhmm(t.end)}</span></div>
          {['C1', 'C2'].map((court) => {
            const slot = agenda.futbol[court][i];
            const r = slot.reserva;
            const activo = r && sel === r.code;
            return (
              <button
                key={court}
                className={`grilla-celda ${slot.status} ${activo ? 'sel' : ''}`}
                disabled={!r && !(onLibre && slot.status === 'libre')}
                title={!r && onLibre && slot.status === 'libre' ? 'Agendar un turno acá' : undefined}
                onClick={() => (r ? onCelda(r.code) : onLibre && slot.status === 'libre' && onLibre(court, t.turn))}
              >
                <span className="grilla-celda-nombre">{r ? (r.team_name ? nombreEquipo(r.team_name) : r.client_name.split(' ')[0]) : ''}</span>
                <span className="grilla-celda-estado">{TXT_ESTADO[slot.status]}</span>
                {r && r.looking_for_rival && <span className="grilla-celda-rival">Busco rival</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Línea de tiempo de pádel: barra 20:00–23:30 con los tramos ocupados.
function TimelinePadel({ reservas, sel, onTramo }) {
  const INICIO = 20 * 60; // 20:00 en minutos
  const FIN = 23 * 60 + 30;
  const total = FIN - INICIO;
  const min = (hhmmss) => {
    const [h, m] = hhmmss.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  };
  return (
    <div>
      <div className="tl">
        {[20, 21, 22, 23].map((h) => (
          <span key={h} className="tl-marca" style={{ left: `${((h * 60 - INICIO) / total) * 100}%` }}>{h}</span>
        ))}
        {reservas.map((r) => {
          const a = Math.max(min(r.start_time), INICIO);
          const b = Math.min(min(r.end_time), FIN);
          return (
            <button
              key={r.code}
              className={`tl-tramo ${r.status} ${sel === r.code ? 'sel' : ''}`}
              style={{ left: `${((a - INICIO) / total) * 100}%`, width: `${((b - a) / total) * 100}%` }}
              onClick={() => onTramo(r.code)}
              title={`${r.client_name} · ${hhmm(r.start_time)}-${hhmm(r.end_time)}`}
            >
              {r.client_name.split(' ')[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Lista de espera del día: gente que pidió que le avisen si se libera un turno.
function EsperaItem({ e, onAccion }) {
  const [busy, setBusy] = useState(false);
  const [abierto, setAbierto] = useState(false);

  async function accion(a) {
    setBusy(true);
    try {
      await api.adminEsperaAccion(e.id, a);
      onAccion();
    } catch (err) {
      alert('No se pudo: ' + err.message);
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 10, borderRadius: 'var(--pr)', background: 'var(--p-fila)', marginBottom: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 'var(--pt-chico)' }}>{e.client_name}</div>
      <div style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)', marginBottom: 6 }}>{e.client_phone}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {e.linkWhatsapp ? (
          <a
            className={`btn ${abierto ? 'btn-ghost' : 'btn-primary'}`}
            style={{ textDecoration: 'none', textAlign: 'center', padding: '6px 12px', fontSize: 'var(--pt-chico)' }}
            href={e.linkWhatsapp}
            target="_blank"
            rel="noreferrer"
            onClick={() => setAbierto(true)}
          >
            {abierto ? '✓ WhatsApp abierto' : 'Avisar por WhatsApp'}
          </a>
        ) : (
          <span style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-bad)' }}>Sin número válido</span>
        )}
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 'var(--pt-chico)' }} disabled={busy} onClick={() => accion('avisado')}>
          Marcar avisado
        </button>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 'var(--pt-chico)' }} disabled={busy} onClick={() => accion('descartar')}>
          Descartar
        </button>
      </div>
    </div>
  );
}

function FilaFlexible({ r, seleccionado, onClick, detalle }) {
  return (
    <button className={`agenda-slot ${r.status} ${seleccionado ? 'sel' : ''}`} onClick={onClick}>
      <div className="agenda-slot-hora">{detalle}</div>
      <div className="agenda-slot-cliente">{r.client_name}</div>
      <span className={(ESTADO_BADGE[r.status] || ESTADO_BADGE.confirmada).cls}>
        {(ESTADO_BADGE[r.status] || ESTADO_BADGE.confirmada).txt}
      </span>
    </button>
  );
}

function AgendaDia() {
  const [fecha, setFecha] = useState(() => proximoDiaHabilitado(hoyISO()));
  const [agenda, setAgenda] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [sel, setSel] = useState(null);
  const [agendando, setAgendando] = useState(null); // { court, date, turn? } desde una celda libre

  async function cargar() {
    setCargando(true);
    setError(null);
    setSel(null);
    try {
      setAgenda(await api.adminAgenda(fecha));
    } catch (e) {
      setError(e.message);
      setAgenda(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [fecha]);

  const toggle = (code) => setSel((s) => (s === code ? null : code));

  const reservaSel =
    agenda && sel
      ? [
          ...agenda.futbol.C1.map((s) => s.reserva),
          ...agenda.futbol.C2.map((s) => s.reserva),
          ...agenda.padel,
        ].find((r) => r && r.code === sel)
      : null;

  const totalDia = agenda
    ? agenda.futbol.C1.filter((s) => s.reserva).length +
      agenda.futbol.C2.filter((s) => s.reserva).length +
      agenda.padel.length
    : 0;

  return (
    <div className="stat-card">
      <NavegadorFecha fecha={fecha} onCambiar={setFecha} />

      {cargando && <p style={{ color: 'var(--p-mut)' }}>Cargando…</p>}
      {error && <p className="error-msg">{error}</p>}

      {agenda && !cargando && (
        <>
          <p className="agenda-resumen">
            {totalDia === 0
              ? 'Sin reservas este día.'
              : `${totalDia} reserva${totalDia > 1 ? 's' : ''}`}
          </p>

          <div className="agenda-card">
            <div className="agenda-card-titulo">Fútbol</div>
            <GrillaFutbol
              agenda={agenda}
              sel={sel}
              onCelda={toggle}
              onLibre={(court, turn) => setAgendando({ court, date: fecha, turn })}
            />
            <div className="grilla-leyenda">
              <span><i className="pt libre" /> Libre</span>
              <span><i className="pt pendiente" /> A confirmar</span>
              <span><i className="pt confirmada" /> Reservado</span>
            </div>
          </div>

          {reservaSel && reservaSel.court !== 'PAD' && (
            <DetalleReserva
              reserva={reservaSel}
              espera={agenda.espera || []}
              fecha={fecha}
              onCancelado={cargar}
            />
          )}

          <div className="agenda-card">
            <div className="agenda-card-titulo">Pádel</div>
            {agenda.padel.length === 0 ? (
              <p className="agenda-vacio">Libre todo el día (20:00 a 23:30)</p>
            ) : (
              <TimelinePadel reservas={agenda.padel} sel={sel} onTramo={toggle} />
            )}
          </div>

          {reservaSel && reservaSel.court === 'PAD' && (
            <DetalleReserva
              reserva={reservaSel}
              espera={agenda.espera || []}
              fecha={fecha}
              onCancelado={cargar}
            />
          )}

          {agenda.espera && agenda.espera.length > 0 && (
            <div className="agenda-card">
              <div className="agenda-card-titulo">
                Lista de espera <span className="agenda-contador">{agenda.espera.length}</span>
              </div>
              {agenda.espera.map((e) => (
                <EsperaItem key={e.id} e={e} onAccion={cargar} />
              ))}
            </div>
          )}
        </>
      )}

      {agendando && (
        <ManualBookingModal
          contacto={null}
          inicial={agendando}
          onCerrar={() => setAgendando(null)}
          onCreado={() => { setAgendando(null); cargar(); }}
        />
      )}
    </div>
  );
}

// Vista de toda la semana en UNA hoja, como el calendario del celular: un eje de horas
// (20:00 a 23:30) y los días como columnas; dentro de cada día, Cancha 1, Cancha 2 y Pádel.
// Las reservas son bloques de color ubicados en su horario. Es una vista para mirar:
// tocar un bloque abre su detalle y tocar un hueco libre abre "Agendar turno manual".
// Muestra martes a jueves; lunes y viernes solo si Mateo los abrió como día especial.
const SEM_INI = 20 * 60;
const SEM_FIN = 23 * 60 + 30;
const SEM_TOTAL = SEM_FIN - SEM_INI;
const semMin = (hora) => {
  const [h, m] = String(hora).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};
const semHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const semPos = (iniMin, finMin) => ({
  top: `${((iniMin - SEM_INI) / SEM_TOTAL) * 100}%`,
  height: `${((finMin - iniMin) / SEM_TOTAL) * 100}%`,
});

// Primera semana a mostrar: la actual; si ya es viernes o fin de semana, la que viene.
function semanaInicial() {
  const lunes = lunesDeLaSemana(hoyISO());
  const dow = new Date().getDay(); // 0=Dom ... 5=Vie, 6=Sáb
  return dow === 0 || dow >= 5 ? sumarDias(lunes, 7) : lunes;
}

function SemanaPanel() {
  const [lunes, setLunes] = useState(semanaInicial);
  const [dias, setDias] = useState(null); // [{ fecha, agenda }]
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [sel, setSel] = useState(null);
  const [agendando, setAgendando] = useState(null); // { court, date, turn? | padelStart?, padelEnd? }

  async function cargar() {
    setCargando(true);
    setError(null);
    setSel(null);
    try {
      const aperturas = await api.adminAperturas(lunes, sumarDias(lunes, 4)).catch(() => ({ aperturas: [] }));
      const abiertos = new Set((aperturas.aperturas || []).map((a) => a.reservation_date));
      const fechas = [0, 1, 2, 3, 4]
        .map((n) => sumarDias(lunes, n))
        .filter((f) => esDiaHabilitado(f) || abiertos.has(f));
      const agendas = await Promise.all(fechas.map((f) => api.adminAgenda(f)));
      setDias(fechas.map((fecha, i) => ({ fecha, agenda: agendas[i] })));
    } catch (e) {
      setError(e.message);
      setDias(null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [lunes]);

  const toggle = (code) => setSel((s) => (s === code ? null : code));
  const etiqueta = (r) => (r.team_name ? nombreEquipo(r.team_name) : (r.client_name || '').split(' ')[0]);

  // Cifras de toda la semana.
  let reservas = 0;
  let aConfirmar = 0;
  let ocupados = 0;
  let posibles = 0;
  for (const { agenda } of dias || []) {
    for (const court of ['C1', 'C2']) {
      for (const s of agenda.futbol[court]) {
        if (s.status === 'bloqueado') continue;
        posibles += 1;
        if (s.status !== 'libre') {
          ocupados += 1;
          reservas += 1;
          if (s.status === 'pendiente') aConfirmar += 1;
        }
      }
    }
    for (const r of agenda.padel) {
      reservas += 1;
      if (r.status === 'pendiente') aConfirmar += 1;
    }
  }
  const ocupacion = posibles ? Math.round((ocupados / posibles) * 100) : 0;

  const primero = partesFecha(dias && dias.length ? dias[0].fecha : sumarDias(lunes, 1));
  const ultimo = partesFecha(dias && dias.length ? dias[dias.length - 1].fecha : sumarDias(lunes, 3));
  const rango = primero.mes === ultimo.mes
    ? `${primero.diaNum} al ${ultimo.diaNum} de ${ultimo.mes}`
    : `${primero.diaNum} de ${primero.mes} al ${ultimo.diaNum} de ${ultimo.mes}`;

  // Reserva seleccionada (en cualquier día) para mostrar su detalle debajo de la hoja.
  let seleccion = null;
  for (const d of dias || []) {
    const r = [
      ...d.agenda.futbol.C1.map((s) => s.reserva),
      ...d.agenda.futbol.C2.map((s) => s.reserva),
      ...d.agenda.padel,
    ].find((x) => x && x.code === sel);
    if (r) { seleccion = { reserva: r, fecha: d.fecha, espera: d.agenda.espera || [] }; break; }
  }

  // Tocar un hueco del pádel: el horario sale de dónde se tocó (de a 30 min, 1 hora de juego).
  function tocarPadel(e, fecha) {
    if (e.target !== e.currentTarget) return; // un bloque ya existente maneja su propio toque
    const caja = e.currentTarget.getBoundingClientRect();
    const min = SEM_INI + ((e.clientY - caja.top) / caja.height) * SEM_TOTAL;
    const ini = Math.min(Math.max(Math.floor(min / 30) * 30, SEM_INI), SEM_FIN - 60);
    setAgendando({ court: 'PAD', date: fecha, padelStart: semHora(ini), padelEnd: semHora(ini + 60) });
  }

  return (
    <div className="stat-card sem">
      <div className="agenda-nav-row">
        <button className="agenda-flecha" onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior">‹</button>
        <div className="agenda-fecha" style={{ cursor: 'default' }}>
          <span className="agenda-fecha-dia">Semana del {rango}</span>
          <span className="agenda-fecha-mes">{primero.anio}</span>
        </div>
        <button className="agenda-flecha" onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente">›</button>
      </div>

      {error && <p className="error-msg">{error}</p>}
      {cargando && !dias && <p style={{ color: 'var(--p-mut)' }}>Cargando…</p>}

      {dias && (
        <>
          <p className="sem-resumen">
            <b>{reservas}</b> {reservas === 1 ? 'reserva' : 'reservas'} · <b>{aConfirmar}</b> a confirmar · <b>{ocupacion}%</b> ocupación fútbol
          </p>

          {dias.length === 0 ? (
            <p className="agenda-vacio">No hay días abiertos esta semana.</p>
          ) : (
            <div className="sem-cal" style={cargando ? { opacity: 0.55 } : undefined}>
              <div className="sem-eje">
                <div className="sem-cab" />
                <div className="sem-cuerpo">
                  {[0, 1, 2, 3].map((n) => (
                    <span key={n} style={{ top: `${((n * 60) / SEM_TOTAL) * 100}%` }}>{20 + n}</span>
                  ))}
                </div>
              </div>

              {dias.map(({ fecha, agenda }) => {
                const p = partesFecha(fecha);
                const esHoy = fecha === hoyISO();
                return (
                  <div key={fecha} className={`sem-diacol ${esHoy ? 'hoy' : ''}`}>
                    <div className="sem-cab">
                      <div className="sem-cab-dia">
                        <span>{p.diaSemana.slice(0, 3)}</span>
                        <b>{p.diaNum}</b>
                      </div>
                      <div className="sem-cab-sub" aria-hidden="true">
                        <span>C1</span><span>C2</span><span>Pád</span>
                      </div>
                    </div>

                    <div className="sem-cuerpo sem-cuerpo-dia">
                      {['C1', 'C2'].map((court) => (
                        <div key={court} className="sem-col" aria-label={`${NOMBRE_CANCHA[court]} ${fechaLinda(fecha)}`}>
                          {agenda.futbol[court].map((slot) => {
                            const pos = semPos(semMin(slot.start), semMin(slot.end));
                            if (slot.reserva) {
                              const r = slot.reserva;
                              return (
                                <button
                                  key={slot.turn}
                                  type="button"
                                  className={`sem-b ${slot.status} ${r.looking_for_rival ? 'con-rival' : ''} ${sel === r.code ? 'sel' : ''}`}
                                  style={pos}
                                  onClick={() => toggle(r.code)}
                                  title={`${NOMBRE_CANCHA[court]} · ${hhmm(slot.start)}: ${r.team_name ? nombreEquipo(r.team_name) + ' · ' : ''}${r.client_name}`}
                                >
                                  <span className="sem-b-txt">{etiqueta(r)}</span>
                                  {r.looking_for_rival && <span className="sem-pelota" role="img" aria-label="Busca rival" title="Busca rival">⚽</span>}
                                </button>
                              );
                            }
                            if (slot.status === 'bloqueado') {
                              return <div key={slot.turn} className="sem-b bloqueado" style={pos} title="Bloqueado" />;
                            }
                            return (
                              <button
                                key={slot.turn}
                                type="button"
                                className="sem-b libre"
                                style={pos}
                                aria-label={`Agendar ${NOMBRE_CANCHA[court]} ${fechaLinda(fecha)} ${hhmm(slot.start)}`}
                                title="Libre · tocá para agendar"
                                onClick={() => setAgendando({ court, date: fecha, turn: slot.turn })}
                              />
                            );
                          })}
                        </div>
                      ))}

                      <div
                        className="sem-col sem-col-padel"
                        role="button"
                        tabIndex={0}
                        aria-label={`Agendar pádel ${fechaLinda(fecha)}`}
                        title="Pádel · tocá un horario libre para agendar"
                        onClick={(e) => tocarPadel(e, fecha)}
                        onKeyDown={(e) => {
                          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setAgendando({ court: 'PAD', date: fecha });
                          }
                        }}
                      >
                        {agenda.padel.map((r) => (
                          <button
                            key={r.code}
                            type="button"
                            className={`sem-b ${r.status} ${sel === r.code ? 'sel' : ''}`}
                            style={semPos(Math.max(semMin(r.start_time), SEM_INI), Math.min(semMin(r.end_time), SEM_FIN))}
                            onClick={() => toggle(r.code)}
                            title={`Pádel · ${hhmm(r.start_time)} a ${hhmm(r.end_time)}: ${r.client_name}`}
                          >
                            <span className="sem-b-txt">{etiqueta(r)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grilla-leyenda sem-leyenda">
            <span><i className="pt pendiente" /> A confirmar</span>
            <span><i className="pt confirmada" /> Reservado</span>
            <span><i className="pt bloq" /> Bloqueado</span>
            <span><span aria-hidden="true">⚽</span> Busca rival</span>
          </div>

          {seleccion && (
            <DetalleReserva
              reserva={seleccion.reserva}
              espera={seleccion.espera}
              fecha={seleccion.fecha}
              onCancelado={cargar}
            />
          )}
        </>
      )}

      {agendando && (
        <ManualBookingModal
          contacto={null}
          inicial={agendando}
          onCerrar={() => setAgendando(null)}
          onCreado={() => { setAgendando(null); cargar(); }}
        />
      )}
    </div>
  );
}

// La Agenda tiene dos vistas: la semana completa (la de siempre al abrir) y un día en detalle.
function AgendaPanel() {
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem('panel-agenda-vista') === 'dia' ? 'dia' : 'semana'; } catch { return 'semana'; }
  });
  function elegir(v) {
    setVista(v);
    try { localStorage.setItem('panel-agenda-vista', v); } catch { /* sin almacenamiento: no pasa nada */ }
  }
  return (
    <>
      <div className="vista-toggle" role="tablist" aria-label="Vista de la agenda">
        <button type="button" role="tab" aria-selected={vista === 'dia'} className={vista === 'dia' ? 'on' : ''} onClick={() => elegir('dia')}>Día</button>
        <button type="button" role="tab" aria-selected={vista === 'semana'} className={vista === 'semana' ? 'on' : ''} onClick={() => elegir('semana')}>Semana</button>
      </div>
      {vista === 'semana' ? <SemanaPanel /> : <AgendaDia />}
    </>
  );
}

function ContactosPanel() {
  const [contactos, setContactos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [texto, setTexto] = useState('');
  const [agendando, setAgendando] = useState(null); // { nombre, telefono }
  const [aviso, setAviso] = useState(null);
  const [agregar, setAgregar] = useState(false);
  const [editando, setEditando] = useState(null); // clave del contacto en edición
  const [guardando, setGuardando] = useState(false);
  const [libresTxt, setLibresTxt] = useState(null); // turnos libres de los próximos días, para el aviso
  const des = useDeshacer();
  const [eliminados, setEliminados] = useState(() => new Set()); // ocultos mientras corre el Deshacer

  // Turnos de fútbol libres de los próximos días abiertos (hasta 4), con los mismos horarios que ve Mateo.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const hoy = hoyISO();
        const fechas = [];
        for (let n = 0; n <= 10 && fechas.length < 4; n++) {
          const f = sumarDias(hoy, n);
          if (esDiaHabilitado(f)) fechas.push(f);
        }
        const agendas = await Promise.all(fechas.map((f) => api.adminAgenda(f)));
        const ahora = new Date();
        const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
        const partes = [];
        fechas.forEach((f, i) => {
          const { C1, C2 } = agendas[i].futbol;
          const horas = C1.map((s, k) => ({ s, c2: C2[k] }))
            .filter(({ s, c2 }) => s.status === 'libre' || c2.status === 'libre')
            // hoy: solo los que todavía se pueden reservar online (falta más de 1 hora)
            .filter(({ s }) => f !== hoy || (Number(s.start.slice(0, 2)) * 60 + Number(s.start.slice(3, 5))) - minAhora >= 61)
            .map(({ s }) => hhmm(s.start));
          if (horas.length) partes.push(`${fechaCorta(f)} a las ${unir(horas)}`);
        });
        if (vivo) setLibresTxt(partes.join(' · '));
      } catch {
        /* sin datos: el aviso sale con el texto general */
      }
    })();
    return () => { vivo = false; };
  }, []);

  async function guardarContacto({ nombre, telefono, equipo, comentario }, c) {
    setGuardando(true);
    setError(null);
    try {
      if (c && c.manualId) {
        await api.adminEditarContacto(c.manualId, { nombre, telefono, equipo, comentario });
      } else {
        // alta nueva, o primera anotación sobre un contacto que salió de reservas
        await api.adminAgregarContacto({ nombre, telefono, equipo, comentario });
      }
      setAgregar(false);
      setEditando(null);
      setAviso(c ? 'Contacto actualizado.' : 'Contacto agregado.');
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  function eliminarContacto(c) {
    const volver = () => setEliminados((e) => { const n = new Set(e); n.delete(c.telefono); return n; });
    setEditando(null);
    setEliminados((e) => new Set(e).add(c.telefono));
    des.programar({
      mensaje: c.totalReservas > 0
        ? `Contacto eliminado, con sus ${c.totalReservas} reserva${c.totalReservas === 1 ? '' : 's'}`
        : 'Contacto eliminado',
      ms: 8000,
      errorTexto: 'No se pudo eliminar',
      ejecutar: () => api.adminEliminarContacto({ telefono: c.telefono }),
      alConfirmar: () => cargar(),
      alDeshacer: volver,
      alFallar: volver,
    });
  }

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const data = await api.adminContactos();
      setContactos(data.contactos);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const filtro = texto.trim().toLowerCase();
  const todos = (contactos || []).filter((c) => !eliminados.has(c.telefono));
  const lista = todos.filter(
    (c) => !filtro || `${c.equipo || ''} ${c.nombre} ${c.telefono} ${c.email || ''} ${c.comentario || ''}`.toLowerCase().includes(filtro)
  );

  return (
    <div className="stat-card">
      <h3 style={{ marginTop: 0 }}>Base de contactos</h3>

      {agregar ? (
        <ContactoForm
          onGuardar={(datos) => guardarContacto(datos, null)}
          onCancelar={() => setAgregar(false)}
          guardando={guardando}
        />
      ) : (
        <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 10 }} onClick={() => { setError(null); setAgregar(true); setEditando(null); }}>
          + Agregar contacto
        </button>
      )}

      <input
        className="buscador"
        type="search"
        placeholder="Buscar por equipo, nombre o teléfono"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      {cargando && <p style={{ color: 'var(--p-mut)' }}>Cargando...</p>}
      {error && <p className="error-msg">{error}</p>}
      {aviso && <p style={{ color: 'var(--p-ok)', fontWeight: 600 }}>{aviso}</p>}
      {contactos && (
        <p style={{ fontSize: 'var(--pt-chico)', fontWeight: 600 }}>{lista.length === todos.length ? `${todos.length} contactos` : `${lista.length} de ${todos.length} contactos`}</p>
      )}

      {lista.map((c) => {
        const clave = c.manualId || c.telefonoWa || c.telefono || c.nombre;
        if (editando === clave) {
          const p = partirTelefono(c.telefono);
          return (
            <ContactoForm
              key={clave}
              inicial={{ nombre: c.nombre, equipo: c.equipo || '', area: p.area, num: p.num, comentario: c.comentario || '' }}
              onGuardar={(datos) => guardarContacto(datos, c)}
              onCancelar={() => setEditando(null)}
              onEliminar={() => eliminarContacto(c)}
              eliminarLabel="Eliminar contacto"
              eliminarConfirm={
                c.totalReservas > 0
                  ? `Confirmar: borra el contacto y sus ${c.totalReservas} reserva${c.totalReservas === 1 ? '' : 's'}`
                  : 'Confirmar: eliminar contacto'
              }
              guardando={guardando}
            />
          );
        }
        return (
          <div key={clave} style={{ padding: 10, borderRadius: 'var(--pr)', background: 'var(--p-fila)', marginBottom: 8 }}>
            <div className="contacto-cab">
              <span className="contacto-equipo">{c.equipo ? nombreEquipo(c.equipo) : c.nombre}</span>
              {c.manual && <span className="contacto-tag">agregado a mano</span>}
            </div>
            {c.equipo && <div className="contacto-nombre">{c.nombre}</div>}
            <div className="contacto-dato">{c.telefono}{c.email ? ` · ${c.email}` : ''}</div>
            <div className="contacto-hist" style={{ marginBottom: c.comentario ? 2 : 8 }}>
              {c.totalReservas === 0 ? (
                <span>Sin reservas todavía</span>
              ) : (
                <>
                  <span>Fue <b>{c.confirmadas}</b> {c.confirmadas === 1 ? 'vez' : 'veces'}</span>
                  {c.canceladas > 0 && <span className="contacto-cancel">{c.canceladas} cancelada{c.canceladas === 1 ? '' : 's'}</span>}
                  <span>última: {String(c.ultimaReserva).split('-').reverse().join('/')}</span>
                </>
              )}
            </div>
            {c.comentario && (
              <div style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-txt)', fontStyle: 'italic', marginBottom: 6 }}>💬 {c.comentario}</div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {c.telefonoWa && (
                <a
                  className="btn btn-ghost"
                  style={{ textDecoration: 'none', textAlign: 'center', display: 'inline-block', padding: '6px 14px' }}
                  href={`https://wa.me/${c.telefonoWa}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              )}
              {c.telefonoWa && (
                <a
                  className="btn btn-ghost"
                  style={{ textDecoration: 'none', textAlign: 'center', display: 'inline-block', padding: '6px 14px' }}
                  href={`https://wa.me/${c.telefonoWa}?text=${encodeURIComponent(mensajeAvisoTurnos(c.nombre, libresTxt))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Avisar turnos libres
                </a>
              )}
              <button
                className="btn btn-primary"
                style={{ padding: '6px 14px' }}
                onClick={() => { setAviso(null); setAgendando({ nombre: c.nombre, telefono: c.telefono, equipo: c.equipo || '' }); }}
              >
                Agendar turno manual
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 14px' }}
                onClick={() => { setError(null); setAgregar(false); setEditando(clave); }}
              >
                Editar
              </button>
            </div>
          </div>
        );
      })}

      {agendando && (
        <ManualBookingModal
          contacto={agendando}
          onCerrar={() => setAgendando(null)}
          onCreado={(r) => {
            setAgendando(null);
            setAviso(`Turno agendado para ${r.client_name}.`);
            cargar();
          }}
        />
      )}
    </div>
  );
}

// Separa un teléfono guardado ("54 9 343 5134744") en característica + número.
function partirTelefono(tel) {
  const partes = String(tel || '').trim().split(/\s+/);
  if (partes.length >= 4 && partes[0].replace(/\D/g, '') === '54') {
    return { area: partes[2].replace(/\D/g, ''), num: partes.slice(3).join('').replace(/\D/g, '') };
  }
  const d = String(tel || '').replace(/\D/g, '').replace(/^54/, '').replace(/^9/, '');
  if (d.length > 7) return { area: d.slice(0, d.length - 7), num: d.slice(-7) };
  return { area: '', num: d };
}

// Formulario de contacto (alta o edición): nombre + WhatsApp + comentario.
function ContactoForm({ inicial, onGuardar, onCancelar, onEliminar, eliminarLabel, eliminarConfirm, guardando }) {
  const [nombre, setNombre] = useState(inicial?.nombre || '');
  const [equipo, setEquipo] = useState(inicial?.equipo || '');
  const [area, setArea] = useState(inicial?.area || '');
  const [num, setNum] = useState(inicial?.num || '');
  const [comentario, setComentario] = useState(inicial?.comentario || '');
  const [error, setError] = useState(null);

  const areaLimpia = area.replace(/\D/g, '');
  const numLimpio = num.replace(/\D/g, '');

  function guardar() {
    setError(null);
    if (!nombre.trim()) { setError('Completá el nombre.'); return; }
    if (areaLimpia.length < 2 || numLimpio.length < 6) { setError('Completá característica y número.'); return; }
    onGuardar({
      nombre: nombre.trim(),
      equipo: equipo.trim() || null,
      telefono: `54 9 ${areaLimpia} ${numLimpio}`,
      comentario: comentario.trim() || null,
    });
  }

  return (
    <div style={{ padding: 10, borderRadius: 'var(--pr)', background: 'var(--p-fila)', marginBottom: 10 }}>
      <div className="field">
        <label>Equipo (opcional)</label>
        <input value={equipo} onChange={(e) => setEquipo(e.target.value)} placeholder="Ej: Los Pibes FC" />
      </div>
      <div className="field">
        <label>Nombre de la persona</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Quién escribe o paga" />
      </div>
      <div className="field">
        <label>WhatsApp</label>
        <div className="tel-split">
          <span className="tel-fijo">+54&nbsp;9</span>
          <input className="tel-area" value={area} onChange={(e) => setArea(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="343" inputMode="numeric" aria-label="Característica" />
          <span className="tel-fijo">15</span>
          <input className="tel-num" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="5134747" inputMode="numeric" aria-label="Número" />
        </div>
      </div>
      <div className="field">
        <label>Comentario (opcional)</label>
        <input value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej: amigo de Mateo, siempre juega los martes" />
      </div>
      {error && <p className="error-msg">{error}</p>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {onEliminar && (
        <button
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: 8, color: 'var(--p-bad)', borderColor: 'var(--p-bad)' }}
          onClick={onEliminar}
        >
          {eliminarLabel || 'Eliminar contacto'}
        </button>
      )}
    </div>
  );
}

const TURNO_LABEL = { T1: '20:30 a 21:30', T2: '21:30 a 22:30', T3: '22:30 a 23:30' };
const CANCHA_LABEL_BLOQUEO = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel', FUT: 'Las 2 canchas de fútbol' };

function descripcionBloqueo(b) {
  if (!b.court) return 'Todo el día (fútbol y pádel)';
  if (!b.turn) return `${CANCHA_LABEL_BLOQUEO[b.court] || b.court} — todo el día`;
  return `${CANCHA_LABEL_BLOQUEO[b.court] || b.court} — ${TURNO_LABEL[b.turn] || b.turn}`;
}

// Bloqueos preventivos (mantenimiento, evento privado, etc.), sin que haya
// una reserva de por medio. Distinto de "suspender por lluvia", que cancela
// reservas ya existentes.
function BloqueosPanel() {
  const [fecha, setFecha] = useState(() => proximoDiaHabilitado(hoyISO()));
  const [bloqueos, setBloqueos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const [alcance, setAlcance] = useState('dia'); // 'dia' | 'cancha' | 'turno' | 'futbol'
  const [cancha, setCancha] = useState('C1');
  const [turn, setTurn] = useState('T1');
  const [motivo, setMotivo] = useState('');
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const data = await api.adminBloqueos(fecha);
      setBloqueos(data.bloqueos);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [fecha]);

  async function crear() {
    setCreando(true);
    setError(null);
    try {
      const payload = { date: fecha, motivo: motivo.trim() || null };
      if (alcance === 'cancha') payload.court = cancha;
      if (alcance === 'turno') { payload.court = cancha; payload.turn = turn; }
      if (alcance === 'futbol') payload.court = 'FUT';
      await api.adminCrearBloqueo(payload);
      setMotivo('');
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreando(false);
    }
  }

  const des = useDeshacer();
  const [ocultos, setOcultos] = useState(() => new Set());
  function quitar(b) {
    const volver = () => setOcultos((o) => { const n = new Set(o); n.delete(b.id); return n; });
    setOcultos((o) => new Set(o).add(b.id));
    des.programar({
      mensaje: 'Bloqueo quitado',
      errorTexto: 'No se pudo quitar',
      ejecutar: () => api.adminQuitarBloqueo(b.id),
      alConfirmar: () => cargar(),
      alDeshacer: volver,
      alFallar: volver,
    });
  }
  const visibles = bloqueos.filter((b) => !ocultos.has(b.id));

  return (
    <div className="stat-card">
      <h3 style={{ marginTop: 0 }}>Bloquear turnos o días</h3>

      <NavegadorFecha fecha={fecha} onCambiar={setFecha} />

      <div className="field">
        <label>Qué bloquear</label>
        <select value={alcance} onChange={(e) => setAlcance(e.target.value)}>
          <option value="dia">Todo el día (fútbol y pádel)</option>
          <option value="cancha">Una cancha entera ese día</option>
          <option value="turno">Un turno puntual de fútbol</option>
          <option value="futbol">Las 2 canchas de fútbol (el pádel sigue disponible)</option>
        </select>
      </div>

      {(alcance === 'cancha' || alcance === 'turno') && (
        <div className="field">
          <label>Cancha</label>
          <select value={cancha} onChange={(e) => setCancha(e.target.value)}>
            <option value="C1">Cancha 1</option>
            <option value="C2">Cancha 2</option>
            {alcance === 'cancha' && <option value="PAD">Pádel</option>}
          </select>
        </div>
      )}

      {alcance === 'turno' && (
        <div className="field">
          <label>Turno</label>
          <select value={turn} onChange={(e) => setTurn(e.target.value)}>
            {Object.entries(TURNO_LABEL).map(([t, label]) => <option key={t} value={t}>{label}</option>)}
          </select>
        </div>
      )}

      <div className="field">
        <label>Motivo (opcional)</label>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: mantenimiento de la cancha" />
      </div>

      {error && <p className="error-msg">{error}</p>}

      <button className="btn btn-primary" style={{ width: '100%' }} onClick={crear} disabled={creando}>
        {creando ? 'Bloqueando…' : 'Bloquear'}
      </button>

      <div style={{ marginTop: 14 }}>
        <p style={{ fontSize: 'var(--pt-chico)', fontWeight: 600, margin: '0 0 6px' }}>
          Bloqueos de este día {cargando ? '' : `(${bloqueos.length})`}
        </p>
        {cargando && <p style={{ color: 'var(--p-mut)' }}>Cargando…</p>}
        {!cargando && visibles.length === 0 && <p className="agenda-vacio">No hay bloqueos este día.</p>}
        {visibles.map((b) => (
          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 'var(--pr)', background: 'var(--p-fila)', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 'var(--pt-chico)', fontWeight: 600 }}>{descripcionBloqueo(b)}</div>
              {b.motivo && <div style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)' }}>{b.motivo}</div>}
            </div>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 'var(--pt-micro)' }} onClick={() => quitar(b)}>
              Quitar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Apertura especial: lo inverso de un bloqueo. Abre puntualmente un lunes o
// viernes (fuera de mar/mié/jue) para que el público lo vea y pueda reservar
// online como un día más.
function AperturasEspecialesPanel() {
  const [fecha, setFecha] = useState(() => hoyISO());
  const [aperturas, setAperturas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [nota, setNota] = useState('');
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const desde = hoyISO();
      const hasta = sumarDias(desde, 90);
      const data = await api.adminAperturas(desde, hasta);
      setAperturas(data.aperturas);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  const diaSemana = new Date(fecha + 'T00:00:00').getDay();
  const diaValido = diaSemana === 1 || diaSemana === 5;

  async function crear() {
    setCreando(true);
    setError(null);
    try {
      await api.adminCrearApertura({ date: fecha, nota: nota.trim() || null });
      setNota('');
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreando(false);
    }
  }

  const des = useDeshacer();
  const [ocultos, setOcultos] = useState(() => new Set());
  function quitar(a) {
    const volver = () => setOcultos((o) => { const n = new Set(o); n.delete(a.id); return n; });
    setOcultos((o) => new Set(o).add(a.id));
    des.programar({
      mensaje: 'Día especial quitado',
      errorTexto: 'No se pudo quitar',
      ejecutar: () => api.adminQuitarApertura(a.id),
      alConfirmar: () => cargar(),
      alDeshacer: volver,
      alFallar: volver,
    });
  }
  const visibles = aperturas.filter((a) => !ocultos.has(a.id));

  return (
    <div className="stat-card">
      <h3 style={{ marginTop: 0 }}>Abrir un día especial</h3>

      <div className="field">
        <label>Qué día abrir</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        {!diaValido && (
          <p style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)', margin: '4px 0 0' }}>
            Por ahora solo se puede abrir un lunes o un viernes.
          </p>
        )}
      </div>

      <div className="field">
        <label>Nota (opcional)</label>
        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: torneo, feriado largo" />
      </div>

      {error && <p className="error-msg">{error}</p>}

      <button className="btn btn-primary" style={{ width: '100%' }} onClick={crear} disabled={creando || !diaValido}>
        {creando ? 'Abriendo…' : 'Abrir este día'}
      </button>

      <div style={{ marginTop: 14 }}>
        <p style={{ fontSize: 'var(--pt-chico)', fontWeight: 600, margin: '0 0 6px' }}>
          Próximas aperturas {cargando ? '' : `(${visibles.length})`}
        </p>
        {cargando && <p style={{ color: 'var(--p-mut)' }}>Cargando…</p>}
        {!cargando && visibles.length === 0 && <p className="agenda-vacio">No hay días especiales abiertos.</p>}
        {visibles.map((a) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 'var(--pr)', background: 'var(--p-fila)', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 'var(--pt-chico)', fontWeight: 600, textTransform: 'capitalize' }}>{fechaLargaCompleta(a.reservation_date)}</div>
              {a.nota && <div style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)' }}>{a.nota}</div>}
            </div>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 'var(--pt-micro)' }} onClick={() => quitar(a)}>
              Quitar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const DIA_SEMANA_LABEL = { 2: 'Martes', 3: 'Miércoles', 4: 'Jueves' };

function descripcionTurnoFijo(f) {
  const cancha = CANCHA_LABEL_BLOQUEO[f.court] || f.court;
  const horario = f.court === 'PAD' ? `${hhmm(f.start_time)} a ${hhmm(f.end_time)}` : (TURNO_LABEL[f.turn] || f.turn);
  return `${DIA_SEMANA_LABEL[f.dia_semana]} · ${cancha} · ${horario}`;
}

// Turnos fijos: un cliente que juega siempre el mismo día/horario. El
// backend genera solo las reservas confirmadas de las próximas semanas.
// Recordatorios de turnos fijos: lista de los próximos turnos fijos con un botón que abre
// WhatsApp con el mensaje armado. Se manda a mano (no hay envío automático): al tocar el
// botón queda marcado como enviado para no repetirlo.
function mensajeRecordatorioFijo(r, hoy) {
  const cuando = r.reservation_date === hoy
    ? 'de hoy'
    : hoy && r.reservation_date === sumarDias(hoy, 1)
    ? 'de mañana'
    : `del ${fechaCorta(r.reservation_date)}`;
  return (
    `¡Hola ${primerNombre(r.client_name)}! Te recordamos tu turno ${cuando}: ` +
    `${NOMBRE_CANCHA[r.court] || r.court}, ${hhmm(r.start_time)} a ${hhmm(r.end_time)}. ¡Los esperamos!`
  );
}

function RecordatoriosFijos() {
  const [lista, setLista] = useState(null);
  const [hoy, setHoy] = useState(null);
  const [error, setError] = useState(null);

  async function cargar() {
    try {
      const data = await api.adminRecordatoriosFijos(7);
      setLista(data.recordatorios);
      setHoy(data.hoy);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => { cargar(); }, []);

  async function marcar(id, enviado) {
    // Se marca al instante en pantalla; si el servidor falla, se vuelve a cargar la lista real.
    setLista((l) => l.map((r) => (r.id === id ? { ...r, recordatorio_enviado_at: enviado ? new Date().toISOString() : null } : r)));
    try {
      await api.adminMarcarRecordatorio(id, enviado);
    } catch {
      cargar();
    }
  }

  const porDia = {};
  for (const r of lista || []) (porDia[r.reservation_date] ||= []).push(r);
  const etiquetaDia = (iso) => {
    const f = fechaLargaCompleta(iso);
    const txt = f.charAt(0).toUpperCase() + f.slice(1);
    if (iso === hoy) return `Hoy · ${txt}`;
    if (hoy && iso === sumarDias(hoy, 1)) return `Mañana · ${txt}`;
    return txt;
  };
  const pendientes = (lista || []).filter((r) => !r.recordatorio_enviado_at).length;

  return (
    <div className="stat-card" style={{ marginBottom: 14 }}>
      <h3 style={{ marginTop: 0 }}>
        Recordatorios · próximos 7 días
        {lista && pendientes > 0 && <span className="agenda-contador" style={{ marginLeft: 8 }}>{pendientes}</span>}
      </h3>
      {error && <p className="error-msg">{error}</p>}
      {!lista && !error && <p style={{ color: 'var(--p-mut)' }}>Cargando…</p>}
      {lista && lista.length === 0 && <p className="agenda-vacio">No hay turnos fijos en los próximos 7 días.</p>}
      {Object.entries(porDia).map(([dia, filas]) => (
        <div key={dia} style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 'var(--pt-chico)', fontWeight: 700, margin: '6px 0' }}>{etiquetaDia(dia)}</p>
          {filas.map((r) => {
            const enviado = !!r.recordatorio_enviado_at;
            const link = r.telefonoWa
              ? `https://wa.me/${r.telefonoWa}?text=${encodeURIComponent(mensajeRecordatorioFijo(r, hoy))}`
              : null;
            return (
              <div key={r.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--pr)', background: 'var(--p-fila)', marginBottom: 6 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--pt-chico)', fontWeight: 600 }}>
                    {r.client_name}{r.team_name ? ` · ${nombreEquipo(r.team_name)}` : ''}
                  </div>
                  <div style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)' }}>
                    {NOMBRE_CANCHA[r.court] || r.court} · {hhmm(r.start_time)} a {hhmm(r.end_time)} hs
                  </div>
                </div>
                {link ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
                    {enviado && (
                      <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 'var(--pt-micro)' }} onClick={() => marcar(r.id, false)} title="Marcar como no enviado">
                        Deshacer
                      </button>
                    )}
                    <a
                      className={enviado ? 'btn btn-ghost' : 'btn btn-primary'}
                      style={{ padding: '6px 12px', fontSize: 'var(--pt-chico)', textDecoration: 'none' }}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => { if (!enviado) marcar(r.id, true); }}
                    >
                      {enviado ? '✓ Enviado · reenviar' : 'Recordar'}
                    </a>
                  </div>
                ) : (
                  <span style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)' }}>Sin teléfono</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function TurnosFijosPanel() {
  const [fijos, setFijos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [cancha, setCancha] = useState('C1');
  const [diaSemana, setDiaSemana] = useState(2);
  const [turn, setTurn] = useState('T1');
  const [padelStart, setPadelStart] = useState('20:00');
  const [padelEnd, setPadelEnd] = useState('21:00');
  const [nombre, setNombre] = useState('');
  const [equipo, setEquipo] = useState('');
  const [area, setArea] = useState('');
  const [num, setNum] = useState('');
  const [desde, setDesde] = useState(() => hoyISO());
  const [hasta, setHasta] = useState('');
  const [creando, setCreando] = useState(false);

  const [contactos, setContactos] = useState([]);
  const [foco, setFoco] = useState(false);

  const esFutbol = cancha !== 'PAD';

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const data = await api.adminTurnosFijos();
      setFijos(data.turnosFijos);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    api.adminContactos().then((d) => setContactos(d.contactos || [])).catch(() => {});
  }, []);

  const sugerencias = nombre.trim().length >= 1
    ? contactos
        .filter((c) => `${c.nombre} ${c.telefono}`.toLowerCase().includes(nombre.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  function elegirContacto(c) {
    setNombre(c.nombre);
    const p = partirTelefono(c.telefono);
    setArea(p.area);
    setNum(p.num);
    setFoco(false);
  }

  const areaLimpia = area.replace(/\D/g, '');
  const numLimpio = num.replace(/\D/g, '');

  async function crear() {
    setError(null);
    if (!nombre.trim()) { setError('Completá el nombre del cliente.'); return; }
    if (areaLimpia.length < 2 || numLimpio.length < 6) { setError('Completá característica y número.'); return; }
    setCreando(true);
    try {
      const payload = {
        court: cancha,
        diaSemana,
        clientName: nombre.trim(),
        clientPhone: `54 9 ${areaLimpia} ${numLimpio}`,
        teamName: equipo.trim() || null,
        desde,
        hasta: hasta || null,
        ...(esFutbol ? { turn } : { startTime: `${padelStart}:00`, endTime: `${padelEnd}:00` }),
      };
      await api.adminCrearTurnoFijo(payload);
      setNombre(''); setEquipo(''); setArea(''); setNum(''); setHasta('');
      setAviso('Turno fijo creado. Las próximas reservas se están generando.');
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreando(false);
    }
  }

  const des = useDeshacer();
  const [ocultos, setOcultos] = useState(() => new Set());
  function baja(f) {
    const volver = () => setOcultos((o) => { const n = new Set(o); n.delete(f.id); return n; });
    setOcultos((o) => new Set(o).add(f.id));
    des.programar({
      mensaje: `Turno fijo de ${f.team_name ? nombreEquipo(f.team_name) : f.client_name} dado de baja`,
      errorTexto: 'No se pudo dar de baja',
      ejecutar: () => api.adminBajaTurnoFijo(f.id),
      alConfirmar: () => cargar(),
      alDeshacer: volver,
      alFallar: volver,
    });
  }
  const visibles = (fijos || []).filter((f) => !ocultos.has(f.id));

  return (
    <>
    <RecordatoriosFijos />
    <div className="stat-card">
      <h3 style={{ marginTop: 0 }}>Turnos fijos</h3>

      <div className="field">
        <label>Cancha</label>
        <select value={cancha} onChange={(e) => setCancha(e.target.value)}>
          <option value="C1">Cancha 1</option>
          <option value="C2">Cancha 2</option>
          <option value="PAD">Pádel</option>
        </select>
      </div>

      <div className="field">
        <label>Día de la semana</label>
        <select value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))}>
          {Object.entries(DIA_SEMANA_LABEL).map(([d, label]) => <option key={d} value={d}>{label}</option>)}
        </select>
      </div>

      {esFutbol ? (
        <div className="field">
          <label>Turno</label>
          <select value={turn} onChange={(e) => setTurn(e.target.value)}>
            {Object.entries(TURNO_LABEL).map(([t, label]) => <option key={t} value={t}>{label}</option>)}
          </select>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Desde</label>
            <input type="time" value={padelStart} onChange={(e) => setPadelStart(e.target.value)} min="20:00" max="23:00" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Hasta</label>
            <input type="time" value={padelEnd} onChange={(e) => setPadelEnd(e.target.value)} min="20:30" max="23:30" />
          </div>
        </div>
      )}

      <div className="field" style={{ position: 'relative' }}>
        <label>Nombre del cliente</label>
        <input
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setFoco(true); }}
          onFocus={() => setFoco(true)}
          onBlur={() => setTimeout(() => setFoco(false), 150)}
          placeholder="Nombre y apellido — o buscá un contacto"
        />
        {foco && sugerencias.length > 0 && (
          <div className="ac-lista">
            {sugerencias.map((c) => (
              <button
                key={c.manualId || c.telefonoWa || c.telefono}
                type="button"
                className="ac-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegirContacto(c)}
              >
                <strong>{c.nombre}</strong>
                <span>{c.telefono}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label>Equipo (opcional)</label>
        <input value={equipo} onChange={(e) => setEquipo(e.target.value)} placeholder="Ej: Los Pibes FC" />
      </div>

      <div className="field">
        <label>WhatsApp</label>
        <div className="tel-split">
          <span className="tel-fijo">+54&nbsp;9</span>
          <input className="tel-area" value={area} onChange={(e) => setArea(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="343" inputMode="numeric" aria-label="Característica" />
          <span className="tel-fijo">15</span>
          <input className="tel-num" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="5134747" inputMode="numeric" aria-label="Número" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Hasta (opcional)</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}
      {aviso && <p style={{ color: 'var(--p-ok)', fontWeight: 600 }}>{aviso}</p>}

      <button className="btn btn-primary" style={{ width: '100%' }} onClick={crear} disabled={creando}>
        {creando ? 'Creando…' : 'Crear turno fijo'}
      </button>

      <div style={{ marginTop: 14 }}>
        <p style={{ fontSize: 'var(--pt-chico)', fontWeight: 600, margin: '0 0 6px' }}>
          Fijos activos {cargando ? '' : `(${visibles.length})`}
        </p>
        {cargando && <p style={{ color: 'var(--p-mut)' }}>Cargando…</p>}
        {!cargando && fijos && visibles.length === 0 && <p className="agenda-vacio">No hay turnos fijos cargados.</p>}
        {visibles.map((f) => (
          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 'var(--pr)', background: 'var(--p-fila)', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 'var(--pt-chico)', fontWeight: 600 }}>
                {f.client_name}{f.team_name ? ` · ${nombreEquipo(f.team_name)}` : ''}
              </div>
              <div style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)' }}>{descripcionTurnoFijo(f)}</div>
              <div style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)' }}>{f.client_phone}{f.hasta ? ` · hasta el ${f.hasta.split('-').reverse().join('/')}` : ''}</div>
            </div>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 'var(--pt-micro)' }} onClick={() => baja(f)}>
              Dar de baja
            </button>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

function SuspensionPanel() {
  const [fecha, setFecha] = useState(() => proximoDiaHabilitado(hoyISO()));
  const [reservas, setReservas] = useState(null);
  const [clientes, setClientes] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [suspendiendo, setSuspendiendo] = useState(false);
  const [enviados, setEnviados] = useState({});

  async function verReservas() {
    setError(null);
    setClientes(null);
    setEnviados({});
    setCargando(true);
    try {
      const data = await api.adminReservasDelDia(fecha);
      setReservas(data.reservas);
    } catch (e) {
      setError(e.message);
      setReservas(null);
    } finally {
      setCargando(false);
    }
  }

  async function suspender() {
    setError(null);
    setSuspendiendo(true);
    try {
      const data = await api.adminSuspenderPorLluvia(fecha);
      setClientes(data.clientes);
      setReservas(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSuspendiendo(false);
    }
  }

  return (
    <div className="stat-card">
      <h3 style={{ marginTop: 0 }}>Suspender fecha por lluvia</h3>
      <p style={{ fontSize: 'var(--pt-chico)', color: 'var(--p-mut)', marginTop: 0 }}>
        Cancela las reservas del día y arma el aviso por WhatsApp para cada cliente.
      </p>

      <NavegadorFecha fecha={fecha} onCambiar={(f) => { setFecha(f); setReservas(null); setClientes(null); }} />
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={verReservas} disabled={cargando}>
        {cargando ? 'Buscando…' : 'Ver reservas de este día'}
      </button>

      {error && <p className="error-msg">{error}</p>}

      {reservas && (
        <div style={{ marginTop: 12 }}>
          {reservas.length === 0 ? (
            <p style={{ color: 'var(--p-mut)' }}>No hay reservas activas ese día.</p>
          ) : (
            <>
              <p style={{ fontWeight: 600, margin: '4px 0', textTransform: 'capitalize' }}>
                {reservas.length} reserva{reservas.length > 1 ? 's' : ''} — {fechaLargaCompleta(fecha)}
              </p>
              {reservas.map((r) => (
                <div key={r.id} className="agenda-slot" style={{ cursor: 'default' }}>
                  <div className="agenda-slot-hora">{r.turn || hhmm(r.start_time)}</div>
                  <div className="agenda-slot-cliente">{NOMBRE_CANCHA[r.court]} · {r.client_name}</div>
                  <span style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)' }}>{r.client_phone}</span>
                </div>
              ))}
              <BotonConfirmar
                label={suspendiendo ? 'Suspendiendo…' : `Suspender y avisar a ${reservas.length} cliente${reservas.length > 1 ? 's' : ''}`}
                confirmLabel="Confirmar: cancelar todo el día"
                onConfirm={suspender}
                disabled={suspendiendo}
                style={{ width: '100%', marginTop: 8 }}
              />
            </>
          )}
        </div>
      )}

      {clientes && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: 'var(--p-ok)', fontWeight: 600 }}>
            Fecha suspendida. {clientes.length} reserva{clientes.length > 1 ? 's' : ''} cancelada{clientes.length > 1 ? 's' : ''}.
            Enviá el aviso a cada uno:
          </p>
          {clientes.map((c) => (
            <div key={c.code} style={{ padding: 10, borderRadius: 'var(--pr)', background: 'var(--p-fila)', marginBottom: 8 }}>
              <div style={{ fontSize: 'var(--pt-chico)', fontWeight: 600 }}>
                {c.nombre} — {NOMBRE_CANCHA[c.court]} {hhmm(c.start_time)}
              </div>
              <div style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-mut)', marginBottom: 6 }}>
                {c.telefono ? `+${c.telefono}` : `${c.telefonoOriginal} (no se pudo armar el número, revisalo)`}
              </div>
              {c.linkWhatsapp ? (
                <a
                  className={`btn ${enviados[c.code] ? 'btn-ghost' : 'btn-primary'}`}
                  style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }}
                  href={c.linkWhatsapp}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setEnviados((e) => ({ ...e, [c.code]: true }))}
                >
                  {enviados[c.code] ? '✓ Enviado (abrir de nuevo)' : 'Enviar WhatsApp'}
                </a>
              ) : (
                <p style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-bad)' }}>Número inválido — contactá al cliente a mano.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Lee ?tab= y ?code= de la URL (para los links de los emails).
// ---------- Pendientes: confirmar o cancelar desde la misma tarjeta ----------
// Después de confirmar, la tarjeta queda a la vista con el botón para avisarle por
// WhatsApp (aunque la reserva ya no esté en la lista de pendientes del servidor).
function PendienteCard({ p, hecha, onConfirmar, onCancelar }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  async function confirmar() {
    setOcupado(true);
    setError(null);
    try {
      await onConfirmar(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }

  const titulo = p.team_name ? `${nombreEquipo(p.team_name)} · ${p.client_name}` : p.client_name;
  return (
    <div className={`pend-card${hecha ? ` pend-card--${hecha.estado}` : ''}`}>
      <div className="pend-info">
        <b>{titulo}</b>
        <span>{NOMBRE_CANCHA[p.court] || p.court} · {fechaLinda(p.reservation_date)} · {hhmm(p.start_time)} a {hhmm(p.end_time)}</span>
      </div>
      {error && <p className="error-msg">{error}</p>}
      {hecha?.estado === 'confirmada' && (
        <div className="pend-hecho">
          <span className="pend-ok">✓ Confirmado</span>
          {hecha.link && (
            <a className="btn btn-primary btn-sm" href={hecha.link} target="_blank" rel="noreferrer">Avisarle por WhatsApp</a>
          )}
        </div>
      )}
      {hecha?.estado === 'cancelando' && <div className="pend-hecho"><span className="pend-baja">Se cancela en unos segundos…</span></div>}
      {hecha?.estado === 'cancelada' && <div className="pend-hecho"><span className="pend-baja">Turno cancelado</span></div>}
      {!hecha && (
        <div className="pend-acciones">
          <button className="btn btn-primary" disabled={ocupado} onClick={confirmar}>
            {ocupado ? 'Confirmando…' : 'Confirmar'}
          </button>
          <button className="btn btn-ghost" disabled={ocupado} onClick={() => onCancelar(p)}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

function PendientesLista({ pendientes, onCambio }) {
  const des = useDeshacer();
  const [hechas, setHechas] = useState({}); // code -> { p, estado: 'confirmada' | 'cancelando' | 'cancelada', link }

  const sacar = (code) => setHechas((h) => { const n = { ...h }; delete n[code]; return n; });

  async function confirmar(p) {
    const r = await api.adminConfirmar(p.code);
    setHechas((h) => ({ ...h, [p.code]: { p, estado: 'confirmada', link: r.linkWhatsappConfirmacion } }));
    onCambio?.();
  }

  // Cancelar: se ve hecho al instante, pero recién se manda al servidor si no se toca "Deshacer".
  function cancelar(p) {
    setHechas((h) => ({ ...h, [p.code]: { p, estado: 'cancelando' } }));
    des.programar({
      mensaje: `Turno de ${p.team_name ? nombreEquipo(p.team_name) : p.client_name} cancelado`,
      errorTexto: 'No se pudo cancelar',
      ejecutar: () => api.adminCancelar(p.code),
      alConfirmar: () => {
        setHechas((h) => ({ ...h, [p.code]: { p, estado: 'cancelada' } }));
        onCambio?.();
      },
      alDeshacer: () => sacar(p.code),
      alFallar: () => sacar(p.code),
    });
  }

  // las ya resueltas siguen a la vista (con su resultado) hasta salir de la pantalla
  const lista = [
    ...pendientes,
    ...Object.values(hechas).map((h) => h.p).filter((p) => !pendientes.some((x) => x.code === p.code)),
  ].sort((a, b) => `${a.reservation_date}${a.start_time}`.localeCompare(`${b.reservation_date}${b.start_time}`));

  if (lista.length === 0) return <p className="agenda-vacio">No hay reservas para confirmar.</p>;
  return (
    <div className="pend-lista">
      {lista.map((p) => (
        <PendienteCard key={p.code} p={p} hecha={hechas[p.code]} onConfirmar={confirmar} onCancelar={cancelar} />
      ))}
    </div>
  );
}

// ---------- Hoy: lo del día en una sola pantalla ----------
function HoyPanel({ pendientes, onCambio, irA }) {
  const hoy = hoyISO();
  const fecha = esDiaHabilitado(hoy) ? hoy : proximoDiaHabilitado(hoy);
  const esHoy = fecha === hoy;
  const [agenda, setAgenda] = useState(null);
  const [recordatorios, setRecordatorios] = useState(null);
  const [esperaDias, setEsperaDias] = useState([]); // [{ fecha, libres, espera }] de los próximos días de juego
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    // el día que se muestra + los próximos días de juego (hasta 4): ahí es donde la gente espera un turno
    const dias = [fecha];
    for (let n = 1; n <= 14 && dias.length < 4; n++) {
      const f = sumarDias(fecha, n);
      if (esDiaHabilitado(f)) dias.push(f);
    }
    Promise.all([api.adminAgenda(fecha), api.adminRecordatoriosFijos(2), ...dias.slice(1).map((d) => api.adminAgenda(d).catch(() => null))])
      .then(([a, r, ...otras]) => {
        if (!vivo) return;
        setAgenda(a);
        const libresDe = (ag) => ag.futbol.C1.filter((x, i) => x.status === 'libre' || ag.futbol.C2[i].status === 'libre').length;
        setEsperaDias(
          [a, ...otras]
            .map((ag, i) => ag && { fecha: dias[i], libres: libresDe(ag), espera: ag.espera || [] })
            .filter((d) => d && d.espera.length > 0)
        );
        // solo los de hoy y mañana que todavía no se mandaron
        const manana = sumarDias(r.hoy || hoy, 1);
        setRecordatorios(r.recordatorios.filter((x) => !x.recordatorio_enviado_at && [r.hoy || hoy, manana].includes(x.reservation_date)));
      })
      .catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
  }, [fecha, hoy]);

  const turnos = agenda ? agenda.futbol.C1.map((s, i) => ({ s1: s, s2: agenda.futbol.C2[i] })) : [];
  const ocupados = agenda ? [...agenda.futbol.C1, ...agenda.futbol.C2].filter((s) => s.reserva).length : 0;
  const quien = (r) => (r.team_name ? nombreEquipo(r.team_name) : r.client_name);
  const Celda = ({ s }) => (
    <span className={`hoy-celda ${s.reserva ? (s.reserva.status === 'pendiente' ? 'pend' : 'ocupada') : s.status}`}>
      {s.reserva ? quien(s.reserva) : s.status === 'bloqueado' ? 'Bloqueado' : 'Libre'}
    </span>
  );

  return (
    <div className="hoy">
      <div className="hoy-cab">
        <h2>{esHoy ? 'Hoy' : 'Próximo día de juego'}</h2>
        <p>{(() => { const f = fechaLargaCompleta(fecha); return f.charAt(0).toUpperCase() + f.slice(1); })()}{!esHoy && ' · hoy no se juega'}</p>
      </div>

      <section className="stat-card">
        <h3 className="hoy-titulo">
          Para confirmar
          {pendientes.length > 0 && <span className="agenda-contador">{pendientes.length}</span>}
        </h3>
        <PendientesLista pendientes={pendientes} onCambio={onCambio} />
      </section>

      {error && <p className="error-msg">{error}</p>}
      {!agenda && !error && <p className="hoy-cargando">Cargando el día…</p>}

      {agenda && (
        <section className="stat-card">
          <h3 className="hoy-titulo">
            {esHoy ? 'Turnos de hoy' : 'Turnos de ese día'}
            <span className="hoy-resumen">{ocupados} de 6 de fútbol{agenda.padel.length ? ` · ${agenda.padel.length} de pádel` : ''}</span>
          </h3>
          <div className="hoy-grilla">
            <span />
            <span className="hoy-col">Cancha 1</span>
            <span className="hoy-col">Cancha 2</span>
            {turnos.map(({ s1, s2 }) => (
              <div className="hoy-fila" key={s1.turn}>
                <span className="hoy-hora">{hhmm(s1.start)}</span>
                <Celda s={s1} />
                <Celda s={s2} />
              </div>
            ))}
          </div>
          {agenda.padel.length > 0 && (
            <ul className="hoy-padel">
              {agenda.padel.map((r) => (
                <li key={r.code}><span className="hoy-hora">{hhmm(r.start_time)}</span> Pádel · {quien(r)}</li>
              ))}
            </ul>
          )}
          <button className="btn btn-ghost btn-sm hoy-mas" onClick={() => irA('agenda')}>Ver la agenda completa</button>
        </section>
      )}

      {esperaDias.length > 0 && (
        <section className="stat-card">
          <h3 className="hoy-titulo">
            Quieren que les avisen
            <span className="agenda-contador">{esperaDias.reduce((n, d) => n + d.espera.length, 0)}</span>
          </h3>
          {esperaDias.map((d) => (
            <div key={d.fecha} className="hoy-espera-dia">
              <div className="hoy-espera-cab">
                <b>{fechaLinda(d.fecha)}</b>
                <span className={d.libres ? 'hoy-libres' : ''}>{d.libres ? `${d.libres} turno${d.libres === 1 ? '' : 's'} libre${d.libres === 1 ? '' : 's'}` : 'sin turnos libres'}</span>
              </div>
              <ul className="hoy-lista">
                {d.espera.map((e) => (
                  <li key={e.id}>
                    <span>{e.client_name}</span>
                    {e.linkWhatsapp && <a className="btn btn-ghost btn-sm" href={e.linkWhatsapp} target="_blank" rel="noreferrer">Avisar</a>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {recordatorios?.length > 0 && (
        <section className="stat-card">
          <h3 className="hoy-titulo">Recordatorios por mandar <span className="agenda-contador">{recordatorios.length}</span></h3>
          <ul className="hoy-lista">
            {recordatorios.map((r) => (
              <li key={r.id}>
                <span>{quien(r)} · {r.reservation_date === hoy ? 'hoy' : 'mañana'} {hhmm(r.start_time)}</span>
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost btn-sm hoy-mas" onClick={() => irA('fijos')}>Mandarlos desde Turnos fijos</button>
        </section>
      )}
    </div>
  );
}

function paramsUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    return { tab: p.get('tab'), code: p.get('code') };
  } catch {
    return {};
  }
}

function AdminPanelInterno() {
  const inicial = paramsUrl();
  const desHecho = useDeshacer();
  const [tab, setTab] = useState(
    ['hoy', 'buscar', 'agenda', 'contactos', 'fijos', 'suspender', 'stats'].includes(inicial.tab) ? inicial.tab : inicial.code ? 'buscar' : 'hoy'
  );
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [stats, setStats] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [confirmadaWa, setConfirmadaWa] = useState(null); // { link, nombre } tras confirmar
  const [menu, setMenu] = useState(false); // menú lateral (solo se usa en celular)

  // Con el menú abierto: Esc lo cierra y el fondo no se desplaza.
  useEffect(() => {
    if (!menu) return undefined;
    const cerrarConEsc = (e) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', cerrarConEsc);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', cerrarConEsc);
      document.body.style.overflow = previo;
    };
  }, [menu]);

  function irA(id) {
    desHecho.confirmarTodo(); // lo que estaba esperando en un aviso se manda ya, antes de cambiar de pantalla
    setTab(id);
    setMenu(false);
    window.scrollTo({ top: 0 });
  }

  useEffect(() => {
    cargarPendientes();
    // Si el email trae ?code=, buscar esa reserva automáticamente.
    if (inicial.code) buscar(inicial.code);
    // eslint-disable-next-line
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

  async function cargarCsv(desde, hasta) {
    const token = await tokenAdmin();
    const res = await fetch(`${API_URL}/admin/export/csv?desde=${desde}&hasta=${hasta}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('el servidor no pudo leer las reservas');
    return res.text();
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
    const c = (codigoBuscado || codigo).trim();
    if (!c) return;
    setError(null);
    setAviso(null);
    setConfirmadaWa(null);
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
      const r = await api.adminConfirmar(resultado.reserva.code);
      setAviso('Reserva confirmada.');
      setConfirmadaWa(
        r.linkWhatsappConfirmacion
          ? { link: r.linkWhatsappConfirmacion, nombre: r.reserva.client_name }
          : null
      );
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
      setAviso('Reserva cancelada.');
      setResultado(null);
      setCodigo('');
      cargarPendientes();
    } catch (e) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  const NAV = [
    { id: 'hoy', label: 'Hoy', ico: <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /> },
    { id: 'buscar', label: 'Confirmar', tag: pendientes.length || null, ico: <path d="M9 11l3 3 6-6M4 4h16v16H4z" /> },
    { id: 'agenda', label: 'Agenda', ico: <path d="M3 4h18v17H3zM3 9h18M8 2v4M16 2v4" /> },
    { id: 'contactos', label: 'Contactos', ico: <path d="M9 8a3.2 3.2 0 1 0 0-.1M3.5 20c.6-3.4 3-5 5.5-5s4.9 1.6 5.5 5M16 8.5a3 3 0 0 0 0-1M17 20c-.2-2.4-1-4-2.3-5" /> },
    { id: 'fijos', label: 'Turnos fijos', ico: <path d="M12 7v5l3 2M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z" /> },
    { id: 'suspender', label: 'Eventos especiales', ico: <path d="M4 15a4 4 0 0 1 1-7.5A5.5 5.5 0 0 1 16 6a4 4 0 0 1 1 8.9M8 19l-1 2M12 19l-1 2M16 19l-1 2" /> },
    { id: 'stats', label: 'Estadísticas', ico: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
  ];

  return (
    <div className="panel">
      <header className="ptop">
        <button type="button" className="ptop-btn" aria-label="Abrir el menú" aria-expanded={menu} onClick={() => setMenu(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          {pendientes.length > 0 && <span className="ptop-punto" aria-label={`${pendientes.length} pendientes`}>{pendientes.length}</span>}
        </button>
        <span className="ptop-titulo">{(NAV.find((n) => n.id === tab) || {}).label}</span>
      </header>
      {menu && <div className="pnav-fondo" onClick={() => setMenu(false)} aria-hidden="true" />}
      <aside className={`pnav ${menu ? 'abierto' : ''}`}>
        <div className="pnav-marca">
          <svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2 L28 16 L23.5 16 L31 30 L26 30 L34 44 L6 44 L14 30 L9 30 L16.5 16 L12 16 Z" fill="currentColor" /><rect x="17.6" y="43" width="4.8" height="9" fill="currentColor" /></svg>
          <div><b>El Pinar</b><span>Panel</span></div>
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={`pnav-item ${tab === n.id ? 'on' : ''}`} onClick={() => irA(n.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{n.ico}</svg>
            {n.label}
            {n.tag ? <span className="pnav-tag">{n.tag}</span> : null}
          </button>
        ))}
        <div className="pnav-pie">
          <button className="pnav-item" onClick={() => supabase.auth.signOut()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Salir
          </button>
        </div>
      </aside>

      <main className="pmain">
      {tab === 'hoy' && <HoyPanel pendientes={pendientes} onCambio={cargarPendientes} irA={irA} />}
      {tab === 'agenda' && <AgendaPanel />}
      {tab === 'suspender' && (
        <>
          <SuspensionPanel />
          <BloqueosPanel />
          <AperturasEspecialesPanel />
        </>
      )}
      {tab === 'contactos' && <ContactosPanel />}
      {tab === 'fijos' && <TurnosFijosPanel />}

      {tab === 'buscar' && (
        <>
          {(error || aviso || confirmadaWa) && (
            <div className="stat-card">
              {error && <p className="error-msg" style={{ margin: 0 }}>{error}</p>}
              {aviso && <p style={{ color: 'var(--p-ok)', fontWeight: 600, margin: 0 }}>{aviso}</p>}
              {confirmadaWa && (
                <a
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', textAlign: 'center', display: 'block', marginTop: 10 }}
                  href={confirmadaWa.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar confirmación por WhatsApp a {confirmadaWa.nombre}
                </a>
              )}
            </div>
          )}

          {resultado && (
            <div className="stat-card">
              <p style={{ margin: '0 0 4px', fontSize: 'var(--pt-lead)', fontWeight: 700 }}>
                {resultado.reserva.client_name}
                {resultado.reserva.team_name && (
                  <span style={{ color: 'var(--p-oro)' }}>{' · '}{nombreEquipo(resultado.reserva.team_name)}{resultado.reserva.category ? ` (${resultado.reserva.category})` : ''}</span>
                )}
              </p>
              <p style={{ margin: '4px 0', fontSize: 'var(--pt-chico)', color: 'var(--p-mut)' }}>
                {NOMBRE_CANCHA[resultado.reserva.court]} · {fechaLinda(resultado.reserva.reservation_date)} · {hhmm(resultado.reserva.start_time)} a {hhmm(resultado.reserva.end_time)} hs
              </p>
              <p style={{ margin: '4px 0', fontSize: 'var(--pt-chico)', color: 'var(--p-mut)' }}>{resultado.reserva.client_phone}</p>

              {resultado.vencioPorSistema && (
                <p style={{ fontSize: 'var(--pt-micro)', color: 'var(--p-oro)', marginTop: 4 }}>
                  Este turno se liberó solo. Si sigue libre, al confirmar se reactiva.
                </p>
              )}
              {resultado.accionSugerida === 'confirmar' && (
                <>
                  <div className="modal-actions">
                    <button className="btn btn-primary" disabled={procesando} onClick={confirmar}>Confirmar turno</button>
                    <button className="btn btn-ghost" onClick={() => setResultado(null)}>Atrás</button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <BotonConfirmar
                      label="Cancelar este turno"
                      confirmLabel="Tocá de nuevo para cancelar"
                      onConfirm={cancelar}
                      disabled={procesando}
                      style={{ width: '100%' }}
                    />
                  </div>
                </>
              )}
              {resultado.accionSugerida === 'cancelar' && (
                <div className="modal-actions">
                  <button className="btn btn-danger" disabled={procesando} onClick={cancelar}>Cancelar turno</button>
                  <button className="btn btn-ghost" onClick={() => setResultado(null)}>Atrás</button>
                </div>
              )}
              {resultado.accionSugerida === 'ninguna' && (
                <p style={{ fontStyle: 'italic', color: 'var(--p-mut)' }}>Este turno ya fue cancelado.</p>
              )}
            </div>
          )}

          <div className="stat-card">
            <h3 style={{ marginTop: 0 }}>
              Pendientes de confirmación
              {pendientes.length > 0 && <span className="agenda-contador" style={{ marginLeft: 8 }}>{pendientes.length}</span>}
            </h3>
            <PendientesLista pendientes={pendientes} onCambio={cargarPendientes} />
          </div>
        </>
      )}

      {tab === 'stats' && <EstadisticasDecidir cargarCsv={cargarCsv} />}
      {tab === 'stats' && stats && (
        <>
          <div className="stat-card" style={{ margin: '12px 20px 0' }}>
            <h3 style={{ marginTop: 0 }}>Próximos {stats.rangoDias} días</h3>
            <div className="stat-grid">
              <Cifra titulo="Confirmadas" valor={stats.ventana.confirmadas} />
              <Cifra titulo="Pendientes" valor={stats.ventana.pendientes} />
              <Cifra
                titulo="Ocupación fútbol"
                valor={`${stats.ventana.ocupacionFutbolPct}%`}
                sub={`${stats.ventana.turnosFutbolOcupados} de ${stats.ventana.turnosFutbolPosibles} turnos`}
              />
              <Cifra titulo="Buscan rival" valor={stats.ventana.equiposBuscandoRival} />
              <Cifra titulo="Cancha 1" valor={stats.ventana.reservasPorCancha.C1} />
              <Cifra titulo="Cancha 2" valor={stats.ventana.reservasPorCancha.C2} />
              <Cifra titulo="Pádel" valor={stats.ventana.reservasPorCancha.PAD} />
            </div>
          </div>

          <div className="stat-card" style={{ margin: '12px 20px 0' }}>
            <h3 style={{ marginTop: 0 }}>Últimos 30 días</h3>
            <div className="stat-grid">
              <Cifra titulo="Reservas" valor={stats.historico30.totalActivas} />
              <Cifra titulo="Clientes distintos" valor={stats.historico30.clientesUnicos} />
              <Cifra titulo="Cancelaciones" valor={stats.historico30.canceladas} sub={`${stats.historico30.tasaCancelacionPct}% del total`} />
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 'var(--pt-chico)', fontWeight: 600, marginBottom: 6 }}>Reservas por día</div>
              {stats.historico30.porDiaSemana.map((d) => {
                const max = Math.max(1, ...stats.historico30.porDiaSemana.map((x) => x.reservas));
                return (
                  <div key={d.dia} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--pt-micro)', width: 70, color: 'var(--p-mut)' }}>{d.dia}</span>
                    <div style={{ flex: 1, background: 'var(--p-fila)', borderRadius: 'var(--pr-s)', height: 16 }}>
                      <div style={{ width: `${(d.reservas / max) * 100}%`, background: 'var(--p-oro)', height: '100%', borderRadius: 4, minWidth: d.reservas ? 4 : 0 }} />
                    </div>
                    <span style={{ fontSize: 'var(--pt-micro)', width: 20, textAlign: 'right' }}>{d.reservas}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <ExportPanel />
        </>
      )}

      {tab === 'stats' && !stats && <ExportPanel />}
      {tab === 'stats' && <EstadoSistema />}
      </main>
    </div>
  );
}

export default function AdminPanel() {
  return (
    <DeshacerProvider>
      <AdminPanelInterno />
    </DeshacerProvider>
  );
}
