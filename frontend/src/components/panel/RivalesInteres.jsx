import { useEffect, useState } from 'react';
import { api } from '../../api';
import { fechaLargaCompleta, hhmm } from '../../lib/fechas';
import { nombreEquipo } from '../../lib/equipo';
import Info from './Info';

const CANCHA = { C1: 'Cancha 1', C2: 'Cancha 2', PAD: 'Pádel' };
const fechaLinda = (iso) => { const f = fechaLargaCompleta(iso); return f.charAt(0).toUpperCase() + f.slice(1); };

// "Interés en Busco rival": cuántas veces tocaron "Me interesa" en la página para escribirle a un equipo.
// Solo cuenta los toques (no sabe si después mandaron el mensaje ni quiénes son). Anónimo; no cuenta al equipo.
export default function RivalesInteres() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.adminRivalesInteres().then(setD).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="stat-card"><p className="error-msg">No se pudo cargar el interés en Busco rival: {error}</p></div>;
  if (!d) return <div className="stat-card"><p className="est-cargando">Contando toques…</p></div>;

  return (
    <section className="stat-card vis">
      <div className="est-cab">
        <h3 className="est-titulo">Interés en Busco rival</h3>
        <Info etiqueta="Cómo se cuenta el interés en Busco rival">
          Cuenta las veces que alguien toca "Me interesa" (o "Escribiles por WhatsApp") en la página para escribirle a un equipo que busca rival.
          No dice si después mandó el mensaje ni quién es: solo que tocó el botón. Si la misma persona toca lo mismo varias veces seguidas, cuenta una.
        </Info>
      </div>

      <div className="vis-numeros">
        <div><b>{d.hoy.toques}</b><span>hoy</span></div>
        <div><b>{d.ult7.toques}</b><span>últimos 7 días</span></div>
        <div><b>{d.ult30.toques}</b><span>últimos 30 días</span></div>
      </div>

      {d.ult30.toques === 0 ? (
        <p className="vis-vacio">Todavía nadie tocó "Me interesa". Se empieza a contar desde que se publica este cambio.</p>
      ) : (
        <>
          <p className="pref-titulo" style={{ marginTop: 14 }}>Por turno (últimos 30 días)</p>
          {d.turnos.map((t) => (
            <div className="rival-int" key={`${t.fecha}|${t.hora}|${t.cancha}`}>
              <div>
                <b>{nombreEquipo(t.equipo) || 'Equipo'}</b>
                <span>{fechaLinda(t.fecha)} · {hhmm(t.hora)} · {CANCHA[t.cancha] || t.cancha}</span>
              </div>
              <div className="rival-int-n">
                <b>{t.toques}</b>
                <span>{t.toques === 1 ? 'toque' : 'toques'}{t.personas !== t.toques ? ` · ${t.personas} ${t.personas === 1 ? 'persona' : 'personas'}` : ''}</span>
              </div>
            </div>
          ))}
          <p className="vis-pie">
            En 30 días: <b>{d.ult30.toques}</b> {d.ult30.toques === 1 ? 'toque' : 'toques'} de <b>{d.ult30.personas}</b> {d.ult30.personas === 1 ? 'persona distinta' : 'personas distintas'}.
          </p>
        </>
      )}
    </section>
  );
}
