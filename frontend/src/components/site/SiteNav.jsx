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
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const f = () => setScroll(window.scrollY > 24);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  function ir(id) {
    setMenu(false);
    onIr(id);
  }

  return (
    <>
      <header className={`snav ${scroll ? 'snav--scroll' : ''}`}>
        <button className="snav-marca" onClick={() => ir('top')} aria-label="El Pinar, inicio" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <LogoPino />
          <b>EL PINAR</b>
        </button>

        <nav className="snav-links" aria-label="Secciones">
          {LINKS.map((l) => (
            <button key={l.id} onClick={() => ir(l.id)}>{l.label}</button>
          ))}
          <button onClick={() => { setMenu(false); onBuscarReserva(); }}>Mi reserva</button>
        </nav>

        <div className="snav-acc">
          <a className="snav-ico" href={IG_URL} target="_blank" rel="noreferrer" aria-label="Instagram">
            <IgIcon />
          </a>
          <button className="btn btn-oro" onClick={() => ir('reservar')}>Reservar turno</button>
          <button className="snav-ico snav-hamb" onClick={() => setMenu((v) => !v)} aria-label="Menú" aria-expanded={menu}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
        </div>
      </header>

      {menu && (
        <div className="snav-menu">
          {LINKS.map((l) => (
            <button key={l.id} onClick={() => ir(l.id)}>{l.label}</button>
          ))}
          <button onClick={() => { setMenu(false); onBuscarReserva(); }}>Mi reserva</button>
        </div>
      )}
    </>
  );
}
