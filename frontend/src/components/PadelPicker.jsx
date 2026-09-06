import { useMemo, useState } from 'react';
import { hhmm } from '../lib/fechas';

const PASO_MINUTOS = 30;
const DURACIONES_DEFAULT = [30, 60, 90, 120];

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

function etiquetaDuracion(min) {
  if (min === 60) return '1 h';
  if (min === 90) return '1 h 30';
  if (min === 120) return '2 h';
  return `${min} min`;
}

export default function PadelPicker({
  apertura,
  cierre,
  ocupados,
  onReservar,
  titulo = 'Pádel',
  duraciones = DURACIONES_DEFAULT,
}) {
  const DURACIONES = duraciones;
  const [duracion, setDuracion] = useState(null);
  const [inicio, setInicio] = useState(null);

  const desdeMin = aMinutos(apertura);
  const cierreMin = aMinutos(cierre);

  // Inicios posibles para la duración elegida: cada bloque de 30' que entre
  // antes del cierre y no pise una reserva.
  const inicios = useMemo(() => {
    if (duracion == null) return [];
    const lista = [];
    for (let m = desdeMin; m + duracion <= cierreMin; m += PASO_MINUTOS) {
      lista.push({ inicio: m, libre: !seSolapa(m, m + duracion, ocupados) });
    }
    return lista;
  }, [duracion, desdeMin, cierreMin, ocupados]);

  function elegirDuracion(d) {
    setDuracion(d);
    setInicio(null);
  }

  return (
    <>
      <h2 className="seccion-titulo">Reservar {titulo}</h2>

      <div className="padel-paso">1. ¿Cuánto tiempo querés jugar?</div>
      <div className="chips">
        {DURACIONES.map((d) => (
          <button
            key={d}
            className={`chip ${duracion === d ? 'activo' : ''}`}
            onClick={() => elegirDuracion(d)}
            aria-pressed={duracion === d}
          >
            {etiquetaDuracion(d)}
          </button>
        ))}
      </div>

      {duracion != null && (
        <>
          <div className="padel-paso">2. ¿A qué hora empezás?</div>
          <div className="chips">
            {inicios.map((b) => (
              <button
                key={b.inicio}
                className={`chip ${b.libre ? '' : 'ocupado'} ${inicio === b.inicio ? 'activo' : ''}`}
                disabled={!b.libre}
                onClick={() => setInicio(b.inicio)}
                aria-pressed={inicio === b.inicio}
              >
                {hhmm(aHora(b.inicio))}
              </button>
            ))}
          </div>
          {inicios.every((b) => !b.libre) && (
            <p className="vacio">No hay lugar para {etiquetaDuracion(duracion)} este día. Probá con menos tiempo.</p>
          )}
          <div className="chip-leyenda">
            <span><i className="punto libre" /> Disponible</span>
            <span><i className="punto ocupado" /> Ocupado</span>
          </div>
        </>
      )}

      {inicio !== null && duracion != null && (
        <p className="padel-resumen">
          Turno: <strong>{hhmm(aHora(inicio))} a {hhmm(aHora(inicio + duracion))}</strong> ({etiquetaDuracion(duracion)})
        </p>
      )}

      <button
        className="btn btn-gold btn-reservar"
        disabled={inicio === null || duracion == null}
        onClick={() => onReservar({ startTime: aHora(inicio), endTime: aHora(inicio + duracion) })}
      >
        Reservar
      </button>
    </>
  );
}
