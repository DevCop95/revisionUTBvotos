// Global state
let currentRecords = [];
let filteredRecords = [];
let currentPage = 1;
let activeTab = 'censo'; // 'censo' or 'anomalias'
const rowsPerPage = 50;

// DOM elements
const selectDept = document.getElementById('select-dept');
const selectMuni = document.getElementById('select-muni');
const selectWinner = document.getElementById('select-winner');
const winnerFilterWrapper = document.getElementById('winner-filter-wrapper');
const searchInput = document.getElementById('search-query');
const tableBody = document.getElementById('table-body');
const resultsCountEl = document.getElementById('results-count');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const pageIndicator = document.getElementById('page-indicator');
const deptStatsList = document.getElementById('dept-stats-list');
const fileNamePill = document.getElementById('file-name-pill');

// Init application
document.addEventListener('DOMContentLoaded', () => {
    // Check if data is loaded
    if (typeof window.DIVIPOL_DATA === 'undefined' || typeof window.DIVIPOL_STATS === 'undefined' || typeof window.ANOMALIES_DATA === 'undefined') {
        console.error("Data could not be loaded from data.js");
        tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 3rem; color: var(--color-danger)">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 1rem; display: block"></i>
            Error al cargar el archivo de datos. Por favor, asegúrese de que data.js existe y contiene ambos datasets.
        </td></tr>`;
        return;
    }

    // Set file name in pill
    fileNamePill.textContent = window.DIVIPOL_STATS.total_posts > 0 
        ? "1046427856-La-metadata-del-documento-en-el-que-se-basa-el-presidente-Petro-para-hablar-de-fraude.pdf" 
        : "Cargado";

    // Set global records
    currentRecords = window.DIVIPOL_DATA;
    filteredRecords = currentRecords;

    // Load initial data
    loadStats();
    populateDepartments();
    loadDeptChart();
    renderTable();

    // Theme toggle setup
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
    
    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            showToast('Tema claro activado');
        } else {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            showToast('Tema oscuro activado');
        }
    });

    // Event listeners
    selectDept.addEventListener('change', handleDeptChange);
    selectMuni.addEventListener('change', filterData);
    selectWinner.addEventListener('change', filterData);
    searchInput.addEventListener('input', debounce(filterData, 250));
    btnPrev.addEventListener('click', () => changePage(-1));
    btnNext.addEventListener('click', () => changePage(1));
});

// Switch active dataset
function switchTab(tabName) {
    if (activeTab === tabName) return;
    activeTab = tabName;
    
    // Update active tab buttons visual state
    document.getElementById('tab-censo').classList.toggle('active', tabName === 'censo');
    document.getElementById('tab-anomalias').classList.toggle('active', tabName === 'anomalias');
    
    // Reset filters
    searchInput.value = '';
    selectDept.value = '';
    selectMuni.innerHTML = '<option value="">Todos los Municipios</option>';
    selectMuni.disabled = true;
    selectWinner.value = '';
    
    if (activeTab === 'censo') {
        currentRecords = window.DIVIPOL_DATA;
        searchInput.placeholder = "Buscar por Puesto de Votación, Municipio o Código...";
        winnerFilterWrapper.style.display = 'none';
    } else {
        currentRecords = window.ANOMALIES_DATA;
        searchInput.placeholder = "Buscar por Mesa, Puesto, Municipio, Alerta, Estado...";
        winnerFilterWrapper.style.display = 'block';
    }
    
    filteredRecords = currentRecords;
    currentPage = 1;
    
    // Refresh table and stats
    populateDepartments();
    updateTableHeader();
    renderTable();
    loadStats();
    loadDeptChart();
}

// Load stats into dashboard
function loadStats() {
    if (activeTab === 'censo') {
        const stats = window.DIVIPOL_STATS;
        
        document.getElementById('lbl-1').textContent = 'Censo Femenino';
        document.getElementById('val-1').textContent = formatNum(stats.total_women);
        
        document.getElementById('lbl-2').textContent = 'Censo Masculino';
        document.getElementById('val-2').textContent = formatNum(stats.total_men);
        
        document.getElementById('lbl-3').textContent = 'Censo Total';
        document.getElementById('val-3').textContent = formatNum(stats.total_census);
        
        document.getElementById('lbl-4').textContent = 'Mesas Totales';
        document.getElementById('val-4').textContent = formatNum(stats.total_tables);
        
        document.getElementById('lbl-5').textContent = 'Promedio / Mesa';
        document.getElementById('val-5').textContent = stats.avg_per_table;
    } else {
        const stats = window.ANOMALIES_STATS;
        
        document.getElementById('lbl-1').textContent = 'Mesas Reportadas';
        document.getElementById('val-1').textContent = formatNum(stats.total_mesas);
        
        document.getElementById('lbl-2').textContent = 'Mesas con Anomalía';
        document.getElementById('val-2').textContent = formatNum(stats.mesas_anomalia);
        
        document.getElementById('lbl-3').textContent = 'Votos Urna (PRE)';
        document.getElementById('val-3').textContent = formatNum(stats.votos_mesa_pre);
        
        document.getElementById('lbl-4').textContent = 'Votos Candidatos';
        document.getElementById('val-4').textContent = formatNum(stats.votos_cand_pre);
        
        document.getElementById('lbl-5').textContent = 'Part. Promedio';
        document.getElementById('val-5').textContent = stats.participacion_avg + '%';
    }
}

// Populate department dropdown
function populateDepartments() {
    selectDept.innerHTML = '<option value="">Todos los Departamentos</option>';
    const depts = new Set();
    
    if (activeTab === 'censo') {
        currentRecords.forEach(r => {
            if (r[1]) depts.add(r[1]); // Column 1: department
        });
    } else {
        currentRecords.forEach(r => {
            if (r[0]) depts.add(r[0]); // Column 0: department
        });
    }
    
    const sortedDepts = Array.from(depts).sort();
    sortedDepts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        selectDept.appendChild(opt);
    });
}

// Populate municipality dropdown based on department selection
function populateMunicipalities(deptName) {
    selectMuni.innerHTML = '<option value="">Todos los Municipios</option>';
    
    if (!deptName) {
        selectMuni.disabled = true;
        return;
    }
    
    const munis = new Set();
    
    if (activeTab === 'censo') {
        window.DIVIPOL_DATA.forEach(r => {
            if (r[1] === deptName && r[2]) { // Column 2: municipality
                munis.add(r[2]);
            }
        });
    } else {
        window.ANOMALIES_DATA.forEach(r => {
            if (r[0] === deptName && r[1]) { // Column 1: municipality
                munis.add(r[1]);
            }
        });
    }
    
    const sortedMunis = Array.from(munis).sort();
    sortedMunis.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        selectMuni.appendChild(opt);
    });
    
    selectMuni.disabled = false;
}

// Department dropdown change handler
function handleDeptChange(e) {
    const dept = e.target.value;
    populateMunicipalities(dept);
    filterData();
}

// Filter data based on filters and search query
function filterData() {
    const dept = selectDept.value;
    const muni = selectMuni.value;
    const query = searchInput.value.toLowerCase().trim();
    
    if (activeTab === 'censo') {
        filteredRecords = currentRecords.filter(r => {
            // Dept match
            if (dept && r[1] !== dept) return false;
            // Muni match
            if (muni && r[2] !== muni) return false;
            
            // Search query match (search in code, department, municipality, post_name, location_name)
            if (query) {
                const code = r[0].toLowerCase();
                const deptName = r[1].toLowerCase();
                const muniName = r[2].toLowerCase();
                const postName = r[3].toLowerCase();
                const locName = r[9].toLowerCase();
                
                if (!code.includes(query) && 
                    !deptName.includes(query) && 
                    !muniName.includes(query) && 
                    !postName.includes(query) && 
                    !locName.includes(query)) {
                    return false;
                }
            }
            return true;
        });
    } else {
        filteredRecords = currentRecords.filter(r => {
            // Dept match
            if (dept && r[0] !== dept) return false;
            // Muni match
            if (muni && r[1] !== muni) return false;
            
            // Winner filter match (r[8] is cand_pct)
            const winner = selectWinner.value;
            if (winner) {
                const isEspriella = r[8] > 50;
                if (winner === 'espriella' && !isEspriella) return false;
                if (winner === 'cepeda' && isEspriella) return false;
            }
            
            // Search query match (search in department, municipality, post_name, mesa, status, alert)
            if (query) {
                const deptName = r[0].toLowerCase();
                const muniName = r[1].toLowerCase();
                const postName = r[2].toLowerCase();
                const mesaStr = r[3].toString();
                const alertVar = r[10].toLowerCase();
                const alertConc = r[11].toLowerCase();
                const estadoStr = (r[12] || '').toLowerCase();
                
                if (!deptName.includes(query) && 
                    !muniName.includes(query) && 
                    !postName.includes(query) && 
                    !mesaStr.includes(query) && 
                    !alertVar.includes(query) && 
                    !alertConc.includes(query) && 
                    !estadoStr.includes(query)) {
                    return false;
                }
            }
            return true;
        });
    }
    
    currentPage = 1;
    renderTable();
    updateFilteredStats();
}

// Update stats bar based on filtered data
function updateFilteredStats() {
    if (activeTab === 'censo') {
        let women = 0;
        let men = 0;
        let tables = 0;
        
        filteredRecords.forEach(r => {
            women += r[4];  // women_census
            men += r[5];    // men_census
            tables += r[7]; // tables
        });
        
        const total = women + men;
        const avg = tables > 0 ? (total / tables).toFixed(2) : '0';
        
        document.getElementById('val-1').textContent = formatNum(women);
        document.getElementById('val-2').textContent = formatNum(men);
        document.getElementById('val-3').textContent = formatNum(total);
        document.getElementById('val-4').textContent = formatNum(tables);
        document.getElementById('val-5').textContent = avg;
    } else {
        let totalMesas = filteredRecords.length;
        let anomMesas = 0;
        let votosUrna = 0;
        let votosCand = 0;
        let sumPartic = 0;
        
        filteredRecords.forEach(r => {
            if (r[9] !== 0) anomMesas++; // Net difference !== 0 is considered anomalous
            votosUrna += r[5];
            votosCand += r[6];
            sumPartic += r[7];
        });
        
        const avgPartic = totalMesas > 0 ? (sumPartic / totalMesas).toFixed(2) + '%' : '0%';
        
        document.getElementById('val-1').textContent = formatNum(totalMesas);
        document.getElementById('val-2').textContent = formatNum(anomMesas);
        document.getElementById('val-3').textContent = formatNum(votosUrna);
        document.getElementById('val-4').textContent = formatNum(votosCand);
        document.getElementById('val-5').textContent = avgPartic;
    }
}

// Update the dynamic table header
function updateTableHeader() {
    const tableHead = document.getElementById('table-head');
    if (activeTab === 'censo') {
        tableHead.innerHTML = `
            <tr>
                <th>Código</th>
                <th>Departamento</th>
                <th>Municipio</th>
                <th>Puesto de Votación</th>
                <th class="num-col">C. Mujeres</th>
                <th class="num-col">C. Hombres</th>
                <th class="num-col">Censo Total</th>
                <th class="num-col">Mesas</th>
                <th class="num-col">Prom/Mesa</th>
                <th>Comuna/Detalle</th>
            </tr>
        `;
    } else {
        tableHead.innerHTML = `
            <tr>
                <th>Departamento</th>
                <th>Municipio</th>
                <th>Puesto de Votación</th>
                <th class="num-col">Mesa</th>
                <th class="num-col">Habilitados</th>
                <th class="num-col">Votos Urna</th>
                <th class="num-col">Votos Cand</th>
                <th class="num-col">% Partic</th>
                <th class="num-col" style="text-align: center;">Ganador Mesa</th>
                <th class="num-col">Dif. Neta</th>
                <th>Alerta Var.</th>
                <th>Alerta Conc.</th>
                <th>Estado</th>
            </tr>
        `;
    }
}

// Render dynamic table with pagination
function renderTable() {
    tableBody.innerHTML = '';
    
    const totalRecords = filteredRecords.length;
    resultsCountEl.textContent = `Mostrando ${formatNum(Math.min(filteredRecords.length, rowsPerPage * currentPage))} de ${formatNum(totalRecords)} registros`;
    
    if (totalRecords === 0) {
        tableBody.innerHTML = `<tr><td colspan="${activeTab === 'censo' ? 10 : 13}" style="text-align:center; padding: 3rem; color: var(--color-text-muted)">
            No se encontraron registros que coincidan con la búsqueda.
        </td></tr>`;
        pageIndicator.textContent = 'Página 0 de 0';
        btnPrev.disabled = true;
        btnNext.disabled = true;
        return;
    }
    
    const totalPages = Math.ceil(totalRecords / rowsPerPage);
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    
    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages;
    
    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = Math.min(startIdx + rowsPerPage, totalRecords);
    
    for (let i = startIdx; i < endIdx; i++) {
        const r = filteredRecords[i];
        const tr = document.createElement('tr');
        
        if (activeTab === 'censo') {
            const avgVal = r[7] > 0 ? (r[6] / r[7]).toFixed(1) : '0.0';
            
            tr.innerHTML = `
                <td><code>${r[0]}</code></td>
                <td>${r[1]}</td>
                <td>${r[2]}</td>
                <td>${r[3]}</td>
                <td class="num-col">${formatNum(r[4])}</td>
                <td class="num-col">${formatNum(r[5])}</td>
                <td class="num-col" style="font-weight:600; color:var(--color-text-main)">${formatNum(r[6])}</td>
                <td class="num-col">${formatNum(r[7])}</td>
                <td class="num-col" style="color:var(--color-primary); font-weight:500">${avgVal}</td>
                <td><small style="color:var(--color-text-muted)">${r[9]}</small></td>
            `;
        } else {
            // Anomalies mapping:
            // 0: dept, 1: muni, 2: post_name, 3: mesa, 4: potential, 5: votos_pre, 6: votos_cand, 7: partic_pct, 8: cand_pct, 9: dif, 10: var, 11: concent, 12: estado
            
            // Format potential properly (consulados scaling)
            const potentialFormatted = formatPotential(r[0], r[4]);
            
            // Format difference color and prefix
            let difClass = '';
            let difText = formatNum(Math.round(r[9]));
            if (r[9] < 0) {
                difClass = 'text-danger';
            } else if (r[9] > 0) {
                difClass = 'text-success';
                difText = '+' + difText;
            } else {
                difClass = 'text-muted';
            }
            
            // Badges helpers
            const getAlertBadge = (val) => {
                const valLower = val.toLowerCase();
                if (valLower.includes('alta') || valLower.includes('muy alta') || valLower.includes('3.') || valLower.includes('4.')) {
                    return `<span class="badge badge-red">${val}</span>`;
                } else if (valLower.includes('media') || valLower.includes('normal') || valLower.includes('2.')) {
                    return `<span class="badge badge-orange">${val}</span>`;
                } else {
                    return `<span class="badge badge-gray">${val}</span>`;
                }
            };
            
            let estadoBadge = `<span class="badge badge-gray">N/A</span>`;
            if (r[12]) {
                const estLower = r[12].toLowerCase();
                if (estLower === 'bueno') {
                    estadoBadge = `<span class="badge badge-green">BUENO</span>`;
                } else if (estLower === 'mal') {
                    estadoBadge = `<span class="badge badge-red">MAL</span>`;
                } else {
                    estadoBadge = `<span class="badge badge-gray">${r[12]}</span>`;
                }
            }
            
            const isEspriella = r[8] > 50;
            const winnerName = isEspriella ? 'Espriella' : 'Cepeda';
            const winnerImg = isEspriella ? 'candidato_espriella.jpg' : 'candidato_cepeda.jpg';
            const winnerPct = isEspriella ? r[8].toFixed(1) : (100 - r[8]).toFixed(1);
            const winnerBadgeColor = isEspriella ? 'var(--color-primary)' : 'var(--color-danger)';
            
            const winnerCellHTML = `
                <td style="text-align: center; vertical-align: middle;">
                    <div class="winner-cell-badge" style="border-left: 2px solid ${winnerBadgeColor}; display: inline-flex; align-items: center; gap: 0.35rem; justify-content: center; padding: 0.15rem 0.35rem;">
                        <img src="${winnerImg}" class="winner-avatar" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;" alt="${winnerName}">
                        <span style="font-weight: 600; font-size: 0.75rem; color: var(--color-text-main)">${winnerName}</span>
                        <span style="font-size: 0.7rem; color: var(--color-text-muted); font-family: var(--font-mono)">(${winnerPct}%)</span>
                    </div>
                </td>
            `;

            tr.innerHTML = `
                <td>${r[0]}</td>
                <td>${r[1]}</td>
                <td>${r[2]}</td>
                <td class="num-col" style="font-weight:600"><code>${r[3]}</code></td>
                <td class="num-col">${potentialFormatted}</td>
                <td class="num-col">${formatNum(r[5])}</td>
                <td class="num-col">${formatNum(r[6])}</td>
                <td class="num-col">${r[7].toFixed(1)}%</td>
                ${winnerCellHTML}
                <td class="num-col ${difClass}">${difText}</td>
                <td>${getAlertBadge(r[10])}</td>
                <td>${getAlertBadge(r[11])}</td>
                <td>${estadoBadge}</td>
            `;
        }
        
        tableBody.appendChild(tr);
    }
}

// Consulados Potential electors formatting helper
function formatPotential(dept, val) {
    if (dept && dept.includes("CONSULADOS") && val < 15) {
        return formatNum(Math.round(val * 1000));
    }
    return formatNum(Math.round(val));
}

// Change page
function changePage(direction) {
    currentPage += direction;
    renderTable();
    document.querySelector('.table-container').scrollTop = 0;
}

// Load department stats chart
function loadDeptChart() {
    deptStatsList.innerHTML = '';
    
    if (activeTab === 'censo') {
        document.getElementById('dept-chart-title').innerHTML = '<i class="fa-solid fa-chart-column"></i> Censo por Departamentos';
        document.getElementById('dept-chart-desc').textContent = 'Estadísticas del potencial electoral agrupadas por departamento.';
        
        const stats = window.DIVIPOL_STATS;
        const depts = stats.dept_stats;
        
        if (!depts || depts.length === 0) return;
        
        const maxCensus = depts[0].total; // Top department has maximum census
        
        depts.forEach((d, idx) => {
            if (!d.name) return;
            
            const pct = (d.total / maxCensus) * 100;
            
            const deptRow = document.createElement('div');
            deptRow.className = 'dept-row animate-fade-in';
            deptRow.style.animationDelay = `${idx * 0.01}s`;
            
            deptRow.innerHTML = `
                <div class="dept-info">
                    <span class="dept-name">${idx + 1}. ${d.name} <small style="color:var(--color-text-muted); font-weight:400; margin-left:8px">${formatNum(d.posts)} puestos / ${formatNum(d.tables)} mesas</small></span>
                    <span class="dept-numbers"><strong>${formatNum(d.total)}</strong> votantes <span style="color:var(--color-text-muted)">(${d.avg_per_table} prom.)</span></span>
                </div>
                <div class="dept-bar-wrapper">
                    <div class="dept-bar-fill" style="width: 0%" data-width="${pct}%"></div>
                </div>
            `;
            
            deptStatsList.appendChild(deptRow);
        });
    } else {
        document.getElementById('dept-chart-title').innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Mesas con Anomalías por Departamentos';
        document.getElementById('dept-chart-desc').textContent = 'Cantidad de mesas reportadas con discrepancias de votos (diferencia ≠ 0) en el preconteo agrupadas por departamento.';
        
        const depts = window.ANOMALIES_DEPT_STATS;
        if (!depts || depts.length === 0) return;
        
        const maxAnom = Math.max(...depts.map(d => d.mesas_anom));
        
        // Calculate candidate percentage per department dynamically
        const deptWinnerStats = {};
        window.ANOMALIES_DATA.forEach(r => {
            const dept = r[0];
            const votosPre = r[5];
            const votosCand = r[6];
            if (!deptWinnerStats[dept]) {
                deptWinnerStats[dept] = { totalVotes: 0, candVotes: 0 };
            }
            deptWinnerStats[dept].totalVotes += votosPre;
            deptWinnerStats[dept].candVotes += votosCand;
        });
        
        depts.forEach((d, idx) => {
            if (!d.DEPARTAMENTO || d.DEPARTAMENTO === 'Total') return;
            
            const pct = maxAnom > 0 ? (d.mesas_anom / maxAnom) * 100 : 0;
            
            const deptRow = document.createElement('div');
            deptRow.className = 'dept-row animate-fade-in';
            deptRow.style.animationDelay = `${idx * 0.01}s`;
            
            const difText = d.suma_dif < 0 ? `${formatNum(Math.round(d.suma_dif))} votos` : `+${formatNum(Math.round(d.suma_dif))} votos`;
            const worstText = d.peor_dif < 0 ? `${formatNum(Math.round(d.peor_dif))} votos` : `+${formatNum(Math.round(d.peor_dif))} votos`;
            
            // Calculate department winner badge
            const stats = deptWinnerStats[d.DEPARTAMENTO];
            const deptPct = (stats && stats.totalVotes > 0) ? (stats.candVotes / stats.totalVotes * 100) : 50.0;
            const deptWinnerEspriella = deptPct > 50;
            const deptWinnerName = deptWinnerEspriella ? 'Espriella' : 'Cepeda';
            const deptWinnerImg = deptWinnerEspriella ? 'candidato_espriella.jpg' : 'candidato_cepeda.jpg';
            const deptWinnerPct = deptWinnerEspriella ? deptPct.toFixed(1) : (100 - deptPct).toFixed(1);
            const deptWinnerColor = deptWinnerEspriella ? 'var(--color-primary)' : 'var(--color-danger)';
            
            const winnerBadgeHTML = `
                <span class="winner-cell-badge" style="border-left: 2px solid ${deptWinnerColor}; display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.1rem 0.3rem; margin-left: 8px; font-size: 0.7rem; background: var(--bg-surface-hover);">
                    <img src="${deptWinnerImg}" class="winner-avatar" style="width: 14px; height: 14px; border-radius: 50%; object-fit: cover;" alt="${deptWinnerName}">
                    <strong>${deptWinnerName}</strong>
                    <span style="font-family: var(--font-mono)">(${deptWinnerPct}%)</span>
                </span>
            `;
            
            deptRow.innerHTML = `
                <div class="dept-info">
                    <span class="dept-name" style="display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                        ${idx + 1}. ${d.DEPARTAMENTO} ${winnerBadgeHTML} 
                        <small style="color:var(--color-text-muted); font-weight:400; margin-left:8px">Peor mesa: ${worstText} dif.</small>
                    </span>
                    <span class="dept-numbers"><strong class="text-danger">${formatNum(d.mesas_anom)}</strong> mesas con anomalía <span style="color:var(--color-text-muted)">(${difText} netos)</span></span>
                </div>
                <div class="dept-bar-wrapper">
                    <div class="dept-bar-fill" style="width: 0%; background: var(--color-danger)" data-width="${pct}%"></div>
                </div>
            `;
            
            deptStatsList.appendChild(deptRow);
        });
    }
    
    // Animate bars after rendering
    setTimeout(() => {
        const fills = document.querySelectorAll('.dept-bar-fill');
        fills.forEach(f => {
            f.style.width = f.getAttribute('data-width');
        });
    }, 100);
}

// Helpers
function formatNum(num) {
    return new Intl.NumberFormat('es-CO').format(num);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Copy to clipboard function
function copyText(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast(`Copiado: ${text.substring(0, 12)}...`);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}
