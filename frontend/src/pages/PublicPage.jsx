import { useEffect, useState } from 'react';
import { api } from '../api';
import FutbolGrid from '../components/FutbolGrid';
import PadelPicker from '../components/PadelPicker';
import RivalsBoard from '../components/RivalsBoard';
import BookingModal from '../components/BookingModal';

function hoyISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function PublicPage() {
  const [tab, setTab] = useState('futbol'); // 'futbol' | 'padel' | 'rivales'
  const [fecha, setFecha] = useState(hoyISO());
  const [turnosC1, setTurnosC1] = useState([]);
  const [turnosC2, setTurnosC2] = useState([]);
  const [padel, setPadel] = useState(null);
  const [rivales, setRivales] = useState([]);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (tab === 'futbol') cargarFutbol();
    if (tab === 'padel') cargarPadel();
    if (tab === 'rivales') cargarRivales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fecha]);

  async function cargarFutbol() {
    setCargando(true);
    try {
      const [c1, c2] = await Promise.all([
        api.disponibilidadFutbol('C1', fecha),
        api.disponibilidadFutbol('C2', fecha),
      ]);
      setTurnosC1(c1.turnos);
      setTurnosC2(c2.turnos);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }

  async function cargarPadel() {
    setCargando(true);
    try {
      const data = await api.disponibilidadPadel(fecha);
      setPadel(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }

  async function cargarRivales() {
    setCargando(true);
    try {
      const data = await api.rivales();
      setRivales(data.rivales);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }

  function cerrarModalYRecargar() {
    setSlotSeleccionado(null);
    if (tab === 'futbol') cargarFutbol();
    if (tab === 'padel') cargarPadel();
  }

  return (
    <div className="app-shell">
      <div className="marquee">
        <div className="brand">
          Complejo El Potrero
          <small>Fútbol 11 · Pádel · Reservas</small>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'futbol' ? 'active' : ''}`} onClick={() => setTab('futbol')}>Fútbol 11</button>
        <button className={`tab-btn ${tab === 'padel' ? 'active' : ''}`} onClick={() => setTab('padel')}>Pádel</button>
        <button className={`tab-btn ${tab === 'rivales' ? 'active' : ''}`} onClick={() => setTab('rivales')}>Buscando rival</button>
      </div>

      {tab !== 'rivales' && (
        <input
          className="date-input"
          type="date"
          value={fecha}
          min={hoyISO()}
          onChange={(e) => setFecha(e.target.value)}
        />
      )}

      {cargando && <p style={{ padding: '0 20px', color: '#5C6B60' }}>Cargando...</p>}

      {tab === 'futbol' && !cargando && (
        <div className="canchas">
          <FutbolGrid
            court="C1"
            nombreCancha="Cancha 1"
            turnos={turnosC1}
            onSelectSlot={(s) => setSlotSeleccionado({ ...s, date: fecha })}
          />
          <FutbolGrid
            court="C2"
            nombreCancha="Cancha 2"
            turnos={turnosC2}
            onSelectSlot={(s) => setSlotSeleccionado({ ...s, date: fecha })}
          />
        </div>
      )}

      {tab === 'padel' && !cargando && padel && (
        <PadelPicker
          apertura={padel.apertura}
          cierre={padel.cierre}
          ocupados={padel.ocupados}
          onSelectRange={(r) => setSlotSeleccionado({ court: 'PAD', date: fecha, ...r })}
        />
      )}

      {tab === 'rivales' && !cargando && <RivalsBoard rivales={rivales} />}

      {slotSeleccionado && (
        <BookingModal slotInfo={slotSeleccionado} onClose={cerrarModalYRecargar} />
      )}
    </div>
  );
}
