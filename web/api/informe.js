import { conSesion } from "./_comun.js";
import { datosInforme, hoyEnEspana } from "./_datos_informe.js";
import { construirPDF } from "./_informe.js";

/** Descarga el informe en PDF de un dia. Sirve para verlo sin esperar al correo. */
export default conSesion(async (req, res) => {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(req.query?.fecha || "") ? req.query.fecha : hoyEnEspana();
  const datos = await datosInforme(dia);
  const pdf = await construirPDF(datos);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="vendimia-${dia}.pdf"`);
  res.status(200).send(pdf);
});
