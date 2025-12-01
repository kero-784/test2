import { SCRIPT_URL } from './config.js';
import { state, setState, resetStateLists } from './state.js';
import { Logger, showToast, applyTranslations, populateOptions, findByKey, postData, formatCurrency, _t, userCan } from './utils.js';
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
                    if (String(data.user.isDisabled).toUpperCase() === 'TRUE') throw new Error('Account disabled.');
                    
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
    }

    // --- LANGUAGE SWITCHER HANDLER ---
    const langSwitcher = document.getElementById('lang-switcher');
    if (langSwitcher) {
        langSwitcher.value = state.currentLanguage || 'en';
        langSwitcher.addEventListener('change', (e) => {
            const newLang = e.target.value;
            setState('currentLanguage', newLang);
            applyTranslations();
            initializeAppUI();
        });
    }

    // --- GLOBAL CLICK LISTENER ---
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        // Modals
        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) {
             document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
        if (btn.classList.contains('btn-edit')) {
             Renderers.renderEditModalContent(btn.dataset.type, btn.dataset.id);
             document.getElementById('edit-modal').classList.add('active');
        }

        // --- USER & ROLE MANAGEMENT BUTTONS ---
        if (btn.id === 'btn-add-new-user') {
            Renderers.renderEditModalContent('user', null); 
            document.getElementById('edit-modal').classList.add('active');
        }
        if (btn.id === 'btn-add-new-role') {
            Renderers.renderEditModalContent('role', null);
            document.getElementById('edit-modal').classList.add('active');
        }
        // Permission Editor
        if (btn.classList.contains('btn-edit-role-perms')) {
            const roleName = btn.dataset.role;
            Renderers.renderEditModalContent('role-permissions', roleName);
            document.getElementById('edit-modal').classList.add('active');
        }
        if (btn.classList.contains('btn-delete-role')) {
            if(confirm('Are you sure you want to delete this role?')) {
                const roleName = btn.dataset.role;
                postData('deleteRole', { roleName: roleName }, btn).then(res => {
                    if(res) {
                         showToast('Role deleted');
                         refreshViewData('user-management');
                    }
                });
            }
        }

        // --- TRANSFER ACTIONS (OPEN MODAL, CONFIRM, REJECT) ---
        if (btn.classList.contains('btn-receive-transfer')) {
             Transactions.openTransferModal(btn.dataset.batchId);
        }
        if (btn.id === 'btn-confirm-receive-transfer') {
             Transactions.processTransferAction('receiveTransfer', btn.dataset.batchId, btn);
        }
        if (btn.id === 'btn-reject-transfer') {
             Transactions.processTransferAction('rejectTransfer', btn.dataset.batchId, btn);
        }
        if (btn.classList.contains('btn-cancel-transfer')) {
             Transactions.handleCancelTransfer(btn.dataset.batchId, btn);
        }

        // --- NOTIFICATION CLICK LOGIC ---
        if (e.target.id === 'pending-requests-widget' || e.target.closest('#pending-requests-widget')) {
             const widget = document.getElementById('pending-requests-widget');
             if (widget.dataset.actionType === 'transfer') {
                 showView('operations');
                 setTimeout(() => {
                     const tab = document.querySelector('button[data-subview="in-transit"]');
                     if(tab) tab.click();
                 }, 100);
             } else {
                 showView('requests');
             }
             return; 
        }
        
        // --- SELECT ITEMS ---
        if (btn.classList.contains('btn-select-items')) {
             state.currentSelectionModal.type = 'item-selector';
             const m = document.getElementById('item-selector-modal');
             m.dataset.context = btn.dataset.context;
             m.dataset.allowedItems = "";
             
             if (btn.dataset.context === 'butchery-child') {
                 const pc = document.getElementById('butchery-parent-code').value;
                 if (!pc) { showToast('Select Parent First', 'error'); return; }
                 const p = findByKey(state.items, 'code', pc);
                 if(p && p.DefinedCuts) m.dataset.allowedItems = JSON.stringify(p.DefinedCuts.split(','));
             }
             state.modalSelections.clear();
             Renderers.renderItemsInModal();
             m.classList.add('active');
        }

        // --- CONFIRM ITEM SELECTION ---
        if (btn.id === 'btn-confirm-modal-selection') {
            const m = document.getElementById('item-selector-modal');
            const ctx = m.dataset.context;
            const sel = Array.from(state.modalSelections);
            
            if (ctx === 'butchery-parent') {
                const i = findByKey(state.items, 'code', sel[0]);
                if(i) { 
                    document.getElementById('butchery-parent-display').value = i.name; 
                    document.getElementById('butchery-parent-code').value = i.code; 
                }
            } else {
                const map = { 
                    'receive': 'currentReceiveList', 
                    'butchery-child': 'currentButcheryList', 
                    'transfer': 'currentTransferList', 
                    'po': 'currentPOList', 
                    'return': 'currentReturnList', 
                    'adjustment': 'currentAdjustmentList',
                    'request': 'currentRequestList'
                };
                const listName = map[ctx];
                
                if(listName) {
                    sel.forEach(c => {
                        const i = findByKey(state.items, 'code', c);
                        if(i && !state[listName].find(x => x.itemCode === c)) {
                            state[listName].push({ 
                                itemCode: i.code, 
                                itemName: i.name, 
                                quantity: '', 
                                cost: parseFloat(i.cost) || 0 
                            });
                        }
                    });
                    if(ctx === 'receive') Renderers.renderReceiveListTable();
                    if(ctx === 'butchery-child') Renderers.renderButcheryListTable();
                    if(ctx === 'transfer') Renderers.renderTransferListTable();
                    if(ctx === 'return') Renderers.renderReturnListTable();
                    if(ctx === 'adjustment') Renderers.renderAdjustmentListTable();
                    if(ctx === 'po') Renderers.renderPOListTable();
                    if(ctx === 'request') Renderers.renderRequestListTable();
                }
            }
            m.classList.remove('active');
            state.modalSelections.clear();
        }

        // ... Helpers ...
        if (btn.id === 'btn-select-invoices') { Renderers.renderInvoicesInModal(); document.getElementById('invoice-selector-modal').classList.add('active'); }
        if (btn.id === 'btn-confirm-invoice-selection') { document.getElementById('invoice-selector-modal').classList.remove('active'); Renderers.renderPaymentList(); }
        if (btn.id === 'btn-generate-supplier-statement') { Renderers.renderSupplierStatement(document.getElementById('supplier-statement-select').value, document.getElementById('statement-start-date').value, document.getElementById('statement-end-date').value); }
        if (btn.id === 'btn-gen-item-code') document.getElementById('item-code').value = `ITM-${Math.floor(Math.random()*9999)}`;
        if (btn.id === 'btn-gen-invoice') document.getElementById('receive-invoice').value = `INV-${Date.now().toString().slice(-6)}`;

        // Remove Row Logic
        if (btn.classList.contains('danger') && btn.dataset.index !== undefined && btn.textContent === 'X') {
            const row = btn.closest('tr');
            const tableId = row.closest('table').id;
            const idx = parseInt(btn.dataset.index);
            
            const tableMap = {
                'table-receive-list': { list: 'currentReceiveList', render: Renderers.renderReceiveListTable },
                'table-butchery-children': { list: 'currentButcheryList', render: Renderers.renderButcheryListTable },
                'table-transfer-list': { list: 'currentTransferList', render: Renderers.renderTransferListTable },
                'table-po-list': { list: 'currentPOList', render: Renderers.renderPOListTable },
                'table-return-list': { list: 'currentReturnList', render: Renderers.renderReturnListTable },
                'table-adjustment-list': { list: 'currentAdjustmentList', render: Renderers.renderAdjustmentListTable },
                'table-request-list': { list: 'currentRequestList', render: Renderers.renderRequestListTable }
            };
            
            const config = tableMap[tableId];
            if (config) {
                state[config.list].splice(idx, 1);
                config.render();
            }
        }

        // View/Print Transaction Documents
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
                    const data = { ...first, items: group.map(t => ({...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name })) };
                    
                    if (type === 'receive') Documents.generateReceiveDocument(data);
                    else if (type.includes('transfer')) Documents.generateTransferDocument(data);
                    else if (type === 'return_out') Documents.generateReturnDocument(data);
                }
            }
        }

        // Approve/Reject Financials
        if (btn.classList.contains('btn-approve-financial') || btn.classList.contains('btn-reject-financial')) {
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            const action = btn.classList.contains('btn-approve-financial') ? 'approveFinancial' : 'rejectFinancial';
            
            if (confirm(`Confirm ${action}?`)) {
                postData(action, { id, type }, btn).then(res => {
                    if(res) {
                        showToast('Updated', 'success');
                        if (type === 'receive') {
                            state.transactions.forEach(t => { if (t.batchId === id) { t.isApproved = (action==='approveFinancial'); t.Status = (action==='approveFinancial'?'Completed':'Rejected'); } });
                        } else if (type === 'po') {
                            const po = findByKey(state.purchaseOrders, 'poId', id);
                            if(po) po.Status = action === 'approveFinancial' ? 'Approved' : 'Rejected';
                        }
                        refreshViewData('purchasing');
                    }
                });
            }
        }
        
        // Admin Context
        if (btn.id === 'btn-confirm-context') {
            const modal = document.getElementById('context-selector-modal');
            const ctx = {
                fromBranch: modal.querySelector('#context-modal-fromBranch-group').style.display === 'block' ? modal.querySelector('#context-from-branch-select').value : null,
                toBranch: modal.querySelector('#context-modal-toBranch-group').style.display === 'block' ? modal.querySelector('#context-to-branch-select').value : null,
                branch: modal.querySelector('#context-modal-branch-group').style.display === 'block' ? modal.querySelector('#context-branch-select').value : null,
            };
            if (state.adminContextPromise.resolve) state.adminContextPromise.resolve(ctx);
            modal.classList.remove('active');
        }
    });

    // --- 3. TABLE INPUT LISTENER ---
    document.body.addEventListener('change', (e) => {
        if (e.target.classList.contains('table-input')) {
            const input = e.target;
            const row = input.closest('tr');
            const tableId = row.closest('table').id;
            const index = parseInt(input.dataset.index);
            const field = input.dataset.field;
            const val = parseFloat(input.value);

            const tableMap = {
                'table-receive-list': { list: 'currentReceiveList', render: Renderers.renderReceiveListTable },
                'table-butchery-children': { list: 'currentButcheryList', render: Renderers.renderButcheryListTable },
                'table-transfer-list': { list: 'currentTransferList', render: Renderers.renderTransferListTable },
                'table-po-list': { list: 'currentPOList', render: Renderers.renderPOListTable },
                'table-return-list': { list: 'currentReturnList', render: Renderers.renderReturnListTable },
                'table-adjustment-list': { list: 'currentAdjustmentList', render: Renderers.renderAdjustmentListTable },
                'table-request-list': { list: 'currentRequestList', render: Renderers.renderRequestListTable }
            };

            const config = tableMap[tableId];
            if (config && state[config.list][index]) {
                state[config.list][index][field] = isNaN(val) ? 0 : val;
                config.render();
            }
        }
        
        if(e.target.id === 'butchery-parent-qty') Renderers.renderButcheryListTable();
        
        if (e.target.closest('#modal-invoice-list') && e.target.type === 'checkbox') {
             const num = e.target.dataset.number;
             e.target.checked ? state.invoiceModalSelections.add(num) : state.invoiceModalSelections.delete(num);
        }
        
        if (e.target.closest('#modal-item-list') && e.target.type === 'checkbox') {
             const code = e.target.dataset.code;
             e.target.checked ? state.modalSelections.add(code) : state.modalSelections.delete(code);
        }
    });

    // --- 4. FORM SUBMITS ---
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
            } catch (err) { console.error(err); showToast("Error processing form", "error"); }
        });
    };

    const getValue = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

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
    
    attachFormHandler('form-add-supplier', 'addSupplier', () => ({ supplierCode: getValue('supplier-code'), name: getValue('supplier-name'), contact: getValue('supplier-contact') }));
    attachFormHandler('form-add-branch', 'addBranch', () => ({ branchCode: getValue('branch-code'), branchName: getValue('branch-name') }));
    attachFormHandler('form-add-section', 'addSection', () => ({ sectionCode: getValue('section-code'), sectionName: getValue('section-name') }));
    
    // Edit Form (Generalized)
    const editForm = document.getElementById('form-edit-record');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            let type = form.dataset.type; // Set by renderEditModalContent

            let action = 'updateData';
            let payload = {};
            const updates = {};

            // 1. Role Permission Update
            if (type === 'role-permissions') {
                action = 'updateRolePermissions';
                const roleName = formData.get('RoleName');
                // Iterate through checkboxes (inputs)
                form.querySelectorAll('input[type="checkbox"]').forEach(input => {
                    updates[input.name] = input.checked;
                });
                payload = { RoleName: roleName, updates: updates };
            } 
            // 2. Standard Updates
            else {
                // Item Links specific
                if (type === 'item') {
                    const selectedCuts = [];
                    form.querySelectorAll('input[name="DefinedCuts"]:checked').forEach(cb => selectedCuts.push(cb.value));
                    if (form.querySelector('input[name="ItemType"]').value === 'Main') {
                        updates['DefinedCuts'] = selectedCuts.join(',');
                    }
                }
                
                // Collect standard fields
                for (let [key, value] of formData.entries()) { if (key !== 'DefinedCuts' && value !== "") updates[key] = value; }
                
                // Handle Checkboxes specifically for User Disable
                if (type === 'user') {
                    updates['isDisabled'] = form.querySelector('[name="isDisabled"]').checked;
                }

                payload = { type, id: form.dataset.id, updates };

                if (type === 'user') {
                    const username = formData.get('Username');
                    const isNew = !form.dataset.id;
                    action = isNew ? 'addUser' : 'updateUser';
                    payload = isNew ? updates : { Username: username, updates };
                } 
                else if (type === 'role') {
                    action = 'addRole';
                    payload = updates;
                }
            }

            const res = await postData(action, payload, form.querySelector('button[type="submit"]'));
            if(res) {
                showToast('Action successful');
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
                if (type === 'user' || type === 'role' || type === 'role-permissions') {
                    refreshViewData('user-management');
                } else {
                    reloadData();
                }
            }
        });
    }
    
    // Payment Form
    const pf = document.getElementById('form-record-payment');
    if(pf) pf.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = pf.querySelector('button[type="submit"]');
        const s = document.getElementById('payment-supplier-select').value;
        const m = document.getElementById('payment-method').value;
        const pay = [];
        document.querySelectorAll('.payment-amount-input').forEach(i => {
             const v = parseFloat(i.value);
             if(v>0) pay.push({ paymentId: `PAY-${Date.now()}`, date: new Date().toISOString(), supplierCode: s, invoiceNumber: i.dataset.invoice, amount: v, method: m });
        });
        if(pay.length === 0) return;
        const payload = { supplierCode: s, method: m, date: new Date().toISOString(), totalAmount: pay.reduce((a,b)=>a+b.amount,0), payments: pay };
        if(await postData('addPaymentBatch', payload, btn)) {
            showToast('Payment recorded!', 'success');
            state.invoiceModalSelections.clear();
            pf.reset();
            refreshViewData('payments');
            await reloadData();
        }
    });

    const bindBtn = (id, handler) => { const btn = document.getElementById(id); if(btn) btn.addEventListener('click', handler); };
    bindBtn('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    bindBtn('btn-submit-butchery', Transactions.handleButcherySubmit);
    bindBtn('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    bindBtn('btn-submit-po', Transactions.handlePOSubmit);
    bindBtn('btn-submit-return', Transactions.handleReturnSubmit);
    bindBtn('btn-submit-request', Transactions.handleRequestSubmit);
    bindBtn('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    document.getElementById('global-refresh-button').addEventListener('click', async () => { await reloadData(); });

    document.querySelectorAll('#main-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if(link.id === 'btn-logout') { sessionStorage.clear(); location.reload(); }
            showView(link.dataset.view);
        });
    });
    
    document.querySelectorAll('.sub-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.target.closest('.view');
            view.querySelectorAll('.sub-nav-item, .sub-view').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active');
            const subId = e.target.dataset.subview;
            const subEl = document.getElementById(`subview-${subId}`);
            if(subEl) subEl.classList.add('active');
            refreshViewData(view.id.replace('view-', ''));
        });
    });

    const ts = document.getElementById('item-type');
    if(ts) ts.addEventListener('change', e => {
        const g = document.getElementById('group-item-parent');
        if(e.target.value === 'Cut') {
            g.style.display = 'block';
            populateOptions(document.getElementById('item-parent'), state.items.filter(i=>i.ItemType==='Main'), 'Parent', 'code', 'name');
        } else { g.style.display = 'none'; }
    });
});

