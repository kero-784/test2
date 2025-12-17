import { state } from './state.js';
import { postData, showToast, findByKey, formatCurrency, formatDate, _t, populateOptions } from './utils.js';
import { calculateStockLevels } from './calculations.js';
import { generateButcheryReport } from './documents.js';

// --- LOCAL STATE ---
const butcheryState = {
    initialized: false,
    currentList: [], // Local list for child items
    parentItem: null,
    reportFilter: ''
};

// --- INITIALIZATION ---
function initButcheryModule() {
    if (butcheryState.initialized) return;
    if (!document.getElementById('main-nav')) return;

    const user = state.currentUser;
    if (!user) return;

    // Check Permissions
    const canProduce = user.permissions?.opProduction === true || user.RoleName === 'Admin';
    const canViewReports = user.permissions?.viewYieldReports === true || user.RoleName === 'Admin';

    if (!canProduce && !canViewReports) return;

    injectButcheryUI(canProduce, canViewReports);
    attachButcheryListeners();
    butcheryState.initialized = true;
    console.log("Butchery Module Loaded (Standalone)");
}

// --- UI INJECTION ---
function injectButcheryUI(canProduce, canViewReports) {
    // 1. Sidebar Link
    const sidebar = document.getElementById('main-nav');
    if (sidebar && !document.getElementById('nav-butchery-link')) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `<a href="#" id="nav-butchery-link" data-view="butchery-ext">
            <svg style="width:22px;height:22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            <span style="margin-left:10px;">Butchery & Yield</span>
        </a>`;
        
        // Insert after Operations
        const refEntry = sidebar.querySelector('a[data-view="operations"]')?.parentElement;
        if (refEntry) refEntry.after(li);
        else sidebar.appendChild(li);
    }

    // 2. Main View Container
    const mainContent = document.querySelector('.main-content');
    if (mainContent && !document.getElementById('view-butchery-ext')) {
        const viewDiv = document.createElement('div');
        viewDiv.id = 'view-butchery-ext';
        viewDiv.className = 'view';
        
        let tabsHtml = '';
        if (canProduce) tabsHtml += `<button class="sub-nav-item active" data-target="butchery-prod">Production</button>`;
        if (canViewReports) tabsHtml += `<button class="sub-nav-item ${!canProduce ? 'active' : ''}" data-target="butchery-report">Yield Analysis</button>`;

        viewDiv.innerHTML = `
            <div class="sub-nav">${tabsHtml}</div>

            <!-- TAB 1: PRODUCTION -->
            <div id="tab-butchery-prod" class="butchery-tab" style="display:${canProduce ? 'block' : 'none'}">
                <div class="card">
                    <h2>Butchery Production</h2>
                    <p style="color:var(--text-light-color); margin-bottom: 20px;">Convert primal cuts (Parents) into portioned cuts (Children).</p>
                    <form id="ext-form-butchery" class="form-grid" onsubmit="return false;">
                        <div class="form-group"><label>Branch</label><select id="ext-butchery-branch" required></select></div>
                        <div class="form-group">
                            <label>Parent Item</label>
                            <div style="display:flex; gap:5px;">
                                <input type="text" id="ext-butchery-parent-display" readonly placeholder="Select item..." required>
                                <input type="hidden" id="ext-butchery-parent-code">
                                <button class="secondary small" id="ext-btn-sel-parent">Select</button>
                            </div>
                        </div>
                        <div class="form-group"><label>Weight (KG)</label><input type="number" id="ext-butchery-parent-qty" step="0.001" min="0" required></div>
                        <div class="form-group"><label>New Batch #</label><input type="text" id="ext-butchery-batch" placeholder="Leave empty to auto-generate"></div>
                        <div class="form-group"><label>New Expiry Date</label><input type="date" id="ext-butchery-expiry" required></div>
                    </form>
                </div>

                <div class="card">
                    <h2>Yield Results</h2>
                    <div class="report-area">
                        <table id="ext-butchery-table">
                            <thead><tr><th>Item Code</th><th>Item Name</th><th>Weight (KG)</th><th>Action</th></tr></thead>
                            <tbody></tbody>
                            <tfoot>
                                <tr><td colspan="2" style="text-align:right;"><strong>Total Output:</strong></td><td id="ext-butchery-total">0.000</td><td></td></tr>
                                <tr><td colspan="2" style="text-align:right;"><strong>Yield %:</strong></td><td id="ext-butchery-yield">0%</td><td></td></tr>
                            </tfoot>
                        </table>
                    </div>
                    <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap:wrap;">
                        <button type="button" class="secondary" id="ext-btn-add-cuts">Add Cuts</button>
                        <button id="ext-btn-submit-butchery" class="primary">Process Production</button>
                    </div>
                </div>
            </div>

            <!-- TAB 2: REPORTS -->
            <div id="tab-butchery-report" class="butchery-tab" style="display:${!canProduce && canViewReports ? 'block' : 'none'}">
                 <div class="card">
                    <div class="toolbar">
                        <h2>Butchery Production History</h2>
                        <div class="filters-container">
                            <select id="ext-yield-type" class="small"><option value="batch">By Production Batch</option><option value="item">By Parent Item</option></select>
                            <input type="text" id="ext-yield-search" class="small" placeholder="Search Batch or Item...">
                            <button id="ext-btn-gen-report" class="primary small">Generate</button>
                        </div>
                    </div>
                    <div id="ext-yield-results" class="report-area"><p style="text-align:center; color:#888;">Select options and click Generate.</p></div>
                </div>
            </div>

            <!-- MODAL: ITEM SELECTOR -->
            <div id="ext-butchery-modal" class="modal-overlay">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header"><h2 id="ext-modal-title">Select Item</h2><button class="close-button" id="ext-modal-close">×</button></div>
                    <div class="modal-body">
                        <input type="search" id="ext-modal-search" placeholder="Search..." class="search-bar-input" style="margin-bottom:10px;">
                        <div id="ext-modal-list" style="display:flex; flex-direction:column; gap:5px; max-height:400px; overflow-y:auto;"></div>
                    </div>
                </div>
            </div>
        `;
        mainContent.appendChild(viewDiv);
    }
}

