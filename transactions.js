// main.js
import { SCRIPT_URL } from './config.js';
import { state, setState, resetStateLists } from './state.js';
import { Logger, showToast, applyTranslations, populateOptions, findByKey, postData, setButtonLoading, _t } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import * as Renderers from './renderers.js';
import * as Transactions from './transactions.js';
import * as Documents from './documents.js';

document.addEventListener('DOMContentLoaded', () => {
    Logger.info('Initializing Meat Stock Manager...');

    // --- LOGIN HANDLER ---
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const code = document.getElementById('login-code').value;
        const loader = document.getElementById('login-loader');
        const errorEl = document.getElementById('login-error');
        
        loginForm.style.display = 'none';
        loader.style.display = 'flex';
        errorEl.textContent = '';
        
        try {
            const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(code)}`);
            const data = await response.json();
            
            if (data.status !== 'error' && data.user) {
                // Fix: Robust boolean check for isDisabled
                const isDisabled = data.user.isDisabled === true || String(data.user.isDisabled).toUpperCase() === 'TRUE';
                
                if (isDisabled) throw new Error('Account disabled.');
                
                setState('currentUser', data.user);
                setState('username', username);
                setState('loginCode', code);
                
                // Hydrate State
                Object.keys(data).forEach(key => { if (key !== 'user') setState(key, data[key]); });
                
                document.getElementById('login-container').style.display = 'none';
                document.getElementById('app-container').style.display = 'flex';
                
                initializeAppUI();
            } else {
                throw new Error(data.message || 'Invalid credentials');
            }
        } catch (error) {
            errorEl.textContent = error.message;
            loginForm.style.display = 'block';
        } finally {
            loader.style.display = 'none';
        }
    });

    // --- GLOBAL NAVIGATION & EVENT DELEGATION ---
    
    // Sidebar Nav
    document.querySelectorAll('#main-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if(link.id === 'btn-logout') { location.reload(); return; }
            
            const viewId = link.dataset.view;
            showView(viewId);
        });
    });

    // Sub-Nav Tabs
    document.querySelectorAll('.sub-nav').forEach(nav => {
        nav.addEventListener('click', (e) => {
            if (!e.target.classList.contains('sub-nav-item')) return;
            const parentView = e.target.closest('.view');
            parentView.querySelectorAll('.sub-nav-item').forEach(b => b.classList.remove('active'));
            parentView.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));
            
            e.target.classList.add('active');
            parentView.querySelector(`#subview-${e.target.dataset.subview}`).classList.add('active');
            
            refreshViewData(parentView.id.replace('view-', ''));
        });
    });

    // Global Button Listener (Edit, Print, Delete via delegation)
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        // Modal Close
        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }

        // Open Edit Modals
        if (btn.classList.contains('btn-edit')) {
            openEditModal(btn.dataset.type, btn.dataset.id);
        }

        // Open History
        if (btn.classList.contains('btn-history')) {
            openHistoryModal(btn.dataset.id);
        }

        // --- NEW: Standardized Item Selector Logic (Fix for Select Items button) ---
        if (btn.classList.contains('btn-select-items')) {
            const context = btn.dataset.context;
            state.currentSelectionModal.type = 'item-selector';
            const modal = document.getElementById('item-selector-modal');
            modal.dataset.context = context;
            
            // Butchery Logic: Set filtering rules if adding cuts
            modal.dataset.allowedItems = ""; // Reset
            if (context === 'butchery-child') {
                const parentCode = document.getElementById('butchery-parent-code').value;
                if (!parentCode) {
                    showToast("Please select a Parent Item first.", "error");
                    return; // Stop if no parent
                }
                const parentItem = findByKey(state.items, 'code', parentCode);
                if (parentItem && parentItem.DefinedCuts) {
                    const cutsArray = parentItem.DefinedCuts.split(',').map(s => s.trim());
                    modal.dataset.allowedItems = JSON.stringify(cutsArray);
                } else {
                    // Optional: If no defined cuts, you might want to show everything or nothing.
                    // Currently, renderItemsInModal handles empty/null allowedItems as "Show All" or handled logic
                }
            }

            state.modalSelections.clear();
            Renderers.renderItemsInModal();
            modal.classList.add('active');
        }

        // View/Print Transaction Documents
        if (btn.classList.contains('btn-view-tx')) {
            const batchId = btn.dataset.batchId;
            const type = btn.dataset.type;
            let data, items;
            
            if (type === 'po') {
                data = findByKey(state.purchaseOrders, 'poId', batchId);
                items = state.purchaseOrderItems.filter(i => i.poId === batchId);
                if (data) Documents.generatePODocument({ ...data, items });
            } else {
                const group = state.transactions.filter(t => t.batchId === batchId);
                if (group.length > 0) {
                    const first = group[0];
                    data = { ...first, items: group.map(t => ({...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name })) };
                    
                    if (type === 'receive') Documents.generateReceiveDocument(data);
                    else if (type.includes('transfer')) Documents.generateTransferDocument(data);
                    else if (type === 'issue') Documents.generateIssueDocument(data);
                    else if (type === 'return_out') Documents.generateReturnDocument(data);
                }
            }
        }

        // Approve/Reject Financials
        if (btn.classList.contains('btn-approve-financial') || btn.classList.contains('btn-reject-financial')) {
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            const action = btn.classList.contains('btn-approve-financial') ? 'approveFinancial' : 'rejectFinancial';
            
            if (confirm(`Are you sure you want to ${action.replace('Financial','')} this ${type}?`)) {
                postData(action, { id, type }, btn).then(res => {
                    if(res) {
                        showToast(`${type} ${action === 'approveFinancial' ? 'Approved' : 'Rejected'}`);
                        refreshViewData('purchasing');
                    }
                });
            }
        }
    });

    // --- FORM SUBMISSION BINDINGS ---
    // Imported from transactions.js
    
    const bindBtn = (id, handler) => {
        const btn = document.getElementById(id);
        if(btn) btn.addEventListener('click', handler);
    };

    bindBtn('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    bindBtn('btn-submit-butchery', Transactions.handleButcherySubmit);
    bindBtn('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    // Removed bindBtn('btn-submit-issue-batch'...) as requested
    bindBtn('btn-submit-po', Transactions.handlePOSubmit);
    bindBtn('btn-submit-return', Transactions.handleReturnSubmit);
    bindBtn('btn-submit-request', Transactions.handleRequestSubmit);
    bindBtn('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    // Global Refresh
    document.getElementById('global-refresh-button').addEventListener('click', async () => {
        await reloadData();
    });

    // --- MODAL & SELECTOR LOGIC ---
    
    // Listener for custom event (dispatched by butchery "Select Parent" button)
    document.addEventListener('openItemSelector', (e) => {
        const context = e.detail.context;
        state.currentSelectionModal.type = 'item-selector';
        const modal = document.getElementById('item-selector-modal');
        modal.dataset.context = context;
        // For parent selection, we ensure no filtering is applied from previous child selects
        modal.dataset.allowedItems = ""; 
        
        state.modalSelections.clear();
        Renderers.renderItemsInModal();
        modal.classList.add('active');
    });

    document.getElementById('modal-search-items').addEventListener('input', (e) => {
        Renderers.renderItemsInModal(e.target.value);
    });

    document.getElementById('modal-item-list').addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            if (e.target.checked) state.modalSelections.add(e.target.dataset.code);
            else state.modalSelections.delete(e.target.dataset.code);
        }
    });

    document.getElementById('btn-confirm-modal-selection').addEventListener('click', () => {
        const modal = document.getElementById('item-selector-modal');
        const context = modal.dataset.context;
        const selectedCodes = Array.from(state.modalSelections);
        
        if (context === 'butchery-parent') {
            if (selectedCodes.length > 0) {
                const item = findByKey(state.items, 'code', selectedCodes[0]);
                document.getElementById('butchery-parent-display').value = item.name;
                document.getElementById('butchery-parent-code').value = item.code;
            }
        } else {
            const addToList = (listName) => {
                selectedCodes.forEach(code => {
                    const item = findByKey(state.items, 'code', code);
                    const list = state[listName];
                    if (!list.find(i => i.itemCode === code)) {
                        list.push({ itemCode: item.code, itemName: item.name, quantity: '', cost: item.cost });
                    }
                });
            };

            if (context === 'butchery-child') {
                addToList('currentButcheryList');
                Renderers.renderButcheryListTable();
            } else if (context === 'receive') {
                addToList('currentReceiveList');
                Renderers.renderReceiveListTable();
            } else if (context === 'transfer') {
                addToList('currentTransferList');
                Renderers.renderTransferListTable();
            } else if (context === 'po') {
                addToList('currentPOList');
                Renderers.renderPOListTable();
            } else if (context === 'return') {
                addToList('currentReturnList');
                Renderers.renderReturnListTable();
            } else if (context === 'adjustment') {
                addToList('currentAdjustmentList');
                Renderers.renderAdjustmentListTable();
            }
        }
        
        modal.classList.remove('active');
        state.modalSelections.clear();
    });

    // ADMIN CONTEXT CONFIRMATION
    const btnConfirmContext = document.getElementById('btn-confirm-context');
    if (btnConfirmContext) {
        btnConfirmContext.addEventListener('click', () => {
            const modal = document.getElementById('context-selector-modal');
            const context = {
                fromBranch: modal.querySelector('#context-modal-fromBranch-group').style.display === 'block' ? modal.querySelector('#context-from-branch-select').value : null,
                toBranch: modal.querySelector('#context-modal-toBranch-group').style.display === 'block' ? modal.querySelector('#context-to-branch-select').value : null,
                branch: modal.querySelector('#context-modal-branch-group').style.display === 'block' ? modal.querySelector('#context-branch-select').value : null,
                toSection: modal.querySelector('#context-modal-toSection-group').style.display === 'block' ? modal.querySelector('#context-to-section-select').value : null,
                fromSection: modal.querySelector('#context-modal-fromSection-group').style.display === 'block' ? modal.querySelector('#context-from-section-select').value : null,
            };

            // Check validation
            if (Object.entries(context).some(([key, value]) => modal.querySelector(`#context-modal-${key}-group`).style.display === 'block' && !value)) {
                showToast('Please make a selection for all required fields.', 'error');
                return;
            }

            if (state.adminContextPromise.resolve) state.adminContextPromise.resolve(context);
            modal.classList.remove('active');
        });
    }

    // Form Edit Record Submission (Generic Update)
    document.getElementById('form-edit-record').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const type = form.dataset.type;
        const id = form.dataset.id;
        const formData = new FormData(form);
        const updates = {};
        
        // Handle DefinedCuts checkboxes specifically for Butchery Logic
        if (type === 'item') {
            const selectedCuts = [];
            form.querySelectorAll('input[name="DefinedCuts"]:checked').forEach(cb => {
                selectedCuts.push(cb.value);
            });
            // If main item, update the comma-separated string
            if (form.querySelector('input[name="ItemType"]').value === 'Main') {
                updates['DefinedCuts'] = selectedCuts.join(',');
            }
        }

        // Convert rest of FormData to object
        for (let [key, value] of formData.entries()) {
            if (key !== 'DefinedCuts' && value !== "") updates[key] = value;
        }

        let action = 'updateData';
        let payload = { type, id, updates };

        if (type === 'user') {
            action = id ? 'updateUser' : 'addUser';
            payload = id ? { Username: id, updates } : updates;
        }

        const res = await postData(action, payload, form.querySelector('button[type="submit"]'));
        if(res) {
            showToast('Update successful');
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            reloadData();
        }
    });
});

