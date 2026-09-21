import { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LogoPino from './site/LogoPino';
import { IG_URL } from './site/config';
import { hhmm } from '../lib/fechas';

// Imagen de Instagram Story (1080x1920) para una reserva que busca rival.
// Mateo la descarga y se la manda por WhatsApp a quien reservó, que la sube a su
// Story y etiqueta al complejo. No hay integración con Instagram (a propósito).

const SANS = "'Satoshi','Segoe UI',system-ui,sans-serif";
const SERIF = "'Fraunces',Georgia,serif";
const ORO = '#F2C14E';
const CAL = '#F3EEE1';

// "@elpinarcomplejo", tomado del mismo link de Instagram que usa el sitio.
const HANDLE = '@' + IG_URL.replace(/\/+$/, '').split('/').pop();

const etiqueta = {
  fontSize: 17, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: ORO, marginBottom: 12,
};
const valor = { fontFamily: SERIF, fontWeight: 600, fontSize: 36, lineHeight: 1.2, color: CAL };

// "2026-09-26" -> "Sábado 26/09"
function diaCorto(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-').map(Number);
  const nombre = new Date(a, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long' });
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

// El nombre del equipo lo escribe el público: va como texto de React (se escapa
// solo), nunca como HTML armado a mano. Nombres largos achican la letra para no pisar el subtítulo.
const Afiche = forwardRef(function Afiche({ equipo, cancha, dia, hora }, ref) {
  const n = equipo.length;
  const tamEquipo = n > 32 ? 26 : n > 22 ? 30 : 36;
  return (
    <div
      ref={ref}
      style={{
        width: 1080, height: 1920, boxSizing: 'border-box', background: '#0F2436', color: CAL,
        fontFamily: SANS, position: 'relative', overflow: 'hidden',
      }}
    >
      {/* cancha de fútbol completa, de punta a punta */}
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1920, color: ORO, opacity: 0.28 }}
        aria-hidden="true"
      >
        <rect x="60" y="140" width="960" height="1680" fill="none" stroke="currentColor" strokeWidth="3" />
        <line x1="60" y1="980" x2="1020" y2="980" stroke="currentColor" strokeWidth="3" />
        <circle cx="540" cy="980" r="170" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="540" cy="980" r="6" fill="currentColor" />

        <rect x="290" y="140" width="500" height="190" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="380" y="140" width="320" height="90" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="540" cy="260" r="5" fill="currentColor" />
        <path d="M 450 330 A 110 110 0 0 0 630 330" fill="none" stroke="currentColor" strokeWidth="3" />

        <rect x="290" y="1630" width="500" height="190" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="380" y="1730" width="320" height="90" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="540" cy="1700" r="5" fill="currentColor" />
        <path d="M 450 1630 A 110 110 0 0 1 630 1630" fill="none" stroke="currentColor" strokeWidth="3" />

        <path d="M 60 170 A 30 30 0 0 1 90 140" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M 990 140 A 30 30 0 0 1 1020 170" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M 1020 1790 A 30 30 0 0 1 990 1820" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M 90 1820 A 30 30 0 0 1 60 1790" fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>

      {/* header */}
      <div style={{ position: 'absolute', top: 100, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <LogoPino style={{ width: 24, height: 31, color: ORO }} />
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.9 }}>
          Complejo El Pinar
        </span>
      </div>

      {/* titular */}
      <div style={{ position: 'absolute', top: 430, left: 0, right: 0, textAlign: 'center', padding: '0 90px' }}>
        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 88, lineHeight: 1.05, color: CAL, maxWidth: 940, margin: '0 auto' }}>
          ¡Buscamos rival!
        </div>
      </div>

      {/* nombre del equipo */}
      <div style={{ position: 'absolute', top: 562, left: 0, right: 0, textAlign: 'center', padding: '0 100px' }}>
        <div
          style={{
            display: 'inline-block', fontSize: tamEquipo, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: ORO, borderBottom: '2px solid rgba(242,193,78,0.5)', paddingBottom: 10,
          }}
        >
          {equipo}
        </div>
      </div>

      <div style={{ position: 'absolute', top: 662, left: 0, right: 0, textAlign: 'center', fontSize: 25, color: CAL, opacity: 0.85, padding: '0 160px' }}>
        Nos falta un equipo para completar el partido
      </div>

      {/* ficha de datos */}
      <div
        style={{
          position: 'absolute', top: 1160, left: 90, right: 90, background: '#1D3E5A',
          border: '1px solid rgba(242,193,78,0.3)', borderRadius: 20, padding: '44px 40px', boxSizing: 'border-box',
          display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={etiqueta}>Cancha</div>
          <div style={{ ...valor, whiteSpace: 'pre-line' }}>{cancha}</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(242,193,78,0.25)', borderRight: '1px solid rgba(242,193,78,0.25)' }}>
          <div style={etiqueta}>Día</div>
          <div style={valor}>{dia}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={etiqueta}>Hora</div>
          <div style={{ ...valor, fontVariantNumeric: 'tabular-nums' }}>{hora}</div>
        </div>
      </div>

      {/* usuario de Instagram */}
      <div style={{ position: 'absolute', top: 1430, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ padding: '14px 30px', borderRadius: 999, background: ORO, color: '#0F2436', fontWeight: 700, fontSize: 22, letterSpacing: '0.04em' }}>
          {HANDLE}
        </div>
      </div>
    </div>
  );
});

export default function ImagenBuscoRivalModal({ reserva, fecha, nombreCancha, onCerrar }) {
  const [equipo, setEquipo] = useState(reserva.team_name || '');
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState(null);
  const [escala, setEscala] = useState(0.25);
  const cajaRef = useRef(null);
  const aficheRef = useRef(null);

  // La vista previa es el mismo afiche de 1080x1920 achicado con scale() para que entre en el modal.
  useLayoutEffect(() => {
    const medir = () => { if (cajaRef.current) setEscala(cajaRef.current.clientWidth / 1080); };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cajaRef.current);
    return () => ro.disconnect();
  }, []);

  const datos = {
    equipo: equipo.trim(),
    cancha: `Fútbol 11\n${nombreCancha || reserva.court}`,
    dia: diaCorto(fecha),
    hora: `${hhmm(reserva.start_time)} hs`,
  };

  async function descargar() {
    setGenerando(true);
    setError(null);
    try {
      const { toPng } = await import('html-to-image');
      await document.fonts.ready;
      const opciones = { width: 1080, height: 1920, pixelRatio: 1, cacheBust: true };
      // La primera pasada "calienta" el embebido de fuentes; la segunda es la buena.
      await toPng(aficheRef.current, opciones);
      const dataUrl = await toPng(aficheRef.current, opciones);
      const nombre = datos.equipo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const a = document.createElement('a');
      a.download = `busca-rival-${nombre || 'equipo'}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error(e);
      setError('No se pudo generar la imagen. Probá de nuevo.');
    } finally {
      setGenerando(false);
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

        <div
          ref={cajaRef}
          style={{
            width: '100%', maxWidth: 270, margin: '4px auto 14px', aspectRatio: '1080 / 1920', position: 'relative',
            overflow: 'hidden', borderRadius: 10, border: '1px solid var(--p-linea)',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1920, transform: `scale(${escala})`, transformOrigin: 'top left' }}>
            <Afiche ref={aficheRef} {...datos} />
          </div>
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCerrar}>Cerrar</button>
          <button className="btn btn-primary" onClick={descargar} disabled={generando || !datos.equipo}>
            {generando ? 'Generando…' : 'Descargar imagen'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
