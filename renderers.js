// renderers.js
import { state } from './state.js';
import { _t, findByKey, userCan, populateOptions, formatCurrency, formatDate, Logger } from './utils.js';
import { calculateStockLevels, calculateSupplierFinancials } from './calculations.js';

// --- GENERIC TABLE RENDERER ---
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

// --- TRANSACTION LIST RENDERERS ---
export function renderReceiveListTable() { 
    renderDynamicListTable('table-receive-list', state.currentReceiveList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => formatCurrency((item.quantity||0)*(item.cost||0)) } ], 'no_items_selected_toast', () => { document.getElementById('receive-grand-total').textContent = formatCurrency(state.currentReceiveList.reduce((acc, i) => acc + (i.quantity*i.cost), 0)); }); 
}
export function renderTransferListTable() { renderDynamicListTable('table-transfer-list', state.currentTransferList, [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity' }], 'no_items_selected_toast', () => { document.getElementById('transfer-grand-total').textContent = state.currentTransferList.reduce((acc, i) => acc + (parseFloat(i.quantity)||0), 0).toFixed(3); }); }
export function renderReturnListTable() { renderDynamicListTable('table-return-list', state.currentReturnList, [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }], 'no_items_selected_toast', () => { document.getElementById('return-grand-total').textContent = formatCurrency(state.currentReturnList.reduce((acc, i) => acc + (i.quantity*i.cost), 0)); }); }
export function renderPOListTable() { renderDynamicListTable('table-po-list', state.currentPOList, [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => formatCurrency((item.quantity||0)*(item.cost||0)) }], 'no_items_selected_toast', () => { document.getElementById('po-grand-total').textContent = formatCurrency(state.currentPOList.reduce((acc, i) => acc + (i.quantity*i.cost), 0)); }); }
export function renderPOEditListTable() { renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => formatCurrency((item.quantity||0)*(item.cost||0)) }], 'no_items_selected_toast', () => { document.getElementById('edit-po-grand-total').textContent = formatCurrency(state.currentEditingPOList.reduce((acc, i) => acc + (i.quantity*i.cost), 0)); }); }
export function renderRequestListTable() { renderDynamicListTable('table-request-list', state.currentRequestList, [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }], 'no_items_selected_toast', null); }
export function renderAdjustmentListTable() { 
    const table = document.getElementById('table-adjustment-list'); if(!table) return; const tbody = table.querySelector('tbody'); tbody.innerHTML = '';
    if (!state.currentAdjustmentList.length) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_for_adjustment')}</td></tr>`; return; }
    const stock = calculateStockLevels(); const branch = document.getElementById('adjustment-branch')?.value;
    state.currentAdjustmentList.forEach((item, idx) => {
        const sys = (branch && stock[branch]?.[item.itemCode]?.quantity) || 0;
        const phys = item.physicalCount || 0;
        const diff = phys - sys;
        tbody.innerHTML += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${sys.toFixed(3)}</td><td><input type="number" class="table-input" value="${phys}" step="0.001" data-index="${idx}" data-field="physicalCount"></td><td style="color:${diff<0?'red':(diff>0?'green':'inherit')}">${diff.toFixed(3)}</td><td><button class="danger small" data-index="${idx}">X</button></td></tr>`;
    });
}
export function renderButcheryListTable() {
    renderDynamicListTable('table-butchery-children', state.currentButcheryList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity', step: 0.001 } ], 'no_items_selected_toast', () => {
        let total = state.currentButcheryList.reduce((acc, i) => acc + (parseFloat(i.quantity)||0), 0);
        document.getElementById('butchery-total-weight').textContent = total.toFixed(3);
        const parentQty = parseFloat(document.getElementById('butchery-parent-qty')?.value) || 0;
        if (parentQty > 0) {
            const pct = (total / parentQty) * 100;
            const el = document.getElementById('butchery-yield-pct');
            if(el) { el.textContent = pct.toFixed(1) + '%'; el.style.color = (pct > 102 || pct < 50) ? 'red' : 'green'; }
        }
    });
}

// --- REPORTS & PAYMENT ---
export function renderInvoicesInModal() {
    const listEl = document.getElementById('modal-invoice-list');
    const supplierCode = document.getElementById('payment-supplier-select')?.value;
    if (!listEl) return; listEl.innerHTML = '';
    if (!supplierCode) { listEl.innerHTML = '<p>Select supplier first.</p>'; return; }
    const financials = calculateSupplierFinancials();
    const unpaid = Object.values(financials[supplierCode]?.invoices || {}).filter(i => i.status !== 'Paid');
    if (!unpaid.length) { listEl.innerHTML = '<p>No unpaid invoices.</p>'; return; }
    unpaid.forEach(inv => {
        const checked = state.invoiceModalSelections.has(inv.number) ? 'checked' : '';
        listEl.innerHTML += `<div class="modal-item"><input type="checkbox" id="inv-${inv.number}" data-number="${inv.number}" ${checked}><label for="inv-${inv.number}">${inv.number} (${formatCurrency(inv.balance)})</label></div>`;
    });
}
export function renderPaymentList() {
    const container = document.getElementById('payment-invoice-list-container');
    const tbody = document.getElementById('table-payment-list')?.querySelector('tbody');
    if (!container || !tbody) return;
    const sc = document.getElementById('payment-supplier-select')?.value;
    if (!sc || state.invoiceModalSelections.size === 0) { container.style.display = 'none'; return; }
    tbody.innerHTML = ''; let total = 0;
    const fin = calculateSupplierFinancials();
    state.invoiceModalSelections.forEach(num => {
        const inv = fin[sc]?.invoices[num];
        if (inv) { total += inv.balance; tbody.innerHTML += `<tr><td>${inv.number}</td><td>${formatCurrency(inv.balance)}</td><td><input type="number" class="payment-amount-input" data-invoice="${inv.number}" value="${inv.balance.toFixed(2)}"></td></tr>`; }
    });
    document.getElementById('payment-total-amount').textContent = formatCurrency(total);
    container.style.display = 'block';
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

// --- MISSING FUNCTIONS FIXED HERE ---

export function renderPendingTransfers() {
    const container = document.getElementById('pending-transfers-card');
    if (!container) return;
    const tbody = document.getElementById('table-pending-transfers')?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const groups = {};
    (state.transactions || []).filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => {
        if (!groups[t.batchId]) groups[t.batchId] = { ...t, items: [] };
        groups[t.batchId].items.push(t);
    });
    
    const list = Object.values(groups);
    if (list.length === 0) { container.style.display = 'none'; return; }
    
    container.style.display = 'block';
    list.forEach(t => {
        const from = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || t.fromBranchCode;
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${from}</td><td>${t.ref}</td><td>${t.items.length}</td><td><button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">View</button></td></tr>`;
    });
}