// --- LOGIC & HANDLERS ---

function attachButcheryListeners() {
    // Nav Click
    document.getElementById('nav-butchery-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
        document.getElementById('view-butchery-ext').classList.add('active');
        e.currentTarget.classList.add('active');
        refreshButcheryContext();
    });

    // Tab Switching
    document.querySelectorAll('#view-butchery-ext .sub-nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#view-butchery-ext .sub-nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.butchery-tab').forEach(t => t.style.display = 'none');
            e.target.classList.add('active');
            document.getElementById(`tab-${e.target.dataset.target}`).style.display = 'block';
        });
    });

    // Production Actions
    document.getElementById('ext-btn-sel-parent')?.addEventListener('click', () => openItemModal('parent'));
    document.getElementById('ext-btn-add-cuts')?.addEventListener('click', () => openItemModal('child'));
    document.getElementById('ext-btn-submit-butchery')?.addEventListener('click', submitButcheryProduction);
    document.getElementById('ext-butchery-parent-qty')?.addEventListener('input', renderButcheryTable);
    
    // Modal Actions
    document.getElementById('ext-modal-close')?.addEventListener('click', () => document.getElementById('ext-butchery-modal').classList.remove('active'));
    document.getElementById('ext-modal-search')?.addEventListener('input', (e) => renderItemModalList(e.target.value, document.getElementById('ext-butchery-modal').dataset.context));

    // Table Interactions (Remove & Edit)
    document.querySelector('#ext-butchery-table tbody')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('ext-remove-row')) {
            const idx = e.target.dataset.index;
            butcheryState.currentList.splice(idx, 1);
            renderButcheryTable();
        }
    });
    document.querySelector('#ext-butchery-table tbody')?.addEventListener('change', (e) => {
        if (e.target.classList.contains('ext-qty-input')) {
            const idx = e.target.dataset.index;
            butcheryState.currentList[idx].quantity = parseFloat(e.target.value) || 0;
            renderButcheryTable();
        }
    });

    // Report Actions
    document.getElementById('ext-btn-gen-report')?.addEventListener('click', generateReport);
    
    // Dynamic Print Button Listener
    document.getElementById('ext-yield-results')?.addEventListener('click', (e) => {
        if(e.target.classList.contains('ext-btn-print-rpt')) {
            const batchId = e.target.dataset.batch;
            // Need to reconstruct data from state transactions
            const txs = state.transactions.filter(t => t.batchId === batchId && (t.type === 'production_in' || t.type === 'production_out'));
            const parentTx = txs.find(t => t.type === 'production_out');
            const childTxs = txs.filter(t => t.type === 'production_in');
            
            if(parentTx) {
                const data = {
                    batchNo: batchId,
                    date: parentTx.date,
                    branchCode: parentTx.branchCode,
                    parentItemCode: parentTx.itemCode,
                    parentQuantity: parseFloat(parentTx.quantity),
                    childItems: childTxs
                };
                generateButcheryReport(data);
            }
        }
    });
}

