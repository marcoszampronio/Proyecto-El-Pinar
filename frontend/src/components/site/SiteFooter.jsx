import LogoPino from './LogoPino';
import { WaIcon, IgIcon } from './iconos';

const IG_URL = 'https://www.instagram.com/elpinarcomplejo/';
const WA_URL = 'https://wa.me/5493430000000';

export default function SiteFooter({ onIr }) {
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
          <button onClick={() => onIr('servicios')}>El complejo</button>
          <button onClick={() => onIr('llegar')}>Cómo llegar</button>
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
