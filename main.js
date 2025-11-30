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
    if (loginForm) {
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
    }

    // --- UI HELPERS (Auto-Generators & Parent Logic) ---
    
    // Toggle Parent Dropdown based on Item Type
    const itemTypeSelect = document.getElementById('item-type');
    if(itemTypeSelect) {
        itemTypeSelect.addEventListener('change', (e) => {
            const parentGroup = document.getElementById('group-item-parent');
            if(e.target.value === 'Cut') {
                parentGroup.style.display = 'block';
                // Populate with Main items only
                const mainItems = state.items.filter(i => i.ItemType === 'Main');
                populateOptions(document.getElementById('item-parent'), mainItems, 'Select Parent Carcass', 'code', 'name');
            } else {
                parentGroup.style.display = 'none';
                const itemParentEl = document.getElementById('item-parent');
                if(itemParentEl) itemParentEl.value = '';
            }
        });
    }

    // Auto-Generate Item Code
    const btnGenItemCode = document.getElementById('btn-gen-item-code');
    if(btnGenItemCode) {
        btnGenItemCode.addEventListener('click', () => {
            const catElem = document.getElementById('item-category');
            const typeElem = document.getElementById('item-type');
            
            if(!catElem || !typeElem) return;

            const cat = catElem.value ? catElem.value.toUpperCase().substring(0, 3) : 'ITM';
            const type = typeElem.value === 'Main' ? 'WH' : 'CUT';
            const rnd = Math.floor(100 + Math.random() * 900);
            document.getElementById('item-code').value = `${cat}-${type}-${rnd}`;
        });
    }

    // Auto-Generate Invoice Number
    const btnGenInvoice = document.getElementById('btn-gen-invoice');
    if(btnGenInvoice) {
        btnGenInvoice.addEventListener('click', () => {
            const invElem = document.getElementById('receive-invoice');
            if(invElem) invElem.value = `INV-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${Math.floor(Math.random()*1000)}`;
        });
    }

    // --- GLOBAL NAVIGATION ---
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

    // --- GLOBAL BUTTON LISTENER (Event Delegation) ---
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
            
            if (type === 'po') {
                const data = findByKey(state.purchaseOrders, 'poId', batchId);
                const items = state.purchaseOrderItems.filter(i => i.poId === batchId);
                if (data) Documents.generatePODocument({ ...data, items });
            } else {
                const group = state.transactions.filter(t => t.batchId === batchId);
                if (group.length > 0) {
                    const first = group[0];
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
                    else if (type === 'issue') Documents.generateIssueDocument(data);
                    else if (type === 'return_out') Documents.generateReturnDocument(data);
                }
            }
        }

        if (btn.classList.contains('btn-approve-financial') || btn.classList.contains('btn-reject-financial')) {
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            const action = btn.classList.contains('btn-approve-financial') ? 'approveFinancial' : 'rejectFinancial';
            
            if (confirm(`Are you sure you want to ${action.replace('Financial','')} this ${type}?`)) {
                postData(action, { id, type }, btn).then(res => {
                    if(res) {
                        showToast(`${type} ${action === 'approveFinancial' ? 'Approved' : 'Rejected'}`);
                        // Optimistic update for approval status
                        if (type === 'receive') {
                            state.transactions.forEach(t => {
                                if (t.batchId === id) {
                                    t.isApproved = (action === 'approveFinancial');
                                    t.Status = action === 'approveFinancial' ? 'Completed' : 'Rejected';
                                }
                            });
                        }
                        refreshViewData('purchasing');
                    }
                });
            }
        }

        if (btn.classList.contains('btn-select-items')) {
            const context = btn.dataset.context;
            state.currentSelectionModal.type = 'item-selector';
            const modal = document.getElementById('item-selector-modal');
            modal.dataset.context = context;
            modal.dataset.allowedItems = ""; 
            
            if (context === 'butchery-child') {
                const parentCodeEl = document.getElementById('butchery-parent-code');
                const parentCode = parentCodeEl ? parentCodeEl.value : null;
                
                if (!parentCode) { showToast("Please select a Parent Item first.", "error"); return; }
                
                // Filter to allow only items where ParentCode matches current parent
                const allowed = state.items.filter(i => i.ParentCode === parentCode).map(i => i.code);
                modal.dataset.allowedItems = JSON.stringify(allowed);
            }
            state.modalSelections.clear();
            Renderers.renderItemsInModal();
            modal.classList.add('active');
        }
    });

    // --- SAFE FORM HANDLERS ---
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };

    const attachFormHandler = (formId, actionName, dataExtractor) => {
        const form = document.getElementById(formId);
        if(!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            try {
                const data = dataExtractor();
                const res = await postData(actionName, data, btn);
                if(res) {
                    showToast(_t('add_success_toast'), 'success');
                    if (actionName === 'addItem') state.items.push(data);
                    if (actionName === 'addSupplier') state.suppliers.push(data);
                    if (actionName === 'addBranch') state.branches.push(data);
                    if (actionName === 'addSection') state.sections.push(data);
                    form.reset();
                    refreshViewData('master-data');
                }
            } catch (err) {
                console.error("Form error:", err);
                showToast("Error processing form.", "error");
            }
        });
    };

    attachFormHandler('form-add-item', 'addItem', () => ({
        ItemType: getValue('item-type'),
        ParentCode: getValue('item-parent'),
        code: getValue('item-code'),
        barcode: getValue('item-barcode'),
        name: getValue('item-name'),
        unit: getValue('item-unit'),
        category: getValue('item-category'),
        supplierCode: getValue('item-supplier'),
        cost: parseFloat(getValue('item-cost')) || 0
    }));

    attachFormHandler('form-add-supplier', 'addSupplier', () => ({
        supplierCode: getValue('supplier-code'),
        name: getValue('supplier-name'),
        contact: getValue('supplier-contact')
    }));

    attachFormHandler('form-add-branch', 'addBranch', () => ({
        branchCode: getValue('branch-code'),
        branchName: getValue('branch-name')
    }));

    attachFormHandler('form-add-section', 'addSection', () => ({
        sectionCode: getValue('section-code'),
        sectionName: getValue('section-name')
    }));

    // --- TRANSACTION BINDINGS ---
    const bindBtn = (id, handler) => { const btn = document.getElementById(id); if(btn) btn.addEventListener('click', handler); };
    bindBtn('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    bindBtn('btn-submit-butchery', Transactions.handleButcherySubmit);
    bindBtn('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    bindBtn('btn-submit-return', Transactions.handleReturnSubmit);
    bindBtn('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    document.getElementById('global-refresh-button').addEventListener('click', async () => { await reloadData(); });

    // --- MODAL CONFIRMATION ---
    const confirmBtn = document.getElementById('btn-confirm-modal-selection');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
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
    }

    const modalSearch = document.getElementById('modal-search-items');
    if(modalSearch) modalSearch.addEventListener('input', (e) => { Renderers.renderItemsInModal(e.target.value); });
    
    const modalList = document.getElementById('modal-item-list');
    if(modalList) modalList.addEventListener('change', (e) => { if (e.target.type === 'checkbox') { if (e.target.checked) state.modalSelections.add(e.target.dataset.code); else state.modalSelections.delete(e.target.dataset.code); } });

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

    // Generic Edit Form Submission
    const editForm = document.getElementById('form-edit-record');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const type = form.dataset.type;
            const id = form.dataset.id;
            const formData = new FormData(form);
            const updates = {};
            
            // Handle DefinedCuts checkboxes specifically if needed, 
            // though standard ParentCode logic replaces this now.
            // Keeping generic handler for other fields:
            for (let [key, value] of formData.entries()) {
                if (value !== "") updates[key] = value;
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
    }
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
