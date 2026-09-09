import { useEffect, useState } from 'react';
import { api } from '../api';
import CourtSelector, { CANCHAS } from '../components/CourtSelector';
import DateStrip from '../components/DateStrip';
import FutbolSlots from '../components/FutbolSlots';
import PadelPicker from '../components/PadelPicker';
import RivalsCalendar from '../components/RivalsCalendar';
import BookingModal from '../components/BookingModal';
import ConsultaReserva from '../components/ConsultaReserva';
import ListaEsperaModal from '../components/ListaEsperaModal';
import MascotaRival from '../components/MascotaRival';
import SiteNav from '../components/site/SiteNav';
import Hero from '../components/site/Hero';
import Servicios from '../components/site/Servicios';
import CanchasInfo from '../components/site/CanchasInfo';
import ComoLlegar from '../components/site/ComoLlegar';
import SiteFooter from '../components/site/SiteFooter';
import { FlechaAbajo } from '../components/site/iconos';
import { hoyISO, proximoDiaHabilitado } from '../lib/fechas';

function irA(id) {
  if (id === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function PublicPage() {
  const [cancha, setCancha] = useState('C1');
  const [fecha, setFecha] = useState(() => proximoDiaHabilitado(hoyISO()));

  const [turnos, setTurnos] = useState([]);
  const [padel, setPadel] = useState(null);
  const [rivales, setRivales] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  const [consultaAbierta, setConsultaAbierta] = useState(false);
  const [mascotaOff, setMascotaOff] = useState(false);
  const [esperaAbierta, setEsperaAbierta] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
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
    cargar();
    return () => { cancelado = true; };
  }, [cancha, fecha, reintento]);

  useEffect(() => {
    api.rivales().then((d) => setRivales(d.rivales)).catch((e) => console.error(e));
  }, []);

  // entrada suave de las secciones
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll('.sitio .reveal'));
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('vista'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('vista'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function recargarTodo() {
    setSlotSeleccionado(null);
    api.rivales().then((d) => setRivales(d.rivales)).catch(() => {});
    if (cancha === 'PAD') {
      api.disponibilidadPadel(fecha).then(setPadel).catch(() => {});
    } else {
      api.disponibilidadFutbol(cancha, fecha).then((d) => setTurnos(d.turnos)).catch(() => {});
    }
  }

  const nombreCancha = CANCHAS.find((c) => c.id === cancha)?.nombre || cancha;

  return (
    <div className="sitio" id="top">
      <SiteNav onIr={irA} onBuscarReserva={() => setConsultaAbierta((v) => !v)} />
      {consultaAbierta && <ConsultaReserva onCerrar={() => setConsultaAbierta(false)} />}

      <Hero onReservar={() => irA('reservar')} />

      {/* ---------- RESERVAR ---------- */}
      <section className="seccion board" id="reservar">
        <div className="envoltura">
          <div className="board-panel">
            <CourtSelector seleccionada={cancha} onSeleccionar={setCancha} />
            <DateStrip seleccionada={fecha} onSeleccionar={setFecha} />

            {cargando && <p className="cargando">Cargando horarios…</p>}
            {errorCarga && (
              <p className="error-msg">
                {errorCarga}{' '}
                <button
                  onClick={() => setReintento((n) => n + 1)}
                  style={{ background: 'none', border: 'none', color: 'var(--s-oro)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
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
                onListaEspera={() => setEsperaAbierta(true)}
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
          </div>

          <div className="board-lado">
            <p className="eyebrow">Reservá online</p>
            <h2>Reservá tu cancha online.</h2>
            <p>Elegís día, horario y cancha, y a jugar.</p>
            <p>Abrimos martes, miércoles y jueves — a partir de las 20 hs.</p>
          </div>
        </div>
      </section>

      {/* ---------- CTA busco rival ---------- */}
      <div className="rival-cta reveal">
        <div className="txt">
          <strong>¿Estás buscando rival?</strong>
          <span>Mirá qué equipos ya reservaron cancha y les falta contra quién jugar.</span>
        </div>
        <button className="btn btn-oro" onClick={() => irA('rival')}>
          Ver equipos <FlechaAbajo />
        </button>
      </div>

      {/* ---------- BUSCO RIVAL ---------- */}
      <section className="seccion busco-rival reveal" id="rival">
        <div className="envoltura">
          <div className="seccion-cab">
            <p className="eyebrow">Busco rival</p>
            <h2>Equipos que buscan partido</h2>
            <p>Ya reservaron su cancha. Escribiles por WhatsApp y coordinen. Para aparecer acá, marcá “Estoy buscando rival” cuando reservás.</p>
          </div>
          <RivalsCalendar rivales={rivales} />
        </div>
      </section>

      <ComoLlegar />
      <Servicios />
      <CanchasInfo onReservar={() => irA('reservar')} />
      <SiteFooter onIr={irA} />

      {slotSeleccionado && <BookingModal slotInfo={slotSeleccionado} onClose={recargarTodo} />}
      {esperaAbierta && <ListaEsperaModal fecha={fecha} onCerrar={() => setEsperaAbierta(false)} />}
      {!mascotaOff && !slotSeleccionado && (
        <MascotaRival onIr={() => { irA('rival'); setMascotaOff(true); }} />
      )}
    </div>
  );
}
