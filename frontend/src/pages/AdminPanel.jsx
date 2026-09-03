import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { api } from '../api';
import {
  hoyISO, proximoDiaHabilitado, fechaLargaCompleta, partesFecha,
  hhmm, sumarDias, esDiaHabilitado,
} from '../lib/fechas';

const API_URL = import.meta.env.VITE_API_URL;

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
      <p style={{ fontSize: 12, color: '#5C6B60' }}>
        Trae una hoja "Resumen" con los números del negocio (por cancha, por mes, por día,
        clientes frecuentes) y una hoja "Detalle" con todas las reservas como tabla para filtrar
        y armar gráficos.
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid var(--linea)', margin: '14px 0' }} />
      <p style={{ fontSize: 13, color: '#5C6B60', marginTop: 0 }}>
        <strong>Backup automático:</strong> todos los días a las 3:00 se manda el CSV completo
        por email a los administradores. También lo podés disparar ahora:
      </p>
      <button className="btn btn-ghost" onClick={backupAhora} disabled={backup === '...'} style={{ width: '100%' }}>
        {backup === '...' ? 'Enviando...' : 'Enviar backup ahora'}
      </button>
      {backup && backup !== '...' && (
        <p style={{ fontSize: 12, color: '#5C6B60', marginBottom: 0 }}>{backup}</p>
      )}
    </div>
  );
}

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel', PAR: 'Parrilla' };

function Semaforo({ ok, label, detalle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0' }}>
      <span style={{ fontSize: 15, lineHeight: 1.3 }}>{ok ? '🟢' : '🔴'}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {detalle && <div style={{ fontSize: 12, color: '#5C6B60' }}>{detalle}</div>}
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
    <div className="stat-card" style={{ margin: '12px 20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Estado del sistema</h3>
        <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={cargar} disabled={cargando}>
          {cargando ? '...' : 'Actualizar'}
        </button>
      </div>
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
          <p style={{ fontSize: 12, color: '#5C6B60', marginBottom: 0, marginTop: 6 }}>
            Un turno queda reservado {d.ventanaPendientesMin} min esperando el comprobante.
          </p>
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
    const ddmm = (fecha || '').split('-').slice(1).reverse().join('/');
    const msg =
      `Hola ${e.client_name}! Te escribimos del Complejo El Pinar.\n\n` +
      `Se liberó ${NOMBRE_CANCHA[reserva.court]} de ${hhmm(reserva.start_time)} a ${hhmm(reserva.end_time)} ` +
      `el ${ddmm}. Si lo querés, respondé este mensaje y te lo reservamos.`;
    return `${base}?text=${encodeURIComponent(msg)}`;
  }

  if (cancelado) {
    return (
      <div className="agenda-detalle">
        <p style={{ color: 'var(--pitch, #2E7D5B)', fontWeight: 600, marginTop: 0 }}>
          Turno cancelado. Se liberó {NOMBRE_CANCHA[reserva.court]} {hhmm(reserva.start_time)}–{hhmm(reserva.end_time)}.
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, margin: '10px 0 6px' }}>
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
        {reserva.client_name}
        {reserva.looking_for_rival && reserva.team_name ? ` · ${reserva.team_name} (${reserva.category || 's/cat'})` : ''}
        {reserva.parrilla ? ' · 🔥 con parrilla' : ''}
      </div>
      <div className="agenda-detalle-meta">
        Tel: {reserva.client_phone}{reserva.client_email ? ` · ${reserva.client_email}` : ''}
      </div>
      <div className="agenda-detalle-meta">{reserva.code}</div>

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
          <span style={{ fontSize: 12, color: '#B3382E' }}>Sin número válido para WhatsApp</span>
        )}
      </div>
      <p style={{ fontSize: 11, color: '#5C6B60', marginTop: 6, marginBottom: 0 }}>
        Tip: primero avisá por WhatsApp, después cancelá el turno.
      </p>
    </div>
  );
}

const ESTADO_BADGE = {
  libre: { txt: 'Libre', cls: 'agenda-badge libre' },
  pendiente: { txt: 'A confirmar', cls: 'agenda-badge pendiente' },
  confirmada: { txt: 'Reservado', cls: 'agenda-badge ocupada' },
};

