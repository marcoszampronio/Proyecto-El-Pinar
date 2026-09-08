import { useState } from 'react';
import { WaIcon, IgIcon, MapaPin } from './iconos';
import { WA_URL, IG_URL, MAPS_URL, MAPA_IMG } from './config';

function MapaDibujado() {
  return (
    <svg viewBox="0 0 520 380" role="img" aria-label="Mapa de la ubicación de El Pinar">
      <rect width="520" height="380" fill="#e5e9e2" />
      <path d="M-20 250 L560 210" stroke="#c8cfc4" strokeWidth="26" fill="none" />
      <path d="M-20 250 L560 210" stroke="#fff" strokeWidth="3" strokeDasharray="10 12" fill="none" />
      <path d="M120 -20 L200 400" stroke="#d4dacf" strokeWidth="16" fill="none" />
      <path d="M400 -20 L360 400" stroke="#d4dacf" strokeWidth="12" fill="none" />
      <path d="M250 90 q90 40 60 130 q-40 70 -130 55 q-80 -20 -60 -110 q20 -85 130 -75Z" fill="#bcd3b4" />
      <g fill="#8fb587" opacity="0.9">
        <circle cx="235" cy="150" r="7" /><circle cx="265" cy="135" r="6" /><circle cx="300" cy="160" r="7" />
        <circle cx="280" cy="195" r="6" /><circle cx="240" cy="200" r="6" /><circle cx="315" cy="130" r="5" />
      </g>
      <circle cx="266" cy="176" r="34" fill="#F2C14E" opacity="0.18" />
      <path d="M266 132 c-14 0-24 10-24 24 c0 17 24 40 24 40 s24-23 24-40 c0-14-10-24-24-24Z" fill="#F2C14E" stroke="#12292A" strokeWidth="2" />
      <circle cx="266" cy="156" r="8" fill="#12292A" />
    </svg>
  );
}

export default function ComoLlegar() {
  const [imgOk, setImgOk] = useState(true);

  return (
    <section className="seccion llegar reveal" id="llegar">
      <div className="envoltura">
        <a className="mapa-card" href={MAPS_URL} target="_blank" rel="noreferrer" aria-label="Abrir en Google Maps">
          {imgOk ? (
            <img src={MAPA_IMG} alt="Ubicación de El Pinar en el mapa" onError={() => setImgOk(false)} loading="lazy" />
          ) : (
            <MapaDibujado />
          )}
          <span className="btn btn-oro mapa-btn">
            <MapaPin s={16} /> Ver en Google Maps
          </span>
        </a>

        <div className="llegar-info">
          <p className="eyebrow">Cómo llegar</p>
          <h2>Estamos en el pinar.</h2>
          <p className="sub">Tocá el mapa o el botón para abrir la ubicación en Google Maps.</p>
          <dl className="llegar-datos">
            <dt>Días de juego</dt>
            <dd>Martes, miércoles y jueves — a partir de las 20 hs</dd>
          </dl>
          <p className="eyebrow" style={{ marginBottom: 12 }}>Contacto</p>
          <div className="llegar-acc">
            <a className="btn btn-wa" href={WA_URL} target="_blank" rel="noreferrer">
              <WaIcon s={17} /> WhatsApp
            </a>
            <a className="btn btn-linea" href={IG_URL} target="_blank" rel="noreferrer">
              <IgIcon s={17} /> @elpinarcomplejo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