export function renderInTransitReport() {
    const tbody = document.getElementById('table-in-transit')?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const groups = {};
    (state.transactions || []).filter(t => t.type === 'transfer_out').forEach(t => {
         if (!groups[t.batchId]) groups[t.batchId] = { ...t, items: [] };
         groups[t.batchId].items.push(t);
    });
    Object.values(groups).forEach(t => {
        const from = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName;
        const to = findByKey(state.branches, 'branchCode', t.toBranchCode)?.branchName;
        const act = t.Status === 'In Transit' ? `<button class="danger small btn-cancel-transfer" data-batch-id="${t.batchId}">Cancel</button>` : '-';
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${from}</td><td>${to}</td><td>${t.ref}</td><td>${t.items.length}</td><td>${t.Status}</td><td>${act}</td></tr>`;
    });
}

export function renderPurchaseOrdersViewer() {
    const tbody = document.getElementById('table-po-viewer')?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    (state.purchaseOrders || []).slice().reverse().forEach(po => {
        const sup = findByKey(state.suppliers, 'supplierCode', po.supplierCode)?.name || po.supplierCode;
        const items = state.purchaseOrderItems.filter(i => i.poId === po.poId);
        tbody.innerHTML += `<tr><td>${po.poId}</td><td>${formatDate(po.date)}</td><td>${sup}</td><td>${items.length}</td><td>${formatCurrency(po.totalValue)}</td><td>${po.Status}</td><td><button class="secondary small btn-view-tx" data-batch-id="${po.poId}" data-type="po">View</button></td></tr>`;
    });
}

// --- MASTER DATA & OTHERS ---
export function renderItemCentricStockView() {
    const con = document.getElementById('item-centric-stock-container'); if (!con) return;
    const stock = calculateStockLevels();
    let html = '<table><thead><tr><th>Code</th><th>Item</th><th>Total Qty</th></tr></thead><tbody>';
    state.items.forEach(i => {
        let q = 0;
        Object.values(stock).forEach(b => q += (b[i.code]?.quantity||0));
        html += `<tr><td>${i.code}</td><td>${i.name}</td><td>${q.toFixed(3)}</td></tr>`;
    });
    con.innerHTML = html + '</tbody></table>';
}
export function renderItemsTable(data = state.items) { const tb = document.getElementById('table-items')?.querySelector('tbody'); if(tb) { tb.innerHTML = ''; data.forEach(i => tb.innerHTML += `<tr><td>${i.code}</td><td>${i.name}</td><td>${i.category}</td><td>${i.ItemType}</td><td>${formatCurrency(i.cost)}</td><td><button class="secondary small btn-edit" data-type="item" data-id="${i.code}">Edit</button></td></tr>`); } }
export function renderSuppliersTable(data = state.suppliers) { const tb = document.getElementById('table-suppliers')?.querySelector('tbody'); if(tb) { tb.innerHTML = ''; data.forEach(s => tb.innerHTML += `<tr><td>${s.supplierCode}</td><td>${s.name}</td><td>${s.contact}</td><td>-</td><td><button class="secondary small btn-edit" data-type="supplier" data-id="${s.supplierCode}">Edit</button></td></tr>`); } }
export function renderBranchesTable(data = state.branches) { const tb = document.getElementById('table-branches')?.querySelector('tbody'); if(tb) { tb.innerHTML = ''; data.forEach(b => tb.innerHTML += `<tr><td>${b.branchCode}</td><td>${b.branchName}</td><td><button class="secondary small btn-edit" data-type="branch" data-id="${b.branchCode}">Edit</button></td></tr>`); } }
export function renderSectionsTable(data = state.sections) { const tb = document.getElementById('table-sections')?.querySelector('tbody'); if(tb) { tb.innerHTML = ''; data.forEach(s => tb.innerHTML += `<tr><td>${s.sectionCode}</td><td>${s.sectionName}</td><td><button class="secondary small btn-edit" data-type="section" data-id="${s.sectionCode}">Edit</button></td></tr>`); } }
export function renderTransactionHistory(filters = {}) {
    const table = document.getElementById('table-transaction-history'); if (!table) return;
    const tbody = table.querySelector('tbody'); if (!tbody) return; tbody.innerHTML = '';
    let tx = [...state.transactions];
    tx.sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(t => {
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${t.type}</td><td>${t.batchId}</td><td>${t.itemCode}</td><td>${t.Status}</td><td><button class="secondary small btn-view-tx" data-batch-id="${t.batchId}" data-type="${t.type}">View</button></td></tr>`;
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
export function renderEditModalContent(type, id) {
    const body = document.getElementById('edit-modal-body'); document.getElementById('edit-modal-title').textContent = `Edit ${type}`;
    if (type === 'item') {
        const i = findByKey(state.items, 'code', id);
        let cutsHtml = '';
        if(i.ItemType==='Main') {
            const cuts = state.items.filter(x => x.ItemType === 'Cut');
            const linked = (i.DefinedCuts||'').split(',');
            cuts.forEach(c => cutsHtml += `<div style="padding:2px"><input type="checkbox" name="DefinedCuts" value="${c.code}" ${linked.includes(c.code)?'checked':''}> ${c.name}</div>`);
        }
        body.innerHTML = `<div class="form-grid"><div class="form-group"><label>Name</label><input name="name" value="${i.name}"></div><div class="form-group"><label>Cost</label><input name="cost" value="${i.cost}"></div>${cutsHtml?`<div class="form-group span-full"><label>Linked Cuts</label><div style="border:1px solid #ccc;padding:5px;max-height:100px;overflow:auto">${cutsHtml}</div></div>`:''}</div>`;
    } else if (type === 'user') {
        const u = findByKey(state.allUsers, 'Username', id);
        body.innerHTML = `<div class="form-grid"><div class="form-group"><label>Name</label><input name="Name" value="${u.Name}"></div><div class="form-group"><label>Password</label><input name="LoginCode" type="password"></div></div>`;
    }
}
export function renderItemsInModal(filter='') {
    const el = document.getElementById('modal-item-list'); if(!el) return; el.innerHTML = '';
    const ctx = document.getElementById('item-selector-modal').dataset.allowedItems;
    const allow = ctx ? JSON.parse(ctx) : null;
    state.items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()) && (!allow || allow.includes(i.code))).forEach(i => {
        el.innerHTML += `<div class="modal-item"><input type="checkbox" data-code="${i.code}"><label>${i.name}</label></div>`;
    });
}
