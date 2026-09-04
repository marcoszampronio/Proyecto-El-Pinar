import { CanchaFutbol, CanchaPadel } from './Iconos';

export const CANCHAS = [
  { id: 'C1', nombre: 'Cancha 1' },
  { id: 'C2', nombre: 'Cancha 2' },
  { id: 'PAD', nombre: 'Pádel' },
];

export default function CourtSelector({ seleccionada, onSeleccionar }) {
  return (
    <div className="canchas-selector">
      {CANCHAS.map((cancha) => {
        const activa = cancha.id === seleccionada;
        return (
          <button
            key={cancha.id}
            className={`cancha-card ${activa ? 'activa' : ''}`}
            onClick={() => onSeleccionar(cancha.id)}
            aria-pressed={activa}
          >
            {cancha.id === 'PAD' ? <CanchaPadel /> : <CanchaFutbol activa={activa} />}
            <span className="nombre">{cancha.nombre}</span>
          </button>
        );
      })}
    </div>
  );
}
