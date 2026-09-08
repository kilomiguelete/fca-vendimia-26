import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

/** Conexion a Postgres. La integracion de Vercel inyecta una de las dos. */
export function bd() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  return neon(url);
}

const COOKIE = "vendimia_sesion";

function secretoSesion() {
  return process.env.SECRETO_SESION || process.env.CLAVE_ACCESO || null;
}

function firmar(valor) {
  const secreto = secretoSesion();
  if (!secreto) throw new Error("Falta SECRETO_SESION o CLAVE_ACCESO");
  return crypto.createHmac("sha256", secreto).update(valor).digest("hex");
}

/** Cookie firmada: <caducidad>.<hmac>. Sin base de datos de sesiones. */
export function crearCookie(dias = 30) {
  const caduca = Date.now() + dias * 86400e3;
  const valor = `${caduca}.${firmar(String(caduca))}`;
  return `${COOKIE}=${valor}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${dias * 86400}`;
}

export function sesionValida(req) {
  // Sin secreto configurado no hay sesion posible: firmar con clave vacia
  // dejaria pasar cualquier cookie fabricada.
  if (!secretoSesion()) return false;
  const bruto = req.headers.cookie || "";
  const par = bruto.split(";").map(c => c.trim()).find(c => c.startsWith(COOKIE + "="));
  if (!par) return false;
  const [caduca, firma] = par.slice(COOKIE.length + 1).split(".");
  if (!caduca || !firma) return false;
  if (Number(caduca) < Date.now()) return false;
  // Comparacion en tiempo constante: una comparacion normal filtra la firma.
  const esperada = Buffer.from(firmar(caduca));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

/** Envuelve un handler exigiendo sesion. Devuelve 401 si no la hay. */
export function conSesion(handler) {
  return async (req, res) => {
    if (!sesionValida(req)) {
      res.status(401).json({ error: "Sesión no válida. Vuelve a entrar." });
      return;
    }
    try {
      await handler(req, res);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || "Error inesperado en el servidor." });
    }
  };
}

/** El ticket imprime DD/MM/AA; el registro guarda ISO. */
export function fechaISO(texto) {
  if (!texto) return null;
  const m = String(texto).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
  const [, d, mes, a] = m;
  const anno = a.length === 4 ? a : `20${a}`;
  return `${anno}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
