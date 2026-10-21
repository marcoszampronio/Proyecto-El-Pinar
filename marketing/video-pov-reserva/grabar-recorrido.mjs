// Graba el recorrido de reserva del sitio real CUADRO POR CUADRO (30 fps, 2x) con el
// tiempo del navegador controlado (virtual time), para que salga perfectamente fluido.
// La API está simulada: no se crea ninguna reserva ni se avisa a nadie.
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2];
const W = 540, H = 1105, FPS = 30, MS = 1000 / FPS;
fs.rmSync(OUT + '/frames', { recursive: true, force: true });
fs.mkdirSync(OUT + '/frames', { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--ignore-certificate-errors'],
});
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, locale: 'es-AR' });

await context.addInitScript(() => {
  const ARROW = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='34' height='34' viewBox='0 0 24 24'><path d='M4 2.5 L4 19.5 L8.4 15.6 L11.3 22 L14.2 20.7 L11.4 14.4 L17.2 14.4 Z' fill='white' stroke='%230F2436' stroke-width='1.7' stroke-linejoin='round'/></svg>\")";
  const mk = () => {
    if (document.getElementById('fakecur')) return;
    const st = document.createElement('style');
    st.textContent = `
      html { scroll-behavior: auto !important; }
      #fakecur { position: fixed; left: 0; top: 0; width: 34px; height: 34px; margin: -3px 0 0 -5px; background: ${ARROW} no-repeat;
        filter: drop-shadow(0 3px 4px rgba(0,0,0,.45)); z-index: 2147483647; pointer-events: none; opacity: 0;
        transform-origin: 5px 3px; transition: transform .09s ease; }
      #fakecur.down { transform: scale(.82); }
      .clickfx { position: fixed; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%; border: 3px solid rgba(255,255,255,.95);
        box-shadow: 0 0 0 1px rgba(0,0,0,.25); z-index: 2147483646; pointer-events: none; animation: clickfx .5s ease-out forwards; }
      @keyframes clickfx { from { transform: scale(.5); opacity: 1 } to { transform: scale(3.2); opacity: 0 } }
    `;
    document.head.appendChild(st);
    const c = document.createElement('div'); c.id = 'fakecur'; document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.opacity = 1; c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', (e) => {
      c.classList.add('down');
      const r = document.createElement('div'); r.className = 'clickfx'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.body.appendChild(r); setTimeout(() => r.remove(), 600);
    }, true);
    addEventListener('mouseup', () => c.classList.remove('down'), true);
  };
  if (document.body) mk(); else document.addEventListener('DOMContentLoaded', mk);
});

const page = await context.newPage();
const TURNOS = { T1: ['20:30:00', '21:30:00'], T2: ['21:30:00', '22:30:00'], T3: ['22:30:00', '23:30:00'] };
await page.route('**/api/**', async (route) => {
  const url = route.request().url(); const method = route.request().method();
  if (url.includes('dias-especiales')) return route.fulfill({ json: { fechas: [] } });
  if (url.includes('/rivals')) return route.fulfill({ json: [] });
  if (url.includes('/availability/futbol')) {
    return route.fulfill({ json: { court: 'C1', date: '2026-10-22', turnos: Object.entries(TURNOS).map(([turn, [start, end]]) => ({ turn, start, end, status: 'libre' })) } });
  }
  if (url.includes('/reservations/futbol') && method === 'POST') {
    const b = route.request().postDataJSON(); const [start, end] = TURNOS[b.turn];
    return route.fulfill({ json: {
      reserva: { code: 'RES-DEMO', court: b.court, reservation_date: b.date, start_time: start, end_time: end, client_name: b.clientName },
      mensajeWhatsapp: 'demo', numeroWhatsapp: '5493435134744', aliasTransferencia: 'elpinar.canchas.mp', montoReserva: '$10.000', holdMinutos: 10,
    } });
  }
  return route.fulfill({ json: {} });
});
await page.route('https://wa.me/**', (r) => r.abort());

await page.goto('https://complejo-el-pinar.pages.dev/', { waitUntil: 'networkidle', timeout: 45000 });
await page.evaluate(() => Promise.all(['/canchas/futbol-1.jpg','/canchas/futbol-2.jpg','/canchas/padel.jpg','/mapa-complejo.webp'].map((u) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = u; }))));
await page.waitForTimeout(1500);

