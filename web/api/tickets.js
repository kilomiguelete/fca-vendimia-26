import { conSesion, supabase } from "./_comun.js";

/** Lista tickets. ?estado=borrador para la bandeja de revision. */
export default conSesion(async (req, res) => {
  const db = supabase();
  const estado = req.query?.estado;
  let consulta = db.from("tickets").select("*").order("creado_en", { ascending: false });
  if (estado) consulta = consulta.eq("estado", estado);
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);

  // Enlace temporal a cada foto: el bucket es privado.
  const conFoto = await Promise.all(data.map(async t => {
    if (!t.jpg_ruta) return t;
    const { data: firmada } = await db.storage
      .from("tickets").createSignedUrl(t.jpg_ruta, 3600);
    return { ...t, jpg_url: firmada?.signedUrl || null };
  }));
  res.status(200).json({ tickets: conFoto });
});
