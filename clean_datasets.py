import json
import os
import re

divipol_json_path = r"C:\Users\Admin\Desktop\vscode\random\parsed_divipol.json"
anom_json_path = r"C:\Users\Admin\Desktop\vscode\random\anomalies_data.json"
output_js_path = r"C:\Users\Admin\Desktop\vscode\random\data.js"

# Official department code mapping for Colombia
DEPT_CODE_MAP = {
    "01": "ANTIOQUIA",
    "03": "ATLÁNTICO",
    "05": "BOLÍVAR",
    "07": "BOYACÁ",
    "09": "CALDAS",
    "11": "CAUCA",
    "12": "CESAR",
    "13": "CÓRDOBA",
    "15": "CUNDINAMARCA",
    "16": "BOGOTÁ D.C.",
    "17": "CHOCÓ",
    "19": "HUILA",
    "21": "MAGDALENA",
    "23": "NARIÑO",
    "24": "RISARALDA",
    "25": "NORTE DE SANTANDER",
    "26": "QUINDÍO",
    "27": "SANTANDER",
    "28": "SUCRE",
    "29": "TOLIMA",
    "31": "VALLE DEL CAUCA",
    "40": "ARAUCA",
    "44": "CAQUETÁ",
    "46": "CASANARE",
    "48": "LA GUAJIRA",
    "50": "GUAINÍA",
    "52": "META",
    "54": "GUAVIARE",
    "56": "SAN ANDRÉS",
    "60": "AMAZONAS",
    "64": "PUTUMAYO",
    "68": "VAUPÉS",
    "72": "VICHADA",
    "88": "CONSULADOS"
}

NORMALIZED_DEPTS = {
    "AMAZONAS": "AMAZONAS",
    "ANTIOQUIA": "ANTIOQUIA",
    "ARAUCA": "ARAUCA",
    "ATLANTICO": "ATLÁNTICO",
    "BOLIVAR": "BOLÍVAR",
    "BOYACA": "BOYACÁ",
    "CALDAS": "CALDAS",
    "CAQUETA": "CAQUETÁ",
    "CASANARE": "CASANARE",
    "CAUCA": "CAUCA",
    "CESAR": "CESAR",
    "CHOCO": "CHOCÓ",
    "CORDOBA": "CÓRDOBA",
    "CUNDINAMARCA": "CUNDINAMARCA",
    "GUAINIA": "GUAINÍA",
    "GUAVIARE": "GUAVIARE",
    "HUILA": "HUILA",
    "LAGUAJIRA": "LA GUAJIRA",
    "MAGDALENA": "MAGDALENA",
    "META": "META",
    "NARIÑO": "NARIÑO",
    "NARIO": "NARIÑO",
    "NORTE DE SANTANDER": "NORTE DE SANTANDER",
    "PUTUMAYO": "PUTUMAYO",
    "QUINDIO": "QUINDÍO",
    "RISARALDA": "RISARALDA",
    "SANANDRES": "SAN ANDRÉS",
    "SANTANDER": "SANTANDER",
    "SUCRE": "SUCRE",
    "TOLIMA": "TOLIMA",
    "VALLEDELCAUCA": "VALLE DEL CAUCA",
    "VAUPES": "VAUPÉS",
    "VICHADA": "VICHADA",
    "BOGOTADC": "BOGOTÁ D.C.",
    "BOGOTA": "BOGOTÁ D.C.",
    "CONSULADOS": "CONSULADOS"
}

