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

**La variedad manda tal como la imprime el ticket** (`TINT.TIPO 1 ECOL.`), sin
traducir ni normalizar: ese codigo incluye el tipo y la mencion ecologica, que
determinan la clasificacion y el precio que paga la cooperativa, y puede
cambiar entre viajes de la misma parcela. El dashboard agrupa por el, y el panel
"Kilos por variedad" reparte la campana en kilos, porcentaje, descargas,
parcelas y medias de grado y color.

`datos/variedades.csv` traduce el codigo al nombre botanico cuando hace falta
leerlo: `TINT.TIPO 1 ECOL.` es Garnacha Tintorera ecologica en secano. Al ser
uva tintorera, los indices de color altos y los grados elevados son lo esperado,
no un error de transcripcion.

## Campos que NO trae el ticket

`hora_vendimia` **no figura en el ticket de bascula**: se teclea a mano en la
pantalla de confirmacion, desde el parte de campo. `parcela_finca` depende del
maestro de parcelas. No se rellenan por estimacion.

La **temperatura** esta retirada de la interfaz porque de momento no hay con que
medirla. Las columnas `temperatura_c` y `fuente_temperatura` siguen en la base
de datos y en la exportacion: el dia que haya sonda, volver a mostrarlas es
anadirlas a la lista CAMPOS de `web/index.html`.

## Criterios de transcripcion

- Se transcribe literal lo que pone el ticket; nada se estima ni se completa
  de memoria.
- **Numeros normalizados**: el ticket usa punto como separador de miles en los
  pesos (`13.880` = 13880 kg) y coma decimal en la analitica (`17,63`). En el
  CSV los pesos van como enteros en kg y los decimales con punto.
- **Valores impresos como `0`** en acidez y pH significan "no analizado", no
  cero real: se dejan vacios y se anota en `observaciones`.
- Campo ilegible o ausente → vacio, y se anota en `observaciones`.
- **Tara y neto**: se transcriben con la etiqueta que les pone el ticket. La
  tara es la del conjunto completo (tractor mas remolque), por lo que supera con
  normalidad a los kilos de uva; eso no es un error. Lo que si lo es que
  `bruto - tara` no de el neto impreso, y eso se comprueba siempre. Como ademas
  la tara de un mismo conjunto es practicamente constante, `datos/validar.py`
  avisa si varia mas de 500 kg entre tickets.
- Fechas en ISO (`AAAA-MM-DD`); el ticket las imprime como `DD/MM/AA`.

## Dashboard y captura de tickets

El sitio (`web/`) se despliega en Vercel desde este repositorio y redespliega en
cada push. Tiene dos mitades:

- **Dashboard**: kilos y grado por campana, por parcela y por dia, comparativa
  entre campanas y detalle de descargas.
- **Captura**: boton para subir el JPG del ticket. La foto se guarda en la base de
  datos, se extraen los campos con la API de Claude y queda como **borrador**.
  Nada entra al registro sin que una persona lo confirme en pantalla, con la
  foto al lado.

### Por que la confirmacion no es opcional

Un ticket de bascula no se lee solo con los ojos: hay que saber que pesa el
conjunto, que parcela se estaba vendimiando y que significa cada campo impreso.
Con el primer ticket hizo falta una ida y vuelta sobre cual de las dos cifras
era la tara, y quien lo resolvio fue quien conoce la finca, no la lectura
automatica. Por eso nada entra al registro sin pasar por la pantalla de
revision, con la foto al lado.

Las comprobaciones automaticas se limitan a lo que es verificable sin conocer la
explotacion: que `bruto - tara` de el neto impreso, que el numero de ticket no
este ya confirmado en la campana, y que los campos que la lectura no dio por
seguros salgan marcados. Un aviso que salta en todos los tickets no es una
comprobacion, es ruido que se acaba ignorando.

### Donde vive cada cosa

