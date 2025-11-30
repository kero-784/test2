import { state, modalContext } from './state.js';
import { _t, findByKey, showToast, populateOptions } from './utils.js';
import { postData, reloadDataAndRefreshUI } from './api.js';
import { 
    updateReceiveGrandTotal, updateTransferGrandTotal, updatePOGrandTotal, 
    updatePOEditGrandTotal, updateReturnGrandTotal, 
    renderReceiveListTable, renderTransferListTable, renderPOListTable, renderPOEditListTable, renderReturnListTable, renderAdjustmentListTable,
    generateTransferDocument
} from './renderers.js';

export function handleTableInputUpdate(e, listName) {
    if (e.target.classList.contains('table-input')) {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        const value = e.target.type === 'number' && e.target.value !== '' ? parseFloat(e.target.value) : e.target.value;
        
        if (state[listName] && state[listName][index]) {
            state[listName][index][field] = value;
        }

        if (listName === 'currentReceiveList') updateReceiveGrandTotal();
        if (listName === 'currentTransferList') updateTransferGrandTotal();
        if (listName === 'currentPOList') updatePOGrandTotal();
        if (listName === 'currentEditingPOList') updatePOEditGrandTotal();
        if (listName === 'currentReturnList') updateReturnGrandTotal();
    }
}

export function handleTableRemove(e, listName, rendererFn) { 
    const btn = e.target.closest('button');
    if (btn && btn.classList.contains('danger') && btn.dataset.index) {
        state[listName].splice(parseInt(btn.dataset.index), 1);
        rendererFn(); 
    }
}

export function attachTableListeners(id, listKey, renderFn) {
    const t = document.getElementById(id); 
    if(!t) return;
    const newT = t.cloneNode(true);
    t.parentNode.replaceChild(newT, t);
    
    newT.addEventListener('input', e => handleTableInputUpdate(e, listKey)); 
    newT.addEventListener('click', e => {
        if (e.target.classList.contains('table-input')) e.target.select();
        handleTableRemove(e, listKey, renderFn);
    });
}

export function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    const search = document.getElementById('modal-search-items');
    if(search) search.value = '';
}

export function handleModalCheckboxChange(e) {
    if(e.target.type === 'checkbox') {
        const code = e.target.dataset.code;
        if(e.target.checked) state.modalSelections.add(code); 
        else state.modalSelections.delete(code);
    }
}

export function handleInvoiceModalCheckboxChange(e) {
    if (e.target.type === 'checkbox') {
        const num = e.target.dataset.number;
        if(e.target.checked) state.invoiceModalSelections.add(num); 
        else state.invoiceModalSelections.delete(num);
    }
}

export function openItemSelectorModal(e) {
    modalContext.value = e.target.dataset.context; 
    state.modalSelections.clear(); 
    renderItemsInModal(); 
    document.getElementById('item-selector-modal').classList.add('active');
}

export function renderItemsInModal(filter = '') {
    const list = document.getElementById('modal-item-list'); 
    const lcf = filter.toLowerCase();
    
    let html = '';
    state.items.forEach(item => {
        if((modalContext.value === 'po' && item.ParentItemCode) || !item.name.toLowerCase().includes(lcf)) return;
        html += `<div class="modal-item"><input type="checkbox" data-code="${item.code}" ${state.modalSelections.has(item.code)?'checked':''}> <label>${item.name}</label></div>`;
    });
    list.innerHTML = html;
}

