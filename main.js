// main.js
import { SCRIPT_URL } from './config.js';
import { state, setState, resetStateLists } from './state.js';
import { Logger, showToast, applyTranslations, populateOptions, findByKey, postData, formatCurrency, _t } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import * as Renderers from './renderers.js';
import * as Transactions from './transactions.js';
import * as Documents from './documents.js';

document.addEventListener('DOMContentLoaded', () => {
    Logger.info('Initializing Meat Stock Manager...');

    // --- 1. LOGIN HANDLING ---
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
                if (d.status !== 'error' && d.user) {
                    if (String(d.user.isDisabled).toUpperCase() === 'TRUE') throw new Error('Account disabled.');
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

    // --- 2. GLOBAL CLICKS (Buttons & Modals) ---
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        // Close Modals
        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) {
             document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }

        // Edit & History
        if (btn.classList.contains('btn-edit')) {
             Renderers.renderEditModalContent(btn.dataset.type, btn.dataset.id);
             document.getElementById('edit-modal').classList.add('active');
        }
        
        // Open Item Selector
        if (btn.classList.contains('btn-select-items')) {
             state.currentSelectionModal.type = 'item-selector';
             const m = document.getElementById('item-selector-modal');
             m.dataset.context = btn.dataset.context;
             m.dataset.allowedItems = "";
             
             // Filter for Butchery Child (Cuts only for specific parent)
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

        // Report Generation
        if (btn.id === 'btn-generate-supplier-statement') {
             Renderers.renderSupplierStatement(document.getElementById('supplier-statement-select').value, document.getElementById('statement-start-date').value, document.getElementById('statement-end-date').value);
        }
        
        // Auto Generators
        if(btn.id === 'btn-gen-item-code') document.getElementById('item-code').value = `ITM-${Math.floor(Math.random()*9999)}`;
        if(btn.id === 'btn-gen-invoice') document.getElementById('receive-invoice').value = `INV-${Date.now().toString().slice(-6)}`;

        // Modal Confirm Selection
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
                const map = { 'receive': 'currentReceiveList', 'butchery-child': 'currentButcheryList', 'transfer': 'currentTransferList', 'po': 'currentPOList', 'return': 'currentReturnList', 'adjustment': 'currentAdjustmentList' };
                const list = state[map[ctx]];
                if(list) {
                    sel.forEach(c => {
                        const i = findByKey(state.items, 'code', c);
                        // Ensure default cost is parsed correctly
                        if(!list.find(x => x.itemCode === c)) list.push({ itemCode: i.code, itemName: i.name, quantity: '', cost: parseFloat(i.cost) || 0 });
                    });
                    // Refresh the specific table
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
        
        // Remove Row from Table
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
                'table-adjustment-list': { list: 'currentAdjustmentList', render: Renderers.renderAdjustmentListTable }
            };
            
            const config = tableMap[tableId];
            if (config) {
                state[config.list].splice(idx, 1);
                config.render();
            }
        }
    });

    // --- 3. TABLE INPUT LISTENER (CRITICAL FIX FOR CALCULATIONS) ---
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
                'table-adjustment-list': { list: 'currentAdjustmentList', render: Renderers.renderAdjustmentListTable }
            };

            const config = tableMap[tableId];
            if (config && state[config.list][index]) {
                // Update the state
                state[config.list][index][field] = isNaN(val) ? 0 : val;
                // Re-render to update totals
                config.render();
                // Restore focus (optional improvement, simple re-render usually suffices for this app structure)
            }
        }
        
        // Butchery Parent Quantity Change needs to trigger total update
        if(e.target.id === 'butchery-parent-qty') {
            Renderers.renderButcheryListTable(); // This recalculates yields
        }
    });

    // --- 4. FORM SUBMITS ---
    ['form-add-item', 'form-add-supplier', 'form-add-branch', 'form-add-section'].forEach(id => {
        const f = document.getElementById(id);
        if(f) f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const act = id.replace('form-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            const fd = new FormData(f);
            const d = Object.fromEntries(fd.entries());
            if(id === 'form-add-item') {
                const p = document.getElementById('item-parent');
                if(p) d.ParentCode = p.value;
            }
            await postData(act, d, f.querySelector('button'));
            f.reset();
            refresh('master-data');
        });
    });
    
    // Transaction Buttons
    const bind = (id, fn) => { const el = document.getElementById(id); if(el) el.addEventListener('click', fn); };
    bind('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    bind('btn-submit-butchery', Transactions.handleButcherySubmit);
    bind('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    bind('btn-submit-po', Transactions.handlePOSubmit);
    bind('btn-submit-return', Transactions.handleReturnSubmit);
    bind('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    // Search
    document.getElementById('modal-search-items').addEventListener('input', e => Renderers.renderItemsInModal(e.target.value));
    document.getElementById('modal-item-list').addEventListener('change', e => { if(e.target.type === 'checkbox') e.target.checked ? state.modalSelections.add(e.target.dataset.code) : state.modalSelections.delete(e.target.dataset.code); });

    // Nav
    document.querySelectorAll('#main-nav a').forEach(l => l.addEventListener('click', e => { e.preventDefault(); if(l.id==='btn-logout') location.reload(); show(l.dataset.view); }));
    document.querySelectorAll('.sub-nav-item').forEach(l => l.addEventListener('click', e => {
        e.target.closest('.view').querySelectorAll('.sub-nav-item, .sub-view').forEach(x => x.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(`subview-${e.target.dataset.subview}`).classList.add('active');
        refresh(e.target.closest('.view').id.replace('view-',''));
    }));
    
    // Item Type Toggle
    const ts = document.getElementById('item-type');
    if(ts) ts.addEventListener('change', e => {
        const g = document.getElementById('group-item-parent');
        if(e.target.value === 'Cut') {
            g.style.display = 'block';
            populateOptions(document.getElementById('item-parent'), state.items.filter(i=>i.ItemType==='Main'), 'Select Parent', 'code', 'name');
        } else { g.style.display = 'none'; }
    });

    document.getElementById('global-refresh-button').addEventListener('click', reloadData);
});

function initApp() {
    applyTranslations();
    populateOptions(document.getElementById('receive-branch'), state.branches, 'Select Branch', 'branchCode', 'branchName');
    populateOptions(document.getElementById('receive-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
    populateOptions(document.getElementById('butchery-branch'), state.branches, 'Select Branch', 'branchCode', 'branchName');
    populateOptions(document.getElementById('item-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
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
    if(id === 'dashboard') {
        const stock = calculateStockLevels();
        let val = 0;
        Object.values(stock).forEach(b => Object.values(b).forEach(i => val += (i.quantity*i.avgCost)));
        document.getElementById('dashboard-total-value').textContent = formatCurrency(val);
        document.getElementById('dashboard-total-items').textContent = state.items.length;
    }
    if(id === 'stock-levels') Renderers.renderItemCentricStockView();
    if(id === 'transaction-history') Renderers.renderTransactionHistory();
    if(id === 'master-data') { Renderers.renderItemsTable(); Renderers.renderSuppliersTable(); Renderers.renderBranchesTable(); Renderers.renderSectionsTable(); }
    if(id === 'butchery') Renderers.renderButcheryListTable();
    if(id === 'operations') { Renderers.renderReceiveListTable(); Renderers.renderTransferListTable(); Renderers.renderReturnListTable(); Renderers.renderAdjustmentListTable(); Renderers.renderPendingTransfers(); Renderers.renderInTransitReport(); }
    if(id === 'purchasing') { Renderers.renderPOListTable(); Renderers.renderPurchaseOrdersViewer(); Renderers.renderPendingFinancials(); }
}

async function reloadData() {
    try {
        const res = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(state.username)}&loginCode=${encodeURIComponent(state.loginCode)}`);
        const data = await res.json();
        if(data.status !== 'error') {
            Object.keys(data).forEach(key => { if(key!=='user') setState(key, data[key]); });
            showToast('Data Refreshed');
            const active = document.querySelector('.view.active').id.replace('view-', '');
            refresh(active);
        }
    } catch(e) { Logger.error(e); }
}
