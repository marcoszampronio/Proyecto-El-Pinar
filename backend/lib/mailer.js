import nodemailer from 'nodemailer';
import 'dotenv/config';

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Que no se cuelgue si Gmail no responde (credencial mala, red, etc.)
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

function conTimeout(promesa, ms, mensaje) {
  return Promise.race([
    promesa,
    new Promise((_, rej) => setTimeout(() => rej(new Error(mensaje)), ms)),
  ]);
}

// Chequea si el SMTP está bien configurado y puede conectar con Gmail.
export async function verificarSmtp() {
  const usuario = process.env.SMTP_USER || null;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { configurado: false, usuario, ok: false, error: 'Faltan SMTP_USER o SMTP_PASS' };
  }
  try {
    const t = getTransporter();
    await conTimeout(t.verify(), 15000, 'El servidor de mail no respondió (timeout)');
    return { configurado: true, usuario, ok: true, error: null };
  } catch (e) {
    return { configurado: true, usuario, ok: false, error: e.message };
  }
}

async function enviar({ to, subject, html, attachments }) {
  const t = getTransporter();
  if (!t) {
    console.log('[mailer] SMTP no configurado. Simulando envio a:', to);
    console.log('[mailer] Asunto:', subject);
    return { simulado: true };
  }
  return t.sendMail({
    from: `"Complejo El Pinar" <${process.env.SMTP_USER || 'turnoselpinar@gmail.com'}>`,
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
        <p style="color:#999;font-size:12px;margin:0;">Complejo El Pinar · turnoselpinar@gmail.com</p>
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
        <p style="color:#999;font-size:12px;margin:0;">Complejo El Pinar · turnoselpinar@gmail.com</p>
      </div>
    `,
  });
}
