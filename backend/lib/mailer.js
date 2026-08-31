import nodemailer from 'nodemailer';
import 'dotenv/config';

// Proveedor de email. Render (y muchos hosts) bloquean SMTP, asi que en
// produccion se usa la API HTTP de Brevo. SMTP queda como opcion para local
// o para hosts que lo permitan.
//
//   BREVO_API_KEY   -> usa la API de Brevo (recomendado en Render)
//   SMTP_USER/PASS  -> usa SMTP (Gmail, etc.)
//   nada            -> simula el envio (lo imprime en consola)
//
// EMAIL_FROM / EMAIL_FROM_NAME: direccion y nombre del remitente.

const FROM_EMAIL = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@elpinar.app';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Complejo El Pinar';

function conTimeout(promesa, ms, mensaje) {
  return Promise.race([
    promesa,
    new Promise((_, rej) => setTimeout(() => rej(new Error(mensaje)), ms)),
  ]);
}

// ---------- Brevo (API HTTP) ----------
async function enviarViaBrevo({ to, subject, html, attachments }) {
  const destinatarios = (Array.isArray(to) ? to : [to]).filter(Boolean).map((email) => ({ email }));
  const body = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: destinatarios,
    subject,
    htmlContent: html,
  };
  if (attachments && attachments.length) {
    body.attachment = attachments.map((a) => ({
      name: a.filename,
      content: Buffer.from(a.content).toString('base64'),
    }));
  }

  const res = await conTimeout(
    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    }),
    15000,
    'Brevo no respondió (timeout)'
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Brevo respondió ${res.status}: ${txt.slice(0, 200)}`);
  }
  return { via: 'brevo' };
}

// ---------- SMTP ----------
let transporter = null;
function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

// ---------- Chequeo de estado ----------
export async function verificarEmail() {
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await conTimeout(
        fetch('https://api.brevo.com/v3/account', {
          headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json' },
        }),
        10000,
        'Brevo no respondió (timeout)'
      );
      if (res.ok) {
        const acc = await res.json().catch(() => ({}));
        const email = acc?.email ? ` (cuenta ${acc.email})` : '';
        return { configurado: true, proveedor: 'Brevo', remitente: FROM_EMAIL, ok: true, error: null, detalle: email };
      }
      const txt = await res.text().catch(() => '');
      let msg = txt;
      try { msg = JSON.parse(txt).message || txt; } catch { /* txt como está */ }
      const pista = res.status === 401
        ? ' — revisá que sea la API key v3 (empieza con "xkeysib-"), de la pestaña API Keys, sin espacios'
        : '';
      return {
        configurado: true, proveedor: 'Brevo', remitente: FROM_EMAIL, ok: false,
        error: `${res.status}: ${String(msg).slice(0, 120)}${pista}`,
      };
    } catch (e) {
      return { configurado: true, proveedor: 'Brevo', remitente: FROM_EMAIL, ok: false, error: e.message };
    }
  }
  const usuario = process.env.SMTP_USER || null;
  if (!usuario || !process.env.SMTP_PASS) {
    return { configurado: false, proveedor: null, remitente: null, ok: false, error: 'Sin configurar (falta BREVO_API_KEY o SMTP_USER/PASS)' };
  }
  try {
    await conTimeout(getTransporter().verify(), 15000, 'El servidor SMTP no respondió (timeout)');
    return { configurado: true, proveedor: 'SMTP', remitente: usuario, ok: true, error: null };
  } catch (e) {
    return { configurado: true, proveedor: 'SMTP', remitente: usuario, ok: false, error: e.message };
  }
}
// alias viejo
export const verificarSmtp = verificarEmail;

// ---------- Envío ----------
async function enviar({ to, subject, html, attachments }) {
  if (process.env.BREVO_API_KEY) {
    return enviarViaBrevo({ to, subject, html, attachments });
  }
  const t = getTransporter();
  if (!t) {
    console.log('[mailer] Sin proveedor de email. Simulando envio a:', to, '|', subject);
    return { simulado: true };
  }
  return t.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    attachments,
  });
}

// Backup diario: manda el CSV completo de reservas por email a los admins.
export async function enviarBackup({ para, csv, fecha, total }) {
  return enviar({
    to: para,
    subject: `Backup reservas El Pinar — ${fecha}`,
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
        <p>Backup automático del ${fecha}.</p>
        <p><strong>${total}</strong> reserva(s) en total. El detalle va adjunto en el CSV
        (se abre con Excel). Guardalo o arrastralo a tu Drive si querés tener copia ahí.</p>
      </div>`,
    attachments: [{ filename: `reservas-${fecha}.csv`, content: csv, contentType: 'text/csv; charset=utf-8' }],
  });
}

