# 🗳️ Auditoría Electoral Independiente — Revisión DIVIPOL 2026

> **Análisis técnico e independiente** de los metadatos del archivo DIVIPOL y del censo electoral utilizado como base para las afirmaciones de fraude en las elecciones colombianas de 2026.

[![Live Demo](https://img.shields.io/badge/Demo-localhost%3A8000-blue?style=flat-square&logo=google-chrome)](http://localhost:8000)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=flat-square&logo=d3.js&logoColor=white)](https://d3js.org)

---

## 📋 Descripción

Este proyecto es un **dashboard interactivo** que analiza el archivo PDF del DIVIPOL publicado por la Registraduría Nacional del Estado Civil de Colombia, y los datos de mesas electorales con anomalías detectadas para las elecciones del 2026.

El análisis es completamente técnico y basado en datos, sin tendencias políticas. Todos los cálculos se realizan **localmente en el navegador del usuario** — ningún dato se envía a servidores externos.

---

## 🌟 Características

### 📊 Dashboard Principal
- **Metadatos del PDF**: Autor, fechas de creación/modificación, herramienta de edición, tamaño, hash SHA-256
- **Estadísticas DIVIPOL**: Total de puestos, municipios, departamentos, potencial electoral
- **Línea de tiempo**: Visualización cronológica de las firmas de tiempo del documento

### 🔍 Explorador de Datos
- **Censo DIVIPOL** — 100% de los registros con búsqueda en tiempo real
- **Mesas con Anomalías** — Filtrado por departamento, municipio y candidato ganador
- Paginación eficiente (50 registros/página)
- Columna `Ganador Mesa` con foto del candidato y porcentaje

### 🗺️ Mapa Electoral 3D
- Mapa interactivo de Colombia con extrusión 3D usando D3.js
- **🟠 Naranja**: Departamentos donde ganó De la Espriella (cand_pct > 50%)
- **🟣 Índigo**: Departamentos donde ganó Iván Cepeda (cand_pct ≤ 50%)
- Tooltips con datos detallados al pasar el cursor
- Conteo de departamentos por candidato en tiempo real

### 📱 Diseño Mobile-First
- Completamente responsivo para teléfonos (320px+)
- PWA-ready (favicon, meta tags, apple-touch-icon)
- Scroll horizontal suave en tablas y pestañas
- Botones touch-friendly (mínimo 44px)

### 🌗 Modo Oscuro / Claro
- Toggle persistente vía `localStorage`

---

## 🛠️ Tecnologías Utilizadas

| Categoría | Tecnología | Uso |
|-----------|-----------|-----|
| Frontend | HTML5 + CSS3 + Vanilla JS | UI del dashboard |
| Visualización | D3.js v7 | Mapa 3D Colombia |
| Íconos | Font Awesome 6 | Íconos UI |
| Tipografía | Outfit + JetBrains Mono | Texto y datos |
| Parsing PDF | PyMuPDF (`fitz`) | Extracción de metadatos |
| Limpieza de datos | Python stdlib + regex | Normalización y corrección de mojibake |
| GeoJSON | Wikimedia / GitHub Gist | Límites departamentales Colombia |

### 🔧 Solución al Problema de Mojibake (Codificación PDF)

El archivo PDF usa codificación `cp1252` (Latin-1 de Windows). Al extraer el texto con PyMuPDF, los caracteres especiales del español (tildes, ñ, etc.) se corrupcionaron. Las soluciones implementadas fueron:

1. **Detección automática de encoding** con `chardet` como fallback
2. **Mapeo manual de caracteres corruptos** — Diccionario exhaustivo de sustituciones (ej: `NariÃ±o → Nariño`, `BogotÃ¡ → Bogotá`)
3. **Limpieza post-extracción** en `clean_datasets.py` aplicada a `parsed_divipol.json` y `anomalies_data.json`
4. **Validación manual** de los 32 departamentos para garantizar nombres correctos

> ⚠️ **Nota**: Se rechazó el enfoque de "normalización sin tildes" (ej: `Nariño → Nario`) por ser **no profesional** e incorrecto.

---

## 📁 Estructura del Proyecto

```
revisionUTBvotos/
├── index.html              # Dashboard principal (SPA)
├── style.css               # Estilos del diseño (light/dark mode)
├── mobile.css              # Overrides responsivos mobile-first
├── app.js                  # Lógica del dashboard (filtros, tabla, gráficas)
├── map.js                  # Mapa Electoral 3D con D3.js
├── data.js                 # Dataset exportado (DIVIPOL + Anomalías)
├── favicon.svg             # Favicon vectorial
├── favicon-192.png         # Favicon 192x192 para Android/iOS
├── candidato_espriella.jpg # Foto oficial Abelardo de la Espriella
├── candidato_cepeda.jpg    # Foto oficial Iván Cepeda Castro
├── clean_datasets.py       # Script de limpieza y normalización de datos
├── parsed_divipol.json     # Datos crudos del PDF parseado
└── anomalies_data.json     # Mesas con anomalías detectadas
```

---

## 🚀 Cómo Ejecutar

### Requisitos
- Python 3.8+
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet (para cargar D3.js y el GeoJSON del mapa)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/DevCop95/revisionUTBvotos.git
cd revisionUTBvotos

# 2. Iniciar servidor local con Python
python -m http.server 8000

# 3. Abrir en el navegador
# http://localhost:8000
```

> El servidor local es necesario porque los archivos JSON se cargan vía `fetch()` y el protocolo `file://` bloquea estas peticiones por CORS.

---

## 📊 Fuentes de Datos

| Archivo | Fuente | Descripción |
|---------|--------|-------------|
| `1046427856-La-metadata-del-documento...pdf` | Registraduría Nacional | Archivo DIVIPOL oficial |
| `parsed_divipol.json` | Extraído del PDF | 100% de los puestos de votación |
| `anomalies_data.json` | Análisis estadístico | Mesas con diferencias estadísticas |

---

## 🔑 Hallazgos Técnicos

1. **Fecha de creación vs. modificación**: El PDF fue creado el `31/05/2025` y modificado el `21/05/2025` — la fecha de modificación es **anterior** a la de creación, lo cual es una anomalía técnica.

2. **Herramienta de edición**: El PDF fue editado con **Nitro PDF**, un software comercial de edición — no un generador oficial de reportes.

3. **Metadatos de autor**: El documento contiene metadatos de autoría que no corresponden a la Registraduría.

4. **Mesas con anomalías**: Se identificaron mesas donde el porcentaje del candidato fiscalizado supera rangos estadísticos esperados.

---

## 👥 Candidatos Analizados

| Candidato | Color en mapa | Criterio |
|-----------|---------------|---------|
| **Abelardo de la Espriella** | 🟠 Naranja | `cand_pct > 50%` |
| **Iván Cepeda Castro** | 🟣 Índigo | `cand_pct ≤ 50%` |

---

## ⚖️ Descargo de Responsabilidad

Este análisis es de carácter **técnico e independiente**, realizado por la iniciativa ciudadana **Unidos Transparentes**. No representa una posición política. Los datos provienen de fuentes públicas y el procesamiento es reproducible y verificable.

---

## 📄 Licencia

MIT License — Ver [LICENSE](LICENSE) para más detalles.

---

*Desarrollado con ❤️ para la transparencia electoral colombiana.*
