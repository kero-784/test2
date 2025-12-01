import { SCRIPT_URL } from './config.js';
import { state, setState } from './state.js';
import { Logger, showToast, applyTranslations, populateOptions, findByKey, postData, formatCurrency, _t } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import * as Renderers from './renderers.js';
import * as Transactions from './transactions.js';
import * as Documents from './documents.js';

// GLOBAL ERROR HANDLER (Catches uncaught crashes)
window.onerror = function(msg, url, line, col, error) {
    const errText = `System Error: ${msg} \nLine: ${line}`;
    console.error(errText);
    // Inject visual error for user
    const errDiv = document.createElement('div');
    errDiv.style = "position:fixed;top:0;left:0;width:100%;background:red;color:white;padding:10px;z-index:9999;text-align:center;font-weight:bold;";
    errDiv.innerText = "CRITICAL ERROR: " + msg + ". Please refresh the page.";
    document.body.appendChild(errDiv);
    return false; 
};

document.addEventListener('DOMContentLoaded', () => {
    Logger.info('Initializing Meat Stock Manager...');

    // --- 1. LOGIN HANDLER ---
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // STOP RELOAD
            const username = document.getElementById('login-username').value.trim();
            const code = document.getElementById('login-code').value;
            
            if(!username || !code) { showToast('Enter credentials', 'error'); return; }

            const loader = document.getElementById('login-loader');
            loginForm.style.display = 'none';
            loader.style.display = 'flex';
            
            try {
                const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(code)}`);
                const data = await response.json();
                
                if (data.status !== 'error' && data.user) {
                    if (String(data.user.isDisabled).toUpperCase() === 'TRUE') throw new Error('Account disabled.');
                    
                    // Save to State
                    setState('currentUser', data.user);
                    setState('username', username);
                    setState('loginCode', code);
                    
                    // Save to Session (Persistence)
                    sessionStorage.setItem('meatUser', username);
                    sessionStorage.setItem('meatPass', code);
                    
                    // Load Data
                    Object.keys(data).forEach(key => { if (key !== 'user') setState(key, data[key]); });
                    
                    document.getElementById('login-container').style.display = 'none';
                    document.getElementById('app-container').style.display = 'flex';
                    
                    initializeAppUI();
                } else {
                    throw new Error(data.message || 'Login failed');
                }
            } catch (error) {
                document.getElementById('login-error').textContent = error.message;
                loginForm.style.display = 'block';
            } finally {
                loader.style.display = 'none';
            }
        });
    }

    // --- 2. SESSION AUTO-RESTORE ---
    const savedUser = sessionStorage.getItem('meatUser');
    const savedPass = sessionStorage.getItem('meatPass');
    
    if(savedUser && savedPass && document.getElementById('login-container').style.display !== 'none') {
        // Trigger auto-login silently
        Logger.info("Attempting Auto-Login...");
        document.getElementById('login-username').value = savedUser;
        document.getElementById('login-code').value = savedPass;
        document.getElementById('login-form').dispatchEvent(new Event('submit'));
    }

    // --- 3. GLOBAL EVENT DELEGATION ---
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        // --- MODALS ---
        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) {
             document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
        if (btn.classList.contains('btn-edit')) {
             Renderers.renderEditModalContent(btn.dataset.type, btn.dataset.id);
             document.getElementById('edit-modal').classList.add('active');
        }

        // --- SELECT ITEMS LOGIC ---
        if (btn.classList.contains('btn-select-items')) {
             const context = btn.dataset.context;
             
             // Butchery Validation
             if (context === 'butchery-child') {
                 const pc = document.getElementById('butchery-parent-code').value;
                 if (!pc) { showToast('Select Parent Item First!', 'error'); return; }
                 
                 const p = findByKey(state.items, 'code', pc);
                 if(p && p.DefinedCuts) {
                     // Filter logic handled in renderItemsInModal via dataset
                     document.getElementById('item-selector-modal').dataset.allowedItems = JSON.stringify(p.DefinedCuts.split(','));
                 } else {
                     document.getElementById('item-selector-modal').dataset.allowedItems = "";
                 }
             } else {
                 // Reset filter for other contexts
                 document.getElementById('item-selector-modal').dataset.allowedItems = "";
             }
             
             state.currentSelectionModal.type = 'item-selector';
             const modal = document.getElementById('item-selector-modal');
             modal.dataset.context = context;
             
             state.modalSelections.clear();
             Renderers.renderItemsInModal(); // Initial render
             modal.classList.add('active');
        }

        // --- REPORTS / PAYMENTS ---
        if (btn.id === 'btn-select-invoices') {
             Renderers.renderInvoicesInModal();
             document.getElementById('invoice-selector-modal').classList.add('active');
        }
        if (btn.id === 'btn-confirm-invoice-selection') {
             document.getElementById('invoice-selector-modal').classList.remove('active');
             Renderers.renderPaymentList();
        }
        if (btn.id === 'btn-generate-supplier-statement') {
             const sel = document.getElementById('supplier-statement-select');
             const d1 = document.getElementById('statement-start-date');
             const d2 = document.getElementById('statement-end-date');
             if(sel) Renderers.renderSupplierStatement(sel.value, d1.value, d2.value);
        }

        // --- AUTO GENERATORS ---
        if(btn.id === 'btn-gen-item-code') {
             const rnd = Math.floor(1000 + Math.random() * 9000);
             document.getElementById('item-code').value = `ITEM-${rnd}`;
        }
        if(btn.id === 'btn-gen-invoice') {
             document.getElementById('receive-invoice').value = `INV-${Date.now().toString().slice(-6)}`;
        }

        // --- MODAL CONFIRM ---
        if (btn.id === 'btn-confirm-modal-selection') {
            const modal = document.getElementById('item-selector-modal');
            const ctx = modal.dataset.context;
            const sel = Array.from(state.modalSelections);
            
            if (ctx === 'butchery-parent') {
                const i = findByKey(state.items, 'code', sel[0]);
                if(i) { 
                    document.getElementById('butchery-parent-display').value = i.name; 
                    document.getElementById('butchery-parent-code').value = i.code; 
                }
            } else {
                const listMap = { 
                    'receive': 'currentReceiveList', 
                    'butchery-child': 'currentButcheryList', 
                    'transfer': 'currentTransferList', 
                    'po': 'currentPOList', 
                    'return': 'currentReturnList', 
                    'adjustment': 'currentAdjustmentList'
                };
                const listName = listMap[ctx];
                
                if(listName) {
                    sel.forEach(c => {
                        const i = findByKey(state.items, 'code', c);
                        // Avoid duplicates
                        if(i && !state[listName].find(x => x.itemCode === c)) {
                            state[listName].push({ 
                                itemCode: i.code, 
                                itemName: i.name, 
                                quantity: '', 
                                cost: parseFloat(i.cost) || 0 
                            });
                        }
                    });
                    // Force Render
                    if(ctx === 'receive') Renderers.renderReceiveListTable();
                    if(ctx === 'butchery-child') Renderers.renderButcheryListTable();
                    if(ctx === 'transfer') Renderers.renderTransferListTable();
                    if(ctx === 'return') Renderers.renderReturnListTable();
                    if(ctx === 'adjustment') Renderers.renderAdjustmentListTable();
                    if(ctx === 'po') Renderers.renderPOListTable();
                }
            }
            modal.classList.remove('active');
            state.modalSelections.clear();
        }
        
        // --- REMOVE ROW ---
        if (btn.classList.contains('danger') && btn.dataset.index !== undefined && btn.textContent === 'X') {
            const tableId = btn.closest('table').id;
            const idx = parseInt(btn.dataset.index);
            
            const map = {
                'table-receive-list': { l: 'currentReceiveList', f: Renderers.renderReceiveListTable },
                'table-butchery-children': { l: 'currentButcheryList', f: Renderers.renderButcheryListTable },
                'table-transfer-list': { l: 'currentTransferList', f: Renderers.renderTransferListTable },
                'table-po-list': { l: 'currentPOList', f: Renderers.renderPOListTable },
                'table-return-list': { l: 'currentReturnList', f: Renderers.renderReturnListTable },
                'table-adjustment-list': { l: 'currentAdjustmentList', f: Renderers.renderAdjustmentListTable }
            };
            
            if(map[tableId]) {
                state[map[tableId].l].splice(idx, 1);
                map[tableId].f();
            }
        }
        
        // --- ADMIN CONTEXT ---
        if(btn.id === 'btn-confirm-context') {
             const m = document.getElementById('context-selector-modal');
             const res = {};
             // Simplified context gathering
             const selects = m.querySelectorAll('select');
             selects.forEach(s => { if(s.parentElement.style.display !== 'none') res[s.id.replace('context-','').replace('-select','')] = s.value; });
             
             if(state.adminContextPromise.resolve) state.adminContextPromise.resolve(res);
             m.classList.remove('active');
        }
        
        // --- APPROVE FINANCIALS ---
        if(btn.classList.contains('btn-approve-financial') || btn.classList.contains('btn-reject-financial')) {
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            const action = btn.classList.contains('btn-approve-financial') ? 'approveFinancial' : 'rejectFinancial';
            if(confirm('Are you sure?')) {
                 postData(action, { id, type }, btn).then(res => {
                     if(res) {
                         showToast('Processed', 'success');
                         reloadData(); // Safer to reload to ensure sync
                     }
                 });
            }
        }
    });

    // --- 4. LIVE INPUT UPDATES ---
    document.body.addEventListener('change', (e) => {
        if (e.target.classList.contains('table-input')) {
            const idx = parseInt(e.target.dataset.index);
            const field = e.target.dataset.field;
            const val = parseFloat(e.target.value) || 0;
            const tableId = e.target.closest('table').id;

             const map = {
                'table-receive-list': { l: 'currentReceiveList', f: Renderers.renderReceiveListTable },
                'table-butchery-children': { l: 'currentButcheryList', f: Renderers.renderButcheryListTable },
                'table-transfer-list': { l: 'currentTransferList', f: Renderers.renderTransferListTable },
                'table-po-list': { l: 'currentPOList', f: Renderers.renderPOListTable },
                'table-return-list': { l: 'currentReturnList', f: Renderers.renderReturnListTable },
                'table-adjustment-list': { l: 'currentAdjustmentList', f: Renderers.renderAdjustmentListTable }
            };
            
            if(map[tableId] && state[map[tableId].l][idx]) {
                state[map[tableId].l][idx][field] = val;
                map[tableId].f(); // Re-render to update totals
            }
        }
        
        // Butchery Parent Quantity specific trigger
        if(e.target.id === 'butchery-parent-qty') Renderers.renderButcheryListTable();
    });

    // --- 5. FORM BINDINGS ---
    const bindForm = (id, act, getter) => {
        const f = document.getElementById(id);
        if(f) f.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const data = getter();
                const res = await postData(act, data, f.querySelector('button'));
                if(res) {
                    showToast(_t('add_success_toast'), 'success');
                    // Optimistic Add
                    if(act === 'addItem') state.items.push(data);
                    if(act === 'addSupplier') state.suppliers.push(data);
                    if(act === 'addBranch') state.branches.push(data);
                    if(act === 'addSection') state.sections.push(data);
                    
                    f.reset();
                    refreshViewData('master-data');
                }
            } catch(err) {
                Logger.error("Form Submit Error", err);
                showToast("Error: " + err.message, "error");
            }
        });
    };

    // Safely get value helper
    const V = (id) => document.getElementById(id)?.value || '';

    bindForm('form-add-item', 'addItem', () => ({
        ItemType: V('item-type'),
        ParentCode: V('item-parent'),
        code: V('item-code'),
        barcode: V('item-barcode'),
        name: V('item-name'),
        unit: V('item-unit'),
        category: V('item-category'),
        supplierCode: V('item-supplier'),
        cost: parseFloat(V('item-cost')) || 0
    }));
    bindForm('form-add-supplier', 'addSupplier', () => ({ supplierCode: V('supplier-code'), name: V('supplier-name'), contact: V('supplier-contact') }));
    bindForm('form-add-branch', 'addBranch', () => ({ branchCode: V('branch-code'), branchName: V('branch-name') }));
    bindForm('form-add-section', 'addSection', () => ({ sectionCode: V('section-code'), sectionName: V('section-name') }));

    // Transaction Buttons
    const bindBtn = (id, fn) => { const el = document.getElementById(id); if(el) el.addEventListener('click', fn); };
    bindBtn('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    bindBtn('btn-submit-butchery', Transactions.handleButcherySubmit);
    bindBtn('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    bindBtn('btn-submit-po', Transactions.handlePOSubmit);
    bindBtn('btn-submit-return', Transactions.handleReturnSubmit);
    bindBtn('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    // Navigation
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

    document.getElementById('global-refresh-button').addEventListener('click', reloadData);

    // Dynamic Parent Dropdown
    const itemTypeSel = document.getElementById('item-type');
    if(itemTypeSel) {
        itemTypeSel.addEventListener('change', (e) => {
            const group = document.getElementById('group-item-parent');
            if(e.target.value === 'Cut') {
                group.style.display = 'block';
                populateOptions(document.getElementById('item-parent'), state.items.filter(i => i.ItemType === 'Main'), 'Select Parent', 'code', 'name');
            } else {
                group.style.display = 'none';
            }
        });
    }
});

// --- APP INIT & VIEW LOGIC ---

function initializeAppUI() {
    applyTranslations();
    const u = state.currentUser;
    if(u) document.querySelector('.sidebar-header h1').textContent = `Hi, ${u.Name.split(' ')[0]}`;
    
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
    try {
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
        if(id === 'master-data') {
            Renderers.renderItemsTable();
            Renderers.renderSuppliersTable();
            Renderers.renderBranchesTable();
            Renderers.renderSectionsTable();
        }
        if(id === 'butchery') Renderers.renderButcheryListTable();
        if(id === 'operations') {
            Renderers.renderReceiveListTable();
            Renderers.renderTransferListTable();
            Renderers.renderReturnListTable();
            Renderers.renderAdjustmentListTable();
            Renderers.renderPendingTransfers();
            Renderers.renderInTransitReport();
            // Refresh dropdowns if empty
            ['receive', 'transfer-from', 'transfer-to', 'return', 'adjustment'].forEach(p => {
                const el = document.getElementById(`${p}-branch`);
                if(el && el.options.length <= 1) populateOptions(el, state.branches, 'Branch', 'branchCode', 'branchName');
            });
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
    } catch (e) {
        Logger.error(`Error refreshing view ${id}`, e);
    }
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
