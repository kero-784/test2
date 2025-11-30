import { state } from './state.js';
import { _t, findByKey, userCan, populateOptions, formatCurrency, formatDate } from './utils.js';
import { calculateStockLevels, calculateSupplierFinancials } from './calculations.js';

const renderDynamicListTable = (tbodyId, list, columnsConfig, emptyMessage, totalizerFn) => {
    const table = document.getElementById(tbodyId);
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columnsConfig.length + 1}" style="text-align:center;">${_t(emptyMessage)}</td></tr>`;
        if (totalizerFn) totalizerFn();
        return;
    }
    
    const stock = calculateStockLevels();
    
    list.forEach((item, index) => {
        const tr = document.createElement('tr');
        let cellsHtml = '';
        columnsConfig.forEach(col => {
            let content = '';
            const fromBranch = col.branchSelectId ? document.getElementById(col.branchSelectId)?.value : null;
            const availableStock = fromBranch ? (stock[fromBranch]?.[item.itemCode]?.quantity || 0) : 0;
            
            switch (col.type) {
                case 'text': content = item[col.key] || ''; break;
                case 'number_input': content = `<input type="number" class="table-input" value="${item[col.key] || ''}" min="${col.min || 0.001}" step="${col.step || 0.001}" data-index="${index}" data-field="${col.key}">`; break;
                case 'cost_input': content = `<input type="number" class="table-input" value="${(parseFloat(item.cost) || 0).toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost">`; break;
                case 'calculated': content = `<span>${col.calculator(item)}</span>`; break;
                case 'available_stock': content = availableStock.toFixed(3); break;
            }
            cellsHtml += `<td>${content}</td>`;
        });
        cellsHtml += `<td><button class="danger small" data-index="${index}">X</button></td>`;
        tr.innerHTML = cellsHtml;
        tbody.appendChild(tr);
    });
    if (totalizerFn) totalizerFn();
};

export function renderReceiveListTable() { 
    renderDynamicListTable('table-receive-list', state.currentReceiveList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => formatCurrency((parseFloat(item.quantity)||0) * (parseFloat(item.cost)||0)) } 
    ], 'no_items_selected_toast', () => {
        const el = document.getElementById('receive-grand-total'); if(el) el.textContent = formatCurrency(state.currentReceiveList.reduce((a, i) => a + ((i.quantity||0)*(i.cost||0)), 0));
    }); 
}

export function renderButcheryListTable() {
    renderDynamicListTable('table-butchery-children', state.currentButcheryList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity', step: 0.001 } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentButcheryList.reduce((a, i) => a + (parseFloat(i.quantity)||0), 0);
        const el = document.getElementById('butchery-total-weight'); if(el) el.textContent = total.toFixed(3);
        const pQty = parseFloat(document.getElementById('butchery-parent-qty')?.value)||0;
        const yEl = document.getElementById('butchery-yield-pct');
        if(pQty > 0 && yEl) { yEl.textContent = ((total/pQty)*100).toFixed(1)+'%'; }
    });
}

export function renderTransferListTable() { 
    renderDynamicListTable('table-transfer-list', state.currentTransferList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity' } 
    ], 'no_items_selected_toast', () => {
        const el = document.getElementById('transfer-grand-total'); if(el) el.textContent = state.currentTransferList.reduce((a, i) => a + (parseFloat(i.quantity)||0), 0).toFixed(3);
    }); 
}

export function renderReturnListTable() { 
    renderDynamicListTable('table-return-list', state.currentReturnList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' } 
    ], 'no_items_selected_toast', () => {
        const el = document.getElementById('return-grand-total'); if(el) el.textContent = formatCurrency(state.currentReturnList.reduce((a, i) => a + ((i.quantity||0)*(i.cost||0)), 0));
    }); 
}

export function renderPOListTable() { 
    renderDynamicListTable('table-po-list', state.currentPOList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => formatCurrency((parseFloat(item.quantity)||0) * (parseFloat(item.cost)||0)) } 
    ], 'no_items_selected_toast', () => {
        const el = document.getElementById('po-grand-total'); if(el) el.textContent = formatCurrency(state.currentPOList.reduce((a, i) => a + ((i.quantity||0)*(i.cost||0)), 0));
    }); 
}

export function renderPOEditListTable() {
    renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => formatCurrency((parseFloat(item.quantity)||0) * (parseFloat(item.cost)||0)) } 
    ], 'no_items_selected_toast', () => {
        const el = document.getElementById('edit-po-grand-total'); if(el) el.textContent = formatCurrency(state.currentEditingPOList.reduce((a, i) => a + ((i.quantity||0)*(i.cost||0)), 0));
    }); 
}

