import { lunesDeLaSemana, sumarDias } from './fechas';

// Estadísticas "para decidir", calculadas en el navegador a partir del CSV de reservas
// (el mismo que baja el botón de exportar). No necesita nada nuevo en el servidor.

// Días de juego (0 = domingo) y turnos de fútbol.
export const DIAS_JUEGO = [2, 3, 4];
export const NOMBRE_DIA = { 2: 'Martes', 3: 'Miércoles', 4: 'Jueves' };
export const TURNOS = [
  { id: 'T1', hora: '20:30' },
  { id: 'T2', hora: '21:30' },
  { id: 'T3', hora: '22:30' },
];
const CANCHAS_FUTBOL = ['Cancha 1', 'Cancha 2'];
const POSIBLES_SEMANA = DIAS_JUEGO.length * TURNOS.length * CANCHAS_FUTBOL.length; // 18

// CSV con comillas ("" = comilla, saltos de línea dentro de comillas) → lista de objetos por columna.
export function parseCsv(texto) {
  const t = String(texto).replace(/^﻿/, '');
  const filas = [];
  let fila = [];
  let celda = '';
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"') {
        if (t[i + 1] === '"') { celda += '"'; i++; } else comillas = false;
      } else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(celda); celda = ''; }
    else if (c === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; }
    else if (c !== '\r') celda += c;
  }
  if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
  const [cabecera, ...resto] = filas;
  if (!cabecera) return [];
  return resto
    .filter((f) => f.length === cabecera.length)
    .map((f) => Object.fromEntries(cabecera.map((k, i) => [k, f[i]])));
}

const diaSemana = (iso) => new Date(`${iso}T00:00:00`).getDay();
const activa = (r) => r.Estado !== 'Cancelada';

// Las 4 últimas semanas completas (lunes a domingo) antes de la semana de `hoy`.
// semanas[0] = la semana pasada, semanas[1] = la anterior, etc.
export function rangoSemanas(hoy, cantidad = 4) {
  const lunes = lunesDeLaSemana(hoy);
  return Array.from({ length: cantidad }, (_, n) => ({
    desde: sumarDias(lunes, -7 * (n + 1)),
    hasta: sumarDias(lunes, -7 * (n + 1) + 6),
  }));
}

export function analizar(filas, hoy) {
  const rangos = rangoSemanas(hoy);
  const futbol = filas.filter((r) => CANCHAS_FUTBOL.includes(r.Cancha) && DIAS_JUEGO.includes(diaSemana(r.Fecha)));
  const enRango = (r, g) => r.Fecha >= g.desde && r.Fecha <= g.hasta;

  const semanas = rangos.map((g) => {
    const ocupados = futbol.filter((r) => enRango(r, g) && activa(r)).length;
    return {
      ...g,
      ocupados,
      posibles: POSIBLES_SEMANA,
      pct: Math.round((ocupados / POSIBLES_SEMANA) * 100),
      canceladas: filas.filter((r) => enRango(r, g) && r.Estado === 'Cancelada').length,
      padel: filas.filter((r) => enRango(r, g) && r.Cancha === 'Padel' && activa(r)).length,
    };
  });

  // mapa día × turno: de todas las veces que ese horario existió en las 4 semanas, cuántas se ocupó
  const mapa = [];
  for (const dow of DIAS_JUEGO) {
    for (const t of TURNOS) {
      const ocupados = futbol.filter((r) => r.Turno === t.id && diaSemana(r.Fecha) === dow && rangos.some((g) => enRango(r, g)) && activa(r)).length;
      const posibles = rangos.length * CANCHAS_FUTBOL.length;
      mapa.push({ dow, turno: t.id, hora: t.hora, ocupados, posibles, pct: Math.round((ocupados / posibles) * 100) });
    }
  }

  const ordenados = [...mapa].sort((a, b) => a.pct - b.pct);
  return {
    semanas,
    mapa,
    semanasConDatos: semanas.filter((s) => s.ocupados > 0).length,
    flojos: ordenados.filter((c) => c.pct < 50).slice(0, 2),
    llenos: [...ordenados].reverse().filter((c) => c.pct >= 88).slice(0, 2),
  };
}

// "Más que la semana anterior" / "Igual" / "Menos que…", para mostrar al lado de un número.
export function comparar(actual, anterior, { menosEsMejor = false } = {}) {
  const dif = actual - anterior;
  if (dif === 0) return { dif, tono: 'igual' };
  const sube = dif > 0;
  return { dif, tono: sube !== menosEsMejor ? 'bien' : 'mal' };
}
