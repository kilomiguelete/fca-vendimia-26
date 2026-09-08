# Registro de tickets de bascula — Vendimia 2026

Volcado de los tickets de descarga de la finca en la cooperativa, para llevar
el registro por parcelas: remolques, calidades, fechas, y su asociacion con
horas y temperaturas de vendimia.

Origen: **Bodegas Santa Cruz de Alpera** (Santa Cruz de Alpera Soc. Coop. de
C-L-M, CIF F02004414). Agricultor: **11252 - FINCA CASA APARICIO S.L.**
(Higueruela, Albacete). Campana 2026/2027.

## Estructura

- `albaranes/jpg/` — imagenes originales de los tickets, subidas a mano
  (nombre: `AAAA-MM-DD_<nº ticket>.jpg`, que es lo que enlaza con `fuente_jpg`).
- `datos/albaranes.csv` — una fila por ticket de bascula, transcrito literal.
- `datos/parcelas.csv` — maestro de parcelas: SIGPAC (poligono/parcela/subparcela)
  → nombre interno de la finca, paraje, variedad, regimen y superficie.
- `datos/variedades.csv` — codigo de variedad del ticket → variedad real.
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

Calidad: `grado_alc_probable` (grado alcoholico probable, % vol), `color`
(indice de intensidad colorante), `acidez`, `ph`, `gluconico`, y las variantes
`variedad_sin_gluc` / `grado_alc_probable_sin_gluc` que el ticket calcula
descontando el acido gluconico.

La variedad se imprime con el codigo de la cooperativa (`TINT.TIPO 1 ECOL.`);
`datos/variedades.csv` lo traduce al nombre real. Todo el viñedo volcado hasta
ahora es **Garnacha Tintorera ecologica en secano**: al ser uva tintorera, los
indices de color altos y los grados elevados son lo esperado, no un error de
transcripcion.

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
- **Tara y neto**: la bascula de la cooperativa ha impreso al menos un ticket con
  los dos valores intercambiados (etiqueta como "Tara" lo que en realidad es la
  uva). En el CSV mandan la tara real del conjunto y el neto que se deduce de
  ella; lo que imprime el ticket queda anotado en `observaciones`. Como la tara
  de un mismo conjunto es practicamente constante, `datos/validar.py` avisa si
  varia mas de 500 kg entre tickets: eso delata el intercambio.
- Fechas en ISO (`AAAA-MM-DD`); el ticket las imprime como `DD/MM/AA`.

## Dashboard

`web/` es un sitio estatico sin build: `index.html` mas `datos.js`. Vercel lo
sirve tal cual desde el repositorio y redespliega en cada push.

`datos.js` esta **generado** a partir de los CSV — no se edita a mano. Despues
de volcar tickets nuevos hay que regenerarlo y volver a commitear:

```sh
python3 datos/validar.py && python3 web/generar.py
```

El dashboard agrega grado y color como **media ponderada por kilos**, no en
media simple: una descarga de 500 kg no puede pesar igual que una de 5.000 al
calcular el grado de la campana. Los campos vacios (hora, temperatura, analitica
no realizada) se excluyen del calculo en vez de contar como cero.
