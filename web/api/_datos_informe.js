import { bd } from "./_comun.js";

/** Filas confirmadas de una campana, con la parcela resuelta. */
export async function datosInforme(dia) {
  const sql = bd();
  const todas = await sql`
    select t.ticket, to_char(t.fecha, 'YYYY-MM-DD') as fecha, t.campania,
           concat_ws('/', t.poligono, t.parcela, t.subparcela) as ref_sigpac,
           p.nombre_finca as parcela,
           coalesce(t.variedad, '') as variedad,
           t.kg_neto as kg,
           t.grado_alc_probable::float8 as grado,
           t.color::float8 as color,
           to_char(t.hora_vendimia, 'HH24:MI') as hora
      from tickets t
      left join parcelas p
        on p.poligono = t.poligono and p.parcela = t.parcela
       and p.subparcela = coalesce(t.subparcela, '')
     where t.estado = 'confirmado'
     order by t.campania, t.fecha, t.ticket`;

  const delDia = todas.filter(f => f.fecha === dia);
  // La campana del informe es la del dia; si ese dia no tuvo entradas, la ultima.
  const campania = delDia[0]?.campania
    || [...new Set(todas.map(f => f.campania))].sort().pop()
    || "—";
  return {
    finca: "Finca Casa Aparicio S.L.",
    bodega: "Santa Cruz de Alpera S. Coop. de C-L-M",
    campania, dia,
    descargas: delDia,
    campana: todas.filter(f => f.campania === campania),
  };
}

/** Hoy en la hora peninsular, que es la que marca el final de la jornada. */
export function hoyEnEspana() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
}
