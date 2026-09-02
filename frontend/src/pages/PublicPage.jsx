import { useEffect, useState } from 'react';
import { api } from '../api';
import Header from '../components/Header';
import CourtSelector, { CANCHAS } from '../components/CourtSelector';
import DateStrip from '../components/DateStrip';
import FutbolSlots from '../components/FutbolSlots';
import PadelPicker from '../components/PadelPicker';
import RivalsCalendar from '../components/RivalsCalendar';
import BookingModal from '../components/BookingModal';
import ConsultaReserva from '../components/ConsultaReserva';
import { hoyISO, proximoDiaHabilitado } from '../lib/fechas';

export default function PublicPage() {
  const [vista, setVista] = useState('reservar'); // 'reservar' | 'rivales'
  const [cancha, setCancha] = useState('C1');
  const [fecha, setFecha] = useState(() => proximoDiaHabilitado(hoyISO()));

  const [turnos, setTurnos] = useState([]);
  const [padel, setPadel] = useState(null);
  const [rivales, setRivales] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [consultaAbierta, setConsultaAbierta] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);

  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function cargarDisponibilidad() {
      setCargando(true);
      setErrorCarga(null);
      try {
        if (cancha === 'PAD') {
          const data = await api.disponibilidadPadel(fecha);
          if (!cancelado) setPadel(data);
        } else {
          const data = await api.disponibilidadFutbol(cancha, fecha);
          if (!cancelado) setTurnos(data.turnos);
        }
      } catch (e) {
        if (!cancelado) setErrorCarga(e.message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarDisponibilidad();
    return () => { cancelado = true; };
  }, [cancha, fecha, reintento]);

  useEffect(() => {
    api.rivales()
      .then((data) => setRivales(data.rivales))
      .catch((e) => console.error(e));
  }, []);


  function recargarTodo() {
    setSlotSeleccionado(null);
    api.rivales().then((data) => setRivales(data.rivales)).catch(() => {});
    if (cancha === 'PAD') {
      api.disponibilidadPadel(fecha).then(setPadel).catch(() => {});
    } else {
      api.disponibilidadFutbol(cancha, fecha).then((d) => setTurnos(d.turnos)).catch(() => {});
    }
  }

  const nombreCancha = CANCHAS.find((c) => c.id === cancha)?.nombre || cancha;

  return (
    <div className="app-shell">
      <Header
        menuAbierto={menuAbierto}
        onToggleMenu={() => setMenuAbierto((v) => !v)}
        onIrA={(destino) => { setVista(destino); setMenuAbierto(false); }}
        onBuscarReserva={() => { setConsultaAbierta((v) => !v); setMenuAbierto(false); }}
      />

      {consultaAbierta && <ConsultaReserva onCerrar={() => setConsultaAbierta(false)} />}

      {vista === 'reservar' && (
        <>
          <CourtSelector seleccionada={cancha} onSeleccionar={setCancha} />
          <DateStrip seleccionada={fecha} onSeleccionar={setFecha} />
        </>
      )}

      {vista === 'reservar' && (
        <>
          {cargando && <p className="cargando">Cargando horarios…</p>}
          {errorCarga && (
            <p className="error-msg" style={{ padding: '0 18px' }}>
              {errorCarga}{' '}
              <button
                onClick={() => setReintento((n) => n + 1)}
                style={{ background: 'none', border: 'none', color: 'var(--navy)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
              >
                Reintentar
              </button>
            </p>
          )}

          {!cargando && !errorCarga && cancha !== 'PAD' && (
            <FutbolSlots
              key={`${cancha}-${fecha}`}
              nombreCancha={nombreCancha}
              turnos={turnos}
              onReservar={(turn) => setSlotSeleccionado({ court: cancha, date: fecha, turn })}
            />
          )}

          {!cargando && !errorCarga && cancha === 'PAD' && padel && (
            <PadelPicker
              key={`${cancha}-${fecha}`}
              apertura={padel.apertura}
              cierre={padel.cierre}
              ocupados={padel.ocupados}
              onReservar={(rango) => setSlotSeleccionado({ court: 'PAD', date: fecha, ...rango })}
            />
          )}
        </>
      )}

      {vista === 'rivales' && (
        <>
          <h2 className="seccion-titulo">Equipos buscando rival</h2>
          <RivalsCalendar rivales={rivales} />
        </>
      )}

      <div className="acciones-fijas">
        <button
          className={`btn btn-navy ${vista === 'reservar' ? 'activo' : ''}`}
          onClick={() => setVista('reservar')}
          aria-pressed={vista === 'reservar'}
        >
          Reservas
        </button>
        <button
          className={`btn btn-gold ${vista === 'rivales' ? 'activo' : ''}`}
          onClick={() => setVista('rivales')}
          aria-pressed={vista === 'rivales'}
        >
          Busco rival
        </button>
      </div>

      {slotSeleccionado && (
        <BookingModal slotInfo={slotSeleccionado} onClose={recargarTodo} />
      )}
    </div>
  );
}
