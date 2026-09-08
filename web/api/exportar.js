import { conSesion, bd } from "./_comun.js";

const COLUMNAS = ["ticket", "fecha", "campania", "poligono", "parcela", "subparcela",
  "paraje", "parcela_finca", "variedad", "incidencia", "matricula_1", "matricula_2",
  "kg_bruto", "kg_tara", "kg_neto", "kg_estimado", "grado_alc_probable", "color",
  "acidez", "ph", "gluconico", "hora_vendimia", "temperatura_c", "fuente_temperatura",
  "observaciones"];

const celda = v => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Descarga el registro confirmado como CSV, para archivarlo en el repositorio
 *  o abrirlo en una hoja de calculo sin depender de la base de datos. */
export default conSesion(async (req, res) => {
  const sql = bd();
  const filas = await sql`
    select t.ticket, t.fecha, t.campania, t.poligono, t.parcela, t.subparcela,
           coalesce(t.paraje, p.paraje) as paraje, p.nombre_finca as parcela_finca,
           t.variedad, t.incidencia, t.matricula_1, t.matricula_2,
           t.kg_bruto, t.kg_tara, t.kg_neto, t.kg_estimado,
           t.grado_alc_probable, t.color, t.acidez, t.ph, t.gluconico,
           to_char(t.hora_vendimia, 'HH24:MI') as hora_vendimia,
           t.temperatura_c, t.fuente_temperatura, t.observaciones
      from tickets t
      left join parcelas p
        on p.poligono = t.poligono and p.parcela = t.parcela
       and p.subparcela = coalesce(t.subparcela, '')
     where t.estado = 'confirmado'
     order by t.campania, t.fecha, t.ticket`;

  const csv = [COLUMNAS.join(","),
    ...filas.map(f => COLUMNAS.map(c => celda(f[c])).join(","))].join("\n") + "\n";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="albaranes.csv"');
  res.status(200).send(csv);
});
