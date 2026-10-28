import { useEffect, useState } from 'react';
import { api } from '../../api';
import Info from './Info';

const DIA_CORTO = (iso) => iso.split('-').reverse().slice(0, 2).join('/');

// "Visitas a la página": personas distintas que entraron a la página de reservas. Anónimo; no cuenta al equipo.
export default function Visitas() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.adminVisitas().then(setD).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="stat-card"><p className="error-msg">No se pudieron cargar las visitas: {error}</p></div>;
  if (!d) return <div className="stat-card"><p className="est-cargando">Contando visitas…</p></div>;

  const max = Math.max(1, ...d.porDia.map((x) => x.n));
  const totalOrigen = Math.max(1, ...d.origenes.map((o) => o.n));
  const conversion = d.ult30 > 0 ? Math.round((d.pedidos30 / d.ult30) * 100) : 0;

  return (
    <section className="stat-card vis">
      <div className="est-cab">
        <h3 className="est-titulo">Visitas a la página</h3>
        <Info etiqueta="Cómo se cuentan las visitas">
          Cuenta personas distintas que entraron a la página de reservas, una vez por sesión. Es anónimo: no guarda nombres, teléfonos ni IP.
        </Info>
      </div>

      <div className="vis-numeros">
        <div><b>{d.hoy}</b><span>hoy</span></div>
        <div><b>{d.ult7}</b><span>últimos 7 días</span></div>
        <div><b>{d.ult30}</b><span>últimos 30 días</span></div>
      </div>

      {d.ult30 === 0 ? (
        <p className="vis-vacio">Todavía no hay visitas registradas. Se empiezan a contar desde que se publica este cambio.</p>
      ) : (
        <>
          <div className="vis-barras" role="img" aria-label={`Visitantes por día, últimos 14 días. Máximo ${max}.`}>
            {d.porDia.map((x) => (
              <span key={x.dia} className="vis-col" title={`${DIA_CORTO(x.dia)}: ${x.n}`}>
                <i style={{ height: `${Math.max(4, (x.n / max) * 100)}%` }} className={x.n === 0 ? 'cero' : ''} />
              </span>
            ))}
          </div>
          <div className="vis-eje" aria-hidden="true">
            <span>{DIA_CORTO(d.porDia[0].dia)}</span><span>{DIA_CORTO(d.porDia[d.porDia.length - 1].dia)}</span>
          </div>

          <p className="pref-titulo" style={{ marginTop: 14 }}>De dónde llegan (30 días)</p>
          {d.origenes.map((o) => (
            <div className="est-cancha" key={o.origen} style={{ gridTemplateColumns: '84px 1fr auto' }}>
              <span style={{ fontSize: 'var(--pt-chico)', textTransform: 'capitalize' }}>{o.origen}</span>
              <span className="est-cancha-barra" aria-hidden="true"><i style={{ width: `${(o.n / totalOrigen) * 100}%` }} /></span>
              <b>{o.n}</b>
            </div>
          ))}

          <p className="vis-pie">
            En 30 días: <b>{d.pedidos30}</b> {d.pedidos30 === 1 ? 'pedido de reserva' : 'pedidos de reserva'} ({conversion}% de los visitantes) ·
            {' '}{d.dispositivos.movil} desde celular y {d.dispositivos.compu} desde compu.
          </p>
        </>
      )}
    </section>
  );
}
