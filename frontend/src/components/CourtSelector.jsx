import { CanchaFutbol, CanchaPadel } from './Iconos';

export const CANCHAS = [
  { id: 'C1', tipo: 'Football', nombre: 'Cancha 1' },
  { id: 'C2', tipo: 'Football', nombre: 'Cancha 2' },
  { id: 'PAD', tipo: '', nombre: 'Paddle' },
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
            {cancha.id === 'PAD' ? <CanchaPadel activa={activa} /> : <CanchaFutbol activa={activa} />}
            {cancha.tipo && <span className="tipo">{cancha.tipo}</span>}
            <span className="nombre">{cancha.nombre}</span>
          </button>
        );
      })}
    </div>
  );
}
