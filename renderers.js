import { state } from './state.js';
import { _t, findByKey, userCan, populateOptions, formatCurrency, formatDate, Logger, printContent } from './utils.js';
import { calculateStockLevels, calculateSupplierFinancials } from './calculations.js';
import * as Documents from './documents.js';
import { generateButcheryReport } from './documents.js';

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
        { key: 'opManagePriceLists', label: 'Manage Selling Prices' },
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
                case 'text': 
                    content = item[col.key] || ''; 
                    break;
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
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => formatCurrency((parseFloat(item.quantity)||0) * (parseFloat(item.cost)||0)) } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentReceiveList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0) * (parseFloat(i.cost)||0)), 0);
        const el = document.getElementById('receive-grand-total');
        if(el) el.textContent = formatCurrency(total);
    }); 
}



export function renderTransferListTable() { 
    renderDynamicListTable('table-transfer-list', state.currentTransferList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity' } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentTransferList.reduce((acc, i) => acc + (parseFloat(i.quantity)||0), 0);
        const el = document.getElementById('transfer-grand-total');
        if(el) el.textContent = total.toFixed(3);
    }); 
}

export function renderReturnListTable() { 
    renderDynamicListTable('table-return-list', state.currentReturnList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentReturnList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0) * (parseFloat(i.cost)||0)), 0);
        const el = document.getElementById('return-grand-total');
        if(el) el.textContent = formatCurrency(total);
    }); 
}

