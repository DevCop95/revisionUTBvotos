/**
 * Mapa Electoral 3D - Colombia 2026
 * Muestra qué departamentos favorecieron a cada candidato usando datos
 * de ANOMALIES_DATA con efecto de extrusión 3D vía D3.js.
 * 
 * Naranja  = Departamentos donde ganó Abelardo de la Espriella (cand_pct > 50%)
 * Índigo   = Departamentos donde ganó Iván Cepeda Castro (cand_pct ≤ 50%)
 */

'use strict';

// ── Fuentes de datos geoespaciales (intentamos en orden hasta que uno funcione) ──
const GEOJSON_SOURCES = [
    'https://gist.githubusercontent.com/john-guerra/43c7656821069d00dcbc/raw/be6a6e239cd5b5b803c6e7c2ec405b793a9064dd/Colombia.geo.json',
    'https://raw.githubusercontent.com/hpedrorodrigues/geofiles/master/country/Colombia/colombia-departments.geojson',
];

// ── Paleta de candidatos ──────────────────────────────────────────────────────
const CAND = {
    espriella: {
        topFill:    '#f97316',   // Naranja (por petición del usuario)
        sideFill:   '#9a3412',
        borderCol:  '#fdba74',
        glowCol:    'rgba(249,115,22,0.55)',
        label:      'De la Espriella',
        imgSrc:     'candidato_espriella.jpg',
    },
    cepeda: {
        topFill:    '#6366f1',   // Índigo/violeta
        sideFill:   '#312e81',
        borderCol:  '#a5b4fc',
        glowCol:    'rgba(99,102,241,0.55)',
        label:      'Iván Cepeda',
        imgSrc:     'candidato_cepeda.jpg',
    },
    unknown: {
        topFill:    '#52525b',
        sideFill:   '#27272a',
        borderCol:  '#71717a',
        glowCol:    'rgba(113,113,122,0.3)',
        label:      'Sin datos',
        imgSrc:     null,
    },
};

// ── Estado del módulo ─────────────────────────────────────────────────────────
let _mapReady     = false;
let _deptWinners  = {};   // normKey → { winner, candPct, mesas, ... }

// ── Utilidades ────────────────────────────────────────────────────────────────