// ---- a partir de acá el tiempo del navegador solo avanza cuando yo lo pido ----
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
async function advance(ms) {
  const done = new Promise((res) => cdp.once('Emulation.virtualTimeBudgetExpired', res));
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pauseIfNetworkFetchesPending', budget: ms });
  await Promise.race([done, new Promise((res) => setTimeout(res, 2500))]);
}
let frame = 0;
const marks = {};
async function tick() {
  await advance(MS);
  if (process.env.DBG) console.log('tick', frame);
  const sy = await page.evaluate(() => window.scrollY);
  const shot = cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, clip: { x: 0, y: sy, width: W, height: H, scale: 2 } });
  const { data } = await Promise.race([shot, new Promise((_, rej) => setTimeout(() => rej(new Error('shot timeout f' + frame)), 8000))]);
  fs.writeFileSync(`${OUT}/frames/${String(++frame).padStart(5, '0')}.jpg`, Buffer.from(data, 'base64'));
}
const hold = async (n) => { for (let i = 0; i < n; i++) await tick(); };
// Los eventos de entrada esperan a que la página procese un cuadro: hay que seguir avanzando el tiempo mientras tanto.
async function withTicks(p) { // (nombre histórico) corre un evento de entrada con el tiempo en marcha y lo vuelve a pausar
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance' });
  try { await p(); await new Promise((r) => setTimeout(r, 25)); } finally { await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' }); }
}
const mark = (name) => { marks[name] = +(frame / FPS).toFixed(2); console.log(name, marks[name]); };
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

async function scrollTo(to, n) {
  const from = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= n; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), from + (to - from) * ease(i / n));
    await tick();
  }
}
let cur = { x: W * 0.62, y: H * 0.72 };
await page.mouse.move(cur.x, cur.y);
async function moveTo(x, y, n = 22) {
  const { x: x0, y: y0 } = cur;
  for (let i = 1; i <= n; i++) {
    const e = ease(i / n);
    await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
    await tick();
  }
  cur = { x, y };
}
async function tap(loc, { n = 22, after = 16 } = {}) {
  const b = await loc.boundingBox();
  await moveTo(b.x + b.width / 2, b.y + b.height / 2, n);
  await hold(4);
  await withTicks(() => page.mouse.down()); await hold(5); await withTicks(() => page.mouse.up());
  await hold(after);
}
async function type(text, perChar = 3) {
  for (const ch of text) { await withTicks(() => page.keyboard.type(ch)); await hold(perChar); }
}

// 1) la página
await hold(36);
mark('landing');
await scrollTo(480, 56); await hold(8);
const yBoard = await page.evaluate(() => document.querySelector('#reservar').getBoundingClientRect().top + window.scrollY);
await scrollTo(yBoard, 78); await hold(26);
mark('board');

// 2) día y horario
const dias = page.locator('.dia-btn:not(.no-habilitado)');
await tap((await dias.count()) > 1 ? dias.nth(1) : dias.nth(0), { after: 22 });
mark('dia');
await tap(page.locator('.grilla-pub-celda.libre').nth(3), { n: 26, after: 34 });
mark('turno');

// 3) datos
await tap(page.locator('.modal input[placeholder="Tu nombre y apellido"]'));
await type('Juan Pérez', 3); await hold(8);
mark('nombre');
await tap(page.locator('.modal input[placeholder="343"]'), { n: 14, after: 4 }); await type('343', 4);
await tap(page.locator('.modal .tel-num'), { n: 12, after: 4 }); await type('5134744', 3); await hold(10);
mark('telefono');
const emailInp = page.locator('.modal input[placeholder="Para recibir la confirmación"]');
if (await emailInp.count()) { await tap(emailInp, { n: 14, after: 4 }); await type('juan.perez@gmail.com', 2); await hold(8); }

// 4) continuar
const cont = page.locator('.modal button:has-text("Continuar")');
const scSel = await page.evaluate(() => { for (const s of ['.modal', '.overlay']) { const e = document.querySelector(s); if (e && e.scrollHeight > e.clientHeight + 4) return s; } return null; });
const bc = await cont.boundingBox();
if (scSel && bc.y + bc.height > H - 24) {
  const top = await page.evaluate((s) => document.querySelector(s).scrollTop, scSel);
  for (let i = 1; i <= 24; i++) { await page.evaluate(([s, y]) => { document.querySelector(s).scrollTop = y; }, [scSel, top + 420 * ease(i / 24)]); await tick(); }
  await hold(6);
}
mark('continuar');
await tap(cont, { n: 24, after: 2 });
for (let i = 0; i < 90 && !(await page.locator('text=Ya casi').count()); i++) await tick();
await hold(52);
mark('confirmacion');

// 5) enviar WhatsApp (se llega al botón y se aprieta; el video corta ahí)
const wa = page.locator('.modal a:has-text("Enviar WhatsApp")');
const sc2 = await page.evaluate(() => { for (const s of ['.modal', '.overlay']) { const e = document.querySelector(s); if (e && e.scrollHeight > e.clientHeight + 4) return s; } return null; });
if (sc2) {
  const top = await page.evaluate((s) => document.querySelector(s).scrollTop, sc2);
  const max = await page.evaluate((s) => { const e = document.querySelector(s); return e.scrollHeight - e.clientHeight; }, sc2);
  for (let i = 1; i <= 30; i++) { await page.evaluate(([s, y]) => { document.querySelector(s).scrollTop = y; }, [sc2, top + (max - top) * ease(i / 30)]); await tick(); }
  await hold(8);
}
const bw = await wa.boundingBox();
await moveTo(bw.x + bw.width / 2, bw.y + bw.height / 2, 26);
await hold(6);
await withTicks(() => page.mouse.down()); mark('tap-whatsapp'); await hold(12);
mark('fin');

fs.writeFileSync(OUT + '/marks.json', JSON.stringify({ fps: FPS, frames: frame, marks }, null, 1));
await browser.close();
console.log('OK frames:', frame);
