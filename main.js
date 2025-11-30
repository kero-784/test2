import { SCRIPT_URL } from './config.js';
import { state, setState } from './state.js';
import { Logger, showToast, applyTranslations, populateOptions, findByKey, postData, formatCurrency, _t } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import * as Renderers from './renderers.js';
import * as Transactions from './transactions.js';
import * as Documents from './documents.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('login-username').value.trim();
            const p = document.getElementById('login-code').value;
            document.getElementById('login-loader').style.display = 'flex';
            loginForm.style.display = 'none';
            try {
                const res = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(u)}&loginCode=${encodeURIComponent(p)}`);
                const d = await res.json();
                if(d.status !== 'error' && d.user) {
                    if(String(d.user.isDisabled).toUpperCase() === 'TRUE') throw new Error('Disabled');
                    setState('currentUser', d.user);
                    Object.keys(d).forEach(k => { if(k !== 'user') setState(k, d[k]); });
                    document.getElementById('login-container').style.display = 'none';
                    document.getElementById('app-container').style.display = 'flex';
                    initApp();
                } else throw new Error(d.message);
            } catch(err) {
                document.getElementById('login-error').textContent = err.message;
                loginForm.style.display = 'block';
            } finally { document.getElementById('login-loader').style.display = 'none'; }
        });
    }

    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        // Navigation / Modals
        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) {
             document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
        if (btn.classList.contains('btn-edit')) {
             Renderers.renderEditModalContent(btn.dataset.type, btn.dataset.id);
             document.getElementById('edit-modal').classList.add('active');
        }
        
        // Item Selector Open
        if (btn.classList.contains('btn-select-items')) {
             state.currentSelectionModal.type = 'item-selector';
             const m = document.getElementById('item-selector-modal');
             m.dataset.context = btn.dataset.context;
             m.dataset.allowedItems = "";
             if (btn.dataset.context === 'butchery-child') {
                 const pc = document.getElementById('butchery-parent-code').value;
                 const p = findByKey(state.items, 'code', pc);
                 if(p && p.DefinedCuts) m.dataset.allowedItems = JSON.stringify(p.DefinedCuts.split(','));
             }
             state.modalSelections.clear();
             Renderers.renderItemsInModal();
             m.classList.add('active');
        }

        // Invoice/Payment
        if(btn.id === 'btn-select-invoices') {
             Renderers.renderInvoicesInModal();
             document.getElementById('invoice-selector-modal').classList.add('active');
        }
        if(btn.id === 'btn-confirm-invoice-selection') {
             document.getElementById('invoice-selector-modal').classList.remove('active');
             Renderers.renderPaymentList();
        }
        if(btn.id === 'btn-generate-supplier-statement') {
             Renderers.renderSupplierStatement(document.getElementById('supplier-statement-select').value, document.getElementById('statement-start-date').value, document.getElementById('statement-end-date').value);
        }
        
        // Auto Gens
        if(btn.id === 'btn-gen-item-code') document.getElementById('item-code').value = `ITM-${Math.floor(Math.random()*9999)}`;
        if(btn.id === 'btn-gen-invoice') document.getElementById('receive-invoice').value = `INV-${Date.now().toString().slice(-6)}`;
    });

    // Form Handlers
    ['form-add-item', 'form-add-supplier', 'form-add-branch', 'form-add-section'].forEach(id => {
        const f = document.getElementById(id);
        if(f) f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const act = id.replace('form-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase()); // form-add-item -> addItem
            const fd = new FormData(f);
            const d = Object.fromEntries(fd.entries());
            // item specific
            if(id === 'form-add-item') {
                const p = document.getElementById('item-parent');
                if(p) d.ParentCode = p.value;
            }
            await postData(act, d, f.querySelector('button'));
            f.reset();
            refresh('master-data');
        });
    });
    
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
        refresh('payments');
    });

    // Nav
    document.querySelectorAll('#main-nav a').forEach(l => l.addEventListener('click', e => { e.preventDefault(); if(l.id==='btn-logout') location.reload(); show(l.dataset.view); }));
    document.querySelectorAll('.sub-nav-item').forEach(l => l.addEventListener('click', e => {
        e.target.closest('.view').querySelectorAll('.sub-nav-item, .sub-view').forEach(x => x.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(`subview-${e.target.dataset.subview}`).classList.add('active');
    }));
    
    // Trans Buttons
    const b = (id, fn) => { const el = document.getElementById(id); if(el) el.addEventListener('click', fn); };
    b('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    b('btn-submit-butchery', Transactions.handleButcherySubmit);
    b('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    b('btn-submit-po', Transactions.handlePOSubmit);
    b('btn-submit-return', Transactions.handleReturnSubmit);
    b('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    // Modal Confirm
    document.getElementById('btn-confirm-modal-selection').addEventListener('click', () => {
        const m = document.getElementById('item-selector-modal');
        const ctx = m.dataset.context;
        const sel = Array.from(state.modalSelections);
        if(ctx === 'butchery-parent') {
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
                // ... add others ...
            }
        }
        m.classList.remove('active');
        state.modalSelections.clear();
    });
    
    // Search/Check
    document.getElementById('modal-search-items').addEventListener('input', e => Renderers.renderItemsInModal(e.target.value));
    document.getElementById('modal-item-list').addEventListener('change', e => { if(e.target.type === 'checkbox') e.target.checked ? state.modalSelections.add(e.target.dataset.code) : state.modalSelections.delete(e.target.dataset.code); });
    document.getElementById('invoice-selector-modal').addEventListener('change', e => { if(e.target.type === 'checkbox') e.target.checked ? state.invoiceModalSelections.add(e.target.dataset.number) : state.invoiceModalSelections.delete(e.target.dataset.number); });
});

function initApp() {
    applyTranslations();
    populateOptions(document.getElementById('receive-branch'), state.branches, 'Branch', 'branchCode', 'branchName');
    populateOptions(document.getElementById('receive-supplier'), state.suppliers, 'Supplier', 'supplierCode', 'name');
    populateOptions(document.getElementById('butchery-branch'), state.branches, 'Branch', 'branchCode', 'branchName');
    populateOptions(document.getElementById('item-supplier'), state.suppliers, 'Supplier', 'supplierCode', 'name');
    
    // Dynamic Parent Logic
    const ts = document.getElementById('item-type');
    if(ts) ts.addEventListener('change', e => {
        const g = document.getElementById('group-item-parent');
        if(e.target.value === 'Cut') {
            g.style.display = 'block';
            populateOptions(document.getElementById('item-parent'), state.items.filter(i=>i.ItemType==='Main'), 'Parent', 'code', 'name');
        } else { g.style.display = 'none'; }
    });

    show('dashboard');
}

function show(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
    document.getElementById(`view-${id}`)?.classList.add('active');
    document.querySelector(`a[data-view="${id}"]`)?.classList.add('active');
    refresh(id);
}

function refresh(id) {
    if(id === 'dashboard') { /* calc stats */ }
    if(id === 'stock-levels') Renderers.renderItemCentricStockView();
    if(id === 'transaction-history') Renderers.renderTransactionHistory();
    if(id === 'reports') populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, 'Supplier', 'supplierCode', 'name');
    if(id === 'payments') populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, 'Supplier', 'supplierCode', 'name');
    if(id === 'master-data') { Renderers.renderItemsTable(); Renderers.renderSuppliersTable(); Renderers.renderBranchesTable(); Renderers.renderSectionsTable(); }
    if(id === 'butchery') Renderers.renderButcheryListTable();
    if(id === 'operations') { Renderers.renderReceiveListTable(); Renderers.renderTransferListTable(); Renderers.renderReturnListTable(); Renderers.renderAdjustmentListTable(); Renderers.renderPendingTransfers(); Renderers.renderInTransitReport(); }
    if(id === 'purchasing') { Renderers.renderPOListTable(); Renderers.renderPurchaseOrdersViewer(); Renderers.renderPendingFinancials(); }
}
