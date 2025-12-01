import { SCRIPT_URL } from './config.js';
import { state, setState, resetStateLists } from './state.js';
import { Logger, showToast, applyTranslations, populateOptions, findByKey, postData, formatCurrency, _t } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import * as Renderers from './renderers.js';
import * as Transactions from './transactions.js';
import * as Documents from './documents.js';

document.addEventListener('DOMContentLoaded', () => {
    Logger.info('Initializing Meat Stock Manager...');

    // --- 1. LOGIN HANDLER ---
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

    // --- 2. GLOBAL CLICK LISTENER (Event Delegation) ---
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        // Modal Close
        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) {
             document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }

        // Open Edit Modals
        if (btn.classList.contains('btn-edit')) {
             Renderers.renderEditModalContent(btn.dataset.type, btn.dataset.id);
             document.getElementById('edit-modal').classList.add('active');
        }
        
        // Open History
        if (btn.classList.contains('btn-history')) {
            const modal = document.getElementById('history-modal');
            document.getElementById('history-modal-title').textContent = `${_t('history')}: ${btn.dataset.id}`;
            // Trigger data fetch for history here if needed
            postData('getItemHistory', { itemCode: btn.dataset.id }, null).then(res => {
                if(res && res.data) {
                    const container = document.getElementById('subview-price-history');
                    let html = '<table><thead><tr><th>Date</th><th>Old</th><th>New</th><th>User</th></tr></thead><tbody>';
                    res.data.priceHistory.forEach(h => {
                        html += `<tr><td>${new Date(h.Timestamp).toLocaleDateString()}</td><td>${h.OldCost}</td><td>${h.NewCost}</td><td>${h.UpdatedBy}</td></tr>`;
                    });
                    container.innerHTML = html + '</tbody></table>';
                }
            });
            modal.classList.add('active');
        }

        // OPEN ITEM SELECTOR (Standardized)
        if (btn.classList.contains('btn-select-items')) {
             state.currentSelectionModal.type = 'item-selector';
             const m = document.getElementById('item-selector-modal');
             m.dataset.context = btn.dataset.context;
             m.dataset.allowedItems = "";
             
             // Filter for Butchery Child (Only show cuts linked to parent)
             if (btn.dataset.context === 'butchery-child') {
                 const pc = document.getElementById('butchery-parent-code').value;
                 if (!pc) { showToast('Please select a Parent Item first', 'error'); return; }
                 const p = findByKey(state.items, 'code', pc);
                 if(p && p.DefinedCuts) m.dataset.allowedItems = JSON.stringify(p.DefinedCuts.split(','));
             }
             
             state.modalSelections.clear();
             Renderers.renderItemsInModal();
             m.classList.add('active');
        }

        // CONFIRM ITEM SELECTION (The Fix for "Items not populating")
        if (btn.id === 'btn-confirm-modal-selection') {
            const m = document.getElementById('item-selector-modal');
            const ctx = m.dataset.context;
            const sel = Array.from(state.modalSelections);
            
            if (ctx === 'butchery-parent') {
                // Single Selection for Parent
                const i = findByKey(state.items, 'code', sel[0]);
                if(i) { 
                    document.getElementById('butchery-parent-display').value = i.name; 
                    document.getElementById('butchery-parent-code').value = i.code; 
                }
            } else {
                // Multi Selection for Lists
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
                                quantity: '', // User must enter
                                cost: parseFloat(i.cost) || 0 // Default from master
                            });
                        }
                    });
                    // Force re-render of the specific table
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

        // Reports & Payments
        if (btn.id === 'btn-select-invoices') { Renderers.renderInvoicesInModal(); document.getElementById('invoice-selector-modal').classList.add('active'); }
        if (btn.id === 'btn-confirm-invoice-selection') { document.getElementById('invoice-selector-modal').classList.remove('active'); Renderers.renderPaymentList(); }
        if (btn.id === 'btn-generate-supplier-statement') { Renderers.renderSupplierStatement(document.getElementById('supplier-statement-select').value, document.getElementById('statement-start-date').value, document.getElementById('statement-end-date').value); }
        
        // Auto Generators
        if(btn.id === 'btn-gen-item-code') document.getElementById('item-code').value = `ITM-${Math.floor(Math.random()*9999)}`;
        if(btn.id === 'btn-gen-invoice') document.getElementById('receive-invoice').value = `INV-${Date.now().toString().slice(-6)}`;

        // Remove Row from Table (Delegation)
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

        // View/Print
        if (btn.classList.contains('btn-view-tx')) {
            const batchId = btn.dataset.batchId;
            const type = btn.dataset.type;
            const group = state.transactions.filter(t => t.batchId === batchId);
            if (group.length > 0) {
                const first = group[0];
                const data = { ...first, items: group.map(t => ({...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name })) };
                if (type === 'receive') Documents.generateReceiveDocument(data);
                else if (type.includes('transfer')) Documents.generateTransferDocument(data);
                else if (type === 'return_out') Documents.generateReturnDocument(data);
            } else if (type === 'po') {
                const po = findByKey(state.purchaseOrders, 'poId', batchId);
                const items = state.purchaseOrderItems.filter(i => i.poId === batchId);
                if(po) Documents.generatePODocument({...po, items});
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
                        // Optimistic update
                        if (type === 'receive') {
                            state.transactions.forEach(t => { if (t.batchId === id) { t.isApproved = (action==='approveFinancial'); t.Status = (action==='approveFinancial'?'Completed':'Rejected'); } });
                        } else if (type === 'po') {
                            const p = findByKey(state.purchaseOrders, 'poId', id);
                            if(p) p.Status = (action==='approveFinancial'?'Approved':'Rejected');
                        }
                        Renderers.renderPendingFinancials();
                    }
                });
            }
        }
        
        // Admin Context Confirm
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

    // --- 3. TABLE INPUT LISTENER (Real-time Data Entry) ---
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
                config.render(); // Re-render to calculate totals
            }
        }
        
        if(e.target.id === 'butchery-parent-qty') {
            Renderers.renderButcheryListTable();
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
    
    // Edit Form
    const editForm = document.getElementById('form-edit-record');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = editForm.dataset.type;
            const id = editForm.dataset.id;
            const formData = new FormData(editForm);
            const updates = {};
            
            if (type === 'item') {
                const selectedCuts = [];
                editForm.querySelectorAll('input[name="DefinedCuts"]:checked').forEach(cb => selectedCuts.push(cb.value));
                if (editForm.querySelector('input[name="ItemType"]').value === 'Main') updates['DefinedCuts'] = selectedCuts.join(',');
            }
            for (let [key, value] of formData.entries()) { if (key !== 'DefinedCuts' && value !== "") updates[key] = value; }
            
            let action = 'updateData';
            let payload = { type, id, updates };
            if (type === 'user') { action = id ? 'updateUser' : 'addUser'; payload = id ? { Username: id, updates } : updates; }

            const res = await postData(action, payload, editForm.querySelector('button[type="submit"]'));
            if(res) {
                showToast('Update successful');
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
                reloadData();
            }
        });
    }
    
    // Payment Form
    const pf = document.getElementById('form-record-payment');
    if(pf) pf.addEventListener('submit', async (e) => {
        e.preventDefault();
        const s = document.getElementById('payment-supplier-select').value;
        const m = document.getElementById('payment-method').value;
        const pay = [];
        document.querySelectorAll('.payment-amount-input').forEach(i => {
             const v = parseFloat(i.value);
             if(v>0) pay.push({ paymentId: `PAY-${Date.now()}`, date: new Date().toISOString(), supplierCode: s, invoiceNumber: i.dataset.invoice, amount: v, method: m });
        });
        if(pay.length) await postData('addPaymentBatch', { supplierCode: s, method: m, date: new Date().toISOString(), totalAmount: pay.reduce((a,b)=>a+b.amount,0), payments: pay }, pf.querySelector('button'));
        state.invoiceModalSelections.clear();
        pf.reset();
        refreshViewData('payments');
    });

    // Bind Transactions
    const b = (id, fn) => { const el = document.getElementById(id); if(el) el.addEventListener('click', fn); };
    b('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    b('btn-submit-butchery', Transactions.handleButcherySubmit);
    b('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    b('btn-submit-po', Transactions.handlePOSubmit);
    b('btn-submit-return', Transactions.handleReturnSubmit);
    b('btn-submit-request', Transactions.handleRequestSubmit);
    b('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    // Navigation
    document.querySelectorAll('#main-nav a').forEach(l => l.addEventListener('click', e => { e.preventDefault(); if(l.id==='btn-logout') location.reload(); showView(l.dataset.view); }));
    document.querySelectorAll('.sub-nav-item').forEach(l => l.addEventListener('click', e => {
        e.target.closest('.view').querySelectorAll('.sub-nav-item, .sub-view').forEach(x => x.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(`subview-${e.target.dataset.subview}`).classList.add('active');
        refreshViewData(e.target.closest('.view').id.replace('view-',''));
    }));

    document.getElementById('global-refresh-button').addEventListener('click', reloadData);
    document.getElementById('modal-search-items').addEventListener('input', e => Renderers.renderItemsInModal(e.target.value));
    document.getElementById('modal-item-list').addEventListener('change', e => { if(e.target.type === 'checkbox') e.target.checked ? state.modalSelections.add(e.target.dataset.code) : state.modalSelections.delete(e.target.dataset.code); });
    document.getElementById('invoice-selector-modal').addEventListener('change', e => { if(e.target.type === 'checkbox') e.target.checked ? state.invoiceModalSelections.add(e.target.dataset.number) : state.invoiceModalSelections.delete(e.target.dataset.number); });

    // Dynamic Parent
    const ts = document.getElementById('item-type');
    if(ts) ts.addEventListener('change', e => {
        const g = document.getElementById('group-item-parent');
        if(e.target.value === 'Cut') {
            g.style.display = 'block';
            populateOptions(document.getElementById('item-parent'), state.items.filter(i=>i.ItemType==='Main'), 'Parent', 'code', 'name');
        } else { g.style.display = 'none'; }
    });
});

function initializeAppUI() {
    applyTranslations();
    const u = state.currentUser;
    document.querySelector('.sidebar-header h1').textContent = `Hi, ${u.Name.split(' ')[0]}`;
    populateOptions(document.getElementById('receive-branch'), state.branches, 'Branch', 'branchCode', 'branchName');
    populateOptions(document.getElementById('receive-supplier'), state.suppliers, 'Supplier', 'supplierCode', 'name');
    populateOptions(document.getElementById('butchery-branch'), state.branches, 'Branch', 'branchCode', 'branchName');
    populateOptions(document.getElementById('item-supplier'), state.suppliers, 'Supplier', 'supplierCode', 'name');
    showView('dashboard');
}

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
    const v = document.getElementById(`view-${id}`);
    if(v) v.classList.add('active');
    const l = document.querySelector(`a[data-view="${id}"]`);
    if(l) l.classList.add('active');
    refreshViewData(id);
}

function refreshViewData(id) {
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
    if(id === 'reports') populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, 'Supplier', 'supplierCode', 'name');
    if(id === 'payments') populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, 'Supplier', 'supplierCode', 'name');
    if(id === 'master-data') { Renderers.renderItemsTable(); Renderers.renderSuppliersTable(); Renderers.renderBranchesTable(); Renderers.renderSectionsTable(); }
    if(id === 'butchery') Renderers.renderButcheryListTable();
    if(id === 'operations') { 
        Renderers.renderReceiveListTable(); Renderers.renderTransferListTable(); Renderers.renderReturnListTable(); Renderers.renderAdjustmentListTable(); Renderers.renderPendingTransfers(); Renderers.renderInTransitReport(); 
        // Repopulate ops dropdowns
        ['receive', 'transfer-from', 'transfer-to', 'return', 'adjustment'].forEach(p => {
            const el = document.getElementById(`${p}-branch`);
            if(el && el.options.length <= 1) populateOptions(el, state.branches, 'Branch', 'branchCode', 'branchName');
        });
    }
    if(id === 'purchasing') { Renderers.renderPOListTable(); Renderers.renderPurchaseOrdersViewer(); Renderers.renderPendingFinancials(); }
    if(id === 'activity-log') Renderers.renderActivityLog();
    if(id === 'user-management') Renderers.renderUserManagementUI();
}

async function reloadData() {
    try {
        const res = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(state.username)}&loginCode=${encodeURIComponent(state.loginCode)}`);
        const data = await res.json();
        if(data.status !== 'error') {
            Object.keys(data).forEach(key => { if(key!=='user') setState(key, data[key]); });
            showToast('Data Refreshed');
            const active = document.querySelector('.view.active').id.replace('view-', '');
            refreshViewData(active);
        }
    } catch(e) { Logger.error(e); }
}
