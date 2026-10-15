-- Recordatorios de turnos fijos por WhatsApp (Fase 2).
-- Mateo les manda el recordatorio a mano desde el panel (botón que abre WhatsApp con el
-- mensaje armado); acá queda marcado cuándo se hizo, para no mandarlo dos veces.
alter table public.reservations add column if not exists recordatorio_enviado_at timestamptz;

-- Para deshacer (no hace falta normalmente):
-- alter table public.reservations drop column recordatorio_enviado_at;
