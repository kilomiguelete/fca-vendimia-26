-- Carga inicial: lo ya volcado a mano antes de existir la captura por foto.
-- Ejecutar una sola vez, despues de esquema.sql.

insert into parcelas
  (poligono, parcela, subparcela, nombre_finca, paraje, variedad, regimen, ecologico, notas)
values
  ('019', '00142', 'X', null, null, 'Garnacha Tintorera', 'secano', true,
   'Nombre interno de la parcela pendiente de asignar')
on conflict (poligono, parcela, subparcela) do nothing;

-- Ticket 260214. Ojo: la bascula imprimio Tara 11.500 y Peso neto 2.380, pero
-- la tara real del conjunto son 2.380 kg, luego lo vendimiado son 11.500 kg.
insert into tickets
  (estado, ticket, fecha, campania, poligono, parcela, subparcela, variedad,
   matricula_1, matricula_2, kg_bruto, kg_tara, kg_neto, kg_estimado,
   grado_alc_probable, color, gluconico, observaciones, confirmado_en)
values
  ('confirmado', '260214', '2026-09-07', '2026/2027', '019', '00142', 'X',
   'TINT.TIPO 1 ECOL.', 'E06194BHK', 'E7498BGX',
   13880, 2380, 11500, 900, 17.63, 20.51, 0.04,
   'La bascula imprime Tara 11.500 y Peso neto 2.380; segun la finca la tara real del conjunto son 2.380 kg, luego lo vendimiado son 11.500 kg. Acidez y pH impresos como 0 (no analizados).',
   now())
on conflict do nothing;
