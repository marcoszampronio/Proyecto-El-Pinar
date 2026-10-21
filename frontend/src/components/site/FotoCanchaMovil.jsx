// Foto de la cancha del deporte elegido, debajo del texto de "Reservá online".
// Solo se ve en celular (ver .foto-cancha-movil en styles.css): en compu ya está
// la tarjeta de foto de CanchaLado, no hace falta repetir. El mapa con Cancha 1 /
// Cancha 2 vive en el modal de "Solicitar turno" (MapaCanchaElegida).
const FOTOS = {
  futbol: {
    src: '/canchas/futbol-2.jpg',
    alt: 'Cancha de fútbol 11 de césped natural con iluminación en Complejo El Pinar, Paraná',
    pos: 'center 66%',
    datos: ['Césped natural', 'Con iluminación', '2 canchas'],
  },
  padel: {
    src: '/canchas/padel.jpg',
    alt: 'Cancha de pádel con paneles de vidrio al aire libre en Complejo El Pinar, Paraná',
    pos: 'center 50%',
    datos: ['Paneles de vidrio', 'Con iluminación', 'Entre los pinos'],
  },
};

export default function FotoCanchaMovil({ deporte = 'futbol' }) {
  const f = FOTOS[deporte] || FOTOS.futbol;
  return (
    <div className="foto-cancha-movil">
      <img src={f.src} alt={f.alt} style={{ objectPosition: f.pos }} loading="lazy" />
      <ul className="foto-cancha-datos">{f.datos.map((d) => <li key={d}>{d}</li>)}</ul>
    </div>
  );
}
