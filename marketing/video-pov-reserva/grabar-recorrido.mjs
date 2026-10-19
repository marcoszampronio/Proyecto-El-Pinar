import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = '/tmp/claude-0/-home-user-Proyecto-El-Pinar/c0e3ac52-382c-5198-926a-ed0e80585669/scratchpad/pov';
const W = 540, H = 1170;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--ignore-certificate-errors'],
});
const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: OUT, size: { width: W, height: H } },
  locale: 'es-AR',
});

// Cursor de mouse (flecha) + efecto de clic.
await context.addInitScript(() => {
  const ARROW = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='34' height='34' viewBox='0 0 24 24'><path d='M4 2.5 L4 19.5 L8.4 15.6 L11.3 22 L14.2 20.7 L11.4 14.4 L17.2 14.4 Z' fill='white' stroke='%23111' stroke-width='1.6' stroke-linejoin='round'/></svg>\")";
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
const t0 = Date.now();
const marks = [];
const mark = (name) => { marks.push({ name, t: +((Date.now() - t0) / 1000).toFixed(2) }); console.log(name, marks.at(-1).t); };

// API simulada (no se escribe nada en la base real).
const TURNOS = { T1: ['20:30:00', '21:30:00'], T2: ['21:30:00', '22:30:00'], T3: ['22:30:00', '23:30:00'] };
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  const method = route.request().method();
  if (url.includes('dias-especiales')) return route.fulfill({ json: { fechas: [] } });
  if (url.includes('/rivals')) return route.fulfill({ json: [] });
  if (url.includes('/availability/futbol')) {
    return route.fulfill({ json: { court: 'C1', date: '2026-10-21', turnos: Object.entries(TURNOS).map(([turn, [start, end]]) => ({ turn, start, end, status: 'libre' })) } });
  }
  if (url.includes('/reservations/futbol') && method === 'POST') {
    const b = route.request().postDataJSON();
    const [start, end] = TURNOS[b.turn];
    await new Promise((r) => setTimeout(r, 700));
    return route.fulfill({ json: {
      reserva: { code: 'RES-DEMO', court: b.court, reservation_date: b.date, start_time: start, end_time: end, client_name: b.clientName },
      mensajeWhatsapp: 'demo', numeroWhatsapp: '5493435134744', aliasTransferencia: 'elpinar.canchas.mp', montoReserva: '$10.000', holdMinutos: 10,
    } });
  }
  return route.fulfill({ json: {} });
});

const sleep = (ms) => page.waitForTimeout(ms);

async function smoothScroll(to, dur, sel) {
  await page.evaluate(({ to, dur, sel }) => new Promise((res) => {
    const el = sel ? document.querySelector(sel) : null;
    const get = () => (el ? el.scrollTop : window.scrollY);
    const set = (v) => (el ? (el.scrollTop = v) : window.scrollTo(0, v));
    const from = get(); const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      set(from + (to - from) * e);
      p < 1 ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  }), { to, dur, sel });
}

let cur = { x: W * 0.6, y: H * 0.7 };
async function moveTo(x, y, ms = 650) {
  const n = Math.max(12, Math.round(ms / 22));
  const { x: x0, y: y0 } = cur;
  for (let i = 1; i <= n; i++) {
    const p = i / n; const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
    await sleep(ms / n);
  }
  cur = { x, y };
}
async function tap(loc, { dx = 0, dy = 0, ms = 650, after = 450 } = {}) {
  const b = await loc.boundingBox();
  await moveTo(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, ms);
  await sleep(120);
  await page.mouse.down(); await sleep(110); await page.mouse.up();
  await sleep(after);
}

await page.goto('https://complejo-el-pinar.pages.dev/', { waitUntil: 'networkidle', timeout: 45000 });
await page.mouse.move(cur.x, cur.y);
await sleep(1600);
mark('landing');

// 1) Scroll hacia abajo hasta la sección de reservas
await smoothScroll(480, 1800); await sleep(400);
const yBoard = await page.evaluate(() => document.querySelector('#reservar').getBoundingClientRect().top + window.scrollY);
await smoothScroll(yBoard, 2300); await sleep(900);
mark('board');

// 2) Fútbol 11 -> próxima semana -> miércoles -> turno
await tap(page.locator('.cancha-card').first());
mark('deporte');
const dias = page.locator('.dia-btn:not(.no-habilitado)');
await tap(dias.nth(1), { after: 800 });
mark('dia');
const celda = page.locator('.grilla-pub-celda.libre').nth(3);
await tap(celda, { ms: 800, after: 1100 });
mark('turno');

// 3) Datos
const nombre = page.locator('.modal input[placeholder="Tu nombre y apellido"]');
await tap(nombre); await page.keyboard.type('Juan Pérez', { delay: 95 }); await sleep(250);
mark('nombre');
await tap(page.locator('.modal input[placeholder="343"]'), { ms: 500 }); await page.keyboard.type('343', { delay: 110 });
await tap(page.locator('.modal .tel-num'), { ms: 450 }); await page.keyboard.type('5134744', { delay: 95 }); await sleep(250);
mark('telefono');
const emailInp = page.locator('.modal input[placeholder="Para recibir la confirmación"]');
if (await emailInp.count()) { await tap(emailInp, { ms: 500 }); await page.keyboard.type('juan.perez@gmail.com', { delay: 70 }); await sleep(500); }
mark('email');

// 4) Continuar (scroll suave dentro del modal si hace falta)
const cont = page.locator('.modal button:has-text("Continuar")');
const bc = await cont.boundingBox();
if (bc.y + bc.height > H - 20) {
  const sc = await page.evaluate(() => { const m = document.querySelector('.modal'); return m && m.scrollHeight > m.clientHeight ? '.modal' : (document.querySelector('.overlay') && document.querySelector('.overlay').scrollHeight > document.querySelector('.overlay').clientHeight ? '.overlay' : null); });
  if (sc) { const top = await page.evaluate((s) => document.querySelector(s).scrollTop, sc); await smoothScroll(top + 420, 900, sc); await sleep(300); }
}
mark('continuar-visible');
await tap(cont, { ms: 700, after: 1000 });
await page.waitForSelector('text=Ya casi', { timeout: 8000 });
await sleep(1600);
mark('confirmacion');

// 5) Enviar WhatsApp (no se hace el click real: el video corta ahí)
const wa = page.locator('.modal a:has-text("Enviar WhatsApp")');
const scSel = await page.evaluate(() => { for (const s of ['.modal', '.overlay']) { const e = document.querySelector(s); if (e && e.scrollHeight > e.clientHeight + 4) return s; } return null; });
if (scSel) { await smoothScroll(99999, 1500, scSel); await sleep(600); }
const bw = await wa.boundingBox();
await moveTo(bw.x + bw.width / 2, bw.y + bw.height / 2, 800);
await sleep(500);
await page.mouse.down(); await sleep(120);
mark('tap-whatsapp');
await sleep(500);
mark('fin');

const videoPath = await page.video().path();
await context.close();
await browser.close();
fs.renameSync(videoPath, OUT + '/pov-raw.webm');
fs.writeFileSync(OUT + '/marks.json', JSON.stringify(marks, null, 1));
console.log('OK', OUT + '/pov-raw.webm');
