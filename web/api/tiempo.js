import { conSesion } from "./_comun.js";

// Higueruela (Albacete), donde esta la finca.
const LAT = 38.967, LON = -1.417;

/** Codigos WMO agrupados en lo que importa para decidir si se entra a vendimiar.
 *  Se devuelve una clave, no un icono: el dibujo lo pone el navegador en SVG,
 *  porque los emoji del tiempo se ven distintos -o monocromos- segun el sistema. */
function cielo(codigo) {
  // Sin esta guarda, null se convierte en 0 al comparar y cae en "Nubes".
  if (typeof codigo !== "number" || !Number.isFinite(codigo)) return { texto: "—", clave: "" };
  if (codigo === 0) return { texto: "Despejado", clave: "despejado" };
  if (codigo <= 3) return { texto: "Nubes", clave: "nubes" };
  if (codigo === 45 || codigo === 48) return { texto: "Niebla", clave: "niebla" };
  if (codigo >= 51 && codigo <= 57) return { texto: "Llovizna", clave: "llovizna" };
  if (codigo >= 61 && codigo <= 67) return { texto: "Lluvia", clave: "lluvia" };
  if (codigo >= 71 && codigo <= 77) return { texto: "Nieve", clave: "nieve" };
  if (codigo >= 80 && codigo <= 82) return { texto: "Chubascos", clave: "chubascos" };
  if (codigo >= 95 && codigo <= 99) return { texto: "Tormenta", clave: "tormenta" };
  return { texto: "—", clave: "" };
}

export default conSesion(async (req, res) => {
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${LAT}&longitude=${LON}`
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,"
    + "precipitation_sum,precipitation_probability_max"
    + "&timezone=Europe%2FMadrid&forecast_days=7";

  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    res.status(502).json({ error: `El servicio meteorológico respondió ${r.status}.` });
    return;
  }
  const d = (await r.json()).daily;
  if (!d?.time?.length) {
    res.status(502).json({ error: "El servicio meteorológico no devolvió previsión." });
    return;
  }

  // Se piden siete dias y se descarta hoy: interesan los seis siguientes.
  const dias = d.time.map((fecha, i) => ({
    fecha,
    tmax: d.temperature_2m_max?.[i] ?? null,
    tmin: d.temperature_2m_min?.[i] ?? null,
    lluvia: d.precipitation_sum?.[i] ?? null,
    probabilidad: d.precipitation_probability_max?.[i] ?? null,
    ...cielo(d.weather_code?.[i]),
  })).slice(1, 7);

  res.setHeader("Cache-Control", "private, max-age=1800");
  res.status(200).json({ lugar: "Higueruela, Albacete", dias });
});