/** Normaliza un nombre de departamento (sin tildes, mayúsculas, sin símbolos) */
function normKey(name) {
    if (!name) return '';
    return String(name)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Extrae el nombre del departamento de un Feature GeoJSON (múltiples propiedades posibles) */
function getFeatureName(feature) {
    const p = feature.properties || {};
    return p.NOMBRE_DPT
        || p.name
        || p.DPTO_CNMBR
        || p.NOM_DEPAR
        || p.DEPARTMENT
        || p.admin
        || '';
}

/** Formatea números al estilo colombiano */
function fmtNum(n) {
    return new Intl.NumberFormat('es-CO').format(Math.round(n));
}

// ── Cálculo de ganadores por departamento ─────────────────────────────────────
function calcWinners() {
    if (!window.ANOMALIES_DATA) return {};

    const agg = {};
    window.ANOMALIES_DATA.forEach(r => {
        const dept = r[0];
        if (!dept || dept === 'CONSULADOS') return;
        if (!agg[dept]) agg[dept] = { candV: 0, totalV: 0, mesas: 0 };
        agg[dept].candV  += (r[6] || 0);
        agg[dept].totalV += (r[5] || 0);
        agg[dept].mesas++;
    });

    const result = {};
    let espN = 0, cepN = 0;

    for (const [dept, s] of Object.entries(agg)) {
        const pct    = s.totalV > 0 ? (s.candV / s.totalV * 100) : 50;
        const winner = pct > 50 ? 'espriella' : 'cepeda';
        const nk     = normKey(dept);
        result[nk]   = { winner, candPct: pct, mesas: s.mesas,
                         candVotes: s.candV, totalVotes: s.totalV, displayName: dept };
        if (winner === 'espriella') espN++; else cepN++;
    }

    // Actualizar contadores en el modal
    const setEl = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setEl('espriella-dept-count', espN);
    setEl('cepeda-dept-count',    cepN);
    setEl('espriella-dept-label', espN === 1 ? 'departamento' : 'departamentos');
    setEl('cepeda-dept-label',    cepN === 1 ? 'departamento' : 'departamentos');

    return result;
}

// ── Control del modal ─────────────────────────────────────────────────────────
function openMapModal() {
    const modal = document.getElementById('map-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';

    if (!_mapReady) {
        _mapReady = true;
        _initMap();
    }
}

function closeMapModal() {
    const modal = document.getElementById('map-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

// Cerrar con Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMapModal(); });

// ── Inicialización asíncrona del mapa ─────────────────────────────────────────
async function _initMap() {
    const loader = document.getElementById('map-loader');

    try {
        _setLoaderText(loader, 'Calculando resultados por departamento…', false);
        _deptWinners = calcWinners();

        _setLoaderText(loader, 'Cargando datos geográficos de Colombia…', false);
        const geo = await _fetchGeoJSON();

        if (loader) loader.style.display = 'none';
        _render(geo);

    } catch (err) {
        console.error('[map.js]', err);
        _setLoaderText(loader,
            `<i class="fa-solid fa-circle-exclamation" style="color:var(--color-danger)"></i>&nbsp;` +
            `No se pudo cargar el mapa.<br><small>${err.message}</small>`,
            true);
    }
}

function _setLoaderText(el, html, isError) {
    if (!el) return;
    el.style.display = 'flex';
    const txt = el.querySelector('.map-loader-text');
    if (txt) txt.innerHTML = html;
    if (isError) el.classList.add('map-loader-error');
}

async function _fetchGeoJSON() {
    for (const url of GEOJSON_SOURCES) {
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
        } catch (_) { /* intentar siguiente */ }
    }
    throw new Error('Todas las fuentes GeoJSON fallaron. Verifique su conexión a internet.');
}

// ── Renderizado del mapa 3D ───────────────────────────────────────────────────
function _render(geoJSON) {
    const container = document.getElementById('colombia-map-container');
    if (!container || !window.d3) return;

    container.innerHTML = '';

    const W = container.clientWidth  || 740;
    const H = container.clientHeight || 560;

    // Proyección Mercator ajustada al bounding-box de Colombia
    const proj = d3.geoMercator().fitExtent([[30, 20], [W - 30, H - 20]], geoJSON);
    const path = d3.geoPath().projection(proj);

    // Profundidad del efecto 3D (desplazamiento de la cara lateral)
    const EX = 10, EY = 8;

    // ── SVG principal ────────────────────────────────────────────────────────
    const svg = d3.select(container)
        .append('svg')
        .attr('width', W)
        .attr('height', H)
        .attr('class', 'colombia-svg');

    // Filtro de brillo para hover
    const defs = svg.append('defs');
    const glowFilter = defs.append('filter')
        .attr('id', 'dept-glow')
        .attr('x', '-40%').attr('y', '-40%')
        .attr('width', '180%').attr('height', '180%');
    glowFilter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', 5)
        .attr('result', 'blur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Grupos: caras laterales primero, luego superiores
    const gSides = svg.append('g').attr('class', 'g-sides');
    const gTops  = svg.append('g').attr('class', 'g-tops');

    // ── Tooltip ──────────────────────────────────────────────────────────────
    const tooltip = d3.select(container)
        .append('div')
        .attr('class', 'map-tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('pointer-events', 'none');

    // ── Renderizar cada departamento ─────────────────────────────────────────
    geoJSON.features.forEach(feature => {
        const rawName = getFeatureName(feature);
        const nk      = normKey(rawName);
        const info    = _deptWinners[nk];
        const winner  = info ? info.winner : 'unknown';
        const cols    = CAND[winner];
        const dPath   = path(feature);
        if (!dPath) return;

        // Cara lateral (extrusión)
        gSides.append('path')
            .attr('d', dPath)
            .attr('transform', `translate(${EX},${EY})`)
            .attr('fill', cols.sideFill)
            .attr('opacity', 0.7);

        // Cara superior + interactividad
        const grp = gTops.append('g').style('cursor', 'pointer');

        const topPath = grp.append('path')
            .attr('d', dPath)
            .attr('fill', cols.topFill)
            .attr('stroke', 'rgba(255,255,255,0.35)')
            .attr('stroke-width', 0.8)
            .attr('opacity', 0.88);

        // ── Hover ────────────────────────────────────────────────────────────
        grp.on('mouseover', function(event) {
            topPath.interrupt()
                .transition().duration(120)
                .attr('transform', `translate(${-EX*0.5},${-EY*0.5})`)
                .attr('opacity', 1)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .attr('filter', `drop-shadow(0 0 8px ${cols.glowCol})`);

            const pct2 = info
                ? (info.winner === 'espriella' ? info.candPct : 100 - info.candPct).toFixed(1)
                : '—';

            const html = info ? `
                <div class="tt-name">${info.displayName}</div>
                <div class="tt-winner" style="color:${cols.topFill}">
                    <strong>▶ ${cols.label}</strong>
                </div>
                <div class="tt-row"><span>% Candidato:</span><strong>${info.candPct.toFixed(1)}%</strong></div>
                <div class="tt-row"><span>Ventaja:</span><strong>${pct2}%</strong></div>
                <div class="tt-row"><span>Mesas analizadas:</span><strong>${fmtNum(info.mesas)}</strong></div>
                <div class="tt-row"><span>Votos candidato:</span><strong>${fmtNum(info.candVotes)}</strong></div>
                <div class="tt-row"><span>Votos totales:</span><strong>${fmtNum(info.totalVotes)}</strong></div>
            ` : `
                <div class="tt-name">${rawName || 'Departamento'}</div>
                <div style="color:var(--color-text-muted);font-size:0.75rem;margin-top:0.35rem">Sin datos en el dataset</div>
            `;

            let tx = event.offsetX + 16;
            let ty = event.offsetY - 10;
            if (tx + 230 > W) tx = event.offsetX - 246;
            if (ty < 0)       ty = event.offsetY + 12;

            tooltip.html(html)
                .style('opacity', 1)
                .style('left', tx + 'px')
                .style('top',  ty + 'px');
        })
        .on('mousemove', function(event) {
            let tx = event.offsetX + 16;
            let ty = event.offsetY - 10;
            if (tx + 230 > W) tx = event.offsetX - 246;
            if (ty < 0)       ty = event.offsetY + 12;
            tooltip.style('left', tx + 'px').style('top', ty + 'px');
        })
        .on('mouseout', function() {
            topPath.interrupt()
                .transition().duration(120)
                .attr('transform', null)
                .attr('opacity', 0.88)
                .attr('stroke', 'rgba(255,255,255,0.35)')
                .attr('stroke-width', 0.8)
                .attr('filter', null);
            tooltip.style('opacity', 0);
        });
    });

    // ── Leyenda integrada en el mapa ─────────────────────────────────────────
    const LX = W - 170, LY = H - 90;
    const leg = svg.append('g').attr('transform', `translate(${LX},${LY})`);

    leg.append('rect')
        .attr('width', 162).attr('height', 78).attr('rx', 8)
        .attr('fill', 'rgba(0,0,0,0.72)')
        .attr('stroke', 'rgba(255,255,255,0.08)');

    [
        { color: CAND.espriella.topFill, label: 'Espriella (naranja)' },
        { color: CAND.cepeda.topFill,   label: 'Cepeda (índigo)' },
        { color: CAND.unknown.topFill,  label: 'Sin datos' },
    ].forEach(({ color, label }, i) => {
        const y = 20 + i * 22;
        leg.append('rect')
            .attr('x', 12).attr('y', y - 7)
            .attr('width', 14).attr('height', 14).attr('rx', 3)
            .attr('fill', color);
        leg.append('text')
            .attr('x', 33).attr('y', y + 4)
            .attr('fill', '#e5e7eb')
            .attr('font-size', '11.5px')
            .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
            .text(label);
    });
}