export function confirmModalSelection() {
    if (modalContext.value === 'invoices') { 
        renderPaymentList(); 
        closeModal(); 
        return; 
    }

    const selectedCodes = Array.from(state.modalSelections);
    if (selectedCodes.length === 0) { closeModal(); return; }
    
    const mainItemsToProcess = new Set();
    const regularItemsToAdd = [];
    
    selectedCodes.forEach(code => {
        const item = findByKey(state.items, 'code', code);
        if (!item) return;

        if (item.ParentItemCode && modalContext.value !== 'po') {
            mainItemsToProcess.add(item.ParentItemCode);
        } else if (!item.ParentItemCode && state.items.some(sub => sub.ParentItemCode === item.code) && modalContext.value !== 'po') {
            mainItemsToProcess.add(item.code);
        } else {
            regularItemsToAdd.push(code);
        }
    });
    
    regularItemsToAdd.forEach(c => {
        const i = findByKey(state.items, 'code', c);
        const list = getContextList();
        if(list && !list.some(x => x.itemCode === i.code)) {
            list.push({ itemCode: i.code, itemName: i.name, quantity: 0, cost: i.cost });
        }
    });
    
    const mainItemCodes = Array.from(mainItemsToProcess);
    if (mainItemCodes.length > 0) {
        document.getElementById('item-selector-modal').classList.remove('active');
        openSubItemEntryModal(mainItemCodes[0], mainItemCodes.slice(1));
    } else {
        closeModal();
        renderContextTable();
    }
}

function getContextList() {
    if(modalContext.value === 'receive') return state.currentReceiveList;
    if(modalContext.value === 'transfer') return state.currentTransferList;
    if(modalContext.value === 'po') return state.currentPOList;
    if(modalContext.value === 'return') return state.currentReturnList;
    if(modalContext.value === 'edit-po') return state.currentEditingPOList;
    if(modalContext.value === 'adjustment') return state.currentAdjustmentList;
    return null;
}

function renderContextTable() {
    if(modalContext.value === 'receive') renderReceiveListTable();
    if(modalContext.value === 'transfer') renderTransferListTable();
    if(modalContext.value === 'po') renderPOListTable();
    if(modalContext.value === 'return') renderReturnListTable();
    if(modalContext.value === 'edit-po') renderPOEditListTable();
    if(modalContext.value === 'adjustment') renderAdjustmentListTable();
}

export function openSubItemEntryModal(mainCode, remaining) {
    const main = findByKey(state.items, 'code', mainCode);
    const subs = state.items.filter(i => i.ParentItemCode === mainCode);
    
    document.getElementById('sub-item-entry-modal-title').textContent = `Enter Quantities: ${main.name}`;
    
    const tbody = document.querySelector('#sub-item-entry-table tbody'); 
    let html = '';
    subs.forEach(s => {
        html += `<tr><td>${s.name}</td><td><input type="number" class="table-input sub-item-qty-input" data-code="${s.code}" min="0"></td></tr>`;
    });
    tbody.innerHTML = html;
    
    const totalCell = document.getElementById('total-sub-item-weight');
    totalCell.textContent = '0.00';
    tbody.addEventListener('input', () => {
        let t = 0;
        tbody.querySelectorAll('input').forEach(i => t += (parseFloat(i.value)||0));
        totalCell.textContent = t.toFixed(2);
    });

    const btn = document.getElementById('btn-confirm-sub-item-entry');
    const newBtn = btn.cloneNode(true); 
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.onclick = () => {
        const list = getContextList();
        let totalQty = 0;
        
        document.querySelectorAll('.sub-item-qty-input').forEach(inp => {
            const q = parseFloat(inp.value)||0; 
            totalQty += q;
            if(q > 0) {
                const subItem = findByKey(state.items, 'code', inp.dataset.code);
                list.push({ itemCode: subItem.code, itemName: subItem.name, quantity: q, cost: 0 });
            }
        });

        if(totalQty > 0) {
            list.push({ 
                itemCode: main.code, 
                itemName: main.name, 
                quantity: totalQty, 
                cost: 0, 
                isMainItemPlaceholder: true 
            });
        }
        
        document.getElementById('sub-item-entry-modal').classList.remove('active');
        
        if(remaining.length > 0) {
            openSubItemEntryModal(remaining[0], remaining.slice(1));
        } else { 
            closeModal(); 
            renderContextTable(); 
        }
    };
    
    document.getElementById('sub-item-entry-modal').classList.add('active');
}

