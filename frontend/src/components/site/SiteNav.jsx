import { useEffect, useState } from 'react';
import LogoPino from './LogoPino';
import { IgIcon } from './iconos';
import { IG_URL } from './config';

const LINKS = [
  { id: 'reservar', label: 'Reservar' },
  { id: 'rival', label: 'Busco rival' },
  { id: 'llegar', label: 'Cómo llegar' },
  { id: 'servicios', label: 'El complejo' },
];

export default function SiteNav({ onIr, onBuscarReserva }) {
  const [scroll, setScroll] = useState(false);

  useEffect(() => {
    const f = () => setScroll(window.scrollY > 24);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  return (
    <header className={`snav ${scroll ? 'snav--scroll' : ''}`}>
      <button className="snav-marca" onClick={() => onIr('top')} aria-label="El Pinar, inicio" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
        <LogoPino />
        <b>EL PINAR</b>
      </button>

      <nav className="snav-links" aria-label="Secciones">
        {LINKS.map((l) => (
          <button key={l.id} onClick={() => onIr(l.id)}>{l.label}</button>
        ))}
        <button onClick={onBuscarReserva}>Mi reserva</button>
      </nav>

      <div className="snav-acc">
        <a className="snav-ico" href={IG_URL} target="_blank" rel="noreferrer" aria-label="Instagram">
          <IgIcon />
        </a>
        <button className="snav-ico snav-mireserva" onClick={onBuscarReserva} aria-label="Mi reserva">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5.5h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4v-3a1 1 0 0 1 1-1Z" />
            <path d="M14.5 5.5v13" strokeDasharray="1.5 2.2" />
          </svg>
        </button>
        <button className="btn btn-oro" onClick={() => onIr('reservar')}>Reservar turno</button>
      </div>
    </header>
  );
}