const TXT_ESTADO = { libre: 'Libre', pendiente: 'A confirmar', confirmada: 'Reservado' };

// Grilla visual de fútbol: Cancha 1 y Cancha 2 en columnas, turnos en filas.
function GrillaFutbol({ agenda, sel, onCelda }) {
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
                disabled={!r}
                onClick={() => r && onCelda(r.code)}
              >
                <span className="grilla-celda-nombre">{r ? r.client_name.split(' ')[0] : ''}</span>
                <span className="grilla-celda-estado">{TXT_ESTADO[slot.status]}</span>
                {r && r.parrilla && <span className="grilla-celda-tag">🔥</span>}
                {r && r.looking_for_rival && <span className="grilla-celda-tag" style={{ left: 4 }}>🤝</span>}
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
    <div style={{ padding: 10, borderRadius: 8, background: '#F1EEE4', marginBottom: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{e.client_name}</div>
      <div style={{ fontSize: 12, color: '#5C6B60', marginBottom: 6 }}>{e.client_phone}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {e.linkWhatsapp ? (
          <a
            className={`btn ${abierto ? 'btn-ghost' : 'btn-primary'}`}
            style={{ textDecoration: 'none', textAlign: 'center', padding: '6px 12px', fontSize: 13 }}
            href={e.linkWhatsapp}
            target="_blank"
            rel="noreferrer"
            onClick={() => setAbierto(true)}
          >
            {abierto ? '✓ WhatsApp abierto' : 'Avisar por WhatsApp'}
          </a>
        ) : (
          <span style={{ fontSize: 12, color: '#B3382E' }}>Sin número válido</span>
        )}
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} disabled={busy} onClick={() => accion('avisado')}>
          Marcar avisado
        </button>
        <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} disabled={busy} onClick={() => accion('descartar')}>
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

function AgendaPanel() {
  const [fecha, setFecha] = useState(() => proximoDiaHabilitado(hoyISO()));
  const [agenda, setAgenda] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [sel, setSel] = useState(null);

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
          ...agenda.parrilla.reservas,
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

      {cargando && <p style={{ color: '#5C6B60' }}>Cargando…</p>}
      {error && <p className="error-msg">{error}</p>}

      {agenda && !cargando && (
        <>
          <p className="agenda-resumen">
            {totalDia === 0
              ? 'Sin reservas este día.'
              : `${totalDia} reserva${totalDia > 1 ? 's' : ''} · Parrillas ${agenda.parrilla.usadas}/${agenda.parrilla.capacidad}`}
          </p>

          <div className="agenda-card">
            <div className="agenda-card-titulo">Fútbol</div>
            <GrillaFutbol agenda={agenda} sel={sel} onCelda={toggle} />
            <div className="grilla-leyenda">
              <span><i className="pt libre" /> Libre</span>
              <span><i className="pt pendiente" /> A confirmar</span>
              <span><i className="pt confirmada" /> Reservado</span>
              <span>🔥 parrilla · 🤝 busca rival</span>
            </div>
          </div>

          <div className="agenda-card">
            <div className="agenda-card-titulo">Pádel</div>
            {agenda.padel.length === 0 ? (
              <p className="agenda-vacio">Libre todo el día (20:00 a 23:30)</p>
            ) : (
              <TimelinePadel reservas={agenda.padel} sel={sel} onTramo={toggle} />
            )}
          </div>

          <div className="agenda-card">
            <div className="agenda-card-titulo">
              Parrilla 🔥 <span className="agenda-contador">{agenda.parrilla.usadas}/{agenda.parrilla.capacidad}</span>
            </div>
            {agenda.parrilla.reservas.length === 0 ? (
              <p className="agenda-vacio">Nadie reservó parrilla</p>
            ) : (
              <div className="agenda-slots">
                {agenda.parrilla.reservas.map((r) => (
                  <FilaFlexible
                    key={r.code}
                    r={r}
                    seleccionado={sel === r.code}
                    onClick={() => toggle(r.code)}
                    detalle={`${NOMBRE_CANCHA[r.court]} ${r.turn || hhmm(r.start_time)}`}
                  />
                ))}
              </div>
            )}
          </div>

          {agenda.espera && agenda.espera.length > 0 && (
            <div className="agenda-card">
              <div className="agenda-card-titulo">
                Lista de espera <span className="agenda-contador">{agenda.espera.length}</span>
              </div>
              <p style={{ fontSize: 12, color: '#5C6B60', margin: '0 0 8px' }}>
                Pidieron que les avises si se libera un turno de fútbol este día.
              </p>
              {agenda.espera.map((e) => (
                <EsperaItem key={e.id} e={e} onAccion={cargar} />
              ))}
            </div>
          )}

          {reservaSel && (
            <DetalleReserva
              reserva={reservaSel}
              espera={agenda.espera || []}
              fecha={fecha}
              onCancelado={cargar}
            />
          )}
        </>
      )}
    </div>
  );
}

