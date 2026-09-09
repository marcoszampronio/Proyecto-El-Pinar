// Muestra la cancha seleccionada. La foto cambia según la cancha elegida
// en el CourtSelector.
//   variant="card"   -> tarjeta al lado del panel (escritorio)
//   variant="banner" -> banda ancha y baja debajo de los botones (celular)
// posCard / posBanner: object-position (el recorte de la tarjeta es más
// alto que el del banner, así que a veces necesitan foco distinto).

const DATOS = {
  C1: {
    nombre: 'Cancha 1',
    foto: '/canchas/futbol-1.jpg',
    posCard: 'center 42%',
    posBanner: 'center 62%',
    tags: ['Fútbol 11', 'Césped natural', 'Iluminación pro'],
  },
  C2: {
    nombre: 'Cancha 2',
    foto: '/canchas/futbol-2.jpg',
    posCard: 'center 66%',
    posBanner: 'center 70%',
    tags: ['Fútbol 11', 'Césped natural', 'Iluminación pro'],
  },
  PAD: {
    nombre: 'Pádel',
    foto: '/canchas/padel.jpg',
    posCard: 'center 50%',
    posBanner: 'center 50%',
    tags: ['Paneles de vidrio', 'Luces', 'Al aire libre'],
  },
};

export default function CanchaLado({ cancha, variant = 'card' }) {
  const d = DATOS[cancha] || DATOS.C1;
  const pos = variant === 'banner' ? d.posBanner : d.posCard;

  const foto = (
    <div className="clado-foto">
      <img src={d.foto} alt={`Cancha del complejo: ${d.nombre}`} style={{ objectPosition: pos }} loading="lazy" />
    </div>
  );

  if (variant === 'banner') {
    return (
      <div className="clado-banner" key={cancha}>
        {foto}
        <div className="clado-banner-cap">
          <h3>{d.nombre}</h3>
          <span>{d.tags[0]}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="clado-wrap">
      <article className="clado-card" key={cancha}>
        {foto}
        <div className="clado-body">
          <h3>{d.nombre}</h3>
          <div className="clado-tags">
            {d.tags.map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>
      </article>
      <p className="clado-nota">Iluminación profesional en las tres. Se juega hasta tarde.</p>
    </div>
  );
}
