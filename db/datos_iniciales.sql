-- Carga inicial: lo ya volcado a mano antes de existir la captura por foto.
-- Ejecutar una sola vez, despues de esquema.sql.

insert into parcelas
  (poligono, parcela, subparcela, nombre_finca, paraje, variedad, regimen, ecologico, notas)
values
  ('019', '00142', 'X', null, null, 'Garnacha Tintorera', 'secano', true,
   'Nombre interno de la parcela pendiente de asignar')
on conflict (poligono, parcela, subparcela) do nothing;

-- Ticket 260214, tal como lo imprime la bascula.
insert into tickets
  (estado, ticket, fecha, campania, poligono, parcela, subparcela, variedad,
   matricula_1, matricula_2, kg_bruto, kg_tara, kg_neto, kg_estimado,
   grado_alc_probable, color, gluconico, observaciones, confirmado_en)
values
  ('confirmado', '260214', '2026-09-07', '2026/2027', '019', '00142', 'X',
   'TINT.TIPO 1 ECOL.', 'E06194BHK', 'E7498BGX',
   13880, 11500, 2380, 900, 17.63, 20.51, 0.04,
   'Acidez y pH impresos como 0 (no analizados). Peso estimado 900 frente a 2.380 netos reales.',
   now())
on conflict do nothing;
