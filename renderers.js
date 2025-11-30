// renderers.js
import { state } from './state.js';
import { _t, findByKey, userCan, populateOptions, formatCurrency, formatDate } from './utils.js';
import { calculateStockLevels, calculateSupplierFinancials } from './calculations.js';
import { generateReceiveDocument, generateTransferDocument, generateIssueDocument, generateReturnDocument, generatePODocument } from './documents.js';

// --- GENERIC TABLE RENDERER ---
const renderDynamicListTable = (tbodyId, list, columnsConfig, emptyMessage, totalizerFn) => {
    const table = document.getElementById(tbodyId);
    if (!table) return;
    const tbody = table.querySelector('tbody');
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
                case 'text': 
                    content = item[col.key]; 
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
            cellsHtml += `<td>${content}</td>`;
        });
        cellsHtml += `<td><button class="danger small" data-index="${index}">X</button></td>`;
        tr.innerHTML = cellsHtml;
        tbody.appendChild(tr);
    });
    if (totalizerFn) totalizerFn();
};

// --- SPECIFIC LIST RENDERERS ---

export function renderReceiveListTable() { 
    renderDynamicListTable('table-receive-list', state.currentReceiveList, [ 
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'number_input', key: 'quantity' }, 
        { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)}` } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentReceiveList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0) * (parseFloat(i.cost)||0)), 0);
        const totalEl = document.getElementById('receive-grand-total');
        if(totalEl) totalEl.textContent = formatCurrency(total);
    }); 
}

export function renderButcheryListTable() {
    renderDynamicListTable('table-butchery-children', state.currentButcheryList, [ 
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'number_input', key: 'quantity', step: 0.001 } 
    ], 'no_items_selected_toast', updateButcheryTotals);
}

function updateButcheryTotals() {
    let totalChildWeight = 0;
    (state.currentButcheryList || []).forEach(i => totalChildWeight += parseFloat(i.quantity) || 0);
    
    const totalEl = document.getElementById('butchery-total-weight');
    if(totalEl) totalEl.textContent = totalChildWeight.toFixed(3);
    
    const parentQtyInput = document.getElementById('butchery-parent-qty');
    const parentWeight = parseFloat(parentQtyInput ? parentQtyInput.value : 0) || 0;
    
    if (parentWeight > 0) {
        const yieldPct = (totalChildWeight / parentWeight) * 100;
        const yieldEl = document.getElementById('butchery-yield-pct');
        if(yieldEl) {
            yieldEl.textContent = yieldPct.toFixed(1) + '%';
            yieldEl.style.color = (yieldPct > 100 || yieldPct < 50) ? 'var(--danger-color)' : 'var(--secondary-color)';
        }
    }
}

export function renderTransferListTable() { 
    renderDynamicListTable('table-transfer-list', state.currentTransferList, [ 
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, 
        { type: 'number_input', key: 'quantity' } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentTransferList.reduce((acc, i) => acc + (parseFloat(i.quantity)||0), 0);
        const totalEl = document.getElementById('transfer-grand-total');
        if(totalEl) totalEl.textContent = total.toFixed(3);
    }); 
}

export function renderIssueListTable() { 
    renderDynamicListTable('table-issue-list', state.currentIssueList, [ 
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'available_stock', branchSelectId: 'issue-from-branch' }, 
        { type: 'number_input', key: 'quantity' } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentIssueList.reduce((acc, i) => acc + (parseFloat(i.quantity)||0), 0);
        const totalEl = document.getElementById('issue-grand-total');
        if(totalEl) totalEl.textContent = total.toFixed(3);
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
        const totalEl = document.getElementById('return-grand-total');
        if(totalEl) totalEl.textContent = formatCurrency(total);
    }); 
}

export function renderPOListTable() { 
    renderDynamicListTable('table-po-list', state.currentPOList, [ 
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'number_input', key: 'quantity' }, 
        { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)}` } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentPOList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0) * (parseFloat(i.cost)||0)), 0);
        const totalEl = document.getElementById('po-grand-total');
        if(totalEl) totalEl.textContent = formatCurrency(total);
    }); 
}