function refreshButcheryContext() {
    const sel = document.getElementById('ext-butchery-branch');
    if(sel && sel.options.length === 0) {
        populateOptions(sel, state.branches, 'Select Branch', 'branchCode', 'branchName');
    }
}

// --- MODAL LOGIC ---
function openItemModal(context) {
    const modal = document.getElementById('ext-butchery-modal');
    modal.dataset.context = context;
    document.getElementById('ext-modal-title').innerText = context === 'parent' ? 'Select Parent Item' : 'Select Cuts';
    document.getElementById('ext-modal-search').value = '';
    renderItemModalList('', context);
    modal.classList.add('active');
}

function renderItemModalList(filter = '', context) {
    const container = document.getElementById('ext-modal-list');
    container.innerHTML = '';
    const lower = filter.toLowerCase();

    // Context Filtering
    let items = state.items.filter(i => String(i.isActive) !== 'false');
    
    // If Child context, try to filter by defined cuts of parent
    if (context === 'child' && butcheryState.parentItem && butcheryState.parentItem.DefinedCuts) {
        const allowed = butcheryState.parentItem.DefinedCuts.split(',');
        items = items.filter(i => allowed.includes(i.code) || i.name.toLowerCase().includes(lower));
    } else {
        items = items.filter(i => i.name.toLowerCase().includes(lower) || i.code.toLowerCase().includes(lower));
    }

    items.slice(0, 50).forEach(item => {
        const div = document.createElement('div');
        div.style.padding = '10px';
        div.style.borderBottom = '1px solid #eee';
        div.style.cursor = 'pointer';
        div.innerHTML = `<strong>${item.name}</strong> <small>(${item.code})</small>`;
        
        div.onclick = () => {
            if (context === 'parent') {
                document.getElementById('ext-butchery-parent-display').value = item.name;
                document.getElementById('ext-butchery-parent-code').value = item.code;
                butcheryState.parentItem = item;
                butcheryState.currentList = []; // Reset children on parent change
                renderButcheryTable();
            } else {
                // Add Child
                if (!butcheryState.currentList.find(x => x.itemCode === item.code)) {
                    butcheryState.currentList.push({ itemCode: item.code, itemName: item.name, quantity: 0 });
                    renderButcheryTable();
                }
            }
            document.getElementById('ext-butchery-modal').classList.remove('active');
        };
        container.appendChild(div);
    });
}

