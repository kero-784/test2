import { SCRIPT_URL } from './config.js';
import { state, setState, resetStateLists } from './state.js';
import { Logger, showToast, applyTranslations, populateOptions, findByKey, postData, formatCurrency, _t } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import * as Renderers from './renderers.js';
import * as Transactions from './transactions.js';
import * as Documents from './documents.js';

document.addEventListener('DOMContentLoaded', () => {
    Logger.info('Initializing Meat Stock Manager...');

    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const code = document.getElementById('login-code').value;
            const loader = document.getElementById('login-loader');
            
            loginForm.style.display = 'none';
            loader.style.display = 'flex';
            
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
                document.getElementById('login-error').textContent = error.message;
                loginForm.style.display = 'block';
            } finally {
                loader.style.display = 'none';
            }
        });
    }

    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) {
             document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
        if (btn.classList.contains('btn-edit')) {
             Renderers.renderEditModalContent(btn.dataset.type, btn.dataset.id);
             document.getElementById('edit-modal').classList.add('active');
        }
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
        if (btn.id === 'btn-select-invoices') {
             Renderers.renderInvoicesInModal();
             document.getElementById('invoice-selector-modal').classList.add('active');
        }
        if (btn.id === 'btn-confirm-invoice-selection') {
             document.getElementById('invoice-selector-modal').classList.remove('active');
             Renderers.renderPaymentList();
        }
        if (btn.id === 'btn-generate-supplier-statement') {
             const s = document.getElementById('supplier-statement-select').value;
             const d1 = document.getElementById('statement-start-date').value;
             const d2 = document.getElementById('statement-end-date').value;
             if(s) Renderers.renderSupplierStatement(s, d1, d2);
        }
        if (btn.id === 'btn-gen-item-code') document.getElementById('item-code').value = `ITM-${Math.floor(Math.random()*9999)}`;
        if (btn.id === 'btn-gen-invoice') document.getElementById('receive-invoice').value = `INV-${Date.now().toString().slice(-6)}`;
        if (btn.id === 'btn-confirm-modal-selection') {
            const m = document.getElementById('item-selector-modal');
            const ctx = m.dataset.context;
            const sel = Array.from(state.modalSelections);
            if (ctx === 'butchery-parent') {
                const i = findByKey(state.items, 'code', sel[0]);
                if(i) { document.getElementById('butchery-parent-display').value = i.name; document.getElementById('butchery-parent-code').value = i.code; }
            } else {
                const map = { 'receive': 'currentReceiveList', 'butchery-child': 'currentButcheryList', 'transfer': 'currentTransferList', 'po': 'currentPOList', 'return': 'currentReturnList', 'adjustment': 'currentAdjustmentList' };
                const list = state[map[ctx]];
                if(list) {
                    sel.forEach(c => {
                        const i = findByKey(state.items, 'code', c);
                        if(!list.find(x => x.itemCode === c)) list.push({ itemCode: i.code, itemName: i.name, quantity: '', cost: i.cost });
                    });
                    if(ctx === 'receive') Renderers.renderReceiveListTable();
                    if(ctx === 'butchery-child') Renderers.renderButcheryListTable();
                    if(ctx === 'transfer') Renderers.renderTransferListTable();
                    if(ctx === 'return') Renderers.renderReturnListTable();
                    if(ctx === 'adjustment') Renderers.renderAdjustmentListTable();
                    if(ctx === 'po') Renderers.renderPOListTable();
                }
            }
            m.classList.remove('active');
            state.modalSelections.clear();
        }
        
        // Table Row Removal
        if (btn.classList.contains('danger') && btn.dataset.index !== undefined && btn.textContent === 'X') {
            const row = btn.closest('tr');
            const tableId = row.closest('table').id;
            const idx = parseInt(btn.dataset.index);
            const map = {
                'table-receive-list': { l: 'currentReceiveList', r: Renderers.renderReceiveListTable },
                'table-butchery-children': { l: 'currentButcheryList', r: Renderers.renderButcheryListTable },
                'table-transfer-list': { l: 'currentTransferList', r: Renderers.renderTransferListTable },
                'table-po-list': { l: 'currentPOList', r: Renderers.renderPOListTable },
                'table-return-list': { l: 'currentReturnList', r: Renderers.renderReturnListTable },
                'table-adjustment-list': { l: 'currentAdjustmentList', r: Renderers.renderAdjustmentListTable }
            };
            if(map[tableId]) { state[map[tableId].l].splice(idx, 1); map[tableId].r(); }
        }
    });

    document.body.addEventListener('change', (e) => {
        if (e.target.classList.contains('table-input')) {
            const input = e.target;
            const row = input.closest('tr');
            const tableId = row.closest('table').id;
            const idx = parseInt(input.dataset.index);
            const field = input.dataset.field;
            const val = parseFloat(input.value);
            const map = {
                'table-receive-list': { l: 'currentReceiveList', r: Renderers.renderReceiveListTable },
                'table-butchery-children': { l: 'currentButcheryList', r: Renderers.renderButcheryListTable },
                'table-transfer-list': { l: 'currentTransferList', r: Renderers.renderTransferListTable },
                'table-po-list': { l: 'currentPOList', r: Renderers.renderPOListTable },
                'table-return-list': { l: 'currentReturnList', r: Renderers.renderReturnListTable },
                'table-adjustment-list': { l: 'currentAdjustmentList', r: Renderers.renderAdjustmentListTable }
            };
            if(map[tableId] && state[map[tableId].l][idx]) {
                state[map[tableId].l][idx][field] = isNaN(val) ? 0 : val;
                map[tableId].r();
            }
        }
    });

    const attachForm = (id, act) => {
        const f = document.getElementById(id);
        if(f) f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(f);
            const d = Object.fromEntries(fd.entries());
            if(id === 'form-add-item') { const p = document.getElementById('item-parent'); if(p) d.ParentCode = p.value; }
            await postData(act, d, f.querySelector('button'));
            f.reset();
            refreshViewData('master-data');
        });
    };

    attachForm('form-add-item', 'addItem');
    attachForm('form-add-supplier', 'addSupplier');
    attachForm('form-add-branch', 'addBranch');
    attachForm('form-add-section', 'addSection');
    
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

    const bind = (id, fn) => { const el = document.getElementById(id); if(el) el.addEventListener('click', fn); };
    bind('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    bind('btn-submit-butchery', Transactions.handleButcherySubmit);
    bind('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    bind('btn-submit-return', Transactions.handleReturnSubmit);
    bind('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    document.querySelectorAll('#main-nav a').forEach(l => l.addEventListener('click', e => { e.preventDefault(); if(l.id==='btn-logout') location.reload(); showView(l.dataset.view); }));
    document.querySelectorAll('.sub-nav-item').forEach(l => l.addEventListener('click', e => {
        e.target.closest('.view').querySelectorAll('.sub-nav-item, .sub-view').forEach(x => x.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(`subview-${e.target.dataset.subview}`).classList.add('active');
        refreshViewData(e.target.closest('.view').id.replace('view-',''));
    }));

    document.getElementById('global-refresh-button').addEventListener('click', async () => {
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
    document.getElementById(`view-${id}`)?.classList.add('active');
    document.querySelector(`a[data-view="${id}"]`)?.classList.add('active');
    refreshViewData(id);
}

function refreshViewData(id) {
    if(id === 'dashboard') {
        const stock = calculateStockLevels();
        let val = 0;
        Object.values(stock).forEach(b => Object.values(b).forEach(i => val += (i.quantity*i.avgCost)));
        document.getElementById('dashboard-total-value').textContent = formatCurrency(val);
        document.getElementById('dashboard-total-items').textContent = state.items.length;
    }
    if(id === 'stock-levels') Renderers.renderItemCentricStockView();
    if(id === 'transaction-history') Renderers.renderTransactionHistory();
    if(id === 'reports') populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
    if(id === 'payments') populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
    if(id === 'master-data') { Renderers.renderItemsTable(); Renderers.renderSuppliersTable(); Renderers.renderBranchesTable(); Renderers.renderSectionsTable(); }
    if(id === 'butchery') Renderers.renderButcheryListTable();
    if(id === 'operations') { Renderers.renderReceiveListTable(); Renderers.renderTransferListTable(); Renderers.renderReturnListTable(); Renderers.renderAdjustmentListTable(); Renderers.renderPendingTransfers(); Renderers.renderInTransitReport(); }
    if(id === 'purchasing') { Renderers.renderPOListTable(); Renderers.renderPurchaseOrdersViewer(); Renderers.renderPendingFinancials(); }
}
