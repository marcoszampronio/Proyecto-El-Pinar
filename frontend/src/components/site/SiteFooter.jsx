import LogoPino from './LogoPino';
import { WaIcon, IgIcon } from './iconos';
import { WA_URL, IG_URL } from './config';

export default function SiteFooter({ onIr, onBuscarReserva }) {
  return (
    <footer className="pie">
      <div className="envoltura">
        <div className="pie-marca">
          <LogoPino />
          <b>EL PINAR</b>
        </div>
        <nav className="pie-nav" aria-label="Pie">
          <button onClick={() => onIr('reservar')}>Reservar turno</button>
          <button onClick={() => onIr('rival')}>Busco rival</button>
          <button onClick={() => onIr('llegar')}>Cómo llegar</button>
          <button onClick={() => onIr('servicios')}>El complejo</button>
          {onBuscarReserva && <button onClick={onBuscarReserva}>Mi reserva</button>}
        </nav>
        <div className="pie-social">
          <a className="snav-ico" href={IG_URL} target="_blank" rel="noreferrer" aria-label="Instagram"><IgIcon /></a>
          <a className="snav-ico" href={WA_URL} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WaIcon /></a>
        </div>
        <p className="pie-nota">Complejo El Pinar · Paraná, Entre Ríos. Algunas fotos y datos son de ejemplo hasta cargar los definitivos.</p>
      </div>
    </footer>
  );
}