# Substring replacements for general spelling and mojibake correction
SUBSTRING_REPLS = {
    "NARI O": "NARIÑO",
    "NAR I O": "NARIÑO",
    "NARI  O": "NARIÑO",
    "N ARI O": "NARIÑO",
    "NA RI O": "NARIÑO",
    "BRICE O": "BRICEÑO",
    "OCA A": "OCAÑA",
    "LONDO O": "LONDOÑO",
    "SAN CRIST BAL": "SAN CRISTÓBAL",
    "SAN CRISTOBAL": "SAN CRISTÓBAL",
    "FUSAGASUGA": "FUSAGASUGÁ",
    "SAN ANDRES": "SAN ANDRÉS",
    "FACATATIVA": "FACATATIVÁ",
    "SOACHA": "SOACHA",
    "CA ASGORDAS": "CAÑASGORDAS",
    "CAÑASGORDAS": "CAÑASGORDAS",
    "ITAGUI": "ITAGÜÍ",
    "YOLOMBO": "YOLOMBÓ",
    "B ARANOA": "BARANOA",
    "BA RRANQUILLA": "BARRANQUILLA",
    "BAR RANQUILLA": "BARRANQUILLA",
    "BARANO A": "BARANOA",
    "BARRA NQUILLA": "BARRANQUILLA",
    "BARRANQ UILLA": "BARRANQUILLA",
    "BARRANQU ILLA": "BARRANQUILLA",
    "BARRANQUILL A": "BARRANQUILLA",
    "CAMPODE LA CRUZ": "CAMPO DE LA CRUZ",
    "CAMPO DE LA CRUZ": "CAMPO DE LA CRUZ",
    "ACHI": "ACHÍ",
    "MAGANGUE": "MAGANGUÉ",
    "MARIA LA BAJA": "MARÍA LA BAJA",
    "RONDON": "RONDÓN",
    "SOCOTA": "SOCOTÁ",
    "JERICO": "JERICÓ",
    "BELALCAZAR": "BELALCÁZAR",
    "SAMANA": "SAMANÁ",
    "AR GELIA": "ARGELIA",
    "BUE NOS AIRES": "BUENOS AIRES",
    "C ALOTO": "CALOTO",
    "GUACHENE": "GUACHENÉ",
    "AGUAC HICA": "AGUACHICA",
    "AGUSTIN CODAZZI": "AGUSTÍN CODAZZI",
    "CHIRIGUANA": "CHIRIGUANÁ",
    "MONSE OR": "MONSEÑOR",
    "AVENDA O": "AVENDAÑO",
    "BERNAL LONDO O": "BERNAL LONDOÑO",
    "CUC UTA": "CÚCUTA",
    "CUCUT A": "CÚCUTA",
    "CUCUTA": "CÚCUTA",
    "POPAYAN": "POPAYÁN",
    "TIMBIQUI": "TIMBIQUÍ",
    "MEDELLI N": "MEDELLÍN",
    "MEDELLIN": "MEDELLÍN",
    "VAL LE": "VALLE DEL CAUCA",
    "V ALLE": "VALLE DEL CAUCA",
    "VA LLE": "VALLE DEL CAUCA",
    "VALL E": "VALLE DEL CAUCA",
    "NORTE DE SAN": "NORTE DE SANTANDER"
}

def clean_spelling(text):
    if not text:
        return ""
    text_clean = text.strip()
    
    # Check exact match first
    for k, v in SUBSTRING_REPLS.items():
        if text_clean.upper() == k:
            return v
            
    # Substring replacements
    for k, v in SUBSTRING_REPLS.items():
        text_clean = re.sub(re.escape(k), v, text_clean, flags=re.IGNORECASE)
        
    text_clean = re.sub(r'\s+', ' ', text_clean)
    return text_clean.strip()

def clean_department(dept_raw):
    if not dept_raw:
        return ""
    dept_raw = dept_raw.strip()
    
    # Strip leading numbers if present (like "23 NARIÑO" or "23 NARI O")
    dept_raw = re.sub(r'^\d+\s+', '', dept_raw)
    dept_norm = "".join(dept_raw.split()).upper()
    
    # Check prefixes/concatenations
    if dept_norm.startswith("CUNDINAMARCA"):
        return "CUNDINAMARCA"
    if dept_norm.startswith("NORTEDESAN") or dept_norm.startswith("NORTE"):
        return "NORTE DE SANTANDER"
    if dept_norm.startswith("BOGOTA") or dept_norm.startswith("BO GOTA"):
        return "BOGOTÁ D.C."
    if dept_norm.startswith("VALLE"):
        return "VALLE DEL CAUCA"
        
    # Check normalized mappings
    for key in sorted(NORMALIZED_DEPTS.keys(), key=len, reverse=True):
        if dept_norm.startswith(key):
            return NORMALIZED_DEPTS[key]
            
    # Fallback to spelling check
    return clean_spelling(dept_raw.upper())

