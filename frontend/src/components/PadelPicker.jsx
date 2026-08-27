import { useMemo, useState } from 'react';

function generarHorarios(apertura, cierre) {
  const horarios = [];
  let [h, m] = apertura.slice(0, 5).split(':').map(Number);
  const [hFin, mFin] = cierre.slice(0, 5).split(':').map(Number);
  while (h < hFin || (h === hFin && m < mFin)) {
    horarios.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    m += 30;
    if (m >= 60) { m = 0; h += 1; }
  }
  horarios.push(cierre);
  return horarios;
}

function seSolapa(inicio, fin, ocupados) {
  return ocupados.some((o) => inicio < o.end_time && fin > o.start_time);
}

export default function PadelPicker({ apertura, cierre, ocupados, onSelectRange }) {
  const horarios = useMemo(() => generarHorarios(apertura, cierre), [apertura, cierre]);
  const [inicio, setInicio] = useState(horarios[0]);
  const [fin, setFin] = useState(horarios[horarios.length - 1]);

  const horariosFin = horarios.filter((h) => h > inicio);
  const rangoValido = inicio < fin && !seSolapa(inicio, fin, ocupados);

  return (
    <div className="padel-picker">
      <h3>Pádel</h3>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Desde</label>
        <select value={inicio} onChange={(e) => setInicio(e.target.value)}>
          {horarios.slice(0, -1).map((h) => (
            <option key={h} value={h}>{h.slice(0, 5)}</option>
          ))}
        </select>
        <label style={{ display: 'block', fontSize: 12, margin: '12px 0 4px' }}>Hasta</label>
        <select value={fin} onChange={(e) => setFin(e.target.value)}>
          {horariosFin.map((h) => (
            <option key={h} value={h}>{h.slice(0, 5)}</option>
          ))}
        </select>
      </div>

      {!rangoValido && (
        <p className="error-msg">Ese rango se solapa con otra reserva o no es válido. Elegí otro.</p>
      )}

      <button
        className="btn btn-primary"
        disabled={!rangoValido}
        onClick={() => onSelectRange({ startTime: inicio, endTime: fin })}
      >
        Reservar este horario
      </button>
    </div>
  );
}