// --- TABLE RENDERER ---
function renderButcheryTable() {
    const tbody = document.querySelector('#ext-butchery-table tbody');
    tbody.innerHTML = '';
    let totalOutput = 0;

    butcheryState.currentList.forEach((row, idx) => {
        totalOutput += row.quantity;
        tbody.innerHTML += `
            <tr>
                <td>${row.itemCode}</td>
                <td>${row.itemName}</td>
                <td><input type="number" class="table-input ext-qty-input" data-index="${idx}" value="${row.quantity}" step="0.001"></td>
                <td><button class="danger small ext-remove-row" data-index="${idx}">X</button></td>
            </tr>`;
    });

    const parentQty = parseFloat(document.getElementById('ext-butchery-parent-qty').value) || 0;
    const yieldPct = parentQty > 0 ? ((totalOutput / parentQty) * 100) : 0;
    
    document.getElementById('ext-butchery-total').innerText = totalOutput.toFixed(3);
    const yEl = document.getElementById('ext-butchery-yield');
    yEl.innerText = yieldPct.toFixed(1) + '%';
    yEl.style.color = (yieldPct < 50 || yieldPct > 102) ? 'red' : 'green';
}

// --- SUBMISSION ---
async function submitButcheryProduction() {
    const parentCode = document.getElementById('ext-butchery-parent-code').value;
    let parentQty = parseFloat(document.getElementById('ext-butchery-parent-qty').value);
    const branchCode = document.getElementById('ext-butchery-branch').value;
    let batchNo = document.getElementById('ext-butchery-batch').value;
    const expiry = document.getElementById('ext-butchery-expiry').value;

    if (!parentCode || !parentQty || !branchCode || !expiry || butcheryState.currentList.length === 0) {
        showToast('Please fill all fields and add at least one cut.', 'error');
        return;
    }

    // Stock Check
    const stock = calculateStockLevels();
    const available = stock[branchCode]?.[parentCode]?.quantity || 0;
    
    if (parentQty > available) {
        showToast(`Insufficient Stock. Available: ${available.toFixed(3)}`, 'error');
        return;
    }

    // Weight Check
    const outputWeight = butcheryState.currentList.reduce((a,b) => a+b.quantity, 0);
    const diff = parentQty - outputWeight;

    if (diff > 0.001) {
        if(!confirm(`Weight Mismatch!\nInput: ${parentQty}\nOutput: ${outputWeight.toFixed(3)}\nRemaining: ${diff.toFixed(3)}\n\nClick OK to keep remaining weight in stock.`)) return;
        parentQty = outputWeight; // Adjust OUT to match IN so remainder stays
    } else if (diff < -0.001) {
        showToast('Error: Output cannot exceed Input.', 'error');
        return;
    }

    if(!batchNo) batchNo = `PRD-${Date.now().toString().slice(-6)}`;
    const parentCost = stock[branchCode]?.[parentCode]?.avgCost || 0;

    const childItems = butcheryState.currentList.map(c => ({
        itemCode: c.itemCode,
        itemName: c.itemName,
        quantity: c.quantity,
        cost: parentCost // Inherit cost logic
    }));

    const payload = {
        parentItemCode: parentCode,
        parentQuantity: parentQty,
        branchCode: branchCode,
        childItems: childItems,
        batchNo: batchNo,
        expiryDate: expiry,
        notes: 'Standalone Butchery'
    };

    const btn = document.getElementById('ext-btn-submit-butchery');
    const res = await postData('processButchery', payload, btn);
    
    if (res) {
        showToast('Production Successful', 'success');
        // Update Local State for immediate view
        const now = new Date().toISOString();
        state.transactions.push({
            batchId: batchNo, date: now, type: 'production_out', itemCode: parentCode, quantity: parentQty, cost: parentCost, branchCode: branchCode, fromBranchCode: branchCode, Status: 'Completed', isApproved: true
        });
        childItems.forEach(c => state.transactions.push({
            batchId: batchNo, date: now, type: 'production_in', itemCode: c.itemCode, quantity: c.quantity, cost: c.cost, branchCode: branchCode, Status: 'Completed', isApproved: true
        }));
        
        // Reset Form
        butcheryState.currentList = [];
        document.getElementById('ext-form-butchery').reset();
        document.getElementById('ext-butchery-parent-code').value = '';
        document.getElementById('ext-butchery-parent-display').value = '';
        renderButcheryTable();
    }
}

