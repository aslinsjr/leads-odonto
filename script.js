let originalData = [];
let filteredData = [];
let currentSort = { column: null, ascending: true };
let currentPage = 1;
let pageSize = 50;
let pageCache = new Map();
let columnFilters = {};
let searchTerm = '';

// Debounce para otimizar buscas
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

// Carrega dados com indicador de progresso
async function loadData() {
    try {
        showLoading(true, 'Carregando arquivo...');
        const response = await fetch('dados.json');
        const data = await response.json();
        
        showLoading(true, `Processando ${data.length} registros...`);
        
        // Processa dados em chunks para não travar o browser
        const chunkSize = 1000;
        originalData = [];
        
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
            originalData.push(...chunk);
            
            const progress = Math.round((i / data.length) * 100);
            updateLoadingProgress(progress, i);
            
            // Permite que o browser respire
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        filteredData = [...originalData];
        initializeFilters();
        renderTable(filteredData);
        updateStats();
        updatePaginationControls();
        showLoading(false);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.getElementById('tableBody').innerHTML = 
            '<tr><td colspan="10" class="no-data">Erro ao carregar dados. Verifique se o arquivo "dados.json" está no mesmo diretório.</td></tr>';
        showLoading(false);
    }
}

// Sistema de loading
function showLoading(show, message = 'Processando...') {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    if (show) {
        overlay.style.display = 'flex';
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
    } else {
        overlay.style.display = 'none';
    }
}

function updateLoadingProgress(progress, count) {
    const loadingBar = document.getElementById('loadingBar');
    const loadingCount = document.getElementById('loadingCount');
    
    if (loadingBar) {
        loadingBar.style.width = progress + '%';
    }
    if (loadingCount) {
        loadingCount.textContent = count.toLocaleString('pt-BR');
    }
}