export function renderRequestListTable() { 
    renderDynamicListTable('table-request-list', state.currentRequestList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' } ], 'no_items_selected_toast', null); 
}

export function renderAdjustmentListTable() {
    const table = document.getElementById('table-adjustment-list'); if(!table) return;
    const tbody = table.querySelector('tbody'); if(!tbody) return; tbody.innerHTML = '';
    if (!state.currentAdjustmentList.length) { tbody.innerHTML = `<tr><td colspan="6">${_t('no_items_for_adjustment')}</td></tr>`; return; }
    const stock = calculateStockLevels();
    const branch = document.getElementById('adjustment-branch')?.value;
    state.currentAdjustmentList.forEach((item, index) => {
        const sys = (branch && stock[branch]?.[item.itemCode]?.quantity) || 0;
        const phys = item.physicalCount || 0;
        const diff = phys - sys;
        item.physicalCount = phys;
        tbody.innerHTML += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${sys.toFixed(3)}</td><td><input type="number" class="table-input" value="${phys}" step="0.001" data-index="${index}" data-field="physicalCount"></td><td>${diff.toFixed(3)}</td><td><button class="danger small" data-index="${index}">X</button></td></tr>`;
    });
}

export function renderItemsTable(data = state.items) { const tb = document.getElementById('table-items')?.querySelector('tbody'); if(tb) { tb.innerHTML = ''; data.forEach(i => tb.innerHTML += `<tr><td>${i.code}</td><td>${i.name}</td><td>${i.category}</td><td>${i.ItemType}</td><td>${formatCurrency(i.cost)}</td><td><button class="secondary small btn-edit" data-type="item" data-id="${i.code}">Edit</button></td></tr>`); } }
export function renderSuppliersTable(data = state.suppliers) { const tb = document.getElementById('table-suppliers')?.querySelector('tbody'); if(tb) { tb.innerHTML = ''; data.forEach(s => tb.innerHTML += `<tr><td>${s.supplierCode}</td><td>${s.name}</td><td>${s.contact}</td><td>-</td><td><button class="secondary small btn-edit" data-type="supplier" data-id="${s.supplierCode}">Edit</button></td></tr>`); } }
export function renderBranchesTable(data = state.branches) { const tb = document.getElementById('table-branches')?.querySelector('tbody'); if(tb) { tb.innerHTML = ''; data.forEach(b => tb.innerHTML += `<tr><td>${b.branchCode}</td><td>${b.branchName}</td><td><button class="secondary small btn-edit" data-type="branch" data-id="${b.branchCode}">Edit</button></td></tr>`); } }
export function renderSectionsTable(data = state.sections) { const tb = document.getElementById('table-sections')?.querySelector('tbody'); if(tb) { tb.innerHTML = ''; data.forEach(s => tb.innerHTML += `<tr><td>${s.sectionCode}</td><td>${s.sectionName}</td><td><button class="secondary small btn-edit" data-type="section" data-id="${s.sectionCode}">Edit</button></td></tr>`); } }

export function renderTransactionHistory(filters = {}) {
    const table = document.getElementById('table-transaction-history'); if (!table) return;
    const tbody = table.querySelector('tbody'); if (!tbody) return; tbody.innerHTML = '';
    let allTx = [...state.transactions];
    if (!userCan('viewAllBranches')) { allTx = allTx.filter(t => t.branchCode === state.currentUser.AssignedBranchCode); }
    // ... filter logic based on filters arg ...
    if(allTx.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No data</td></tr>'; return; }
    allTx.sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(t => {
        const details = t.type === 'receive' ? `GRN: ${t.invoiceNumber}` : t.type;
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${t.type}</td><td>${t.batchId}</td><td>${details}</td><td>${t.Status}</td><td><button class="secondary small btn-view-tx" data-batch-id="${t.batchId}" data-type="${t.type}">View</button></td></tr>`;
    });
}

export function renderPendingFinancials() {
    const table = document.getElementById('table-pending-financial-approval'); if (!table) return;
    const tbody = table.querySelector('tbody'); tbody.innerHTML = '';
    const pending = state.transactions.filter(t => t.type === 'receive' && !t.isApproved);
    if(!pending.length) { tbody.innerHTML = '<tr><td colspan="6">No pending approvals</td></tr>'; return; }
    pending.forEach(t => {
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${t.type}</td><td>${t.batchId}</td><td>${t.invoiceNumber}</td><td>${formatCurrency(t.quantity*t.cost)}</td><td><button class="primary small btn-approve-financial" data-id="${t.batchId}" data-type="receive">Approve</button></td></tr>`;
    });
}

export function renderActivityLog() {
    const tb = document.getElementById('table-activity-log')?.querySelector('tbody'); if(tb) { tb.innerHTML=''; state.activityLog.slice().reverse().forEach(l => tb.innerHTML += `<tr><td>${l.Timestamp}</td><td>${l.User}</td><td>${l.Action}</td><td>${l.Description}</td></tr>`); }
}

export function renderInvoicesInModal() {
    const el = document.getElementById('modal-invoice-list'); if(!el) return; el.innerHTML = '';
    const sc = document.getElementById('payment-supplier-select')?.value;
    if(!sc) { el.innerHTML = 'Select supplier'; return; }
    const fin = calculateSupplierFinancials();
    const invs = Object.values(fin[sc]?.invoices || {}).filter(i => i.status !== 'Paid');
    invs.forEach(i => el.innerHTML += `<div class="modal-item"><input type="checkbox" id="inv-${i.number}" data-number="${i.number}"><label for="inv-${i.number}">${i.number} (${formatCurrency(i.balance)})</label></div>`);
}

export function renderPaymentList() {
    const el = document.getElementById('payment-invoice-list-container');
    const tb = document.getElementById('table-payment-list')?.querySelector('tbody');
    if(!el || !tb) return;
    const sc = document.getElementById('payment-supplier-select')?.value;
    if(!sc || state.invoiceModalSelections.size === 0) { el.style.display = 'none'; return; }
    el.style.display = 'block'; tb.innerHTML = '';
    let tot = 0;
    const fin = calculateSupplierFinancials();
    state.invoiceModalSelections.forEach(id => {
        const inv = fin[sc]?.invoices[id];
        if(inv) { tot+=inv.balance; tb.innerHTML += `<tr><td>${inv.number}</td><td>${formatCurrency(inv.balance)}</td><td><input type="number" class="payment-amount-input" value="${inv.balance}" data-invoice="${inv.number}"></td></tr>`; }
    });
    document.getElementById('payment-total-amount').textContent = formatCurrency(tot);
}

export function renderSupplierStatement(code, d1, d2) {
    const con = document.getElementById('supplier-statement-results'); if(!con) return;
    const fin = calculateSupplierFinancials();
    const s = fin[code];
    if(!s) { con.innerHTML='No Data'; con.style.display='block'; return; }
    let html = ''; let bal = 0;
    s.events.forEach(e => {
        bal += (e.debit - e.credit);
        html += `<tr><td>${formatDate(e.date)}</td><td>${e.type}</td><td>${e.ref}</td><td>${e.debit}</td><td>${e.credit}</td><td>${bal.toFixed(2)}</td></tr>`;
    });
    con.innerHTML = `<div class="printable-document"><h3>${s.name}</h3><table><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Dr</th><th>Cr</th><th>Bal</th></tr></thead><tbody>${html}</tbody></table></div>`;
    con.style.display = 'block';
}

export function renderItemCentricStockView() {
    const con = document.getElementById('item-centric-stock-container'); if(!con) return;
    const stock = calculateStockLevels();
    let html = '<table><thead><tr><th>Item</th><th>Total Qty</th></tr></thead><tbody>';
    state.items.forEach(i => {
        let q = 0;
        Object.values(stock).forEach(b => q += (b[i.code]?.quantity||0));
        html += `<tr><td>${i.name}</td><td>${q.toFixed(3)}</td></tr>`;
    });
    con.innerHTML = html + '</tbody></table>';
}

export function renderEditModalContent(type, id) {
    const body = document.getElementById('edit-modal-body');
    const title = document.getElementById('edit-modal-title');
    title.textContent = `Edit ${type}`;
    let html = '';
    if(type === 'item') {
        const i = findByKey(state.items, 'code', id);
        const isMain = i.ItemType === 'Main';
        let cutsHtml = '';
        if(isMain) {
            const cuts = state.items.filter(x => x.ItemType === 'Cut');
            const linked = (i.DefinedCuts || '').split(',');
            cuts.forEach(c => {
                const chk = linked.includes(c.code) ? 'checked' : '';
                cutsHtml += `<div><input type="checkbox" name="DefinedCuts" value="${c.code}" ${chk}> ${c.name}</div>`;
            });
        }
        html = `<div class="form-grid"><div class="form-group"><label>Name</label><input name="name" value="${i.name}"></div><div class="form-group"><label>Cost</label><input name="cost" value="${i.cost}"></div>${cutsHtml ? '<div class="form-group span-full"><label>Linked Cuts</label>'+cutsHtml+'</div>' : ''}</div>`;
    } else if (type === 'user') {
         const u = findByKey(state.allUsers, 'Username', id);
         html = `<div class="form-grid"><div class="form-group"><label>Name</label><input name="Name" value="${u.Name}"></div><div class="form-group"><label>Password</label><input name="LoginCode" type="password"></div></div>`;
    }
    // ... other types
    body.innerHTML = html;
}

export function renderItemsInModal(filter='') {
    const el = document.getElementById('modal-item-list'); if(!el) return; el.innerHTML = '';
    const ctx = document.getElementById('item-selector-modal').dataset.allowedItems;
    const allow = ctx ? JSON.parse(ctx) : null;
    state.items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()) && (!allow || allow.includes(i.code))).forEach(i => {
        el.innerHTML += `<div class="modal-item"><input type="checkbox" data-code="${i.code}"><label>${i.name}</label></div>`;
    });
}
