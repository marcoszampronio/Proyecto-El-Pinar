import { useState } from 'react';
import { hoyISO, sumarDias, semanaLaboral, esDiaHabilitado, esPasado, lunesDeLaSemana } from '../lib/fechas';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function info(iso) {
  const d = new Date(iso + 'T00:00:00');
  return { dia: DIAS[d.getDay()], num: String(d.getDate()).padStart(2, '0'), mes: MESES[d.getMonth()] };
}

export default function DateStrip({ seleccionada, onSeleccionar }) {
  // semana visible: la que contiene la fecha seleccionada (o la de hoy)
  const [ancla, setAncla] = useState(() => lunesDeLaSemana(seleccionada || hoyISO()));
  const dias = semanaLaboral(ancla);
  const lunesActual = lunesDeLaSemana(hoyISO());
  const puedeRetroceder = ancla > lunesActual;

  const primero = info(dias[0]);
  const ultimo = info(dias[4]);

  return (
    <div className="fechas">
      <div className="fechas-nav">
        <button
          className="fechas-flecha"
          onClick={() => setAncla(sumarDias(ancla, -7))}
          disabled={!puedeRetroceder}
          aria-label="Semana anterior"
        >
          ‹
        </button>
        <span className="fechas-rango">
          {primero.num}/{primero.mes} – {ultimo.num}/{ultimo.mes}
        </span>
        <button
          className="fechas-flecha"
          onClick={() => setAncla(sumarDias(ancla, 7))}
          aria-label="Semana siguiente"
        >
          ›
        </button>
      </div>

      <div className="fechas-dias">
        {dias.map((dia) => {
          const i = info(dia);
          const habilitado = esDiaHabilitado(dia) && !esPasado(dia);
          return (
            <button
              key={dia}
              className={
                'dia-btn' +
                (dia === seleccionada ? ' activo' : '') +
                (habilitado ? '' : ' no-habilitado')
              }
              disabled={!habilitado}
              onClick={() => habilitado && onSeleccionar(dia)}
              aria-pressed={dia === seleccionada}
            >
              <span className="dia-nombre">{i.dia}</span>
              <span className="dia-numero">{i.num}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
