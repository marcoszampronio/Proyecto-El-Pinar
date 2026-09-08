import { WaIcon } from './iconos';

const WA_URL = 'https://wa.me/5493430000000';

const SERVICIOS = [
  {
    titulo: '2 canchas de fútbol 11',
    texto: 'Césped natural bajo iluminación profesional.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3v6" /><circle cx="12" cy="12" r="3" /><path d="M4 21c1.5-4 4-6 8-6s6.5 2 8 6" /><path d="M4 6h4M16 6h4" /></svg>
    ),
  },
  {
    titulo: 'Cancha de pádel',
    texto: 'Paneles de vidrio y luces para jugar de noche, entre los pinos.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="8" r="5" /><path d="M9 13v4M6 21h6M12.5 12.5 20 20" /></svg>
    ),
  },
  {
    titulo: 'Parrilla',
    texto: 'Para el asado después del partido. El tercer tiempo también se juega.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3c1.5 2 2 3.5 1 5s-2 2-1 4 3 2 3 4a4 4 0 0 1-8 0c0-3 2-3.5 2-6 0-2-1-4 1-11Z" /></svg>
    ),
  },
  {
    titulo: 'Cantina',
    texto: 'Bebidas frías y algo para picar antes o después de jugar.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 4h7l1 5c0 2-2 3-4.5 3S6 11 6 9Z" /><path d="M10 15v5M7 21h6M16 5h3a2 2 0 0 1 2 2v3a3 3 0 0 1-3 3h-3" /></svg>
    ),
  },
  {
    titulo: 'Baños y duchas',
    texto: 'Vestuarios con duchas para cambiarte antes de volver a casa.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 4h6a4 4 0 0 1 4 4v2" /><path d="M4 10h14" /><path d="M8 14v.5M11 15v.5M14 14v.5M9 18v.5M13 18v.5" /></svg>
    ),
  },
];

export default function Servicios() {
  return (
    <section className="seccion serv reveal" id="servicios">
      <div className="envoltura">
        <div className="seccion-cab">
          <p className="eyebrow">El complejo</p>
          <h2>Todo para el partido y el after.</h2>
          <p>El Pinar es un predio arbolado en las afueras de Paraná. Venís, jugás, y te quedás al asado.</p>
        </div>

        <div className="serv-grid">
          {SERVICIOS.map((s) => (
            <div className="serv-card" key={s.titulo}>
              <div className="serv-ico">{s.icono}</div>
              <h3>{s.titulo}</h3>
              <p>{s.texto}</p>
            </div>
          ))}

          <div className="serv-card serv-card--cta">
            <div>
              <h3>¿Otra consulta?</h3>
              <p>Contactanos por WhatsApp: disponibilidad, cumpleaños, torneos.</p>
            </div>
            <a className="btn btn-wa" href={WA_URL} target="_blank" rel="noreferrer">
              <WaIcon s={16} /> El Pinar
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
