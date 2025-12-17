import { state } from './state.js';
import { _t, findByKey, userCan, populateOptions, formatCurrency, formatDate } from './utils.js';
import { calculateStockLevels, calculateSupplierFinancials } from './calculations.js';
import * as Documents from './documents.js';

// --- CONFIG: PERMISSION DEFINITIONS ---
const PERMISSION_GROUPS = {
    'Administration': [ 
        { key: 'manageUsers', label: 'Manage Users & Roles' }, 
        { key: 'viewAllBranches', label: 'View All Branches (Super User)' }, 
        { key: 'opBackupRestore', label: 'Backup & Restore' } 
    ],
    'Master Data Creation': [ 
        { key: 'createItem', label: 'Create Items' }, 
        { key: 'createSupplier', label: 'Create Suppliers' }, 
        { key: 'createBranch', label: 'Create Branches' } 
    ],
    'Stock Operations': [ 
        { key: 'opReceive', label: 'Receive Stock (GRN)' }, 
        { key: 'opTransfer', label: 'Send Transfer' }, 
        { key: 'opReturn', label: 'Return to Supplier' }, 
        { key: 'opStockAdjustment', label: 'Stock Adjustments' }, 
        { key: 'opProduction', label: 'Butchery & Production' }, 
        { key: 'opApproveGRN', label: 'Approve Invoices/GRNs' }, 
        { key: 'opRecordSales', label: 'Record Sales' } 
    ],
    'Financials': [ 
        { key: 'opCreatePO', label: 'Create PO' }, 
        { key: 'opApprovePO', label: 'Approve Purchase Orders' }, 
        { key: 'opEditInvoice', label: 'Edit GRN/Invoice' }, 
        { key: 'opRecordPayment', label: 'Record Payments' }, 
        { key: 'viewYieldReports', label: 'View Butchery Reports' }, 
        { key: 'opManagePriceLists', label: 'Manage Selling Prices & Generator' } 
    ]
}

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
                case 'number_input': 
                    content = `<input type="number" class="table-input" value="${item[col.key] || ''}" min="${col.min || 0.001}" step="${col.step || 0.001}" data-index="${index}" data-field="${col.key}">`; 
                    break;
                case 'cost_input': 
                    content = `<input type="number" class="table-input" value="${(parseFloat(item.cost) || 0).toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost">`; 
                    break;
                case 'calculated': 
                    content = `<span>${col.calculator(item)}</span>`; 
                    break;
                case 'available_stock': 
                    content = availableStock.toFixed(3); 
                    break;
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
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'number_input', key: 'quantity' }, 
        { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => formatCurrency((parseFloat(item.quantity)||0) * (parseFloat(item.cost)||0)) } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentReceiveList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0) * (parseFloat(i.cost)||0)), 0);
        const el = document.getElementById('receive-grand-total');
        if(el) el.textContent = formatCurrency(total);
    }); 
}

export function renderTransferListTable() { 
    renderDynamicListTable('table-transfer-list', state.currentTransferList, [ 
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, 
        { type: 'number_input', key: 'quantity' } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentTransferList.reduce((acc, i) => acc + (parseFloat(i.quantity)||0), 0);
        const el = document.getElementById('transfer-grand-total');
        if(el) el.textContent = total.toFixed(3);
    }); 
}

export function renderReturnListTable() { 
    renderDynamicListTable('table-return-list', state.currentReturnList, [ 
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'available_stock', branchSelectId: 'return-branch' }, 
        { type: 'number_input', key: 'quantity' }, 
        { type: 'cost_input', key: 'cost' } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentReturnList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0) * (parseFloat(i.cost)||0)), 0);
        const el = document.getElementById('return-grand-total');
        if(el) el.textContent = formatCurrency(total);
    }); 
}

export function renderPOListTable() { 
    renderDynamicListTable('table-po-list', state.currentPOList, [ 
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'number_input', key: 'quantity' }, 
        { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => formatCurrency((parseFloat(item.quantity)||0) * (parseFloat(item.cost)||0)) } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentPOList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0) * (parseFloat(i.cost)||0)), 0);
        const el = document.getElementById('po-grand-total');
        if(el) el.textContent = formatCurrency(total);
    }); 
}

