import { supabaseAdmin } from './supabaseAdmin.js';
import { TURNOS_FUTBOL, generarCodigoFutbol, generarCodigoPadel } from './codeGenerator.js';

// Cuántos días hacia adelante se materializan turnos fijos (~6 semanas).
const HORIZONTE_DIAS = 42;

function fechasCandidatas(fijo) {
  const fechas = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const desde = new Date(fijo.desde + 'T00:00:00');
  const inicio = desde > hoy ? desde : hoy;
  const hasta = fijo.hasta ? new Date(fijo.hasta + 'T00:00:00') : null;

  for (let i = 0; i <= HORIZONTE_DIAS; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    if (d.getDay() !== fijo.dia_semana) continue;
    if (hasta && d > hasta) continue;
    fechas.push(d.toISOString().slice(0, 10));
  }
  return fechas;
}

// Genera (si no existen) las reservas confirmadas de las proximas semanas
// para cada turno fijo activo. Idempotente: si la fecha ya tiene una fila
// (aunque este cancelada, ej. porque Mateo la dio de baja esa semana), no
// la vuelve a crear.
export async function generarProximasReservas() {
  const { data: fijos, error } = await supabaseAdmin.from('turnos_fijos').select('*').eq('activo', true);
  if (error || !fijos) {
    if (error) console.error('[turnos fijos] error leyendo:', error.message);
    return;
  }

  for (const fijo of fijos) {
    const esPadel = fijo.court === 'PAD';
    const start_time = esPadel ? fijo.start_time : TURNOS_FUTBOL[fijo.turn]?.start;
    const end_time = esPadel ? fijo.end_time : TURNOS_FUTBOL[fijo.turn]?.end;
    if (!start_time || !end_time) continue;

    for (const fecha of fechasCandidatas(fijo)) {
      let query = supabaseAdmin
        .from('reservations')
        .select('id')
        .eq('reservation_date', fecha)
        .eq('court', fijo.court);
      query = esPadel
        ? query.eq('start_time', start_time).eq('end_time', end_time)
        : query.eq('turn', fijo.turn);

      const { data: existente } = await query.limit(1).maybeSingle();
      if (existente) continue;

      const code = esPadel
        ? generarCodigoPadel({ date: fecha, startTime: start_time, endTime: end_time })
        : generarCodigoFutbol({ court: fijo.court, date: fecha, turn: fijo.turn });

      const { error: errorInsert } = await supabaseAdmin.from('reservations').insert({
        code,
        court: fijo.court,
        reservation_date: fecha,
        start_time,
        end_time,
        turn: esPadel ? null : fijo.turn,
        client_name: fijo.client_name,
        client_phone: fijo.client_phone,
        client_email: fijo.client_email || null,
        status: 'confirmada',
        confirmed_at: new Date().toISOString(),
        confirmed_by: 'turno-fijo',
        origen_fijo_id: fijo.id,
      });
      // 23505/23P01 = alguien reservo ese turno justo antes (carrera): no pasa nada.
      if (errorInsert && !['23505', '23P01'].includes(errorInsert.code)) {
        console.error('[turnos fijos] error generando', fijo.id, fecha, errorInsert.message);
      }
    }
  }
}
