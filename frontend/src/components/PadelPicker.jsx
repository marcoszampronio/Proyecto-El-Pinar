import { useMemo, useState } from 'react';
import { hhmm } from '../lib/fechas';

const PASO_MINUTOS = 30;
const DURACIONES = [30, 60, 90, 120];

function aMinutos(hora) {
  const [h, m] = hora.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

function aHora(minutos) {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}:00`;
}

function seSolapa(inicio, fin, ocupados) {
  return ocupados.some((o) => inicio < aMinutos(o.end_time) && fin > aMinutos(o.start_time));
}

export default function PadelPicker({ apertura, cierre, ocupados, onReservar }) {
  const [inicio, setInicio] = useState(null);
  const [duracion, setDuracion] = useState(60);

  const bloques = useMemo(() => {
    const desde = aMinutos(apertura);
    const hasta = aMinutos(cierre);
    const lista = [];
    for (let m = desde; m + PASO_MINUTOS <= hasta; m += PASO_MINUTOS) {
      lista.push({ inicio: m, fin: m + PASO_MINUTOS, ocupado: seSolapa(m, m + PASO_MINUTOS, ocupados) });
    }
    return lista;
  }, [apertura, cierre, ocupados]);

  const cierreMin = aMinutos(cierre);
  const duracionesPosibles = DURACIONES.filter(
    (d) => inicio !== null && inicio + d <= cierreMin && !seSolapa(inicio, inicio + d, ocupados)
  );
  const duracionValida = duracionesPosibles.includes(duracion);

  function elegirBloque(bloque) {
    setInicio(bloque.inicio);
    const posibles = DURACIONES.filter(
      (d) => bloque.inicio + d <= cierreMin && !seSolapa(bloque.inicio, bloque.inicio + d, ocupados)
    );
    if (!posibles.includes(duracion)) setDuracion(posibles[0] ?? PASO_MINUTOS);
  }

  return (
    <>
      <h2 className="seccion-titulo">Horarios disponibles: Paddle</h2>

      <div className="chips">
        {bloques.map((b) => (
          <button
            key={b.inicio}
            className={`chip ${b.ocupado ? 'ocupado' : ''} ${inicio === b.inicio ? 'activo' : ''}`}
            disabled={b.ocupado}
            onClick={() => elegirBloque(b)}
            aria-pressed={inicio === b.inicio}
          >
            {hhmm(aHora(b.inicio))}-{hhmm(aHora(b.fin))}
          </button>
        ))}
      </div>

      <div className="chip-leyenda">
        <span><i className="punto libre" /> Libre</span>
        <span><i className="punto ocupado" /> Reservado</span>
      </div>

      <div className="duracion">
        <label htmlFor="duracion-padel">Duracion</label>
        <select
          id="duracion-padel"
          value={duracion}
          onChange={(e) => setDuracion(Number(e.target.value))}
          disabled={inicio === null}
        >
          {(inicio === null ? DURACIONES : duracionesPosibles).map((d) => (
            <option key={d} value={d}>{d} min</option>
          ))}
        </select>
        {inicio !== null && duracionValida && (
          <span>{hhmm(aHora(inicio))} a {hhmm(aHora(inicio + duracion))}</span>
        )}
      </div>

      <button
        className="btn btn-gold btn-reservar"
        disabled={inicio === null || !duracionValida}
        onClick={() => onReservar({ startTime: aHora(inicio), endTime: aHora(inicio + duracion) })}
      >
        Reservar
      </button>
    </>
  );
}
