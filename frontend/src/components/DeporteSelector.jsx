import { CanchaFutbol, CanchaPadel } from './Iconos';

export const DEPORTES = [
  { id: 'futbol', nombre: 'Fútbol 11' },
  { id: 'padel', nombre: 'Pádel' },
];

export default function DeporteSelector({ seleccionado, onSeleccionar }) {
  return (
    <div className="canchas-selector" role="tablist" aria-label="Deporte">
      {DEPORTES.map((d) => {
        const activo = d.id === seleccionado;
        return (
          <button
            key={d.id}
            role="tab"
            className={`cancha-card ${activo ? 'activa' : ''}`}
            onClick={() => onSeleccionar(d.id)}
            aria-selected={activo}
          >
            {d.id === 'padel' ? <CanchaPadel /> : <CanchaFutbol activa={activo} />}
            <span className="nombre">{d.nombre}</span>
          </button>
        );
      })}
    </div>
  );
}
