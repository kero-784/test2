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
            const td = document.createElement('td');
            td.innerHTML = content;
            tr.appendChild(td);
        });
        
        const actionTd = document.createElement('td');
        actionTd.innerHTML = `<button class="danger small" data-index="${index}">X</button>`;
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
    });
    if (totalizerFn) totalizerFn();
};

// --- TRANSACTION LIST RENDERERS ---

export function renderReceiveListTable() { 
    renderDynamicListTable('table-receive-list', state.currentReceiveList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => formatCurrency((parseFloat(item.quantity)||0) * (parseFloat(item.cost)||0)) } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentReceiveList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0) * (parseFloat(i.cost)||0)), 0);
        const el = document.getElementById('receive-grand-total'); if(el) el.textContent = formatCurrency(total);
    }); 
}

export function renderButcheryListTable() {
    renderDynamicListTable('table-butchery-children', state.currentButcheryList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity', step: 0.001 } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentButcheryList.reduce((acc, i) => acc + (parseFloat(i.quantity)||0), 0);
        const el = document.getElementById('butchery-total-weight'); if(el) el.textContent = total.toFixed(3);
        
        const pQty = parseFloat(document.getElementById('butchery-parent-qty')?.value) || 0;
        const yEl = document.getElementById('butchery-yield-pct');
        if(yEl && pQty > 0) { 
            const pct = (total / pQty) * 100;
            yEl.textContent = pct.toFixed(1) + '%';
            yEl.style.color = (pct > 102 || pct < 50) ? 'red' : 'green';
        }
    });
}

export function renderTransferListTable() { 
    renderDynamicListTable('table-transfer-list', state.currentTransferList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity' } 
    ], 'no_items_selected_toast', () => {
        const el = document.getElementById('transfer-grand-total'); if(el) el.textContent = state.currentTransferList.reduce((acc, i) => acc + (parseFloat(i.quantity)||0), 0).toFixed(3);
    }); 
}

export function renderReturnListTable() { 
    renderDynamicListTable('table-return-list', state.currentReturnList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' } 
    ], 'no_items_selected_toast', () => {
        const el = document.getElementById('return-grand-total'); if(el) el.textContent = formatCurrency(state.currentReturnList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0)*(parseFloat(i.cost)||0)), 0));
    }); 
}

export function renderPOListTable() { 
    renderDynamicListTable('table-po-list', state.currentPOList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => formatCurrency((parseFloat(item.quantity)||0) * (parseFloat(item.cost)||0)) } 
    ], 'no_items_selected_toast', () => {
        const el = document.getElementById('po-grand-total'); if(el) el.textContent = formatCurrency(state.currentPOList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0)*(parseFloat(i.cost)||0)), 0));
    }); 
}

export function renderPOEditListTable() {
    renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => formatCurrency((parseFloat(item.quantity)||0) * (parseFloat(item.cost)||0)) } 
    ], 'no_items_selected_toast', () => {
        const el = document.getElementById('edit-po-grand-total'); if(el) el.textContent = formatCurrency(state.currentEditingPOList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0)*(parseFloat(i.cost)||0)), 0));
    });
}