export function renderPOEditListTable() {
    renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [ 
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'number_input', key: 'quantity' }, 
        { type: 'cost_input', key: 'cost' }, 
        { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)}` } 
    ], 'no_items_selected_toast', () => {
        let total = state.currentEditingPOList.reduce((acc, i) => acc + ((parseFloat(i.quantity)||0) * (parseFloat(i.cost)||0)), 0);
        const totalEl = document.getElementById('edit-po-grand-total');
        if(totalEl) totalEl.textContent = formatCurrency(total);
    });
}

export function renderRequestListTable() { 
    renderDynamicListTable('table-request-list', state.currentRequestList, [ 
        { type: 'text', key: 'itemCode' }, 
        { type: 'text', key: 'itemName' }, 
        { type: 'number_input', key: 'quantity' } 
    ], 'no_items_selected_toast', null); 
}

export function renderAdjustmentListTable() {
    const table = document.getElementById('table-adjustment-list');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!state.currentAdjustmentList || state.currentAdjustmentList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_for_adjustment')}</td></tr>`;
        return;
    }
    
    const stock = calculateStockLevels();
    const branchCodeEl = document.getElementById('adjustment-branch');
    const branchCode = branchCodeEl ? branchCodeEl.value : null;

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
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_found')}</td></tr>`;
        return;
    }
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.code}</td><td>${item.name}</td><td>${_t(item.category ? 'cat_'+item.category.toLowerCase() : '') || item.category}</td><td>${item.ItemType || 'Main'}</td><td>${formatCurrency(item.cost)}</td><td><div class="action-buttons"><button class="secondary small btn-edit" data-type="item" data-id="${item.code}">${_t('edit')}</button><button class="secondary small btn-history" data-type="item" data-id="${item.code}">${_t('history')}</button></div></td>`;
        tbody.appendChild(tr);
    });
}

export function renderSuppliersTable(data = state.suppliers) {
    const table = document.getElementById('table-suppliers');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    const financials = calculateSupplierFinancials();
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${_t('no_suppliers_found')}</td></tr>`;
        return;
    }
    
    data.forEach(supplier => {
        const balance = financials[supplier.supplierCode]?.balance || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${supplier.supplierCode || ''}</td><td>${supplier.name}</td><td>${supplier.contact}</td><td>${formatCurrency(balance)}</td><td><button class="secondary small btn-edit" data-type="supplier" data-id="${supplier.supplierCode}">${_t('edit')}</button></td>`;
        tbody.appendChild(tr);
    });
}

export function renderBranchesTable(data = state.branches) {
    const table = document.getElementById('table-branches');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${_t('no_branches_found')}</td></tr>`;
        return;
    }
    data.forEach(branch => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${branch.branchCode || ''}</td><td>${branch.branchName}</td><td><button class="secondary small btn-edit" data-type="branch" data-id="${branch.branchCode}">${_t('edit')}</button></td>`;
        tbody.appendChild(tr);
    });
}

export function renderSectionsTable(data = state.sections) {
    const table = document.getElementById('table-sections');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${_t('no_sections_found')}</td></tr>`;
        return;
    }
    data.forEach(section => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${section.sectionCode || ''}</td><td>${section.sectionName}</td><td><button class="secondary small btn-edit" data-type="section" data-id="${section.sectionCode}">${_t('edit')}</button></td>`;
        tbody.appendChild(tr);
    });
}

// --- REPORT RENDERERS ---

export function renderTransactionHistory(filters = {}) {
    // FIX: Added safety check for table existence
    const table = document.getElementById('table-transaction-history');
    if (!table) return; 
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    let allTx = [...state.transactions];
    let allPo = [...state.purchaseOrders];

    if (!userCan('viewAllBranches')) {
        const branchCode = state.currentUser.AssignedBranchCode;
        if (branchCode) {
            allTx = allTx.filter(t => String(t.branchCode) === branchCode || String(t.fromBranchCode) === branchCode || String(t.toBranchCode) === branchCode);
            allPo = []; 
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

    const grouped = {};
    allHistoryItems.forEach(t => {
        const key = t.batchId;
        if (!key) return;
        if (!grouped[key]) grouped[key] = { date: t.date, type: t.type, batchId: key, transactions: [] };
        grouped[key].transactions.push(t);
    });

    Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(group => {
        const first = group.transactions[0];
        let details = '', statusTag = '', refNum = first.ref || first.batchId;
        let typeDisplay = _t(first.type) || first.type.toUpperCase();
        
        const canEditInvoice = userCan('opEditInvoice') && first.type === 'receive' && (first.isApproved !== true && String(first.isApproved).toUpperCase() !== 'TRUE');

        let actionsHtml = `<button class="secondary small btn-view-tx" data-batch-id="${group.batchId}" data-type="${first.type}">${_t('view_print')}</button>`;
        if(canEditInvoice){
            actionsHtml += `<button class="secondary small btn-edit-invoice" data-batch-id="${group.batchId}">${_t('edit')}</button>`;
        }

        if(first.type === 'receive') {
            details = `Received from <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong> at <strong>${findByKey(state.branches, 'branchCode', first.branchCode)?.branchName || 'N/A'}</strong>`;
            refNum = first.invoiceNumber;
            statusTag = first.isApproved === true || String(first.isApproved).toUpperCase() === 'TRUE' ? `<span class="status-tag status-approved">${_t('status_approved')}</span>` : `<span class="status-tag status-pendingapproval">${_t('status_pending')}</span>`;
        } else if (first.type === 'transfer_out' || first.type === 'transfer_in') {
            details = `Transfer from <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName}</strong> to <strong>${findByKey(state.branches, 'branchCode', first.toBranchCode)?.branchName}</strong>`;
            statusTag = `<span class="status-tag status-${(first.Status || '').toLowerCase().replace(/ /g,'')}">${_t('status_' + (first.Status || '').toLowerCase().replace(/ /g,''))}</span>`;
        } else if (first.type && first.type.includes('production')) {
            typeDisplay = _t('process_production');
            details = `Butchery Yield at <strong>${findByKey(state.branches, 'branchCode', first.branchCode)?.branchName}</strong>`;
        } else if (first.type === 'po') {
            details = `PO for <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name}</strong>`;
            statusTag = `<span class="status-tag status-${(first.Status || 'pending').toLowerCase().replace(/ /g,'')}">${first.Status}</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formatDate(first.date)}</td><td>${typeDisplay}</td><td>${refNum}</td><td>${details}</td><td>${statusTag}</td><td><div class="action-buttons">${actionsHtml}</div></td>`;
        tbody.appendChild(tr);
    });
}

export function renderPendingFinancials() {
    const table = document.getElementById('table-pending-financial-approval');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    const pendingPOs = (state.purchaseOrders || []).filter(po => po.Status === 'Pending Approval');
    
    const pendingReceivesGroups = {};
    (state.transactions || []).filter(t => t.type === 'receive' && (t.isApproved === false || String(t.isApproved).toUpperCase() === 'FALSE')).forEach(t => {
        if (!pendingReceivesGroups[t.batchId]) {
            pendingReceivesGroups[t.batchId] = {
                date: t.date,
                txType: 'receive',
                ref: t.invoiceNumber,
                batchId: t.batchId,
                details: `GRN from ${findByKey(state.suppliers, 'supplierCode', t.supplierCode)?.name || 'N/A'}`,
                totalValue: 0
            };
        }
        pendingReceivesGroups[t.batchId].totalValue += (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0);
    });

    let allPending = [
        ...pendingPOs.map(po => ({...po, txType: 'po', ref: po.poId, value: po.totalValue, details: `PO for ${findByKey(state.suppliers, 'supplierCode', po.supplierCode)?.name || 'N/A'}`})),
        ...Object.values(pendingReceivesGroups).map(rcv => ({...rcv, value: rcv.totalValue}))
    ];

    if (allPending.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_pending_financial_approval')}</td></tr>`;
        return;
    }

    allPending.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(item.date)}</td>
            <td>${_t(item.txType)}</td>
            <td>${item.ref}</td>
            <td>${item.details}</td>
            <td>${formatCurrency(item.value)}</td>
            <td>
                <div class="action-buttons">
                    <button class="primary small btn-approve-financial" data-id="${item.txType === 'po' ? item.poId : item.batchId}" data-type="${item.txType}">${_t('approve')}</button>
                    <button class="danger small btn-reject-financial" data-id="${item.txType === 'po' ? item.poId : item.batchId}" data-type="${item.txType}">${_t('reject')}</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- MODAL CONTENT RENDERERS ---

