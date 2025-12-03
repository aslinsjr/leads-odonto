let allData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 25;
let sortColumn = '';
let sortDirection = 'asc';

// Filtros ativos por estatística
let activeStatFilters = {
    specialty: false,
    location: false,
    whatsapp: false,
    email: false
};

// Configuração de colunas
const columns = [
    { id: 'ID_Insta', label: 'ID Instagram', visible: false, width: '120px' },
    { id: 'Conta_Insta', label: 'Instagram', visible: true, width: '160px' },
    { id: 'Nome', label: 'Nome', visible: true, width: '180px' },
    { id: 'Especialidades', label: 'Especialidades', visible: true, width: '200px' },
    { id: 'Cidade_Estado', label: 'Cidade/Estado', visible: true, width: '160px' },
    { id: 'Telefone', label: 'Telefone', visible: true, width: '140px' },
    { id: 'Telefones_Bio', label: 'Outros Telefones', visible: true, width: '160px' },
    { id: 'e-mail', label: 'E-mail', visible: false, width: '200px' },
    { id: 'Email_Bio', label: 'E-mail Bio', visible: true, width: '180px' },
    { id: 'Endereco', label: 'Endereço', visible: true, width: '200px' },
    { id: 'Tem_WhatsApp', label: 'WhatsApp', visible: true, width: '100px' },
    { id: 'Bio', label: 'Bio', visible: true, width: '300px' },
    { id: 'Link-Bio', label: 'Link Bio', visible: false, width: '80px' },
    { id: 'Local', label: 'Local', visible: false, width: '150px' },
    { id: 'Idioma', label: 'Idioma', visible: false, width: '100px' },
];

// Função para carregar dados do JSON
async function loadLeadsData() {
    try {
        const response = await fetch('leads_data.json');
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao carregar leads_data.json:', error);
        document.getElementById('loading').innerHTML = '<div class="spinner"></div><p>❌ Erro ao carregar dados. Verifique se o arquivo leads_data.json está no mesmo diretório.</p>';
        return [];
    }
}

// Inicialização quando o documento carregar
document.addEventListener('DOMContentLoaded', async function () {
    // Carregar dados do JSON
    allData = await loadLeadsData();

    if (allData.length === 0) {
        return; // Sai se não conseguiu carregar os dados
    }

    filteredData = [...allData];

    initializeColumnToggles();
    updateTableHeader();
    updateStats();
    renderTable();

    document.getElementById('loading').style.display = 'none';
    document.getElementById('tableWrapper').style.display = 'block';
    document.getElementById('pagination').style.display = 'flex';

    // Event listeners
    document.getElementById('globalSearch').addEventListener('input', applyFilters);
    document.getElementById('searchNome').addEventListener('input', applyFilters);
    document.getElementById('searchConta').addEventListener('input', applyFilters);
    document.getElementById('searchEspecialidade').addEventListener('input', applyFilters);
    document.getElementById('searchCidade').addEventListener('input', applyFilters);
    document.getElementById('filterWhatsApp').addEventListener('change', applyFilters);
});

function initializeColumnToggles() {
    const container = document.getElementById('columnCheckboxes');
    columns.forEach(col => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = col.visible;
        checkbox.onchange = () => {
            col.visible = checkbox.checked;
            updateTableHeader();
            renderTable();
        };
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + col.label));
        container.appendChild(label);
    });
}

function toggleColumns() {
    const panel = document.getElementById('columnPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleStatFilter(filterType) {
    // Toggle o filtro
    activeStatFilters[filterType] = !activeStatFilters[filterType];

    // Atualiza visual do card
    const statCard = document.getElementById(`stat${filterType.charAt(0).toUpperCase() + filterType.slice(1).replace('whatsapp', 'WhatsApp').replace('specialty', 'Specialty').replace('location', 'Location').replace('email', 'Email')}`);

    if (activeStatFilters[filterType]) {
        statCard.classList.add('active');
    } else {
        statCard.classList.remove('active');
    }

    // Aplica os filtros
    applyFilters();
}

function updateTableHeader() {
    const headerDiv = document.getElementById('tableHeader');
    const visibleColumns = columns.filter(c => c.visible);

    // Create header cells
    headerDiv.innerHTML = '';

    visibleColumns.forEach(col => {
        const cell = document.createElement('div');
        cell.className = 'table-cell-header';
        cell.style.width = col.width;
        if (sortColumn === col.id) {
            cell.classList.add('sorted');
        }
        cell.onclick = () => sortTable(col.id);

        const text = document.createElement('span');
        text.textContent = col.label;
        cell.appendChild(text);

        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', 'sort-icon');
        icon.setAttribute('width', '12');
        icon.setAttribute('height', '12');
        icon.setAttribute('viewBox', '0 0 12 12');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');

        if (sortColumn === col.id) {
            if (sortDirection === 'asc') {
                icon.innerHTML = '<path d="M6 2v8M3 7l3 3 3-3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
            } else {
                icon.innerHTML = '<path d="M6 10V2M3 5l3-3 3 3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
            }
        } else {
            icon.innerHTML = '<path d="M6 2v8M3 4l3-3 3 3M3 8l3 3 3-3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
        }

        cell.appendChild(icon);
        headerDiv.appendChild(cell);
    });
}

function formatPhone(phone) {
    if (!phone || phone === '0') return '';
    let cleaned = String(phone).replace(/\D/g, '');

    if (cleaned.length === 11) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 3)} ${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    } else if (cleaned.length === 9) {
        return `${cleaned.substring(0, 1)} ${cleaned.substring(1, 5)}-${cleaned.substring(5)}`;
    }
    return phone;
}

