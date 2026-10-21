import { useEffect, useRef, useState } from 'react';
import { WaIcon } from './iconos';
import { WA_URL } from './config';

// Cada instalación puede tener varias fotos. En compu, al pasar el mouse por la tarjeta
// las fotos van rotando; en celular cada foto es una diapositiva del carrusel, con el
// título de la instalación a la que corresponde.
const SERVICIOS = [
  {
    clase: 'serv-card--ancha',
    titulo: 'Canchas de fútbol 11',
    texto: 'Césped natural bajo iluminación profesional.',
    fotos: [
      { src: '/canchas/futbol-2.jpg', alt: 'Cancha de fútbol 11 de Complejo El Pinar, Paraná', pos: 'center 60%' },
      { src: '/canchas/futbol-1.jpg', alt: 'Dos pelotas sobre la línea de la cancha de fútbol 11 de noche, con arcos e iluminación, en Complejo El Pinar, Paraná', pos: 'center 55%' },
    ],
  },
  {
    clase: 'serv-card--ancha',
    titulo: 'Cancha de pádel',
    texto: 'Paneles de vidrio y luces para jugar de noche, entre los pinos.',
    fotos: [{ src: '/canchas/padel.jpg', alt: 'Cancha de pádel de Complejo El Pinar, Paraná', pos: 'center 50%' }],
  },
  {
    titulo: 'Parrilla',
    texto: 'Para el asado después del partido. El tercer tiempo también se juega.',
    fotos: [
      { src: '/canchas/parrillas.jpg', alt: 'Parrilla de hormigón con vista a las canchas de Complejo El Pinar, Paraná', pos: 'center 68%' },
      { src: '/canchas/parrilla-circular.jpg', alt: 'Fogón circular de ladrillo frente a la galería de Complejo El Pinar, Paraná', pos: 'center 58%' },
    ],
  },
  {
    titulo: 'Cantina',
    texto: 'Bebidas frías y algo para picar antes o después de jugar.',
    fotos: [{ src: '/canchas/cantina.jpg', alt: 'Heladeras con bebidas frías en la cantina de Complejo El Pinar, Paraná', pos: 'center 55%' }],
  },
  {
    titulo: 'Quincho',
    texto: 'Galería techada con mesas y parrilla de ladrillo para quedarte sin apuro.',
    fotos: [
      { src: '/canchas/quincho-1.jpg', alt: 'Galería techada con mesas de madera y parrilla de ladrillo en Complejo El Pinar, Paraná', pos: 'center 55%' },
      { src: '/canchas/quincho-2.jpg', alt: 'Galería del quincho entre los eucaliptos de Complejo El Pinar, Paraná', pos: 'center 70%' },
    ],
  },
  {
    clase: 'serv-card--ico',
    titulo: 'Baños y duchas',
    texto: 'Vestuarios con duchas para cambiarte antes de volver a casa.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 4h6a4 4 0 0 1 4 4v2" /><path d="M4 10h14" /><path d="M8 14v.5M11 15v.5M14 14v.5M9 18v.5M13 18v.5" /></svg>
    ),
  },
];

const MQ_MOVIL = '(max-width: 620px)';
const reducirMovimiento = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useMovil() {
  const [movil, setMovil] = useState(() => typeof window !== 'undefined' && window.matchMedia(MQ_MOVIL).matches);
  useEffect(() => {
    const mq = window.matchMedia(MQ_MOVIL);
    const al = () => setMovil(mq.matches);
    mq.addEventListener('change', al);
    return () => mq.removeEventListener('change', al);
  }, []);
  return movil;
}

