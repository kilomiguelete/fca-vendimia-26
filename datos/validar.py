#!/usr/bin/env python3
"""Comprobaciones sobre el volcado de tickets de bascula."""
import csv, sys

def main(path="datos/albaranes.csv"):
    filas = list(csv.DictReader(open(path)))
    errores, vistos = [], {}
    for f in filas:
        tk = f["ticket"]
        if tk in vistos:
            errores.append(f"ticket {tk}: duplicado")
        vistos[tk] = f
        try:
            b, t, n = (int(f[k]) for k in ("kg_bruto", "kg_tara", "kg_neto"))
        except ValueError:
            errores.append(f"ticket {tk}: pesada incompleta o no numerica")
            continue
        if b - t != n:
            errores.append(f"ticket {tk}: {b} - {t} = {b - t}, pero el neto declarado es {n}")
        if n <= 0:
            errores.append(f"ticket {tk}: neto no positivo ({n})")
    print(f"{len(filas)} tickets revisados")
    for e in errores:
        print("  !", e)
    return 1 if errores else 0

if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
