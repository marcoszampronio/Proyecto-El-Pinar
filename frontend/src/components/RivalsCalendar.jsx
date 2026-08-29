import { useState } from 'react';
import {
  hoyISO, lunesDeLaSemana, semanaLaboral, esDiaHabilitado, sumarDias, desdeISO,
  proximoDiaHabilitado,
} from '../lib/fechas';

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

      <div className="rivales-grid" style={{ gridTemplateColumns: `48px repeat(${dias.length}, 1fr)` }}>
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

      {(!rivales || rivales.length === 0) && (
        <p className="rivales-cal-vacio">Todavía no hay equipos buscando rival.</p>
      )}
    </div>
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
              <a
                key={i}
                className="rivales-chip"
                href={r.linkWhatsapp || undefined}
                target="_blank"
                rel="noreferrer"
                title={r.linkWhatsapp ? 'Escribir por WhatsApp' : 'Sin número de contacto'}
              >
                <span className="rivales-chip-eq">{r.team_name || 'Equipo'}</span>
                <span className="rivales-chip-meta">
                  {(r.canchaNombre || r.court)}{r.category ? ` · ${r.category}` : ''}
                </span>
              </a>
            ))}
          </div>
        );
      })}
    </>
  );
}
