import { conSesion, bd } from "./_comun.js";

const CAMPOS = [
  "ticket", "fecha", "campania", "poligono", "parcela", "subparcela", "paraje",
  "variedad", "incidencia", "matricula_1", "matricula_2",
  "kg_bruto", "kg_tara", "kg_neto", "kg_estimado",
  "grado_alc_probable", "color", "acidez", "ph", "gluconico",
  "hora_vendimia", "temperatura_c", "fuente_temperatura", "observaciones",
];

/** Guarda las correcciones del revisor y confirma o descarta el borrador. */
export default conSesion(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  const { id, accion, campos } = req.body || {};
  if (!id) {
    res.status(400).json({ error: "Falta el identificador del borrador." });
    return;
  }
  const sql = bd();

  if (accion === "descartar") {
    await sql`update tickets set estado = 'descartado' where id = ${id}`;
    res.status(200).json({ ok: true });
    return;
  }

  const cambios = {};
  for (const c of CAMPOS) {
    if (campos && c in campos) cambios[c] = campos[c] === "" ? null : campos[c];
  }

  // Un neto que no cuadra con la pesada no entra al registro.
  const { kg_bruto: b, kg_tara: t, kg_neto: n } = cambios;
  if ([b, t, n].every(v => v != null) && Number(b) - Number(t) !== Number(n)) {
    res.status(400).json({
      error: `La pesada no cuadra: ${b} − ${t} = ${Number(b) - Number(t)}, `
        + `pero el neto dice ${n}. Corrígelo antes de confirmar.`,
    });
    return;
  }

  // Una sola sentencia parametrizada: los nombres de columna salen de CAMPOS,
  // nunca del cuerpo de la peticion, y los valores van como parametros.
  const columnas = CAMPOS.filter(c => c in cambios);
  const asignaciones = columnas.map((c, i) => `${c} = $${i + 2}`).join(", ");
  const valores = columnas.map(c => cambios[c]);
  const consulta = `update tickets set ${asignaciones}${columnas.length ? ", " : ""}`
    + `estado = 'confirmado', confirmado_en = now() where id = $1 returning id, ticket`;

  try {
    const filas = await sql.query(consulta, [id, ...valores]);
    if (!filas.length) {
      res.status(404).json({ error: "Ese borrador ya no existe." });
      return;
    }
    res.status(200).json({ ticket: filas[0] });
  } catch (e) {
    if (e.code === "23505") {
      res.status(409).json({ error: "Ese número de ticket ya está confirmado en esta campaña." });
      return;
    }
    throw e;
  }
});
