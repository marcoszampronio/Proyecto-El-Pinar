// Descripción corta de un dispositivo a partir del user-agent: "iPhone", "Android (Chrome)", "Compu (Edge)".
export function describirDispositivo(ua = '') {
  const u = String(ua);
  const navegador = /Edg\//.test(u) ? 'Edge' : /SamsungBrowser/.test(u) ? 'Samsung Internet' : /OPR\/|Opera/.test(u) ? 'Opera'
    : /Firefox\//.test(u) ? 'Firefox' : /CriOS|Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : null;
  if (/iPhone/.test(u)) return 'iPhone';
  if (/iPad/.test(u)) return 'iPad';
  if (/Android/.test(u)) return navegador ? `Android (${navegador})` : 'Android';
  if (/Windows/.test(u)) return navegador ? `Compu Windows (${navegador})` : 'Compu Windows';
  if (/Macintosh|Mac OS/.test(u)) return navegador ? `Mac (${navegador})` : 'Mac';
  if (/Linux/.test(u)) return navegador ? `Linux (${navegador})` : 'Linux';
  return 'Dispositivo';
}
