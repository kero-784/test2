import { state } from './state.js';
import { attemptLogin, reloadDataAndRefreshUI, postData } from './api.js';
import { attachTableListeners } from './ui.js';
import { renderReceiveListTable, renderTransferListTable, renderPOListTable, renderTransactionHistory, renderReturnListTable } from './renderers.js';
import { applyTranslations, _t, showToast, findByKey, populateOptions, userCan, generateId } from './utils.js';
import { calculateStockLevels } from './calculations.js';

// --- Make Print Global ---
window.printReport = function(elementId) {
    const reportContent = document.querySelector(`#${elementId} .printable-document`);
    if (reportContent) {
        document.getElementById('print-area').innerHTML = reportContent.outerHTML;
        setTimeout(() => window.print(), 100);
    } else { alert("Report not found"); }
};

function refreshViewData(viewId) {
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
             populateOptions(document.getElementById('tx-filter-branch'), state.branches, _t('all_branches'), 'branchCode', 'branchName');
             populateOptions(document.getElementById('tx-filter-supplier'), state.suppliers, 'All Suppliers', 'supplierCode', 'name');
             renderTransactionHistory();
             break;
        // ... (Add remaining cases here: master-data, operations, etc.)
    }
    applyTranslations();
}

// Listen for refresh event from API
document.addEventListener('dataRefreshed', (e) => refreshViewData(e.detail.view));

function attachEventListeners() {
    document.getElementById('btn-logout').onclick = () => location.reload();
    document.getElementById('global-refresh-button').onclick = reloadDataAndRefreshUI;

    attachTableListeners('table-receive-list', 'currentReceiveList', renderReceiveListTable);
    attachTableListeners('table-transfer-list', 'currentTransferList', renderTransferListTable);
    
    document.querySelectorAll('#main-nav a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${link.dataset.view}`).classList.add('active');
            refreshViewData(link.dataset.view);
        });
    });
}

export function initializeAppUI() {
    document.getElementById('user-branch-display').textContent = state.currentUser?.AssignedBranchCode || '';
    attachEventListeners(); 
    document.querySelector('[data-view="dashboard"]').click();
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    attemptLogin(document.getElementById('login-username').value.trim(), document.getElementById('login-code').value);
});