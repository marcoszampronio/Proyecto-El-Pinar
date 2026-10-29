-- Avisos de seguridad de las cuentas: alguien pidió recuperar su contraseña o la cambió.
-- Supabase no guarda esto en una tabla que podamos leer, así que un trigger sobre auth.users lo anota acá.
-- El servidor revisa esta tabla (junto con los otros avisos programados) y le manda un aviso al celular
-- al usuario de las alertas. Cada evento se avisa una sola vez (`avisado_at`).

create table if not exists public.eventos_cuenta (
  id bigserial primary key,
  tipo text not null check (tipo in ('clave_pedida', 'clave_cambiada')),
  email text not null,
  created_at timestamptz not null default now(),
  avisado_at timestamptz
);

alter table public.eventos_cuenta enable row level security; -- sin policies: solo el servidor (service role) la lee

create index if not exists eventos_cuenta_sin_avisar_idx on public.eventos_cuenta (created_at) where avisado_at is null;

create or replace function public.registrar_evento_cuenta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- nunca debe romper el inicio de sesión ni el cambio de contraseña: si algo falla, se ignora
  begin
    if new.recovery_sent_at is not null and new.recovery_sent_at is distinct from old.recovery_sent_at then
      insert into public.eventos_cuenta (tipo, email) values ('clave_pedida', lower(new.email));
    end if;
    if new.encrypted_password is distinct from old.encrypted_password then
      insert into public.eventos_cuenta (tipo, email) values ('clave_cambiada', lower(new.email));
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

revoke all on function public.registrar_evento_cuenta() from public, anon, authenticated;

drop trigger if exists registrar_evento_cuenta on auth.users;
create trigger registrar_evento_cuenta
  after update of encrypted_password, recovery_sent_at on auth.users
  for each row execute function public.registrar_evento_cuenta();

-- el servidor (service role) la lee y marca los eventos como avisados
grant select, update on public.eventos_cuenta to service_role;
grant usage, select on sequence public.eventos_cuenta_id_seq to service_role;
