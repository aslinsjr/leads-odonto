let allData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 24;
let sortColumn = '';
let sortDirection = 'asc';

// Configuração de colunas
const columns = [
    { id: 'ID_Insta', label: 'ID Instagram', visible: false },
    { id: 'Conta_Insta', label: 'Conta Instagram', visible: true },
    { id: 'Nome', label: 'Nome', visible: true },
    { id: 'Especialidades', label: 'Especialidades', visible: true },
    { id: 'Cidade_Estado', label: 'Cidade/Estado', visible: true },
    { id: 'Telefone', label: 'Telefone Principal', visible: true },
    { id: 'Telefones_Bio', label: 'Telefones (Bio)', visible: true },
    { id: 'e-mail', label: 'E-mail Principal', visible: false },
    { id: 'Email_Bio', label: 'Email (Bio)', visible: true },
    { id: 'Endereco', label: 'Endereço', visible: true },
    { id: 'Tem_WhatsApp', label: 'WhatsApp', visible: true },
    { id: 'Bio', label: 'Bio Original', visible: true },
    { id: 'Link-Bio', label: 'Link Bio', visible: false },
    { id: 'Local', label: 'Local', visible: false },
    { id: 'Idioma', label: 'Idioma', visible: false },
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
    updateStats();
    renderCards();

    document.getElementById('loading').style.display = 'none';
    document.getElementById('cardsGrid').style.display = 'grid';
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
            renderCards();
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

function getVisibleColumn(col) {
    return columns.find(c => c.id === col)?.visible || false;
}

function createCard(lead) {
    const card = document.createElement('div');
    card.className = 'card';
    
    let cardHTML = `
        <div class="card-header">
            <div class="card-title">
                ${getVisibleColumn('Nome') ? `<div class="card-name">${lead.Nome || 'Sem nome'}</div>` : ''}
                ${getVisibleColumn('Conta_Insta') && lead.Conta_Insta ? 
                    `<a href="https://instagram.com/${lead.Conta_Insta}" target="_blank" class="card-instagram">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
                        </svg>
                        @${lead.Conta_Insta}
                    </a>` : ''}
            </div>
            ${getVisibleColumn('Tem_WhatsApp') && lead.Tem_WhatsApp === 'Sim' ? 
                '<span class="card-badge">💬 WhatsApp</span>' : ''}
        </div>
        <div class="card-content">
    `;

    // Especialidades
    if (getVisibleColumn('Especialidades') && lead.Especialidades && lead.Especialidades !== '') {
        const specs = lead.Especialidades.split(',').map(s => s.trim());
        cardHTML += `
            <div class="card-info">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M8 2v12M2 8h12"/>
                </svg>
                <div class="specialties">
                    ${specs.map(s => `<span class="specialty-tag">${s}</span>`).join('')}
                </div>
            </div>
        `;
    }

    // Cidade/Estado
    if (getVisibleColumn('Cidade_Estado') && lead.Cidade_Estado && lead.Cidade_Estado !== '') {
        cardHTML += `
            <div class="card-info">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M8 14s-5-3-5-7a5 5 0 0110 0c0 4-5 7-5 7z"/>
                    <circle cx="8" cy="7" r="2"/>
                </svg>
                <span>${lead.Cidade_Estado}</span>
            </div>
        `;
    }

    // Telefone Principal
    if (getVisibleColumn('Telefone') && lead.Telefone && lead.Telefone !== '0') {
        const formatted = formatPhone(lead.Telefone);
        if (formatted) {
            const phoneNumber = formatted.replace(/\D/g, '');
            cardHTML += `
                <div class="card-info">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M2 3a1 1 0 011-1h2l1 3-1.5 1.5a8 8 0 004 4L10 10l3 1v2a1 1 0 01-1 1A10 10 0 012 4a1 1 0 010-1z"/>
                    </svg>
                    <a href="https://wa.me/55${phoneNumber}" target="_blank">${formatted}</a>
                </div>
            `;
        }
    }

    // Telefones Bio
    if (getVisibleColumn('Telefones_Bio') && lead.Telefones_Bio && lead.Telefones_Bio !== '') {
        const formatted = formatMultiplePhones(lead.Telefones_Bio);
        if (formatted) {
            cardHTML += `
                <div class="card-info">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M2 3a1 1 0 011-1h2l1 3-1.5 1.5a8 8 0 004 4L10 10l3 1v2a1 1 0 01-1 1A10 10 0 012 4a1 1 0 010-1z"/>
                    </svg>
                    <span>${formatted}</span>
                </div>
            `;
        }
    }

    // Endereço
    if (getVisibleColumn('Endereco') && lead.Endereco && lead.Endereco !== '') {
        cardHTML += `
            <div class="card-info">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="3" width="12" height="10" rx="1"/>
                    <path d="M2 6h12M5 3v3M11 3v3"/>
                </svg>
                <span>${lead.Endereco}</span>
            </div>
        `;
    }

    // Email
    if (getVisibleColumn('Email_Bio') && lead.Email_Bio && lead.Email_Bio !== '') {
        cardHTML += `
            <div class="card-info">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="4" width="12" height="9" rx="1"/>
                    <path d="M2 5l6 4 6-4"/>
                </svg>
                <a href="mailto:${lead.Email_Bio}">${lead.Email_Bio}</a>
            </div>
        `;
    } else if (getVisibleColumn('e-mail') && lead['e-mail'] && lead['e-mail'] !== '0') {
        cardHTML += `
            <div class="card-info">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="4" width="12" height="9" rx="1"/>
                    <path d="M2 5l6 4 6-4"/>
                </svg>
                <a href="mailto:${lead['e-mail']}">${lead['e-mail']}</a>
            </div>
        `;
    }

    // Bio
    if (getVisibleColumn('Bio') && lead.Bio && lead.Bio !== '') {
        const bioId = `bio-${lead.ID_Insta}`;
        const isLong = lead.Bio.length > 150;
        cardHTML += `
            <div class="card-bio ${isLong ? 'collapsed' : ''}" id="${bioId}">
                ${lead.Bio}
            </div>
            ${isLong ? `<span class="bio-toggle" onclick="toggleBio('${bioId}')">Ver mais</span>` : ''}
        `;
    }

    cardHTML += '</div>'; // close card-content
    
    card.innerHTML = cardHTML;
    return card;
}

function renderCards() {
    const grid = document.getElementById('cardsGrid');
    grid.innerHTML = '';
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredData.slice(start, end);
    
    if (pageData.length === 0) {
        document.getElementById('noResults').style.display = 'flex';
        document.getElementById('cardsGrid').style.display = 'none';
    } else {
        document.getElementById('noResults').style.display = 'none';
        document.getElementById('cardsGrid').style.display = 'grid';
        
        pageData.forEach(lead => {
            const card = createCard(lead);
            grid.appendChild(card);
        });
    }
    
    updatePagination();
}

function toggleBio(bioId) {
    const bioEl = document.getElementById(bioId);
    const card = bioEl.closest('.card');
    const toggle = card.querySelector('.bio-toggle');
    
    if (bioEl.classList.contains('collapsed')) {
        bioEl.classList.remove('collapsed');
        toggle.textContent = 'Ver menos';
    } else {
        bioEl.classList.add('collapsed');
        toggle.textContent = 'Ver mais';
    }
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
        
        return matchGlobal && matchNome && matchConta && matchEspecialidade && matchCidade && matchWhatsApp;
    });
    
    currentPage = 1;
    updateStats();
    renderCards();
}

function clearFilters() {
    document.getElementById('globalSearch').value = '';
    document.getElementById('searchNome').value = '';
    document.getElementById('searchConta').value = '';
    document.getElementById('searchEspecialidade').value = '';
    document.getElementById('searchCidade').value = '';
    document.getElementById('filterWhatsApp').value = '';
    applyFilters();
}

function updateStats() {
    document.getElementById('filteredLeads').textContent = filteredData.length;
    document.getElementById('withSpecialty').textContent = filteredData.filter(r => r.Especialidades && r.Especialidades !== '').length;
    document.getElementById('withLocation').textContent = filteredData.filter(r => r.Cidade_Estado && r.Cidade_Estado !== '').length;
    document.getElementById('withWhatsApp').textContent = filteredData.filter(r => r.Tem_WhatsApp === 'Sim').length;
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
        renderCards();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        renderCards();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function changePageSize() {
    pageSize = parseInt(document.getElementById('pageSize').value);
    currentPage = 1;
    renderCards();
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