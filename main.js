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
                // Secure check for disabled account
                const isUserDisabled = data.user.isDisabled === true || String(data.user.isDisabled).toUpperCase() === 'TRUE';
                
                if (isUserDisabled) {
                    throw new Error('Account disabled.');
                }
                
                setState('currentUser', data.user);
                setState('username', username);
                setState('loginCode', code);
                
                // Load all data into local state
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
    
    // Sidebar Nav Links
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

    // Global Click Handler (Delegated Events)
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

        // View/Print Transaction Documents (History)
        if (btn.classList.contains('btn-view-tx')) {
            const batchId = btn.dataset.batchId;
            const type = btn.dataset.type;
            
            if (type === 'po') {
                const data = findByKey(state.purchaseOrders, 'poId', batchId);
                const items = state.purchaseOrderItems.filter(i => i.poId === batchId);
                if (data) Documents.generatePODocument({ ...data, items });
            } else {
                const group = state.transactions.filter(t => t.batchId === batchId);
                if (group.length > 0) {
                    const first = group[0];
                    const data = { ...first, items: group.map(t => ({
                        ...t, 
                        itemName: findByKey(state.items, 'code', t.itemCode)?.name 
                    })) };
                    
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
                        // UI Refresh: Find item in local state and update it optimistically
                        if(type === 'po') {
                            const po = findByKey(state.purchaseOrders, 'poId', id);
                            if(po) po.Status = action === 'approveFinancial' ? 'Approved' : 'Rejected';
                        } else if(type === 'receive') {
                            state.transactions.forEach(t => {
                                if(t.batchId === id) {
                                    t.isApproved = action === 'approveFinancial';
                                    t.Status = action === 'approveFinancial' ? 'Completed' : 'Rejected';
                                }
                            });
                        }
                        refreshViewData('purchasing');
                    }
                });
            }
        }

        // Item Selector Open Button (Standardized)
        if (btn.classList.contains('btn-select-items')) {
            const context = btn.dataset.context;
            state.currentSelectionModal.type = 'item-selector';
            const modal = document.getElementById('item-selector-modal');
            modal.dataset.context = context;
            modal.dataset.allowedItems = ""; // Reset filter
            
            // Logic for Butchery: Filter to show only relevant cuts?
            // Since we simplified to "ParentCode" column in sheet, we don't need complex JSON parsing anymore.
            // We just render all and let user search, OR implement logic to filter by ParentCode if needed.
            // Current implementation: Allows searching all items.
            
            state.modalSelections.clear();
            Renderers.renderItemsInModal();
            modal.classList.add('active');
        }
        
        // Auto-Generate Code Buttons
        if(btn.id === 'btn-gen-item-code') {
            const cat = document.getElementById('item-category').value.substring(0,3).toUpperCase() || 'ITM';
            const type = document.getElementById('item-type').value === 'Main' ? 'WH' : 'CUT';
            document.getElementById('item-code').value = `${cat}-${type}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        if(btn.id === 'btn-gen-invoice') {
            document.getElementById('receive-invoice').value = `INV-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;
        }
    });

    // --- FORM SUBMISSION HANDLERS (Prevent Page Reload) ---
    
    // Generic Helper for Add Data Forms
    const attachFormHandler = (formId, actionName, dataExtractor) => {
        const form = document.getElementById(formId);
        if(!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // STOP RELOAD
            const btn = form.querySelector('button[type="submit"]');
            const data = dataExtractor();
            const res = await postData(actionName, data, btn);
            if(res) {
                showToast('Added successfully!', 'success');
                // Optimistic Update
                if (actionName === 'addItem') state.items.push(data);
                if (actionName === 'addSupplier') state.suppliers.push(data);
                if (actionName === 'addBranch') state.branches.push(data);
                if (actionName === 'addSection') state.sections.push(data);
                
                form.reset();
                refreshViewData('master-data');
            }
        });
    };

    // Wiring up the Setup Forms
    attachFormHandler('form-add-item', 'addItem', () => ({
        ItemType: document.getElementById('item-type').value,
        ParentCode: document.getElementById('item-parent') ? document.getElementById('item-parent').value : '',
        code: document.getElementById('item-code').value,
        barcode: document.getElementById('item-barcode').value,
        name: document.getElementById('item-name').value,
        unit: document.getElementById('item-unit').value,
        category: document.getElementById('item-category').value,
        supplierCode: document.getElementById('item-supplier').value,
        cost: parseFloat(document.getElementById('item-cost').value) || 0
    }));

    attachFormHandler('form-add-supplier', 'addSupplier', () => ({
        supplierCode: document.getElementById('supplier-code').value,
        name: document.getElementById('supplier-name').value,
        contact: document.getElementById('supplier-contact').value
    }));

    attachFormHandler('form-add-branch', 'addBranch', () => ({
        branchCode: document.getElementById('branch-code').value,
        branchName: document.getElementById('branch-name').value
    }));

    attachFormHandler('form-add-section', 'addSection', () => ({
        sectionCode: document.getElementById('section-code').value,
        sectionName: document.getElementById('section-name').value
    }));

    // Wiring up Transaction Forms (using imported handlers)
    const bindBtn = (id, handler) => {
        const btn = document.getElementById(id);
        if(btn) btn.addEventListener('click', handler);
    };

    bindBtn('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    bindBtn('btn-submit-butchery', Transactions.handleButcherySubmit);
    bindBtn('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    bindBtn('btn-submit-po', Transactions.handlePOSubmit);
    bindBtn('btn-submit-return', Transactions.handleReturnSubmit);
    bindBtn('btn-submit-request', Transactions.handleRequestSubmit);
    bindBtn('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    // Global Refresh
    document.getElementById('global-refresh-button').addEventListener('click', async () => {
        await reloadData();
    });

    // --- MODAL LOGIC (Selection Confirmation) ---
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
                        // Default quantity empty so user has to enter it
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

    // Item Search Input in Modal
    document.getElementById('modal-search-items').addEventListener('input', (e) => {
        Renderers.renderItemsInModal(e.target.value);
    });

    // Item Checkbox Toggle
    document.getElementById('modal-item-list').addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            if (e.target.checked) state.modalSelections.add(e.target.dataset.code);
            else state.modalSelections.delete(e.target.dataset.code);
        }
    });

    // Admin Context Confirm
    const btnConfirmContext = document.getElementById('btn-confirm-context');
    if (btnConfirmContext) {
        btnConfirmContext.addEventListener('click', () => {
            const modal = document.getElementById('context-selector-modal');
            const context = {
                fromBranch: modal.querySelector('#context-modal-fromBranch-group').style.display === 'block' ? modal.querySelector('#context-from-branch-select').value : null,
                toBranch: modal.querySelector('#context-modal-toBranch-group').style.display === 'block' ? modal.querySelector('#context-to-branch-select').value : null,
                branch: modal.querySelector('#context-modal-branch-group').style.display === 'block' ? modal.querySelector('#context-branch-select').value : null,
            };

            if (Object.entries(context).some(([key, value]) => modal.querySelector(`#context-modal-${key}-group`).style.display === 'block' && !value)) {
                showToast('Please make a selection.', 'error');
                return;
            }

            if (state.adminContextPromise.resolve) state.adminContextPromise.resolve(context);
            modal.classList.remove('active');
        });
    }

    // Dynamic Parent Dropdown Logic
    const itemTypeSelect = document.getElementById('item-type');
    if(itemTypeSelect) {
        itemTypeSelect.addEventListener('change', (e) => {
            const parentGroup = document.getElementById('group-item-parent');
            if(e.target.value === 'Cut') {
                parentGroup.style.display = 'block';
                // Filter items to show only Main Units
                const mainItems = state.items.filter(i => i.ItemType === 'Main');
                populateOptions(document.getElementById('item-parent'), mainItems, 'Select Parent Carcass', 'code', 'name');
            } else {
                parentGroup.style.display = 'none';
                document.getElementById('item-parent').value = '';
            }
        });
    }
});

