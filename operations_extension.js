import { state, resetStateLists } from './state.js';
import { postData, showToast, findByKey, formatCurrency, formatDate, _t, populateOptions, generateId, requestAdminContext } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import { generateReceiveDocument, generateTransferDocument, generateReturnDocument } from './documents.js';

const opsState = {
    initialized: false
};

// --- INITIALIZATION ---
function initOperationsModule() {
    if (opsState.initialized) return;
    if (!document.getElementById('main-nav')) return;

    const user = state.currentUser;
    if (!user) return;

    // Check Permissions (Any of these grants access to the view)
    const perms = ['opReceive', 'opTransfer', 'opReturn', 'opStockAdjustment', 'opApproveGRN'];
    const hasAccess = perms.some(p => user.permissions?.[p]) || user.RoleName === 'Admin';

    if (!hasAccess) return;

    injectOperationsUI(user);
    attachOperationsListeners();
    // Run initial renderers
    renderAllOpsTables();
    updateOpsNotifications();
    
    opsState.initialized = true;
    console.log("Operations Module Loaded (Standalone)");
}

// --- UI INJECTION ---
function injectOperationsUI(user) {
    // 1. Sidebar Link - Injected AFTER Dashboard
    const sidebar = document.getElementById('main-nav');
    if (sidebar && !document.getElementById('nav-operations-link')) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `<a href="#" id="nav-operations-link" data-view="operations-ext">
            <svg style="width:22px;height:22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            <span style="margin-left:10px;">Stock Operations</span>
        </a>`;
        
        // LOGIC: Insert AFTER 'Dashboard'
        const dashboardBtn = sidebar.querySelector('a[data-view="dashboard"]')?.parentElement;
        if (dashboardBtn) {
            dashboardBtn.after(li);
        } else {
            sidebar.prepend(li);
        }
    }

    // 2. Main View
    const mainContent = document.querySelector('.main-content');
    if (mainContent && !document.getElementById('view-operations-ext')) {
        const viewDiv = document.createElement('div');
        viewDiv.id = 'view-operations-ext';
        viewDiv.className = 'view';
        
        viewDiv.innerHTML = `
            <div class="sub-nav">
                <button class="sub-nav-item active" data-target="ops-receive">Receive Stock</button>
                <button class="sub-nav-item" data-target="ops-invoices">Pending Invoices</button>
                <button class="sub-nav-item" data-target="ops-transfer">Internal Transfer</button>
                <button class="sub-nav-item" data-target="ops-return">Return to Supplier</button>
                <button class="sub-nav-item" data-target="ops-intransit">In-Transit Report</button>
                <button class="sub-nav-item" data-target="ops-adjust">Adjustments</button>
            </div>

            <!-- 1. RECEIVE -->
            <div id="tab-ops-receive" class="ops-tab" style="display:block;">
                <div class="card" id="ext-pending-transfers-card" style="display: none;">
                    <h2>Pending Incoming Transfers</h2>
                    <div class="report-area"><table id="ext-table-pending-transfers"><thead><tr><th>Date Sent</th><th>From Branch</th><th>Ref #</th><th>Items</th><th>Actions</th></tr></thead><tbody></tbody></table></div>
                </div>
                <div class="card">
                    <h2>Receive Stock from Supplier</h2>
                    <form id="ext-form-receive" class="form-grid">
                        <div class="form-group"><label>Receive Against PO <small>(Optional)</small></label><select id="ext-receive-po"></select></div>
                        <div class="form-group"><label>Supplier</label><select id="ext-receive-supplier" required></select></div>
                        <div class="form-group"><label>Invoice Number</label><div style="display:flex; gap:5px;"><input type="text" id="ext-receive-invoice" required><button type="button" class="secondary small" id="ext-btn-gen-inv">Auto</button></div></div>
                        <div class="form-group"><label>To Branch</label><select id="ext-receive-branch" required></select></div>
                        <div class="form-group"><label>Batch / Lot Number</label><input type="text" id="ext-receive-batch" placeholder="Auto-generate if empty"></div>
                        <div class="form-group"><label>Expiry Date</label><input type="date" id="ext-receive-expiry" required></div>
                        <div class="form-group span-full"><label>Notes</label><textarea id="ext-receive-notes" rows="2"></textarea></div>
                    </form>
                </div>
                <div class="card">
                    <h2>Items to be Received</h2>
                    <div class="report-area">
                        <table id="ext-table-receive-list">
                            <thead><tr><th>Code</th><th>Item Name</th><th>Quantity</th><th>Cost/Unit</th><th>Total</th><th>Action</th></tr></thead>
                            <tbody></tbody>
                            <tfoot><tr><td colspan="4" style="text-align: right;">Grand Total:</td><td id="ext-receive-total" colspan="2">0.00</td></tr></tfoot>
                        </table>
                    </div>
                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="secondary ext-btn-select-items" data-context="receive">Select Items</button>
                        <button id="ext-btn-submit-receive" class="primary">Submit Stock Receipt</button>
                    </div>
                </div>
            </div>

            <!-- 2. PENDING INVOICES -->
            <div id="tab-ops-invoices" class="ops-tab" style="display:none;">
                <div class="card">
                    <h2>Pending Invoices (GRNs)</h2>
                    <div class="report-area"><table id="ext-table-pending-invoices"><thead><tr><th>Date</th><th>Ref #</th><th>Details</th><th>Amount</th><th>Actions</th></tr></thead><tbody></tbody></table></div>
                </div>
            </div>

            <!-- 3. TRANSFER -->
            <div id="tab-ops-transfer" class="ops-tab" style="display:none;">
                <div class="card">
                    <h2>Send Stock to Another Branch</h2>
                    <form id="ext-form-transfer" class="form-grid">
                        <div class="form-group"><label>From Branch</label><select id="ext-transfer-from" required></select></div>
                        <div class="form-group"><label>To Branch</label><select id="ext-transfer-to" required></select></div>
                        <div class="form-group"><label>Transfer Ref #</label><input type="text" id="ext-transfer-ref" readonly></div>
                        <div class="form-group span-full"><label>Notes</label><textarea id="ext-transfer-notes" rows="2"></textarea></div>
                    </form>
                </div>
                <div class="card">
                    <h2>Items to be Transferred</h2>
                    <div class="report-area">
                        <table id="ext-table-transfer-list">
                            <thead><tr><th>Code</th><th>Item</th><th>Available</th><th>Qty to Transfer</th><th>Action</th></tr></thead>
                            <tbody></tbody>
                        </table>
                    </div>
                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="secondary ext-btn-select-items" data-context="transfer">Select Items</button>
                        <button id="ext-btn-submit-transfer" class="primary">Confirm Transfer</button>
                    </div>
                </div>
            </div>

            <!-- 4. RETURN -->
            <div id="tab-ops-return" class="ops-tab" style="display:none;">
                <div class="card">
                    <h2>Return to Supplier</h2>
                    <form id="ext-form-return" class="form-grid">
                        <div class="form-group"><label>Supplier</label><select id="ext-return-supplier" required></select></div>
                        <div class="form-group"><label>From Branch</label><select id="ext-return-branch" required></select></div>
                        <div class="form-group"><label>Credit Note Ref</label><input type="text" id="ext-return-ref" required></div>
                        <div class="form-group span-full"><label>Reason</label><textarea id="ext-return-notes" rows="2"></textarea></div>
                    </form>
                </div>
                <div class="card">
                    <h2>Items to Return</h2>
                    <div class="report-area">
                        <table id="ext-table-return-list">
                            <thead><tr><th>Code</th><th>Item</th><th>Available</th><th>Qty Return</th><th>Cost</th><th>Action</th></tr></thead>
                            <tbody></tbody>
                            <tfoot><tr><td colspan="4" style="text-align: right;">Total Value:</td><td id="ext-return-total" colspan="2">0.00</td></tr></tfoot>
                        </table>
                    </div>
                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="secondary ext-btn-select-items" data-context="return">Select Items</button>
                        <button id="ext-btn-submit-return" class="primary">Confirm Return</button>
                    </div>
                </div>
            </div>

            <!-- 5. IN-TRANSIT -->
            <div id="tab-ops-intransit" class="ops-tab" style="display:none;">
                <div class="card">
                    <h2>Goods In-Transit Report</h2>
                    <div class="report-area"><table id="ext-table-intransit"><thead><tr><th>Date Sent</th><th>From</th><th>To</th><th>Ref #</th><th>Items</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody></table></div>
                </div>
            </div>

            <!-- 6. ADJUSTMENTS -->
            <div id="tab-ops-adjust" class="ops-tab" style="display:none;">
                <div class="card">
                    <h2>Stock Adjustment</h2>
                    <form id="ext-form-adjust" class="form-grid">
                        <div class="form-group"><label>Branch</label><select id="ext-adjust-branch" required></select></div>
                        <div class="form-group"><label>Reference</label><input type="text" id="ext-adjust-ref" required placeholder="e.g. Stocktake"></div>
                        <div class="form-group span-full"><label>Notes</label><textarea id="ext-adjust-notes" rows="2"></textarea></div>
                    </form>
                </div>
                <div class="card">
                    <h2>Items to Adjust</h2>
                    <div class="report-area">
                        <table id="ext-table-adjust-list">
                            <thead><tr><th>Code</th><th>Item</th><th>System Qty</th><th>Physical Count</th><th>Adjustment</th><th>Action</th></tr></thead>
                            <tbody></tbody>
                        </table>
                    </div>
                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="secondary ext-btn-select-items" data-context="adjustment">Select Items</button>
                        <button id="ext-btn-submit-adjust" class="primary">Process Adjustment</button>
                    </div>
                </div>
            </div>
        `;
        mainContent.appendChild(viewDiv);
    }
}

