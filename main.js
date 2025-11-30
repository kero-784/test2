import { state, modalContext } from './state.js';
import { attemptLogin, reloadDataAndRefreshUI, postData } from './api.js';
import { 
    attachTableListeners, 
    confirmModalSelection, 
    handlePaymentInputChange, 
    handleModalCheckboxChange, 
    handleInvoiceModalCheckboxChange, 
    closeModal, 
    openInvoiceSelectorModal, 
    openItemSelectorModal, 
    openEditModal, 
    openHistoryModal, 
    openViewTransferModal, 
    openPOEditModal, 
    openInvoiceEditModal,
    handleUpdateSubmit,
    handleAutoBackupToggle,
    handleConfirmRestore,
    openRestoreModal,
    loadAndRenderBackups,
    loadAutoBackupSettings
} from './ui.js';

import { 
    renderReceiveListTable, 
    renderTransferListTable, 
    renderPOListTable, 
    renderPOEditListTable, 
    renderReturnListTable, 
    renderAdjustmentListTable, 
    renderTransactionHistory, 
    renderItemsTable, 
    renderSuppliersTable, 
    renderBranchesTable,
    renderItemCentricStockView,
    renderItemInquiry
} from './renderers.js';

import { applyTranslations, _t, showToast, findByKey, populateOptions, userCan, generateId, setButtonLoading } from './utils.js';
import { calculateStockLevels, prepareListForSubmission, calculateSupplierFinancials } from './calculations.js';

// --- GLOBAL PRINT HELPER ---
window.printReport = function(elementId) {
    const reportContent = document.querySelector(`#${elementId} .printable-document`);
    if (reportContent) {
        document.getElementById('print-area').innerHTML = reportContent.outerHTML;
        setTimeout(() => window.print(), 100);
    } else {
        alert("Error: Report content not found.");
    }
};

// --- LOCAL RENDERERS & SUBMIT LOGIC ---

function renderActivityLog() {
    const tbody = document.getElementById('table-activity-log').querySelector('tbody');
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

function renderSettlementHistory() {
    const tbody = document.getElementById('table-settlement-history').querySelector('tbody');
    tbody.innerHTML = '';
    if (!state.settlements || state.settlements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No settlement history found.</td></tr>`;
        return;
    }
    state.settlements.slice().reverse().forEach(settlement => {
        const branch = findByKey(state.branches, 'branchCode', settlement.branchCode);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${settlement.settlementId}</td><td>${new Date(settlement.date).toLocaleString()}</td><td>${branch?.branchName || settlement.branchCode}</td><td>${settlement.settledBy}</td><td><button class="secondary small btn-view-settlement" data-id="${settlement.settlementId}">${_t('view_settlement')}</button></td>`;
        tbody.appendChild(tr);
    });
}

