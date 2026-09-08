import { conSesion, bd } from "./_comun.js";

/** Lista tickets. ?estado=borrador para la bandeja de revision.
 *  No devuelve la foto: se pide aparte a /api/foto para no cargar la lista. */
export default conSesion(async (req, res) => {
  const sql = bd();
  const estado = req.query?.estado;
  const tickets = estado
    ? await sql`select id, estado, jpg_tipo is not null as tiene_foto, ticket, fecha, campania,
                  poligono, parcela, subparcela, paraje, variedad, matricula_1, matricula_2,
                  kg_bruto, kg_tara, kg_neto, kg_estimado, grado_alc_probable, color, acidez,
                  ph, gluconico, to_char(hora_vendimia, 'HH24:MI') as hora_vendimia, temperatura_c, fuente_temperatura,
                  observaciones, dudas, creado_en
                from tickets where estado = ${estado} order by creado_en desc`
    : await sql`select id, estado, jpg_tipo is not null as tiene_foto, ticket, fecha, campania,
                  poligono, parcela, subparcela, paraje, variedad, matricula_1, matricula_2,
                  kg_bruto, kg_tara, kg_neto, kg_estimado, grado_alc_probable, color, acidez,
                  ph, gluconico, to_char(hora_vendimia, 'HH24:MI') as hora_vendimia, temperatura_c, fuente_temperatura,
                  observaciones, dudas, creado_en
                from tickets order by creado_en desc`;
  res.status(200).json({ tickets });
});
