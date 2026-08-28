import { Avatar, IconoContacto } from './Iconos';
import { fechaLarga, hhmm } from '../lib/fechas';

const NOMBRE_CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Paddle' };

export default function RivalsBoard({ rivales }) {
  return (
    <section className="panel-rivales">
      <h2 className="seccion-titulo" style={{ margin: '0 0 4px' }}>
        Búsqueda de rivales activos
      </h2>

      {!rivales.length && <p className="vacio">No hay equipos buscando rival por ahora.</p>}

      {rivales.map((r) => (
        <article className="rival-item" key={`${r.court}-${r.reservation_date}-${r.start_time}`}>
          <span className="avatar"><Avatar /></span>
          <div className="datos">
            <p className="titulo">
              {NOMBRE_CANCHA[r.court] || r.court} / {fechaLarga(r.reservation_date)} {hhmm(r.start_time)} — {r.team_name}
            </p>
            <p className="detalle">{r.category ? `Categoría: ${r.category}` : 'Sin categoría indicada'}</p>
          </div>
          <a
            className="contacto-btn"
            href={`https://wa.me/${(r.contact_phone || '').replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Contactar a ${r.team_name} por WhatsApp`}
          >
            <IconoContacto />
          </a>
        </article>
      ))}
    </section>
  );
}
