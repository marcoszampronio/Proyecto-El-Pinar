import { useEffect, useRef, useState } from 'react';
import { hoyISO } from '../../lib/fechas';
import { analizar, parseCsv, rangoSemanas, DIAS_JUEGO, NOMBRE_DIA, TURNOS } from '../../lib/estadisticas';

const nivel = (pct) => (pct >= 70 ? 'alto' : pct >= 40 ? 'medio' : 'bajo');

// "Qué horarios se llenan": mapa día × horario de las últimas 4 semanas, calculado con el CSV de reservas.
// La explicación y el resumen están en una "nube" que se abre con el botón (i); tocar un casillero muestra
// el desglose por cancha.
export default function EstadisticasDecidir({ cargarCsv }) {
  const [r, setR] = useState(null);
  const [error, setError] = useState(null);
  const [nube, setNube] = useState(null); // null | { tipo: 'ayuda' } | { tipo: 'celda', dow, turno }
  const caja = useRef(null);

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

  // la nube se cierra al tocar afuera o con Esc
  useEffect(() => {
    if (!nube) return undefined;
    const afuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setNube(null); };
    const esc = (e) => { if (e.key === 'Escape') setNube(null); };
    document.addEventListener('pointerdown', afuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', afuera); document.removeEventListener('keydown', esc); };
  }, [nube]);

  if (error) return <div className="stat-card"><p className="error-msg">No se pudieron calcular las estadísticas: {error}</p></div>;
  if (!r) return <div className="stat-card"><p className="est-cargando">Calculando las últimas semanas…</p></div>;

  const totalOcupados = r.semanas.reduce((n, s) => n + s.ocupados, 0);
  const pocosDatos = totalOcupados < 12; // con tan pocas reservas, un 0% por horario no dice nada todavía
  const celdaSel = nube?.tipo === 'celda' ? r.mapa.find((x) => x.dow === nube.dow && x.turno === nube.turno) : null;

  return (
    <section className="stat-card est" ref={caja}>
      <div className="est-cab">
        <h3 className="est-titulo">Qué horarios se llenan</h3>
        <button
          type="button"
          className={`est-info ${nube?.tipo === 'ayuda' ? 'abierto' : ''}`}
          aria-label="Cómo se lee y resumen"
          aria-expanded={nube?.tipo === 'ayuda'}
          onClick={() => setNube(nube?.tipo === 'ayuda' ? null : { tipo: 'ayuda' })}
        >
          i
        </button>
      </div>

      {nube?.tipo === 'ayuda' && (
        <div className="est-nube" role="dialog" aria-label="Cómo se lee y resumen">
          <p className="est-nube-t">Cómo se lee</p>
          <p>
            Cada casillero es un día y horario. Muestra cuántos turnos se ocuparon de los {r.mapa[0].posibles} posibles
            (últimas 4 semanas × 2 canchas). Ej.: "5 de 8" en martes 20:30 = de los últimos 4 martes, hubo 5 canchas ocupadas.
            Tocá un casillero para ver cada cancha por separado.
          </p>
          <p className="est-nube-t">Resumen</p>
          {pocosDatos && (
            <p>Hay muy poco movimiento en las últimas 4 semanas ({totalOcupados} {totalOcupados === 1 ? 'reserva' : 'reservas'} de fútbol en total). Estos números van a servir más cuando haya más reservas.</p>
          )}
          {!pocosDatos && r.flojos.length === 0 && r.llenos.length === 0 && <p>Ningún horario se destaca: la demanda está pareja.</p>}
          {!pocosDatos && (
            <ul>
              {r.flojos.map((c) => (
                <li key={`f${c.dow}${c.turno}`}><b>{NOMBRE_DIA[c.dow]} {c.hora}</b> se ocupó {c.ocupados} de {c.posibles} veces. Ahí conviene una promo o avisarle a la lista de espera.</li>
              ))}
              {r.llenos.map((c) => (
                <li key={`l${c.dow}${c.turno}`}><b>{NOMBRE_DIA[c.dow]} {c.hora}</b> casi siempre está lleno ({c.ocupados} de {c.posibles}). Hay demanda en ese horario.</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="est-mapa" role="table" aria-label="Ocupación por día y horario">
        <span />
        {DIAS_JUEGO.map((d) => <span key={d} className="est-mapa-dia" role="columnheader">{NOMBRE_DIA[d].slice(0, 3)}</span>)}
        {TURNOS.map((t) => (
          <div className="est-mapa-fila" key={t.id} role="row">
            <span className="est-mapa-hora" role="rowheader">{t.hora}</span>
            {DIAS_JUEGO.map((d) => {
              const c = r.mapa.find((x) => x.dow === d && x.turno === t.id);
              const activa = celdaSel && celdaSel.dow === d && celdaSel.turno === t.id;
              return (
                <button
                  key={d}
                  type="button"
                  className={`est-celda est-celda--${nivel(c.pct)} ${activa ? 'sel' : ''}`}
                  role="cell"
                  aria-label={`${NOMBRE_DIA[d]} ${t.hora}: ${c.ocupados} de ${c.posibles}, ${c.pct}%. Tocá para ver cada cancha`}
                  onClick={() => setNube(activa ? null : { tipo: 'celda', dow: d, turno: t.id })}
                >
                  <b>{c.pct}%</b>
                  <small>{c.ocupados} de {c.posibles}</small>
                </button>
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

      {celdaSel && (
        <div className="est-nube est-nube--fluida" role="dialog" aria-label={`Desglose de ${NOMBRE_DIA[celdaSel.dow]} ${celdaSel.hora}`}>
          <p className="est-nube-t">{NOMBRE_DIA[celdaSel.dow]} {celdaSel.hora}</p>
          {[['Cancha 1', celdaSel.porCancha[0]], ['Cancha 2', celdaSel.porCancha[1]]].map(([nombre, n]) => (
            <div className="est-cancha" key={nombre}>
              <span>{nombre}</span>
              <span className="est-cancha-barra" aria-hidden="true"><i style={{ width: `${(n / celdaSel.posiblesPorCancha) * 100}%` }} /></span>
              <b>{n} de {celdaSel.posiblesPorCancha}</b>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
