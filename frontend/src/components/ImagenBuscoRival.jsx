import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IG_URL } from './site/config';
import { hhmm } from '../lib/fechas';
import { nombreEquipo } from '../lib/equipo';
import { dibujarBuscoRival } from '../lib/historiaTurnos';

// Imagen de Instagram Story (1080x1920) para una reserva que busca rival.
// Mateo la descarga y se la manda por WhatsApp a quien reservó, que la sube a su
// Story y etiqueta al complejo. No hay integración con Instagram (a propósito).
// Misma estética que la historia de "Turnos libres" (se dibuja con canvas, sin librerías).

// "@elpinarcomplejo", tomado del mismo link de Instagram que usa el sitio.
const HANDLE = '@' + IG_URL.replace(/\/+$/, '').split('/').pop();

// "2026-09-26" -> "Sábado 26/09"
function diaCorto(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-').map(Number);
  const nombre = new Date(a, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long' });
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

export default function ImagenBuscoRivalModal({ reserva, fecha, nombreCancha, onCerrar }) {
  const [equipo, setEquipo] = useState(nombreEquipo(reserva.team_name));
  const [error, setError] = useState(null);
  const [puedeCompartir, setPuedeCompartir] = useState(false);
  const canvasRef = useRef(null);

  const datos = {
    equipo: nombreEquipo(equipo),
    cancha: nombreCancha || reserva.court,
    dia: diaCorto(fecha),
    hora: `${hhmm(reserva.start_time)} hs`,
    handle: HANDLE,
  };

  // la vista previa se redibuja cada vez que cambia el nombre o los datos
  useEffect(() => {
    if (canvasRef.current) dibujarBuscoRival(canvasRef.current, datos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo, fecha, nombreCancha, reserva.court, reserva.start_time]);

  // ¿el celular permite compartir un archivo directo (por ejemplo a WhatsApp)?
  useEffect(() => {
    try {
      const prueba = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
      setPuedeCompartir(!!(navigator.canShare && navigator.canShare({ files: [prueba] })));
    } catch { setPuedeCompartir(false); }
  }, []);

  const nombreArchivo = () => {
    const n = datos.equipo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `busca-rival-${n || 'equipo'}.png`;
  };
  const blob = () => new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png'));

  async function descargar() {
    setError(null);
    try {
      const b = await blob();
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error(e);
      setError('No se pudo generar la imagen. Probá de nuevo.');
    }
  }

  async function compartir() {
    setError(null);
    try {
      const b = await blob();
      await navigator.share({ files: [new File([b], nombreArchivo(), { type: 'image/png' })] });
    } catch (e) {
      if (e.name !== 'AbortError') setError('No se pudo abrir el menú de compartir. Probá con Descargar.');
    }
  }

  return createPortal(
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h3 className="modal-titulo">Imagen para Instagram</h3>
        <p className="modal-sub">
          Descargala y mandásela por WhatsApp a {reserva.client_name}: la sube a su Story y etiqueta al complejo.
        </p>

        <div className="field">
          <label>Nombre del equipo</label>
          <input value={equipo} maxLength={40} onChange={(e) => setEquipo(e.target.value)} placeholder="Ej: Los Pibes FC" />
        </div>

        <div className="historia-vista" style={{ width: 'min(100%, 270px)' }}>
          <canvas ref={canvasRef} className="historia-canvas" role="img" aria-label="Vista previa de la imagen de Busco rival" />
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCerrar}>Cerrar</button>
          {puedeCompartir && <button className="btn btn-ghost" onClick={compartir} disabled={!datos.equipo}>Compartir</button>}
          <button className="btn btn-primary" onClick={descargar} disabled={!datos.equipo}>Descargar imagen</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
