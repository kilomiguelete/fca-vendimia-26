# Registro de tickets de bascula — Vendimia 2026

Volcado de los tickets de descarga de la finca en la cooperativa, para llevar
el registro por parcelas: remolques, calidades, fechas, y su asociacion con
horas y temperaturas de vendimia.

Origen: **Bodegas Santa Cruz de Alpera** (Santa Cruz de Alpera Soc. Coop. de
C-L-M, CIF F02004414). Agricultor: **11252 - FINCA CASA APARICIO S.L.**
(Higueruela, Albacete). Campana 2026/2027.

## Estructura

- `albaranes/jpg/` — imagenes originales (nombre: `AAAA-MM-DD_<nº ticket>.jpg`).
- `datos/albaranes.csv` — una fila por ticket de bascula, transcrito literal.
- `datos/parcelas.csv` — maestro de parcelas: SIGPAC (poligono/parcela/subparcela)
  → nombre interno de la finca, paraje, variedad y superficie.
- `datos/validar.py` — comprobaciones del volcado (`python3 datos/validar.py`).

## Campos que trae el ticket

Cabecera: `ticket`, `fecha`, `campania`, `bodega`, `agricultor_codigo`, `agricultor`.

Localizacion: `provincia`, `municipio`, `localidad`, `poligono`, `parcela`,
`subparcela`, `paraje`. El ticket identifica la parcela **solo por referencia
SIGPAC**, no por nombre; el nombre interno se resuelve via `datos/parcelas.csv`
y se copia a `parcela_finca`.

Transporte: `matricula_1`, `matricula_2` (el ticket imprime las dos matriculas
del conjunto separadas por guion, en el orden en que aparecen).

Pesada: `kg_bruto`, `kg_tara`, `kg_neto`, `kg_estimado` (el "Peso estimado"
previo del ticket, que no tiene por que cuadrar con el neto real).

Calidad: `grado`, `color`, `acidez`, `ph`, `gluconico`, y las variantes
`variedad_sin_gluc` / `grado_sin_gluc` que el ticket calcula descontando el
acido gluconico.

## Campos que NO trae el ticket

`hora_vendimia`, `temperatura_c` y `fuente_temperatura` **no figuran en el
ticket de bascula** y quedan vacios hasta cruzarlos con una fuente externa
(parte de campo, sonda de la finca o estacion meteorologica). `parcela_finca`
depende del maestro de parcelas. No se rellenan por estimacion.

## Criterios de transcripcion

- Se transcribe literal lo que pone el ticket; nada se estima ni se completa
  de memoria.
- **Numeros normalizados**: el ticket usa punto como separador de miles en los
  pesos (`13.880` = 13880 kg) y coma decimal en la analitica (`17,63`). En el
  CSV los pesos van como enteros en kg y los decimales con punto.
- **Valores impresos como `0`** en acidez y pH significan "no analizado", no
  cero real: se dejan vacios y se anota en `observaciones`.
- Campo ilegible o ausente → vacio, y se anota en `observaciones`.
- Fechas en ISO (`AAAA-MM-DD`); el ticket las imprime como `DD/MM/AA`.
