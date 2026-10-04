// Mapa ilustrado del complejo para el modal "Solicitar turno" de fútbol.
// Marca la cancha elegida con cuatro esquinas doradas (tipo visor de cámara),
// apaga la otra cancha y pone una etiqueta "Tu cancha" encima del nombre
// dibujado en la imagen.
//
// Las coordenadas son píxeles de la imagen original (1024 x 506), por eso el
// SVG usa ese mismo viewBox y se estira junto con la imagen.
const CANCHAS = {
  C1: {
    nombre: 'Cancha 1',
    puntos: [[410, 75], [636, 108], [548, 386], [318, 346]],
    etiqueta: { left: '45.5%', top: '47%' }, // top = borde de ABAJO de la etiqueta, justo sobre "CANCHA 1"
  },
  C2: {
    nombre: 'Cancha 2',
    puntos: [[722, 130], [938, 166], [852, 440], [624, 402]],
    etiqueta: { left: '75%', top: '57%' }, // idem, sobre "CANCHA 2"
  },
};

const LARGO_ESQUINA = 0.2; // fracción de cada lado que ocupa cada esquina

function esquinas(puntos) {
  return puntos.map((p, i) => {
    const antes = puntos[(i + puntos.length - 1) % puntos.length];
    const despues = puntos[(i + 1) % puntos.length];
    const haciaAntes = [p[0] + (antes[0] - p[0]) * LARGO_ESQUINA, p[1] + (antes[1] - p[1]) * LARGO_ESQUINA];
    const haciaDespues = [p[0] + (despues[0] - p[0]) * LARGO_ESQUINA, p[1] + (despues[1] - p[1]) * LARGO_ESQUINA];
    return `${haciaAntes.join(',')} ${p.join(',')} ${haciaDespues.join(',')}`;
  });
}

export default function MapaCanchaElegida({ court }) {
  const elegida = CANCHAS[court];
  const otra = CANCHAS[court === 'C1' ? 'C2' : 'C1'];
  if (!elegida) return null;

  return (
    <div className="modal-foto modal-foto-mapa">
      <img
        src="/mapa-complejo.webp"
        alt={`Mapa del complejo: ${elegida.nombre} marcada como tu cancha`}
      />
      <svg viewBox="0 0 1024 506" preserveAspectRatio="none" aria-hidden="true">
        <polygon points={otra.puntos.map((p) => p.join(',')).join(' ')} className="mapa-apagada" />
        {esquinas(elegida.puntos).map((pts) => (
          <polyline key={pts} points={pts} className="mapa-esquina" />
        ))}
      </svg>
      <span className="mapa-tucancha" style={elegida.etiqueta}>
        <i aria-hidden="true">✓</i>Tu cancha
      </span>
    </div>
  );
}
