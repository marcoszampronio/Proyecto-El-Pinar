const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel' };

export default function RivalsBoard({ rivales }) {
  if (!rivales.length) {
    return (
      <div className="rivals-list">
        <p style={{ color: '#5C6B60', fontStyle: 'italic' }}>
          No hay equipos buscando rival por ahora.
        </p>
      </div>
    );
  }

  return (
    <div className="rivals-list">
      {rivales.map((r, i) => (
        <div className="rival-card" key={i}>
          <h4>{r.team_name} {r.category ? `· ${r.category}` : ''}</h4>
          <p>{NOMBRE_CANCHA[r.court]} — {r.reservation_date} de {r.start_time.slice(0, 5)} a {r.end_time.slice(0, 5)}</p>
          <a
            className="btn btn-ghost"
            style={{ display: 'inline-block', marginTop: 8, textDecoration: 'none', textAlign: 'center' }}
            href={`https://wa.me/${r.contact_phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
          >
            Contactar por WhatsApp
          </a>
        </div>
      ))}
    </div>
  );
}