function applyUIPermissions() {
    const user = state.currentUser;
    if (!user || !user.permissions) return;

    // 1. Handle Sidebar items and elements with 'data-permission' attribute
    document.querySelectorAll('[data-permission]').forEach(el => {
        const requiredPerms = el.dataset.permission.split(',');
        const hasAccess = requiredPerms.some(perm => userCan(perm.trim()));
        
        if (!hasAccess) {
            el.style.display = 'none';
        } else {
            el.style.display = el.tagName === 'LI' ? 'block' : ''; 
        }
    });

    // 2. Hide specific forms in Setup view if user lacks specific creation rights
    if (!userCan('createItem')) document.getElementById('card-add-item').style.display = 'none';
    if (!userCan('createSupplier')) document.getElementById('card-add-supplier').style.display = 'none';
    if (!userCan('createBranch')) document.getElementById('card-add-branch').style.display = 'none';
    if (!userCan('createSection')) document.getElementById('card-add-section').style.display = 'none';
}

function initializeAppUI() {
    applyTranslations();
    applyUIPermissions();
    
    const u = state.currentUser;
    document.querySelector('.sidebar-header h1').textContent = `Hi, ${u.Name.split(' ')[0]}`;
    populateOptions(document.getElementById('receive-branch'), state.branches, 'Branch', 'branchCode', 'branchName');
    populateOptions(document.getElementById('receive-supplier'), state.suppliers, 'Supplier', 'supplierCode', 'name');
    populateOptions(document.getElementById('butchery-branch'), state.branches, 'Branch', 'branchCode', 'branchName');
    populateOptions(document.getElementById('item-supplier'), state.suppliers, 'Supplier', 'supplierCode', 'name');
    Renderers.updateNotifications();
    showView('dashboard');
}