// Renderização otimizada com cache
function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="no-data">Nenhum resultado encontrado</td></tr>';
        return;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageKey = `${currentPage}-${pageSize}-${data.length}`;
    
    // Verifica cache
    if (pageCache.has(pageKey)) {
        tbody.innerHTML = pageCache.get(pageKey);
        return;
    }

    const paginatedData = data.slice(startIndex, endIndex);
    const html = paginatedData.map(item => `
        <tr>
            <td>${item.ID_Insta || '-'}</td>
            <td><strong>@${item.Conta_Insta || '-'}</strong></td>
            <td>${item.Nome || '-'}</td>
            <td style="max-width: 300px;">${item.Bio || '-'}</td>
            <td class="phone">${item.Telefone || '-'}</td>
            <td class="email">${item['e-mail'] || '-'}</td>
            <td class="link" style="max-width: 150px;">${item['Link-Bio'] || '-'}</td>
            <td>${item.Local || '-'}</td>
            <td><span class="badge">${String(item.Idioma || '-').toUpperCase()}</span></td>
            <td>${item.Especialidades_Extraidas || '-'}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = html;
    
    // Salva no cache (máximo 10 páginas)
    if (pageCache.size > 10) {
        const firstKey = pageCache.keys().next().value;
        pageCache.delete(firstKey);
    }
    pageCache.set(pageKey, html);
    
    // Aplica visibilidade das colunas
    applyColumnVisibility();
}

// Aplica visibilidade das colunas após renderização
function applyColumnVisibility() {
    document.querySelectorAll('.column-toggle').forEach(checkbox => {
        const columnIndex = checkbox.dataset.column;
        const isVisible = checkbox.checked;
        
        document.querySelectorAll(`th`)[columnIndex]?.classList.toggle('column-hidden', !isVisible);
        document.querySelectorAll(`tbody tr`).forEach(row => {
            const cell = row.cells[columnIndex];
            if (cell) cell.classList.toggle('column-hidden', !isVisible);
        });
    });
}

// Sistema de filtros avançados
function initializeFilters() {
    // Popula selects de Local e Idioma
    const locais = [...new Set(originalData.map(i => i.Local).filter(Boolean))].sort();
    const idiomas = [...new Set(originalData.map(i => i.Idioma).filter(Boolean))].sort();
    
    const localSelect = document.querySelector('select[data-column="Local"]');
    const idiomaSelect = document.querySelector('select[data-column="Idioma"]');
    
    if (localSelect) {
        localSelect.innerHTML = '<option value="">Todos os locais</option>' + 
            locais.map(l => `<option value="${l}">${l}</option>`).join('');
    }
    
    if (idiomaSelect) {
        // CORREÇÃO AQUI: Adicionado String(i) antes do toUpperCase()
        idiomaSelect.innerHTML = '<option value="">Todos os idiomas</option>' + 
            idiomas.map(i => `<option value="${i}">${String(i).toUpperCase()}</option>`).join('');
    }
}

// Aplicar todos os filtros
function applyFilters() {
    pageCache.clear(); // Limpa cache ao filtrar
    
    filteredData = originalData.filter(item => {
        // Filtro de busca global
        if (searchTerm) {
            const matches = Object.values(item).some(value => 
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (!matches) return false;
        }
        
        // Filtros por coluna
        for (const [column, filter] of Object.entries(columnFilters)) {
            if (!filter || filter === '') continue;
            
            const value = item[column];
            
            // Filtros especiais para telefone e email
            if (column === 'Telefone' || column === 'e-mail') {
                if (filter === 'has' && (!value || value === '-')) return false;
                if (filter === 'empty' && value && value !== '-') return false;
            } 
            // Filtros de múltipla seleção
            else if (Array.isArray(filter)) {
                if (filter.length > 0 && !filter.includes(value)) return false;
            }
            // Filtros de texto
            else {
                if (!String(value).toLowerCase().includes(filter.toLowerCase())) return false;
            }
        }
        
        return true;
    });
    
    // Aplica ordenação se houver
    if (currentSort.column) {
        sortData();
    }
    
    currentPage = 1;
    renderTable(filteredData);
    updateStats();
    updatePaginationControls();
    updateFilterIndicators();
}

// Indicadores visuais de filtros ativos
function updateFilterIndicators() {
    const hasFilters = Object.values(columnFilters).some(f => f && f !== '' && (!Array.isArray(f) || f.length > 0));
    const clearButton = document.getElementById('clearFilters');
    
    if (clearButton) {
        clearButton.style.display = hasFilters || searchTerm ? 'block' : 'none';
    }
    
    // Atualiza indicadores nas colunas
    document.querySelectorAll('.filter-indicator').forEach(indicator => {
        const column = indicator.dataset.column;
        const hasFilter = columnFilters[column] && columnFilters[column] !== '' && 
                         (!Array.isArray(columnFilters[column]) || columnFilters[column].length > 0);
        indicator.style.display = hasFilter ? 'inline' : 'none';
    });
}

// Ordenação otimizada
function sortData() {
    filteredData.sort((a, b) => {
        let valA = a[currentSort.column] || '';
        let valB = b[currentSort.column] || '';
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return currentSort.ascending ? -1 : 1;
        if (valA > valB) return currentSort.ascending ? 1 : -1;
        return 0;
    });
}

// Estatísticas
function updateStats() {
    const statsElement = document.getElementById('stats');
    if (!statsElement) return;
    
    const total = originalData.length;
    const showing = filteredData.length;
    const comTelefone = filteredData.filter(i => i.Telefone && i.Telefone !== '-').length;
    const comEmail = filteredData.filter(i => i['e-mail'] && i['e-mail'] !== '-').length;
    
    statsElement.innerHTML = 
        `📈 Total: <strong>${total.toLocaleString('pt-BR')}</strong> registros | 
         👁️ Exibindo: <strong>${showing.toLocaleString('pt-BR')}</strong> | 
         📞 Com telefone: <strong>${comTelefone.toLocaleString('pt-BR')}</strong> | 
         📧 Com e-mail: <strong>${comEmail.toLocaleString('pt-BR')}</strong>`;
}

// Controles de paginação
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const startItem = Math.min((currentPage - 1) * pageSize + 1, filteredData.length);
    const endItem = Math.min(currentPage * pageSize, filteredData.length);
    
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = 
            `Mostrando ${startItem.toLocaleString('pt-BR')}-${endItem.toLocaleString('pt-BR')} de ${filteredData.length.toLocaleString('pt-BR')}`;
    }
    
    const totalPagesElem = document.getElementById('totalPages');
    if (totalPagesElem) {
        totalPagesElem.textContent = `/ ${totalPages}`;
    }
    
    const pageInput = document.getElementById('pageInput');
    if (pageInput) {
        pageInput.value = currentPage;
        pageInput.max = totalPages;
    }
    
    const firstPage = document.getElementById('firstPage');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const lastPage = document.getElementById('lastPage');
    
    if (firstPage) firstPage.disabled = currentPage === 1;
    if (prevPage) prevPage.disabled = currentPage === 1;
    if (nextPage) nextPage.disabled = currentPage === totalPages || totalPages === 0;
    if (lastPage) lastPage.disabled = currentPage === totalPages || totalPages === 0;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    currentPage = Math.max(1, Math.min(page, totalPages));
    renderTable(filteredData);
    updatePaginationControls();
    
    // Pré-carrega próxima página
    if (currentPage < totalPages) {
        setTimeout(() => preloadPage(currentPage + 1), 100);
    }
}

// Pré-carregamento de páginas
function preloadPage(page) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageKey = `${page}-${pageSize}-${filteredData.length}`;
    
    if (!pageCache.has(pageKey)) {
        const paginatedData = filteredData.slice(startIndex, endIndex);
        const html = paginatedData.map(item => `
            <tr>
                <td>${item.ID_Insta || '-'}</td>
                <td><strong>@${item.Conta_Insta || '-'}</strong></td>
                <td>${item.Nome || '-'}</td>
                <td style="max-width: 300px;">${item.Bio || '-'}</td>
                <td class="phone">${item.Telefone || '-'}</td>
                <td class="email">${item['e-mail'] || '-'}</td>
                <td class="link" style="max-width: 150px;">${item['Link-Bio'] || '-'}</td>
                <td>${item.Local || '-'}</td>
                <td><span class="badge">${String(item.Idioma || '-').toUpperCase()}</span></td>
                <td>${item.Especialidades_Extraidas || '-'}</td>
            </tr>
        `).join('');
        
        pageCache.set(pageKey, html);
    }
}

// Exportação Excel
function exportToExcel() {
    const exportOption = document.getElementById('exportOptions').value;
    let dataToExport = [];
    let filename = 'dentistas_instagram';
    
    // Define dados a exportar
    if (exportOption === 'all') {
        dataToExport = originalData;
        filename += '_completo';
    } else if (exportOption === 'filtered') {
        dataToExport = filteredData;
        filename += '_filtrado';
    } else {
        dataToExport = getVisibleColumnsData(filteredData);
        filename += '_visivel';
    }
    
    if (dataToExport.length === 0) {
        alert('Não há dados para exportar');
        return;
    }
    
    showLoading(true, `Preparando exportação de ${dataToExport.length.toLocaleString('pt-BR')} registros...`);
    
    // Cria workbook
    setTimeout(() => {
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        
        // Ajusta larguras das colunas
        const colWidths = [
            { wch: 15 }, // ID
            { wch: 20 }, // Conta
            { wch: 30 }, // Nome
            { wch: 50 }, // Bio
            { wch: 15 }, // Telefone
            { wch: 25 }, // Email
            { wch: 30 }, // Link
            { wch: 20 }, // Local
            { wch: 10 }, // Idioma
            { wch: 40 }  // Especialidades
        ];
        ws['!cols'] = colWidths;
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Dados");
        
        // Adiciona data/hora ao nome do arquivo
        const date = new Date().toISOString().slice(0, 10);
        filename += `_${date}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        showLoading(false);
    }, 100);
}

