import { hoyISO, nombreDia, numeroDia, sumarDias, esDiaHabilitado } from '../lib/fechas';

function proximasFechasHabilitadas(cantidad) {
  var fechas = [];
  var cursor = hoyISO();
  var intentos = 0;
  while (fechas.length < cantidad && intentos < 60) {
    if (esDiaHabilitado(cursor)) {
      fechas.push(cursor);
    }
    cursor = sumarDias(cursor, 1);
    intentos++;
  }
  return fechas;
}

function formatearDia(iso) {
  var d = new Date(iso + 'T00:00:00');
  var dia = String(d.getDate()).padStart(2, '0');
  var mes = String(d.getMonth() + 1).padStart(2, '0');
  var DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  return {
    nombre: DIAS[d.getDay()],
    numero: dia + '/' + mes,
  };
}

export default function DateStrip({ seleccionada, onSeleccionar }) {
  var fechas = proximasFechasHabilitadas(9);

  return (
    <div className="fechas">
      <div className="fechas-dias">
        {fechas.map(function(dia) {
          var info = formatearDia(dia);
          return (
            <button
              key={dia}
              className={'dia-btn' + (dia === seleccionada ? ' activo' : '')}
              onClick={function() { onSeleccionar(dia); }}
            >
              <span className="dia-nombre">{info.nombre}</span>
              <span className="dia-numero">{info.numero}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}