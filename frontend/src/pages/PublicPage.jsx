import { useEffect, useState } from 'react';
import { api } from '../api';
import Header from '../components/Header';
import CourtSelector, { CANCHAS } from '../components/CourtSelector';
import DateStrip from '../components/DateStrip';
import FutbolSlots from '../components/FutbolSlots';
import PadelPicker from '../components/PadelPicker';
import RivalsCalendar from '../components/RivalsCalendar';
import BookingModal from '../components/BookingModal';
import { hoyISO, sumarDias } from '../lib/fechas';

export default function PublicPage() {
  const [vista, setVista] = useState('reservar'); // 'reservar' | 'rivales'
  const [cancha, setCancha] = useState('C1');
  const [fecha, setFecha] = useState(hoyISO());
  const [inicioTira, setInicioTira] = useState(hoyISO());

  const [turnos, setTurnos] = useState([]);
  const [padel, setPadel] = useState(null);
  const [rivales, setRivales] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);

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
  }, [cancha, fecha]);

  useEffect(() => {
    api.rivales()
      .then((data) => setRivales(data.rivales))
      .catch((e) => console.error(e));
  }, []);

  function moverTira(dias) {
    const nuevo = sumarDias(inicioTira, dias);
    setInicioTira(nuevo < hoyISO() ? hoyISO() : nuevo);
  }

  function recargarTodo() {
    setSlotSeleccionado(null);
    api.rivales().then((data) => setRivales(data.rivales)).catch(() => {});
    if (cancha === 'PAD') {
      api.disponibilidadPadel(fecha).then(setPadel).catch(() => {});
    } else {
      api.disponibilidadFutbol(cancha, fecha).then((d) => setTurnos(d.turnos)).catch(() => {});
    }
  }

  const texto = busqueda.trim().toLowerCase();
  const rivalesFiltrados = texto
    ? rivales.filter((r) =>
        `${r.team_name} ${r.category || ''}`.toLowerCase().includes(texto))
    : rivales;
  const rivalesDelDia = rivalesFiltrados.filter((r) => r.reservation_date === fecha);

  const nombreCancha = CANCHAS.find((c) => c.id === cancha)?.nombre || cancha;

  return (
    <div className="app-shell">
      <Header
        busqueda={busqueda}
        onBuscar={setBusqueda}
        menuAbierto={menuAbierto}
        onToggleMenu={() => setMenuAbierto((v) => !v)}
        buscadorAbierto={buscadorAbierto}
        onToggleBuscador={() => setBuscadorAbierto((v) => !v)}
        onIrA={(destino) => { setVista(destino); setMenuAbierto(false); }}
      />

      {vista === 'reservar' && (
        <CourtSelector seleccionada={cancha} onSeleccionar={setCancha} />
      )}

      <DateStrip
        inicio={inicioTira}
        seleccionada={fecha}
        onSeleccionar={setFecha}
        onMover={moverTira}
      />

      {vista === 'reservar' && (
        <>
          {cargando && <p className="cargando">Cargando horarios...</p>}
          {errorCarga && <p className="error-msg" style={{ padding: '0 18px' }}>{errorCarga}</p>}

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
              key={fecha}
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
          <h2 className="seccion-titulo">Calendario de búsqueda de rivales</h2>
          <RivalsCalendar rivales={rivalesDelDia} />
        </>
      )}

      <div className="acciones-fijas">
        <button
          className={`btn btn-navy ${vista === 'reservar' ? 'activo' : ''}`}
          onClick={() => setVista('reservar')}
          aria-pressed={vista === 'reservar'}
        >
          Reservar turnos
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
