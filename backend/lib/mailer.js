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
    });
  }
  return transporter;
}

async function enviar({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.log('[mailer] SMTP no configurado. Simulando envio a:', to);
    console.log('[mailer] Asunto:', subject);
    return { simulado: true };
  }
  return t.sendMail({
    from: '"Complejo El Pinar" <turnoselpinar@gmail.com>',
    to,
    subject,
    html,
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
