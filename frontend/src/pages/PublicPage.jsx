import { useEffect, useState } from 'react';
import { api } from '../api';
import DeporteSelector from '../components/DeporteSelector';
import DateStrip from '../components/DateStrip';
import FutbolGrilla from '../components/FutbolGrilla';
import PadelPicker from '../components/PadelPicker';
import RivalsCalendar from '../components/RivalsCalendar';
import RivalInfoModal from '../components/RivalInfoModal';
import BookingModal from '../components/BookingModal';
import ConsultaReserva from '../components/ConsultaReserva';
import ListaEsperaModal from '../components/ListaEsperaModal';
import MascotaRival from '../components/MascotaRival';
import SiteNav from '../components/site/SiteNav';
import Hero from '../components/site/Hero';
import Servicios from '../components/site/Servicios';
import CanchaLado from '../components/site/CanchaLado';
import ComoLlegar from '../components/site/ComoLlegar';
import SiteFooter from '../components/site/SiteFooter';
import MobileTabBar from '../components/site/MobileTabBar';
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
  const [deporte, setDeporte] = useState('futbol');
  const [fecha, setFecha] = useState(() => proximoDiaHabilitado(hoyISO()));

  const [futbol, setFutbol] = useState(null); // { C1: [...turnos], C2: [...turnos] }
  const [padel, setPadel] = useState(null);
  const [rivales, setRivales] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  const [consultaAbierta, setConsultaAbierta] = useState(false);
  const [mascotaOff, setMascotaOff] = useState(false);
  const [esperaAbierta, setEsperaAbierta] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [rivalVisto, setRivalVisto] = useState(null);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setErrorCarga(null);
      try {
        if (deporte === 'padel') {
          const data = await api.disponibilidadPadel(fecha);
          if (!cancelado) setPadel(data);
        } else {
          const [c1, c2] = await Promise.all([
            api.disponibilidadFutbol('C1', fecha),
            api.disponibilidadFutbol('C2', fecha),
          ]);
          if (!cancelado) setFutbol({ C1: c1.turnos, C2: c2.turnos });
        }
      } catch (e) {
        if (!cancelado) setErrorCarga(e.message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    return () => { cancelado = true; };
  }, [deporte, fecha, reintento]);

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
    if (deporte === 'padel') {
      api.disponibilidadPadel(fecha).then(setPadel).catch(() => {});
    } else {
      Promise.all([
        api.disponibilidadFutbol('C1', fecha),
        api.disponibilidadFutbol('C2', fecha),
      ]).then(([c1, c2]) => setFutbol({ C1: c1.turnos, C2: c2.turnos })).catch(() => {});
    }
  }

  return (
    <div className="sitio" id="top">
      <SiteNav onIr={irA} />
      {/* "Mi reserva" (consulta pública) desactivada por ahora — sin disparadores en la UI */}
      {consultaAbierta && <ConsultaReserva onCerrar={() => setConsultaAbierta(false)} />}

      <Hero onReservar={() => irA('reservar')} />

      {/* ---------- RESERVAR ---------- */}
      <section className="seccion board" id="reservar">
        <div className="envoltura board-cols">
          <div className="board-panel">
            <DeporteSelector seleccionado={deporte} onSeleccionar={setDeporte} />
            <CanchaLado deporte={deporte} variant="banner" />
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

            {!cargando && !errorCarga && deporte === 'futbol' && futbol && (
              <FutbolGrilla
                key={fecha}
                c1={futbol.C1}
                c2={futbol.C2}
                fecha={fecha}
                rivales={rivales}
                onReservar={(court, turn, start, end) => setSlotSeleccionado({ court, date: fecha, turn, start, end })}
                onVerRival={setRivalVisto}
                onListaEspera={() => setEsperaAbierta(true)}
              />
            )}
            {!cargando && !errorCarga && deporte === 'padel' && padel && (
              <PadelPicker
                key={fecha}
                apertura={padel.apertura}
                cierre={padel.cierre}
                ocupados={padel.ocupados}
                onReservar={(rango) => setSlotSeleccionado({ court: 'PAD', date: fecha, ...rango })}
              />
            )}
          </div>

          <aside className="board-lado">
            <div className="board-intro">
              <p className="eyebrow">Reservá online</p>
              <h2>Tres canchas, un pinar.<br />Reservá tu cancha online.</h2>
              <p>Elegís día, horario y cancha, y a jugar.</p>
              <p>Abrimos martes, miércoles y jueves — a partir de las 20 hs.</p>
            </div>
            <CanchaLado deporte={deporte} />
          </aside>
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
      <SiteFooter onIr={irA} />

      <MobileTabBar onIr={irA} />

      {slotSeleccionado && <BookingModal slotInfo={slotSeleccionado} onClose={recargarTodo} />}
      {rivalVisto && <RivalInfoModal rival={rivalVisto} onCerrar={() => setRivalVisto(null)} />}
      {esperaAbierta && <ListaEsperaModal fecha={fecha} onCerrar={() => setEsperaAbierta(false)} />}
      {!mascotaOff && !slotSeleccionado && (
        <MascotaRival onIr={() => { irA('rival'); setMascotaOff(true); }} />
      )}
    </div>
  );
}