def clean_divipol_record(r):
    code = r["code"]
    dept = r["department"].strip()
    muni = r["municipality"].strip()
    post = r["post_name"].strip()
    women = r["women_census"]
    men = r["men_census"]
    total = r["total_census"]
    tables = r["tables"]
    zone = r["zone_code"]
    loc = r["location_name"].strip()
    
    # 1. Clean department name using DIVIPOL code prefix
    code_prefix = code[:2]
    if code_prefix in DEPT_CODE_MAP:
        clean_dept = DEPT_CODE_MAP[code_prefix]
    else:
        clean_dept = clean_department(dept)
        
    # 2. Extract municipality if it was concatenated with department name originally
    clean_muni = muni
    dept_norm = "".join(dept.split()).upper()
    if dept_norm.startswith("CUNDINAMARCA") and len(dept_norm) > len("CUNDINAMARCA"):
        clean_muni = dept[len("CUNDINAMARCA"):].strip()
    elif dept_norm.startswith("NORTEDESAN") and len(dept_norm) > len("NORTEDESAN"):
        idx = dept.upper().find("NORTE DE SAN")
        if idx != -1:
            clean_muni = dept[idx + len("NORTE DE SAN"):].strip()
        else:
            clean_muni = dept[12:].strip()
    elif dept_norm.startswith("VALLE") and len(dept_norm) > len("VALLE") and dept_norm not in ["VALLE", "VALLEDELCAUCA"]:
        clean_muni = dept[5:].strip()
    elif dept_norm.startswith("BOGOTA") and len(dept_norm) > len("BOGOTA"):
        clean_muni = "BOGOTÁ D.C."
        
    # 3. Special correction for Nariño records with municipality 'O'
    if code_prefix == "23" and clean_muni.upper() == "O":
        if code.startswith("23016"): clean_muni = "BARBACOAS"
        elif code.startswith("23079"): clean_muni = "LA UNIÓN"
        elif code.startswith("23124"): clean_muni = "SAN PABLO"
        else: clean_muni = "BARBACOAS"
        
    # 4. Special correction for San Andrés records with department 'SAN' and municipality 'ANDRES'
    if code_prefix == "56":
        clean_muni = "SAN ANDRÉS"
        
    # 5. Clean spelling of names
    clean_muni = clean_spelling(clean_muni)
    clean_post = clean_spelling(post)
    clean_loc = clean_spelling(loc)
    
    if clean_dept == "BOGOTÁ D.C.":
        clean_muni = "BOGOTÁ D.C."
        
    r["department"] = clean_dept
    r["municipality"] = clean_muni
    r["post_name"] = clean_post
    r["location_name"] = clean_loc
    return r