// --- LOGIC & LISTENERS ---
function attachOperationsListeners() {
    // 1. Navigation & Tabs
    document.getElementById('nav-operations-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
        document.getElementById('view-operations-ext').classList.add('active');
        e.currentTarget.classList.add('active');
        refreshOpsContext();
    });

    document.querySelectorAll('#view-operations-ext .sub-nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#view-operations-ext .sub-nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.ops-tab').forEach(t => t.style.display = 'none');
            e.target.classList.add('active');
            document.getElementById(`tab-${e.target.dataset.target}`).style.display = 'block';
            
            // Auto refresh specific tables when tab is clicked
            if(e.target.dataset.target === 'ops-intransit') renderOpsInTransit();
            if(e.target.dataset.target === 'ops-invoices') renderOpsPendingInvoices();
        });
    });

    // 2. Button Handlers
    document.getElementById('ext-btn-gen-inv')?.addEventListener('click', () => document.getElementById('ext-receive-invoice').value = `INV-${Date.now().toString().slice(-6)}`);
    document.getElementById('ext-btn-submit-receive')?.addEventListener('click', handleReceiveSubmit);
    document.getElementById('ext-btn-submit-transfer')?.addEventListener('click', handleTransferSubmit);
    document.getElementById('ext-btn-submit-return')?.addEventListener('click', handleReturnSubmit);
    document.getElementById('ext-btn-submit-adjust')?.addEventListener('click', handleAdjustmentSubmit);

    // 3. Global Modal Integration (Select Items)
    document.querySelectorAll('.ext-btn-select-items').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const context = e.target.dataset.context;
            // Use global modal logic
            state.currentSelectionModal.type = 'item-selector';
            const m = document.getElementById('item-selector-modal');
            m.dataset.context = context; 
            state.modalSelections.clear();
            // We need to call the global render function for the modal list
            import('./renderers.js').then(module => {
                module.renderItemsInModal();
                m.classList.add('active');
            });
        });
    });

    // 4. Listen for Global Modal Confirmation (The tricky part)
    document.getElementById('btn-confirm-modal-selection')?.addEventListener('click', () => {
        const m = document.getElementById('item-selector-modal');
        const ctx = m.dataset.context;
        const sel = Array.from(state.modalSelections);
        
        // Define mapping for THIS extension's contexts
        const map = { 
            'receive': 'currentReceiveList', 
            'transfer': 'currentTransferList', 
            'return': 'currentReturnList', 
            'adjustment': 'currentAdjustmentList'
        };
        
        const listName = map[ctx];
        if(listName) {
            sel.forEach(c => {
                const i = findByKey(state.items, 'code', c);
                if(i && !state[listName].find(x => x.itemCode === c)) {
                    state[listName].push({ itemCode: i.code, itemName: i.name, quantity: '', cost: parseFloat(i.cost) || 0 });
                }
            });
            // Re-render relevant table
            renderAllOpsTables();
        }
    });

    // 5. Dynamic Table Inputs (Delegation)
    const handleInput = (e, listName, tableRenderer) => {
        if (e.target.classList.contains('table-input')) {
            const idx = e.target.dataset.index;
            const field = e.target.dataset.field;
            const val = parseFloat(e.target.value);
            state[listName][idx][field] = isNaN(val) ? 0 : val;
            tableRenderer();
        }
    };
    
    document.getElementById('ext-table-receive-list')?.addEventListener('change', (e) => handleInput(e, 'currentReceiveList', renderOpsReceiveTable));
    document.getElementById('ext-table-transfer-list')?.addEventListener('change', (e) => handleInput(e, 'currentTransferList', renderOpsTransferTable));
    document.getElementById('ext-table-return-list')?.addEventListener('change', (e) => handleInput(e, 'currentReturnList', renderOpsReturnTable));
    document.getElementById('ext-table-adjust-list')?.addEventListener('change', (e) => handleInput(e, 'currentAdjustmentList', renderOpsAdjustTable));

    // 6. Remove Row Handlers
    const handleRemove = (e, listName, tableRenderer) => {
        if(e.target.classList.contains('danger')) {
            state[listName].splice(e.target.dataset.index, 1);
            tableRenderer();
        }
    };
    ['receive', 'transfer', 'return', 'adjust'].forEach(k => {
        const list = k === 'adjust' ? 'currentAdjustmentList' : `current${k.charAt(0).toUpperCase() + k.slice(1)}List`;
        document.getElementById(`ext-table-${k}-list`)?.addEventListener('click', (e) => handleRemove(e, list, eval(`renderOps${k.charAt(0).toUpperCase() + k.slice(1)}Table`)));
    });

    // 7. Action Buttons in Reports (Approve/Reject/Receive Transfer)
    document.body.addEventListener('click', async (e) => {
        if(e.target.classList.contains('ext-btn-approve-fin')) {
            if(confirm('Approve Invoice?')) {
                await postData('approveFinancial', { id: e.target.dataset.id, type: 'receive' }, e.target);
                location.reload();
            }
        }
        if(e.target.classList.contains('ext-btn-receive-transfer')) {
            const batchId = e.target.dataset.batch;
            import('./transactions.js').then(mod => mod.openTransferModal(batchId));
        }
        if(e.target.classList.contains('ext-btn-cancel-transfer')) {
            const batchId = e.target.dataset.batch;
            import('./transactions.js').then(mod => mod.handleCancelTransfer(batchId, e.target));
        }
    });
}

