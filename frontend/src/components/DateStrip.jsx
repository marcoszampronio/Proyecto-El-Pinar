import { hoyISO, nombreDia, numeroDia, sumarDias } from '../lib/fechas';

const DIAS_VISIBLES = 7;

export default function DateStrip({ inicio, seleccionada, onSeleccionar, onMover }) {
  const hoy = hoyISO();
  const dias = Array.from({ length: DIAS_VISIBLES }, (_, i) => sumarDias(inicio, i));

  return (
    <div className="fechas">
      <button
        className="fechas-flecha"
        onClick={() => onMover(-DIAS_VISIBLES)}
        disabled={inicio <= hoy}
        aria-label="Semana anterior"
      >
        ‹
      </button>

      <div className="fechas-dias">
        {dias.map((dia) => (
          <button
            key={dia}
            className={`dia-btn ${dia === seleccionada ? 'activo' : ''}`}
            onClick={() => onSeleccionar(dia)}
            disabled={dia < hoy}
            aria-pressed={dia === seleccionada}
          >
            <span className="dia-nombre">{nombreDia(dia)}</span>
            <span className="dia-numero">{numeroDia(dia)}</span>
          </button>
        ))}
      </div>

      <button className="fechas-flecha" onClick={() => onMover(DIAS_VISIBLES)} aria-label="Semana siguiente">
        ›
      </button>
    </div>
  );
}