def clean_anomaly_record(r):
    dept = r[0].strip()
    muni = r[1].strip()
    post = r[2].strip()
    
    # Extract code prefix from department name
    match = re.match(r'^(\d+)\b', dept)
    if match:
        code_prefix = match.group(1).zfill(2)
    else:
        code_prefix = None
        
    if code_prefix in DEPT_CODE_MAP:
        clean_dept = DEPT_CODE_MAP[code_prefix]
    else:
        clean_dept = clean_department(dept)
        
    # Extract municipality from concatenation in department name if present
    dept_no_code = re.sub(r'^\d+\s+', '', dept).strip()
    dept_norm = "".join(dept_no_code.split()).upper()
    
    clean_muni = muni
    if dept_norm.startswith("CUNDINAMARCA") and len(dept_norm) > len("CUNDINAMARCA"):
        clean_muni = dept_no_code[len("CUNDINAMARCA"):].strip()
    elif dept_norm.startswith("NORTEDESAN") and len(dept_norm) > len("NORTEDESAN"):
        idx = dept_no_code.upper().find("NORTE DE SAN")
        if idx != -1:
            clean_muni = dept_no_code[idx + len("NORTE DE SAN"):].strip()
        else:
            clean_muni = dept_no_code[12:].strip()
    elif dept_norm.startswith("VALLE") and len(dept_norm) > len("VALLE") and dept_norm not in ["VALLE", "VALLEDELCAUCA"]:
        clean_muni = dept_no_code[5:].strip()
    elif dept_norm.startswith("BOGOTA") and len(dept_norm) > len("BOGOTA"):
        clean_muni = "BOGOTÁ D.C."
        
    # Special correction for Nariño records with municipality 'O'
    if code_prefix == "23" and clean_muni.upper() == "O":
        clean_muni = "BARBACOAS"
        
    # Special correction for San Andrés records
    if code_prefix == "56":
        clean_muni = "SAN ANDRÉS"
        
    # Clean spelling
    clean_muni = clean_spelling(clean_muni)
    clean_post = clean_spelling(post)
    
    if clean_dept == "BOGOTÁ D.C.":
        clean_muni = "BOGOTÁ D.C."
        
    r[0] = clean_dept
    r[1] = clean_muni
    r[2] = clean_post
    return r

def safe_int(val, default=0):
    if val is None:
        return default
    try:
        return int(val)
    except:
        try:
            return int(float(val))
        except:
            return default

def safe_float(val, default=0.0):
    if val is None:
        return default
    try:
        return float(val)
    except:
        return default

