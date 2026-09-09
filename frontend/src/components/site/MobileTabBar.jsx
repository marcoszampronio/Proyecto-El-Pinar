import { useEffect, useState } from 'react';
import { IconReservar, IconRival, MapaPin, IconComplejo } from './iconos';

const ITEMS = [
  { id: 'reservar', label: 'Reservar', Icon: IconReservar },
  { id: 'rival', label: 'Busco rival', Icon: IconRival },
  { id: 'llegar', label: 'Cómo llegar', Icon: MapaPin },
  { id: 'servicios', label: 'El complejo', Icon: IconComplejo },
];

// Barra fija abajo para celular: reemplaza al menú hamburguesa.
// Un toque = ir a la sección. Resalta la sección que estás mirando.
export default function MobileTabBar({ onIr }) {
  const [activa, setActiva] = useState('reservar');

  useEffect(() => {
    const secciones = ITEMS
      .map((i) => document.getElementById(i.id))
      .filter(Boolean);
    if (!('IntersectionObserver' in window) || secciones.length === 0) return;

    const obs = new IntersectionObserver(
      (entradas) => {
        const visible = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiva(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
    );
    secciones.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <nav className="mtab" aria-label="Secciones">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={activa === id ? 'on' : ''}
          onClick={() => onIr(id)}
          aria-current={activa === id ? 'true' : undefined}
        >
          <Icon s={21} />
          {label}
        </button>
      ))}
    </nav>
  );
}
