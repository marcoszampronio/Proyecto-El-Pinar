import { hhmm, fechaLargaCompleta } from '../lib/fechas';

// Agrupa la lista de "busco rival" por fecha y la muestra como semana.
export default function RivalsCalendar({ rivales }) {
  if (!rivales || rivales.length === 0) {
    return (
      <p style={{ padding: '8px 20px', color: 'var(--muted)', fontSize: 14 }}>
        No hay equipos buscando rival por ahora.
      </p>
    );
  }

  const porDia = {};
  for (const r of rivales) {
    (porDia[r.reservation_date] = porDia[r.reservation_date] || []).push(r);
  }
  const fechas = Object.keys(porDia).sort();

  return (
    <div className="rivales-lista">
      {fechas.map((fecha) => {
        const titulo = fechaLargaCompleta(fecha);
        return (
        <div key={fecha} className="rivales-dia">
          <h3 className="rivales-dia-titulo">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h3>
          {porDia[fecha].map((r, i) => (
            <RivalCard key={`${fecha}-${i}`} r={r} />
          ))}
        </div>
        );
      })}
    </div>
  );
}

function RivalCard({ r }) {
  const nombre = r.team_name || 'Equipo';
  return (
    <div className="rival-card">
      <div className="rival-card-top">
        <span className="rival-card-cancha">{r.canchaNombre || r.court}</span>
        <span className="rival-card-hora">{hhmm(r.start_time)}–{hhmm(r.end_time)}</span>
      </div>
      <div className="rival-card-equipo">
        <strong>{nombre}</strong>
        {r.category ? <span className="rival-card-cat"> — {r.category}</span> : null}
      </div>
      {r.linkWhatsapp ? (
        <a className="btn btn-gold rival-card-wa" href={r.linkWhatsapp} target="_blank" rel="noreferrer">
          Escribir por WhatsApp
        </a>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>Sin número de contacto</span>
      )}
    </div>
  );
}