function showView(id) {
    const navItem = document.querySelector(`.nav-item a[data-view="${id}"]`)?.parentElement;
    if (navItem && navItem.hasAttribute('data-permission')) {
        const perms = navItem.dataset.permission.split(',');
        const hasAccess = perms.some(p => userCan(p.trim()));
        if (!hasAccess) {
            showToast('Access Denied', 'error');
            return;
        }
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
    const v = document.getElementById(`view-${id}`);
    if(v) v.classList.add('active');
    const l = document.querySelector(`a[data-view="${id}"]`);
    if(l) l.classList.add('active');
    refreshViewData(id);
}

function refreshViewData(id) {
    Renderers.updateNotifications();
    if(id === 'dashboard') {
        const stock = calculateStockLevels();
        let val = 0;
        Object.values(stock).forEach(b => Object.values(b).forEach(i => val += (i.quantity*i.avgCost)));
        document.getElementById('dashboard-total-value').textContent = formatCurrency(val);
        document.getElementById('dashboard-total-items').textContent = state.items.length;
        document.getElementById('dashboard-total-suppliers').textContent = state.suppliers.length;
        document.getElementById('dashboard-total-branches').textContent = state.branches.length;
    }
    if(id === 'stock-levels') Renderers.renderItemCentricStockView();
    if(id === 'transaction-history') {
        populateOptions(document.getElementById('tx-filter-branch'), state.branches, 'All Branches', 'branchCode', 'branchName');
        Renderers.renderTransactionHistory();
    }
    if(id === 'reports') populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
    if(id === 'payments') {
        populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
        const listContainer = document.getElementById('payment-invoice-list-container');
        if(listContainer) listContainer.style.display = 'none';
    }
    if(id === 'master-data') {
        Renderers.renderItemsTable();
        Renderers.renderSuppliersTable();
        Renderers.renderBranchesTable();
        Renderers.renderSectionsTable();
    }
    if(id === 'butchery') {
        populateOptions(document.getElementById('butchery-branch'), state.branches, _t('branch'), 'branchCode', 'branchName');
        Renderers.renderButcheryListTable();
    }
    if(id === 'operations') {
        ['receive', 'transfer-from', 'transfer-to', 'return', 'adjustment'].forEach(prefix => {
            const el = document.getElementById(`${prefix}-branch`);
            if(el && el.options.length <= 1) populateOptions(el, state.branches, 'Branch', 'branchCode', 'branchName');
        });
        populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('supplier'), 'supplierCode', 'name');
        populateOptions(document.getElementById('return-supplier'), state.suppliers, _t('supplier'), 'supplierCode', 'name');
        
        Renderers.renderReceiveListTable();
        Renderers.renderTransferListTable();
        Renderers.renderReturnListTable();
        Renderers.renderAdjustmentListTable();
        Renderers.renderPendingTransfers();
        Renderers.renderInTransitReport();
    }
    if(id === 'purchasing') {
        populateOptions(document.getElementById('po-supplier'), state.suppliers, 'Supplier', 'supplierCode', 'name');
        Renderers.renderPOListTable();
        Renderers.renderPurchaseOrdersViewer();
        Renderers.renderPendingFinancials();
    }
    if(id === 'user-management') {
         postData('getAllUsersAndRoles', {}, null).then(res => {
            if(res) {
                state.allUsers = res.data.users;
                state.allRoles = res.data.roles;
                Renderers.renderUserManagementUI();
            }
        });
    }
    if(id === 'activity-log') Renderers.renderActivityLog();
}

async function reloadData() {
    try {
        const res = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(state.username)}&loginCode=${encodeURIComponent(state.loginCode)}`);
        const data = await res.json();
        if(data.status !== 'error') {
            Object.keys(data).forEach(key => { if(key!=='user') setState(key, data[key]); });
            showToast(_t('data_refreshed_toast'));
            const active = document.querySelector('.view.active').id.replace('view-', '');
            refreshViewData(active);
        }
    } catch(e) { Logger.error(e); }
}
