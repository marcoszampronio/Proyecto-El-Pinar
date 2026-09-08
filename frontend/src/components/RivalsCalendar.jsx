import { useState } from 'react';
import {
  hoyISO, lunesDeLaSemana, semanaLaboral, esDiaHabilitado, sumarDias, desdeISO,
  proximoDiaHabilitado,
} from '../lib/fechas';
import { IconoWhatsapp } from './Iconos';

const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const TURNOS = [
  { hhmm: '20:30', label: '20:30' },
  { hhmm: '21:30', label: '21:30' },
  { hhmm: '22:30', label: '22:30' },
];

function etiquetaDia(iso) {
  const d = desdeISO(iso);
  return { nombre: DIAS_CORTO[d.getDay()], num: d.getDate() };
}

export default function RivalsCalendar({ rivales }) {
  const lunesInicial = lunesDeLaSemana(proximoDiaHabilitado(hoyISO()));
  const [ancla, setAncla] = useState(lunesInicial);
  const dias = semanaLaboral(ancla).filter(esDiaHabilitado); // Mar, Mié, Jue
  const puedeAtras = ancla > lunesInicial;

  // index: "fecha|hh:mm" -> [rivales]
  const idx = {};
  for (const r of rivales || []) {
    const k = `${r.reservation_date}|${(r.start_time || '').slice(0, 5)}`;
    (idx[k] = idx[k] || []).push(r);
  }

  const primero = etiquetaDia(dias[0]);
  const ultimo = etiquetaDia(dias[dias.length - 1]);
  const mes = MESES_CORTO[desdeISO(dias[0]).getMonth()];

  // para la vista de celular: rivales agrupados por día (con su horario)
  const porDia = dias.map((d) => {
    const items = [];
    for (const t of TURNOS) {
      for (const r of idx[`${d}|${t.hhmm}`] || []) items.push({ r, hhmm: t.label });
    }
    return { iso: d, ...etiquetaDia(d), items };
  });
  const hayRivales = porDia.some((dg) => dg.items.length > 0);

  return (
    <div className="rivales-cal">
      <div className="rivales-cal-nav">
        <button
          className="rivales-cal-flecha"
          onClick={() => setAncla(sumarDias(ancla, -7))}
          disabled={!puedeAtras}
          aria-label="Semana anterior"
        >‹</button>
        <span className="rivales-cal-rango">
          {primero.num} al {ultimo.num} de {mes}
        </span>
        <button
          className="rivales-cal-flecha"
          onClick={() => setAncla(sumarDias(ancla, 7))}
          aria-label="Semana siguiente"
        >›</button>
      </div>

      {/* vista escritorio: grilla semanal */}
      <div className="rivales-grid-scroll">
        <div className="rivales-grid" style={{ gridTemplateColumns: `44px repeat(${dias.length}, minmax(132px, 1fr))` }}>
          <div className="rivales-grid-esq" />
          {dias.map((d) => {
            const e = etiquetaDia(d);
            return (
              <div key={d} className="rivales-grid-dia">
                <span>{e.nombre}</span>
                <strong>{e.num}</strong>
              </div>
            );
          })}

          {TURNOS.map((t) => (
            <FilaTurno key={t.hhmm} turno={t} dias={dias} idx={idx} />
          ))}
        </div>
      </div>

      {/* vista celular: lista por día */}
      {hayRivales && (
        <div className="rivales-lista">
          {porDia.map((dg) => (
            dg.items.length === 0 ? null : (
              <div key={dg.iso} className="rivales-lista-dia">
                <h4>{dg.nombre} {dg.num}</h4>
                <div className="rivales-lista-items">
                  {dg.items.map(({ r, hhmm }, i) => (
                    <RivalCard key={i} r={r} hora={hhmm} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {!hayRivales && (
        <p className="rivales-cal-vacio">Todavía no hay equipos buscando rival.</p>
      )}
    </div>
  );
}

function RivalCard({ r, hora }) {
  return (
    <a
      className="rival-cel"
      href={r.linkWhatsapp || undefined}
      target="_blank"
      rel="noreferrer"
      title={r.linkWhatsapp ? 'Escribir por WhatsApp' : 'Sin número de contacto'}
    >
      {hora && <span className="rival-cel-hora">{hora} hs</span>}
      <span className="rival-cel-eq">{r.team_name || 'Equipo'}</span>
      <span className="rival-cel-meta">
        {(r.canchaNombre || r.court)}{r.category ? ` · ${r.category}` : ''}
      </span>
      {r.linkWhatsapp ? (
        <span className="rival-cel-btn">
          <IconoWhatsapp size={13} /> Me interesa
        </span>
      ) : (
        <span className="rival-cel-btn rival-cel-btn--off">Sin contacto</span>
      )}
    </a>
  );
}

function FilaTurno({ turno, dias, idx }) {
  return (
    <>
      <div className="rivales-grid-hora">{turno.label}</div>
      {dias.map((d) => {
        const lista = idx[`${d}|${turno.hhmm}`] || [];
        return (
          <div key={d} className="rivales-grid-celda">
            {lista.map((r, i) => (
              <RivalCard key={i} r={r} />
            ))}
          </div>
        );
      })}
    </>
  );
}
