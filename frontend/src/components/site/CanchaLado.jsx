// Muestra el deporte elegido con una foto del complejo.
//   variant="card"   -> tarjeta al lado del panel (escritorio)
//   variant="banner" -> banda ancha y baja debajo de los botones (celular)
// posCard / posBanner: object-position (el recorte de la tarjeta es más
// alto que el del banner, así que a veces necesitan foco distinto).

const DATOS = {
  futbol: {
    nombre: 'Fútbol 11',
    alt: 'Cancha de fútbol 11 de césped natural con arcos e iluminación en Complejo El Pinar, Paraná',
    foto: '/canchas/futbol-2.jpg',
    posCard: 'center 66%',
    posBanner: 'center 70%',
    tags: ['Dos canchas', 'Césped natural', 'Iluminación profesional'],
  },
  padel: {
    nombre: 'Pádel',
    alt: 'Cancha de pádel con paneles de vidrio al aire libre en Complejo El Pinar, Paraná',
    foto: '/canchas/padel.jpg',
    posCard: 'center 50%',
    posBanner: 'center 50%',
    tags: ['Paneles de vidrio', 'Luces', 'Al aire libre'],
  },
};

export default function CanchaLado({ deporte = 'futbol', variant = 'card' }) {
  const d = DATOS[deporte] || DATOS.futbol;
  const pos = variant === 'banner' ? d.posBanner : d.posCard;

  const foto = (
    <div className="clado-foto">
      <img src={d.foto} alt={d.alt} style={{ objectPosition: pos }} loading="lazy" />
    </div>
  );

  if (variant === 'banner') {
    return (
      <div className="clado-banner" key={deporte}>
        {foto}
        <div className="clado-banner-cap">
          <p className="clado-banner-titulo">{d.nombre}</p>
          <span>{d.tags[0]}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="clado-wrap">
      <article className="clado-card" key={deporte}>
        {foto}
        <div className="clado-body">
          <h3>{d.nombre}</h3>
          <div className="clado-tags">
            {d.tags.map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>
      </article>
      <p className="clado-nota">Iluminación profesional en las tres canchas. Se juega hasta tarde.</p>
    </div>
  );
}
