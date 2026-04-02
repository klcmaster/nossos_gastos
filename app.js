// --- Estado do App ---
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx_OtvCYO4G8liI38Ej1-xZOVo1Qwhg0Cthx9MJBMvjuwKI3JR79U8rwohOBp0_6r1-/exec";

let entries = [];//JSON.parse(localStorage.getItem('fpro_entries')) || [];
let persons = [];//JSON.parse(localStorage.getItem('fpro_persons')) || ['Mim'];
let currentView = 'add-transaction';

/*/ --- Buscar Dados (Read) ---
async function syncFromCloud() {
    showToast("Sincronizando...");
    try {
        const response = await fetch(WEB_APP_URL, { method: "GET", redirect: "follow" });
        const cloudData = await response.json();
        
        if (Array.isArray(cloudData)) {
            entries = cloudData.map(e => ({
                id: e.id,
                date: typeof e.data === 'string' ? e.data.substring(0, 10) : e.data,
                title: e.titulo || e.title,
                amount: parseFloat(e.valor || e.amount),
                person: e.pessoa || e.person,
                type: e.tipo || e.type,
                description: e.descricao || e.description || ""
            })).reverse();
            render();
        }
    } catch (err) {
        showToast("Erro ao carregar dados online.");
    }
}*/
async function syncFromCloud() {
    showToast("Sincronizando...");
    try {
        const response = await fetch(WEB_APP_URL, { method: "GET", redirect: "follow" });
        const data = await response.json();
        
        // Sincroniza Pessoas
        if (data.persons) {
            persons = data.persons;
            updatePersonSelect();
            if (currentView === 'persons') renderPersonsList();
        }

        // Sincroniza Entradas (Gastos)
        if (data.entries) {
            entries = data.entries.map(e => ({
                id: e.id,
                date: typeof e.data === 'string' ? e.data.substring(0, 10) : e.data,
                title: e.titulo || e.title,
                amount: parseFloat(e.valor || e.amount),
                person: e.pessoa || e.person,
                type: e.tipo || e.type,
                description: e.descricao || e.description || ""
            })).reverse();
            render();
        }
    } catch (err) {
        showToast("Erro na sincronização online.");
    }
}
// --- Excluir Dados (Delete) ---
async function deleteEntry(id) {
    if(!confirm("Deseja excluir este registro da planilha permanentemente?")) return;

    showToast("Excluindo da nuvem...");
    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            redirect: "follow",
            body: JSON.stringify({ action: "DELETE", id: id }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        
        // Remove localmente após confirmação da nuvem
        entries = entries.filter(e => e.id !== id);
        renderHistory();
        showToast("Excluído com sucesso!");
    } catch (err) {
        showToast("Erro ao excluir registro online.");
    }
}

// --- Salvar Dados (Create) ---
async function saveEntryToCloud(entry) {
    showToast("Enviando...");
    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            redirect: "follow",
            body: JSON.stringify(entry),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        showToast("Salvo na planilha!");
        syncFromCloud(); // Recarrega para garantir sincronia
    } catch (err) {
        showToast("Erro ao salvar online.");
    }
}

function saveLocal() {
    localStorage.setItem('fpro_entries', JSON.stringify(entries));
    localStorage.setItem('fpro_persons', JSON.stringify(persons));
}

// --- Atualização do Submit do Formulário ---
document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;

    const newEntry = {
        id: Date.now(),
        date: document.getElementById('date').value,
        amount: type === 'debit' ? -Math.abs(val) : Math.abs(val),
        title: document.getElementById('title').value,
        person: document.getElementById('person-select').value,
        description: document.getElementById('description').value,
        type: type
    };

    await saveEntryToCloud(newEntry);
    e.target.reset();
    document.getElementById('date').valueAsDate = new Date();
    navigateTo('history');
});

/////////////////////////////////

// --- Navegação ---
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    const activeBtn = document.getElementById(`nav-${viewId}`);
    if(activeBtn) activeBtn.classList.add('active-nav');
    currentView = viewId;
    toggleSidebar(false);
    render();
}

function toggleSidebar(force) {
    const sb = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (force === true) {
        sb.classList.remove('-translate-x-full');
        sb.classList.add('open');
        overlay.style.display = 'block';
    } else {
        sb.classList.add('-translate-x-full');
        sb.classList.remove('open');
        overlay.style.display = 'none';
    }
}

/*/ --- Gerenciamento de Pessoas ---
function addPerson() {
    const input = document.getElementById('person-input');
    const name = input.value.trim();
    if (name) {
        if (!persons.includes(name)) {
            persons.push(name);
            savePersons();
            updatePersonSelect();
            renderPersonsList();
            input.value = '';
            showToast(`Pessoa "${name}" adicionada!`);
        } else {
            showToast("Este nome já existe!");
        }
    }
}


function removePerson(name) {
    if (persons.length <= 1) {
        alert("Você precisa de pelo menos uma pessoa cadastrada.");
        return;
    }
    if (confirm(`Remover "${name}" da lista de seleção? Os registros existentes no histórico continuarão salvos.`)) {
        persons = persons.filter(p => p !== name);
        savePersons();
        updatePersonSelect();
        renderPersonsList();
        showToast(`Pessoa "${name}" removida!`);
    }
}*/

