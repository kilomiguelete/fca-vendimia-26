import PDFDocument from "pdfkit";

/* Paleta validada del dashboard, en el mismo orden. Las porciones llevan
   ademas etiqueta directa, para que el color nunca sea el unico canal. */
const SERIE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#4a3aa7"];
const TINTA = "#0b0b0b", TINTA2 = "#52514e", SUAVE = "#898781", LINEA = "#e1e0d9";

const nf = (v, d = 0) => v == null ? "—"
  : Number(v).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d,
                                        useGrouping: "always" });
const fecha = f => { const [a, m, d] = String(f).slice(0, 10).split("-"); return `${d}/${m}/${a}`; };

/** Media ponderada por kilos: una descarga de 500 kg no pesa como una de 5.000. */
function ponderada(filas, campo) {
  const pares = filas.filter(f => f[campo] != null && f.kg).map(f => [Number(f[campo]), f.kg]);
  if (!pares.length) return null;
  const total = pares.reduce((s, [, k]) => s + k, 0);
  return total ? pares.reduce((s, [v, k]) => s + v * k, 0) / total : null;
}

const resumir = filas => ({
  kg: filas.reduce((s, f) => s + (f.kg || 0), 0),
  descargas: filas.length,
  grado: ponderada(filas, "grado"),
  color: ponderada(filas, "color"),
  gluconico: ponderada(filas, "gluconico"),
});

/** Agrupa la campana por tipologia (la variedad tal como la imprime el ticket). */
export function porTipologia(filas) {
  const m = new Map();
  filas.forEach(f => {
    const k = f.variedad || "(sin variedad)";
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(f);
  });
  const total = filas.reduce((s, f) => s + (f.kg || 0), 0) || 1;
  return [...m].map(([tipologia, g]) => ({ tipologia, ...resumir(g), pct: resumir(g).kg / total * 100 }))
    .sort((a, b) => b.kg - a.kg);
}

const PIE_PAGINA = 760;

function cabeceraTabla(doc, columnas, x, y) {
  doc.font("Helvetica").fontSize(8.5).fillColor(TINTA2);
  columnas.forEach(c => doc.text(c.titulo, c.x, y, { width: c.ancho, align: c.align || "left" }));
  y += 13;
  doc.moveTo(x, y).lineTo(columnas.at(-1).x + columnas.at(-1).ancho, y)
     .lineWidth(0.5).strokeColor(LINEA).stroke();
  return y + 5;
}

function tabla(doc, columnas, filas, x, y) {
  const alto = 18;
  y = cabeceraTabla(doc, columnas, x, y);
  filas.forEach(fila => {
    // Una jornada larga no cabe en una pagina: se salta y se repite la cabecera.
    if (y + alto > PIE_PAGINA) {
      doc.addPage();
      y = cabeceraTabla(doc, columnas, x, 42);
    }
    doc.font("Helvetica").fontSize(9).fillColor(TINTA);
    columnas.forEach(c => doc.text(fila[c.clave] ?? "", c.x, y, { width: c.ancho, align: c.align || "left" }));
    y += alto;
  });
  return y;
}

/** Quesito: una porcion por tipologia, con su etiqueta fuera. */
function quesito(doc, datos, cx, cy, r) {
  let a0 = -Math.PI / 2;
  datos.forEach((d, i) => {
    const barrido = (d.pct / 100) * Math.PI * 2;
    const a1 = a0 + barrido;
    const color = SERIE[i % SERIE.length];
    if (d.pct >= 99.99) {
      doc.circle(cx, cy, r).fillColor(color).fill();
    } else {
      const grande = barrido > Math.PI ? 1 : 0;
      doc.path(`M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} `
             + `A ${r} ${r} 0 ${grande} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`)
         .fillColor(color).fill();
    }
    // Separacion en color del papel entre porciones, como en el dashboard.
    if (datos.length > 1) {
      doc.moveTo(cx, cy).lineTo(cx + r * Math.cos(a0), cy + r * Math.sin(a0))
         .lineWidth(2).strokeColor("#ffffff").stroke();
    }
    const med = a0 + barrido / 2;
    if (d.pct >= 6) {
      doc.fontSize(8).fillColor("#ffffff")
         .text(`${nf(d.pct, 1)}%`, cx + Math.cos(med) * r * 0.62 - 18,
               cy + Math.sin(med) * r * 0.62 - 4, { width: 36, align: "center" });
    }
    a0 = a1;
  });
}