// --- HELPER FUNCTIONS ---

function initializeAppUI() {
    applyTranslations();
    const currentUser = state.currentUser;
    document.querySelector('.sidebar-header h1').textContent = `Hi, ${currentUser.Name.split(' ')[0]}`;
    
    // Initial data population
    populateOptions(document.getElementById('receive-branch'), state.branches, _t('branch'), 'branchCode', 'branchName');
    populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('supplier'), 'supplierCode', 'name');
    populateOptions(document.getElementById('butchery-branch'), state.branches, _t('branch'), 'branchCode', 'branchName');
    
    // Default View
    showView('dashboard');
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
    
    const viewEl = document.getElementById(`view-${viewId}`);
    if (viewEl) viewEl.classList.add('active');
    
    const linkEl = document.querySelector(`a[data-view="${viewId}"]`);
    if (linkEl) {
        linkEl.classList.add('active');
        document.getElementById('view-title').textContent = linkEl.querySelector('span').textContent;
    }

    refreshViewData(viewId);
}

function refreshViewData(viewId) {
    switch(viewId) {
        case 'dashboard':
            const stock = calculateStockLevels();
            let totalVal = 0;
            Object.values(stock).forEach(branchStock => {
                Object.values(branchStock).forEach(i => totalVal += (i.quantity * i.avgCost));
            });
            document.getElementById('dashboard-total-value').textContent = formatCurrency(totalVal);
            document.getElementById('dashboard-total-items').textContent = state.items.length;
            document.getElementById('dashboard-total-suppliers').textContent = state.suppliers.length;
            document.getElementById('dashboard-total-branches').textContent = state.branches.length;
            break;
        case 'butchery':
            populateOptions(document.getElementById('butchery-branch'), state.branches, _t('branch'), 'branchCode', 'branchName');
            Renderers.renderButcheryListTable();
            break;
        case 'operations':
            // Populate all operation dropdowns
            ['receive', 'transfer-from', 'transfer-to', 'return', 'adjustment'].forEach(prefix => {
                const el = document.getElementById(`${prefix}-branch`);
                if(el) populateOptions(el, state.branches, _t('branch'), 'branchCode', 'branchName');
            });
            populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('supplier'), 'supplierCode', 'name');
            populateOptions(document.getElementById('return-supplier'), state.suppliers, _t('supplier'), 'supplierCode', 'name');
            
            Renderers.renderReceiveListTable();
            Renderers.renderTransferListTable();
            Renderers.renderReturnListTable();
            Renderers.renderAdjustmentListTable();
            Renderers.renderPendingTransfers();
            Renderers.renderInTransitReport();
            break;
        case 'master-data':
            Renderers.renderItemsTable();
            Renderers.renderSuppliersTable();
            Renderers.renderBranchesTable();
            Renderers.renderSectionsTable();
            break;
        case 'stock-levels':
            Renderers.renderItemCentricStockView();
            break;
        case 'transaction-history':
            populateOptions(document.getElementById('tx-filter-branch'), state.branches, _t('all_branches'), 'branchCode', 'branchName');
            Renderers.renderTransactionHistory();
            break;
        case 'purchasing':
            populateOptions(document.getElementById('po-supplier'), state.suppliers, _t('supplier'), 'supplierCode', 'name');
            Renderers.renderPOListTable();
            Renderers.renderPurchaseOrdersViewer();
            Renderers.renderPendingFinancials();
            break;
        case 'user-management':
            postData('getAllUsersAndRoles', {}, null).then(res => {
                if(res) {
                    state.allUsers = res.data.users;
                    state.allRoles = res.data.roles;
                    Renderers.renderUserManagementUI();
                }
            });
            break;
        case 'activity-log':
            Renderers.renderActivityLog();
            break;
    }
}

