import { conSesion, bd } from "./_comun.js";

/** Filas confirmadas, con parcela y variedad ya resueltas contra el maestro.
 *  La agregacion la hace el navegador: una sola implementacion del calculo. */
export default conSesion(async (req, res) => {
  const sql = bd();
  const filas = await sql`
    select t.id, t.jpg_tipo is not null as tiene_foto, t.ticket, t.fecha, t.campania,
           concat_ws('/', t.poligono, t.parcela, t.subparcela) as ref_sigpac,
           p.nombre_finca            as parcela,
           coalesce(t.paraje, p.paraje) as paraje,
           coalesce(p.variedad, t.variedad, '') as variedad,
           p.regimen,
           t.kg_neto                 as kg,
           t.kg_bruto, t.kg_tara,
           t.grado_alc_probable::float8 as grado,
           t.color::float8           as color,
           t.ph::float8              as ph,
           t.acidez::float8          as acidez,
           nullif(concat_ws(' - ', t.matricula_1, t.matricula_2), '') as matriculas,
           to_char(t.hora_vendimia, 'HH24:MI') as hora,
           t.temperatura_c::float8   as temperatura,
           t.observaciones
      from tickets t
      left join parcelas p
        on p.poligono = t.poligono and p.parcela = t.parcela
       and p.subparcela = coalesce(t.subparcela, '')
     where t.estado = 'confirmado'
     order by t.campania, t.fecha, t.ticket`;

  res.status(200).json({
    finca: "Finca Casa Aparicio S.L.",
    bodega: "Santa Cruz de Alpera S. Coop. de C-L-M",
    filas,
  });
});
