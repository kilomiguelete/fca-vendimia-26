-- Esquema del registro de vendimia (Postgres / Neon).
-- Ejecutar entero una vez, en la consola SQL de la base de datos.

create table if not exists tickets (
  id             bigserial primary key,
  estado         text not null default 'borrador'
                   check (estado in ('borrador', 'confirmado', 'descartado')),
  jpg            bytea,                -- la foto vive aqui: mismo control de acceso que el dato
  jpg_tipo       text,
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
  -- El ticket de bascula no imprime hora ni temperatura: se completan a mano
  hora_vendimia  time,
  temperatura_c  numeric(4,1),
  fuente_temperatura text,
  observaciones  text,
  dudas          jsonb not null default '[]'::jsonb,
  extraccion     jsonb,
  creado_en      timestamptz not null default now(),
  confirmado_en  timestamptz
);

-- Un ticket confirmado no puede entrar dos veces. Los borradores si pueden
-- repetirse: la misma foto subida dos veces se resuelve al revisar.
create unique index if not exists tickets_numero_unico
  on tickets (ticket, campania) where estado = 'confirmado';
create index if not exists tickets_estado on tickets (estado, creado_en desc);

create table if not exists parcelas (
  poligono      text not null,
  parcela       text not null,
  subparcela    text not null default '',
  nombre_finca  text,
  paraje        text,
  variedad      text,
  regimen       text,
  ecologico     boolean default true,
  superficie_ha numeric(6,2),
  notas         text,
  primary key (poligono, parcela, subparcela)
);