async function addPerson() {
    const input = document.getElementById('person-input');
    const name = input.value.trim();
    if (name && !persons.includes(name)) {
        showToast("Salvando pessoa...");
        try {
            await fetch(WEB_APP_URL, {
                method: "POST",
                redirect: "follow",
                body: JSON.stringify({ action: "ADD_PERSON", name: name })
            });
            input.value = '';
            await syncFromCloud();
        } catch (e) { showToast("Erro ao salvar pessoa."); }
    }
}

async function removePerson(name) {
    if (persons.length <= 1 || !confirm(`Remover "${name}" da nuvem?`)) return;
    showToast("Removendo...");
    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            redirect: "follow",
            body: JSON.stringify({ action: "DELETE_PERSON", name: name })
        });
        await syncFromCloud();
    } catch (e) { showToast("Erro ao remover."); }
}

function updatePersonSelect() {
    const select = document.getElementById('person-select');
    if(select) {
        select.innerHTML = persons.map(p => `<option value="${p}">${p}</option>`).join('');
    }
}

function renderPersonsList() {
    const list = document.getElementById('persons-list');
    if(!list) return;
    list.innerHTML = persons.map(p => `
        <div class="flex justify-between items-center bg-[#1e293b] px-5 py-4 rounded-xl border border-slate-800 shadow-sm transition-all hover:border-slate-700">
            <span class="font-medium text-slate-200">${p}</span>
            <button onclick="removePerson('${p}')" class="text-slate-500 hover:text-rose-500 p-2 transition-colors focus:outline-none" title="Excluir">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    `).join('');
}

function clearFilter() {
    document.getElementById('filter-date').value = '';
    renderHistory();
}

// --- Persistência ---
function saveEntries() { localStorage.setItem('fpro_entries', JSON.stringify(entries)); }
function savePersons() { localStorage.setItem('fpro_persons', JSON.stringify(persons)); }

// --- Renderização de Telas ---
function render() {
    if (currentView === 'history') renderHistory();
    if (currentView === 'summary') renderSummary();
    if (currentView === 'persons') renderPersonsList();
}

function renderHistory() {
    const list = document.getElementById('entries-list');
    if(!list) return;
    const filterDate = document.getElementById('filter-date').value;
    const filtered = filterDate ? entries.filter(e => e.date === filterDate) : entries;
    //console.log(filtered);

    if (filtered.length === 0) {
        list.innerHTML = '<div class="text-center py-20 text-slate-500">Nenhum registro encontrado.</div>';
        return;
    }

    list.innerHTML = filtered.map(e => {
        const isDebit = e.amount < 0;
        return `
            <div class="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 flex justify-between items-center group transition-all hover:border-slate-600 shadow-lg">
                <div class="space-y-1 overflow-hidden pr-2">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-tighter">
                            ${e.date ? e.date.split('-').reverse().join('/') : '??/??/??'}
                        </span>
                        <h3 class="font-semibold text-slate-100 truncate">${e.title}</h3>
                    </div>
                    <p class="text-xs text-slate-400 flex items-center gap-1">
                        <span class="text-blue-400 font-medium truncate">${e.person}</span> • <span class="truncate">${e.description || 'Sem detalhes'}</span>
                    </p>
                </div>
                <div class="text-right flex-shrink-0 ml-4">
                    <p class="font-bold ${isDebit ? 'text-rose-400' : 'text-emerald-400'}">
                        ${isDebit ? '' : '+'}${Math.abs(e.amount).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                    </p>
                    <button onclick="deleteEntry(${e.id})" class="text-[10px] text-slate-600 hover:text-rose-500 font-bold uppercase transition-colors p-1">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderSummary() {
    const grid = document.getElementById('summary-grid');
    if(!grid) return;
    const totals = {};
    persons.forEach(p => totals[p] = 0);
    entries.forEach(e => {
        if (totals[e.person] === undefined) totals[e.person] = 0;
        totals[e.person] += e.amount;
    });

    const items = Object.entries(totals);
    if (items.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-500">Adicione pessoas e lançamentos para ver o resumo.</div>';
        return;
    }

    grid.innerHTML = items.map(([name, val]) => {
        const isNeg = val < 0;
        return `
            <div class="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl">
                <p class="text-sm font-medium text-slate-400 mb-1 truncate">${name}</p>
                <p class="text-2xl font-bold ${isNeg ? 'text-rose-400' : 'text-emerald-400'}">
                    ${val.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </p>
                <div class="mt-4 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div class="h-full ${isNeg ? 'bg-rose-500/30' : 'bg-emerald-500/30'}" style="width: 100%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.bottom = '32px';
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.bottom = '20px';
    }, 3000);
}

// --- Inicialização ---
window.onload = () => {
    document.getElementById('date').valueAsDate = new Date();
    updatePersonSelect();
    navigateTo('add-transaction');
    syncFromCloud(); // Busca dados online ao abrir
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker registrado.', reg.scope))
            .catch(err => console.error('Falha ao registrar Service Worker:', err));
    });
}
