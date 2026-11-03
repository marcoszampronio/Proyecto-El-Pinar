import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { hoyISO, sumarDias, esDiaHabilitado } from '../../lib/fechas';
import {
  dibujarHistoria, hayTurnosLibres, turnosDeAgenda, etiquetasDia, subtituloDia, subtituloSemana,
} from '../../lib/historiaTurnos';

// Botón con el logo de Instagram: arma la imagen de historia con los turnos de fútbol LIBRES y la descarga en el celular.
//  - modo 'dia':    el día que se está viendo (fecha).
//  - modo 'semana': la semana que se está viendo (lunes), solo de hoy en adelante.
// Siempre con lo que hay en la agenda en ese momento (se vuelve a leer al tocar), en el estilo dorado.
export default function BotonHistoriaIG({ modo, fecha, lunes }) {
  const [armando, setArmando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'info' | 'error', texto }
  const reloj = useRef(null);

  useEffect(() => () => clearTimeout(reloj.current), []);

  function avisar(tipo, texto) {
    clearTimeout(reloj.current);
    setAviso({ tipo, texto });
    reloj.current = setTimeout(() => setAviso(null), 6000);
  }

  async function fechasAMostrar() {
    if (modo === 'dia') return [fecha];
    const aperturas = await api.adminAperturas(lunes, sumarDias(lunes, 4)).catch(() => ({ aperturas: [] }));
    const abiertos = new Set((aperturas.aperturas || []).map((a) => a.reservation_date));
    const hoy = hoyISO();
    return [0, 1, 2, 3, 4]
      .map((n) => sumarDias(lunes, n))
      .filter((f) => f >= hoy && (esDiaHabilitado(f) || abiertos.has(f)));
  }

  async function tocar() {
    if (armando) return;
    setArmando(true);
    setAviso(null);
    try {
      const fechas = await fechasAMostrar();
      if (!fechas.length) {
        avisar('info', 'No hay días abiertos para mostrar en esta semana.');
        return;
      }
      const agendas = await Promise.all(fechas.map((f) => api.adminAgenda(f)));
      const ahora = new Date();
      const dias = fechas.map((f, i) => ({ fecha: f, ...etiquetasDia(f), turnos: turnosDeAgenda(f, agendas[i], ahora) }));

      if (!hayTurnosLibres(dias)) {
        avisar('info', modo === 'dia' ? 'No quedan turnos libres este día, no hay nada para mostrar.' : 'No quedan turnos libres esta semana, no hay nada para mostrar.');
        return;
      }

      const canvas = document.createElement('canvas');
      const subtitulo = modo === 'dia' ? subtituloDia(dias[0].fecha) : subtituloSemana(dias.map((d) => d.fecha));
      await dibujarHistoria(canvas, { modo, estilo: 'dorado', subtitulo, dias });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('No se pudo armar la imagen.');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `turnos-libres-${modo === 'dia' ? dias[0].fecha : `semana-${dias[0].fecha}`}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      avisar('ok', 'Imagen descargada. Subila a tu historia desde la galería.');
    } catch (e) {
      avisar('error', e.message || 'No se pudo armar la imagen. Probá de nuevo.');
    } finally {
      setArmando(false);
    }
  }

  const etiqueta = modo === 'dia'
    ? 'Descargar historia de Instagram con los turnos libres de este día'
    : 'Descargar historia de Instagram con los turnos libres de la semana';

  return (
    <>
      <button type="button" className={`ig-btn${armando ? ' armando' : ''}`} onClick={tocar} disabled={armando} aria-label={etiqueta} aria-busy={armando} title={etiqueta}>
        {armando ? (
          <span className="ig-giro" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5.5" />
            <circle cx="12" cy="12" r="4.2" />
            <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>
      {aviso && <div className={`ig-aviso ig-aviso--${aviso.tipo}`} role="status">{aviso.texto}</div>}
    </>
  );
}
