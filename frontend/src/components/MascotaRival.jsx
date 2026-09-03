import { useEffect, useState } from 'react';

// Jugadorcito cabezón que invita a la sección "Busco rival".
// Aparece a los 5 s, dura 5 s y vuelve cada 30 s (hasta que lo tocan).
export default function MascotaRival({ onIr }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showT, hideT, iv;
    const ciclo = () => {
      setVisible(true);
      hideT = setTimeout(() => setVisible(false), 5000);
    };
    showT = setTimeout(() => {
      ciclo();
      iv = setInterval(ciclo, 30000);
    }, 5000);
    return () => {
      clearTimeout(showT);
      clearTimeout(hideT);
      clearInterval(iv);
    };
  }, []);

  return (
    <button
      className={`mascota ${visible ? 'mascota--on' : ''}`}
      onClick={onIr}
      aria-label="Ir a Busco rival"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <span className="mascota-globo">¿Buscás rival?</span>
      <Jugador />
    </button>
  );
}

function Jugador() {
  return (
    <svg className="mascota-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* piernas */}
      <rect x="38" y="96" width="9" height="18" rx="4" fill="#2b2b2b" />
      <rect x="53" y="96" width="9" height="18" rx="4" fill="#2b2b2b" />
      {/* zapatillas */}
      <ellipse cx="40" cy="115" rx="8" ry="4" fill="#111" />
      <ellipse cx="60" cy="115" rx="8" ry="4" fill="#111" />
      {/* cuerpo: camiseta a rayas celeste/blanco */}
      <g>
        <rect x="30" y="70" width="40" height="30" rx="8" fill="#fff" />
        <rect x="34" y="70" width="6" height="30" fill="#6cb6e6" />
        <rect x="47" y="70" width="6" height="30" fill="#6cb6e6" />
        <rect x="60" y="70" width="6" height="30" fill="#6cb6e6" />
        {/* brazos */}
        <rect x="22" y="72" width="10" height="20" rx="5" fill="#f0c9a0" />
        <rect x="68" y="60" width="10" height="20" rx="5" fill="#f0c9a0" transform="rotate(20 73 70)" />
        <text x="50" y="92" textAnchor="middle" fontSize="15" fontWeight="800" fill="#123C6E" fontFamily="Arial, sans-serif">10</text>
      </g>
      {/* cabeza grande */}
      <circle cx="50" cy="40" r="32" fill="#f6d0a8" />
      {/* pelo */}
      <path d="M20 38 Q22 8 50 8 Q78 8 80 38 Q70 22 50 22 Q30 22 20 38 Z" fill="#3a2a1c" />
      {/* orejas */}
      <circle cx="19" cy="42" r="5" fill="#f0c9a0" />
      <circle cx="81" cy="42" r="5" fill="#f0c9a0" />
      {/* ojos */}
      <circle cx="40" cy="42" r="4" fill="#222" />
      <circle cx="60" cy="42" r="4" fill="#222" />
      {/* barbita */}
      <path d="M36 56 Q50 70 64 56 Q60 64 50 66 Q40 64 36 56 Z" fill="#3a2a1c" />
      {/* sonrisa */}
      <path d="M42 56 Q50 62 58 56" stroke="#7a4a2a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* pelotita */}
      <circle cx="82" cy="100" r="9" fill="#fff" stroke="#123C6E" strokeWidth="1.5" />
      <path d="M82 93 l4 5 -2 6 -4 0 -2 -6 z" fill="#123C6E" />
    </svg>
  );
}
