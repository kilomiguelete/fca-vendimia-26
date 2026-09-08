-- Esquema del registro de vendimia en Supabase.
-- Ejecutar entero en el SQL Editor del proyecto (Database -> SQL Editor -> New query).

-- 1. Tabla de tickets ---------------------------------------------------------
create table if not exists public.tickets (
  id             uuid primary key default gen_random_uuid(),
  estado         text not null default 'borrador'
                   check (estado in ('borrador', 'confirmado', 'descartado')),
  jpg_ruta       text,                 -- ruta dentro del bucket 'tickets'
  ticket         text,
  fecha          date,
  campania       text,
  poligono       text,
  parcela        text,
  subparcela     text,
  paraje         text,
  variedad       text,
  matricula_1    text,
  matricula_2    text,
  kg_bruto       integer,
  kg_tara        integer,
  kg_neto        integer,
  kg_estimado    integer,
  grado_alc_probable numeric(5,2),
  color          numeric(5,2),
  acidez         numeric(5,2),
  ph             numeric(4,2),
  gluconico      numeric(5,2),
  incidencia     text,
  -- Campos que el ticket no imprime y se completan a mano o desde el parte de campo
  hora_vendimia  time,
  temperatura_c  numeric(4,1),
  fuente_temperatura text,
  observaciones  text,
  dudas          jsonb default '[]'::jsonb,   -- lo que la extraccion no vio claro
  extraccion     jsonb,                        -- respuesta cruda, para auditar
  creado_en      timestamptz not null default now(),
  confirmado_en  timestamptz
);

-- Un ticket confirmado no puede entrar dos veces. Los borradores si pueden
-- repetirse: la misma foto subida dos veces se resuelve al revisar.
create unique index if not exists tickets_numero_unico
  on public.tickets (ticket, campania) where estado = 'confirmado';

create index if not exists tickets_estado on public.tickets (estado, creado_en desc);

-- 2. Maestro de parcelas ------------------------------------------------------
create table if not exists public.parcelas (
  poligono     text not null,
  parcela      text not null,
  subparcela   text not null default '',
  nombre_finca text,
  paraje       text,
  variedad     text,
  regimen      text,
  ecologico    boolean default true,
  superficie_ha numeric(6,2),
  notas        text,
  primary key (poligono, parcela, subparcela)
);

-- 3. Acceso -------------------------------------------------------------------
-- Todo pasa por las funciones del servidor con la service_role key, que salta
-- RLS. Se activa RLS sin politicas publicas para que la clave anonima no pueda
-- leer ni escribir nada directamente.
alter table public.tickets  enable row level security;
alter table public.parcelas enable row level security;

-- 4. Almacen de los JPG -------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', false)
on conflict (id) do nothing;