export function renderEditModalContent(type, id) {
    const editModalBody = document.getElementById('edit-modal-body');
    const editModalTitle = document.getElementById('edit-modal-title');
    let record, formHtml;

    switch (type) {
        case 'item':
            record = findByKey(state.items, 'code', id);
            editModalTitle.textContent = _t('edit_item');
            
            // Generate Options for Category
            const categories = ['Beef', 'Lamb', 'Poultry', 'Seafood', 'Offal', 'Processed', 'Consumables'];
            const catOptions = categories.map(c => `<option value="${c}" ${record.category === c ? 'selected' : ''}>${_t('cat_'+c.toLowerCase())}</option>`).join('');
            
            // Defined Cuts Checkboxes (If Main Item)
            let cutsSection = '';
            if (record.ItemType === 'Main') {
                const cuts = state.items.filter(i => i.ItemType === 'Cut');
                const linked = (record.DefinedCuts || '').split(',').map(s => s.trim());
                let checkboxes = cuts.map(cut => {
                    const checked = linked.includes(cut.code) ? 'checked' : '';
                    return `<div style="padding:2px;"><input type="checkbox" name="DefinedCuts" value="${cut.code}" ${checked} id="lnk-${cut.code}"> <label for="lnk-${cut.code}">${cut.name}</label></div>`;
                }).join('');
                cutsSection = `<div class="form-group span-full"><label>Linked Cuts</label><div style="max-height:100px;overflow-y:auto;border:1px solid #ccc;padding:5px;">${checkboxes}</div></div>`;
            }

            formHtml = `
                <div class="form-grid">
                    <div class="form-group"><label>${_t('item_type')}</label><input type="text" name="ItemType" value="${record.ItemType || 'Main'}" readonly></div>
                    <div class="form-group"><label>${_t('item_code')}</label><input type="text" value="${record.code}" readonly></div>
                    <div class="form-group"><label>${_t('barcode')}</label><input type="text" name="barcode" value="${record.barcode || ''}"></div>
                    <div class="form-group"><label>${_t('item_name')}</label><input type="text" name="name" value="${record.name}" required></div>
                    <div class="form-group"><label>${_t('unit')}</label><input type="text" name="unit" value="${record.unit}" required></div>
                    <div class="form-group"><label>${_t('category')}</label><select name="category" required>${catOptions}</select></div>
                    <div class="form-group"><label>${_t('default_supplier')}</label><select id="edit-item-supplier" name="supplierCode"></select></div>
                    <div class="form-group span-full"><label>${_t('default_cost')}</label><input type="number" name="cost" step="0.01" min="0" value="${record.cost}" required></div>
                    ${cutsSection}
                </div>`;
            editModalBody.innerHTML = formHtml;
            populateOptions(document.getElementById('edit-item-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
            document.getElementById('edit-item-supplier').value = record.supplierCode;
            break;
            
        case 'supplier':
            record = findByKey(state.suppliers, 'supplierCode', id);
            editModalTitle.textContent = _t('edit_supplier');
            formHtml = `<div class="form-grid"><div class="form-group"><label>${_t('supplier_code')}</label><input type="text" value="${record.supplierCode}" readonly></div><div class="form-group"><label>${_t('supplier_name')}</label><input type="text" name="name" value="${record.name}" required></div><div class="form-group"><label>${_t('contact_info')}</label><input type="text" name="contact" value="${record.contact || ''}"></div></div>`;
            editModalBody.innerHTML = formHtml;
            break;
            
        case 'user':
            record = findByKey(state.allUsers, 'Username', id);
            editModalTitle.textContent = id ? _t('edit_user') : _t('add_new_user_title');
            const currentRole = record ? record.RoleName : '';
            const roleOptions = state.allRoles.map(r => `<option value="${r.RoleName}" ${r.RoleName === currentRole ? 'selected' : ''}>${r.RoleName}</option>`).join('');
            
            formHtml = `
                <div class="form-grid">
                    <div class="form-group"><label>${_t('username')}</label><input type="text" name="Username" value="${record ? record.Username : ''}" ${id ? 'readonly' : 'required'}></div>
                    <div class="form-group"><label>${_t('table_h_fullname')}</label><input type="text" name="Name" value="${record ? record.Name : ''}" required></div>
                    <div class="form-group"><label>${_t('table_h_role')}</label><select name="RoleName" required>${roleOptions}</select></div>
                    <div class="form-group span-full"><label>${_t('edit_user_password_label')}</label><input type="password" name="LoginCode" ${!id ? 'required' : ''}></div>
                </div>`;
            editModalBody.innerHTML = formHtml;
            break;
    }
}

export function renderItemsInModal(filter = '') {
    const listEl = document.getElementById('modal-item-list');
    const modal = document.getElementById('item-selector-modal');
    listEl.innerHTML = '';
    
    const lowerFilter = filter.toLowerCase();
    
    // Check if we have specific allowed items (from Butchery logic)
    const allowedItemsJson = modal.dataset.allowedItems; 
    let allowedCodes = null;
    if (allowedItemsJson && allowedItemsJson !== "undefined" && allowedItemsJson !== "") {
        try {
            allowedCodes = JSON.parse(allowedItemsJson);
        } catch (e) { console.error("Error parsing allowed items", e); }
    }

    state.items.filter(item => {
        // 1. Text Search Filter
        const matchesText = item.name.toLowerCase().includes(lowerFilter) || item.code.toLowerCase().includes(lowerFilter);
        
        // 2. Allowed Items Filter (If butchery parent is selected)
        let matchesContext = true;
        if (allowedCodes && Array.isArray(allowedCodes) && allowedCodes.length > 0) {
            matchesContext = allowedCodes.includes(item.code);
        }
        
        return matchesText && matchesContext;
    }).forEach(item => {
        const isChecked = state.modalSelections.has(item.code);
        const itemDiv = document.createElement('div');
        itemDiv.className = 'modal-item';
        itemDiv.innerHTML = `<input type="checkbox" id="modal-item-${item.code}" data-code="${item.code}" ${isChecked ? 'checked' : ''}><label for="modal-item-${item.code}"><strong>${item.name}</strong><br><small style="color:var(--text-light-color)">${item.code}</small></label>`;
        listEl.appendChild(itemDiv);
    });

    if (listEl.innerHTML === '') {
        listEl.innerHTML = `<p style="text-align:center; padding:20px; color:#888;">No matching items found.<br>${allowedCodes ? '(Filtered by Parent Item definition)' : ''}</p>`;
    }
}

// --- DASHBOARD AND OTHER VIEWS ---

export function renderItemCentricStockView() {
    const container = document.getElementById('item-centric-stock-container');
    if (!container) return;
    const stockByBranch = calculateStockLevels();
    const branchesToDisplay = userCan('viewAllBranches') ? state.branches : state.branches.filter(b => b.branchCode === state.currentUser.AssignedBranchCode);
    
    let tableHTML = `<table id="table-stock-levels-by-item"><thead><tr><th>${_t('table_h_code')}</th><th>${_t('table_h_name')}</th>`;
    branchesToDisplay.forEach(b => { tableHTML += `<th>${b.branchName}</th>` });
    tableHTML += `<th>${_t('table_h_total')}</th></tr></thead><tbody>`;
    
    state.items.forEach(item => {
        let total = 0;
        let rowHtml = `<tr><td>${item.code}</td><td>${item.name}</td>`;
        branchesToDisplay.forEach(branch => {
            const qty = stockByBranch[branch.branchCode]?.[item.code]?.quantity || 0;
            total += qty;
            rowHtml += `<td>${qty > 0.001 ? qty.toFixed(3) : '-'}</td>`;
        });
        rowHtml += `<td><strong>${total.toFixed(3)}</strong></td></tr>`;
        tableHTML += rowHtml;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

export function renderUserManagementUI() {
    const usersTbody = document.getElementById('table-users');
    if (!usersTbody) return;
    const tbody = usersTbody.querySelector('tbody');
    tbody.innerHTML = '';
    (state.allUsers || []).forEach(user => {
        const tr = document.createElement('tr');
        const assigned = findByKey(state.branches, 'branchCode', user.AssignedBranchCode)?.branchName || 'N/A';
        const statusText = (user.isDisabled === true || String(user.isDisabled).toUpperCase() === 'TRUE') ? 'Disabled' : 'Active';
        tr.innerHTML = `<td>${user.Username}</td><td>${user.Name}</td><td>${user.RoleName}</td><td>${assigned}</td><td>${statusText}</td><td><button class="secondary small btn-edit" data-type="user" data-id="${user.Username}">${_t('edit')}</button></td>`;
        tbody.appendChild(tr);
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