def main():
    print("Loading datasets...")
    # Load DIVIPOL records
    with open(divipol_json_path, "r", encoding="utf-8") as f:
        divipol_records = json.load(f)
        
    # Load Anomalies records
    with open(anom_json_path, "r", encoding="utf-8") as f:
        anom_data = json.load(f)
        
    print("Cleaning DIVIPOL records...")
    cleaned_divipol_records = []
    for r in divipol_records:
        cleaned_divipol_records.append(clean_divipol_record(r))
        
    # Re-save cleaned DIVIPOL records to JSON
    with open(divipol_json_path, "w", encoding="utf-8") as f:
        json.dump(cleaned_divipol_records, f, indent=2, ensure_ascii=False)
    print(f"Cleaned and saved {len(cleaned_divipol_records)} DIVIPOL records.")
        
    # Re-calculate statistics for DIVIPOL
    total_posts = len(cleaned_divipol_records)
    total_women = sum(r["women_census"] for r in cleaned_divipol_records)
    total_men = sum(r["men_census"] for r in cleaned_divipol_records)
    total_census = total_women + total_men
    total_tables = sum(r["tables"] for r in cleaned_divipol_records)
    
    depts = set()
    munis = set()
    dept_stats = {}
    for r in cleaned_divipol_records:
        depts.add(r["department"])
        munis.add(f"{r['department']}-{r['municipality']}")
        dept = r["department"]
        if dept not in dept_stats:
            dept_stats[dept] = {"posts": 0, "women": 0, "men": 0, "tables": 0}
        dept_stats[dept]["posts"] += 1
        dept_stats[dept]["women"] += r["women_census"]
        dept_stats[dept]["men"] += r["men_census"]
        dept_stats[dept]["tables"] += r["tables"]
        
    sorted_dept_stats = []
    for dept, s in dept_stats.items():
        total = s["women"] + s["men"]
        sorted_dept_stats.append({
            "name": dept,
            "posts": s["posts"],
            "women": s["women"],
            "men": s["men"],
            "total": total,
            "tables": s["tables"],
            "avg_per_table": round(total / s["tables"], 2) if s["tables"] > 0 else 0
        })
    sorted_dept_stats.sort(key=lambda x: x["total"], reverse=True)
    
    compact_divipol = []
    for r in cleaned_divipol_records:
        compact_divipol.append([
            r["code"], r["department"], r["municipality"], r["post_name"],
            r["women_census"], r["men_census"], r["total_census"], r["tables"],
            r["zone_code"], r["location_name"]
        ])
        
    divipol_stats = {
        "total_posts": total_posts,
        "total_departments": len(depts),
        "total_municipalities": len(munis),
        "total_women": total_women,
        "total_men": total_men,
        "total_census": total_census,
        "total_tables": total_tables,
        "avg_per_table": round(total_census / total_tables, 2) if total_tables > 0 else 0,
        "dept_stats": sorted_dept_stats
    }
    
    print("Cleaning Anomalies records...")
    table_records = anom_data["table"]
    compact_anom = []
    for r in table_records:
        cleaned_row = clean_anomaly_record([
            r.get("DEPARTAMENTO") or "",
            r.get("MUNICIPIO") or "",
            r.get("PUESTO") or "",
            safe_int(r.get("MESA")),
            safe_float(r.get("POTENCIAL")),
            safe_float(r.get("Votos Mesa PRE")),
            safe_float(r.get("Votos Cand. PRE")),
            safe_float(r.get("% Partic. Mesa PRE")),
            safe_float(r.get("% Cand. Mesa PRE")),
            safe_float(r.get("Dif. Mesa Neta")),
            r.get("Var. Súbita PRE") or "0. Mínima",
            r.get("Concent. Cand. PRE") or "1. Normal",
            r.get("Estado del sobre") or "BUENO"
        ])
        compact_anom.append(cleaned_row)
        
    # Clean anomalies stats by department
    cleaned_anom_dept_stats = []
    raw_anom_dept = anom_data.get("anom_by_dept", [])
    anom_dept_agg = {}
    
    for d in raw_anom_dept:
        raw_name = d["DEPARTAMENTO"]
        if raw_name == "Total":
            continue
        clean_name = clean_department(raw_name)
        if clean_name not in anom_dept_agg:
            anom_dept_agg[clean_name] = {
                "mesas_anom": 0,
                "suma_dif": 0.0,
                "peor_dif": 0.0
            }
        anom_dept_agg[clean_name]["mesas_anom"] += d["mesas_anom"]
        anom_dept_agg[clean_name]["suma_dif"] += d["suma_dif"]
        if abs(d["peor_dif"]) > abs(anom_dept_agg[clean_name]["peor_dif"]):
            anom_dept_agg[clean_name]["peor_dif"] = d["peor_dif"]
            
    for name, metrics in anom_dept_agg.items():
        cleaned_anom_dept_stats.append({
            "DEPARTAMENTO": name,
            "mesas_anom": metrics["mesas_anom"],
            "suma_dif": metrics["suma_dif"],
            "peor_dif": metrics["peor_dif"]
        })
    cleaned_anom_dept_stats.sort(key=lambda x: x["mesas_anom"], reverse=True)
    
    # Save cleaned Anomalies data to JSON
    cleaned_table = []
    for r in compact_anom:
        cleaned_table.append({
            "DEPARTAMENTO": r[0],
            "MUNICIPIO": r[1],
            "PUESTO": r[2],
            "MESA": r[3],
            "POTENCIAL": r[4],
            "Votos Mesa PRE": r[5],
            "Votos Cand. PRE": r[6],
            "% Partic. Mesa PRE": r[7],
            "% Cand. Mesa PRE": r[8],
            "Dif. Mesa Neta": r[9],
            "Var. Súbita PRE": r[10],
            "Concent. Cand. PRE": r[11],
            "Estado del sobre": r[12]
        })
    anom_data["table"] = cleaned_table
    anom_data["anom_by_dept"] = cleaned_anom_dept_stats
    
    # Clean by_dept in anomalies_data
    cleaned_by_dept = []
    raw_by_dept = anom_data.get("by_dept", [])
    by_dept_agg = {}
    for d in raw_by_dept:
        raw_name = d["DEPARTAMENTO"]
        if raw_name == "Total":
            continue
        clean_name = clean_department(raw_name)
        if clean_name not in by_dept_agg:
            by_dept_agg[clean_name] = {
                "mesas": 0,
                "votos_cand": 0.0,
                "votos_mesa": 0.0,
                "potencial": 0.0,
                "pct_partic_sum": 0.0,
                "pct_cand_sum": 0.0,
                "count": 0
            }
        by_dept_agg[clean_name]["mesas"] += d["mesas"]
        by_dept_agg[clean_name]["votos_cand"] += d["votos_cand"]
        by_dept_agg[clean_name]["votos_mesa"] += d["votos_mesa"]
        by_dept_agg[clean_name]["potencial"] += d["potencial"]
        by_dept_agg[clean_name]["pct_partic_sum"] += d["pct_partic_avg"] * d["mesas"]
        by_dept_agg[clean_name]["pct_cand_sum"] += d["pct_cand_avg"] * d["mesas"]
        by_dept_agg[clean_name]["count"] += d["mesas"]
        
    for name, metrics in by_dept_agg.items():
        cleaned_by_dept.append({
            "DEPARTAMENTO": name,
            "mesas": metrics["mesas"],
            "votos_cand": metrics["votos_cand"],
            "votos_mesa": metrics["votos_mesa"],
            "potencial": metrics["potencial"],
            "pct_partic_avg": metrics["pct_partic_sum"] / metrics["count"] if metrics["count"] > 0 else 0,
            "pct_cand_avg": metrics["pct_cand_sum"] / metrics["count"] if metrics["count"] > 0 else 0
        })
    cleaned_by_dept.sort(key=lambda x: x["mesas"], reverse=True)
    anom_data["by_dept"] = cleaned_by_dept
    
    # Save clean anomalies_data.json
    with open(anom_json_path, "w", encoding="utf-8") as f:
        json.dump(anom_data, f, indent=2, ensure_ascii=False)
    print(f"Cleaned and saved anomalies data.")

    # Re-calculate KPIs for anomalies
    kpis = anom_data["kpis"]
    kpis["departamentos"] = len(by_dept_agg)
    kpis["municipios"] = len(set(f"{r[0]}-{r[1]}" for r in compact_anom))
    kpis["total_mesas"] = len(compact_anom)
    kpis["mesas_anomalia"] = sum(1 for r in compact_anom if r[9] != 0)
    kpis["mesas_bueno"] = kpis["total_mesas"] - kpis["mesas_anomalia"]
    
    # Save clean data.js
    print(f"Writing compiled clean data.js to {output_js_path}...")
    with open(output_js_path, "w", encoding="utf-8") as f:
        f.write("/* Precalculated statistics and compact DIVIPOL data */\n")
        f.write("window.DIVIPOL_STATS = " + json.dumps(divipol_stats, indent=2, ensure_ascii=False) + ";\n\n")
        f.write("window.DIVIPOL_DATA_COLUMNS = ['code', 'department', 'municipality', 'post_name', 'women_census', 'men_census', 'total_census', 'tables', 'zone_code', 'location_name'];\n\n")
        f.write("window.DIVIPOL_DATA = " + json.dumps(compact_divipol, ensure_ascii=False) + ";\n\n")
        
        f.write("/* Anomalies data from evidencias-mesas-8hid.vercel.app */\n")
        f.write("window.ANOMALIES_STATS = " + json.dumps(kpis, indent=2, ensure_ascii=False) + ";\n\n")
        f.write("window.ANOMALIES_DEPT_STATS = " + json.dumps(cleaned_anom_dept_stats, ensure_ascii=False) + ";\n\n")
        f.write("window.ANOMALIES_DATA_COLUMNS = ['department', 'municipality', 'post_name', 'mesa', 'potential', 'votos_pre', 'votos_cand', 'partic_pct', 'cand_pct', 'dif', 'var', 'concent', 'estado'];\n\n")
        f.write("window.ANOMALIES_DATA = " + json.dumps(compact_anom, ensure_ascii=False) + ";\n")
        
    print(f"data.js regenerated successfully. Size: {os.path.getsize(output_js_path)} bytes.")

if __name__ == "__main__":
    main()
