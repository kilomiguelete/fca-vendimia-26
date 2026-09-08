#!/usr/bin/env python3
"""Comprobaciones sobre el volcado de tickets de bascula."""
import csv, sys
from collections import defaultdict

def main(path="datos/albaranes.csv"):
    filas = list(csv.DictReader(open(path)))
    errores, avisos, vistos = [], [], {}
    taras = defaultdict(set)
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
        taras[f["matricula_1"], f["matricula_2"]].add(t)

    # La tara de un mismo conjunto es casi constante: si baila, o se ha leido
    # mal una cifra o el viaje se hizo con otro remolque.
    for conjunto, valores in taras.items():
        if len(valores) > 1 and max(valores) - min(valores) > 500:
            errores.append(
                f"conjunto {' - '.join(c for c in conjunto if c)}: la tara varia entre "
                f"{min(valores)} y {max(valores)} kg. Revisar la lectura o si "
                f"se uso otro remolque.")
    print(f"{len(filas)} tickets revisados")
    for e in errores:
        print("  !", e)
    for a in avisos:
        print("  ~", a)
    return 1 if errores else 0

if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