// Foto de una tarjeta de compu. Con varias fotos, rotan solas mientras el mouse está encima.
function FotosTarjeta({ fotos }) {
  const [i, setI] = useState(0);
  const timer = useRef(null);
  const varias = fotos.length > 1;

  const parar = () => { clearInterval(timer.current); timer.current = null; };
  const empezar = (e) => {
    if (!varias || e.pointerType !== 'mouse' || reducirMovimiento() || timer.current) return;
    setI((n) => (n + 1) % fotos.length); // la segunda foto aparece enseguida, sin esperar
    timer.current = setInterval(() => setI((n) => (n + 1) % fotos.length), 1700);
  };
  const salir = () => { parar(); setI(0); };
  useEffect(() => parar, []);

  return (
    <div className="serv-card-foto" onPointerEnter={empezar} onPointerLeave={salir}>
      {fotos.map((f, k) => (
        <img key={f.src} src={f.src} alt={f.alt} loading="lazy" style={{ objectPosition: f.pos }} className={k === i ? 'on' : ''} />
      ))}
      {varias && (
        <div className="serv-puntos">
          {fotos.map((f, k) => (
            <button
              key={f.src}
              type="button"
              className={k === i ? 'on' : ''}
              aria-label={`Ver foto ${k + 1} de ${fotos.length}`}
              onClick={() => { parar(); setI(k); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const Cta = () => (
  <div className="serv-card serv-card--cta">
    <div>
      <h3>¿Otra consulta?</h3>
      <p>Contactanos por WhatsApp: disponibilidad, cumpleaños, torneos.</p>
    </div>
    <a className="btn btn-wa" href={WA_URL} target="_blank" rel="noreferrer">
      <WaIcon s={16} /> El Pinar
    </a>
  </div>
);

export default function Servicios() {
  const movil = useMovil();
  const carrusel = useRef(null);
  const [activa, setActiva] = useState(0);

  // En celular: una diapositiva por foto, cada una con el título de su instalación.
  const diapositivas = movil
    ? SERVICIOS.flatMap((s) => (s.fotos ? s.fotos.map((f) => ({ s, f })) : [{ s }]))
    : SERVICIOS.map((s) => ({ s }));
  const total = diapositivas.length + (movil ? 1 : 0); // + tarjeta de consulta

  // El carrusel avanza solo cada tanto; se frena un rato si la persona lo toca y cuando no está a la vista.
  useEffect(() => {
    const el = carrusel.current;
    if (!movil || !el) return undefined;
    let visible = false;
    let pausadoHasta = 0;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.5 });
    io.observe(el);
    const pausar = () => { pausadoHasta = Date.now() + 9000; };
    el.addEventListener('pointerdown', pausar);
    el.addEventListener('touchstart', pausar, { passive: true });
    const alScroll = () => {
      const hijos = [...el.children];
      let mejor = 0;
      hijos.forEach((h, k) => { if (Math.abs(h.offsetLeft - el.scrollLeft) < Math.abs(hijos[mejor].offsetLeft - el.scrollLeft)) mejor = k; });
      setActiva(mejor);
    };
    el.addEventListener('scroll', alScroll, { passive: true });
    const t = reducirMovimiento() ? null : setInterval(() => {
      if (!visible || Date.now() < pausadoHasta) return;
      const hijos = [...el.children];
      const actual = hijos.findIndex((h) => h.offsetLeft >= el.scrollLeft - 8);
      const sig = hijos[(Math.max(actual, 0) + 1) % hijos.length];
      el.scrollTo({ left: sig.offsetLeft, behavior: 'smooth' });
    }, 4200);
    return () => {
      io.disconnect();
      clearInterval(t);
      el.removeEventListener('pointerdown', pausar);
      el.removeEventListener('touchstart', pausar);
      el.removeEventListener('scroll', alScroll);
    };
  }, [movil]);

  return (
    <section className="seccion serv reveal" id="servicios">
      <div className="envoltura">
        <div className="seccion-cab">
          <p className="eyebrow">El complejo</p>
          <h2>Todo para el partido y el after.</h2>
          <p>El Pinar es un predio arbolado en las afueras de Paraná. Venís, jugás, y te quedás al asado.</p>
        </div>

        <div className="serv-carrusel">
          <div className="serv-grid" ref={carrusel}>
            {diapositivas.map(({ s, f }) => (
              s.fotos ? (
                <div className={`serv-card serv-card--foto ${s.clase || ''}`} key={f ? f.src : s.titulo}>
                  {movil ? (
                    <div className="serv-card-foto">
                      <img src={f.src} alt={f.alt} loading="lazy" style={{ objectPosition: f.pos }} className="on" />
                    </div>
                  ) : (
                    <FotosTarjeta fotos={s.fotos} />
                  )}
                  <div className="serv-card-body">
                    <h3>{s.titulo}</h3>
                    <p>{s.texto}</p>
                  </div>
                </div>
              ) : (
                <div className={`serv-card ${s.clase || ''}`} key={s.titulo}>
                  <div className="serv-ico">{s.icono}</div>
                  <div className="serv-card-body">
                    <h3>{s.titulo}</h3>
                    <p>{s.texto}</p>
                  </div>
                </div>
              )
            ))}
            <Cta />
          </div>
          {movil && (
            <div className="serv-pasos" aria-hidden="true">
              {Array.from({ length: total }, (_, k) => <span key={k} className={k === activa ? 'on' : ''} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