export function openEditModal(type, id) {
    const form = document.getElementById('form-edit-record');
    const body = document.getElementById('edit-modal-body');
    const title = document.getElementById('edit-modal-title');
    form.dataset.type = type;
    form.dataset.id = id || ''; 
    
    let html = '', record;
    
    if(type === 'item') {
        record = findByKey(state.items, 'code', id);
        title.textContent = _t('edit_item');
        const isSub = !!record.ParentItemCode;
        html = `<div class="form-grid">
            <div class="form-group"><label>${_t('item_code')}</label><input type="text" value="${record.code}" readonly></div>
            <div class="form-group"><label>${_t('item_name')}</label><input type="text" name="name" value="${record.name}" required></div>
            <div class="form-group span-full" id="edit-cost-group" style="display:${isSub?'none':'block'}"><label>${_t('default_cost')}</label><input type="number" name="cost" value="${record.cost}"></div>
            <div class="form-group-checkbox span-full"><input type="checkbox" id="edit-is-sub-item-toggle" ${isSub?'checked':''}><label>${_t('is_sub_item')}</label></div>
            <div id="edit-sub-item-fields" class="form-grid span-full" style="display:${isSub?'grid':'none'}">
                <div class="form-group"><label>${_t('parent_item')}</label><select name="ParentItemCode" id="edit-parent-select"></select></div>
            </div>
        </div>`;
    } else if (type === 'user') {
        record = findByKey(state.allUsers, 'Username', id);
        title.textContent = id ? _t('edit_user') : _t('add_new_user_title');
        const uname = record ? record.Username : '';
        const name = record ? record.Name : '';
        const isDisabled = record ? (String(record.isDisabled).toUpperCase() === 'TRUE') : false;

        html = `<div class="form-grid">
            <div class="form-group"><label>${_t('username')}</label><input type="text" name="Username" value="${uname}" ${id?'readonly':'required'}></div>
            <div class="form-group"><label>${_t('table_h_fullname')}</label><input type="text" name="Name" value="${name}" required></div>
            <div class="form-group"><label>${_t('table_h_role')}</label><select name="RoleName" id="edit-user-role" required></select></div>
            <div class="form-group"><label>${_t('branch')}</label><select name="AssignedBranchCode" id="edit-user-branch"><option value="">None</option></select></div>
            <div class="form-group span-full"><label>${_t('edit_user_password_label')}</label><input type="password" name="LoginCode" ${id?'':'required'}></div>
            ${id ? `<div class="form-group span-full"><button type="button" id="btn-toggle-user-status" class="${isDisabled?'primary':'danger'}">${isDisabled?_t('toggle_user_enable'):_t('toggle_user_disable')}</button></div>` : ''}
        </div>`;
    } else if (type === 'supplier') {
        record = findByKey(state.suppliers, 'supplierCode', id);
        title.textContent = _t('edit_supplier');
        html = `<div class="form-grid"><div class="form-group"><label>${_t('supplier_code')}</label><input type="text" value="${record.supplierCode}" readonly></div><div class="form-group"><label>${_t('supplier_name')}</label><input type="text" name="name" value="${record.name}" required></div></div>`;
    } else if (type === 'branch') {
        record = findByKey(state.branches, 'branchCode', id);
        title.textContent = _t('edit_branch');
        html = `<div class="form-grid"><div class="form-group"><label>${_t('branch_code')}</label><input type="text" value="${record.branchCode}" readonly></div><div class="form-group"><label>${_t('branch_name')}</label><input type="text" name="branchName" value="${record.branchName}" required></div></div>`;
    }

    body.innerHTML = html;
    
    if(type === 'item') {
        const pSelect = document.getElementById('edit-parent-select');
        populateOptions(pSelect, state.items.filter(i => !i.ParentItemCode && i.code !== id), _t('select_parent_item'), 'code', 'name');
        if(record && record.ParentItemCode) pSelect.value = record.ParentItemCode;
        
        document.getElementById('edit-is-sub-item-toggle').onchange = (e) => {
             document.getElementById('edit-sub-item-fields').style.display = e.target.checked ? 'grid' : 'none';
             document.getElementById('edit-cost-group').style.display = e.target.checked ? 'none' : 'block';
        };
    } else if (type === 'user') {
        const rSelect = document.getElementById('edit-user-role');
        populateOptions(rSelect, state.allRoles, 'Select Role', 'RoleName', 'RoleName');
        if(record) rSelect.value = record.RoleName;
        
        const bSelect = document.getElementById('edit-user-branch');
        populateOptions(bSelect, state.branches, 'None', 'branchCode', 'branchName');
        if(record) bSelect.value = record.AssignedBranchCode;

        const toggleBtn = document.getElementById('btn-toggle-user-status');
        if(toggleBtn) {
             toggleBtn.onclick = async () => {
                 if(confirm(record.isDisabled ? _t('toggle_user_enable_confirm') : _t('toggle_user_disable_confirm'))) {
                     await postData('updateUser', { Username: id, updates: { isDisabled: !record.isDisabled } }, toggleBtn);
                     closeModal(); await reloadDataAndRefreshUI();
                 }
             };
        }
    }

    document.getElementById('edit-modal').classList.add('active');
}

