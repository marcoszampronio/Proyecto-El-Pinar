-- Reserva "firme" al apretar "Enviar WhatsApp".
-- Al apretar "Continuar" el turno se guarda unos minutos (HOLD_SIN_WHATSAPP_MIN, 10 por
-- defecto); si la persona aprieta "Enviar WhatsApp", se marca acá y el turno queda
-- reservado esperando el comprobante. Si nunca lo aprieta, el servidor libera el turno.
alter table public.reservations add column if not exists whatsapp_enviado_at timestamptz;

-- Las reservas pendientes que ya existen (flujo anterior) se consideran ya enviadas,
-- para que el nuevo vencimiento corto no las cancele por error.
update public.reservations
   set whatsapp_enviado_at = created_at
 where status = 'pendiente' and whatsapp_enviado_at is null;

-- Para deshacer (no hace falta normalmente):
-- alter table public.reservations drop column whatsapp_enviado_at;
