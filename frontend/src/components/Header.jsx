import { IconoMenu, IconoTicket } from './Iconos';

export default function Header({ menuAbierto, onToggleMenu, onIrA, onBuscarReserva }) {
  return (
    <header>
      <div className="header">
        <button className="header-btn" onClick={onToggleMenu} aria-label="Abrir menu" aria-expanded={menuAbierto}>
          <IconoMenu />
        </button>
        <h1>El Pinar</h1>
        <button className="header-btn header-btn--texto" onClick={onBuscarReserva} aria-label="Buscar mi reserva">
          <IconoTicket />
          <span>Mi reserva</span>
        </button>
      </div>

      {menuAbierto && (
        <nav className="menu-lateral">
          <button onClick={() => onIrA('reservar')}>Reservar turnos</button>
          <button onClick={() => onIrA('rivales')}>Busco rival</button>
        </nav>
      )}
    </header>
  );
}
