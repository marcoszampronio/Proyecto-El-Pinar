import { IconoMenu, IconoTicket } from './Iconos';

// "Mi reserva" queda oculto por ahora: el cliente ya no ve el código de
// reserva en ningún lado, así que ese buscador no tendría con qué funcionar.
const MOSTRAR_BUSCAR_RESERVA = false;

export default function Header({ menuAbierto, onToggleMenu, onIrA, onBuscarReserva }) {
  return (
    <header>
      <div className="header">
        <button className="header-btn" onClick={onToggleMenu} aria-label="Abrir menu" aria-expanded={menuAbierto}>
          <IconoMenu />
        </button>
        <h1>El Pinar</h1>
        <button
          className="header-btn header-btn--texto"
          onClick={onBuscarReserva}
          aria-label="Buscar mi reserva"
          aria-hidden={!MOSTRAR_BUSCAR_RESERVA}
          tabIndex={MOSTRAR_BUSCAR_RESERVA ? 0 : -1}
          style={MOSTRAR_BUSCAR_RESERVA ? undefined : { visibility: 'hidden', pointerEvents: 'none' }}
        >
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