export function construirPDF({ finca, bodega, campania, dia, descargas, campana }) {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const trozos = [];
  doc.on("data", t => trozos.push(t));
  const izq = 42, ancho = 511;

  doc.font("Helvetica-Bold").fontSize(15).fillColor(TINTA)
     .text(`Vendimia ${campania} · ${finca}`, izq, 42);
  doc.font("Helvetica").fontSize(9.5).fillColor(TINTA2)
     .text(`${bodega} · Informe del ${fecha(dia)}`, izq, doc.y + 2);

  // ---------- El dia ----------
  doc.moveDown(1.4);
  const rDia = resumir(descargas);
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(TINTA).text(`El día ${fecha(dia)}`);
  doc.font("Helvetica").fontSize(9.5).fillColor(TINTA2)
     .text(descargas.length
       ? `${rDia.descargas} descarga${rDia.descargas === 1 ? "" : "s"} · ${nf(rDia.kg)} kg · `
         + `grado ${nf(rDia.grado, 2)}% · color ${nf(rDia.color, 2)} · `
         + `glucónico ${nf(rDia.gluconico, 2)} g/l`
       : "Sin descargas registradas en esta jornada.", { width: ancho });

  let y = doc.y + 12;
  if (descargas.length) {
    const cols = [
      { clave: "ticket",   titulo: "Ticket",   x: izq,       ancho: 52 },
      { clave: "hora",     titulo: "Hora",     x: izq + 54,  ancho: 36 },
      { clave: "parcela",  titulo: "Parcela",  x: izq + 92,  ancho: 96 },
      { clave: "variedad", titulo: "Variedad", x: izq + 190, ancho: 126 },
      { clave: "kg",       titulo: "Kilos",    x: izq + 300, ancho: 54, align: "right" },
      { clave: "grado",    titulo: "Grado",    x: izq + 358, ancho: 46, align: "right" },
      { clave: "color",    titulo: "Color",    x: izq + 406, ancho: 46, align: "right" },
      { clave: "gluconico", titulo: "Glucón.", x: izq + 454, ancho: 46, align: "right" },
    ];
    y = tabla(doc, cols, descargas.map(d => ({
      ticket: d.ticket || "—", hora: d.hora || "—",
      parcela: d.parcela || d.ref_sigpac || "—", variedad: d.variedad || "—",
      kg: nf(d.kg), grado: nf(d.grado, 2), color: nf(d.color, 2),
      gluconico: nf(d.gluconico, 2),
    })), izq, y);
    doc.moveTo(izq, y).lineTo(izq + ancho, y).lineWidth(0.5).strokeColor(LINEA).stroke();
    y += 5;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(TINTA)
       .text("Total del día", izq, y, { width: 270 })
       .text(nf(rDia.kg) + " kg", izq + 300, y, { width: 54, align: "right" });
    y += 24;
  }

  // ---------- Acumulado ----------
  const rTot = resumir(campana);
  const tip = porTipologia(campana);
  // El acumulado necesita sitio para su tabla y el quesito: si no cabe, pagina nueva.
  if (y + 150 + tip.length * 18 > PIE_PAGINA) { doc.addPage(); y = 42; }
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(TINTA).text("Acumulado de la vendimia", izq, y);
  y = doc.y + 6;
  doc.font("Helvetica").fontSize(9.5).fillColor(TINTA2)
     .text(`${nf(rTot.kg)} kg en ${rTot.descargas} descargas · grado medio ${nf(rTot.grado, 2)}% · `
         + `color medio ${nf(rTot.color, 2)} · glucónico medio ${nf(rTot.gluconico, 2)} g/l`,
       izq, y, { width: ancho });
  y = doc.y + 14;

  doc.font("Helvetica-Bold").fontSize(10).fillColor(TINTA).text("Por tipología", izq, y);
  y += 16;
  const cols2 = [
    { clave: "tipologia", titulo: "Tipología",   x: izq,       ancho: 150 },
    { clave: "kg",        titulo: "Kilos",       x: izq + 152, ancho: 58, align: "right" },
    { clave: "pct",       titulo: "% del total", x: izq + 214, ancho: 58, align: "right" },
    { clave: "grado",     titulo: "Grado medio", x: izq + 276, ancho: 62, align: "right" },
    { clave: "color",     titulo: "Color medio", x: izq + 342, ancho: 62, align: "right" },
    { clave: "gluconico", titulo: "Glucón. medio", x: izq + 408, ancho: 66, align: "right" },
  ];
  y = tabla(doc, cols2, tip.map(t => ({
    tipologia: t.tipologia, kg: nf(t.kg), pct: nf(t.pct, 1) + "%",
    grado: nf(t.grado, 2), color: nf(t.color, 2), gluconico: nf(t.gluconico, 2),
  })), izq, y);

  // ---------- Quesito ----------
  if (tip.length) {
    y += 10;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(TINTA)
       .text("Reparto por tipología", izq, y);
    const cy = y + 90, cx = izq + 80;
    quesito(doc, tip, cx, cy, 66);
    let ly = y + 32;
    tip.forEach((t, i) => {
      doc.rect(izq + 180, ly, 9, 9).fillColor(SERIE[i % SERIE.length]).fill();
      doc.font("Helvetica").fontSize(9).fillColor(TINTA)
         .text(`${t.tipologia}`, izq + 194, ly - 1, { width: 200 });
      doc.fillColor(TINTA2).text(`${nf(t.pct, 1)}%  ·  ${nf(t.kg)} kg`, izq + 396, ly - 1,
                                 { width: 115, align: "right" });
      ly += 16;
    });
    y = Math.max(cy + 80, ly + 8);
  }

  doc.font("Helvetica").fontSize(8).fillColor(SUAVE)
     .text("Los kilos son peso neto de báscula. Las medias de grado, color y glucónico van "
         + "ponderadas por kilos, no en media simple. El ácido glucónico es el indicador de "
         + "podredumbre. La tipología es la variedad tal como la imprime el ticket.",
       izq, Math.min(y + 6, 770), { width: ancho });

  doc.end();
  return new Promise(ok => doc.on("end", () => ok(Buffer.concat(trozos))));
}
