import { crearCookie, sesionValida } from "./_comun.js";
import crypto from "node:crypto";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Informa que variables de entorno faltan, para que la puerta lo diga en vez
    // de fallar al intentar entrar. Solo nombres, nunca valores; y el repositorio
    // es publico, asi que no se revela nada que no se sepa ya.
    const faltan = [
      ["DATABASE_URL", process.env.DATABASE_URL || process.env.POSTGRES_URL],
      ["ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY],
      ["CLAVE_ACCESO", process.env.CLAVE_ACCESO],
    ].filter(([, v]) => !v).map(([n]) => n);
    res.status(200).json({ dentro: sesionValida(req), configurado: !faltan.length, faltan });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  const esperada = process.env.CLAVE_ACCESO;
  if (!esperada) {
    res.status(500).json({ error: "Falta configurar CLAVE_ACCESO en Vercel." });
    return;
  }
  const enviada = String(req.body?.clave ?? "");
  const a = Buffer.from(crypto.createHash("sha256").update(enviada).digest());
  const b = Buffer.from(crypto.createHash("sha256").update(esperada).digest());
  if (!crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: "Contraseña incorrecta." });
    return;
  }
  res.setHeader("Set-Cookie", crearCookie());
  res.status(200).json({ dentro: true });
}
