import { state } from './state.js';
import { _t, findByKey } from './utils.js';
import { calculateStockLevels } from './calculations.js';

// --- TOTALIZER FUNCTIONS ---
export function updateReceiveGrandTotal() { 
    let grandTotal = 0; 
    (state.currentReceiveList || []).forEach(item => { 
        if(item.isMainItemPlaceholder) grandTotal += (parseFloat(item.cost) || 0);
        else if(!findByKey(state.items, 'code', item.itemCode)?.ParentItemCode) grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); 
    }); 
    const el = document.getElementById('receive-grand-total');
    if(el) el.textContent = `${grandTotal.toFixed(2)} EGP`; 
}

export function updateTransferGrandTotal() { 
    let t = 0; state.currentTransferList.forEach(i => t += (parseFloat(i.quantity) || 0)); 
    const el = document.getElementById('transfer-grand-total');
    if(el) el.textContent = t.toFixed(2); 
}

export function updatePOGrandTotal() { 
    let t = 0; state.currentPOList.forEach(i => { 
        if(i.isMainItemPlaceholder) t+=parseFloat(i.cost)||0; 
        else if(!findByKey(state.items,'code',i.itemCode)?.ParentItemCode) t+=(parseFloat(i.quantity)||0)*(parseFloat(i.cost)||0); 
    }); 
    const el = document.getElementById('po-grand-total');
    if(el) el.textContent = `${t.toFixed(2)} EGP`; 
}

export function updatePOEditGrandTotal() { 
    let t = 0; state.currentEditingPOList.forEach(i => { if(!findByKey(state.items,'code',i.itemCode)?.ParentItemCode) t+=(parseFloat(i.quantity)||0)*(parseFloat(i.cost)||0); }); 
    const el = document.getElementById('edit-po-grand-total');
    if(el) el.textContent = `${t.toFixed(2)} EGP`; 
}

export function updateReturnGrandTotal() { 
    let t = 0; state.currentReturnList.forEach(i => { if(!findByKey(state.items,'code',i.itemCode)?.ParentItemCode) t+=(parseFloat(i.quantity)||0)*(parseFloat(i.cost)||0); }); 
    const el = document.getElementById('return-grand-total');
    if(el) el.textContent = `${t.toFixed(2)} EGP`; 
}

// --- CORE RENDERER ---
export const renderDynamicListTable = (tbodyId, list, columnsConfig, emptyMessage, totalizerFn) => {
    const table = document.getElementById(tbodyId);
    if(!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columnsConfig.length + 1}" style="text-align:center;">${_t(emptyMessage)}</td></tr>`;
        if (totalizerFn) totalizerFn();
        return;
    }

    const stock = calculateStockLevels();
    const branchSelect = columnsConfig.find(c => c.branchSelectId);
    const branchCode = branchSelect ? document.getElementById(branchSelect.branchSelectId)?.value : null;

    const groupedMap = {}; const standaloneList = []; 

    list.forEach((item, index) => {
        if (item.isMainItemPlaceholder) {
            if (!groupedMap[item.itemCode]) groupedMap[item.itemCode] = { parentIndex: index, parentItem: item, children: [] };
            else { groupedMap[item.itemCode].parentIndex = index; groupedMap[item.itemCode].parentItem = item; }
        } else {
            const itemDetails = findByKey(state.items, 'code', item.itemCode);
            if (itemDetails && itemDetails.ParentItemCode) {
                if (!groupedMap[itemDetails.ParentItemCode]) groupedMap[itemDetails.ParentItemCode] = { parentIndex: -1, parentItem: null, children: [] };
                groupedMap[itemDetails.ParentItemCode].children.push({ item, index });
            } else { standaloneList.push({ item, index }); }
        }
    });

    const allGroups = [...Object.values(groupedMap), ...standaloneList.map(s => ({ parentIndex: s.index, parentItem: s.item, children: [], isStandalone: true }))];
    allGroups.sort((a, b) => { const idxA = a.parentIndex > -1 ? a.parentIndex : 9999; const idxB = b.parentIndex > -1 ? b.parentIndex : 9999; return idxA - idxB; });

    allGroups.forEach(group => {
        if (!group.parentItem && group.children.length === 0) return;
        
        // Parent Row
        if (group.parentItem) {
            const pItem = group.parentItem; const pIdx = group.parentIndex; const isPh = pItem.isMainItemPlaceholder;
            let totWgt = isPh ? group.children.reduce((s, c) => s + (parseFloat(c.item.quantity)||0), 0) : 0;
            const dispQty = isPh ? totWgt.toFixed(2) : (pItem.quantity||'');
            
            let tr = document.createElement('tr'); if(isPh) tr.classList.add('main-item-group-header');
            
            columnsConfig.forEach(col => {
                let val = '';
                if(col.type === 'text') val = pItem[col.key];
                else if(col.type === 'number_input') val = `<input type="number" class="table-input" value="${dispQty}" data-index="${pIdx}" data-field="${col.key}" ${isPh?'readonly':''}>`;
                else if(col.type === 'cost_input') { 
                    if(isPh) val = `<input type="number" class="table-input" value="${pItem.cost||''}" data-index="${pIdx}" data-field="cost" title="Total Batch Value">`; 
                    else val = `<input type="number" class="table-input" value="${pItem.cost||''}" data-index="${pIdx}" data-field="cost">`; 
                }
                else if(col.type === 'calculated') { val = isPh ? (parseFloat(pItem.cost)||0).toFixed(2) : ((parseFloat(pItem.quantity)||0)*(parseFloat(pItem.cost)||0)).toFixed(2); }
                else if(col.type === 'available_stock') val = (stock[branchCode]?.[pItem.itemCode]?.quantity||0).toFixed(2);
                
                tr.innerHTML += `<td>${val}</td>`;
            });
            tr.innerHTML += `<td>${!isPh ? `<button class="danger small" data-index="${pIdx}">X</button>` : '---'}</td>`;
            tbody.appendChild(tr);
        }

        // Child Rows
        group.children.forEach(child => {
            let tr = document.createElement('tr'); tr.classList.add('sub-item-row');
            columnsConfig.forEach(col => {
                let val = '';
                if(col.type === 'text') val = child.item[col.key];
                else if(col.type === 'number_input') val = `<input type="number" class="table-input" value="${child.item[col.key]||''}" data-index="${child.index}" data-field="${col.key}">`;
                else if(col.type === 'available_stock') val = (stock[branchCode]?.[child.item.itemCode]?.quantity||0).toFixed(2);
                else val = '---';
                tr.innerHTML += `<td>${val}</td>`;
            });
            tr.innerHTML += `<td><button class="danger small" data-index="${child.index}">X</button></td>`;
            tbody.appendChild(tr);
        });
    });
    if(totalizerFn) totalizerFn();
};

