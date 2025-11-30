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
                const isDisabled = data.user.isDisabled === true || String(data.user.isDisabled).toUpperCase() === 'TRUE';
                if (isDisabled) throw new Error('Account disabled.');
                
                setState('currentUser', data.user);
                setState('username', username);
                setState('loginCode', code);
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

    // --- UI HELPERS (Auto-Generators & Parent Logic) ---
    
    // Toggle Parent Dropdown based on Item Type
    const itemTypeSelect = document.getElementById('item-type');
    if(itemTypeSelect) {
        itemTypeSelect.addEventListener('change', (e) => {
            const parentGroup = document.getElementById('group-item-parent');
            if(e.target.value === 'Cut') {
                parentGroup.style.display = 'block';
                // Populate with Main items only
                const mains = state.items.filter(i => i.ItemType === 'Main');
                populateOptions(document.getElementById('item-parent'), mains, 'Select Parent', 'code', 'name');
            } else {
                parentGroup.style.display = 'none';
                document.getElementById('item-parent').value = '';
            }
        });
    }

    // Auto-Generate Item Code
    document.getElementById('btn-gen-item-code')?.addEventListener('click', () => {
        const cat = document.getElementById('item-category').value.toUpperCase().substring(0, 3) || 'ITM';
        const type = document.getElementById('item-type').value === 'Main' ? 'WH' : 'CUT';
        const rnd = Math.floor(100 + Math.random() * 900);
        document.getElementById('item-code').value = `${cat}-${type}-${rnd}`;
    });

    // Auto-Generate Invoice Number
    document.getElementById('btn-gen-invoice')?.addEventListener('click', () => {
        document.getElementById('receive-invoice').value = `INV-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${Math.floor(Math.random()*1000)}`;
    });

    // --- GLOBAL NAVIGATION & EVENT DELEGATION ---
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

    // Global Button Listener
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
        if (btn.classList.contains('btn-edit')) { openEditModal(btn.dataset.type, btn.dataset.id); }
        if (btn.classList.contains('btn-history')) { openHistoryModal(btn.dataset.id); }

        if (btn.classList.contains('btn-view-tx')) {
            const batchId = btn.dataset.batchId;
            const type = btn.dataset.type;
            const group = state.transactions.filter(t => t.batchId === batchId);
            if (group.length > 0) {
                const first = group[0];
                // Lookup full item details for printing
                const data = { 
                    ...first, 
                    items: group.map(t => {
                        const itemDef = findByKey(state.items, 'code', t.itemCode);
                        return {
                            ...t,
                            itemName: itemDef ? itemDef.name : t.itemCode,
                            unit: itemDef ? itemDef.unit : 'Unit'
                        };
                    }) 
                };
                
                if (type === 'receive') Documents.generateReceiveDocument(data);
                else if (type.includes('transfer')) Documents.generateTransferDocument(data);
                else if (type === 'return_out') Documents.generateReturnDocument(data);
            }
        }

        if (btn.classList.contains('btn-select-items')) {
            const context = btn.dataset.context;
            state.currentSelectionModal.type = 'item-selector';
            const modal = document.getElementById('item-selector-modal');
            modal.dataset.context = context;
            modal.dataset.allowedItems = ""; 
            if (context === 'butchery-child') {
                const parentCode = document.getElementById('butchery-parent-code').value;
                if (!parentCode) { showToast("Please select a Parent Item first.", "error"); return; }
                
                // NEW: Filter items where ParentCode matches current parent
                const allowed = state.items.filter(i => i.ParentCode === parentCode).map(i => i.code);
                modal.dataset.allowedItems = JSON.stringify(allowed);
            }
            state.modalSelections.clear();
            Renderers.renderItemsInModal();
            modal.classList.add('active');
        }
    });

    // --- SETUP FORM HANDLERS (Prevent Reload) ---
    const attachFormHandler = (formId, actionName, dataExtractor) => {
        const form = document.getElementById(formId);
        if(!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const data = dataExtractor();
            const res = await postData(actionName, data, btn);
            if(res) {
                showToast(_t('add_success_toast'), 'success');
                // Optimistic update for local lists
                if (actionName === 'addItem') state.items.push(data);
                if (actionName === 'addSupplier') state.suppliers.push(data);
                if (actionName === 'addBranch') state.branches.push(data);
                form.reset();
                // We don't hard reload for Master Data to keep it fast, just refresh UI if needed
                refreshViewData('master-data');
            }
        });
    };

    attachFormHandler('form-add-item', 'addItem', () => ({
        ItemType: document.getElementById('item-type').value,
        ParentCode: document.getElementById('item-parent').value, // Capture the parent link
        code: document.getElementById('item-code').value,
        barcode: document.getElementById('item-barcode').value,
        name: document.getElementById('item-name').value,
        unit: document.getElementById('item-unit').value,
        category: document.getElementById('item-category').value,
        supplierCode: document.getElementById('item-supplier').value,
        cost: parseFloat(document.getElementById('item-cost').value)
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

    // --- TRANSACTION BUTTON BINDINGS ---
    const bindBtn = (id, handler) => { const btn = document.getElementById(id); if(btn) btn.addEventListener('click', handler); };
    bindBtn('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    bindBtn('btn-submit-butchery', Transactions.handleButcherySubmit);
    bindBtn('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    bindBtn('btn-submit-return', Transactions.handleReturnSubmit);
    bindBtn('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    document.getElementById('global-refresh-button').addEventListener('click', async () => { await reloadData(); });

    // --- MODAL CONFIRMATION ---
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
            if (context === 'butchery-child') { addToList('currentButcheryList'); Renderers.renderButcheryListTable(); } 
            else if (context === 'receive') { addToList('currentReceiveList'); Renderers.renderReceiveListTable(); } 
            else if (context === 'transfer') { addToList('currentTransferList'); Renderers.renderTransferListTable(); } 
            else if (context === 'return') { addToList('currentReturnList'); Renderers.renderReturnListTable(); } 
            else if (context === 'adjustment') { addToList('currentAdjustmentList'); Renderers.renderAdjustmentListTable(); }
        }
        modal.classList.remove('active');
        state.modalSelections.clear();
    });

    document.getElementById('modal-search-items').addEventListener('input', (e) => { Renderers.renderItemsInModal(e.target.value); });
    document.getElementById('modal-item-list').addEventListener('change', (e) => { if (e.target.type === 'checkbox') { if (e.target.checked) state.modalSelections.add(e.target.dataset.code); else state.modalSelections.delete(e.target.dataset.code); } });
});

// --- HELPER FUNCTIONS ---
function initializeAppUI() {
    applyTranslations();
    const currentUser = state.currentUser;
    document.querySelector('.sidebar-header h1').textContent = `Hi, ${currentUser.Name.split(' ')[0]}`;
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
            Object.values(stock).forEach(branchStock => { Object.values(branchStock).forEach(i => totalVal += (i.quantity * i.avgCost)); });
            document.getElementById('dashboard-total-value').textContent = formatCurrency(totalVal);
            document.getElementById('dashboard-total-items').textContent = state.items.length;
            break;
        case 'butchery':
            populateOptions(document.getElementById('butchery-branch'), state.branches, _t('branch'), 'branchCode', 'branchName');
            Renderers.renderButcheryListTable();
            break;
        case 'operations':
            ['receive', 'transfer-from', 'transfer-to', 'return', 'adjustment'].forEach(prefix => {
                const el = document.getElementById(`${prefix}-branch`);
                if(el) populateOptions(el, state.branches, _t('branch'), 'branchCode', 'branchName');
            });
            Renderers.renderReceiveListTable();
            Renderers.renderTransferListTable();
            break;
        case 'master-data':
            Renderers.renderItemsTable();
            Renderers.renderSuppliersTable();
            break;
        case 'stock-levels':
            Renderers.renderItemCentricStockView();
            break;
        case 'transaction-history':
            populateOptions(document.getElementById('tx-filter-branch'), state.branches, _t('all_branches'), 'branchCode', 'branchName');
            Renderers.renderTransactionHistory();
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
    } catch(e) { Logger.error(e); }
}

function openEditModal(type, id) { Renderers.renderEditModalContent(type, id); document.getElementById('edit-modal').classList.add('active'); }
function openHistoryModal(itemCode) { /* (Same as before) */ }
