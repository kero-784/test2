import { state, modalContext } from './state.js';
import { attemptLogin, reloadDataAndRefreshUI, postData } from './api.js';
import { 
    attachTableListeners, confirmModalSelection, handlePaymentInputChange, handleModalCheckboxChange, 
    handleInvoiceModalCheckboxChange, closeModal, openInvoiceSelectorModal, openItemSelectorModal, 
    openEditModal, openHistoryModal, openViewTransferModal, openPOEditModal, openInvoiceEditModal,
    handleUpdateSubmit, handleAutoBackupToggle, handleConfirmRestore, openRestoreModal, 
    loadAndRenderBackups, loadAutoBackupSettings, renderItemsInModal, attachSubNavListeners, requestAdminContext
} from './ui.js';

import { 
    renderReceiveListTable, renderTransferListTable, renderPOListTable, renderPOEditListTable, 
    renderReturnListTable, renderAdjustmentListTable, renderTransactionHistory, renderItemsTable, 
    renderSuppliersTable, renderBranchesTable, renderItemCentricStockView, renderItemInquiry,
    renderSupplierStatement, renderSalesDiscrepancyReport
} from './renderers.js';

import { applyTranslations, _t, showToast, findByKey, populateOptions, generateId, setButtonLoading } from './utils.js';
import { calculateStockLevels, prepareListForSubmission } from './calculations.js';

window.printReport = function(elementId) {
    const reportContent = document.querySelector(`#${elementId} .printable-document`);
    if (reportContent) {
        document.getElementById('print-area').innerHTML = reportContent.outerHTML;
        setTimeout(() => window.print(), 100);
    } else {
        alert("Error: Report content not found.");
    }
};

async function handleTransactionSubmit(payload, buttonEl) {
    const action = payload.type === 'po' ? 'addPurchaseOrder' : 'addTransactionBatch';
    payload.items = prepareListForSubmission(payload.items);
    const result = await postData(action, payload, buttonEl);
    if (result) {
        showToast(_t('tx_processed_toast', { txType: payload.type }), 'success');
        if (payload.type === 'receive') { state.currentReceiveList = []; document.getElementById('form-receive-details').reset(); renderReceiveListTable(); }
        else if (payload.type === 'transfer_out') { state.currentTransferList = []; document.getElementById('form-transfer-details').reset(); document.getElementById('transfer-ref').value = generateId('TRN'); renderTransferListTable(); }
        else if (payload.type === 'po') { state.currentPOList = []; document.getElementById('form-po-details').reset(); document.getElementById('po-ref').value = generateId('PO'); renderPOListTable(); }
        else if (payload.type === 'return_out') { state.currentReturnList = []; document.getElementById('form-return-details').reset(); renderReturnListTable(); }
        await reloadDataAndRefreshUI();
    }
}

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
             populateOptions(txBranch, state.branches, _t('all_branches'), 'branchCode', 'branchName');
             renderTransactionHistory();
             break;
        case 'master-data':
            renderItemsTable(); renderSuppliersTable(); renderBranchesTable();
            break;
        case 'operations':
            populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
            populateOptions(document.getElementById('receive-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
            populateOptions(document.getElementById('transfer-from-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
            populateOptions(document.getElementById('transfer-to-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
            renderReceiveListTable(); renderTransferListTable();
            break;
        case 'purchasing':
             populateOptions(document.getElementById('po-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
             renderPOListTable(); 
             break;
        case 'stock-levels':
             populateOptions(document.getElementById('stock-levels-branch-filter'), state.branches, '', 'branchCode', 'branchName');
             renderItemCentricStockView();
             break;
        case 'reports':
             populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, _t('select_a_supplier'), 'supplierCode', 'name');
             break;
    }
    applyTranslations();
}

function attachEventListeners() {
    document.getElementById('btn-logout').onclick = () => location.reload();
    document.getElementById('global-refresh-button').onclick = reloadDataAndRefreshUI;
    document.getElementById('auto-backup-toggle').onchange = handleAutoBackupToggle;
    document.getElementById('form-edit-record').onsubmit = handleUpdateSubmit;

    document.getElementById('btn-submit-receive-batch').onclick = async (e) => {
        const payload = { type: 'receive', batchId: generateId('GRN'), supplierCode: document.getElementById('receive-supplier').value, branchCode: document.getElementById('receive-branch').value, invoiceNumber: document.getElementById('receive-invoice').value, date: new Date(), items: state.currentReceiveList };
        await handleTransactionSubmit(payload, e.target);
    };
    
    // Attach Sub Navs
    attachSubNavListeners();

    // Tables
    attachTableListeners('table-receive-list', 'currentReceiveList', renderReceiveListTable);
    attachTableListeners('table-transfer-list', 'currentTransferList', renderTransferListTable);
    
    // Modals
    document.getElementById('btn-confirm-modal-selection').onclick = confirmModalSelection;
    document.getElementById('modal-item-list').addEventListener('change', handleModalCheckboxChange);
    document.getElementById('modal-search-items').addEventListener('input', (e) => renderItemsInModal(e.target.value));
    
    // Reports
    document.getElementById('btn-generate-supplier-statement').addEventListener('click', () => {
        const s = document.getElementById('supplier-statement-select').value;
        const d1 = document.getElementById('statement-start-date').value;
        const d2 = document.getElementById('statement-end-date').value;
        if(s) renderSupplierStatement(s, d1, d2);
    });
    document.getElementById('btn-generate-sales-report').addEventListener('click', renderSalesDiscrepancyReport);

    // Admin Context
    document.getElementById('btn-confirm-context').addEventListener('click', () => {
        const context = {
            fromBranch: document.getElementById('context-from-branch-select').value,
            toBranch: document.getElementById('context-to-branch-select').value,
            branch: document.getElementById('context-branch-select').value
        };
        if(state.adminContextPromise.resolve) state.adminContextPromise.resolve(context);
        document.getElementById('context-selector-modal').classList.remove('active');
    });

    document.querySelectorAll('#main-nav a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${link.dataset.view}`).classList.add('active');
            refreshViewData(link.dataset.view);
            document.querySelectorAll('#main-nav a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
        });
    });

    document.querySelector('.main-content').addEventListener('click', e => {
        if(e.target.classList.contains('btn-edit')) openEditModal(e.target.dataset.type, e.target.dataset.id);
        if(e.target.dataset.context) {
             modalContext.value = e.target.dataset.context; 
             state.modalSelections.clear();
             renderItemsInModal();
             openItemSelectorModal(e);
        }
    });
    
    document.getElementById('stock-levels-search')?.addEventListener('input', renderItemCentricStockView);
}

export function initializeAppUI() {
    document.getElementById('user-branch-display').textContent = state.currentUser?.AssignedBranchCode || '';
    document.getElementById('login-container').style.display = 'none'; 
    document.getElementById('app-container').style.display = 'flex';
    
    attachEventListeners();
    document.querySelector('[data-view="dashboard"]').click();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const success = await attemptLogin(document.getElementById('login-username').value.trim(), document.getElementById('login-code').value);
    if(success) initializeAppUI();
});