// --- SPECIFIC RENDERERS (ALL EXPORTED) ---
export function renderReceiveListTable() { 
    renderDynamicListTable('table-receive-list', state.currentReceiveList, 
        [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' }], 
        'no_items_selected_toast', updateReceiveGrandTotal); 
}

export function renderTransferListTable() { 
    renderDynamicListTable('table-transfer-list', state.currentTransferList, 
        [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'transfer-from-branch' }], 
        'no_items_selected_toast', updateTransferGrandTotal); 
}

export function renderPOListTable() { 
    renderDynamicListTable('table-po-list', state.currentPOList, 
        [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' }], 
        'no_items_selected_toast', updatePOGrandTotal); 
}

export function renderPOEditListTable() { 
    renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, 
        [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' }], 
        'no_items_selected_toast', updatePOEditGrandTotal); 
}

export function renderReturnListTable() { 
    renderDynamicListTable('table-return-list', state.currentReturnList, 
        [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'return-branch' }, { type: 'cost_input', key: 'cost' }], 
        'no_items_selected_toast', updateReturnGrandTotal); 
}

export function renderTransactionHistory(filters = {}) {
    const table = document.getElementById('table-transaction-history'); if(!table) return;
    const tbody = table.querySelector('tbody'); tbody.innerHTML = '';
    
    let items = [...(state.transactions||[])];
    if(filters.branch) items = items.filter(t => t.branchCode == filters.branch || t.fromBranchCode == filters.branch || t.toBranchCode == filters.branch);
    if(filters.type) items = items.filter(t => t.type == filters.type);
    
    const groups = {}; 
    items.forEach(t => { if(!groups[t.batchId]) groups[t.batchId] = []; groups[t.batchId].push(t); });
    
    Object.values(groups).sort((a,b) => new Date(b[0].date) - new Date(a[0].date)).forEach(g => {
        const t = g[0];
        tbody.innerHTML += `<tr><td>${new Date(t.date).toLocaleString()}</td><td>${t.type}</td><td>${t.batchId}</td><td>${g.length} Items</td><td>${t.Status||''}</td><td><button class="secondary small btn-view-tx" data-batch-id="${t.batchId}" data-type="${t.type}">View</button></td></tr>`;
    });
}

export function renderItemsTable() { 
    const tbody = document.getElementById('table-items').querySelector('tbody'); tbody.innerHTML = ''; 
    (state.items||[]).forEach(i => tbody.innerHTML += `<tr><td>${i.code}</td><td>${i.name}</td><td>${i.ParentItemCode||''}</td><td>${i.cost}</td><td><button class="secondary small btn-edit" data-type="item" data-id="${i.code}">Edit</button></td></tr>`); 
}
export function renderSuppliersTable() { 
    const tbody = document.getElementById('table-suppliers').querySelector('tbody'); tbody.innerHTML = ''; 
    (state.suppliers||[]).forEach(s => tbody.innerHTML += `<tr><td>${s.supplierCode}</td><td>${s.name}</td><td>-</td><td><button class="secondary small btn-edit" data-type="supplier" data-id="${s.supplierCode}">Edit</button></td></tr>`); 
}
export function renderBranchesTable() { 
    const tbody = document.getElementById('table-branches').querySelector('tbody'); tbody.innerHTML = ''; 
    (state.branches||[]).forEach(b => tbody.innerHTML += `<tr><td>${b.branchCode}</td><td>${b.branchName}</td><td><button class="secondary small btn-edit" data-type="branch" data-id="${b.branchCode}">Edit</button></td></tr>`); 
}

export function renderAdjustmentListTable() {
    const tbody = document.getElementById('table-adjustment-list').querySelector('tbody'); tbody.innerHTML = '';
    if (!state.currentAdjustmentList.length) { tbody.innerHTML = `<tr><td colspan="6">${_t('no_items_for_adjustment')}</td></tr>`; return; }
    const stock = calculateStockLevels(); const bc = document.getElementById('adjustment-branch').value;
    state.currentAdjustmentList.forEach((item, idx) => {
        const sys = (bc && stock[bc]?.[item.itemCode]?.quantity)||0;
        const phys = item.physicalCount !== undefined ? item.physicalCount : '';
        const adj = (parseFloat(phys)||0) - sys;
        tbody.innerHTML += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${sys.toFixed(2)}</td><td><input type="number" class="table-input" value="${phys}" data-index="${idx}" data-field="physicalCount"></td><td>${adj.toFixed(2)}</td><td><button class="danger small" data-index="${idx}">X</button></td></tr>`;
    });
}
