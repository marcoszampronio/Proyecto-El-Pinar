import { CanchaFutbol, CanchaPadel, Avatar, IconoContacto } from './Iconos';
import { hhmm } from '../lib/fechas';

const COLUMNAS = [
  { id: 'C1', nombre: 'Futbol 1' },
  { id: 'C2', nombre: 'Futbol 2' },
  { id: 'PAD', nombre: 'Paddle' },
];

const HORAS = ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'];

export default function RivalsCalendar({ rivales }) {
  return (
    <section className="calendario">
      <div className="calendario-head">
        <span />
        {COLUMNAS.map((c) => (
          <span className="col" key={c.id}>
            {c.id === 'PAD' ? <CanchaPadel /> : <CanchaFutbol />}
            {c.nombre}
          </span>
        ))}
      </div>

      <div className="calendario-grid">
        {HORAS.map((hora) => (
          <Fila key={hora} hora={hora} rivales={rivales} />
        ))}
      </div>
    </section>
  );
}

function Fila({ hora, rivales }) {
  return (
    <>
      <div className="calendario-hora">{hora}</div>
      {COLUMNAS.map((c) => {
        const enCelda = rivales.filter((r) => r.court === c.id && hhmm(r.start_time) === hora);
        return (
          <div className="calendario-celda" key={c.id}>
            {enCelda.length > 0 && <CeldaRivales rivales={enCelda} />}
          </div>
        );
      })}
    </>
  );
}

function CeldaRivales({ rivales }) {
  const principal = rivales[0];
  return (
    <div className="rival-chip">
      <Avatar size={30} />
      {rivales.length > 1 && <div className="meta">{rivales.length} busquedas activas</div>}
      <div className="nombre">{principal.team_name}</div>
      <div className="meta">{principal.category || 'Sin categoria'}</div>
      <a
        href={`https://wa.me/${(principal.contact_phone || '').replace(/\D/g, '')}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Contactar a ${principal.team_name} por WhatsApp`}
      >
        <IconoContacto size={16} />
      </a>
    </div>
  );
}
