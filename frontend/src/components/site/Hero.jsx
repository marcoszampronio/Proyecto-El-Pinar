import { useEffect, useState } from 'react';

const TREE_FAR = "M0 320V150l40-26 34 30 44-46 30 40 40-52 46 44 34-30 40 48 44-40 30 34 46-50 40 44 34-30 44 46 30-40 40 48 46-42 34 34 40-48 44 42 30-34 46 46 40-40 34 34 44-48 30 42 40-38 46 44 34-34 40 44 44-42 30 36 40-46 46 46 34-34 40 44 44-40 30 36 40-46 46 42 34-32 40 44 44-42 30 34 40-44 46 46 34-34 40 42 44-40 30 34V320Z";
const TREE_NEAR = "M0 300V120l50 40 30-56 44 60 34-44 46 66 40-40 34 52 44-58 50 62 30-44 46 60 40-52 34 56 44-44 50 60 30-52 46 58 40-40 34 54 44-60 50 62 30-44 46 58 40-52 34 56 44-46 50 60 30-50 46 58 40-42 34 54 44-58 50 60 30-46 46 58 40-50 34 54 44-44 50 58 30-52 46 60 40-42 34 52 44-56 50 60 30-46 46 56V300Z";

export default function Hero({ onReservar }) {
  const [esc, setEsc] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const iv = setInterval(() => setEsc((i) => (i + 1) % 3), 5500);
    return () => clearInterval(iv);
  }, []);

  return (
    <section className="hero">
      <div className="hero-esc" aria-hidden="true">
        <div className={`escena escena--1 ${esc === 0 ? 'escena--on' : ''}`} />
        <div className={`escena escena--2 ${esc === 1 ? 'escena--on' : ''}`} />
        <div className={`escena escena--3 ${esc === 2 ? 'escena--on' : ''}`} />
      </div>

      <svg className="hero-tree hero-tree--far" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d={TREE_FAR} />
      </svg>
      <svg className="hero-tree hero-tree--near" viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d={TREE_NEAR} />
        <g fill="currentColor">
          <path d="M180 300 195 250 187 250 200 220 192 220 206 190 220 220 212 220 225 250 217 250 232 300Z" />
          <path d="M620 300 636 244 627 244 641 212 632 212 647 180 662 212 653 212 668 244 659 244 675 300Z" />
          <path d="M1050 300 1064 252 1056 252 1069 224 1061 224 1074 196 1088 224 1080 224 1093 252 1085 252 1100 300Z" />
        </g>
      </svg>
      <div className="hero-vin" />

      <div className="envoltura hero-in">
        <p className="eyebrow">Complejo deportivo · Paraná, Entre Ríos</p>
        <h1>El Pinar</h1>
        <p className="hero-sub">
          Canchas de fútbol 11 con iluminación profesional, pádel con paneles de vidrio y parrilla para el asado post partido.
        </p>
        <p className="hero-firma">Todo entre pinos.</p>
        <div className="hero-baja">
          <button className="btn btn-oro" onClick={onReservar}>Reservar turno</button>
        </div>
      </div>
    </section>
  );
}