function refreshOpsContext() {
    const user = state.currentUser;
    // Populate Selects
    ['receive', 'transfer-from', 'transfer-to', 'return', 'adjust'].forEach(k => {
        const el = document.getElementById(`ext-${k}-branch`); // Mapped ID
        if(el && el.options.length <= 1) populateOptions(el, state.branches, 'Select Branch', 'branchCode', 'branchName');
    });
    
    // User Branch Locking
    if (user && user.AssignedBranchCode) {
        const els = ['ext-receive-branch', 'ext-transfer-from', 'ext-return-branch', 'ext-adjust-branch'];
        els.forEach(id => {
            const el = document.getElementById(id);
            if(el) { el.value = user.AssignedBranchCode; el.disabled = true; }
        });
    }

    populateOptions(document.getElementById('ext-receive-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
    populateOptions(document.getElementById('ext-return-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
    
    // Refresh Tables
    renderAllOpsTables();
    updateOpsNotifications();
}

// --- RENDERERS (Local to Extension) ---

function renderAllOpsTables() {
    renderOpsReceiveTable();
    renderOpsTransferTable();
    renderOpsReturnTable();
    renderOpsAdjustTable();
    renderOpsPendingTransfers();
    renderOpsInTransit();
    renderOpsPendingInvoices();
}

function renderOpsReceiveTable() {
    const tbody = document.querySelector('#ext-table-receive-list tbody');
    if(!tbody) return; tbody.innerHTML = '';
    let total = 0;
    state.currentReceiveList.forEach((item, idx) => {
        const t = (item.quantity||0) * (item.cost||0);
        total += t;
        tbody.innerHTML += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td><input type="number" class="table-input" data-index="${idx}" data-field="quantity" value="${item.quantity}"></td><td><input type="number" class="table-input" data-index="${idx}" data-field="cost" value="${item.cost}"></td><td>${formatCurrency(t)}</td><td><button class="danger small" data-index="${idx}">X</button></td></tr>`;
    });
    document.getElementById('ext-receive-total').innerText = formatCurrency(total);
}

function renderOpsTransferTable() {
    const tbody = document.querySelector('#ext-table-transfer-list tbody');
    if(!tbody) return; tbody.innerHTML = '';
    const stock = calculateStockLevels();
    const fromBranch = document.getElementById('ext-transfer-from').value;
    
    state.currentTransferList.forEach((item, idx) => {
        const avail = fromBranch ? (stock[fromBranch]?.[item.itemCode]?.quantity || 0) : 0;
        tbody.innerHTML += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${avail.toFixed(3)}</td><td><input type="number" class="table-input" data-index="${idx}" data-field="quantity" value="${item.quantity}"></td><td><button class="danger small" data-index="${idx}">X</button></td></tr>`;
    });
}

function renderOpsReturnTable() {
    const tbody = document.querySelector('#ext-table-return-list tbody');
    if(!tbody) return; tbody.innerHTML = '';
    const stock = calculateStockLevels();
    const fromBranch = document.getElementById('ext-return-branch').value;
    let total = 0;

    state.currentReturnList.forEach((item, idx) => {
        const avail = fromBranch ? (stock[fromBranch]?.[item.itemCode]?.quantity || 0) : 0;
        const val = (item.quantity||0)*(item.cost||0);
        total += val;
        tbody.innerHTML += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${avail.toFixed(3)}</td><td><input type="number" class="table-input" data-index="${idx}" data-field="quantity" value="${item.quantity}"></td><td><input type="number" class="table-input" data-index="${idx}" data-field="cost" value="${item.cost}"></td><td><button class="danger small" data-index="${idx}">X</button></td></tr>`;
    });
    document.getElementById('ext-return-total').innerText = formatCurrency(total);
}

function renderOpsAdjustTable() {
    const tbody = document.querySelector('#ext-table-adjust-list tbody');
    if(!tbody) return; tbody.innerHTML = '';
    const stock = calculateStockLevels();
    const branch = document.getElementById('ext-adjust-branch').value;

    state.currentAdjustmentList.forEach((item, idx) => {
        const sys = branch ? (stock[branch]?.[item.itemCode]?.quantity || 0) : 0;
        const phy = item.physicalCount || 0;
        const adj = phy - sys;
        tbody.innerHTML += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${sys.toFixed(3)}</td><td><input type="number" class="table-input" data-index="${idx}" data-field="physicalCount" value="${phy}"></td><td style="color:${adj<0?'red':'green'}">${adj.toFixed(3)}</td><td><button class="danger small" data-index="${idx}">X</button></td></tr>`;
    });
}

function renderOpsPendingTransfers() {
    const div = document.getElementById('ext-pending-transfers-card');
    const tbody = document.querySelector('#ext-table-pending-transfers tbody');
    if(!div || !tbody) return;
    
    const myBranch = state.currentUser?.AssignedBranchCode;
    const isAdmin = state.currentUser?.permissions?.viewAllBranches;
    tbody.innerHTML = '';
    
    let count = 0;
    const seen = new Set();
    state.transactions.forEach(t => {
        if(t.type === 'transfer_out' && t.Status === 'In Transit' && !seen.has(t.batchId)) {
            if(isAdmin || t.toBranchCode === myBranch) {
                seen.add(t.batchId);
                const from = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName;
                tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${from}</td><td>${t.ref}</td><td>-</td><td><button class="primary small ext-btn-receive-transfer" data-batch="${t.batchId}">Receive</button></td></tr>`;
                count++;
            }
        }
    });
    div.style.display = count > 0 ? 'block' : 'none';
}

function renderOpsInTransit() {
    const tbody = document.querySelector('#ext-table-intransit tbody');
    if(!tbody) return; tbody.innerHTML = '';
    
    const seen = new Set();
    state.transactions.forEach(t => {
        if(t.type === 'transfer_out' && t.Status === 'In Transit' && !seen.has(t.batchId)) {
            seen.add(t.batchId);
            const from = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName;
            const to = findByKey(state.branches, 'branchCode', t.toBranchCode)?.branchName;
            
            // Check Permissions for Cancel
            let action = 'In Transit';
            if (state.currentUser.permissions?.opTransfer && (state.currentUser.AssignedBranchCode === t.fromBranchCode || state.currentUser.RoleName === 'Admin')) {
                action = `<button class="danger small ext-btn-cancel-transfer" data-batch="${t.batchId}">Cancel</button>`;
            }
            
            tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${from}</td><td>${to}</td><td>${t.ref}</td><td>-</td><td>${t.Status}</td><td>${action}</td></tr>`;
        }
    });
    if(tbody.innerHTML === '') tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No items in transit</td></tr>';
}

// Make global so transactions.js can call it
window.renderOpsInTransit = renderOpsInTransit;

function renderOpsPendingInvoices() {
    const tbody = document.querySelector('#ext-table-pending-invoices tbody');
    if(!tbody) return; tbody.innerHTML = '';
    
    const seen = new Set();
    state.transactions.forEach(t => {
        // Check for pending GRN (isApproved != true)
        const isPending = t.type === 'receive' && !(t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE');
        
        if(isPending && !seen.has(t.batchId)) {
            // Filter by branch logic if needed
            if (state.currentUser.AssignedBranchCode && t.branchCode !== state.currentUser.AssignedBranchCode) return;

            seen.add(t.batchId);
            const sup = findByKey(state.suppliers, 'supplierCode', t.supplierCode)?.name;
            const action = `<button class="primary small ext-btn-approve-fin" data-id="${t.batchId}">Approve</button>`;
            
            tbody.innerHTML += `<tr><td>${formatDate(t.date)}</td><td>${t.invoiceNumber}</td><td>GRN from ${sup}</td><td>-</td><td>${action}</td></tr>`;
        }
    });
    if(tbody.innerHTML === '') tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No pending invoices</td></tr>';
}

function updateOpsNotifications() {
    const widget = document.getElementById('pending-requests-widget');
    if(!widget) return;
    
    const myBranch = state.currentUser?.AssignedBranchCode;
    const isAdmin = state.currentUser?.permissions?.viewAllBranches;
    const incoming = new Set();
    
    state.transactions.forEach(t => {
        if (t.type === 'transfer_out' && t.Status === 'In Transit' && (isAdmin || t.toBranchCode === myBranch)) incoming.add(t.batchId);
    });
    
    if (incoming.size > 0) {
        widget.style.display = 'flex';
        document.getElementById('pending-requests-count').innerText = incoming.size;
        widget.onclick = () => document.getElementById('nav-operations-link').click();
    } else {
        widget.style.display = 'none';
    }
}

// --- SUBMISSION HANDLERS (Moved from transactions.js) ---

async function handleReceiveSubmit(e) {
    // Re-implemented locally to use local DOM IDs
    const btn = e.target;
    const branch = document.getElementById('ext-receive-branch').value;
    const supplier = document.getElementById('ext-receive-supplier').value;
    let inv = document.getElementById('ext-receive-invoice').value;
    
    if (!branch || !supplier || state.currentReceiveList.length === 0) { showToast('Missing fields', 'error'); return; }
    if (!inv) inv = `INV-${Date.now()}`;
    const batch = document.getElementById('ext-receive-batch').value || `GRN-${Date.now()}`;
    
    const payload = {
        type: 'receive', batchId: batch, supplierCode: supplier, branchCode: branch, invoiceNumber: inv,
        date: new Date().toISOString(), isApproved: false, Status: 'Pending Approval',
        items: state.currentReceiveList.map(i => ({...i, quantity: parseFloat(i.quantity), cost: parseFloat(i.cost), type: 'receive', batchNo: batch}))
    };
    
    if(await postData('addTransactionBatch', payload, btn)) {
        showToast('Received');
        payload.items.forEach(i => state.transactions.push({...i, branchCode: branch, supplierCode: supplier, isApproved: false}));
        state.currentReceiveList = [];
        generateReceiveDocument(payload);
        renderOpsReceiveTable();
        document.getElementById('ext-form-receive').reset();
    }
}

async function handleTransferSubmit(e) {
    const from = document.getElementById('ext-transfer-from').value;
    const to = document.getElementById('ext-transfer-to').value;
    if(!from || !to || from === to || state.currentTransferList.length === 0) { showToast('Invalid transfer', 'error'); return; }
    
    const ref = document.getElementById('ext-transfer-ref').value || generateId('TRN');
    const payload = {
        type: 'transfer_out', batchId: ref, ref: ref, fromBranchCode: from, toBranchCode: to, date: new Date().toISOString(),
        items: state.currentTransferList.map(i => ({ itemCode: i.itemCode, quantity: parseFloat(i.quantity), type: 'transfer_out' }))
    };
    
    if(await postData('addTransactionBatch', payload, e.target)) {
        showToast('Sent');
        payload.items.forEach(i => state.transactions.push({...i, batchId: ref, date: payload.date, fromBranchCode: from, toBranchCode: to, Status: 'In Transit'}));
        state.currentTransferList = [];
        generateTransferDocument(payload);
        renderOpsTransferTable();
        document.getElementById('ext-form-transfer').reset();
    }
}

async function handleReturnSubmit(e) {
    const sup = document.getElementById('ext-return-supplier').value;
    const branch = document.getElementById('ext-return-branch').value;
    if(!sup || !branch || state.currentReturnList.length === 0) { showToast('Error', 'error'); return; }
    
    const payload = {
        type: 'return_out', batchId: `RTN-${Date.now()}`, ref: document.getElementById('ext-return-ref').value, supplierCode: sup, fromBranchCode: branch, date: new Date().toISOString(),
        items: state.currentReturnList.map(i => ({ itemCode: i.itemCode, quantity: parseFloat(i.quantity), cost: parseFloat(i.cost), type: 'return_out' }))
    };
    
    if(await postData('addTransactionBatch', payload, e.target)) {
        showToast('Returned');
        state.currentReturnList = [];
        generateReturnDocument(payload);
        renderOpsReturnTable();
        document.getElementById('ext-form-return').reset();
    }
}

async function handleAdjustmentSubmit(e) {
    const branch = document.getElementById('ext-adjust-branch').value;
    const ref = document.getElementById('ext-adjust-ref').value;
    if(!branch || !ref || state.currentAdjustmentList.length === 0) { showToast('Error', 'error'); return; }
    
    const stock = calculateStockLevels();
    const items = state.currentAdjustmentList.map(i => {
        const sys = stock[branch]?.[i.itemCode]?.quantity || 0;
        const diff = (parseFloat(i.physicalCount)||0) - sys;
        if(Math.abs(diff) < 0.001) return null;
        return { itemCode: i.itemCode, quantity: Math.abs(diff), type: diff > 0 ? 'adjustment_in' : 'adjustment_out' };
    }).filter(Boolean);
    
    if(items.length === 0) { showToast('No changes', 'info'); return; }
    
    const payload = { type: 'stock_adjustment', batchId: `ADJ-${Date.now()}`, ref: ref, fromBranchCode: branch, items: items, date: new Date().toISOString() };
    if(await postData('addTransactionBatch', payload, e.target)) {
        showToast('Adjusted');
        state.currentAdjustmentList = [];
        renderOpsAdjustTable();
        document.getElementById('ext-form-adjust').reset();
    }
}

// Auto-Init
const interval = setInterval(() => {
    if (state.currentUser && document.getElementById('main-nav')) {
        initOperationsModule();
        clearInterval(interval);
    }
}, 500);