function ContactosPanel() {
  const [contactos, setContactos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [texto, setTexto] = useState('');

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
  const lista = (contactos || []).filter(
    (c) => !filtro || `${c.nombre} ${c.telefono} ${c.email || ''}`.toLowerCase().includes(filtro)
  );

  return (
    <div className="stat-card">
      <h3 style={{ marginTop: 0 }}>Base de contactos</h3>
      <p style={{ fontSize: 13, color: '#5C6B60', marginTop: 0 }}>
        Todos los clientes que alguna vez reservaron. Tocá "WhatsApp" para escribirles.
      </p>

      <input
        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid var(--line)', marginBottom: 10 }}
        placeholder="Buscar por nombre, teléfono o email"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />

      {cargando && <p style={{ color: '#5C6B60' }}>Cargando...</p>}
      {error && <p className="error-msg">{error}</p>}
      {contactos && (
        <p style={{ fontSize: 13, fontWeight: 600 }}>{lista.length} de {contactos.length} contactos</p>
      )}

      {lista.map((c) => (
        <div key={c.telefono + c.nombre} style={{ padding: 10, borderRadius: 8, background: '#F1EEE4', marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.nombre}</div>
          <div style={{ fontSize: 12, color: '#5C6B60' }}>
            {c.telefono}{c.email ? ` · ${c.email}` : ''}
          </div>
          <div style={{ fontSize: 12, color: '#5C6B60', marginBottom: 6 }}>
            {c.confirmadas} confirmada{c.confirmadas === 1 ? '' : 's'} · {c.totalReservas} en total · última: {c.ultimaReserva}
          </div>
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
        </div>
      ))}
    </div>
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
      <p style={{ fontSize: 13, color: '#5C6B60', marginTop: 0 }}>
        Cancela todas las reservas del día y te arma un WhatsApp por cliente para avisarles.
      </p>

      <NavegadorFecha fecha={fecha} onCambiar={(f) => { setFecha(f); setReservas(null); setClientes(null); }} />
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={verReservas} disabled={cargando}>
        {cargando ? 'Buscando…' : 'Ver reservas de este día'}
      </button>

      {error && <p className="error-msg">{error}</p>}

      {reservas && (
        <div style={{ marginTop: 12 }}>
          {reservas.length === 0 ? (
            <p style={{ color: '#5C6B60' }}>No hay reservas activas ese día.</p>
          ) : (
            <>
              <p style={{ fontWeight: 600, margin: '4px 0', textTransform: 'capitalize' }}>
                {reservas.length} reserva{reservas.length > 1 ? 's' : ''} — {fechaLargaCompleta(fecha)}
              </p>
              {reservas.map((r) => (
                <div key={r.id} className="agenda-slot" style={{ cursor: 'default' }}>
                  <div className="agenda-slot-hora">{r.turn || hhmm(r.start_time)}</div>
                  <div className="agenda-slot-cliente">{NOMBRE_CANCHA[r.court]} · {r.client_name}</div>
                  <span style={{ fontSize: 12, color: '#5C6B60' }}>{r.client_phone}</span>
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
          <p style={{ color: 'var(--pitch, #2E7D5B)', fontWeight: 600 }}>
            Fecha suspendida. {clientes.length} reserva{clientes.length > 1 ? 's' : ''} cancelada{clientes.length > 1 ? 's' : ''}.
            Enviá el aviso a cada uno:
          </p>
          {clientes.map((c) => (
            <div key={c.code} style={{ padding: 10, borderRadius: 8, background: '#F1EEE4', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {c.nombre} — {NOMBRE_CANCHA[c.court]} {hhmm(c.start_time)}
              </div>
              <div style={{ fontSize: 12, color: '#5C6B60', marginBottom: 6 }}>
                Tel: {c.telefonoOriginal} {c.telefono ? `→ +${c.telefono}` : '(no se pudo armar el número, revisalo)'}
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
                <p style={{ fontSize: 12, color: '#B3382E' }}>Número inválido — contactá al cliente a mano.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Lee ?tab= y ?code= de la URL (para los links de los emails).
function paramsUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    return { tab: p.get('tab'), code: p.get('code') };
  } catch {
    return {};
  }
}

export default function AdminPanel() {
  const inicial = paramsUrl();
  const [tab, setTab] = useState(['buscar', 'agenda', 'contactos', 'lluvia', 'stats'].includes(inicial.tab) ? inicial.tab : 'buscar');
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [stats, setStats] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState(null);

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
        <button className={`tab-btn ${tab === 'buscar' ? 'active' : ''}`} onClick={() => setTab('buscar')}>Confirmar</button>
        <button className={`tab-btn ${tab === 'agenda' ? 'active' : ''}`} onClick={() => setTab('agenda')}>Agenda</button>
        <button className={`tab-btn ${tab === 'contactos' ? 'active' : ''}`} onClick={() => setTab('contactos')}>Contactos</button>
        <button className={`tab-btn ${tab === 'lluvia' ? 'active' : ''}`} onClick={() => setTab('lluvia')}>Lluvia</button>
        <button className={`tab-btn ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>Estadísticas</button>
      </div>

      {tab === 'agenda' && <AgendaPanel />}
      {tab === 'lluvia' && <SuspensionPanel />}
      {tab === 'contactos' && <ContactosPanel />}

      {tab === 'buscar' && (
        <>
          <div className="stat-card">
            <h3 style={{ marginTop: 0 }}>Pegá el código de la reserva</h3>
            <p style={{ fontSize: 13, color: '#5C6B60', marginTop: 0 }}>
              El cliente te lo manda por WhatsApp con el comprobante. Al confirmar, el turno
              queda ocupado en la web, se le manda el email, y si pidió rival aparece solo en "Busco rival".
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1.5px solid var(--line)', fontFamily: 'monospace' }}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
                placeholder="Ej: RES-C1-22SEP-T1"
              />
              <button className="btn btn-primary" onClick={() => buscar()}>Buscar</button>
            </div>
            {error && <p className="error-msg">{error}</p>}
            {aviso && <p style={{ color: 'var(--pitch)', fontWeight: 600, marginTop: 8 }}>{aviso}</p>}
          </div>

          {resultado && (
            <div className="stat-card">
              <div style={{ fontFamily: 'monospace', fontWeight: 700, marginBottom: 4 }}>{resultado.reserva.code}</div>
              <p style={{ margin: '4px 0' }}>
                {resultado.reserva.client_name} {resultado.reserva.category ? `· ${resultado.reserva.category}` : ''}
                {resultado.reserva.looking_for_rival && (
                  <span style={{ color: 'var(--gold, #C09A46)', fontWeight: 600 }}>
                    {' · '}Busca rival{resultado.reserva.team_name ? ` (${resultado.reserva.team_name})` : ''}
                  </span>
                )}
                {resultado.reserva.parrilla && <span style={{ color: '#B45309', fontWeight: 600 }}>{' · '}🔥 Parrilla</span>}
              </p>
              <p style={{ margin: '4px 0', fontSize: 13, color: '#5C6B60' }}>
                {NOMBRE_CANCHA[resultado.reserva.court]} · {resultado.reserva.reservation_date} · {resultado.reserva.start_time.slice(0, 5)} a {resultado.reserva.end_time.slice(0, 5)}
              </p>
              <p style={{ fontSize: 13 }}>Tel: {resultado.reserva.client_phone}</p>

              {resultado.vencioPorSistema && (
                <p style={{ fontSize: 12, color: 'var(--gold-dark, #A57F2E)', marginTop: 4 }}>
                  Este turno se había liberado por falta de comprobante. Si el turno sigue libre,
                  al confirmar se reactiva.
                </p>
              )}
              {resultado.accionSugerida === 'confirmar' && (
                <>
                  <div className="modal-actions">
                    <button className="btn btn-primary" disabled={procesando} onClick={confirmar}>Sí, confirmar</button>
                    <button className="btn btn-ghost" onClick={() => setResultado(null)}>Atrás</button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <BotonConfirmar
                      label="Dar de baja este turno"
                      confirmLabel="Confirmar: cancelar el turno"
                      onConfirm={cancelar}
                      disabled={procesando}
                      style={{ width: '100%' }}
                    />
                  </div>
                </>
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
              <button
                key={p.id}
                className="pendiente-item"
                onClick={() => { buscar(p.code); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{p.code}</div>
                <div style={{ fontSize: 12, color: '#7A4A00' }}>
                  {p.client_name} · {NOMBRE_CANCHA[p.court] || p.court} · {p.reservation_date}
                </div>
                <div style={{ fontSize: 11, color: '#7A4A00', marginTop: 2, fontWeight: 600 }}>Tocá para confirmar / cancelar →</div>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'stats' && <EstadoSistema />}

      {tab === 'stats' && stats && (
        <>
          <div className="stat-card" style={{ margin: '12px 20px 0' }}>
            <h3 style={{ marginTop: 0 }}>Próximos {stats.rangoDias} días</h3>
            <div className="stat-grid">
              <div className="stat-card">
                <div style={{ fontSize: 13, color: '#5C6B60' }}>Confirmadas</div>
                <div className="big-num">{stats.ventana.confirmadas}</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 13, color: '#5C6B60' }}>Pendientes</div>
                <div className="big-num">{stats.ventana.pendientes}</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 13, color: '#5C6B60' }}>Ocupación fútbol</div>
                <div className="big-num">{stats.ventana.ocupacionFutbolPct}%</div>
                <div style={{ fontSize: 11, color: '#5C6B60' }}>
                  {stats.ventana.turnosFutbolOcupados}/{stats.ventana.turnosFutbolPosibles} turnos
                </div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 13, color: '#5C6B60' }}>Parrillas</div>
                <div className="big-num">{stats.ventana.parrillasReservadas}</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 13, color: '#5C6B60' }}>Cancha 1 · Cancha 2</div>
                <div className="big-num">{stats.ventana.reservasPorCancha.C1} · {stats.ventana.reservasPorCancha.C2}</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 13, color: '#5C6B60' }}>Pádel · Buscan rival</div>
                <div className="big-num">{stats.ventana.reservasPorCancha.PAD} · {stats.ventana.equiposBuscandoRival}</div>
              </div>
            </div>
          </div>

          <div className="stat-card" style={{ margin: '12px 20px 0' }}>
            <h3 style={{ marginTop: 0 }}>Últimos 30 días</h3>
            <div className="stat-grid">
              <div className="stat-card">
                <div style={{ fontSize: 13, color: '#5C6B60' }}>Reservas</div>
                <div className="big-num">{stats.historico30.totalActivas}</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 13, color: '#5C6B60' }}>Clientes distintos</div>
                <div className="big-num">{stats.historico30.clientesUnicos}</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 13, color: '#5C6B60' }}>Cancelaciones</div>
                <div className="big-num">{stats.historico30.canceladas}</div>
                <div style={{ fontSize: 11, color: '#5C6B60' }}>{stats.historico30.tasaCancelacionPct}% del total</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 13, color: '#5C6B60' }}>Parrillas</div>
                <div className="big-num">{stats.historico30.parrillas}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Reservas por día</div>
              {stats.historico30.porDiaSemana.map((d) => {
                const max = Math.max(1, ...stats.historico30.porDiaSemana.map((x) => x.reservas));
                return (
                  <div key={d.dia} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, width: 70, color: '#5C6B60' }}>{d.dia}</span>
                    <div style={{ flex: 1, background: '#EDE8DA', borderRadius: 4, height: 16 }}>
                      <div style={{ width: `${(d.reservas / max) * 100}%`, background: 'var(--navy, #123C6E)', height: '100%', borderRadius: 4, minWidth: d.reservas ? 4 : 0 }} />
                    </div>
                    <span style={{ fontSize: 12, width: 20, textAlign: 'right' }}>{d.reservas}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <ExportPanel />
        </>
      )}

      {tab === 'stats' && !stats && <ExportPanel />}
    </div>
  );
}