export function renderPOListTable() { 
    renderDynamicListTable('table-po-list', state.currentPOList, [ 
        { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => formatCurrency((parseFloat(item.quantity)||0) * (parseFloat(item.cost)||0)) } 
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
            <td><button class="danger small" data-index="${index}">X</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- MASTER DATA RENDERERS ---

export function renderItemsTable(data = state.items) {
    const table = document.getElementById('table-items');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${_t('no_items_found')}</td></tr>`;
        return;
    }
    
    data.forEach(item => {
        const isDisabled = item.isActive === false || String(item.isActive).toUpperCase() === 'FALSE';
        const tr = document.createElement('tr');
        if (isDisabled) tr.style.backgroundColor = '#f8d7da';
        
        const toggleBtnText = isDisabled ? 'Enable' : 'Disable';
        const toggleBtnClass = isDisabled ? 'success' : 'danger';

        tr.innerHTML = `
            <td>${item.code}</td>
            <td>${item.name}</td>
            <td>${_t(item.category ? 'cat_'+item.category.toLowerCase() : '') || item.category}</td>
            <td>${item.ItemType || 'Main'}</td>
            <td>${formatCurrency(item.cost)}</td>
            <td>${isDisabled ? 'Disabled' : 'Active'}</td>
            <td>
                <div class="action-buttons">
                    ${userCan('createItem') ? `<button class="secondary small btn-edit" data-type="item" data-id="${item.code}">${_t('edit')}</button>` : ''}
                    <button class="secondary small btn-history" data-type="item" data-id="${item.code}">${_t('history')}</button>
                    ${userCan('createItem') ? `<button class="${toggleBtnClass} small btn-toggle-status" data-type="item" data-id="${item.code}" data-current="${isDisabled}">${toggleBtnText}</button>` : ''}
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

export function renderSuppliersTable(data = state.suppliers) {
    const table = document.getElementById('table-suppliers');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_suppliers_found')}</td></tr>`;
        return;
    }
    
    const financials = calculateSupplierFinancials();
    
    data.forEach(supplier => {
        const isDisabled = supplier.isActive === false || String(supplier.isActive).toUpperCase() === 'FALSE';
        const balance = financials[supplier.supplierCode]?.balance || 0;
        const tr = document.createElement('tr');
        if (isDisabled) tr.style.backgroundColor = '#f8d7da';
        
        const toggleBtnText = isDisabled ? 'Enable' : 'Disable';
        const toggleBtnClass = isDisabled ? 'success' : 'danger';

        tr.innerHTML = `
            <td>${supplier.supplierCode || ''}</td>
            <td>${supplier.name}</td>
            <td>${supplier.contact}</td>
            <td>${formatCurrency(balance)}</td>
            <td>${isDisabled ? 'Disabled' : 'Active'}</td>
            <td>
                <div class="action-buttons">
                    ${userCan('createSupplier') ? `<button class="secondary small btn-edit" data-type="supplier" data-id="${supplier.supplierCode}">${_t('edit')}</button>` : ''}
                    ${userCan('createSupplier') ? `<button class="${toggleBtnClass} small btn-toggle-status" data-type="supplier" data-id="${supplier.supplierCode}" data-current="${isDisabled}">${toggleBtnText}</button>` : ''}
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

export function renderBranchesTable(data = state.branches) {
    const table = document.getElementById('table-branches');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">${_t('no_branches_found')}</td></tr>`;
        return;
    }
    
    data.forEach(branch => {
        const isDisabled = branch.isActive === false || String(branch.isActive).toUpperCase() === 'FALSE';
        const tr = document.createElement('tr');
        if (isDisabled) tr.style.backgroundColor = '#f8d7da';

        const toggleBtnText = isDisabled ? 'Enable' : 'Disable';
        const toggleBtnClass = isDisabled ? 'success' : 'danger';

        tr.innerHTML = `
            <td>${branch.branchCode || ''}</td>
            <td>${branch.branchName}</td>
            <td>${isDisabled ? 'Disabled' : 'Active'}</td>
            <td>
                <div class="action-buttons">
                    ${userCan('createBranch') ? `<button class="secondary small btn-edit" data-type="branch" data-id="${branch.branchCode}">${_t('edit')}</button>` : ''}
                    ${userCan('createBranch') ? `<button class="${toggleBtnClass} small btn-toggle-status" data-type="branch" data-id="${branch.branchCode}" data-current="${isDisabled}">${toggleBtnText}</button>` : ''}
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}



// --- REPORT & HISTORY RENDERERS ---

export function renderTransactionHistory(filters = {}) {
    const table = document.getElementById('table-transaction-history');
    if (!table) return; 
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let allTx = [...state.transactions];
    let allPo = [...state.purchaseOrders];

    // Branch Restriction Logic
    const currentUser = state.currentUser;
    const canViewAll = userCan('viewAllBranches'); 
     if (filters.searchTerm) {
        const lowerFilter = filters.searchTerm.toLowerCase();
        allHistoryItems = allHistoryItems.filter(t => {
            // FIX: Safe navigation for item
            const item = findByKey(state.items, 'code', t.itemCode);
            const itemName = item ? item.name.toLowerCase() : ''; // Handle missing items
            
            return (t.ref && String(t.ref).toLowerCase().includes(lowerFilter)) ||
                   (t.batchId && String(t.batchId).toLowerCase().includes(lowerFilter)) ||
                   (t.invoiceNumber && String(t.invoiceNumber).toLowerCase().includes(lowerFilter)) ||
                   itemName.includes(lowerFilter);
        });
    }
    
    if (currentUser && !canViewAll) {
        const userBranch = String(currentUser.AssignedBranchCode).trim();
        if (userBranch && userBranch !== 'undefined' && userBranch !== '') {
            allTx = allTx.filter(t => 
                String(t.branchCode) === userBranch || 
                String(t.fromBranchCode) === userBranch || 
                String(t.toBranchCode) === userBranch
            );
            allPo = []; // Hide POs for branch users
            const branchFilterEl = document.getElementById('tx-filter-branch');
            if(branchFilterEl) branchFilterEl.style.display = 'none';
        }
    }
    
    let allHistoryItems = [ 
        ...allTx, 
        ...allPo.map(po => ({...po, type: 'po', batchId: po.poId, ref: po.poId})) 
    ];

    // Filter Logic
    const sDate = filters.startDate ? new Date(filters.startDate) : null;
    if(sDate) sDate.setHours(0,0,0,0);
    const eDate = filters.endDate ? new Date(filters.endDate) : null;
    if(eDate) eDate.setHours(23,59,59,999);

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
        const key = t.batchId;
        if (!key) return;
        if (!grouped[key]) grouped[key] = { date: t.date, type: t.type, batchId: key, transactions: [] };
        grouped[key].transactions.push(t);
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
        
        // FIX: Explicitly checking isApproved for edit permission
        const isApproved = first.isApproved === true || String(first.isApproved).toUpperCase() === 'TRUE';
        const canEditInvoice = userCan('opEditInvoice') && first.type === 'receive' && !isApproved;
        
        let actionsHtml = `<button class="secondary small btn-view-tx" data-batch-id="${group.batchId}" data-type="${first.type}">${_t('view_print')}</button>`;
        
        if(canEditInvoice){
            actionsHtml += `<button class="secondary small btn-edit-invoice" data-batch-id="${group.batchId}">${_t('edit')}</button>`;
        }

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

// --- NEW SEPARATED APPROVAL RENDERERS ---

export function renderPendingPOs() {
    const table = document.getElementById('table-pending-pos');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Filter only Purchase Orders
    const pendingPOs = (state.purchaseOrders || []).filter(po => po.Status === 'Pending Approval');

    if (pendingPOs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${_t('no_pending_financial_approval')}</td></tr>`;
        return;
    }

    pendingPOs.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(item => {
        let actionButtons = '';
        if (userCan('opApprovePO')) {
            actionButtons = `
                <div class="action-buttons">
                    <button class="primary small btn-approve-financial" data-id="${item.poId}" data-type="po">${_t('approve')}</button>
                    <button class="danger small btn-reject-financial" data-id="${item.poId}" data-type="po">${_t('reject')}</button>
                </div>`;
        } else {
            actionButtons = `<span style="color:var(--text-light-color); font-style:italic;">${_t('status_pending')}</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(item.date)}</td>
            <td>${item.poId}</td>
            <td>PO for ${findByKey(state.suppliers, 'supplierCode', item.supplierCode)?.name || item.supplierCode}</td>
            <td>${formatCurrency(item.totalValue)}</td>
            <td>${actionButtons}</td>
        `;
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

    // Group Receives (GRNs)
    const pendingReceivesGroups = {};
    
    // FIX: logic changed to include NULL, undefined, and empty string as Pending.
    const isPending = (t) => {
        const val = t.isApproved;
        // It is Pending if it is NOT explicitly true.
        return !(val === true || String(val).toUpperCase() === 'TRUE');
    };

    (state.transactions || []).filter(t => t.type === 'receive' && isPending(t)).forEach(t => {
        if (!pendingReceivesGroups[t.batchId]) {
            pendingReceivesGroups[t.batchId] = {
                date: t.date,
                txType: 'receive',
                ref: t.invoiceNumber,
                batchId: t.batchId,
                branchCode: t.branchCode, // Capture Branch Code
                details: `GRN from ${findByKey(state.suppliers, 'supplierCode', t.supplierCode)?.name || 'N/A'}`,
                totalValue: 0
            };
        }
        pendingReceivesGroups[t.batchId].totalValue += (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0);
    });

    let allPendingGRNs = Object.values(pendingReceivesGroups);

    // --- BRANCH FILTERING FOR INVOICES ---
    if (user && user.AssignedBranchCode && !isAdmin) {
        allPendingGRNs = allPendingGRNs.filter(g => g.branchCode === user.AssignedBranchCode);
    }

    if (allPendingGRNs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${_t('no_pending_financial_approval')}</td></tr>`;
        return;
    }

    allPendingGRNs.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(item => {
        let actionButtons = '';
        if (userCan('opApproveGRN')) {
            actionButtons = `
                <div class="action-buttons">
                    <button class="primary small btn-approve-financial" data-id="${item.batchId}" data-type="receive">${_t('approve')}</button>
                    <button class="danger small btn-reject-financial" data-id="${item.batchId}" data-type="receive">${_t('reject')}</button>
                </div>`;
        } else {
            actionButtons = `<span style="color:var(--text-light-color); font-style:italic;">${_t('status_pending')}</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(item.date)}</td>
            <td>${item.ref}</td>
            <td>${item.details}</td>
            <td>${formatCurrency(item.totalValue)}</td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- MODAL CONTENT RENDERERS ---

export function renderEditModalContent(type, id) {
    const editModalBody = document.getElementById('edit-modal-body');
    const editModalTitle = document.getElementById('edit-modal-title');
    const editForm = document.getElementById('form-edit-record');
    
    // Explicitly set type and ID on form for the submit handler
    editForm.dataset.type = type;
    editForm.dataset.id = id || '';

    let record = {}; // Initialize as empty object
    let formHtml;

    // Helper to safely get data
    const safeGet = (obj, key) => obj && obj[key] ? obj[key] : '';

    switch (type) {
        case 'item':
            if (id) record = findByKey(state.items, 'code', id) || {};
            editModalTitle.textContent = id ? _t('edit_item') : _t('add_new_item');
            
            const categories = ['Beef', 'Lamb', 'Poultry', 'Seafood', 'Offal', 'Processed', 'Consumables'];
            const currentCat = safeGet(record, 'category');
            const catOptions = categories.map(c => `<option value="${c}" ${currentCat === c ? 'selected' : ''}>${_t('cat_'+c.toLowerCase())}</option>`).join('');
            
            const units = ['KG', 'PCS', 'BOX', 'PACK', 'LTR'];
            const currentUnit = safeGet(record, 'unit') || 'KG';
            const unitOptions = units.map(u => `<option value="${u}" ${currentUnit === u ? 'selected' : ''}>${u}</option>`).join('');
            
            // Dynamic Parent Select for Cut Type
            const isCut = safeGet(record, 'ItemType') === 'Cut';
            const parentItems = state.items.filter(i => i.ItemType === 'Main');
            const parentOptions = parentItems.map(p => `<option value="${p.code}" ${p.code === record.ParentCode ? 'selected' : ''}>${p.name}</option>`).join('');

            let cutsSection = '';
            // Only show linked cuts if editing a Main Item
            if (safeGet(record, 'ItemType') === 'Main') {
                const cuts = state.items.filter(i => i.ItemType === 'Cut');
                const linked = (safeGet(record, 'DefinedCuts') || '').split(',').map(s => s.trim());
                let checkboxes = cuts.map(cut => {
                    const checked = linked.includes(cut.code) ? 'checked' : '';
                    return `<div style="padding:2px;"><input type="checkbox" name="DefinedCuts" value="${cut.code}" ${checked} id="lnk-${cut.code}"> <label for="lnk-${cut.code}">${cut.name}</label></div>`;
                }).join('');
                cutsSection = `<div class="form-group span-full"><label>Linked Cuts</label><div style="max-height:100px;overflow-y:auto;border:1px solid #ccc;padding:5px;">${checkboxes}</div></div>`;
            }

            formHtml = `
                <div class="form-grid">
                    <div class="form-group">
                        <label>${_t('item_type')}</label>
                        <select name="ItemType" ${id ? 'disabled' : ''} id="edit-item-type-select">
                            <option value="Main" ${safeGet(record, 'ItemType') === 'Main' ? 'selected' : ''}>Main (Parent)</option>
                            <option value="Cut" ${safeGet(record, 'ItemType') === 'Cut' ? 'selected' : ''}>Cut (Child)</option>
                        </select>
                        ${id ? `<input type="hidden" name="ItemType" value="${safeGet(record, 'ItemType')}">` : ''}
                    </div>
                    <!-- Parent Select Group (Hidden by default unless Cut) -->
                    <div class="form-group" id="group-edit-item-parent" style="display:${isCut ? 'block' : 'none'};">
                        <label>Parent Item (For Yield)</label>
                        <select name="ParentCode">${parentOptions}</select>
                    </div>
                    
                    <div class="form-group">
                        <label>${_t('item_code')}</label>
                        <div style="display:flex; gap:5px;">
                            <input type="text" name="code" id="edit-item-code" value="${safeGet(record, 'code')}" ${id ? 'readonly' : ''}>
                            ${!id ? `<button type="button" class="secondary small" id="btn-modal-gen-code">Auto</button>` : ''}
                        </div>
                    </div>
                    <div class="form-group"><label>${_t('barcode')}</label><input type="text" name="barcode" value="${safeGet(record, 'barcode')}"></div>
                    <div class="form-group"><label>${_t('item_name')}</label><input type="text" name="name" value="${safeGet(record, 'name')}" required></div>
                    <div class="form-group"><label>${_t('unit')}</label><select name="unit" required>${unitOptions}</select></div>
                    <div class="form-group"><label>${_t('category')}</label><select name="category" required>${catOptions}</select></div>
                    <div class="form-group"><label>${_t('default_supplier')}</label><select id="edit-item-supplier" name="supplierCode"></select></div>
                    <div class="form-group span-full"><label>${_t('default_cost')}</label><input type="number" name="cost" step="0.01" min="0" value="${safeGet(record, 'cost')}" required></div>
                    ${cutsSection}
                </div>`;
            editModalBody.innerHTML = formHtml;
            populateOptions(document.getElementById('edit-item-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
            if(record.supplierCode) document.getElementById('edit-item-supplier').value = record.supplierCode;
            break;
            
        case 'supplier':
            if (id) record = findByKey(state.suppliers, 'supplierCode', id) || {};
            editModalTitle.textContent = id ? _t('edit_supplier') : _t('add_new_supplier');
            formHtml = `
                <div class="form-grid">
                    <div class="form-group">
                        <label>${_t('supplier_code')}</label>
                        <div style="display:flex; gap:5px;">
                            <input type="text" name="supplierCode" id="edit-supplier-code" value="${safeGet(record, 'supplierCode')}" ${id ? 'readonly' : ''}>
                            ${!id ? `<button type="button" class="secondary small" id="btn-modal-gen-supplier">Auto</button>` : ''}
                        </div>
                    </div>
                    <div class="form-group"><label>${_t('supplier_name')}</label><input type="text" name="name" value="${safeGet(record, 'name')}" required></div>
                    <div class="form-group"><label>${_t('contact_info')}</label><input type="text" name="contact" value="${safeGet(record, 'contact')}"></div>
                </div>`;
            editModalBody.innerHTML = formHtml;
            break;
        
        case 'branch':
            if (id) record = findByKey(state.branches, 'branchCode', id) || {};
            editModalTitle.textContent = id ? _t('edit_branch') : _t('add_new_branch');
            formHtml = `<div class="form-grid"><div class="form-group"><label>${_t('branch_code')}</label><input type="text" name="branchCode" value="${safeGet(record, 'branchCode')}" ${id ? 'readonly' : ''}></div><div class="form-group"><label>${_t('branch_name')}</label><input type="text" name="branchName" value="${safeGet(record, 'branchName')}" required></div></div>`;
            editModalBody.innerHTML = formHtml;
            break;

      

        case 'user':
            if (id) record = findByKey(state.allUsers, 'Username', id) || {};
            editModalTitle.textContent = id ? _t('edit_user') : _t('add_new_user_title');
            const currentRole = safeGet(record, 'RoleName');
            const roleOptions = (state.allRoles || []).map(r => `<option value="${r.RoleName}" ${r.RoleName === currentRole ? 'selected' : ''}>${r.RoleName}</option>`).join('');
            const branchOptions = (state.branches || []).map(b => `<option value="${b.branchCode}" ${record.AssignedBranchCode === b.branchCode ? 'selected' : ''}>${b.branchName}</option>`).join('');
            
            formHtml = `
                <div class="form-grid">
                    <div class="form-group"><label>${_t('username')}</label><input type="text" name="Username" value="${safeGet(record, 'Username')}" ${id ? 'readonly' : 'required'}></div>
                    <div class="form-group"><label>${_t('table_h_fullname')}</label><input type="text" name="Name" value="${safeGet(record, 'Name')}" required></div>
                    <div class="form-group"><label>${_t('table_h_role')}</label><select name="RoleName" required><option value="">Select Role</option>${roleOptions}</select></div>
                    <div class="form-group"><label>Assigned Branch</label><select name="AssignedBranchCode"><option value="">None (HQ/Admin)</option>${branchOptions}</select></div>
                    <div class="form-group span-full"><label>${_t('edit_user_password_label')}</label><input type="password" name="LoginCode" ${!id ? 'required' : ''}></div>
                    <div class="form-group-checkbox span-full">
                        <input type="checkbox" name="isDisabled" id="user-disabled-check" ${record.isDisabled ? 'checked' : ''}>
                        <label for="user-disabled-check">Disable Account</label>
                    </div>
                </div>`;
            editModalBody.innerHTML = formHtml;
            break;

        case 'role':
            editModalTitle.textContent = 'Add New Role';
            formHtml = `
                <div class="form-grid">
                    <div class="form-group span-full">
                        <label>${_t('table_h_rolename')}</label>
                        <input type="text" name="RoleName" required placeholder="e.g., Accountant">
                    </div>
                    <p style="grid-column: 1/-1; color: #666; font-size: 0.9em;">
                        Note: After adding a role, use the 'Permissions' button to configure access rights.
                    </p>
                </div>`;
            editModalBody.innerHTML = formHtml;
            break;

        case 'role-permissions':
            const roleData = findByKey(state.allRoles, 'RoleName', id);
            editModalTitle.textContent = _t('edit_permissions_for').replace('{roleName}', id);
            
            let permissionsHtml = '';
            for (const [groupName, perms] of Object.entries(PERMISSION_GROUPS)) {
                permissionsHtml += `<div class="permission-category">${groupName}</div><div class="permissions-grid">`;
                perms.forEach(perm => {
                    const isChecked = roleData && (roleData[perm.key] === true || String(roleData[perm.key]).toUpperCase() === 'TRUE');
                    permissionsHtml += `
                        <div class="form-group-checkbox">
                            <input type="checkbox" name="${perm.key}" id="perm-${perm.key}" ${isChecked ? 'checked' : ''}>
                            <label for="perm-${perm.key}">${perm.label}</label>
                        </div>`;
                });
                permissionsHtml += `</div>`;
            }
            formHtml = `<input type="hidden" name="RoleName" value="${id}"><div style="padding-bottom:10px;">${permissionsHtml}</div>`;
            editModalBody.innerHTML = formHtml;
            break;
            
        case 'invoice_header':
            // Logic to fetch header details from the first row of a batch
            const txs = state.transactions.filter(t => t.batchId === id);
            if (!txs.length) { editModalBody.innerHTML = '<p>Error: Transaction not found.</p>'; return; }
            const header = txs[0];
            
            editModalTitle.textContent = `Edit Invoice Header (${id})`;
            const supplierOptions = state.suppliers.map(s => `<option value="${s.supplierCode}" ${s.supplierCode === header.supplierCode ? 'selected' : ''}>${s.name}</option>`).join('');
            
            formHtml = `
                <div class="form-grid">
                    <div class="form-group">
                        <label>Invoice Number</label>
                        <input type="text" name="invoiceNumber" value="${header.invoiceNumber || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Supplier</label>
                        <select name="supplierCode">${supplierOptions}</select>
                    </div>
                    <div class="form-group span-full">
                        <label>Notes</label>
                        <textarea name="notes" rows="3">${header.notes || ''}</textarea>
                    </div>
                    <div class="form-group span-full" style="color:orange; font-size:0.9em;">
                        Warning: Changing the supplier here will update it for all items in this invoice.
                    </div>
                </div>`;
            editModalBody.innerHTML = formHtml;
            break;
    }
}

export function renderItemsInModal(filter = '') {
    const listEl = document.getElementById('modal-item-list');
    const modal = document.getElementById('item-selector-modal');
    if(!listEl) return;
    listEl.innerHTML = '';
    
    const lowerFilter = filter.toLowerCase();
    const allowedItemsJson = modal.dataset.allowedItems; 
    let allowedCodes = null;
    if (allowedItemsJson && allowedItemsJson !== "undefined" && allowedItemsJson !== "") {
        try { allowedCodes = JSON.parse(allowedItemsJson); } catch (e) { console.error("Error parsing allowed items", e); }
    }

    state.items.filter(item => {
        const isActive = item.isActive !== false && String(item.isActive).toUpperCase() !== 'FALSE';
        if(!isActive) return false;

        const matchesText = item.name.toLowerCase().includes(lowerFilter) || item.code.toLowerCase().includes(lowerFilter);
        let matchesContext = true;
        if (allowedCodes && Array.isArray(allowedCodes) && allowedCodes.length > 0) {
            matchesContext = allowedCodes.includes(item.code);
        }
        return matchesText && matchesContext;
    }).forEach(item => {
        const isChecked = state.modalSelections.has(item.code);
        listEl.innerHTML += `<div class="modal-item"><input type="checkbox" id="modal-item-${item.code}" data-code="${item.code}" ${isChecked ? 'checked' : ''}><label for="modal-item-${item.code}"><strong>${item.name}</strong><br><small style="color:var(--text-light-color)">${item.code}</small></label></div>`;
    });
}

// --- HISTORY MODAL RENDERER ---
export function renderHistoryModal(itemId) {
    const item = findByKey(state.items, 'code', itemId);
    if (!item) return;

    document.getElementById('history-modal-title').textContent = `${_t('item_history_modal_title')}: ${item.name}`;

    // 1. Price History
    const priceContainer = document.getElementById('subview-price-history');
    const priceHistory = (state.priceHistory || []).filter(ph => ph.ItemCode === itemId);
    
    let priceHtml = '<table style="width:100%"><thead><tr><th>Date</th><th>Old Cost</th><th>New Cost</th><th>User</th><th>Source</th></tr></thead><tbody>';
    if(priceHistory.length === 0) {
        priceHtml += '<tr><td colspan="5" style="text-align:center">No price history found.</td></tr>';
    } else {
        priceHistory.slice().reverse().forEach(ph => {
            priceHtml += `<tr>
                <td>${formatDate(ph.Timestamp)}</td>
                <td>${formatCurrency(ph.OldCost)}</td>
                <td>${formatCurrency(ph.NewCost)}</td>
                <td>${ph.UpdatedBy || '-'}</td>
                <td>${ph.Source || '-'}</td>
            </tr>`;
        });
    }
    priceHtml += '</tbody></table>';
    priceContainer.innerHTML = priceHtml;

    // 2. Movement History
    const moveContainer = document.getElementById('movement-history-table-container');
    const movements = state.transactions.filter(t => t.itemCode === itemId);
    
    let moveHtml = '<table style="width:100%"><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Qty</th><th>Branch</th></tr></thead><tbody>';
    if(movements.length === 0) {
        moveHtml += '<tr><td colspan="5" style="text-align:center">No movement history found.</td></tr>';
    } else {
        movements.slice().reverse().forEach(mv => {
            let branch = mv.branchCode || mv.fromBranchCode || mv.toBranchCode;
            let branchName = findByKey(state.branches, 'branchCode', branch)?.branchName || branch;
            moveHtml += `<tr>
                <td>${formatDate(mv.date)}</td>
                <td>${mv.type}</td>
                <td>${mv.batchId}</td>
                <td>${parseFloat(mv.quantity).toFixed(3)}</td>
                <td>${branchName}</td>
            </tr>`;
        });
    }
    moveHtml += '</tbody></table>';
    moveContainer.innerHTML = moveHtml;
}

// --- STOCK VIEW ---

export function renderItemCentricStockView() {
    const container = document.getElementById('item-centric-stock-container');
    if (!container) return;
    
    const stock = calculateStockLevels();
    
    let branchesToDisplay = [];
    if (userCan('viewAllBranches')) {
        branchesToDisplay = state.branches;
    } else {
        const userBranch = state.currentUser.AssignedBranchCode;
        if (userBranch) {
            branchesToDisplay = state.branches.filter(b => b.branchCode === userBranch);
        } else {
            container.innerHTML = '<p>No branch assigned.</p>'; return;
        }
    }
    
    let html = '<table id="table-stock-levels"><thead><tr><th>Code</th><th>Item</th>';
    branchesToDisplay.forEach(b => html += `<th>${b.branchName}</th>`);
    html += `<th>Total Value</th></tr></thead><tbody>`;
    
    state.items.forEach(item => {
        let rowTotalVal = 0;
        let rowHtml = `<tr><td>${item.code}</td><td>${item.name}</td>`;
        
        branchesToDisplay.forEach(b => {
            const data = stock[b.branchCode]?.[item.code];
            const qty = data?.quantity || 0;
            const val = qty * (data?.avgCost || 0);
            rowTotalVal += val;
            rowHtml += `<td>${qty.toFixed(3)}</td>`;
        });
        
        rowHtml += `<td><strong>${formatCurrency(rowTotalVal)}</strong></td></tr>`;
        html += rowHtml;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

export function renderInvoicesInModal() {
    const listEl = document.getElementById('modal-invoice-list');
    const supplierCode = document.getElementById('payment-supplier-select')?.value;
    if (!listEl) return;
    listEl.innerHTML = '';
    
    if (!supplierCode) { 
        listEl.innerHTML = '<p style="padding:10px">Please select a supplier first.</p>'; 
        return; 
    }
    
    const financials = calculateSupplierFinancials();
    const invoices = financials[supplierCode]?.invoices || {};
    const unpaidInvoices = Object.values(invoices).filter(i => i.status !== 'Paid');

    if (unpaidInvoices.length === 0) {
        listEl.innerHTML = '<p style="padding:10px">No unpaid invoices found for this supplier.</p>';
        return;
    }

    unpaidInvoices.forEach(inv => {
        const isChecked = state.invoiceModalSelections.has(inv.number) ? 'checked' : '';
        listEl.innerHTML += `
            <div class="modal-item">
                <input type="checkbox" id="inv-${inv.number}" data-number="${inv.number}" ${isChecked}>
                <label for="inv-${inv.number}">
                    <strong>Invoice #${inv.number}</strong><br>
                    <small>Date: ${formatDate(inv.date)} | Due: ${formatCurrency(inv.balance)}</small>
                </label>
            </div>`;
    });
}

export function renderPaymentList() {
    const container = document.getElementById('payment-invoice-list-container');
    const table = document.getElementById('table-payment-list');
    if (!container || !table) return;
    
    const tbody = table.querySelector('tbody');
    const supplierCode = document.getElementById('payment-supplier-select')?.value;
    
    tbody.innerHTML = '';
    if (!supplierCode || state.invoiceModalSelections.size === 0) {
        container.style.display = 'none';
        return;
    }

    const financials = calculateSupplierFinancials();
    const invoices = financials[supplierCode]?.invoices || {};
    let total = 0;

    state.invoiceModalSelections.forEach(invNum => {
        const inv = invoices[invNum];
        if (inv) {
            total += inv.balance;
            tbody.innerHTML += `
                <tr>
                    <td>${inv.number}</td>
                    <td>${formatCurrency(inv.balance)}</td>
                    <td><input type="number" class="table-input payment-amount-input" data-invoice="${inv.number}" value="${inv.balance.toFixed(2)}" max="${inv.balance.toFixed(2)}"></td>
                </tr>`;
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
    
    const financials = calculateSupplierFinancials();
    const data = financials[code];
    const sDate = d1 ? new Date(d1) : null;
    const eDate = d2 ? new Date(d2) : null;
    if(eDate) eDate.setHours(23, 59, 59);

    let runningBalance = 0;
    let tableHtml = '';
    let openingBalance = 0;

    if (sDate) {
        data.events.forEach(e => {
            if (new Date(e.date) < sDate) {
                openingBalance += (e.debit - e.credit); 
            }
        });
        runningBalance = openingBalance;
        tableHtml += `<tr style="background:#eee; font-weight:bold;"><td colspan="3">Opening Balance</td><td>-</td><td>-</td><td>${formatCurrency(openingBalance)}</td><td></td></tr>`;
    }

    data.events.forEach(e => {
        const d = new Date(e.date);
        if ((!sDate || d >= sDate) && (!eDate || d <= eDate)) {
            runningBalance += (e.debit - e.credit);
            
            // ACTION BUTTON LOGIC
            let actionBtn = '';
            if (e.type === 'Pay' && e.ref) {
                actionBtn = `<button class="secondary small btn-print-voucher" data-id="${e.ref}" style="margin-left:10px; padding:4px 8px;">Print</button>`;
            }

            tableHtml += `<tr>
                <td>${formatDate(e.date)}</td>
                <td>${e.type}</td>
                <td>${e.ref}</td>
                <td>${e.debit > 0 ? formatCurrency(e.debit) : '-'}</td>
                <td>${e.credit > 0 ? formatCurrency(e.credit) : '-'}</td>
                <td style="font-weight:bold;">${formatCurrency(runningBalance)}</td>
                <td>${actionBtn}</td>
            </tr>`;
        }
    });

    // ADD TOTALS FOOTER
    tableHtml += `
        <tr style="background-color:#e9ecef; font-weight:bold; font-size:1.1em;">
            <td colspan="5" style="text-align:right;">Closing Balance:</td>
            <td colspan="2" style="color:${runningBalance > 0 ? '#d32f2f' : 'green'}">${formatCurrency(runningBalance)}</td>
        </tr>`;

    const payButton = `
        <div style="margin-top: 20px; text-align: right; display:flex; justify-content:flex-end; gap:10px;">
            <button class="secondary" id="btn-export-statement">Export to Excel</button>
            <button class="primary btn-pay-supplier" data-supplier="${supplier.supplierCode}">Pay This Supplier</button>
        </div>`;

    container.innerHTML = `<div class="printable-document"><h3>Statement: ${supplier.name}</h3><table id="table-supplier-statement"><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Action</th></tr></thead><tbody>${tableHtml}</tbody></table>${payButton}</div>`;
    container.style.display = 'block';
}

export function renderPurchaseOrdersViewer() {
    const table = document.getElementById('table-po-viewer');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    (state.purchaseOrders || []).slice().reverse().forEach(po => {
        const sup = findByKey(state.suppliers, 'supplierCode', po.supplierCode)?.name || po.supplierCode;
        const items = state.purchaseOrderItems.filter(i => i.poId === po.poId);
        tbody.innerHTML += `<tr><td>${po.poId}</td><td>${formatDate(po.date)}</td><td>${sup}</td><td>${items.length}</td><td>${formatCurrency(po.totalValue)}</td><td>${po.Status}</td><td><button class="secondary small btn-view-tx" data-batch-id="${po.poId}" data-type="po">View</button></td></tr>`;
    });
}

export function renderActivityLog() {
    const table = document.getElementById('table-activity-log');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    if (!state.activityLog || state.activityLog.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No activity logged.</td></tr>`;
        return;
    }
    state.activityLog.slice().reverse().forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(log.Timestamp).toLocaleString()}</td><td>${log.User || 'N/A'}</td><td>${log.Action}</td><td>${log.Description}</td>`;
        tbody.appendChild(tr);
    });
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
        const from = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || t.fromBranchCode;
        // CHECK PERMISSION FOR RECEIVE
        let actionCell = '';
        if (userCan('opReceive')) {
            actionCell = `<button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">Receive</button>`;
        } else {
            actionCell = 'Pending Receipt';
        }
        tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>Incoming from ${from}</td><td>${t.ref}</td><td>${t.items.length}</td><td>${actionCell}</td></tr>`;
    });
}

export function renderInTransitReport() {
    const tbody = document.getElementById('table-in-transit')?.querySelector('tbody'); 
    if (!tbody) return; 
    tbody.innerHTML = '';
    
    const groups = {};
    (state.transactions || []).filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => {
        if (!groups[t.batchId]) groups[t.batchId] = { ...t, items: [] };
        groups[t.batchId].items.push(t);
    });

    const sortedGroups = Object.values(groups).sort((a,b) => new Date(b.date) - new Date(a.date));

    if(sortedGroups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No items currently in transit.</td></tr>`;
        return;
    }

    sortedGroups.forEach(t => {
        const from = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || 'N/A';
        const to = findByKey(state.branches, 'branchCode', t.toBranchCode)?.branchName || 'N/A';
        
        const myBranch = state.currentUser?.AssignedBranchCode;
        const isAdmin = userCan('viewAllBranches');

        let actionHtml = `<span class="status-tag status-intransit">In Transit</span>`;

        if (t.toBranchCode === myBranch) {
            // CHECK PERMISSION
            if (userCan('opReceive')) {
                actionHtml = `<button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">Receive Stock</button>`;
            } else {
                actionHtml = 'Pending Receipt';
            }
        } else if (t.fromBranchCode === myBranch || isAdmin) {
            // CHECK PERMISSION
            if (userCan('opTransfer')) {
                actionHtml = `<button class="danger small btn-cancel-transfer" data-batch-id="${t.batchId}">Cancel Transfer</button>`;
            }
        }
        
        tbody.innerHTML += `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td>${from}</td>
                <td>${to}</td>
                <td>${t.ref}</td>
                <td>${t.items.length}</td>
                <td>${t.Status}</td>
                <td>${actionHtml}</td>
            </tr>`;
    });
}

export function updateNotifications() {
    const widget = document.getElementById('pending-requests-widget');
    const countEl = document.getElementById('pending-requests-count');
    const textEl = document.getElementById('pending-requests-widget-text');
    
    if (!widget || !state.currentUser) return;
    
    const myBranch = state.currentUser.AssignedBranchCode;
    const isAdmin = userCan('viewAllBranches');
    
    const incomingBatches = new Set();
    state.transactions.forEach(t => {
        if (t.type === 'transfer_out' && t.Status === 'In Transit') {
            if (isAdmin || t.toBranchCode === myBranch) {
                incomingBatches.add(t.batchId);
            }
        }
    });

    const totalCount = incomingBatches.size;

    if (totalCount > 0) {
        widget.style.display = 'flex';
        countEl.textContent = totalCount;
        textEl.textContent = "Incoming Transfers";
        widget.style.backgroundColor = '#E65100';
        widget.dataset.actionType = 'transfer';
    } else {
        widget.style.display = 'none';
    }
}

export function renderUserManagementUI() {
    const usersTbody = document.getElementById('table-users');
    if (!usersTbody) return;
    const tbody = usersTbody.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!state.allUsers || state.allUsers.length === 0) {
         tbody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>';
    } else {
        state.allUsers.forEach(user => {
            const tr = document.createElement('tr');
            const assigned = findByKey(state.branches, 'branchCode', user.AssignedBranchCode)?.branchName || 'N/A';
            const statusText = (user.isDisabled === true || String(user.isDisabled).toUpperCase() === 'TRUE') ? 'Disabled' : 'Active';
            tr.innerHTML = `<td>${user.Username}</td><td>${user.Name}</td><td>${user.RoleName}</td><td>${assigned}</td><td>${statusText}</td><td><button class="secondary small btn-edit" data-type="user" data-id="${user.Username}">${_t('edit')}</button></td>`;
            tbody.appendChild(tr);
        });
    }

    renderRolesTable();
}

export function renderRolesTable() {
    const table = document.getElementById('table-roles');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!state.allRoles || state.allRoles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2">No roles found.</td></tr>';
        return;
    }

    state.allRoles.forEach(role => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${role.RoleName}</td>
            <td>
                <div class="action-buttons">
                    <button class="secondary small btn-edit-role-perms" data-role="${role.RoleName}">Permissions</button>
                    <button class="danger small btn-delete-role" data-role="${role.RoleName}">Delete</button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}



    const batches = Object.values(productionBatches).sort((a,b) => new Date(b.date) - new Date(a.date));
    let html = '';

    if (type === 'batch') {
        // --- MODE 1: BATCH LIST ---
        html = `<table id="table-yield-batch"><thead><tr><th>Date</th><th>Ref</th><th>Branch</th><th>Parent Item</th><th>Input (KG)</th><th>Output (KG)</th><th>Yield %</th><th>Action</th></tr></thead><tbody>`;
        
        batches.forEach(b => {
            if (filterText && !b.batchNo.toLowerCase().includes(filterText.toLowerCase())) return;
            
            const parentName = findByKey(state.items, 'code', b.parentItemCode)?.name || b.parentItemCode;
            const branchName = findByKey(state.branches, 'branchCode', b.branchCode)?.branchName || b.branchCode;
            const outputWeight = b.childItems.reduce((sum, i) => sum + i.quantity, 0);
            const pct = b.parentQuantity > 0 ? ((outputWeight / b.parentQuantity) * 100) : 0;
            const color = pct < 90 ? 'red' : 'green';

            html += `<tr>
                <td>${formatDate(b.date)}</td>
                <td>${b.batchNo}</td>
                <td>${branchName}</td>
                <td>${parentName}</td>
                <td>${b.parentQuantity.toFixed(3)}</td>
                <td>${outputWeight.toFixed(3)}</td>
                <td style="color:${color}; font-weight:bold;">${pct.toFixed(1)}%</td>
                <td><button class="secondary small btn-print-yield" data-batch="${b.batchNo}">Print</button></td>
            </tr>`;
        });
        html += '</tbody></table>';

    } else if (type === 'item') {
        // --- MODE 2: ITEM HISTORY ---
        const itemGroups = {};
        
        batches.forEach(b => {
            const pCode = b.parentItemCode;
            if (!itemGroups[pCode]) itemGroups[pCode] = { name: '', batches: [] };
            
            const parentName = findByKey(state.items, 'code', pCode)?.name || pCode;
            if (filterText && !parentName.toLowerCase().includes(filterText.toLowerCase())) return;
            
            itemGroups[pCode].name = parentName;
            itemGroups[pCode].batches.push(b);
        });

        for (const [code, group] of Object.entries(itemGroups)) {
            if(group.batches.length === 0) continue;
            
            html += `<div class="card" style="border:1px solid #eee; margin-bottom:15px;"><h3>${group.name} (${code})</h3>`;
            html += `<table id="table-yield-${code}"><thead><tr><th>Date</th><th>Batch</th><th>Input Used</th><th>Total Cuts</th><th>Efficiency</th><th>Detail</th></tr></thead><tbody>`;
            
            group.batches.forEach(b => {
                const out = b.childItems.reduce((s, i) => s + i.quantity, 0);
                const pct = ((out / b.parentQuantity) * 100).toFixed(1);
                html += `<tr>
                    <td>${formatDate(b.date)}</td>
                    <td>${b.batchNo}</td>
                    <td>${b.parentQuantity.toFixed(2)}</td>
                    <td>${out.toFixed(2)}</td>
                    <td>${pct}%</td>
                    <td><button class="secondary small btn-print-yield" data-batch="${b.batchNo}">Report</button></td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
    }

    container.innerHTML = html;
    
    // Re-attach listeners for dynamic buttons
    document.querySelectorAll('.btn-print-yield').forEach(btn => {
        btn.addEventListener('click', () => {
            const batchData = productionBatches[btn.dataset.batch];
            if(batchData) generateButcheryReport(batchData);
        });
    });
}
