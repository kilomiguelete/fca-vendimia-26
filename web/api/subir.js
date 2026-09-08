import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { conSesion, bd, fechaISO } from "./_comun.js";

const numero = () => z.number().nullable();
// Sin nulo: la API limita a 16 los campos con tipo union, y los nulables cuentan.
// En texto, la cadena vacia ya expresa "ausente" sin ambiguedad; en los numericos
// no vale, porque un 0 impreso significa "no analizado" y hay que distinguirlo.
const texto = () => z.string();

const EsquemaTicket = z.object({
  ticket: texto(),
  fecha: texto(),
  campania: texto(),
  provincia: texto(),
  municipio: texto(),
  poligono: texto(),
  parcela: texto(),
  subparcela: texto(),
  paraje: texto(),
  variedad: texto(),
  incidencia: texto(),
  matricula_1: texto(),
  matricula_2: texto(),
  kg_bruto: numero(),
  kg_tara: numero(),
  kg_neto: numero(),
  kg_estimado: numero(),
  grado_alc_probable: numero(),
  color: numero(),
  acidez: numero(),
  ph: numero(),
  gluconico: numero(),
  dudas: z.array(z.string()),
});

const INSTRUCCIONES = `Eres un ayudante que transcribe tickets de bascula de entrada de uva de una
cooperativa vinicola espanola. Devuelves exactamente lo que el ticket imprime.

Reglas de transcripcion:

1. Transcribe literalmente. No estimes, no deduzcas y no completes de memoria
   ningun valor que no puedas leer en la imagen.
2. Numeros: el ticket usa el punto como separador de MILES en los pesos
   ("13.880" son 13880 kilos) y la coma como separador DECIMAL en la analitica
   ("17,63" son 17.63). Devuelve siempre numeros normalizados: pesos como
   enteros en kilos, decimales con punto.
3. Un valor impreso como 0 en acidez, pH o glucónico significa "no analizado",
   no un cero real: devuelve null en ese campo y anadelo a "dudas".
4. Campo vacio, tachado o ilegible: en los campos de texto devuelve la cadena
   vacia ""; en los numericos devuelve null. Y describelo en "dudas" (por
   ejemplo "el paraje esta en blanco" o "la matricula del remolque no se lee,
   puede ser BGX o BGY").
5. Asigna cada peso al campo que le corresponde SEGUN LA ETIQUETA IMPRESA en el
   ticket, aunque el resultado te parezca raro. Si el ticket etiqueta 11.500
   como "Tara", devuelve kg_tara = 11500. No reordenes los valores por tu
   cuenta: quien revisa necesita ver lo que pone el papel.
6. Comprueba la aritmetica de la pesada: si bruto menos tara no da el neto
   impreso, anota la discrepancia en "dudas" con las tres cifras.
7. "Grado" es el grado alcoholico probable en % vol. "Color" es el indice de
   intensidad colorante.
8. La fecha devuelvela tal como se imprime (por ejemplo "07/09/26").

En "dudas" escribe frases cortas en espanol, una por cada cosa que quien revise
deba mirar con atencion. Si no hay ninguna, devuelve una lista vacia.`;

export default conSesion(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  const { base64, tipo } = req.body || {};
  if (!base64) {
    res.status(400).json({ error: "No ha llegado ninguna imagen." });
    return;
  }
  const mime = tipo === "image/png" ? "image/png" : "image/jpeg";
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > 5 * 1024 * 1024) {
    res.status(413).json({ error: "La imagen pesa más de 5 MB. Vuelve a hacer la foto." });
    return;
  }

  const cliente = new Anthropic();
  const respuesta = await cliente.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: INSTRUCCIONES,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mime, data: base64 } },
        { type: "text", text: "Transcribe este ticket de báscula." },
      ],
    }],
    // Esfuerzo bajo: esto es transcribir un papel, no razonar. La red de
    // seguridad es la pantalla de confirmacion, no el gasto en razonamiento.
    // Si aparecen lecturas erroneas, subir a "medium".
    output_config: { effort: "low", format: zodOutputFormat(EsquemaTicket, "ticket") },
  });

  if (respuesta.stop_reason === "refusal") {
    res.status(422).json({ error: "El modelo no ha podido procesar esta imagen." });
    return;
  }
  const t = respuesta.parsed_output;
  if (!t) {
    res.status(422).json({
      error: "No se pudo leer el ticket en esa imagen. Prueba con una foto más nítida.",
    });
    return;
  }
  const fecha = fechaISO(t.fecha);

  const dudas = [...t.dudas];
  // La tara del conjunto (tractor mas remolque) supera con normalidad a la
  // carga, asi que no se avisa por eso. Lo que si delata un error es que la
  // resta no cuadre.
  const { kg_bruto: kb, kg_tara: kt, kg_neto: kn } = t;
  if ([kb, kt, kn].every(v => v != null) && kb - kt !== kn) {
    dudas.push(`La pesada no cuadra: ${kb} − ${kt} = ${kb - kt}, pero el ticket `
      + `imprime ${kn} de neto.`);
  }

  const vacio = v => { const x = (v ?? "").trim(); return x === "" ? null : x; };

  const sql = bd();
  const [fila] = await sql`
    insert into tickets (estado, jpg, jpg_tipo, ticket, fecha, campania, poligono, parcela,
      subparcela, paraje, variedad, incidencia, matricula_1, matricula_2, kg_bruto, kg_tara,
      kg_neto, kg_estimado, grado_alc_probable, color, acidez, ph, gluconico, dudas, extraccion)
    values ('borrador', decode(${base64}, 'base64'), ${mime}, ${vacio(t.ticket)}, ${fecha},
      ${vacio(t.campania)}, ${vacio(t.poligono)}, ${vacio(t.parcela)}, ${vacio(t.subparcela)}, ${vacio(t.paraje)}, ${vacio(t.variedad)},
      ${vacio(t.incidencia)}, ${vacio(t.matricula_1)}, ${vacio(t.matricula_2)}, ${t.kg_bruto}, ${t.kg_tara},
      ${t.kg_neto}, ${t.kg_estimado}, ${t.grado_alc_probable}, ${t.color}, ${t.acidez},
      ${t.ph}, ${t.gluconico}, ${JSON.stringify(dudas)}::jsonb, ${JSON.stringify(t)}::jsonb)
    returning id, ticket, fecha`;

  res.status(200).json({ borrador: fila });
});