export function renderRequestListTable() { 
    renderDynamicListTable('table-request-list', state.currentRequestList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' } ], 'no_items_selected_toast', null); 
}

export function renderAdjustmentListTable() {
    const table = document.getElementById('table-adjustment-list'); if(!table) return;
    const tbody = table.querySelector('tbody'); if(!tbody) return; tbody.innerHTML = '';
    if (!state.currentAdjustmentList.length) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_for_adjustment')}</td></tr>`; return; }
    const stock = calculateStockLevels(); const branch = document.getElementById('adjustment-branch')?.value;
    state.currentAdjustmentList.forEach((item, idx) => {
        const sys = (branch && stock[branch]?.[item.itemCode]?.quantity) || 0;
        const phys = item.physicalCount || 0;
        const diff = phys - sys;
        tbody.innerHTML += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${sys.toFixed(3)}</td><td><input type="number" class="table-input" value="${phys}" step="0.001" data-index="${idx}" data-field="physicalCount"></td><td style="color:${diff<0?'red':(diff>0?'green':'inherit')}">${diff.toFixed(3)}</td><td><button class="danger small" data-index="${idx}">X</button></td></tr>`;
    });
}

// --- MASTER DATA RENDERERS ---

export function renderItemsTable(data = state.items) { 
    const tb = document.getElementById('table-items')?.querySelector('tbody'); 
    if(tb) { 
        tb.innerHTML = ''; 
        data.forEach(i => tb.innerHTML += `<tr><td>${i.code}</td><td>${i.name}</td><td>${i.category}</td><td>${i.ItemType||'Main'}</td><td>${formatCurrency(i.cost)}</td><td><button class="secondary small btn-edit" data-type="item" data-id="${i.code}">Edit</button></td></tr>`); 
    } 
}

export function renderSuppliersTable(data = state.suppliers) { 
    const tb = document.getElementById('table-suppliers')?.querySelector('tbody'); 
    if(tb) { 
        tb.innerHTML = ''; 
        data.forEach(s => tb.innerHTML += `<tr><td>${s.supplierCode}</td><td>${s.name}</td><td>${s.contact}</td><td>-</td><td><button class="secondary small btn-edit" data-type="supplier" data-id="${s.supplierCode}">Edit</button></td></tr>`); 
    } 
}

export function renderBranchesTable(data = state.branches) { 
    const tb = document.getElementById('table-branches')?.querySelector('tbody'); 
    if(tb) { 
        tb.innerHTML = ''; 
        data.forEach(b => tb.innerHTML += `<tr><td>${b.branchCode}</td><td>${b.branchName}</td><td><button class="secondary small btn-edit" data-type="branch" data-id="${b.branchCode}">Edit</button></td></tr>`); 
    } 
}

export function renderSectionsTable(data = state.sections) { 
    const tb = document.getElementById('table-sections')?.querySelector('tbody'); 
    if(tb) { 
        tb.innerHTML = ''; 
        data.forEach(s => tb.innerHTML += `<tr><td>${s.sectionCode}</td><td>${s.sectionName}</td><td><button class="secondary small btn-edit" data-type="section" data-id="${s.sectionCode}">Edit</button></td></tr>`); 
    } 
}

// --- REPORT & HISTORY RENDERERS ---

export function renderTransactionHistory(filters = {}) {
    const table = document.getElementById('table-transaction-history'); if (!table) return;
    const tbody = table.querySelector('tbody'); if (!tbody) return; tbody.innerHTML = '';
    
    let tx = [...state.transactions];
    let pos = [...state.purchaseOrders];
    let all = [...tx, ...pos.map(p => ({...p, type: 'po', batchId: p.poId, ref: p.poId}))];

    if (state.currentUser && !userCan('viewAllBranches')) { 
        const bc = state.currentUser.AssignedBranchCode;
        if(bc) all = all.filter(t => t.branchCode === bc || t.fromBranchCode === bc || t.toBranchCode === bc);
    }
    
    if(all.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No data</td></tr>'; return; }
    
    all.sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(t => {
        let details = t.notes || '';
        if(t.type === 'receive') details = `GRN: ${t.invoiceNumber} (${t.supplierCode})`;
        else if(t.type && t.type.includes('production')) details = `Butchery Yield`;
        else if(t.type === 'po') details = `Order: ${t.supplierCode}`;
        
        const status = t.Status || (t.isApproved ? 'Approved' : 'Pending');
        
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${t.type}</td><td>${t.batchId}</td><td>${details}</td><td>${status}</td><td><button class="secondary small btn-view-tx" data-batch-id="${t.batchId}" data-type="${t.type}">View</button></td></tr>`;
    });
}

export function renderPendingFinancials() {
    const table = document.getElementById('table-pending-financial-approval'); if (!table) return;
    const tbody = table.querySelector('tbody'); tbody.innerHTML = '';
    
    const pending = state.transactions.filter(t => t.type === 'receive' && !t.isApproved);
    const pos = state.purchaseOrders.filter(p => p.Status === 'Pending Approval');
    
    if(!pending.length && !pos.length) { tbody.innerHTML = '<tr><td colspan="6">No pending approvals</td></tr>'; return; }
    
    // Group receives by batch
    const groups = {};
    pending.forEach(t => { 
        if(!groups[t.batchId]) groups[t.batchId]={...t, val:0, count:0}; 
        groups[t.batchId].val += (parseFloat(t.quantity)*parseFloat(t.cost));
        groups[t.batchId].count++;
    });

    // Render POs
    pos.forEach(p => {
         tbody.innerHTML += `<tr><td>${formatDate(p.date)}</td><td>PO</td><td>${p.poId}</td><td>${p.supplierCode}</td><td>${formatCurrency(p.totalValue)}</td><td><button class="primary small btn-approve-financial" data-id="${p.poId}" data-type="po">Approve</button></td></tr>`;
    });
    
    // Render GRNs
    Object.values(groups).forEach(t => {
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>GRN</td><td>${t.batchId}</td><td>${t.invoiceNumber}</td><td>${formatCurrency(t.val)}</td><td><button class="primary small btn-approve-financial" data-id="${t.batchId}" data-type="receive">Approve</button></td></tr>`;
    });
}

// *** THE MISSING FUNCTION THAT CAUSED THE ERROR ***
export function renderPurchaseOrdersViewer() {
    const table = document.getElementById('table-po-viewer');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const pos = (state.purchaseOrders || []);
    if(pos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No Purchase Orders found</td></tr>';
        return;
    }

    pos.slice().reverse().forEach(po => {
        const supplier = findByKey(state.suppliers, 'supplierCode', po.supplierCode);
        const supplierName = supplier ? supplier.name : po.supplierCode;
        const itemCount = (state.purchaseOrderItems || []).filter(i => i.poId === po.poId).length;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${po.poId}</td>
            <td>${formatDate(po.date)}</td>
            <td>${supplierName}</td>
            <td>${itemCount}</td>
            <td>${formatCurrency(po.totalValue)}</td>
            <td>${po.Status}</td>
            <td><button class="secondary small btn-view-tx" data-batch-id="${po.poId}" data-type="po">View</button></td>`;
        tbody.appendChild(tr);
    });
}

export function renderActivityLog() {
    const tb = document.getElementById('table-activity-log')?.querySelector('tbody'); 
    if(tb) { 
        tb.innerHTML=''; 
        state.activityLog.slice().reverse().forEach(l => {
            tb.innerHTML += `<tr><td>${new Date(l.Timestamp).toLocaleString()}</td><td>${l.User}</td><td>${l.Action}</td><td>${l.Description}</td></tr>`;
        }); 
    }
}

export function renderInvoicesInModal() {
    const el = document.getElementById('modal-invoice-list'); if(!el) return; el.innerHTML = '';
    const sc = document.getElementById('payment-supplier-select')?.value;
    if(!sc) { el.innerHTML = '<p>Select Supplier First</p>'; return; }
    
    const fin = calculateSupplierFinancials();
    const invs = Object.values(fin[sc]?.invoices || {}).filter(i => i.status !== 'Paid');
    
    if(invs.length === 0) { el.innerHTML = '<p>No unpaid invoices.</p>'; return; }
    
    invs.forEach(i => {
        const chk = state.invoiceModalSelections.has(i.number) ? 'checked' : '';
        el.innerHTML += `<div class="modal-item"><input type="checkbox" id="inv-${i.number}" data-number="${i.number}" ${chk}><label for="inv-${i.number}">${i.number} (${formatCurrency(i.balance)})</label></div>`;
    });
}

export function renderPaymentList() {
    const container = document.getElementById('payment-invoice-list-container');
    const tb = document.getElementById('table-payment-list')?.querySelector('tbody');
    if(!container || !tb) return;
    
    const sc = document.getElementById('payment-supplier-select')?.value;
    if(!sc || state.invoiceModalSelections.size === 0) { container.style.display = 'none'; return; }
    
    container.style.display = 'block'; 
    tb.innerHTML = '';
    let tot = 0;
    const fin = calculateSupplierFinancials();
    
    state.invoiceModalSelections.forEach(id => {
        const inv = fin[sc]?.invoices[id];
        if(inv) { 
            tot += inv.balance; 
            tb.innerHTML += `<tr><td>${inv.number}</td><td>${formatCurrency(inv.balance)}</td><td><input type="number" class="payment-amount-input" value="${inv.balance.toFixed(2)}" data-invoice="${inv.number}"></td></tr>`; 
        }
    });
    document.getElementById('payment-total-amount').textContent = formatCurrency(tot);
}

export function renderSupplierStatement(code, d1, d2) {
    const con = document.getElementById('supplier-statement-results'); if(!con) return;
    const fin = calculateSupplierFinancials();
    const s = fin[code];
    if(!s) { con.innerHTML='<p>No Data</p>'; con.style.display='block'; return; }
    
    let html = ''; let bal = 0;
    s.events.forEach(e => {
        // Basic filtering could go here
        bal += (e.debit - e.credit);
        html += `<tr><td>${formatDate(e.date)}</td><td>${e.type}</td><td>${e.ref}</td><td>${formatCurrency(e.debit)}</td><td>${formatCurrency(e.credit)}</td><td>${formatCurrency(bal)}</td></tr>`;
    });
    
    con.innerHTML = `<div class="printable-document"><h3>${s.name}</h3><table><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Bal</th></tr></thead><tbody>${html}</tbody></table></div>`;
    con.style.display = 'block';
}

export function renderItemCentricStockView() {
    const con = document.getElementById('item-centric-stock-container'); if(!con) return;
    const stock = calculateStockLevels();
    let html = '<table><thead><tr><th>Code</th><th>Item</th><th>Total Qty</th><th>Avg Cost</th><th>Total Value</th></tr></thead><tbody>';
    state.items.forEach(i => {
        let q = 0; let v = 0;
        Object.values(stock).forEach(b => {
            const data = b[i.code];
            if(data) { q += data.quantity; v += (data.quantity * data.avgCost); }
        });
        if(q !== 0) {
            html += `<tr><td>${i.code}</td><td>${i.name}</td><td>${q.toFixed(3)}</td><td>${q>0?(v/q).toFixed(2):'-'}</td><td>${formatCurrency(v)}</td></tr>`;
        }
    });
    con.innerHTML = html + '</tbody></table>';
}

export function renderEditModalContent(type, id) {
    const body = document.getElementById('edit-modal-body'); 
    document.getElementById('edit-modal-title').textContent = `Edit ${type}`;
    
    if (type === 'item') {
        const i = findByKey(state.items, 'code', id);
        let cutsHtml = '';
        if(i.ItemType === 'Main') {
            const cuts = state.items.filter(x => x.ItemType === 'Cut');
            const linked = (i.DefinedCuts||'').split(',');
            cuts.forEach(c => {
                const chk = linked.includes(c.code) ? 'checked' : '';
                cutsHtml += `<div style="padding:2px"><input type="checkbox" name="DefinedCuts" value="${c.code}" ${chk}> ${c.name}</div>`;
            });
        }
        body.innerHTML = `<div class="form-grid">
            <div class="form-group"><label>Name</label><input name="name" value="${i.name}"></div>
            <div class="form-group"><label>Cost</label><input name="cost" value="${i.cost}"></div>
            <div class="form-group"><label>Category</label><input name="category" value="${i.category}"></div>
            ${cutsHtml ? `<div class="form-group span-full"><label>Linked Cuts</label><div style="border:1px solid #ccc;padding:5px;max-height:100px;overflow:auto">${cutsHtml}</div></div>` : ''}
        </div>`;
    } 
    else if (type === 'user') {
        const u = findByKey(state.allUsers, 'Username', id);
        body.innerHTML = `<div class="form-grid">
            <div class="form-group"><label>Name</label><input name="Name" value="${u.Name}"></div>
            <div class="form-group"><label>Password (New)</label><input name="LoginCode" type="password"></div>
        </div>`;
    }
}

export function renderItemsInModal(filter='') {
    const el = document.getElementById('modal-item-list'); if(!el) return; el.innerHTML = '';
    const ctx = document.getElementById('item-selector-modal').dataset.allowedItems;
    const allow = ctx ? JSON.parse(ctx) : null;
    
    state.items.filter(i => {
        const matchName = i.name.toLowerCase().includes(filter.toLowerCase());
        const matchAllow = !allow || allow.includes(i.code);
        return matchName && matchAllow;
    }).forEach(i => {
        el.innerHTML += `<div class="modal-item"><input type="checkbox" data-code="${i.code}"><label>${i.name}</label></div>`;
    });
}

export function renderPendingTransfers() {
    const container = document.getElementById('pending-transfers-card'); if (!container) return;
    const tbody = document.getElementById('table-pending-transfers')?.querySelector('tbody'); if (!tbody) return; 
    tbody.innerHTML = '';
    
    const groups = {};
    (state.transactions || []).filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => {
        if (!groups[t.batchId]) groups[t.batchId] = { ...t, items: [] };
        groups[t.batchId].items.push(t);
    });
    
    if(Object.keys(groups).length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    
    Object.values(groups).forEach(t => {
        const from = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || t.fromBranchCode;
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${from}</td><td>${t.ref}</td><td>${t.items.length}</td><td><button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">View</button></td></tr>`;
    });
}

export function renderInTransitReport() {
    const tbody = document.getElementById('table-in-transit')?.querySelector('tbody'); if (!tbody) return; 
    tbody.innerHTML = '';
    
    const groups = {};
    (state.transactions || []).filter(t => t.type === 'transfer_out').forEach(t => {
        if (!groups[t.batchId]) groups[t.batchId] = { ...t, items: [] };
        groups[t.batchId].items.push(t);
    });
    
    Object.values(groups).forEach(t => {
        const from = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || 'N/A';
        const to = findByKey(state.branches, 'branchCode', t.toBranchCode)?.branchName || 'N/A';
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${from}</td><td>${to}</td><td>${t.ref}</td><td>${t.items.length}</td><td>${t.Status}</td><td>-</td></tr>`;
    });
}