export async function handleUpdateSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const type = e.target.dataset.type;
    const id = e.target.dataset.id;
    const formData = new FormData(e.target);
    let payload = {}, action = 'updateData';

    if (type === 'item') {
        const updates = {};
        for (let [key, value] of formData.entries()) updates[key] = value;
        if (!document.getElementById('edit-is-sub-item-toggle').checked) updates.ParentItemCode = ''; else updates.cost = 0;
        payload = { type, id, updates };
    } else if (type === 'user') {
        action = id ? 'updateUser' : 'addUser';
        payload = {}; 
        for (let [key, value] of formData.entries()) { 
            if (key === 'LoginCode' && value === '') continue; 
            payload[key] = value; 
        }
        if(id) { 
            payload = { Username: id, updates: {} }; 
            for (let [key, value] of formData.entries()) { 
                if (key === 'LoginCode' && value === '') continue; 
                if (key !== 'Username') payload.updates[key] = value; 
            } 
        }
    } else {
        const updates = {}; 
        for (let [key, value] of formData.entries()) updates[key] = value; 
        payload = { type, id, updates };
    }
    
    const result = await postData(action, payload, btn);
    if (result) {
        showToast(id ? _t('update_success_toast') : _t('add_success_toast'), 'success');
        closeModal();
        await reloadDataAndRefreshUI();
    }
}

export async function handleAutoBackupToggle() {
    const toggle = document.getElementById('auto-backup-toggle');
    const freq = document.getElementById('auto-backup-frequency').value;
    const res = await postData('setAutomaticBackup', { enabled: toggle.checked, frequency: freq }, toggle);
    if(res) {
        showToast(_t('auto_backup_updated_toast'), 'success');
        document.getElementById('auto-backup-status').textContent = toggle.checked ? `Active (${freq})` : 'Disabled';
        document.getElementById('auto-backup-frequency-container').style.display = toggle.checked ? 'block' : 'none';
    } else {
        toggle.checked = !toggle.checked; 
    }
}

export async function loadAndRenderBackups() {
    const container = document.getElementById('backup-list-container');
    container.innerHTML = '<div class="spinner"></div>';
    const res = await postData('listBackups', {}, null);
    if(res && res.data) {
        state.backups = res.data;
        let html = '<table><thead><tr><th>Name</th><th>Date</th><th>Action</th></tr></thead><tbody>';
        state.backups.forEach(b => html += `<tr><td>${b.name}</td><td>${new Date(b.dateCreated).toLocaleDateString()}</td><td><div class="action-buttons"><a href="${b.url}" target="_blank" class="secondary small">${_t('open')}</a><button class="danger small btn-restore" data-url="${b.url}">${_t('restore')}</button></div></td></tr>`);
        container.innerHTML = html + '</tbody></table>';
    } else {
        container.innerHTML = '<p>Failed to load.</p>';
    }
}