async function reloadData() {
    const { username, loginCode } = state;
    try {
        const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`);
        const data = await response.json();
        if(data.status !== 'error') {
            Object.keys(data).forEach(key => { if (key !== 'user') setState(key, data[key]); });
            showToast(_t('data_refreshed_toast'));
            const activeView = document.querySelector('.view.active').id.replace('view-', '');
            refreshViewData(activeView);
        }
    } catch(e) {
        Logger.error(e);
        showToast('Reload failed', 'error');
    }
}

function openEditModal(type, id) {
    Renderers.renderEditModalContent(type, id);
    const form = document.getElementById('form-edit-record');
    form.dataset.type = type;
    form.dataset.id = id || '';
    document.getElementById('edit-modal').classList.add('active');
}

function openHistoryModal(itemCode) {
    const modal = document.getElementById('history-modal');
    document.getElementById('history-modal-title').textContent = `${_t('history')}: ${itemCode}`;
    
    postData('getItemHistory', { itemCode }, null).then(res => {
        if(res && res.data) {
            const container = document.getElementById('subview-price-history');
            let html = '<table><thead><tr><th>Date</th><th>Old</th><th>New</th><th>User</th></tr></thead><tbody>';
            res.data.priceHistory.forEach(h => {
                html += `<tr><td>${new Date(h.Timestamp).toLocaleDateString()}</td><td>${h.OldCost}</td><td>${h.NewCost}</td><td>${h.UpdatedBy}</td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        }
    });
    
    modal.classList.add('active');
}
