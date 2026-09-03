import { useState } from 'react';
import { hhmm } from '../lib/fechas';

export default function FutbolSlots({ nombreCancha, turnos, onReservar, onListaEspera }) {
  const [elegido, setElegido] = useState(null);

  return (
    <>
      <h2 className="seccion-titulo">Horarios disponibles: {nombreCancha}</h2>

      <div className="chips">
        {turnos.map((t) => {
          const libre = t.status === 'libre';
          return (
            <button
              key={t.turn}
              className={`chip ${libre ? '' : t.status === 'pendiente' ? 'pendiente' : 'ocupado'} ${elegido === t.turn ? 'activo' : ''}`}
              disabled={!libre}
              onClick={() => setElegido(t.turn)}
              aria-pressed={elegido === t.turn}
            >
              {hhmm(t.start)}-{hhmm(t.end)}
            </button>
          );
        })}
      </div>

      <div className="chip-leyenda">
        <span><i className="punto libre" /> Libre</span>
        <span><i className="punto pendiente" /> A confirmar</span>
        <span><i className="punto ocupado" /> Reservado</span>
      </div>

      <button
        className="btn btn-gold btn-reservar"
        disabled={!elegido}
        onClick={() => onReservar(elegido)}
      >
        Reservar
      </button>

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
