# Registro de albaranes de descarga — Vendimia 2026

Volcado de los tickets/albaranes de descarga de la finca, para llevar el
registro por parcelas: remolques, calidades, fechas, y su asociación con
horas y temperaturas de vendimia.

## Estructura

- `albaranes/jpg/` — imágenes originales de los tickets (nombre: `AAAA-MM-DD_<nº albarán>.jpg`).
- `datos/albaranes.csv` — una fila por albarán/descarga, transcrito del ticket.
- `docs/REGISTRO.md` — este documento: esquema, criterios y notas.

## Esquema (provisional, se ajusta al primer ticket real)

| Campo | Descripción |
|---|---|
| `albaran` | Nº de albarán / ticket de descarga |
| `fecha` | Fecha de la descarga (AAAA-MM-DD) |
| `hora_entrada` | Hora de entrada a báscula / bodega (HH:MM) |
| `hora_descarga` | Hora de descarga si el ticket la distingue |
| `parcela` | Nombre de la parcela de la finca |
| `paraje` | Paraje / pago |
| `poligono`, `parcela_sigpac`, `recinto` | Referencia SIGPAC si aparece |
| `variedad` | Variedad de uva |
| `transportista` | Conductor / empresa |
| `matricula_remolque` | Matrícula del remolque o identificador |
| `kg_bruto`, `kg_tara`, `kg_neto` | Pesada |
| `grado_baume`, `grado_probable` | Grado Baumé y/o probable alcohólico |
| `ph`, `acidez_total`, `acido_malico` | Analítica del ticket |
| `temperatura_uva_c` | Temperatura de la uva a la entrada |
| `temperatura_ambiente_c` | Temperatura ambiente en la vendimia |
| `calidad` | Clasificación / categoría de calidad |
| `destino_deposito` | Depósito o destino asignado |
| `observaciones` | Notas del ticket |
| `fuente_jpg` | Nombre del JPG del que se transcribe |

## Criterios de transcripción

- Se transcribe **literal** lo que pone el ticket; nada se estima ni se completa de memoria.
- Campo ilegible o ausente → se deja vacío y se anota en `observaciones` (`ilegible: <campo>`).
- Decimales con punto; pesos en kg; temperaturas en °C.