export function renderAdjustmentListTable() {
    const table = document.getElementById('table-adjustment-list');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!state.currentAdjustmentList || state.currentAdjustmentList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_for_adjustment')}</td></tr>`;
        return;
    }
    const stock = calculateStockLevels();
    const branchCode = document.getElementById('adjustment-branch')?.value;
    
    state.currentAdjustmentList.forEach((item, index) => {
        const systemQty = (branchCode && stock[branchCode]?.[item.itemCode]?.quantity) || 0;
        const physicalCount = typeof item.physicalCount !== 'undefined' ? item.physicalCount : '';
        const adjustment = (parseFloat(physicalCount) || 0) - systemQty;
        item.physicalCount = physicalCount;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.itemCode}</td>
            <td>${item.itemName}</td>
            <td>${systemQty.toFixed(3)}</td>
            <td><input type="number" class="table-input" value="${physicalCount}" min="0" step="0.001" data-index="${index}" data-field="physicalCount"></td>
            <td style="font-weight: bold; color: ${adjustment > 0 ? 'var(--secondary-color)' : (adjustment < 0 ? 'var(--danger-color)' : 'inherit')}">${adjustment.toFixed(3)}</td>
            <td><button class="danger small" data-index="${index}">X</button></td>`;
        tbody.appendChild(tr);
    });
}

// --- MASTER DATA RENDERERS ---

export function renderItemsTable(data = state.items) {
    const table = document.getElementById('table-items');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${_t('no_items_found')}</td></tr>`; 
        return; 
    }
    
    data.forEach(item => {
        const isDisabled = item.isActive === false || String(item.isActive).toUpperCase() === 'FALSE';
        const tr = document.createElement('tr');
        if (isDisabled) tr.style.backgroundColor = '#f8d7da';
        
        const actions = `
            <div class="action-buttons">
                ${userCan('createItem') ? `<button class="secondary small btn-edit" data-type="item" data-id="${item.code}">${_t('edit')}</button>` : ''}
                <button class="secondary small btn-history" data-type="item" data-id="${item.code}">${_t('history')}</button>
                ${userCan('createItem') ? `<button class="${isDisabled ? 'success' : 'danger'} small btn-toggle-status" data-type="item" data-id="${item.code}" data-current="${isDisabled}">${isDisabled ? 'Enable' : 'Disable'}</button>` : ''}
            </div>`;
            
        tr.innerHTML = `<td>${item.code}</td><td>${item.name}</td><td>${_t(item.category ? 'cat_'+item.category.toLowerCase() : '') || item.category}</td><td>${item.ItemType || 'Main'}</td><td>${formatCurrency(item.cost)}</td><td>${isDisabled ? 'Disabled' : 'Active'}</td><td>${actions}</td>`;
        tbody.appendChild(tr);
    });
}

export function renderSuppliersTable(data = state.suppliers) {
    const table = document.getElementById('table-suppliers');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_suppliers_found')}</td></tr>`; 
        return; 
    }
    
    const financials = calculateSupplierFinancials();
    data.forEach(s => {
        const isDisabled = s.isActive === false || String(s.isActive).toUpperCase() === 'FALSE';
        const tr = document.createElement('tr');
        if (isDisabled) tr.style.backgroundColor = '#f8d7da';
        
        const actions = `
            <div class="action-buttons">
                ${userCan('createSupplier') ? `<button class="secondary small btn-edit" data-type="supplier" data-id="${s.supplierCode}">${_t('edit')}</button>` : ''}
                ${userCan('createSupplier') ? `<button class="${isDisabled ? 'success' : 'danger'} small btn-toggle-status" data-type="supplier" data-id="${s.supplierCode}" data-current="${isDisabled}">${isDisabled ? 'Enable' : 'Disable'}</button>` : ''}
            </div>`;
            
        tr.innerHTML = `<td>${s.supplierCode}</td><td>${s.name}</td><td>${s.contact}</td><td>${formatCurrency(financials[s.supplierCode]?.balance || 0)}</td><td>${isDisabled ? 'Disabled' : 'Active'}</td><td>${actions}</td>`;
        tbody.appendChild(tr);
    });
}

export function renderBranchesTable(data = state.branches) {
    const table = document.getElementById('table-branches');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">${_t('no_branches_found')}</td></tr>`; 
        return; 
    }
    
    data.forEach(b => {
        const isDisabled = b.isActive === false || String(b.isActive).toUpperCase() === 'FALSE';
        const tr = document.createElement('tr');
        if (isDisabled) tr.style.backgroundColor = '#f8d7da';
        
        const actions = `
            <div class="action-buttons">
                ${userCan('createBranch') ? `<button class="secondary small btn-edit" data-type="branch" data-id="${b.branchCode}">${_t('edit')}</button>` : ''}
                ${userCan('createBranch') ? `<button class="${isDisabled ? 'success' : 'danger'} small btn-toggle-status" data-type="branch" data-id="${b.branchCode}" data-current="${isDisabled}">${isDisabled ? 'Enable' : 'Disable'}</button>` : ''}
            </div>`;
            
        tr.innerHTML = `<td>${b.branchCode}</td><td>${b.branchName}</td><td>${isDisabled ? 'Disabled' : 'Active'}</td><td>${actions}</td>`;
        tbody.appendChild(tr);
    });
}

// --- REPORT & HISTORY RENDERERS ---

