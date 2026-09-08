import { conSesion, bd } from "./_comun.js";

/** Devuelve la foto de un ticket. Exige sesion, igual que el resto. */
export default conSesion(async (req, res) => {
  const id = Number(req.query?.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Identificador no válido." });
    return;
  }
  const sql = bd();
  const [fila] = await sql`select encode(jpg, 'base64') as b64, jpg_tipo
                           from tickets where id = ${id}`;
  if (!fila?.b64) {
    res.status(404).json({ error: "Ese ticket no tiene foto." });
    return;
  }
  res.setHeader("Content-Type", fila.jpg_tipo || "image/jpeg");
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.status(200).send(Buffer.from(fila.b64, "base64"));
});
