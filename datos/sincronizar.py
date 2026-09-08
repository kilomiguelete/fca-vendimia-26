#!/usr/bin/env python3
"""Vuelca a los CSV los tickets confirmados en Supabase.

Supabase es la fuente de verdad; los CSV del repositorio son la copia
versionada y exportable. Ejecutar despues de confirmar tickets:

    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python3 datos/sincronizar.py
"""
import csv, json, os, sys, urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COLUMNAS = ["ticket", "fecha", "campania", "bodega", "agricultor_codigo", "agricultor",
            "provincia", "municipio", "localidad", "poligono", "parcela", "subparcela",
            "paraje", "parcela_finca", "variedad", "incidencia", "matricula_1",
            "matricula_2", "kg_bruto", "kg_tara", "kg_neto", "kg_estimado",
            "grado_alc_probable", "color", "acidez", "ph", "gluconico",
            "variedad_sin_gluc", "grado_alc_probable_sin_gluc", "hora_vendimia",
            "temperatura_c", "fuente_temperatura", "observaciones", "fuente_jpg"]

def consultar(url, clave, tabla, filtro=""):
    peticion = urllib.request.Request(
        f"{url}/rest/v1/{tabla}?select=*{filtro}",
        headers={"apikey": clave, "Authorization": f"Bearer {clave}"})
    with urllib.request.urlopen(peticion, timeout=30) as r:
        return json.load(r)

def main():
    url = os.environ.get("SUPABASE_URL")
    clave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not clave:
        print("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.", file=sys.stderr)
        return 2

    tickets = consultar(url, clave, "tickets", "&estado=eq.confirmado&order=fecha,ticket")
    parcelas = consultar(url, clave, "parcelas")

    ruta = os.path.join(RAIZ, "datos", "albaranes.csv")
    with open(ruta, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNAS)
        w.writeheader()
        for t in tickets:
            fila = {c: t.get(c, "") for c in COLUMNAS}
            fila["bodega"] = t.get("bodega") or "Santa Cruz de Alpera S. Coop. de C-L-M"
            fila["agricultor_codigo"] = t.get("agricultor_codigo") or "11252"
            fila["agricultor"] = t.get("agricultor") or "FINCA CASA APARICIO S.L."
            w.writerow({c: ("" if fila[c] is None else fila[c]) for c in COLUMNAS})

    ruta_p = os.path.join(RAIZ, "datos", "parcelas.csv")
    cab = ["poligono", "parcela", "subparcela", "nombre_finca", "paraje", "variedad",
           "regimen", "ecologico", "superficie_ha", "notas"]
    if parcelas:
        with open(ruta_p, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=cab)
            w.writeheader()
            for p in parcelas:
                fila = {c: p.get(c, "") for c in cab}
                fila["ecologico"] = "si" if p.get("ecologico") else "no"
                w.writerow({c: ("" if fila[c] is None else fila[c]) for c in cab})

    print(f"{len(tickets)} tickets confirmados y {len(parcelas)} parcelas -> datos/*.csv")
    print("Revisa el diff y haz commit para dejarlo en el historial.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
