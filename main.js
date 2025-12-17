import { SCRIPT_URL } from './config.js';
import { state, setState, resetStateLists } from './state.js';
import { Logger, showToast, applyTranslations, populateOptions, findByKey, postData, formatCurrency, _t, userCan, exportTableToExcel } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import * as Renderers from './renderers.js';
import * as Transactions from './transactions.js';
import * as Documents from './documents.js';

// --- ADVANCED PWA INSTALLER LOGIC ---
let deferredPrompt;

// Check if device is iOS
const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

// Check if app is already running in standalone mode
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

// Capture the install event
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show the login install button immediately if available
    const loginInstallBtn = document.getElementById('login-install-wrapper');
    if(loginInstallBtn) loginInstallBtn.style.display = 'block';
});

// Logic to show/hide install options based on platform
function handleInstallClick() {
    const sheet = document.getElementById('pwa-install-sheet');
    const iosGuide = document.getElementById('pwa-ios-guide');
    const stdActions = document.getElementById('pwa-standard-actions');
    
    if (isIos() && !isInStandaloneMode()) {
        // Show iOS specific guide
        if(iosGuide) iosGuide.style.display = 'block';
        if(stdActions) stdActions.style.display = 'none';
        sheet.classList.add('active');
    } else if (deferredPrompt) {
        // Trigger Native Prompt
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                const loginInstallBtn = document.getElementById('login-install-wrapper');
                if(loginInstallBtn) loginInstallBtn.style.display = 'none';
            }
            deferredPrompt = null;
        });
    } else {
        // Fallback for desktop/other if prompt isn't ready but button was clicked
        if(iosGuide) iosGuide.style.display = 'none';
        if(stdActions) stdActions.style.display = 'flex';
        sheet.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    Logger.info('Initializing Meat Stock Manager...');

    // Check for iOS on load to show login button even without event
    if (isIos() && !isInStandaloneMode()) {
        const loginInstallBtn = document.getElementById('login-install-wrapper');
        if(loginInstallBtn) loginInstallBtn.style.display = 'block';
    }

    // --- PWA BUTTON HANDLERS ---
    const btnLoginInstall = document.getElementById('btn-login-install');
    const btnSheetInstall = document.getElementById('btn-pwa-confirm');
    const btnCancel = document.getElementById('btn-pwa-cancel');
    const btnIosClose = document.getElementById('btn-pwa-ios-close');
    const sheet = document.getElementById('pwa-install-sheet');

    // 1. Button on Login Screen
    if (btnLoginInstall) {
        btnLoginInstall.addEventListener('click', handleInstallClick);
    }

    // 2. Button inside Bottom Sheet
    if (btnSheetInstall) {
        btnSheetInstall.addEventListener('click', handleInstallClick);
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            sheet.classList.remove('active');
        });
    }

    if (btnIosClose) {
        btnIosClose.addEventListener('click', () => {
            sheet.classList.remove('active');
        });
    }

    // --- MOBILE MENU HANDLER ---
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (btnToggleSidebar && sidebar && overlay) {
        // Toggle Sidebar
        btnToggleSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        // Close Sidebar when clicking overlay
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        // Close Sidebar when a nav link is clicked
        document.querySelectorAll('.nav-item a').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        });
    }

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
                    
                    // Save credentials for auto-recovery
                    sessionStorage.setItem('meatUser', username);
                    sessionStorage.setItem('meatPass', code);

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
    document.body.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        // 1. ADD NEW BUTTONS (MASTER DATA)
        if (['btn-add-item', 'btn-add-supplier', 'btn-add-branch', 'btn-add-section', 'btn-add-new-user', 'btn-add-new-role'].includes(btn.id)) {
            const map = {
                'btn-add-item': 'item',
                'btn-add-supplier': 'supplier',
                'btn-add-branch': 'branch',
                'btn-add-section': 'section',
                'btn-add-new-user': 'user',
                'btn-add-new-role': 'role'
            };
            Renderers.renderEditModalContent(map[btn.id], null);
            document.getElementById('edit-modal').classList.add('active');
            return;
        }

        // 2. EXPORT BUTTONS
        if (btn.id === 'btn-export-items') { exportTableToExcel('table-items', 'Items_List.xlsx'); return; }
        if (btn.id === 'btn-export-suppliers') { exportTableToExcel('table-suppliers', 'Suppliers_List.xlsx'); return; }
        if (btn.id === 'btn-export-branches') { exportTableToExcel('table-branches', 'Branches_List.xlsx'); return; }
        if (btn.id === 'btn-export-stock') { exportTableToExcel('table-stock-levels', 'Stock_Report.xlsx'); return; }
        if (btn.id === 'btn-export-history') { exportTableToExcel('table-transaction-history', 'Transaction_Log.xlsx'); return; }
        
        if (btn.id === 'btn-export-statement') {
            const supName = document.querySelector('#supplier-statement-results h3')?.innerText || 'Statement';
            exportTableToExcel('table-supplier-statement', `${supName}.xlsx`);
            return;
        }

        // 3. MODAL CONTROLS
        if (btn.classList.contains('close-button') || btn.classList.contains('modal-cancel')) {
             document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
             return;
        }

        // 4. EDIT BUTTONS (Generic)
        if (btn.classList.contains('btn-edit')) {
             Renderers.renderEditModalContent(btn.dataset.type, btn.dataset.id);
             document.getElementById('edit-modal').classList.add('active');
             return;
        }
        
        // 5. EDIT INVOICE BUTTON (New)
        if (btn.classList.contains('btn-edit-invoice')) {
            Renderers.renderEditModalContent('invoice_header', btn.dataset.batchId);
            document.getElementById('edit-modal').classList.add('active');
            return;
        }
        
        // 6. HISTORY BUTTON
        if (btn.classList.contains('btn-history')) {
            Renderers.renderHistoryModal(btn.dataset.id);
            document.getElementById('history-modal').classList.add('active');
            return;
        }

        // 7. AUTO-GEN BUTTONS
        if (btn.id === 'btn-modal-gen-code') {
             document.getElementById('edit-item-code').value = `ITM-${Math.floor(Math.random() * 99999)}`;
             return;
        }
        if (btn.id === 'btn-modal-gen-supplier') {
             document.getElementById('edit-supplier-code').value = `SUP-${Math.floor(Math.random() * 99999)}`;
             return;
        }

        // 8. TOGGLE STATUS
        if (btn.classList.contains('btn-toggle-status')) {
            const type = btn.dataset.type;
            const id = btn.dataset.id;
            const isCurrentlyDisabled = btn.dataset.current === 'true'; 
            
            let action = 'updateData';
            let updates = {};
            
            if (type === 'user') {
                action = 'updateUser';
                updates = { isDisabled: !isCurrentlyDisabled }; 
            } else {
                updates = { isActive: isCurrentlyDisabled }; 
            }

            const payload = type === 'user' ? { Username: id, updates } : { type, id, updates };

            if(confirm(`Change status for ${type} ${id}?`)) {
                const res = await postData(action, payload, btn);
                if(res) {
                    showToast('Status updated', 'success');
                    await reloadData();
                    if (type === 'user') refreshViewData('user-management');
                    else refreshViewData('master-data');
                }
            }
            return;
        }

        // 9. PERMISSIONS & DELETE ROLE
        if (btn.classList.contains('btn-edit-role-perms')) {
            const roleName = btn.dataset.role;
            Renderers.renderEditModalContent('role-permissions', roleName);
            document.getElementById('edit-modal').classList.add('active');
            return;
        }
        if (btn.classList.contains('btn-delete-role')) {
            if(confirm('Are you sure you want to delete this role?')) {
                const roleName = btn.dataset.role;
                const res = await postData('deleteRole', { roleName: roleName }, btn);
                if(res) {
                     showToast('Role deleted');
                     await reloadData(); 
                     refreshViewData('user-management');
                }
            }
            return;
        }

        // --- FINANCIALS: PRINT VOUCHER FROM HISTORY ---
        if (btn.classList.contains('btn-print-voucher')) {
            const paymentId = btn.dataset.id;
            const paymentLines = state.payments.filter(p => p.paymentId === paymentId);
            
            if (paymentLines.length > 0) {
                const first = paymentLines[0];
                const voucherData = {
                    supplierCode: first.supplierCode,
                    date: first.date,
                    method: first.method,
                    totalAmount: paymentLines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0),
                    payments: paymentLines 
                };
                Documents.generatePaymentVoucher(voucherData);
            } else {
                showToast('Payment details not found.', 'error');
            }
            return;
        }

        // --- FINANCIALS: PAY SUPPLIER SHORTCUT ---
        if (btn.classList.contains('btn-pay-supplier')) {
            const supplierCode = btn.dataset.supplier;
            showView('financials');
            const recordTab = document.querySelector('button[data-subview="record-payment"]');
            if(recordTab) recordTab.click();
            
            setTimeout(() => {
                const select = document.getElementById('payment-supplier-select');
                if(select) {
                    select.value = supplierCode;
                    Renderers.renderInvoicesInModal();
                    document.getElementById('invoice-selector-modal').classList.add('active');
                }
            }, 300);
            return;
        }
        
        // --- REPORT GENERATOR (STATEMENT) ---
        if (btn.id === 'btn-generate-supplier-statement') {
             Renderers.renderSupplierStatement(
                 document.getElementById('supplier-statement-select').value, 
                 document.getElementById('statement-start-date').value, 
                 document.getElementById('statement-end-date').value
             ); 
             return;
        }

        // --- TRANSFER ACTIONS ---
        if (btn.classList.contains('btn-receive-transfer')) {
             Transactions.openTransferModal(btn.dataset.batchId);
             return;
        }
        if (btn.id === 'btn-confirm-receive-transfer') {
             await Transactions.processTransferAction('receiveTransfer', btn.dataset.batchId, btn);
             await reloadData();
             return;
        }
        if (btn.id === 'btn-reject-transfer') {
             await Transactions.processTransferAction('rejectTransfer', btn.dataset.batchId, btn);
             await reloadData();
             return;
        }
        if (btn.classList.contains('btn-cancel-transfer')) {
             await Transactions.handleCancelTransfer(btn.dataset.batchId, btn);
             await reloadData();
             return;
        }

        // --- NOTIFICATION CLICK LOGIC ---
        if (e.target.id === 'pending-requests-widget' || e.target.closest('#pending-requests-widget')) {
             showView('operations');
             setTimeout(() => {
                 const tab = document.querySelector('button[data-subview="in-transit"]');
                 if(tab) tab.click();
             }, 100);
             return; 
        }
        
        // --- SELECT ITEMS ---
        if (btn.classList.contains('btn-select-items')) {
             state.currentSelectionModal.type = 'item-selector';
             const m = document.getElementById('item-selector-modal');
             m.dataset.context = btn.dataset.context;
             m.dataset.allowedItems = "";
             
             state.modalSelections.clear();
             Renderers.renderItemsInModal();
             m.classList.add('active');
             return;
        }

        // --- CONFIRM ITEM SELECTION ---
        if (btn.id === 'btn-confirm-modal-selection') {
            const m = document.getElementById('item-selector-modal');
            const ctx = m.dataset.context;
            const sel = Array.from(state.modalSelections);
            
            const map = { 
                'receive': 'currentReceiveList', 
                'transfer': 'currentTransferList', 
                'po': 'currentPOList', 
                'return': 'currentReturnList', 
                'adjustment': 'currentAdjustmentList'
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
                if(ctx === 'transfer') Renderers.renderTransferListTable();
                if(ctx === 'return') Renderers.renderReturnListTable();
                if(ctx === 'adjustment') Renderers.renderAdjustmentListTable();
                if(ctx === 'po') Renderers.renderPOListTable();
            }
            
            m.classList.remove('active');
            state.modalSelections.clear();
            return;
        }

        // ... Helpers ...
        if (btn.id === 'btn-select-invoices') { Renderers.renderInvoicesInModal(); document.getElementById('invoice-selector-modal').classList.add('active'); return; }
        if (btn.id === 'btn-confirm-invoice-selection') { document.getElementById('invoice-selector-modal').classList.remove('active'); Renderers.renderPaymentList(); return; }
        
        if (btn.id === 'btn-gen-item-code') { document.getElementById('item-code').value = `ITM-${Math.floor(Math.random()*9999)}`; return; }
        if (btn.id === 'btn-gen-invoice') { document.getElementById('receive-invoice').value = `INV-${Date.now().toString().slice(-6)}`; return; }

        // Remove Row Logic
        if (btn.classList.contains('danger') && btn.dataset.index !== undefined && btn.textContent === 'X') {
            const row = btn.closest('tr');
            const tableId = row.closest('table').id;
            const idx = parseInt(btn.dataset.index);
            
            const tableMap = {
                'table-receive-list': { list: 'currentReceiveList', render: Renderers.renderReceiveListTable },
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
            return;
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
            return;
        }

        // Approve/Reject Financials
        if (btn.classList.contains('btn-approve-financial') || btn.classList.contains('btn-reject-financial')) {
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            const action = btn.classList.contains('btn-approve-financial') ? 'approveFinancial' : 'rejectFinancial';
            
            if (confirm(`Confirm ${action}?`)) {
                const res = await postData(action, { id, type }, btn);
                if(res) {
                    showToast('Updated', 'success');
                    await reloadData();
                    if (type === 'receive') {
                        refreshViewData('operations');
                    } else {
                        refreshViewData('purchasing');
                    }
                }
            }
            return;
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
            return;
        }
    });

    // --- 3. GLOBAL CHANGE LISTENER (Dynamic Form Handling) ---
    document.body.addEventListener('change', (e) => {
        // Dynamic Item Type Handler (Show/Hide Parent Select)
        if (e.target.id === 'edit-item-type-select') {
            const parentGroup = document.getElementById('group-edit-item-parent');
            if (parentGroup) {
                parentGroup.style.display = e.target.value === 'Cut' ? 'block' : 'none';
            }
            return;
        }

        // Table Input Handlers
        if (e.target.classList.contains('table-input')) {
            const input = e.target;
            const row = input.closest('tr');
            const tableId = row.closest('table').id;
            const index = parseInt(input.dataset.index);
            const field = input.dataset.field;
            const val = parseFloat(input.value);

            const tableMap = {
                'table-receive-list': { list: 'currentReceiveList', render: Renderers.renderReceiveListTable },
                'table-transfer-list': { list: 'currentTransferList', render: Renderers.renderTransferListTable },
                'table-po-list': { list: 'currentPOList', render: Renderers.renderPOListTable },
                'table-return-list': { list: 'currentReturnList', render: Renderers.renderReturnListTable },
                'table-adjustment-list': { list: 'currentAdjustmentList', render: Renderers.renderAdjustmentListTable }
            };

            const config = tableMap[tableId];
            if (config && state[config.list][index]) {
                state[config.list][index][field] = isNaN(val) ? 0 : val;
                config.render();
            }
        }
        
        if (e.target.closest('#modal-invoice-list') && e.target.type === 'checkbox') {
             const num = e.target.dataset.number;
             e.target.checked ? state.invoiceModalSelections.add(num) : state.invoiceModalSelections.delete(num);
        }
        
        if (e.target.closest('#modal-item-list') && e.target.type === 'checkbox') {
             const code = e.target.dataset.code;
             e.target.checked ? state.modalSelections.add(code) : state.modalSelections.delete(code);
        }
    });

    // --- 4. EDIT/ADD FORM SUBMIT ---
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
            // 2. Invoice Header Update
            else if (type === 'invoice_header') {
                action = 'updateTransactionHeader';
                payload = {
                    batchId: form.dataset.id,
                    invoiceNumber: formData.get('invoiceNumber'),
                    supplierCode: formData.get('supplierCode'),
                    notes: formData.get('notes')
                };
            }
            // 3. Standard Updates
            else {
                // Item Links specific
                if (type === 'item') {
                    const selectedCuts = [];
                    form.querySelectorAll('input[name="DefinedCuts"]:checked').forEach(cb => selectedCuts.push(cb.value));
                    
                    if (formData.get('ItemType') === 'Main') {
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

                const isNew = !form.dataset.id;
                
                if (type === 'user') {
                    const username = formData.get('Username');
                    action = isNew ? 'addUser' : 'updateUser';
                    payload = isNew ? updates : { Username: username, updates };
                } else if (type === 'role') {
                    action = 'addRole';
                    payload = updates;
                } else if (isNew) {
                    // Master Data Creation
                    if (type === 'item') action = 'addItem';
                    if (type === 'supplier') action = 'addSupplier';
                    if (type === 'branch') action = 'addBranch';
                    if (type === 'section') action = 'addSection';
                    payload = updates; // For adds, we just send the object
                }
            }

            const res = await postData(action, payload, form.querySelector('button[type="submit"]'));
            if(res) {
                showToast('Action successful');
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
                await reloadData();
                if (type === 'user' || type === 'role' || type === 'role-permissions') {
                    refreshViewData('user-management');
                } else if (type === 'invoice_header') {
                    refreshViewData('transaction-history');
                } else {
                    refreshViewData('master-data');
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
            
            if(confirm("Print Payment Voucher?")) {
                Documents.generatePaymentVoucher(payload);
            }
            
            await reloadData();
            refreshViewData('financials');
        }
    });

    // --- TRANSACTION HANDLERS WRAPPER (Auto-Refresh) ---
    const bindBtn = (id, handler) => { 
        const btn = document.getElementById(id); 
        if(btn) {
            btn.addEventListener('click', async (e) => {
                await handler(e); 
                await reloadData();
            });
        }
    };

    bindBtn('btn-submit-receive-batch', Transactions.handleReceiveSubmit);
    bindBtn('btn-submit-transfer-batch', Transactions.handleTransferSubmit);
    bindBtn('btn-submit-po', Transactions.handlePOSubmit);
    bindBtn('btn-submit-return', Transactions.handleReturnSubmit);
    bindBtn('btn-submit-adjustment', Transactions.handleAdjustmentSubmit);

    document.getElementById('global-refresh-button').addEventListener('click', async () => { await reloadData(); });

    // --- NAVIGATION HANDLER ---
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
            // FIX: Safe check for view
            const view = e.target.closest('.view');
            if(!view) return;

            view.querySelectorAll('.sub-nav-item, .sub-view').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active');
            const subId = e.target.dataset.subview;
            const subEl = document.getElementById(`subview-${subId}`);
            if(subEl) subEl.classList.add('active');
            
            refreshViewData(view.id.replace('view-', ''));
        });
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
    
    // --- Update Mobile Header Branch Display ---
    const mobileBranchDisplay = document.getElementById('mobile-branch-display');
    if (mobileBranchDisplay) {
        const bName = u.AssignedBranchCode 
            ? (findByKey(state.branches, 'branchCode', u.AssignedBranchCode)?.branchName || u.AssignedBranchCode)
            : 'HQ';
        mobileBranchDisplay.textContent = bName;
    }

    populateOptions(document.getElementById('receive-branch'), state.branches, 'Branch', 'branchCode', 'branchName');
    populateOptions(document.getElementById('receive-supplier'), state.suppliers, 'Supplier', 'supplierCode', 'name');
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
    if(id === 'financials') { 
        populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
        populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
        const listContainer = document.getElementById('payment-invoice-list-container');
        if(listContainer) listContainer.style.display = 'none';
    }
    if(id === 'master-data') {
        Renderers.renderItemsTable();
        Renderers.renderSuppliersTable();
        Renderers.renderBranchesTable();
    }
    if(id === 'operations') {
        ['receive', 'transfer-from', 'transfer-to', 'return', 'adjustment'].forEach(prefix => {
            const el = document.getElementById(`${prefix}-branch`);
            if(el && el.options.length <= 1) populateOptions(el, state.branches, 'Branch', 'branchCode', 'branchName');
        });
        
        // --- BRANCH RESTRICTION (LOCKING) ---
        const user = state.currentUser;
        if (user && user.AssignedBranchCode) {
            const rxBranch = document.getElementById('receive-branch');
            if(rxBranch) { rxBranch.value = user.AssignedBranchCode; rxBranch.disabled = true; }
            
            const txFrom = document.getElementById('transfer-from-branch');
            if(txFrom) { txFrom.value = user.AssignedBranchCode; txFrom.disabled = true; }
            
            const retBranch = document.getElementById('return-branch');
            if(retBranch) { retBranch.value = user.AssignedBranchCode; retBranch.disabled = true; }
        }
        
        populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('supplier'), 'supplierCode', 'name');
        populateOptions(document.getElementById('return-supplier'), state.suppliers, _t('supplier'), 'supplierCode', 'name');
        
        Renderers.renderReceiveListTable();
        Renderers.renderTransferListTable();
        Renderers.renderReturnListTable();
        Renderers.renderAdjustmentListTable();
        Renderers.renderPendingTransfers();
        Renderers.renderInTransitReport();
        Renderers.renderPendingInvoices();
    }
    if(id === 'purchasing') {
        populateOptions(document.getElementById('po-supplier'), state.suppliers, 'Supplier', 'supplierCode', 'name');
        Renderers.renderPOListTable();
        Renderers.renderPurchaseOrdersViewer();
        Renderers.renderPendingPOs();
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
            
            // FIX: Safe navigation to active view
            const activeView = document.querySelector('.view.active');
            if (activeView) {
                refreshViewData(activeView.id.replace('view-', ''));
            } else {
                refreshViewData('dashboard');
            }
        }
    } catch(e) { Logger.error(e); }
}
