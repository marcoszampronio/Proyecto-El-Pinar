import { IconoMenu } from './Iconos';

export default function Header({ menuAbierto, onToggleMenu, onIrA }) {
  return (
    <header>
      <div className="header">
        <button className="header-btn" onClick={onToggleMenu} aria-label="Abrir menu" aria-expanded={menuAbierto}>
          <IconoMenu />
        </button>
        <h1>El Pinar</h1>
        <span className="header-btn" aria-hidden="true" style={{ width: 26 }} />
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
