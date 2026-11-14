-- =============================================================================
-- AI Expert Chat · Migración 0001 · Esquema inicial
--
-- Compatible con PostgreSQL 13+ (Supabase, Docker o instalación local).
-- Es idempotente: se puede ejecutar con `npm run db:migrate` o pegar completa
-- en el SQL Editor de Supabase sin riesgo de duplicar objetos.
-- =============================================================================

create table if not exists schema_migrations (
  version     text primary key,
  applied_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- users: cuentas de la aplicación (autenticación propia con bcrypt + JWT)
-- -----------------------------------------------------------------------------
create table if not exists users (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null check (char_length(name) between 2 and 80),
  email          text        not null unique
                             check (email = lower(email) and char_length(email) <= 160),
  password_hash  text        not null,
  role           text        not null default 'USER' check (role in ('ADMIN', 'USER')),
  is_active      boolean     not null default true,
  token_version  integer     not null default 0,        -- se incrementa para invalidar sesiones
  failed_logins  integer     not null default 0,        -- intentos fallidos consecutivos
  locked_until   timestamptz,                           -- bloqueo temporal por fuerza bruta
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists users_role_idx        on users (role);
create index if not exists users_created_at_idx  on users (created_at desc);

-- -----------------------------------------------------------------------------
-- conversations: pertenecen a un usuario; se borran en cascada con él
-- -----------------------------------------------------------------------------
create table if not exists conversations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references users (id) on delete cascade,
  title       text        not null default 'Nueva conversación'
                          check (char_length(title) between 1 and 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists conversations_user_updated_idx on conversations (user_id, updated_at desc);

-- -----------------------------------------------------------------------------
-- messages: historial de cada conversación (USER = pregunta, ASSISTANT = respuesta)
-- -----------------------------------------------------------------------------
create table if not exists messages (
  id               uuid        primary key default gen_random_uuid(),
  seq              bigint      generated always as identity,   -- orden estable de los mensajes
  conversation_id  uuid        not null references conversations (id) on delete cascade,
  role             text        not null check (role in ('USER', 'ASSISTANT')),
  content          text        not null check (char_length(content) > 0),
  model            text,                                       -- modelo que generó la respuesta
  latency_ms       integer     check (latency_ms is null or latency_ms >= 0),
  feedback         smallint    check (feedback in (-1, 1)),    -- 👍 = 1, 👎 = -1
  created_at       timestamptz not null default now()
);
create index if not exists messages_conversation_seq_idx on messages (conversation_id, seq);
create index if not exists messages_created_at_idx       on messages (created_at);

-- -----------------------------------------------------------------------------
-- assistant_settings: configuración del asistente (una sola fila, editable por ADMIN)
-- -----------------------------------------------------------------------------
create table if not exists assistant_settings (
  id                   smallint     primary key default 1 check (id = 1),
  name                 text         not null,
  specialty            text         not null,
  system_prompt        text         not null,
  welcome_message      text         not null,
  suggested_questions  jsonb        not null default '[]'::jsonb,
  model                text,                                  -- null = usar el modelo del entorno
  temperature          numeric(3,2) not null default 0.40 check (temperature between 0 and 2),
  max_tokens           integer      not null default 2048 check (max_tokens between 64 and 8192),
  context_messages     integer      not null default 12   check (context_messages between 2 and 50),
  updated_at           timestamptz  not null default now(),
  updated_by           uuid         references users (id) on delete set null
);

-- -----------------------------------------------------------------------------
-- Seguridad en Supabase
-- Supabase expone por REST (PostgREST) las tablas del esquema `public`. Esta app
-- accede a la base solo desde el servidor con la conexión directa de Postgres, así
-- que se activa RLS sin políticas: los roles `anon` y `authenticated` (clave
-- pública) no pueden leer ni escribir nada. La conexión del servidor (rol
-- `postgres`, dueño de las tablas) no se ve afectada.
-- -----------------------------------------------------------------------------
alter table schema_migrations  enable row level security;
alter table users              enable row level security;
alter table conversations      enable row level security;
alter table messages           enable row level security;
alter table assistant_settings enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on schema_migrations, users, conversations, messages, assistant_settings from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on schema_migrations, users, conversations, messages, assistant_settings from authenticated;
  end if;
end
$$;

insert into schema_migrations (version) values ('0001_init') on conflict do nothing;
