import { useEffect, useState } from 'react';
import { hoyISO } from '../../lib/fechas';
import { analizar, comparar, parseCsv, rangoSemanas, DIAS_JUEGO, NOMBRE_DIA, TURNOS } from '../../lib/estadisticas';

const corta = (iso) => { const [, m, d] = iso.split('-'); return `${Number(d)}/${Number(m)}`; };

// Una cifra con su comparación contra la semana anterior.
function Cifra({ titulo, valor, sub, actual, anterior, unidad, menosEsMejor }) {
  const c = anterior == null ? null : comparar(actual, anterior, { menosEsMejor });
  const flecha = c ? (c.dif > 0 ? '↑' : c.dif < 0 ? '↓' : '=') : '';
  const cuanto = c ? Math.abs(c.dif) : 0;
  return (
    <div className="est-cifra">
      <span className="est-cifra-tit">{titulo}</span>
      <b className="est-cifra-val">{valor}</b>
      {sub && <span className="est-cifra-sub">{sub}</span>}
      {c && (
        <span className={`est-delta est-delta--${c.tono}`}>
          {c.dif === 0 ? 'Igual que la anterior' : `${flecha} ${cuanto} ${unidad} ${c.dif > 0 ? 'más' : 'menos'} que la anterior`}
        </span>
      )}
    </div>
  );
}

const nivel = (pct) => (pct >= 70 ? 'alto' : pct >= 40 ? 'medio' : 'bajo');

// "Para decidir": cómo vino la semana y qué horarios quedan vacíos. Se calcula con el CSV de reservas.
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

  const [pasada, anterior] = r.semanas;
  const promedio = Math.round(r.semanas.reduce((n, s) => n + s.pct, 0) / r.semanas.length);
  const totalOcupados = r.semanas.reduce((n, s) => n + s.ocupados, 0);
  const pocosDatos = totalOcupados < 12; // con tan pocas reservas, un 0% por horario no dice nada todavía

  return (
    <>
      <section className="stat-card est">
        <h3 className="est-titulo">Semana pasada</h3>
        <p className="est-sub">Del {corta(pasada.desde)} al {corta(pasada.hasta)}, comparada con la anterior.</p>
        {pocosDatos && (
          <p className="est-aviso">Hay muy poco movimiento en las últimas 4 semanas ({totalOcupados} {totalOcupados === 1 ? 'reserva' : 'reservas'} de fútbol en total). Estos números van a servir más cuando haya más reservas.</p>
        )}
        <div className="est-cifras">
          <Cifra titulo="Ocupación de fútbol" valor={`${pasada.pct}%`} sub={`${pasada.ocupados} de ${pasada.posibles} turnos`} actual={pasada.pct} anterior={anterior.pct} unidad="puntos" />
          <Cifra titulo="Cancelaciones" valor={pasada.canceladas} sub="turnos cancelados" actual={pasada.canceladas} anterior={anterior.canceladas} unidad="" menosEsMejor />
          <Cifra titulo="Pádel" valor={pasada.padel} sub={pasada.padel === 1 ? 'reserva' : 'reservas'} actual={pasada.padel} anterior={anterior.padel} unidad="" />
          <Cifra titulo="Promedio" valor={`${promedio}%`} sub="ocupación, últimas 4 semanas" />
        </div>
      </section>

      <section className="stat-card est">
        <h3 className="est-titulo">Qué horarios se llenan</h3>
        <p className="est-sub">Cuántas veces se ocupó cada horario en las últimas 4 semanas (de las dos canchas).</p>

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
    </>
  );
}
