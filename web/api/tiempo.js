import { conSesion } from "./_comun.js";

// Higueruela (Albacete), donde esta la finca.
const LAT = 38.967, LON = -1.417;

/** Codigos WMO agrupados en lo que importa para decidir si se entra a vendimiar. */
function cielo(codigo) {
  // Sin esta guarda, null se convierte en 0 al comparar y cae en "Nubes".
  if (typeof codigo !== "number" || !Number.isFinite(codigo)) return { texto: "—", icono: "" };
  if (codigo === 0) return { texto: "Despejado", icono: "☀" };
  if (codigo <= 3) return { texto: "Nubes", icono: "⛅" };
  if (codigo === 45 || codigo === 48) return { texto: "Niebla", icono: "🌫" };
  if (codigo >= 51 && codigo <= 57) return { texto: "Llovizna", icono: "🌦" };
  if (codigo >= 61 && codigo <= 67) return { texto: "Lluvia", icono: "🌧" };
  if (codigo >= 71 && codigo <= 77) return { texto: "Nieve", icono: "❄" };
  if (codigo >= 80 && codigo <= 82) return { texto: "Chubascos", icono: "🌦" };
  if (codigo >= 95 && codigo <= 99) return { texto: "Tormenta", icono: "⛈" };
  return { texto: "—", icono: "" };
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
