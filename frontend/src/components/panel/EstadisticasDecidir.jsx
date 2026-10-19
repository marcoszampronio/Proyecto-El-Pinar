import { useEffect, useState } from 'react';
import { hoyISO } from '../../lib/fechas';
import { analizar, parseCsv, rangoSemanas, DIAS_JUEGO, NOMBRE_DIA, TURNOS } from '../../lib/estadisticas';

const nivel = (pct) => (pct >= 70 ? 'alto' : pct >= 40 ? 'medio' : 'bajo');

// "Qué horarios se llenan": mapa día × horario de las últimas 4 semanas, calculado con el CSV de reservas.
export default function EstadisticasDecidir({ cargarCsv }) {
  const [r, setR] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    const hoy = hoyISO();
    const rangos = rangoSemanas(hoy);
    cargarCsv(rangos[rangos.length - 1].desde, rangos[0].hasta)
      .then((texto) => vivo && setR(analizar(parseCsv(texto), hoy)))
      .catch((e) => vivo && setError(e.message));
    return () => { vivo = false; };
    // eslint-disable-next-line
  }, []);

  if (error) return <div className="stat-card"><p className="error-msg">No se pudieron calcular las estadísticas: {error}</p></div>;
  if (!r) return <div className="stat-card"><p className="est-cargando">Calculando las últimas semanas…</p></div>;

  const totalOcupados = r.semanas.reduce((n, s) => n + s.ocupados, 0);
  const pocosDatos = totalOcupados < 12; // con tan pocas reservas, un 0% por horario no dice nada todavía

  return (
    <section className="stat-card est">
      <h3 className="est-titulo">Qué horarios se llenan</h3>
      <p className="est-sub">Cuántas veces se ocupó cada horario en las últimas 4 semanas (de las dos canchas).</p>
      {pocosDatos && (
        <p className="est-aviso">Hay muy poco movimiento en las últimas 4 semanas ({totalOcupados} {totalOcupados === 1 ? 'reserva' : 'reservas'} de fútbol en total). Estos números van a servir más cuando haya más reservas.</p>
      )}

      <div className="est-mapa" role="table" aria-label="Ocupación por día y horario">
        <span />
        {DIAS_JUEGO.map((d) => <span key={d} className="est-mapa-dia" role="columnheader">{NOMBRE_DIA[d].slice(0, 3)}</span>)}
        {TURNOS.map((t) => (
          <div className="est-mapa-fila" key={t.id} role="row">
            <span className="est-mapa-hora" role="rowheader">{t.hora}</span>
            {DIAS_JUEGO.map((d) => {
              const c = r.mapa.find((x) => x.dow === d && x.turno === t.id);
              return (
                <span key={d} className={`est-celda est-celda--${nivel(c.pct)}`} role="cell" aria-label={`${NOMBRE_DIA[d]} ${t.hora}: ${c.ocupados} de ${c.posibles}, ${c.pct}%`}>
                  <b>{c.pct}%</b>
                  <small>{c.ocupados} de {c.posibles}</small>
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div className="est-leyenda" aria-hidden="true">
        <span><i className="est-punto est-punto--alto" />Se llena</span>
        <span><i className="est-punto est-punto--medio" />A veces</span>
        <span><i className="est-punto est-punto--bajo" />Queda vacío</span>
      </div>

      {!pocosDatos && (r.flojos.length > 0 || r.llenos.length > 0) && (
        <ul className="est-lectura">
          {r.flojos.map((c) => (
            <li key={`f${c.dow}${c.turno}`} className="est-lectura--flojo">
              <b>{NOMBRE_DIA[c.dow]} {c.hora}</b> se ocupó {c.ocupados} de {c.posibles} veces. Ahí conviene una promo o avisarle a la lista de espera.
            </li>
          ))}
          {r.llenos.map((c) => (
            <li key={`l${c.dow}${c.turno}`} className="est-lectura--lleno">
              <b>{NOMBRE_DIA[c.dow]} {c.hora}</b> casi siempre está lleno ({c.ocupados} de {c.posibles}). Hay demanda en ese horario.
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
