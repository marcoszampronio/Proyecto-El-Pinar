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
      <Anfitrion />
    </button>
  );
}

// Personaje genérico "el anfitrión del complejo": traje, brindando con una copa.
function Anfitrion() {
  return (
    <svg className="mascota-svg" viewBox="0 0 100 122" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* piernas del pantalón */}
      <rect x="39" y="98" width="9" height="18" rx="3" fill="#2b3a4a" />
      <rect x="52" y="98" width="9" height="18" rx="3" fill="#2b3a4a" />
      <ellipse cx="41" cy="117" rx="7" ry="3.5" fill="#111" />
      <ellipse cx="59" cy="117" rx="7" ry="3.5" fill="#111" />

      {/* saco */}
      <path d="M30 72 Q30 66 36 65 L64 65 Q70 66 70 72 L70 100 Q50 105 30 100 Z" fill="#1c2e44" />
      {/* camisa + corbata */}
      <path d="M44 65 L50 78 L56 65 Z" fill="#fff" />
      <path d="M49 68 L51 68 L52.5 82 L50 86 L47.5 82 Z" fill="#C09A46" />
      {/* solapas */}
      <path d="M44 65 L38 84 L43 70 Z" fill="#16273a" />
      <path d="M56 65 L62 84 L57 70 Z" fill="#16273a" />

      {/* brazo izquierdo pegado al cuerpo */}
      <rect x="24" y="70" width="9" height="22" rx="4" fill="#1c2e44" />
      {/* brazo derecho levantado sosteniendo la copa */}
      <path d="M67 74 Q80 68 82 52" stroke="#1c2e44" strokeWidth="9" fill="none" strokeLinecap="round" />

      {/* copa tipo flauta con champagne */}
      <path d="M78 34 L86 34 L84.5 44 Q82 46 79.5 44 Z" fill="#ffe9a8" />
      <path d="M78 34 L86 34 L85.4 30 Q82 28.5 78.6 30 Z" fill="#fff4cf" opacity="0.9" />
      <rect x="81.4" y="44" width="1.4" height="8" fill="#cfd6dc" />
      <ellipse cx="82" cy="53" rx="5" ry="1.6" fill="#cfd6dc" />
      {/* burbujitas */}
      <circle cx="81" cy="40" r="0.8" fill="#fff" />
      <circle cx="83.4" cy="42" r="0.7" fill="#fff" />

      {/* cabeza grande */}
      <circle cx="50" cy="40" r="31" fill="#f2cfa8" />
      <circle cx="20" cy="42" r="4.5" fill="#eac59d" />
      <circle cx="80" cy="42" r="4.5" fill="#eac59d" />
      {/* pelo canoso corto */}
      <path d="M21 40 Q22 12 50 12 Q78 12 79 40 Q72 26 50 26 Q28 26 21 40 Z" fill="#9aa1a6" />
      {/* cejas + ojos */}
      <rect x="35" y="37" width="9" height="2.4" rx="1" fill="#6b6f73" />
      <rect x="56" y="37" width="9" height="2.4" rx="1" fill="#6b6f73" />
      <circle cx="40" cy="43" r="3.4" fill="#222" />
      <circle cx="60" cy="43" r="3.4" fill="#222" />
      {/* sonrisa pícara */}
      <path d="M41 55 Q50 63 59 55" stroke="#8a5a36" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