export function openRestoreModal(id, name) {
    document.getElementById('restore-filename-display').textContent = name;
    document.getElementById('btn-confirm-restore').dataset.backupFileId = id;
    
    const list = document.getElementById('restore-sheet-list');
    let html = '';
    ['Items', 'Suppliers', 'Branches', 'Transactions', 'Payments', 'PurchaseOrders', 'PurchaseOrderItems', 'Users', 'Permissions'].forEach(s => {
        html += `<div class="form-group-checkbox"><input type="checkbox" value="${s}" checked><label>${s}</label></div>`;
    });
    list.innerHTML = html;
    
    document.getElementById('restore-modal').classList.add('active');
}

export async function handleConfirmRestore(e) {
    const id = e.target.dataset.backupFileId;
    const sheets = Array.from(document.querySelectorAll('#restore-sheet-list input:checked')).map(i => i.value);
    if(document.getElementById('restore-confirmation-input').value !== 'RESTORE') return;
    
    const res = await postData('restoreFromBackup', { backupFileId: id, sheetsToRestore: sheets }, e.target);
    if(res) { showToast(_t('restore_completed_toast'), 'success'); closeModal(); reloadDataAndRefreshUI(); }
}

export async function loadAutoBackupSettings() {
    const res = await postData('getAutomaticBackupStatus', {}, null);
    if(res && res.data) {
        document.getElementById('auto-backup-toggle').checked = res.data.enabled;
        document.getElementById('auto-backup-frequency-container').style.display = res.data.enabled ? 'block' : 'none';
    }
}

export function handlePaymentInputChange() {
    let total = 0;
    document.querySelectorAll('.payment-amount-input').forEach(input => total += (parseFloat(input.value) || 0));
    document.getElementById('payment-total-amount').textContent = `${total.toFixed(2)} EGP`;
}

export function openInvoiceSelectorModal() { 
    modalContext.value = 'invoices'; 
    const list = document.getElementById('modal-invoice-list'); list.innerHTML = '';
    document.getElementById('invoice-selector-modal').classList.add('active'); 
}

export function openHistoryModal(itemCode) {
    postData('getItemHistory', { itemCode }, null).then(res => {
        if(res && res.data) {
             document.getElementById('history-modal').classList.add('active');
        }
    });
}

export function openViewTransferModal(batchId) {
    const txs = state.transactions.filter(t => t.batchId === batchId);
    if(!txs.length) return;
    const f = txs[0];
    const body = document.getElementById('view-transfer-modal-body');
    body.innerHTML = `<p>From: ${f.fromBranchCode}</p><p>To: ${f.toBranchCode}</p><hr><table>...</table>`; 
    
    const btn = document.getElementById('btn-print-transfer-receipt');
    if (btn) {
        const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => generateTransferDocument({ ...f, items: txs });
    }

    document.getElementById('view-transfer-modal').classList.add('active');
}

export function openPOEditModal(poId) {
    const po = findByKey(state.purchaseOrders, 'poId', poId);
    if(!po) return;
    state.currentEditingPOList = state.purchaseOrderItems.filter(i => i.poId === poId).map(i => ({ ...i, itemName: findByKey(state.items, 'code', i.itemCode)?.name }));
    
    document.getElementById('edit-po-id').value = po.poId;
    document.getElementById('edit-po-notes').value = po.notes || '';
    
    renderPOEditListTable();
    document.getElementById('edit-po-modal').classList.add('active');
}

export function openInvoiceEditModal(batchId) {
     const txs = state.transactions.filter(t => t.batchId === batchId);
     if(!txs.length) return;
     state.currentEditingPOList = txs.map(t => ({ ...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name }));
     renderPOEditListTable();
     document.getElementById('edit-po-modal').classList.add('active');
}
