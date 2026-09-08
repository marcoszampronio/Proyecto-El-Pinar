const LINEAS_NOCHE = (
  <svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 205 L400 175" stroke="rgba(243,238,225,0.5)" strokeWidth="2" fill="none" />
    <ellipse cx="200" cy="188" rx="70" ry="16" stroke="rgba(243,238,225,0.35)" strokeWidth="2" fill="none" />
    <path d="M40 300 55 250 48 250 62 218 54 218 70 190 86 218 78 218 92 250 85 250 100 300Z" fill="rgba(15,36,54,0.55)" />
    <path d="M320 300 334 254 326 254 340 224 332 224 346 196 360 224 352 224 366 254 358 254 373 300Z" fill="rgba(15,36,54,0.55)" />
  </svg>
);
const LINEAS_DIA = (
  <svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 210 L400 185" stroke="rgba(243,238,225,0.6)" strokeWidth="2" fill="none" />
    <ellipse cx="205" cy="197" rx="66" ry="15" stroke="rgba(243,238,225,0.45)" strokeWidth="2" fill="none" />
    <g fill="rgba(20,48,41,0.5)">
      <ellipse cx="50" cy="120" rx="42" ry="60" /><ellipse cx="120" cy="110" rx="46" ry="66" />
      <ellipse cx="300" cy="115" rx="50" ry="70" /><ellipse cx="360" cy="125" rx="40" ry="58" />
    </g>
  </svg>
);
const LINEAS_PADEL = (
  <svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
    <rect x="70" y="120" width="260" height="150" stroke="rgba(243,238,225,0.55)" strokeWidth="2" fill="none" />
    <path d="M70 195 H330 M200 120 V270" stroke="rgba(243,238,225,0.45)" strokeWidth="2" />
    <g fill="rgba(20,45,41,0.45)"><ellipse cx="40" cy="90" rx="34" ry="70" /><ellipse cx="360" cy="95" rx="38" ry="74" /></g>
  </svg>
);

export default function CanchasInfo({ onReservar }) {
  return (
    <section className="seccion canchas-info reveal" id="canchas">
      <div className="envoltura">
        <div className="seccion-cab">
          <p className="eyebrow">Las canchas</p>
          <h2>Tres canchas, un pinar.</h2>
          <p>Iluminación profesional en las tres. Se juega hasta tarde.</p>
        </div>

        <div className="cinfo-grid">
          <article className="cinfo-card">
            <div className="cinfo-foto cinfo-foto--noche" data-nota="Foto · Cancha 1 de noche">{LINEAS_NOCHE}</div>
            <div className="cinfo-body">
              <h3>Cancha 1</h3>
              <div className="cinfo-tags"><span>Fútbol 11</span><span>Césped natural</span><span>Iluminación pro</span></div>
              <button className="btn btn-linea" onClick={onReservar}>Ver horarios</button>
            </div>
          </article>
          <article className="cinfo-card">
            <div className="cinfo-foto cinfo-foto--dia" data-nota="Foto · Cancha 2 de día">{LINEAS_DIA}</div>
            <div className="cinfo-body">
              <h3>Cancha 2</h3>
              <div className="cinfo-tags"><span>Fútbol 11</span><span>Césped natural</span><span>Iluminación pro</span></div>
              <button className="btn btn-linea" onClick={onReservar}>Ver horarios</button>
            </div>
          </article>
          <article className="cinfo-card">
            <div className="cinfo-foto cinfo-foto--padel" data-nota="Foto · Cancha de pádel">{LINEAS_PADEL}</div>
            <div className="cinfo-body">
              <h3>Pádel</h3>
              <div className="cinfo-tags"><span>Paneles de vidrio</span><span>Luces</span><span>Al aire libre</span></div>
              <button className="btn btn-linea" onClick={onReservar}>Ver horarios</button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