// Aviso a los administradores: entró una nueva solicitud de reserva (pendiente).
export async function enviarAvisoNuevaReserva(reserva) {
  const para = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);
  if (!para.length) return { omitido: 'sin ADMIN_EMAILS' };

  const cancha = reserva.court === 'PAD' ? 'Pádel' : `Cancha ${reserva.court.slice(1)}`;
  const hs = `${reserva.start_time.slice(0, 5)} a ${reserva.end_time.slice(0, 5)}`;
  const extras = [
    reserva.looking_for_rival ? `Busca rival: ${reserva.team_name || '(sin nombre)'}${reserva.category ? ` — ${reserva.category}` : ''}` : null,
    reserva.parrilla ? 'Pidió parrilla 🔥' : null,
  ].filter(Boolean);

  return enviar({
    to: para,
    subject: `🔔 Nueva solicitud: ${cancha} ${reserva.reservation_date} ${reserva.start_time.slice(0, 5)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">
        <h2 style="margin-top:0;color:#123C6E;">Nueva solicitud de reserva</h2>
        <p style="color:#555;">Alguien reservó y va a mandar el comprobante por WhatsApp. Está <strong>pendiente de tu confirmación</strong>.</p>
        <div style="background:#f6f4ea;border-radius:8px;padding:14px;margin:14px 0;">
          <p style="margin:4px 0;"><strong>${cancha}</strong> · ${reserva.reservation_date} · ${hs} hs</p>
          <p style="margin:4px 0;">${reserva.client_name} · ${reserva.client_phone}${reserva.client_email ? ` · ${reserva.client_email}` : ''}</p>
          ${extras.map((x) => `<p style="margin:4px 0;color:#7A6A4F;">${x}</p>`).join('')}
          <p style="margin:8px 0 0;"><strong>Código:</strong> <span style="font-family:monospace;">${reserva.code}</span></p>
        </div>
        ${process.env.PANEL_URL ? `
        <p style="text-align:center;margin:18px 0;">
          <a href="${process.env.PANEL_URL}?tab=buscar&code=${encodeURIComponent(reserva.code)}"
             style="background:#123C6E;color:#E4CF9C;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block;">
            Abrir en el panel
          </a>
        </p>
        <p style="color:#999;font-size:12px;">El link te lleva directo a esta reserva. Confirmá o cancelá cuando te llegue el comprobante.</p>
        ` : `<p style="color:#555;font-size:13px;">Entrá al panel, pegá el código y confirmá (o cancelá) cuando te llegue el comprobante.</p>`}
      </div>`,
  });
}

export async function enviarEmailConfirmacion(reserva) {
  if (!reserva.client_email) return { omitido: 'sin email' };

  const cancha =
    reserva.court === 'PAD' ? 'Pádel' : `Cancha ${reserva.court.slice(1)}`;

  return enviar({
    to: reserva.client_email,
    subject: '✅ Tu turno está confirmado — Complejo El Pinar',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f6f4ea;border-radius:12px;">
        <h2 style="color:#122A1C;margin-top:0;">¡Tu turno está confirmado!</h2>
        <p style="color:#333;">Hola <strong>${reserva.client_name}</strong>, te confirmamos tu reserva:</p>

        <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #2E6B4F;">
          <p style="margin:4px 0;"><strong>Cancha:</strong> ${cancha}</p>
          <p style="margin:4px 0;"><strong>Fecha:</strong> ${reserva.reservation_date}</p>
          <p style="margin:4px 0;"><strong>Horario:</strong> ${reserva.start_time.slice(0,5)} a ${reserva.end_time.slice(0,5)} hs</p>
          ${reserva.parrilla ? '<p style="margin:4px 0;"><strong>Parrilla:</strong> incluida para asado 🔥</p>' : ''}
          <p style="margin:4px 0;"><strong>Código de reserva:</strong> <span style="font-family:monospace;font-weight:bold;">${reserva.code}</span></p>
        </div>

        <p style="color:#555;font-size:14px;">Guardá este email como comprobante. Si necesitás cancelar, escribinos por WhatsApp con tu código de reserva.</p>
        <p style="color:#2E6B4F;font-weight:bold;">¡Te esperamos!</p>
        <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
        <p style="color:#999;font-size:12px;margin:0;">Complejo El Pinar · ${FROM_EMAIL}</p>
      </div>
    `,
  });
}

export async function enviarEmailCancelacion(reserva) {
  if (!reserva.client_email) return { omitido: 'sin email' };

  const cancha =
    reserva.court === 'PAD' ? 'Pádel' : `Cancha ${reserva.court.slice(1)}`;

  return enviar({
    to: reserva.client_email,
    subject: '❌ Tu turno fue cancelado — Complejo El Pinar',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f6f4ea;border-radius:12px;">
        <h2 style="color:#B3382E;margin-top:0;">Tu turno fue cancelado</h2>
        <p style="color:#333;">Hola <strong>${reserva.client_name}</strong>, te informamos que tu reserva fue cancelada:</p>

        <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #B3382E;">
          <p style="margin:4px 0;"><strong>Cancha:</strong> ${cancha}</p>
          <p style="margin:4px 0;"><strong>Fecha:</strong> ${reserva.reservation_date}</p>
          <p style="margin:4px 0;"><strong>Horario:</strong> ${reserva.start_time.slice(0,5)} a ${reserva.end_time.slice(0,5)} hs</p>
          <p style="margin:4px 0;"><strong>Código:</strong> <span style="font-family:monospace;">${reserva.code}</span></p>
        </div>

        <p style="color:#555;font-size:14px;">Si tenés alguna duda, escribinos por WhatsApp.</p>
        <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
        <p style="color:#999;font-size:12px;margin:0;">Complejo El Pinar · ${FROM_EMAIL}</p>
      </div>
    `,
  });
}