export function renderTransactionHistory(filters = {}) {
    const table = document.getElementById('table-transaction-history');
    if (!table) return; 
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    let allTx = [...state.transactions];
    let allPo = [...state.purchaseOrders];

    const currentUser = state.currentUser;
    const canViewAll = userCan('viewAllBranches'); 
    
    // Branch Restriction
    if (currentUser && !canViewAll) {
        const userBranch = String(currentUser.AssignedBranchCode).trim();
        if (userBranch && userBranch !== 'undefined') {
            allTx = allTx.filter(t => String(t.branchCode) === userBranch || String(t.fromBranchCode) === userBranch || String(t.toBranchCode) === userBranch);
            allPo = [];
            const branchFilterEl = document.getElementById('tx-filter-branch');
            if(branchFilterEl) branchFilterEl.style.display = 'none';
        }
    }
    
    let allHistoryItems = [ ...allTx, ...allPo.map(po => ({...po, type: 'po', batchId: po.poId, ref: po.poId})) ];
    const sDate = filters.startDate ? new Date(filters.startDate) : null;
    if(sDate) sDate.setHours(0,0,0,0);
    const eDate = filters.endDate ? new Date(filters.endDate) : null;
    if(eDate) eDate.setHours(23,59,59,999);

    // Apply Filters
    if (sDate) allHistoryItems = allHistoryItems.filter(t => new Date(t.date) >= sDate);
    if (eDate) allHistoryItems = allHistoryItems.filter(t => new Date(t.date) <= eDate);
    if (filters.type) allHistoryItems = allHistoryItems.filter(t => String(t.type) === String(filters.type));
    if (filters.branch) allHistoryItems = allHistoryItems.filter(t => String(t.branchCode) === String(filters.branch) || String(t.fromBranchCode) === String(filters.branch) || String(t.toBranchCode) === String(filters.branch));
    
    if (filters.searchTerm) {
        const lowerFilter = filters.searchTerm.toLowerCase();
        allHistoryItems = allHistoryItems.filter(t => {
            const item = findByKey(state.items, 'code', t.itemCode);
            return (t.ref && String(t.ref).toLowerCase().includes(lowerFilter)) || 
                   (t.batchId && String(t.batchId).toLowerCase().includes(lowerFilter)) || 
                   (t.invoiceNumber && String(t.invoiceNumber).toLowerCase().includes(lowerFilter)) || 
                   (item && item.name.toLowerCase().includes(lowerFilter));
        });
    }

    // Grouping
    const grouped = {};
    allHistoryItems.forEach(t => {
        if (!t.batchId) return;
        if (!grouped[t.batchId]) grouped[t.batchId] = { date: t.date, type: t.type, batchId: t.batchId, transactions: [] };
        grouped[t.batchId].transactions.push(t);
    });

    const sortedGroups = Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));

    if(sortedGroups.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No transactions found.</td></tr>`; 
        return; 
    }

    sortedGroups.forEach(group => {
        const first = group.transactions[0];
        let details = '', statusTag = '', refNum = first.ref || first.batchId;
        let typeDisplay = _t(first.type) || (first.type ? first.type.toUpperCase() : 'UNKNOWN');
        
        const isApproved = first.isApproved === true || String(first.isApproved).toUpperCase() === 'TRUE';
        const canEditInvoice = userCan('opEditInvoice') && first.type === 'receive' && !isApproved;
        
        let actionsHtml = `<button class="secondary small btn-view-tx" data-batch-id="${group.batchId}" data-type="${first.type}">${_t('view_print')}</button>`;
        if(canEditInvoice) actionsHtml += `<button class="secondary small btn-edit-invoice" data-batch-id="${group.batchId}">${_t('edit')}</button>`;

        if(first.type === 'receive') {
            details = `Received from <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`;
            refNum = first.invoiceNumber;
            statusTag = isApproved ? `<span class="status-tag status-approved">${_t('status_approved')}</span>` : `<span class="status-tag status-pendingapproval">${_t('status_pending')}</span>`;
        } else if (first.type === 'transfer_out' || first.type === 'transfer_in') {
            details = `To: ${findByKey(state.branches, 'branchCode', first.toBranchCode)?.branchName}`;
            statusTag = `<span class="status-tag status-${(first.Status || '').toLowerCase().replace(/ /g,'')}">${_t('status_' + (first.Status || '').toLowerCase().replace(/ /g,''))}</span>`;
        } else if (first.type && first.type.includes('production')) {
            typeDisplay = _t('process_production');
            details = `Butchery Yield at <strong>${findByKey(state.branches, 'branchCode', first.branchCode)?.branchName}</strong>`;
            statusTag = `<span class="status-tag status-completed">Completed</span>`;
        } else if (first.type === 'po') {
            details = `PO for <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name}</strong>`;
            statusTag = `<span class="status-tag status-${(first.Status || 'pending').toLowerCase().replace(/ /g,'')}">${first.Status}</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formatDate(first.date)}</td><td>${typeDisplay}</td><td>${refNum}</td><td>${details}</td><td>${statusTag}</td><td><div class="action-buttons">${actionsHtml}</div></td>`;
        tbody.appendChild(tr);
    });
}

export function renderPendingPOs() {
    const table = document.getElementById('table-pending-pos');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    const pendingPOs = (state.purchaseOrders || []).filter(po => po.Status === 'Pending Approval');
    
    if (pendingPOs.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${_t('no_pending_financial_approval')}</td></tr>`; 
        return; 
    }
    
    pendingPOs.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(item => {
        let actionButtons = userCan('opApprovePO') 
            ? `<div class="action-buttons"><button class="primary small btn-approve-financial" data-id="${item.poId}" data-type="po">${_t('approve')}</button><button class="danger small btn-reject-financial" data-id="${item.poId}" data-type="po">${_t('reject')}</button></div>` 
            : `<span style="color:var(--text-light-color); font-style:italic;">${_t('status_pending')}</span>`;
            
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formatDate(item.date)}</td><td>${item.poId}</td><td>PO for ${findByKey(state.suppliers, 'supplierCode', item.supplierCode)?.name || item.supplierCode}</td><td>${formatCurrency(item.totalValue)}</td><td>${actionButtons}</td>`;
        tbody.appendChild(tr);
    });
}

export function renderPendingInvoices() {
    const table = document.getElementById('table-pending-invoices');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    const user = state.currentUser;
    const isAdmin = userCan('viewAllBranches');
    const pendingReceivesGroups = {};
    
    (state.transactions || []).filter(t => t.type === 'receive' && !(t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE')).forEach(t => {
        if (!pendingReceivesGroups[t.batchId]) {
            pendingReceivesGroups[t.batchId] = { 
                date: t.date, 
                txType: 'receive', 
                ref: t.invoiceNumber, 
                batchId: t.batchId, 
                branchCode: t.branchCode, 
                details: `GRN from ${findByKey(state.suppliers, 'supplierCode', t.supplierCode)?.name || 'N/A'}`, 
                totalValue: 0 
            };
        }
        pendingReceivesGroups[t.batchId].totalValue += (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0);
    });
    
    let allPendingGRNs = Object.values(pendingReceivesGroups);
    if (user && user.AssignedBranchCode && !isAdmin) {
        allPendingGRNs = allPendingGRNs.filter(g => g.branchCode === user.AssignedBranchCode);
    }
    
    if (allPendingGRNs.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${_t('no_pending_financial_approval')}</td></tr>`; 
        return; 
    }
    
    allPendingGRNs.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(item => {
        let actionButtons = userCan('opApproveGRN') 
            ? `<div class="action-buttons"><button class="primary small btn-approve-financial" data-id="${item.batchId}" data-type="receive">${_t('approve')}</button><button class="danger small btn-reject-financial" data-id="${item.batchId}" data-type="receive">${_t('reject')}</button></div>` 
            : `<span style="color:var(--text-light-color); font-style:italic;">${_t('status_pending')}</span>`;
            
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formatDate(item.date)}</td><td>${item.ref}</td><td>${item.details}</td><td>${formatCurrency(item.totalValue)}</td><td>${actionButtons}</td>`;
        tbody.appendChild(tr);
    });
}

// --- MODAL CONTENT RENDERER ---

export function renderEditModalContent(type, id) {
    const editModalBody = document.getElementById('edit-modal-body');
    const editModalTitle = document.getElementById('edit-modal-title');
    const editForm = document.getElementById('form-edit-record');
    
    editForm.dataset.type = type;
    editForm.dataset.id = id || '';
    
    let record = {};
    let formHtml;
    const safeGet = (obj, k) => obj && obj[k] ? obj[k] : '';

    if (type === 'item') {
        if (id) record = findByKey(state.items, 'code', id) || {};
        editModalTitle.textContent = id ? _t('edit_item') : _t('add_new_item');
        
        const categories = ['Beef', 'Lamb', 'Poultry', 'Seafood', 'Offal', 'Processed', 'Consumables'].map(c => `<option value="${c}" ${safeGet(record, 'category') === c ? 'selected' : ''}>${_t('cat_'+c.toLowerCase())}</option>`).join('');
        const units = ['KG', 'PCS', 'BOX', 'PACK', 'LTR'].map(u => `<option value="${u}" ${safeGet(record, 'unit') === u ? 'selected' : ''}>${u}</option>`).join('');
        const isCut = safeGet(record, 'ItemType') === 'Cut';
        const parentOptions = state.items.filter(i => i.ItemType === 'Main').map(p => `<option value="${p.code}" ${p.code === record.ParentCode ? 'selected' : ''}>${p.name}</option>`).join('');
        
        let cutsSection = '';
        if (safeGet(record, 'ItemType') === 'Main') {
            const linked = (safeGet(record, 'DefinedCuts') || '').split(',').map(s => s.trim());
            cutsSection = `<div class="form-group span-full"><label>Linked Cuts</label><div style="max-height:100px;overflow-y:auto;border:1px solid #ccc;padding:5px;">${state.items.filter(i => i.ItemType === 'Cut').map(cut => `<div style="padding:2px;"><input type="checkbox" name="DefinedCuts" value="${cut.code}" ${linked.includes(cut.code) ? 'checked' : ''} id="lnk-${cut.code}"> <label for="lnk-${cut.code}">${cut.name}</label></div>`).join('')}</div></div>`;
        }
        
        formHtml = `<div class="form-grid"><div class="form-group"><label>${_t('item_type')}</label><select name="ItemType" ${id ? 'disabled' : ''} id="edit-item-type-select"><option value="Main" ${safeGet(record, 'ItemType') === 'Main' ? 'selected' : ''}>Main (Parent)</option><option value="Cut" ${safeGet(record, 'ItemType') === 'Cut' ? 'selected' : ''}>Cut (Child)</option></select>${id ? `<input type="hidden" name="ItemType" value="${safeGet(record, 'ItemType')}">` : ''}</div><div class="form-group" id="group-edit-item-parent" style="display:${isCut ? 'block' : 'none'};"><label>Parent Item (For Yield)</label><select name="ParentCode">${parentOptions}</select></div><div class="form-group"><label>${_t('item_code')}</label><div style="display:flex; gap:5px;"><input type="text" name="code" id="edit-item-code" value="${safeGet(record, 'code')}" ${id ? 'readonly' : ''}>${!id ? `<button type="button" class="secondary small" id="btn-modal-gen-code">Auto</button>` : ''}</div></div><div class="form-group"><label>${_t('barcode')}</label><input type="text" name="barcode" value="${safeGet(record, 'barcode')}"></div><div class="form-group"><label>${_t('item_name')}</label><input type="text" name="name" value="${safeGet(record, 'name')}" required></div><div class="form-group"><label>${_t('unit')}</label><select name="unit" required>${units}</select></div><div class="form-group"><label>${_t('category')}</label><select name="category" required>${categories}</select></div><div class="form-group"><label>${_t('default_supplier')}</label><select id="edit-item-supplier" name="supplierCode"></select></div><div class="form-group span-full"><label>${_t('default_cost')}</label><input type="number" name="cost" step="0.01" min="0" value="${safeGet(record, 'cost')}" required></div>${cutsSection}</div>`;
        editModalBody.innerHTML = formHtml;
        populateOptions(document.getElementById('edit-item-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
        if(record.supplierCode) document.getElementById('edit-item-supplier').value = record.supplierCode;
    } 
    else if (type === 'supplier') {
        if (id) record = findByKey(state.suppliers, 'supplierCode', id) || {};
        editModalTitle.textContent = id ? _t('edit_supplier') : _t('add_new_supplier');
        formHtml = `<div class="form-grid"><div class="form-group"><label>${_t('supplier_code')}</label><div style="display:flex; gap:5px;"><input type="text" name="supplierCode" id="edit-supplier-code" value="${safeGet(record, 'supplierCode')}" ${id ? 'readonly' : ''}>${!id ? `<button type="button" class="secondary small" id="btn-modal-gen-supplier">Auto</button>` : ''}</div></div><div class="form-group"><label>${_t('supplier_name')}</label><input type="text" name="name" value="${safeGet(record, 'name')}" required></div><div class="form-group"><label>${_t('contact_info')}</label><input type="text" name="contact" value="${safeGet(record, 'contact')}"></div></div>`;
        editModalBody.innerHTML = formHtml;
    } 
    else if (type === 'branch') {
        if (id) record = findByKey(state.branches, 'branchCode', id) || {};
        editModalTitle.textContent = id ? _t('edit_branch') : _t('add_new_branch');
        formHtml = `<div class="form-grid"><div class="form-group"><label>${_t('branch_code')}</label><input type="text" name="branchCode" value="${safeGet(record, 'branchCode')}" ${id ? 'readonly' : ''}></div><div class="form-group"><label>${_t('branch_name')}</label><input type="text" name="branchName" value="${safeGet(record, 'branchName')}" required></div></div>`;
        editModalBody.innerHTML = formHtml;
    } 
    else if (type === 'user') {
        if (id) record = findByKey(state.allUsers, 'Username', id) || {};
        editModalTitle.textContent = id ? _t('edit_user') : _t('add_new_user_title');
        const roles = (state.allRoles || []).map(r => `<option value="${r.RoleName}" ${r.RoleName === safeGet(record, 'RoleName') ? 'selected' : ''}>${r.RoleName}</option>`).join('');
        const branches = (state.branches || []).map(b => `<option value="${b.branchCode}" ${record.AssignedBranchCode === b.branchCode ? 'selected' : ''}>${b.branchName}</option>`).join('');
        formHtml = `<div class="form-grid"><div class="form-group"><label>${_t('username')}</label><input type="text" name="Username" value="${safeGet(record, 'Username')}" ${id ? 'readonly' : 'required'}></div><div class="form-group"><label>${_t('table_h_fullname')}</label><input type="text" name="Name" value="${safeGet(record, 'Name')}" required></div><div class="form-group"><label>${_t('table_h_role')}</label><select name="RoleName" required><option value="">Select Role</option>${roles}</select></div><div class="form-group"><label>Assigned Branch</label><select name="AssignedBranchCode"><option value="">None (HQ/Admin)</option>${branches}</select></div><div class="form-group span-full"><label>${_t('edit_user_password_label')}</label><input type="password" name="LoginCode" ${!id ? 'required' : ''}></div><div class="form-group-checkbox span-full"><input type="checkbox" name="isDisabled" id="user-disabled-check" ${record.isDisabled ? 'checked' : ''}><label for="user-disabled-check">Disable Account</label></div></div>`;
        editModalBody.innerHTML = formHtml;
    } 
    else if (type === 'role') {
        editModalTitle.textContent = 'Add New Role';
        formHtml = `<div class="form-grid"><div class="form-group span-full"><label>${_t('table_h_rolename')}</label><input type="text" name="RoleName" required placeholder="e.g., Accountant"></div><p style="grid-column: 1/-1; color: #666; font-size: 0.9em;">Note: After adding a role, use the 'Permissions' button to configure access rights.</p></div>`;
        editModalBody.innerHTML = formHtml;
    } 
    else if (type === 'role-permissions') {
        const roleData = findByKey(state.allRoles, 'RoleName', id);
        editModalTitle.textContent = _t('edit_permissions_for').replace('{roleName}', id);
        let permsHtml = '';
        for (const [group, perms] of Object.entries(PERMISSION_GROUPS)) {
            permsHtml += `<div class="permission-category">${group}</div><div class="permissions-grid">`;
            perms.forEach(perm => permsHtml += `<div class="form-group-checkbox"><input type="checkbox" name="${perm.key}" id="perm-${perm.key}" ${roleData && (roleData[perm.key] === true || String(roleData[perm.key]).toUpperCase() === 'TRUE') ? 'checked' : ''}><label for="perm-${perm.key}">${perm.label}</label></div>`);
            permsHtml += `</div>`;
        }
        formHtml = `<input type="hidden" name="RoleName" value="${id}"><div style="padding-bottom:10px;">${permsHtml}</div>`;
        editModalBody.innerHTML = formHtml;
    } 
    else if (type === 'invoice_header') {
        const txs = state.transactions.filter(t => t.batchId === id);
        if (!txs.length) { editModalBody.innerHTML = '<p>Error: Transaction not found.</p>'; return; }
        const header = txs[0];
        editModalTitle.textContent = `Edit Invoice Header (${id})`;
        formHtml = `<div class="form-grid"><div class="form-group"><label>Invoice Number</label><input type="text" name="invoiceNumber" value="${header.invoiceNumber || ''}" required></div><div class="form-group"><label>Supplier</label><select name="supplierCode">${state.suppliers.map(s => `<option value="${s.supplierCode}" ${s.supplierCode === header.supplierCode ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div><div class="form-group span-full"><label>Notes</label><textarea name="notes" rows="3">${header.notes || ''}</textarea></div><div class="form-group span-full" style="color:orange; font-size:0.9em;">Warning: Changing the supplier here will update it for all items in this invoice.</div></div>`;
        editModalBody.innerHTML = formHtml;
    }
}

export function renderItemsInModal(filter = '') {
    const listEl = document.getElementById('modal-item-list');
    const modal = document.getElementById('item-selector-modal');
    if(!listEl) return;
    listEl.innerHTML = '';
    const lowerFilter = filter.toLowerCase();
    const allowedCodes = modal.dataset.allowedItems && modal.dataset.allowedItems !== "undefined" ? JSON.parse(modal.dataset.allowedItems) : null;

    state.items.filter(item => {
        if(String(item.isActive) === 'false') return false;
        const matchesText = item.name.toLowerCase().includes(lowerFilter) || item.code.toLowerCase().includes(lowerFilter);
        const matchesContext = !allowedCodes || allowedCodes.includes(item.code);
        return matchesText && matchesContext;
    }).forEach(item => {
        listEl.innerHTML += `<div class="modal-item"><input type="checkbox" id="modal-item-${item.code}" data-code="${item.code}" ${state.modalSelections.has(item.code) ? 'checked' : ''}><label for="modal-item-${item.code}"><strong>${item.name}</strong><br><small style="color:var(--text-light-color)">${item.code}</small></label></div>`;
    });
}

export function renderHistoryModal(itemId) {
    const item = findByKey(state.items, 'code', itemId);
    if (!item) return;
    document.getElementById('history-modal-title').textContent = `${_t('item_history_modal_title')}: ${item.name}`;
    
    const priceHistory = (state.priceHistory || []).filter(ph => ph.ItemCode === itemId);
    let priceHtml = '<table style="width:100%"><thead><tr><th>Date</th><th>Old Cost</th><th>New Cost</th><th>User</th><th>Source</th></tr></thead><tbody>';
    if(priceHistory.length === 0) priceHtml += '<tr><td colspan="5" style="text-align:center">No price history found.</td></tr>';
    else priceHistory.slice().reverse().forEach(ph => priceHtml += `<tr><td>${formatDate(ph.Timestamp)}</td><td>${formatCurrency(ph.OldCost)}</td><td>${formatCurrency(ph.NewCost)}</td><td>${ph.UpdatedBy || '-'}</td><td>${ph.Source || '-'}</td></tr>`);
    document.getElementById('subview-price-history').innerHTML = priceHtml + '</tbody></table>';

    const movements = state.transactions.filter(t => t.itemCode === itemId);
    let moveHtml = '<table style="width:100%"><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Qty</th><th>Branch</th></tr></thead><tbody>';
    if(movements.length === 0) moveHtml += '<tr><td colspan="5" style="text-align:center">No movement history found.</td></tr>';
    else movements.slice().reverse().forEach(mv => moveHtml += `<tr><td>${formatDate(mv.date)}</td><td>${mv.type}</td><td>${mv.batchId}</td><td>${parseFloat(mv.quantity).toFixed(3)}</td><td>${findByKey(state.branches, 'branchCode', mv.branchCode || mv.fromBranchCode || mv.toBranchCode)?.branchName || mv.branchCode}</td></tr>`);
    document.getElementById('movement-history-table-container').innerHTML = moveHtml + '</tbody></table>';
}

export function renderItemCentricStockView() {
    const container = document.getElementById('item-centric-stock-container');
    if (!container) return;
    const stock = calculateStockLevels();
    let branches = state.branches;
    
    if (!userCan('viewAllBranches')) {
        const u = state.currentUser.AssignedBranchCode;
        if(u) branches = branches.filter(b => b.branchCode === u); 
        else { container.innerHTML = '<p>No branch assigned.</p>'; return; }
    }
    
    let html = '<table id="table-stock-levels"><thead><tr><th>Code</th><th>Item</th>' + branches.map(b => `<th>${b.branchName}</th>`).join('') + '<th>Total Value</th></tr></thead><tbody>';
    state.items.forEach(item => {
        let rowTotalVal = 0;
        let rowHtml = `<tr><td>${item.code}</td><td>${item.name}</td>` + branches.map(b => {
            const qty = stock[b.branchCode]?.[item.code]?.quantity || 0;
            rowTotalVal += qty * (stock[b.branchCode]?.[item.code]?.avgCost || 0);
            return `<td>${qty.toFixed(3)}</td>`;
        }).join('') + `<td><strong>${formatCurrency(rowTotalVal)}</strong></td></tr>`;
        html += rowHtml;
    });
    container.innerHTML = html + '</tbody></table>';
}

export function renderInvoicesInModal() {
    const listEl = document.getElementById('modal-invoice-list');
    const supplierCode = document.getElementById('payment-supplier-select')?.value;
    if (!listEl) return;
    listEl.innerHTML = '';
    
    if (!supplierCode) { listEl.innerHTML = '<p style="padding:10px">Please select a supplier first.</p>'; return; }
    
    const invoices = calculateSupplierFinancials()[supplierCode]?.invoices || {};
    const unpaid = Object.values(invoices).filter(i => i.status !== 'Paid');
    
    if (unpaid.length === 0) { listEl.innerHTML = '<p style="padding:10px">No unpaid invoices found for this supplier.</p>'; return; }
    
    unpaid.forEach(inv => listEl.innerHTML += `<div class="modal-item"><input type="checkbox" id="inv-${inv.number}" data-number="${inv.number}" ${state.invoiceModalSelections.has(inv.number) ? 'checked' : ''}><label for="inv-${inv.number}"><strong>Invoice #${inv.number}</strong><br><small>Date: ${formatDate(inv.date)} | Due: ${formatCurrency(inv.balance)}</small></label></div>`);
}

export function renderPaymentList() {
    const container = document.getElementById('payment-invoice-list-container');
    const table = document.getElementById('table-payment-list');
    if (!container || !table) return;
    
    const tbody = table.querySelector('tbody');
    const supplierCode = document.getElementById('payment-supplier-select')?.value;
    tbody.innerHTML = '';
    
    if (!supplierCode || state.invoiceModalSelections.size === 0) { container.style.display = 'none'; return; }
    
    const invoices = calculateSupplierFinancials()[supplierCode]?.invoices || {};
    let total = 0;
    
    state.invoiceModalSelections.forEach(invNum => {
        const inv = invoices[invNum];
        if (inv) {
            total += inv.balance;
            tbody.innerHTML += `<tr><td>${inv.number}</td><td>${formatCurrency(inv.balance)}</td><td><input type="number" class="table-input payment-amount-input" data-invoice="${inv.number}" value="${inv.balance.toFixed(2)}" max="${inv.balance.toFixed(2)}"></td></tr>`;
        }
    });
    document.getElementById('payment-total-amount').textContent = formatCurrency(total);
    container.style.display = 'block';
}

export function renderSupplierStatement(code, d1, d2) {
    const container = document.getElementById('supplier-statement-results');
    if (!container) return;
    
    const supplier = findByKey(state.suppliers, 'supplierCode', code);
    if (!supplier) return;
    
    const data = calculateSupplierFinancials()[code];
    const sDate = d1 ? new Date(d1) : null;
    const eDate = d2 ? new Date(d2) : null;
    if(eDate) eDate.setHours(23, 59, 59);

    let runningBalance = 0, tableHtml = '', openingBalance = 0;
    if (sDate) {
        data.events.forEach(e => { if (new Date(e.date) < sDate) openingBalance += (e.debit - e.credit); });
        runningBalance = openingBalance;
        tableHtml += `<tr style="background:#eee; font-weight:bold;"><td colspan="3">Opening Balance</td><td>-</td><td>-</td><td>${formatCurrency(openingBalance)}</td><td></td></tr>`;
    }

    data.events.forEach(e => {
        const d = new Date(e.date);
        if ((!sDate || d >= sDate) && (!eDate || d <= eDate)) {
            runningBalance += (e.debit - e.credit);
            tableHtml += `<tr><td>${formatDate(e.date)}</td><td>${e.type}</td><td>${e.ref}</td><td>${e.debit > 0 ? formatCurrency(e.debit) : '-'}</td><td>${e.credit > 0 ? formatCurrency(e.credit) : '-'}</td><td style="font-weight:bold;">${formatCurrency(runningBalance)}</td><td>${e.type === 'Pay' && e.ref ? `<button class="secondary small btn-print-voucher" data-id="${e.ref}" style="margin-left:10px; padding:4px 8px;">Print</button>` : ''}</td></tr>`;
        }
    });

    tableHtml += `<tr style="background-color:#e9ecef; font-weight:bold; font-size:1.1em;"><td colspan="5" style="text-align:right;">Closing Balance:</td><td colspan="2" style="color:${runningBalance > 0 ? '#d32f2f' : 'green'}">${formatCurrency(runningBalance)}</td></tr>`;
    container.innerHTML = `<div class="printable-document"><h3>Statement: ${supplier.name}</h3><table id="table-supplier-statement"><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Action</th></tr></thead><tbody>${tableHtml}</tbody></table><div style="margin-top: 20px; text-align: right; display:flex; justify-content:flex-end; gap:10px;"><button class="secondary" id="btn-export-statement">Export to Excel</button><button class="primary btn-pay-supplier" data-supplier="${supplier.supplierCode}">Pay This Supplier</button></div></div>`;
    container.style.display = 'block';
}

export function renderPurchaseOrdersViewer() {
    const table = document.getElementById('table-po-viewer');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    (state.purchaseOrders || []).slice().reverse().forEach(po => {
        tbody.innerHTML += `<tr><td>${po.poId}</td><td>${formatDate(po.date)}</td><td>${findByKey(state.suppliers, 'supplierCode', po.supplierCode)?.name || po.supplierCode}</td><td>${state.purchaseOrderItems.filter(i => i.poId === po.poId).length}</td><td>${formatCurrency(po.totalValue)}</td><td>${po.Status}</td><td><button class="secondary small btn-view-tx" data-batch-id="${po.poId}" data-type="po">View</button></td></tr>`;
    });
}

export function renderActivityLog() {
    const table = document.getElementById('table-activity-log');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    if (!state.activityLog || state.activityLog.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No activity logged.</td></tr>`; return; }
    state.activityLog.slice().reverse().forEach(log => { tbody.innerHTML += `<tr><td>${new Date(log.Timestamp).toLocaleString()}</td><td>${log.User || 'N/A'}</td><td>${log.Action}</td><td>${log.Description}</td></tr>`; });
}

export function renderPendingTransfers() {
    const container = document.getElementById('pending-transfers-card'); if (!container) return;
    const tbody = document.getElementById('table-pending-transfers')?.querySelector('tbody'); if (!tbody) return; tbody.innerHTML = '';
    
    const uBranch = state.currentUser?.AssignedBranchCode;
    const isAdmin = userCan('viewAllBranches');
    const groups = {};
    
    state.transactions.forEach(t => {
        if (t.type === 'transfer_out' && t.Status === 'In Transit') {
            if (isAdmin || t.toBranchCode === uBranch) {
                if (!groups[t.batchId]) groups[t.batchId] = { ...t, items: [] };
                groups[t.batchId].items.push(t);
            }
        }
    });
    
    const list = Object.values(groups);
    if (!list.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    
    list.forEach(t => {
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>Incoming from ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || t.fromBranchCode}</td><td>${t.ref}</td><td>${t.items.length}</td><td>${userCan('opReceive') ? `<button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">Receive</button>` : 'Pending Receipt'}</td></tr>`;
    });
}