- **Postgres** (Neon, creada desde la pestana Storage de Vercel) es la fuente de
  verdad de los tickets y del maestro de parcelas. Las fotos se guardan en la
  propia tabla, no en un almacen aparte: asi heredan el mismo control de acceso
  y no queda ninguna URL publica adivinable.
- **Los CSV** de `datos/` son la copia versionada. `/api/exportar` descarga el
  registro confirmado en CSV para archivarlo en el repositorio, de modo que el
  historial quede en git y los datos se puedan leer sin depender de la base.
- El sitio publicado **no contiene ningun fichero de datos estatico**: la puerta
  es de navegador, asi que cualquier JSON servido junto al HTML seria
  descargable sin contrasena. Todo dato pasa por `/api/datos`, que exige cookie.

### Variables de entorno (en Vercel)

| Variable | Para que |
|---|---|
| `DATABASE_URL` | Cadena de conexion a Postgres; la inyecta la integracion de Vercel |
| `ANTHROPIC_API_KEY` | Lectura de los tickets |
| `CLAVE_ACCESO` | Contrasena compartida del sitio |
| `SECRETO_SESION` | Firma de la cookie de sesion (opcional; si falta se usa `CLAVE_ACCESO`) |

`db/esquema.sql` crea las tablas y los indices; `db/datos_iniciales.sql` carga
lo ya volcado a mano.

### Secciones

El menu de hamburguesa (arriba a la izquierda) tiene dos secciones:

- **Panel**: el dashboard y la bandeja de revision.
- **Parcelas**: todas las parcelas que han aparecido en algun ticket, con su
  referencia SIGPAC y un campo para ponerles el nombre con el que se las llama
  en la finca. El nombre se guarda al salir del campo y pasa a usarse en todo
  el dashboard. La lista incluye las parcelas que estan en tickets pero aun no
  en el maestro: son justo las que hace falta bautizar.

En la tabla de descargas, el numero de ticket es un enlace que abre la foto
original de la que se saco la informacion.

### Corregir y quitar tickets

Desde la tabla de descargas, cada ticket registrado tiene **Editar** y **Borrar**.

- **Editar** lo devuelve a la bandeja de revision con su foto, para corregir una
  lectura equivocada; al guardar vuelve al registro. Cancelar no toca nada.
- **Borrar** es un borrado reversible: el ticket pasa a `descartado` y sale del
  dashboard y de la exportacion, pero la fila y la foto siguen en la base. Un
  descarte por error se deshace con
  `update tickets set estado = 'confirmado' where ticket = '...';`
  Para eliminarlo de verdad, `delete from tickets where id = ...`.

### Limite de campos nulables

La API rechaza un esquema con mas de 16 campos de tipo union, y cada campo
nulable cuenta como uno. Por eso en el esquema de extraccion los campos de
texto **no** son nulables (la cadena vacia ya significa "ausente") y solo lo son
los nueve numericos, donde vacio y cero no son lo mismo: un 0 impreso en acidez
o pH significa "no analizado". Al anadir campos nuevos, mantener esa regla.

### Coste de la lectura

Cada ticket cuesta del orden de tres centimos con `effort: "low"` (unos siete
con el esfuerzo alto por defecto). El razonamiento es la partida mayor, asi que
el esfuerzo es la palanca principal. Se usa el bajo porque la tarea es
transcribir, no razonar, y porque toda lectura pasa despues por la pantalla de
confirmacion. Si aparecen lecturas erroneas, subirlo a `"medium"` antes que
cambiar de modelo.

### Agregacion

Las medias de grado y color van **ponderadas por kilos**, no en media simple:
una descarga de 500 kg no puede pesar igual que una de 5.000 al calcular el
grado de la campana. Los campos vacios (hora, temperatura, analitica no
realizada) se excluyen del calculo en vez de contar como cero. El calculo vive
en un unico sitio, el navegador, para que no haya dos implementaciones que
puedan divergir.
