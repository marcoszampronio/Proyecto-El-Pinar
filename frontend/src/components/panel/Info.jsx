import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Botón (i) que abre una "nube" con una explicación. Sirve para sacar de la pantalla los textos largos
// de ayuda y que solo se vean cuando alguien los necesita. Se cierra al tocar afuera, con Esc o volviendo a tocar la (i).
// La nube se corre sola hacia la izquierda si no entra en la pantalla.
export default function Info({ children, etiqueta = 'Más información' }) {
  const [abierto, setAbierto] = useState(false);
  const [corrida, setCorrida] = useState(0);
  const caja = useRef(null);
  const nube = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const afuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false); };
    const esc = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('pointerdown', afuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', afuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);

  // al abrir: medir y, si se sale por la derecha, correrla; nunca más allá del borde izquierdo
  useLayoutEffect(() => {
    if (!abierto || !nube.current) { setCorrida(0); return; }
    const margen = 12;
    const el = nube.current;
    el.style.left = '0px';
    const r = el.getBoundingClientRect();
    let c = 0;
    if (r.right > document.documentElement.clientWidth - margen) c = r.right - (document.documentElement.clientWidth - margen);
    if (r.left - c < margen) c = r.left - margen;
    setCorrida(Math.max(c, 0) * -1);
  }, [abierto]);

  return (
    <span className="info" ref={caja}>
      <button type="button" className={`est-info ${abierto ? 'abierto' : ''}`} aria-label={etiqueta} aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        i
      </button>
      {abierto && <span ref={nube} className="est-nube info-nube" role="note" style={{ left: corrida }}>{children}</span>}
    </span>
  );
}