export function renderInTransitReport() {
    const tbody = document.getElementById('table-in-transit')?.querySelector('tbody'); if (!tbody) return; tbody.innerHTML = '';
    const groups = {};
    
    (state.transactions || []).filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => { 
        if (!groups[t.batchId]) groups[t.batchId] = { ...t, items: [] }; 
        groups[t.batchId].items.push(t); 
    });
    
    const sorted = Object.values(groups).sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if(sorted.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No items currently in transit.</td></tr>`; return; }
    
    sorted.forEach(t => {
        const myBranch = state.currentUser?.AssignedBranchCode;
        const isAdmin = userCan('viewAllBranches');
        
        let action = `<span class="status-tag status-intransit">In Transit</span>`;
        if (t.toBranchCode === myBranch && userCan('opReceive')) action = `<button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">Receive Stock</button>`;
        else if ((t.fromBranchCode === myBranch || isAdmin) && userCan('opTransfer')) action = `<button class="danger small btn-cancel-transfer" data-batch-id="${t.batchId}">Cancel Transfer</button>`;
        
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || 'N/A'}</td><td>${findByKey(state.branches, 'branchCode', t.toBranchCode)?.branchName || 'N/A'}</td><td>${t.ref}</td><td>${t.items.length}</td><td>${t.Status}</td><td>${action}</td></tr>`;
    });
}

export function updateNotifications() {
    const widget = document.getElementById('pending-requests-widget');
    if (!widget || !state.currentUser) return;
    
    const myBranch = state.currentUser.AssignedBranchCode;
    const isAdmin = userCan('viewAllBranches');
    const incoming = new Set();
    
    state.transactions.forEach(t => { 
        if (t.type === 'transfer_out' && t.Status === 'In Transit' && (isAdmin || t.toBranchCode === myBranch)) incoming.add(t.batchId); 
    });
    
    const count = incoming.size;
    if (count > 0) {
        widget.style.display = 'flex';
        document.getElementById('pending-requests-count').textContent = count;
        document.getElementById('pending-requests-widget-text').textContent = "Incoming Transfers";
        widget.style.backgroundColor = '#E65100';
    } else { widget.style.display = 'none'; }
}

export function renderUserManagementUI() {
    const tbody = document.getElementById('table-users')?.querySelector('tbody'); if (!tbody) return; tbody.innerHTML = '';
    
    if (!state.allUsers || state.allUsers.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>'; } 
    else { 
        state.allUsers.forEach(u => { 
            tbody.innerHTML += `<tr><td>${u.Username}</td><td>${u.Name}</td><td>${u.RoleName}</td><td>${findByKey(state.branches, 'branchCode', u.AssignedBranchCode)?.branchName || 'N/A'}</td><td>${u.isDisabled ? 'Disabled' : 'Active'}</td><td><button class="secondary small btn-edit" data-type="user" data-id="${u.Username}">${_t('edit')}</button></td></tr>`; 
        }); 
    }
    renderRolesTable();
}

export function renderRolesTable() {
    const tbody = document.getElementById('table-roles')?.querySelector('tbody'); if (!tbody) return; tbody.innerHTML = '';
    if (!state.allRoles || state.allRoles.length === 0) { tbody.innerHTML = '<tr><td colspan="2">No roles found.</td></tr>'; return; }
    state.allRoles.forEach(r => { 
        tbody.innerHTML += `<tr><td>${r.RoleName}</td><td><div class="action-buttons"><button class="secondary small btn-edit-role-perms" data-role="${r.RoleName}">Permissions</button><button class="danger small btn-delete-role" data-role="${r.RoleName}">Delete</button></div></td></tr>`; 
    });
}
