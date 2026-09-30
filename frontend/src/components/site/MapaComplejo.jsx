// Mapa ilustrado del complejo (pádel, cantina, cancha 1 y 2) para celular,
// debajo del texto de "Abrimos martes, miércoles y jueves...". Solo mobile,
// ver .mapa-complejo en styles.css.

const LUGARES = [
  { nombre: 'Pádel', left: '22%', top: '33%' },
  { nombre: 'Cantina', left: '27%', top: '58%' },
  { nombre: 'Cancha 1', left: '40%', top: '46%', grande: true },
  { nombre: 'Cancha 2', left: '78%', top: '46%', grande: true },
];

export default function MapaComplejo() {
  return (
    <div className="mapa-complejo">
      <img src="/mapa-complejo.webp" alt="Mapa del complejo: pádel, cantina y las dos canchas de fútbol 11" loading="lazy" />
      {LUGARES.map((l) => (
        <span
          key={l.nombre}
          className={`mapa-complejo-tag${l.grande ? ' mapa-complejo-tag--grande' : ''}`}
          style={{ left: l.left, top: l.top }}
        >
          {l.nombre}
        </span>
      ))}
    </div>
  );
}
