import { IconoMenu, IconoLupa } from './Iconos';

export default function Header({ busqueda, onBuscar, menuAbierto, onToggleMenu, buscadorAbierto, onToggleBuscador, onIrA }) {
  return (
    <header>
      <div className="header">
        <button className="header-btn" onClick={onToggleMenu} aria-label="Abrir menu" aria-expanded={menuAbierto}>
          <IconoMenu />
        </button>
        <h1>El Pinar</h1>
        <button className="header-btn" onClick={onToggleBuscador} aria-label="Buscar equipos" aria-expanded={buscadorAbierto}>
          <IconoLupa />
        </button>
      </div>

      {menuAbierto && (
        <nav className="menu-lateral">
          <button onClick={() => onIrA('reservar')}>Reservar turnos</button>
          <button onClick={() => onIrA('rivales')}>Busco rival</button>
          <a href="/panel">Panel del complejo</a>
        </nav>
      )}

      {buscadorAbierto && (
        <div className="buscador">
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Buscar equipo o categoria..."
            aria-label="Buscar equipo o categoria"
          />
        </div>
      )}
    </header>
  );
}