// --- INITIALIZATION ---

function initializeAppUI() {
    applyTranslations();
    const currentUser = state.currentUser;
    document.querySelector('.sidebar-header h1').textContent = `Hi, ${currentUser.Name.split(' ')[0]}`;
    
    // Initial Population
    populateOptions(document.getElementById('receive-branch'), state.branches, _t('branch'), 'branchCode', 'branchName');
    populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('supplier'), 'supplierCode', 'name');
    populateOptions(document.getElementById('butchery-branch'), state.branches, _t('branch'), 'branchCode', 'branchName');
    populateOptions(document.getElementById('item-supplier'), state.suppliers, _t('supplier'), 'supplierCode', 'name');
    
    showView('dashboard');
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
    
    const viewEl = document.getElementById(`view-${viewId}`);
    if (viewEl) viewEl.classList.add('active');
    
    const linkEl = document.querySelector(`a[data-view="${viewId}"]`);
    if (linkEl) linkEl.classList.add('active');
    
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
        // ... (Keep existing refresh logic from previous versions, essentially call Renderers.*)
        case 'stock-levels':
            Renderers.renderItemCentricStockView();
            break;
        case 'butchery':
            Renderers.renderButcheryListTable();
            break;
        case 'operations':
            Renderers.renderReceiveListTable();
            Renderers.renderTransferListTable();
            break;
        case 'master-data':
            Renderers.renderItemsTable();
            Renderers.renderSuppliersTable();
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
    // Re-attach submit handler for the dynamic edit form
    const form = document.getElementById('form-edit-record');
    form.dataset.type = type;
    form.dataset.id = id || '';
    
    // NOTE: The submit event listener is attached once at DOMContentLoaded in the full file, 
    // so we don't need to re-attach it here, just set data attributes.
    document.getElementById('edit-modal').classList.add('active');
}

function openHistoryModal(itemCode) {
    const modal = document.getElementById('history-modal');
    document.getElementById('history-modal-title').textContent = `${_t('history')}: ${itemCode}`;
    // Fetch logic...
    modal.classList.add('active');
}
