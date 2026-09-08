#!/usr/bin/env python3
"""Genera web/datos.js a partir de los CSV del registro.

Los CSV de datos/ son la fuente de verdad; este script solo agrega y resuelve
los maestros (parcelas, variedades) para que el dashboard no tenga que hacerlo.
"""
import csv, json, os, sys
from collections import defaultdict

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def leer(nombre):
    ruta = os.path.join(RAIZ, "datos", nombre)
    with open(ruta, encoding="utf-8") as fh:
        return list(csv.DictReader(fh))

def num(valor):
    """Devuelve float o None. Vacio = no medido, nunca 0."""
    valor = (valor or "").strip()
    if not valor:
        return None
    try:
        return float(valor)
    except ValueError:
        return None

def clave_parcela(fila):
    return f"{fila['poligono']}/{fila['parcela']}/{fila['subparcela']}".strip("/")

def main():
    tickets = leer("albaranes.csv")
    parcelas = {clave_parcela(p): p for p in leer("parcelas.csv")}
    variedades = {v["codigo_ticket"]: v for v in leer("variedades.csv")}

    filas = []
    for t in tickets:
        ref = clave_parcela(t)
        maestro = parcelas.get(ref, {})
        var = variedades.get(t["variedad"], {})
        filas.append({
            "ticket": t["ticket"],
            "fecha": t["fecha"],
            "campania": t["campania"],
            "ref_sigpac": ref,
            "parcela": (t.get("parcela_finca") or maestro.get("nombre_finca") or "").strip() or None,
            "paraje": (t.get("paraje") or maestro.get("paraje") or "").strip() or None,
            "variedad": (var.get("variedad") or t["variedad"]).strip(),
            "variedad_ticket": t["variedad"],
            "regimen": (maestro.get("regimen") or "").strip() or None,
            "ecologico": (maestro.get("ecologico") or "").strip().lower() == "si",
            "kg": int(t["kg_neto"]) if t["kg_neto"] else None,
            "kg_bruto": int(t["kg_bruto"]) if t["kg_bruto"] else None,
            "kg_tara": int(t["kg_tara"]) if t["kg_tara"] else None,
            "grado": num(t["grado_alc_probable"]),
            "color": num(t["color"]),
            "ph": num(t["ph"]),
            "acidez": num(t["acidez"]),
            "gluconico": num(t["gluconico"]),
            "matriculas": " - ".join(m for m in (t["matricula_1"], t["matricula_2"]) if m),
            "hora": (t.get("hora_vendimia") or "").strip() or None,
            "temperatura": num(t.get("temperatura_c")),
            "observaciones": (t.get("observaciones") or "").strip() or None,
            "jpg": (t.get("fuente_jpg") or "").strip() or None,
        })
    filas.sort(key=lambda f: (f["campania"], f["fecha"], f["ticket"]))

    def media_ponderada(grupo, campo):
        """Media ponderada por kg: la media simple falsea el grado de la partida."""
        pares = [(f[campo], f["kg"]) for f in grupo if f[campo] is not None and f["kg"]]
        if not pares:
            return None
        total = sum(k for _, k in pares)
        return round(sum(v * k for v, k in pares) / total, 2) if total else None

    def resumir(grupo):
        kgs = [f["kg"] for f in grupo if f["kg"]]
        fechas = sorted(f["fecha"] for f in grupo)
        return {
            "kg": sum(kgs),
            "descargas": len(grupo),
            "grado": media_ponderada(grupo, "grado"),
            "color": media_ponderada(grupo, "color"),
            "primera": fechas[0] if fechas else None,
            "ultima": fechas[-1] if fechas else None,
            "parcelas": len({f["ref_sigpac"] for f in grupo}),
            "con_hora": sum(1 for f in grupo if f["hora"]),
            "con_temp": sum(1 for f in grupo if f["temperatura"] is not None),
        }

    por_campania = defaultdict(list)
    for f in filas:
        por_campania[f["campania"]].append(f)

    campanias = []
    for nombre in sorted(por_campania):
        grupo = por_campania[nombre]
        por_parcela = defaultdict(list)
        por_fecha = defaultdict(list)
        for f in grupo:
            por_parcela[f["ref_sigpac"]].append(f)
            por_fecha[f["fecha"]].append(f)
        campanias.append({
            "campania": nombre,
            "resumen": resumir(grupo),
            "parcelas": [
                dict(ref=ref, nombre=g[0]["parcela"], variedad=g[0]["variedad"], **resumir(g))
                for ref, g in sorted(por_parcela.items(), key=lambda kv: -sum(f["kg"] or 0 for f in kv[1]))
            ],
            "dias": [
                dict(fecha=fecha, **resumir(g))
                for fecha, g in sorted(por_fecha.items())
            ],
            "descargas": grupo,
        })

    salida = {
        "generado": None,
        "finca": "Finca Casa Aparicio S.L.",
        "bodega": "Santa Cruz de Alpera S. Coop. de C-L-M",
        "campanias": campanias,
    }
    destino = os.path.join(RAIZ, "web", "datos.js")
    with open(destino, "w", encoding="utf-8") as fh:
        fh.write("window.DATOS = ")
        json.dump(salida, fh, ensure_ascii=False, indent=1)
        fh.write(";\n")
    print(f"{len(filas)} descargas en {len(campanias)} campania(s) -> web/datos.js")
    return 0

if __name__ == "__main__":
    sys.exit(main())