function renderUserManagementUI() {
    const usersTbody = document.getElementById('table-users').querySelector('tbody');
    usersTbody.innerHTML = '';
    (state.allUsers || []).forEach(user => {
        const tr = document.createElement('tr');
        const assigned = findByKey(state.branches, 'branchCode', user.AssignedBranchCode);
        const isDisabled = user.isDisabled === true || String(user.isDisabled).toUpperCase() === 'TRUE';
        tr.innerHTML = `<td>${user.Username}</td><td>${user.Name}</td><td>${user.RoleName}</td><td>${assigned?.branchName || 'N/A'}</td><td><span class="status-tag ${isDisabled ? 'status-rejected' : 'status-approved'}">${isDisabled ? 'Disabled' : 'Active'}</span></td><td><button class="secondary small btn-edit" data-type="user" data-id="${user.Username}">${_t('edit')}</button></td>`;
        usersTbody.appendChild(tr);
    });
    const rolesTbody = document.getElementById('table-roles').querySelector('tbody');
    rolesTbody.innerHTML = '';
    (state.allRoles || []).forEach(role => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${role.RoleName}</td><td><button class="secondary small btn-edit" data-type="role" data-id="${role.RoleName}">${_t('edit')}</button></td>`;
        rolesTbody.appendChild(tr);
    });
}

async function handleTransactionSubmit(payload, buttonEl) {
    const action = payload.type === 'po' ? 'addPurchaseOrder' : 'addTransactionBatch';
    payload.items = prepareListForSubmission(payload.items);
    const result = await postData(action, payload, buttonEl);
    if (result) {
        showToast(_t('tx_processed_toast'), 'success');
        if (payload.type === 'receive') { state.currentReceiveList = []; document.getElementById('form-receive-details').reset(); renderReceiveListTable(); }
        else if (payload.type === 'transfer_out') { state.currentTransferList = []; document.getElementById('form-transfer-details').reset(); document.getElementById('transfer-ref').value = generateId('TRN'); renderTransferListTable(); }
        else if (payload.type === 'po') { state.currentPOList = []; document.getElementById('form-po-details').reset(); document.getElementById('po-ref').value = generateId('PO'); renderPOListTable(); }
        else if (payload.type === 'return_out') { state.currentReturnList = []; document.getElementById('form-return-details').reset(); renderReturnListTable(); }
        await reloadDataAndRefreshUI();
    }
}

// --- VIEW SWITCHER ---
async function refreshViewData(viewId) {
    if (!state.currentUser) return;
    switch(viewId) {
        case 'dashboard':
            const stock = calculateStockLevels();
            document.getElementById('dashboard-total-items').textContent = (state.items || []).length;
            let totalValue = 0;
            Object.values(stock).forEach(bs => Object.values(bs).forEach(i => totalValue += i.quantity * i.avgCost));
            document.getElementById('dashboard-total-value').textContent = `${totalValue.toFixed(2)} EGP`;
            break;
        case 'transaction-history':
             const txBranch = document.getElementById('tx-filter-branch');
             const txSup = document.getElementById('tx-filter-supplier');
             populateOptions(txBranch, state.branches, _t('all_branches'), 'branchCode', 'branchName');
             if(txSup) populateOptions(txSup, state.suppliers, 'All Suppliers', 'supplierCode', 'name');
             renderTransactionHistory();
             break;
        case 'master-data':
            renderItemsTable(); renderSuppliersTable(); renderBranchesTable();
            break;
        case 'backup':
            loadAndRenderBackups(); loadAutoBackupSettings();
            break;
        case 'operations':
            populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
            populateOptions(document.getElementById('receive-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
            populateOptions(document.getElementById('transfer-from-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
            populateOptions(document.getElementById('transfer-to-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
            populateOptions(document.getElementById('receive-po-select'), state.purchaseOrders.filter(po => po.Status === 'Approved'), _t('select_a_po'), 'poId', 'poId');
            renderReceiveListTable(); renderTransferListTable();
            break;
        case 'purchasing':
             populateOptions(document.getElementById('po-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
             renderPOListTable(); 
             break;
        case 'stock-levels':
             renderItemCentricStockView();
             break;
        case 'user-management':
            const res = await postData('getAllUsersAndRoles', {}, null);
            if (res) { state.allUsers = res.data.users; state.allRoles = res.data.roles; renderUserManagementUI(); }
            break;
        case 'activity-log': renderActivityLog(); break;
    }
    applyTranslations();
}

// --- EVENT BINDING ---
function attachEventListeners() {
    document.getElementById('btn-logout').onclick = () => location.reload();
    document.getElementById('global-refresh-button').onclick = reloadDataAndRefreshUI;
    document.getElementById('btn-create-backup').onclick = async (e) => { if(confirm('Create Backup?')) { await postData('createBackup', {}, e.target); loadAndRenderBackups(); }};
    document.getElementById('auto-backup-toggle').onchange = handleAutoBackupToggle;
    document.getElementById('btn-confirm-restore').onclick = handleConfirmRestore;
    document.getElementById('form-edit-record').onsubmit = handleUpdateSubmit;

    document.getElementById('btn-submit-receive-batch').onclick = async (e) => {
        const payload = { type: 'receive', batchId: generateId('GRN'), supplierCode: document.getElementById('receive-supplier').value, branchCode: document.getElementById('receive-branch').value, invoiceNumber: document.getElementById('receive-invoice').value, date: new Date(), items: state.currentReceiveList };
        await handleTransactionSubmit(payload, e.target);
    };
    
    // Attach Tables
    attachTableListeners('table-receive-list', 'currentReceiveList', renderReceiveListTable);
    attachTableListeners('table-transfer-list', 'currentTransferList', renderTransferListTable);
    attachTableListeners('table-po-list', 'currentPOList', renderPOListTable);
    
    // Modals
    document.getElementById('btn-confirm-modal-selection').onclick = confirmModalSelection;
    document.getElementById('modal-item-list').addEventListener('change', handleModalCheckboxChange);
    document.getElementById('modal-search-items').addEventListener('input', (e) => {
        const list = document.getElementById('modal-item-list'); list.innerHTML = '';
        state.items.forEach(i => {
            if(i.name.toLowerCase().includes(e.target.value.toLowerCase())) 
                list.innerHTML += `<div class="modal-item"><input type="checkbox" data-code="${i.code}"> ${i.name}</div>`;
        });
    });

    // Main Nav
    document.querySelectorAll('#main-nav a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${link.dataset.view}`).classList.add('active');
            refreshViewData(link.dataset.view);
        });
    });

    // Sub Nav
    document.querySelectorAll('.sub-nav-item').forEach(btn => {
        btn.addEventListener('click', e => {
             const parent = btn.closest('.view');
             parent.querySelectorAll('.sub-nav-item').forEach(b => b.classList.remove('active'));
             parent.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));
             btn.classList.add('active');
             parent.querySelector(`#subview-${btn.dataset.subview}`).classList.add('active');
        });
    });

    // Main Content Click Delegation
    document.querySelector('.main-content').addEventListener('click', e => {
        if(e.target.classList.contains('btn-edit')) openEditModal(e.target.dataset.type, e.target.dataset.id);
        if(e.target.dataset.context) {
             modalContext = e.target.dataset.context;
             state.modalSelections.clear();
             // renderItemsInModal() logic inline here or imported if complex
             openItemSelectorModal(e);
        }
    });
}

export function initializeAppUI() {
    document.getElementById('user-branch-display').textContent = state.currentUser?.AssignedBranchCode || '';
    attachEventListeners();
    document.querySelector('[data-view="dashboard"]').click();
}

// Init
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    attemptLogin(document.getElementById('login-username').value.trim(), document.getElementById('login-code').value);
});