// --- REPORT GENERATION ---
function generateReport() {
    const type = document.getElementById('ext-yield-type').value;
    const search = document.getElementById('ext-yield-search').value.toLowerCase();
    const container = document.getElementById('ext-yield-results');
    
    container.innerHTML = 'Loading...';

    // Group Transactions
    const batches = {};
    state.transactions.forEach(t => {
        if (t.type === 'production_out' || t.type === 'production_in') {
            if(!batches[t.batchId]) batches[t.batchId] = { id: t.batchId, date: t.date, parent: null, children: [] };
            if (t.type === 'production_out') batches[t.batchId].parent = t;
            else batches[t.batchId].children.push(t);
        }
    });

    const list = Object.values(batches).filter(b => b.parent).sort((a,b) => new Date(b.date) - new Date(a.date));
    let html = '';

    if (type === 'batch') {
        html = `<table style="width:100%"><thead><tr><th>Date</th><th>Batch</th><th>Parent</th><th>In</th><th>Out</th><th>%</th><th>Action</th></tr></thead><tbody>`;
        list.forEach(b => {
            if (search && !b.id.toLowerCase().includes(search)) return;
            const pName = findByKey(state.items, 'code', b.parent.itemCode)?.name || b.parent.itemCode;
            const outW = b.children.reduce((acc, c) => acc + parseFloat(c.quantity), 0);
            const inW = parseFloat(b.parent.quantity);
            const pct = inW > 0 ? (outW / inW * 100).toFixed(1) : 0;
            
            html += `<tr><td>${formatDate(b.date)}</td><td>${b.id}</td><td>${pName}</td><td>${inW.toFixed(2)}</td><td>${outW.toFixed(2)}</td><td>${pct}%</td><td><button class="secondary small ext-btn-print-rpt" data-batch="${b.id}">Print</button></td></tr>`;
        });
        html += '</tbody></table>';
    } else {
        // By Item Summary
        const items = {};
        list.forEach(b => {
            const pc = b.parent.itemCode;
            if(!items[pc]) items[pc] = { name: findByKey(state.items, 'code', pc)?.name, totalIn: 0, totalOut: 0, count: 0 };
            items[pc].totalIn += parseFloat(b.parent.quantity);
            items[pc].totalOut += b.children.reduce((a,c) => a + parseFloat(c.quantity), 0);
            items[pc].count++;
        });
        
        html = `<table style="width:100%"><thead><tr><th>Item Code</th><th>Name</th><th>Batches</th><th>Total Input</th><th>Total Output</th><th>Avg Yield</th></tr></thead><tbody>`;
        for(const [code, data] of Object.entries(items)) {
            if (search && !data.name.toLowerCase().includes(search)) continue;
            const pct = data.totalIn > 0 ? (data.totalOut / data.totalIn * 100).toFixed(1) : 0;
            html += `<tr><td>${code}</td><td>${data.name}</td><td>${data.count}</td><td>${data.totalIn.toFixed(2)}</td><td>${data.totalOut.toFixed(2)}</td><td>${pct}%</td></tr>`;
        }
        html += '</tbody></table>';
    }
    
    container.innerHTML = html || '<p style="text-align:center">No records found.</p>';
}

// Auto-init
const interval = setInterval(() => {
    if (state.currentUser && document.getElementById('main-nav')) {
        initButcheryModule();
        clearInterval(interval);
    }
}, 500);