function formatMultiplePhones(phones) {
    if (!phones || phones === '0' || phones === '') return '';
    const phoneArray = phones.split(',').map(p => p.trim());
    return phoneArray.map(p => formatPhone(p)).filter(p => p).join(', ');
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredData.slice(start, end);

    if (pageData.length === 0) {
        document.getElementById('noResults').style.display = 'flex';
        document.getElementById('tableWrapper').style.display = 'none';
    } else {
        document.getElementById('noResults').style.display = 'none';
        document.getElementById('tableWrapper').style.display = 'block';

        pageData.forEach(row => {
            const tr = document.createElement('div');
            tr.className = 'table-row';

            columns.filter(c => c.visible).forEach(col => {
                const td = document.createElement('div');
                td.className = 'table-cell';
                td.style.width = col.width;
                let value = row[col.id];

                if (col.id === 'Conta_Insta') {
                    td.innerHTML = `<a href="https://instagram.com/${value}" target="_blank" class="cell-link">@${value}</a>`;
                } else if (col.id === 'Telefone') {
                    if (value && value !== '0') {
                        const formatted = formatPhone(value);
                        if (formatted) {
                            const phoneNumber = formatted.replace(/\D/g, '');
                            td.innerHTML = `<a href="https://wa.me/55${phoneNumber}" target="_blank" class="cell-link">${formatted}</a>`;
                        }
                    }
                } else if (col.id === 'Telefones_Bio') {
                    if (value && value !== '0' && value !== '') {
                        const formatted = formatMultiplePhones(value);
                        if (formatted) {
                            td.textContent = formatted;
                        }
                    }
                } else if (col.id === 'Especialidades') {
                    if (value && value !== '') {
                        const specs = value.split(',').map(s => s.trim());
                        td.innerHTML = specs.map(s => `<span class="specialty-badge">${s}</span>`).join(' ');
                    }
                } else if (col.id === 'Tem_WhatsApp') {
                    if (value === 'Sim') {
                        td.innerHTML = '<span class="whatsapp-badge">✓ WhatsApp</span>';
                    }
                } else if (col.id === 'Bio') {
                    const bioId = `bio-${row.ID_Insta}`;
                    if (value && value.length > 100) {
                        td.innerHTML = `<div class="bio-cell collapsed" id="${bioId}">${value}</div><span class="bio-toggle" onclick="toggleBio('${bioId}')">ver mais</span>`;
                    } else {
                        td.textContent = value || '';
                    }
                } else if (col.id === 'Link-Bio') {
                    if (value && value !== '0') {
                        const url = value.startsWith('http') ? value : `https://${value}`;
                        td.innerHTML = `<a href="${url}" target="_blank" class="cell-link">🔗</a>`;
                    }
                } else if (col.id === 'e-mail' || col.id === 'Email_Bio') {
                    if (value && value !== '0' && value !== '') {
                        td.innerHTML = `<a href="mailto:${value}" class="cell-link">${value}</a>`;
                    }
                } else {
                    td.textContent = value && value !== '0' ? value : '';
                }

                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    updatePagination();
}

function toggleBio(bioId) {
    const bioCell = document.getElementById(bioId);
    const toggle = bioCell.nextElementSibling;

    if (bioCell.classList.contains('collapsed')) {
        bioCell.classList.remove('collapsed');
        toggle.textContent = 'ver menos';
    } else {
        bioCell.classList.add('collapsed');
        toggle.textContent = 'ver mais';
    }
}

function sortTable(columnId) {
    if (sortColumn === columnId) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = columnId;
        sortDirection = 'asc';
    }

    filteredData.sort((a, b) => {
        let aVal = a[columnId] || '';
        let bVal = b[columnId] || '';

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    updateTableHeader();
    renderTable();
}

function applyFilters() {
    const globalSearch = document.getElementById('globalSearch').value.toLowerCase();
    const searchNome = document.getElementById('searchNome').value.toLowerCase();
    const searchConta = document.getElementById('searchConta').value.toLowerCase();
    const searchEspecialidade = document.getElementById('searchEspecialidade').value.toLowerCase();
    const searchCidade = document.getElementById('searchCidade').value.toLowerCase();
    const filterWhatsApp = document.getElementById('filterWhatsApp').value;

    filteredData = allData.filter(row => {
        const matchGlobal = !globalSearch || Object.values(row).some(val =>
            String(val).toLowerCase().includes(globalSearch)
        );
        const matchNome = !searchNome || (row.Nome && row.Nome.toLowerCase().includes(searchNome));
        const matchConta = !searchConta || (row.Conta_Insta && row.Conta_Insta.toLowerCase().includes(searchConta));
        const matchEspecialidade = !searchEspecialidade || (row.Especialidades && row.Especialidades.toLowerCase().includes(searchEspecialidade));
        const matchCidade = !searchCidade || (row.Cidade_Estado && row.Cidade_Estado.toLowerCase().includes(searchCidade));

        let matchWhatsApp = true;
        if (filterWhatsApp === 'sim') {
            matchWhatsApp = row.Tem_WhatsApp === 'Sim';
        } else if (filterWhatsApp === 'nao') {
            matchWhatsApp = row.Tem_WhatsApp !== 'Sim';
        }

        // Filtros por estatísticas (clicáveis)
        let matchStatFilters = true;

        if (activeStatFilters.specialty) {
            matchStatFilters = matchStatFilters && (row.Especialidades && row.Especialidades !== '');
        }

        if (activeStatFilters.location) {
            matchStatFilters = matchStatFilters && (row.Cidade_Estado && row.Cidade_Estado !== '');
        }

        if (activeStatFilters.whatsapp) {
            matchStatFilters = matchStatFilters && (row.Tem_WhatsApp === 'Sim');
        }

        if (activeStatFilters.email) {
            matchStatFilters = matchStatFilters && ((row['e-mail'] && row['e-mail'] !== '0') || (row.Email_Bio && row.Email_Bio !== ''));
        }

        return matchGlobal && matchNome && matchConta && matchEspecialidade && matchCidade && matchWhatsApp && matchStatFilters;
    });

    currentPage = 1;
    updateStats();
    renderTable();
}

function clearFilters() {
    document.getElementById('globalSearch').value = '';
    document.getElementById('searchNome').value = '';
    document.getElementById('searchConta').value = '';
    document.getElementById('searchEspecialidade').value = '';
    document.getElementById('searchCidade').value = '';
    document.getElementById('filterWhatsApp').value = '';

    // Limpa filtros de estatísticas
    activeStatFilters = {
        specialty: false,
        location: false,
        whatsapp: false,
        email: false
    };

    // Remove classe active dos cards
    document.getElementById('statSpecialty').classList.remove('active');
    document.getElementById('statLocation').classList.remove('active');
    document.getElementById('statWhatsApp').classList.remove('active');
    document.getElementById('statEmail').classList.remove('active');

    applyFilters();
}

function updateStats() {
    document.getElementById('totalLeads').textContent = allData.length;
    document.getElementById('filteredLeads').textContent = filteredData.length;
    document.getElementById('withSpecialty').textContent = filteredData.filter(r => r.Especialidades && r.Especialidades !== '').length;
    document.getElementById('withLocation').textContent = filteredData.filter(r => r.Cidade_Estado && r.Cidade_Estado !== '').length;
    document.getElementById('withWhatsApp').textContent = filteredData.filter(r => r.Tem_WhatsApp === 'Sim').length;
    document.getElementById('withEmail').textContent = filteredData.filter(r => (r['e-mail'] && r['e-mail'] !== '0') || (r.Email_Bio && r.Email_Bio !== '')).length;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function changePageSize() {
    pageSize = parseInt(document.getElementById('pageSize').value);
    currentPage = 1;
    renderTable();
}

function exportToCSV() {
    const headers = columns.map(c => c.label);
    const columnIds = columns.map(c => c.id);

    let csv = headers.join(',') + '\n';

    filteredData.forEach(row => {
        const values = columnIds.map(id => {
            let value = row[id] || '';
            value = String(value).replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                value = `"${value}"`;
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_odonto_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Função para Marcar/Desmarcar todas
function toggleAllColumns(shouldShow) {
    // 1. Atualiza o estado lógico do array de colunas
    columns.forEach(col => {
        col.visible = shouldShow;
    });

    // 2. Atualiza visualmente os checkboxes HTML
    const checkboxes = document.querySelectorAll('#columnCheckboxes input[type="checkbox"]');
    checkboxes.forEach(box => {
        box.checked = shouldShow;
    });

    // 3. Renderiza a tabela novamente com o novo estado
    updateTableHeader();
    renderTable();
}