// Exportação CSV
function exportToCSV() {
    const exportOption = document.getElementById('exportOptions').value;
    let dataToExport = [];
    let filename = 'dentistas_instagram';
    
    // Define dados a exportar
    if (exportOption === 'all') {
        dataToExport = originalData;
        filename += '_completo';
    } else if (exportOption === 'filtered') {
        dataToExport = filteredData;
        filename += '_filtrado';
    } else {
        dataToExport = getVisibleColumnsData(filteredData);
        filename += '_visivel';
    }
    
    if (dataToExport.length === 0) {
        alert('Não há dados para exportar');
        return;
    }
    
    showLoading(true, `Preparando CSV de ${dataToExport.length.toLocaleString('pt-BR')} registros...`);
    
    setTimeout(() => {
        // Converte para CSV
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' }); // Usa ; como separador para melhor compatibilidade
        
        // Cria blob e download
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para UTF-8
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        const date = new Date().toISOString().slice(0, 10);
        filename += `_${date}.csv`;
        
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showLoading(false);
    }, 100);
}

// Obtém dados apenas das colunas visíveis
function getVisibleColumnsData(data) {
    const visibleColumns = [];
    const columnMap = {
        0: 'ID_Insta',
        1: 'Conta_Insta',
        2: 'Nome',
        3: 'Bio',
        4: 'Telefone',
        5: 'e-mail',
        6: 'Link-Bio',
        7: 'Local',
        8: 'Idioma',
        9: 'Especialidades_Extraidas'
    };
    
    document.querySelectorAll('.column-toggle:checked').forEach(checkbox => {
        const columnIndex = checkbox.dataset.column;
        visibleColumns.push(columnMap[columnIndex]);
    });
    
    return data.map(item => {
        const newItem = {};
        visibleColumns.forEach(col => {
            newItem[col] = item[col];
        });
        return newItem;
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Busca global com debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = debounce(() => {
            searchTerm = searchInput.value;
            applyFilters();
        }, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }
    
    // Toggle de filtros
    const toggleFiltersBtn = document.getElementById('toggleFilters');
    if (toggleFiltersBtn) {
        toggleFiltersBtn.addEventListener('click', () => {
            const filterRow = document.getElementById('filterRow');
            if (filterRow) {
                const isVisible = filterRow.style.display === 'flex';
                filterRow.style.display = isVisible ? 'none' : 'flex';
                toggleFiltersBtn.textContent = isVisible ? '🔽 Filtros' : '🔼 Filtros';
            }
        });
    }
    
    // Limpar filtros
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            columnFilters = {};
            searchTerm = '';
            if (searchInput) searchInput.value = '';
            
            // Limpa inputs de filtro
            document.querySelectorAll('.filter-input').forEach(input => input.value = '');
            document.querySelectorAll('.filter-select').forEach(select => {
                if (select.multiple) {
                    Array.from(select.options).forEach(option => option.selected = false);
                } else {
                    select.value = '';
                }
            });
            
            applyFilters();
        });
    }
    
    // Filtros por coluna com debounce
    const debouncedColumnFilter = debounce((column, value) => {
        if (value === '') {
            delete columnFilters[column];
        } else {
            columnFilters[column] = value;
        }
        applyFilters();
    }, 300);
    
    // Event listeners para filtros de texto
    document.querySelectorAll('.filter-input').forEach(input => {
        input.addEventListener('input', (e) => {
            debouncedColumnFilter(e.target.dataset.column, e.target.value);
        });
    });
    
    // Event listeners para filtros select
    document.querySelectorAll('.filter-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const column = e.target.dataset.column;
            let value = e.target.value;
            
            // Para select múltiplo
            if (e.target.multiple) {
                value = Array.from(e.target.selectedOptions).map(o => o.value).filter(v => v !== '');
            }
            
            debouncedColumnFilter(column, value);
        });
    });
    
    // Ordenação
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            
            if (currentSort.column === column) {
                currentSort.ascending = !currentSort.ascending;
            } else {
                currentSort.column = column;
                currentSort.ascending = true;
            }
            
            pageCache.clear(); // Limpa cache ao ordenar
            sortData();
            renderTable(filteredData);
            
            // Atualiza indicador visual
            document.querySelectorAll('th.sortable').forEach(h => {
                h.classList.remove('sorted-asc', 'sorted-desc');
            });
            th.classList.add(currentSort.ascending ? 'sorted-asc' : 'sorted-desc');
        });
    });
    
    // Paginação
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    const pageInputElem = document.getElementById('pageInput');
    const pageSizeSelectElem = document.getElementById('pageSizeSelect');
    
    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', () => goToPage(1));
    }
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    }
    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredData.length / pageSize);
            goToPage(totalPages);
        });
    }
    
    // Input direto de página
    if (pageInputElem) {
        pageInputElem.addEventListener('change', (e) => {
            goToPage(parseInt(e.target.value) || 1);
        });
    }
    
    // Mudança de tamanho de página
    if (pageSizeSelectElem) {
        pageSizeSelectElem.addEventListener('change', (e) => {
            pageSize = parseInt(e.target.value);
            pageCache.clear(); // Limpa cache ao mudar tamanho
            currentPage = 1;
            renderTable(filteredData);
            updatePaginationControls();
        });
    }
    
    // Menu de colunas
    const columnMenu = document.getElementById('columnMenu');
    const toggleButton = document.getElementById('toggleColumns');
    
    if (toggleButton && columnMenu) {
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            columnMenu.style.display = columnMenu.style.display === 'none' ? 'block' : 'none';
        });
        
        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!columnMenu.contains(e.target) && e.target !== toggleButton) {
                columnMenu.style.display = 'none';
            }
        });
    }
    
    // Toggle de colunas
    document.querySelectorAll('.column-toggle').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            applyColumnVisibility();
        });
    });
    
    // Exportação
    const exportExcelBtn = document.getElementById('exportExcel');
    const exportCSVBtn = document.getElementById('exportCSV');
    
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportToExcel);
    }
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', exportToCSV);
    }
    
    // Inicializa - Carrega dados após todos os event listeners estarem configurados
    loadData();
});