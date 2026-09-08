import { conSesion, bd } from "./_comun.js";

/** Lista las parcelas y guarda su nombre propio.
 *  Incluye las que aparecen en tickets pero aun no estan en el maestro: son
 *  justo las que hace falta bautizar. */
export default conSesion(async (req, res) => {
  const sql = bd();

  if (req.method === "GET") {
    const parcelas = await sql`
      with vistas as (
        select t.poligono, t.parcela, coalesce(t.subparcela, '') as subparcela,
               count(*)::int as descargas, coalesce(sum(t.kg_neto), 0)::int as kg,
               min(t.fecha) as primera, max(t.fecha) as ultima,
               max(t.variedad) as variedad_ticket,
               count(distinct t.campania)::int as campanias
          from tickets t
         where t.estado = 'confirmado'
         group by 1, 2, 3
      )
      select coalesce(v.poligono, p.poligono)     as poligono,
             coalesce(v.parcela, p.parcela)       as parcela,
             coalesce(v.subparcela, p.subparcela) as subparcela,
             p.nombre_finca,
             coalesce(p.variedad, v.variedad_ticket) as variedad,
             p.regimen, p.superficie_ha,
             coalesce(v.descargas, 0) as descargas,
             coalesce(v.kg, 0)        as kg,
             coalesce(v.campanias, 0) as campanias,
             v.primera, v.ultima
        from vistas v
        full outer join parcelas p
          on p.poligono = v.poligono and p.parcela = v.parcela
         and p.subparcela = v.subparcela
       order by coalesce(v.kg, 0) desc, 1, 2, 3`;
    res.status(200).json({ parcelas });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const { poligono, parcela, subparcela, nombre_finca, superficie_ha } = req.body || {};
  if (!poligono || !parcela) {
    res.status(400).json({ error: "Falta la referencia de la parcela." });
    return;
  }
  const nombre = (nombre_finca ?? "").trim() || null;

  // La superficie solo se toca si viene en la peticion: asi el formulario de
  // revision, que solo manda el nombre, no borra unas hectareas ya puestas.
  const tocaSuperficie = "superficie_ha" in (req.body || {});
  let ha = null;
  if (tocaSuperficie && superficie_ha !== null && String(superficie_ha).trim() !== "") {
    ha = Number(String(superficie_ha).replace(",", "."));
    if (!Number.isFinite(ha) || ha <= 0) {
      res.status(400).json({ error: "La superficie tiene que ser un número mayor que cero." });
      return;
    }
  }

  const [fila] = tocaSuperficie
    ? await sql`
        insert into parcelas (poligono, parcela, subparcela, nombre_finca, superficie_ha)
        values (${poligono}, ${parcela}, ${subparcela ?? ""}, ${nombre}, ${ha})
        on conflict (poligono, parcela, subparcela)
        do update set nombre_finca = excluded.nombre_finca,
                      superficie_ha = excluded.superficie_ha
        returning poligono, parcela, subparcela, nombre_finca, superficie_ha`
    : await sql`
        insert into parcelas (poligono, parcela, subparcela, nombre_finca)
        values (${poligono}, ${parcela}, ${subparcela ?? ""}, ${nombre})
        on conflict (poligono, parcela, subparcela)
        do update set nombre_finca = excluded.nombre_finca
        returning poligono, parcela, subparcela, nombre_finca, superficie_ha`;
  res.status(200).json({ parcela: fila });
});
