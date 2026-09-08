import { conSesion, supabase } from "./_comun.js";

const ref = t => [t.poligono, t.parcela, t.subparcela].filter(Boolean).join("/");

/** Filas confirmadas, con la parcela y la variedad ya resueltas contra los
 *  maestros. La agregacion la hace el navegador, igual que con datos.js. */
export default conSesion(async (req, res) => {
  const db = supabase();
  const [{ data: tickets, error: e1 }, { data: parcelas, error: e2 }] = await Promise.all([
    db.from("tickets").select("*").eq("estado", "confirmado").order("fecha"),
    db.from("parcelas").select("*"),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const maestro = Object.fromEntries((parcelas || []).map(p => [ref(p), p]));

  const filas = (tickets || []).map(t => {
    const clave = ref(t);
    const m = maestro[clave] || {};
    return {
      ticket: t.ticket,
      fecha: t.fecha,
      campania: t.campania,
      ref_sigpac: clave,
      parcela: m.nombre_finca || null,
      paraje: t.paraje || m.paraje || null,
      variedad: m.variedad || t.variedad || "",
      regimen: m.regimen || null,
      kg: t.kg_neto,
      kg_bruto: t.kg_bruto,
      kg_tara: t.kg_tara,
      grado: t.grado_alc_probable == null ? null : Number(t.grado_alc_probable),
      color: t.color == null ? null : Number(t.color),
      ph: t.ph == null ? null : Number(t.ph),
      acidez: t.acidez == null ? null : Number(t.acidez),
      matriculas: [t.matricula_1, t.matricula_2].filter(Boolean).join(" - "),
      hora: t.hora_vendimia ? String(t.hora_vendimia).slice(0, 5) : null,
      temperatura: t.temperatura_c == null ? null : Number(t.temperatura_c),
      observaciones: t.observaciones || null,
    };
  });

  res.status(200).json({
    finca: "Finca Casa Aparicio S.L.",
    bodega: "Santa Cruz de Alpera S. Coop. de C-L-M",
    filas,
  });
});
