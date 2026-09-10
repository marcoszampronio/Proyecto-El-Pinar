import { hhmm } from '../lib/fechas';

// Grilla pública de fútbol: Cancha 1 y Cancha 2 en columnas, turnos en filas.
// - Celda "Libre": tocás y abre la reserva de esa cancha + turno.
// - Celda "Reservado": oscura, no se toca.
// - Celda "Reservado" + busca rival: muestra el equipo; tocás y abre su info.
//
// c1 / c2 : [{ turn, start, end, status }]
// rivales : lista de api.rivales() (equipos que buscan rival, confirmados)
export default function FutbolGrilla({ c1, c2, fecha, rivales, onReservar, onVerRival, onListaEspera }) {
  const turnos = c1 || [];

  // index de "busca rival" para este día: "C1|20:30" -> rival
  const idxRival = {};
  for (const r of rivales || []) {
    if (r.reservation_date !== fecha) continue;
    idxRival[`${r.court}|${hhmm(r.start_time)}`] = r;
  }

  return (
    <>
      <div className="grilla-pub">
        <div className="grilla-pub-esq" aria-hidden="true" />
        <div className="grilla-pub-cab">Cancha 1</div>
        <div className="grilla-pub-cab">Cancha 2</div>

        {turnos.map((t, i) => (
          <div className="grilla-pub-fila" key={t.turn} style={{ display: 'contents' }}>
            <div className="grilla-pub-hora">
              {hhmm(t.start)}<span>{hhmm(t.end)}</span>
            </div>
            {[['C1', c1[i]], ['C2', c2[i]]].map(([court, slot]) => {
              const libre = slot && slot.status === 'libre';
              const rival = !libre ? idxRival[`${court}|${hhmm(t.start)}`] : null;
              const clase = libre ? 'libre' : rival ? 'rival' : 'ocupado';
              return (
                <button
                  key={court}
                  className={`grilla-pub-celda ${clase}`}
                  disabled={!libre && !rival}
                  onClick={() => {
                    if (libre) onReservar(court, t.turn);
                    else if (rival) onVerRival(rival);
                  }}
                  aria-label={
                    libre
                      ? `Cancha ${court === 'C1' ? 1 : 2}, ${hhmm(t.start)} a ${hhmm(t.end)}: libre, tocá para reservar`
                      : rival
                      ? `Cancha ${court === 'C1' ? 1 : 2}, ${hhmm(t.start)}: reservado por ${rival.team_name}, busca rival`
                      : `Cancha ${court === 'C1' ? 1 : 2}, ${hhmm(t.start)}: reservado`
                  }
                >
                  {libre && 'Libre'}
                  {!libre && !rival && 'Reservado'}
                  {rival && (
                    <>
                      <span className="gp-rival-top">Reservado</span>
                      <span className="gp-rival-mid">
                        <span className="gp-rival-eq">{rival.team_name}</span>
                        {rival.category && <span className="gp-rival-cat">{rival.category}</span>}
                      </span>
                      <span className="gp-rival-sub"><span className="gp-pelota" aria-hidden="true">⚽</span> Busca rival</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {onListaEspera && (
        <div className="espera-cta">
          <button className="btn btn-espera" onClick={onListaEspera}>
            Lista de espera
          </button>
          <p className="espera-nota">Te avisamos si se libera un turno para este día.</p>
        </div>
      )}
    </>
  );
}
