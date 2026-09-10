import { fechaLargaCompleta, hhmm } from '../lib/fechas';
import { IconoWhatsapp } from './Iconos';

// Info de un equipo que reservó y busca rival (se abre desde la grilla).
export default function RivalInfoModal({ rival, onCerrar }) {
  const fecha = fechaLargaCompleta(rival.reservation_date);

  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-titulo">{rival.team_name}</h3>
        <p className="modal-sub">
          {rival.category ? `Categoría ${rival.category}` : 'Equipo de fútbol 11'}
        </p>

        <div className="resumen-reserva">
          <div className="resumen-titulo">Reservaron y buscan rival</div>
          <p><strong>{rival.canchaNombre || rival.court}</strong></p>
          <p>{fecha.charAt(0).toUpperCase() + fecha.slice(1)}</p>
          <p>{hhmm(rival.start_time)} a {hhmm(rival.end_time)} hs</p>
        </div>

        <p style={{ fontSize: 13.5 }}>
          Ya tienen la cancha reservada y les falta contra quién jugar. Escribiles y coordinen el partido.
        </p>

        <div className="modal-actions modal-actions--col">
          {rival.linkWhatsapp ? (
            <a
              className="btn btn-wa"
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
              href={rival.linkWhatsapp}
              target="_blank"
              rel="noreferrer"
            >
              <IconoWhatsapp size={16} /> Escribiles por WhatsApp
            </a>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--s-niebla)', textAlign: 'center', margin: 0 }}>
              Sin número de contacto
            </p>
          )}
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
