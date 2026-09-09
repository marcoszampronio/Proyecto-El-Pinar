import { useRef, useState } from 'react';
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

  const irSemana = (delta) => {
    if (delta < 0 && !puedeRetroceder) return;
    setAncla((a) => sumarDias(a, delta * 7));
  };

  // gesto táctil: deslizar la tira cambia de semana (y anula el tap del día)
  const touch = useRef(null);
  const swiped = useRef(false);
  const onTouchStart = (e) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swiped.current = false;
  };
  const onTouchMove = (e) => {
    if (!touch.current) return;
    const dx = e.touches[0].clientX - touch.current.x;
    const dy = e.touches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) swiped.current = true;
  };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) irSemana(dx < 0 ? 1 : -1);
  };

  const Flecha = ({ dir, lado }) => (
    <button
      className={'fechas-flecha' + (lado ? ' fechas-flecha--lado' : '')}
      onClick={() => irSemana(dir)}
      disabled={dir < 0 && !puedeRetroceder}
      aria-label={dir < 0 ? 'Semana anterior' : 'Semana siguiente'}
    >
      {dir < 0 ? '‹' : '›'}
    </button>
  );

  return (
    <div className="fechas">
      <div className="fechas-nav">
        <Flecha dir={-1} />
        <span className="fechas-rango">
          {primero.num}/{primero.mes} – {ultimo.num}/{ultimo.mes}
        </span>
        <Flecha dir={1} />
      </div>

      <div className="fechas-semana">
        <Flecha dir={-1} lado />
        <div
          className="fechas-dias"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
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
                onClick={() => { if (!swiped.current && habilitado) onSeleccionar(dia); }}
                aria-pressed={dia === seleccionada}
              >
                <span className="dia-nombre">{i.dia}</span>
                <span className="dia-numero">{i.num}</span>
                <span className="dia-mes">{i.mes}</span>
              </button>
            );
          })}
        </div>
        <Flecha dir={1} lado />
      </div>
    </div>
  );
}
