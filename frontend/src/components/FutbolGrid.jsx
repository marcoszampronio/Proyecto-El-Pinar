const NOMBRES_TURNO = {
  T1: '20:00 a 21:30',
  T2: '21:30 a 22:30',
  T3: '22:30 a 23:30',
};

export default function FutbolGrid({ court, nombreCancha, turnos, onSelectSlot }) {
  return (
    <div className="cancha-col">
      <h3>{nombreCancha}</h3>
      {turnos.map((t) => (
        <div
          key={t.turn}
          className={`slot ${t.status}`}
          onClick={() => t.status === 'libre' && onSelectSlot({ court, turn: t.turn })}
        >
          <span>{NOMBRES_TURNO[t.turn]}</span>
          <span>
            {t.status === 'libre' && 'Libre'}
            {t.status === 'pendiente' && 'Pendiente'}
            {t.status === 'confirmada' && 'Reservado'}
          </span>
        </div>
      ))}
    </div>
  );
}
