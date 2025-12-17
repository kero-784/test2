

import { state } from './state.js';
import { postData, showToast, findByKey, formatCurrency, formatDate } from './utils.js';
import { calculateStockLevels } from './calculations.js';

// --- 1. LOCAL STATE ---
const salesState = {
    currentList: [],
    initialized: false,
    isAdmin: false,
    priceChanges: new Map(),
    reportSelectedBranches: new Set(),
    reportSelectedItems: new Set()
};

// --- 2. PERMISSION & INJECTION ---
function initSalesModule() {
    if(salesState.initialized) return;
    if(!document.getElementById('main-nav')) return;

    const user = state.currentUser;
    if (!user) return; 

    // View Permission: User can see Sales module if they can Record Sales OR Manage Prices
    const hasViewPermission = user.permissions?.opRecordSales || user.permissions?.opManagePriceLists || user.RoleName === 'Admin';
    
    if (!hasViewPermission) return;

    injectSalesUI();
    attachEventListeners();
    salesState.initialized = true;
    console.log("Sales Module Loaded");
}

function injectSalesUI() {
    const user = state.currentUser;
    
    // SPECIFIC PERMISSION CHECK FOR PRICE TAB
    const canManagePrices = user.permissions?.opManagePriceLists === true || user.RoleName === 'Admin';

    // A. Sidebar Link
    const sidebar = document.getElementById('main-nav');
    if (sidebar && !document.getElementById('nav-sales-link')) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.id = 'nav-item-sales'; 
        li.innerHTML = `<a href="#" id="nav-sales-link" data-view="sales">
            <svg style="width:22px;height:22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            <span style="margin-left:10px;">Sales</span>
        </a>`;
        const refEntry = sidebar.querySelector('a[data-view="operations"]')?.parentElement;
        if (refEntry) refEntry.after(li);
        else sidebar.appendChild(li);
    }

    // B. Main View
    const mainContent = document.querySelector('.main-content');
    if (mainContent && !document.getElementById('view-sales')) {
        const viewDiv = document.createElement('div');
        viewDiv.id = 'view-sales';
        viewDiv.className = 'view';
        
        // CONDITIONAL TAB RENDERING
        let tabsHtml = `<button class="sub-nav-item active" data-target="sales-record">Record Sales</button>`;
        
        if (canManagePrices) {
            tabsHtml += `<button class="sub-nav-item" data-target="sales-prices">Price Lists</button>`;
        }
        
        tabsHtml += `<button class="sub-nav-item" data-target="sales-report">Sales Reports</button>`;

        viewDiv.innerHTML = `
            <div class="sub-nav">
                ${tabsHtml}
            </div>

            <!-- TAB 1: RECORD SALES -->
            <div id="tab-sales-record" class="sales-tab active">
                <div class="card">
                    <div class="toolbar">
                        <h2>Record Sales Period</h2>
                        <div class="toolbar-actions">
                            <input type="file" id="ext-sales-upload" accept=".xlsx, .xls" style="display:none">
                            <button class="secondary small" onclick="document.getElementById('ext-sales-upload').click()">Upload Excel</button>
                            <button class="secondary small" id="ext-btn-template">Template</button>
                        </div>
                    </div>
                    <form id="ext-sales-form" class="form-grid" onsubmit="return false;">
                        <div class="form-group" id="ext-div-branch-select"><label>Default Branch (Manual)</label><select id="ext-sales-branch"></select></div>
                        <div class="form-group"><label>Period From</label><input type="date" id="ext-sales-from" required></div>
                        <div class="form-group"><label>Period To</label><input type="date" id="ext-sales-to" required></div>
                        <div class="form-group span-full"><label>Reference</label><input type="text" id="ext-sales-ref" placeholder="e.g. Weekly Sales"></div>
                    </form>
                </div>
                
                <div class="card">
                    <h2>Items to Sell</h2>
                    <div style="margin-bottom:15px;">
                        <button class="secondary" id="ext-btn-open-add-items" style="width:100%; border:1px dashed #aaa; padding:15px; font-weight:bold;">
                            + Click to Select Items
                        </button>
                    </div>
                    
                    <!-- WRAPPED IN REPORT-AREA FOR MOBILE SCROLLING -->
                    <div class="report-area">
                        <table id="ext-sales-table">
                            <thead><tr><th>Branch</th><th>Item</th><th>Stock</th><th>Qty Sold</th><th>Price</th><th>Total</th><th>Action</th></tr></thead>
                            <tbody></tbody>
                            <tfoot><tr><td colspan="5" style="text-align:right;"><strong>Total Revenue:</strong></td><td id="ext-sales-total">0.00</td><td></td></tr></tfoot>
                        </table>
                    </div>
                    <div style="margin-top:20px; text-align:right;">
                        <button id="ext-btn-submit-sales" class="primary">Confirm Sales</button>
                    </div>
                </div>
            </div>

            <!-- TAB 2: PRICE LIST MANAGEMENT -->
            ${canManagePrices ? `
            <div id="tab-sales-prices" class="sales-tab" style="display:none;">
                <div class="card">
                    <div class="toolbar">
                        <h2>Manage Price Lists</h2>
                        <div class="toolbar-actions">
                            <input type="search" id="ext-price-search" placeholder="Search Items..." class="search-bar-input">
                            <button class="primary" id="ext-btn-save-prices">Save Changes</button>
                        </div>
                    </div>
                    <div class="report-area" style="max-height:600px;">
                        <table id="ext-price-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Item Name</th>
                                    <th>Price A</th>
                                    <th>Price B</th>
                                    <th>Price C</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- TAB 3: REPORTS -->
            <div id="tab-sales-report" class="sales-tab" style="display:none;">
                <div class="card">
                    <h2>Generate Sales Report</h2>
                    <div class="form-grid">
                        <div class="form-group"><label>From Date</label><input type="date" id="rpt-date-from"></div>
                        <div class="form-group"><label>To Date</label><input type="date" id="rpt-date-to"></div>
                        <div class="form-group">
                            <label>Filter Branches</label>
                            <button class="secondary" id="rpt-btn-open-branch-modal" style="width:100%; justify-content:space-between;">
                                <span id="rpt-branch-summary">All Branches</span><span>▼</span>
                            </button>
                        </div>
                        <div class="form-group">
                            <label>Filter Items</label>
                            <button class="secondary" id="rpt-btn-open-item-modal" style="width:100%; justify-content:space-between;">
                                <span id="rpt-item-summary">All Items</span><span>▼</span>
                            </button>
                        </div>
                    </div>
                    <div style="margin-top:20px;">
                        <button class="primary" id="rpt-btn-generate">Generate Report</button>
                    </div>
                </div>
                
                <div class="card" id="rpt-result-card" style="display:none;">
                    <div class="toolbar">
                        <h2>Report Results</h2>
                        <button class="secondary small" id="rpt-btn-export">Export Excel</button>
                    </div>
                    <div class="report-area">
                        <table id="rpt-table">
                            <thead><tr><th>Date</th><th>Period</th><th>Branch</th><th>Item</th><th>Qty</th><th>Price</th><th>Revenue</th><th>Ref</th></tr></thead>
                            <tbody></tbody>
                            <tfoot><tr><td colspan="4" style="text-align:right;"><strong>Totals:</strong></td><td id="rpt-total-qty">0</td><td>-</td><td id="rpt-total-rev">0.00</td><td></td></tr></tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <!-- MODALS -->
            <div id="ext-sales-item-select-modal" class="modal-overlay">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header"><h2>Select Items to Sell</h2><button class="close-button" onclick="document.getElementById('ext-sales-item-select-modal').classList.remove('active')">×</button></div>
                    <div class="modal-body">
                        <input type="search" id="ext-sales-item-select-search" placeholder="Search item..." class="search-bar-input" style="margin-bottom:15px;">
                        <div id="ext-sales-item-select-list" style="display:flex; flex-direction:column; gap:5px; max-height:400px; overflow-y:auto;"></div>
                    </div>
                </div>
            </div>

            <div id="ext-sales-modal" class="modal-overlay">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header"><h2 id="ext-modal-title">Sales for Item</h2><button class="close-button" onclick="document.getElementById('ext-sales-modal').classList.remove('active')">×</button></div>
                    <div class="modal-body">
                        <p style="color:#666; font-size:0.9em; margin-bottom:10px;">Prices are automatically populated based on Branch Category.</p>
                        <div class="report-area">
                            <table style="width:100%"><thead><tr><th>Branch</th><th>Cat</th><th>Stock</th><th>Qty Sold</th><th>Price</th></tr></thead><tbody id="ext-modal-tbody"></tbody></table>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="primary" id="ext-btn-modal-add">Add to List</button></div>
                </div>
            </div>

            <!-- REPORT MODALS -->
            <div id="ext-rpt-branch-modal" class="modal-overlay">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header"><h2>Select Branches</h2><button class="close-button" onclick="document.getElementById('ext-rpt-branch-modal').classList.remove('active')">×</button></div>
                    <div class="modal-body">
                        <div style="margin-bottom:10px; display:flex; gap:10px;"><button class="secondary small" id="rpt-branch-all">Select All</button><button class="secondary small" id="rpt-branch-none">Clear</button></div>
                        <div id="rpt-branch-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                    </div>
                    <div class="modal-footer"><button class="primary" onclick="document.getElementById('ext-rpt-branch-modal').classList.remove('active'); updateReportSummaries();">Done</button></div>
                </div>
            </div>

            <div id="ext-rpt-item-modal" class="modal-overlay">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header"><h2>Select Items</h2><button class="close-button" onclick="document.getElementById('ext-rpt-item-modal').classList.remove('active')">×</button></div>
                    <div class="modal-body">
                        <input type="search" id="rpt-modal-item-search" placeholder="Search..." class="search-bar-input" style="margin-bottom:15px;">
                        <button class="secondary small" id="rpt-item-none" style="margin-bottom:10px;">Clear Selection</button>
                        <div id="rpt-item-list" style="display:flex; flex-direction:column; gap:5px; max-height:400px; overflow-y:auto;"></div>
                    </div>
                    <div class="modal-footer"><button class="primary" onclick="document.getElementById('ext-rpt-item-modal').classList.remove('active'); updateReportSummaries();">Done</button></div>
                </div>
            </div>
        `;
        mainContent.appendChild(viewDiv);
    }
}

// --- 3. EVENT LISTENERS ---
function attachEventListeners() {
    // Nav Click
    document.getElementById('nav-sales-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
        document.getElementById('view-sales').classList.add('active');
        e.currentTarget.classList.add('active');
        updateRecordContext();
    });

    // Sub-Nav Tabs
    document.querySelectorAll('.sub-nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(e.target.closest('#view-sales')) {
                document.querySelectorAll('#view-sales .sub-nav-item').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.sales-tab').forEach(t => t.style.display = 'none');
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.target}`).style.display = 'block';
                
                if(e.target.dataset.target === 'sales-report') initReportFilters();
                if(e.target.dataset.target === 'sales-prices') renderPriceList();
            }
        });
    });

    // Actions
    document.getElementById('ext-sales-upload')?.addEventListener('change', handleExcel);
    document.getElementById('ext-btn-submit-sales')?.addEventListener('click', submitSales);
    document.getElementById('ext-btn-template')?.addEventListener('click', downloadMatrixTemplate);
    document.getElementById('ext-btn-open-add-items')?.addEventListener('click', openSalesItemSelectionModal);
    document.getElementById('ext-sales-item-select-search')?.addEventListener('input', (e) => renderSalesItemSelectionList(e.target.value));

    // Price Actions (Conditional)
    if(document.getElementById('ext-price-search')) {
        document.getElementById('ext-price-search').addEventListener('input', (e) => renderPriceList(e.target.value));
        document.getElementById('ext-btn-save-prices').addEventListener('click', savePriceChanges);
    }

    // Table Actions (Record Sales)
    const tableBody = document.querySelector('#ext-sales-table tbody');
    if(tableBody) {
        tableBody.addEventListener('change', (e) => {
            if(e.target.classList.contains('ext-qty-input') || e.target.classList.contains('ext-price-input')) {
                const idx = e.target.dataset.index;
                const field = e.target.classList.contains('ext-qty-input') ? 'quantity' : 'price';
                salesState.currentList[idx][field] = parseFloat(e.target.value);
                renderSalesTable();
            }
        });
        tableBody.addEventListener('click', (e) => {
            if(e.target.classList.contains('ext-btn-remove')) {
                salesState.currentList.splice(e.target.dataset.index, 1);
                renderSalesTable();
            }
        });
    }

    // Report Actions
    document.getElementById('rpt-btn-generate')?.addEventListener('click', generateReport);
    document.getElementById('rpt-btn-export')?.addEventListener('click', () => {
        if(typeof XLSX !== 'undefined') {
            const tbl = document.getElementById('rpt-table');
            const wb = XLSX.utils.table_to_book(tbl);
            XLSX.writeFile(wb, 'Sales_Report.xlsx');
        } else showToast('Excel library not loaded', 'error');
    });

    document.getElementById('rpt-btn-open-branch-modal')?.addEventListener('click', openReportBranchModal);
    document.getElementById('rpt-btn-open-item-modal')?.addEventListener('click', openReportItemModal);
    document.getElementById('rpt-branch-all')?.addEventListener('click', () => toggleAllReportBranches(true));
    document.getElementById('rpt-branch-none')?.addEventListener('click', () => toggleAllReportBranches(false));
    document.getElementById('rpt-modal-item-search')?.addEventListener('input', (e) => filterReportItemModal(e.target.value));
    document.getElementById('rpt-item-none')?.addEventListener('click', () => {
        salesState.reportSelectedItems.clear();
        renderReportItemModalList();
    });
}

// --- 4. CORE PRICING LOGIC ---

function getPriceForBranch(branchCode, item) {
    const branch = findByKey(state.branches, 'branchCode', branchCode);
    if (!branch) return 0;
    const category = branch.PriceCategory || 'PriceA'; 
    const validCats = ['PriceA', 'PriceB', 'PriceC'];
    const key = validCats.includes(category) ? category : 'PriceA';
    return parseFloat(item[key]) || 0;
}

// --- 5. RECORD SALES UI ---

function updateRecordContext() {
    const user = state.currentUser;
    const select = document.getElementById('ext-sales-branch');
    const div = document.getElementById('ext-div-branch-select');
    
    if(!select) return;

    select.innerHTML = '';
    state.branches.forEach(b => select.innerHTML += `<option value="${b.branchCode}">${b.branchName}</option>`);

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('ext-sales-from').value = today;
    document.getElementById('ext-sales-to').value = today;

    if (user && user.AssignedBranchCode) {
        salesState.isAdmin = false;
        select.value = user.AssignedBranchCode;
        select.disabled = true;
    } else {
        salesState.isAdmin = true;
        if(div) div.style.display = 'none'; 
    }
}

function renderSalesTable() {
    const tbody = document.querySelector('#ext-sales-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let totalRevenue = 0;
    const stock = calculateStockLevels(); 

    salesState.currentList.forEach((row, index) => {
        const available = stock[row.branchCode]?.[row.itemCode]?.quantity || 0;
        const lineTotal = (parseFloat(row.quantity) || 0) * (parseFloat(row.price) || 0);
        totalRevenue += lineTotal;
        const branchName = findByKey(state.branches, 'branchCode', row.branchCode)?.branchName || row.branchCode;

        tbody.innerHTML += `
            <tr>
                <td>${branchName}</td>
                <td>${row.itemName}<br><small>${row.itemCode}</small></td>
                <td>${available.toFixed(3)}</td>
                <td><input type="number" class="table-input ext-qty-input" data-index="${index}" value="${row.quantity}" step="0.001"></td>
                <td><input type="number" class="table-input ext-price-input" data-index="${index}" value="${row.price}" step="0.01"></td>
                <td>${lineTotal.toFixed(2)}</td>
                <td><button class="danger small ext-btn-remove" data-index="${index}">X</button></td>
            </tr>`;
    });
    document.getElementById('ext-sales-total').textContent = formatCurrency(totalRevenue);
}

// -- PRICE LIST TAB --
function renderPriceList(filter = '') {
    const tbody = document.querySelector('#ext-price-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const lower = filter.toLowerCase();
    
    state.items.filter(i => 
        String(i.isActive) !== 'false' && 
        (i.name.toLowerCase().includes(lower) || i.code.toLowerCase().includes(lower))
    ).forEach(item => {
        const changes = salesState.priceChanges.get(item.code) || {};
        const pA = changes.PriceA !== undefined ? changes.PriceA : (parseFloat(item.PriceA) || 0);
        const pB = changes.PriceB !== undefined ? changes.PriceB : (parseFloat(item.PriceB) || 0);
        const pC = changes.PriceC !== undefined ? changes.PriceC : (parseFloat(item.PriceC) || 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.code}</td>
            <td>${item.name}</td>
            <td><input type="number" step="0.01" class="table-input p-edit" data-col="PriceA" data-code="${item.code}" value="${pA}"></td>
            <td><input type="number" step="0.01" class="table-input p-edit" data-col="PriceB" data-code="${item.code}" value="${pB}"></td>
            <td><input type="number" step="0.01" class="table-input p-edit" data-col="PriceC" data-code="${item.code}" value="${pC}"></td>
        `;
        
        tr.querySelectorAll('.p-edit').forEach(input => {
            input.addEventListener('change', (e) => {
                const code = e.target.dataset.code;
                const col = e.target.dataset.col;
                const val = parseFloat(e.target.value);
                if(!salesState.priceChanges.has(code)) salesState.priceChanges.set(code, {});
                salesState.priceChanges.get(code)[col] = val;
                e.target.style.backgroundColor = '#fff3cd'; 
            });
        });
        tbody.appendChild(tr);
    });
}

async function savePriceChanges() {
    if(salesState.priceChanges.size === 0) { showToast('No changes', 'info'); return; }
    const btn = document.getElementById('ext-btn-save-prices');
    btn.textContent = 'Saving...'; btn.disabled = true;
    let count = 0;
    
    for (const [itemCode, updates] of salesState.priceChanges.entries()) {
        const res = await postData('updateData', { type: 'item', id: itemCode, updates: updates }, null);
        if(res) {
            const item = findByKey(state.items, 'code', itemCode);
            if(item) Object.assign(item, updates);
            count++;
        }
    }
    salesState.priceChanges.clear();
    btn.textContent = 'Save Changes'; btn.disabled = false;
    showToast(`Updated ${count} items`, 'success');
    renderPriceList();
}

// -- ITEM SELECTION MODAL --
function openSalesItemSelectionModal() {
    document.getElementById('ext-sales-item-select-search').value = '';
    renderSalesItemSelectionList();
    document.getElementById('ext-sales-item-select-modal').classList.add('active');
}

function renderSalesItemSelectionList(filterText = '') {
    const container = document.getElementById('ext-sales-item-select-list');
    if(!container) return;
    container.innerHTML = '';
    const lower = filterText.toLowerCase();

    const items = state.items.filter(i => 
        String(i.isActive) !== 'false' && 
        (i.name.toLowerCase().includes(lower) || i.code.toLowerCase().includes(lower))
    ).slice(0, 50);

    items.forEach(item => {
        const div = document.createElement('div');
        div.style.padding = '10px';
        div.style.borderBottom = '1px solid #eee';
        div.style.cursor = 'pointer';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        
        div.innerHTML = `
            <div><strong>${item.name}</strong> <br><small style="color:#888;">${item.code}</small></div>
            <button class="secondary small">Select</button>
        `;
        
        div.onclick = () => {
            if (salesState.isAdmin) {
                openMultiBranchModal(item);
                document.getElementById('ext-sales-item-select-modal').classList.remove('active');
            } else {
                const userBranch = document.getElementById('ext-sales-branch').value;
                const autoPrice = getPriceForBranch(userBranch, item);
                addItemToList(userBranch, item, 1, autoPrice); 
                showToast(`Added ${item.name}`);
            }
        };
        container.appendChild(div);
    });
}

function addItemToList(branchCode, item, qty, price) {
    salesState.currentList.push({
        branchCode: branchCode,
        itemCode: item.code,
        itemName: item.name,
        quantity: qty,
        price: price,
        cost: parseFloat(item.cost)
    });
    renderSalesTable();
}

function openMultiBranchModal(item) {
    const modal = document.getElementById('ext-sales-modal');
    const tbody = document.getElementById('ext-modal-tbody');
    const title = document.getElementById('ext-modal-title');
    const btnAdd = document.getElementById('ext-btn-modal-add');

    title.textContent = `Sales for: ${item.name}`;
    tbody.innerHTML = '';
    const stock = calculateStockLevels();

    state.branches.forEach(b => {
        if (String(b.isActive) === 'false') return;
        const available = stock[b.branchCode]?.[item.code]?.quantity || 0;
        
        const branchPrice = getPriceForBranch(b.branchCode, item);
        const catLabel = b.PriceCategory || 'PriceA';

        tbody.innerHTML += `
            <tr>
                <td>${b.branchName}</td>
                <td style="font-size:0.8em; color:#666;">${catLabel}</td>
                <td style="color:${available <= 0 ? 'red' : 'green'}">${available.toFixed(3)}</td>
                <td><input type="number" class="table-input modal-qty" data-branch="${b.branchCode}" placeholder="Qty"></td>
                <td><input type="number" class="table-input modal-price" data-branch="${b.branchCode}" value="${branchPrice}" placeholder="Price"></td>
            </tr>`;
    });

    btnAdd.onclick = () => {
        document.querySelectorAll('.modal-qty').forEach(input => {
            const qty = parseFloat(input.value);
            if (qty > 0) {
                const branchCode = input.dataset.branch;
                const priceVal = parseFloat(document.querySelector(`.modal-price[data-branch="${branchCode}"]`).value) || 0;
                addItemToList(branchCode, item, qty, priceVal);
            }
        });
        modal.classList.remove('active');
        renderSalesTable();
    };
    modal.classList.add('active');
}

// --- SUBMIT SALES ---
async function submitSales() {
    const btn = document.getElementById('ext-btn-submit-sales');
    const dFrom = document.getElementById('ext-sales-from').value;
    const dTo = document.getElementById('ext-sales-to').value;
    const ref = document.getElementById('ext-sales-ref').value;

    if(!dFrom || !dTo || salesState.currentList.length === 0) {
        showToast('Please add items and set the date period.', 'error');
        return;
    }

    const batches = {};
    salesState.currentList.forEach(item => {
        if(!batches[item.branchCode]) batches[item.branchCode] = [];
        batches[item.branchCode].push(item);
    });

    const totalBatches = Object.keys(batches).length;
    let processed = 0;

    for (const [branchCode, items] of Object.entries(batches)) {
        const batchId = `SALE-${Date.now()}-${branchCode}`;
        const payload = {
            type: 'issue', 
            batchId: batchId,
            ref: ref || 'Sales Period',
            branchCode: branchCode,
            fromBranchCode: branchCode,
            date: new Date(dTo).toISOString(), 
            startDate: dFrom,
            endDate: dTo,
            notes: `SALES (${dFrom} to ${dTo})`, 
            items: items.map(i => ({
                itemCode: i.itemCode,
                itemName: i.itemName,
                quantity: parseFloat(i.quantity),
                cost: i.cost,
                price: i.price,
                type: 'issue'
            }))
        };

        const res = await postData('addTransactionBatch', payload, btn);
        if(res) {
            processed++;
            const now = new Date(dTo).toISOString();
            payload.items.forEach(i => {
                state.transactions.push({
                    ...i,
                    batchId: batchId,
                    date: now,
                    branchCode: branchCode,
                    fromBranchCode: branchCode,
                    Status: 'Completed',
                    StartDate: dFrom,
                    EndDate: dTo,
                    isApproved: true
                });
            });
        }
    }

    if(processed === totalBatches) {
        showToast('Sales Recorded Successfully', 'success');
        salesState.currentList = [];
        renderSalesTable();
        document.getElementById('ext-sales-ref').value = '';
    }
}

// --- REPORTING LOGIC ---
function initReportFilters() {
    const today = new Date().toISOString().split('T')[0];
    if(!document.getElementById('rpt-date-from').value) {
        document.getElementById('rpt-date-from').value = today;
        document.getElementById('rpt-date-to').value = today;
    }
    updateReportSummaries();
}

function updateReportSummaries() {
    const bCount = salesState.reportSelectedBranches.size;
    const iCount = salesState.reportSelectedItems.size;
    document.getElementById('rpt-branch-summary').textContent = bCount === 0 ? "All Branches" : `${bCount} Branch(es)`;
    document.getElementById('rpt-item-summary').textContent = iCount === 0 ? "All Items" : `${iCount} Item(s)`;
}

function openReportBranchModal() {
    const container = document.getElementById('rpt-branch-list');
    container.innerHTML = '';
    state.branches.forEach(b => {
        if(String(b.isActive) !== 'false') {
            const isChecked = salesState.reportSelectedBranches.has(b.branchCode) ? 'checked' : '';
            const div = document.createElement('div');
            div.className = 'form-group-checkbox';
            div.innerHTML = `<input type="checkbox" id="rb-${b.branchCode}" value="${b.branchCode}" ${isChecked}><label for="rb-${b.branchCode}">${b.branchName}</label>`;
            div.querySelector('input').addEventListener('change', (e) => {
                if(e.target.checked) salesState.reportSelectedBranches.add(b.branchCode);
                else salesState.reportSelectedBranches.delete(b.branchCode);
            });
            container.appendChild(div);
        }
    });
    document.getElementById('ext-rpt-branch-modal').classList.add('active');
}

function toggleAllReportBranches(selectAll) {
    salesState.reportSelectedBranches.clear();
    const checks = document.querySelectorAll('#rpt-branch-list input[type="checkbox"]');
    checks.forEach(c => {
        c.checked = selectAll;
        if(selectAll) salesState.reportSelectedBranches.add(c.value);
    });
}

function openReportItemModal() {
    document.getElementById('rpt-modal-item-search').value = '';
    renderReportItemModalList();
    document.getElementById('ext-rpt-item-modal').classList.add('active');
}

function renderReportItemModalList(filterText = '') {
    const container = document.getElementById('rpt-item-list');
    container.innerHTML = '';
    const lower = filterText.toLowerCase();
    const itemsToShow = state.items.filter(i => 
        String(i.isActive) !== 'false' && 
        (i.name.toLowerCase().includes(lower) || i.code.toLowerCase().includes(lower))
    ).slice(0, 100);

    itemsToShow.forEach(i => {
        const isChecked = salesState.reportSelectedItems.has(i.code) ? 'checked' : '';
        const div = document.createElement('div');
        div.style.padding = '8px';
        div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `<label style="display:flex; align-items:center; gap:10px; cursor:pointer;"><input type="checkbox" ${isChecked}><div><strong>${i.name}</strong><br><small style="color:#888">${i.code}</small></div></label>`;
        div.querySelector('input').addEventListener('change', (e) => {
            if(e.target.checked) salesState.reportSelectedItems.add(i.code);
            else salesState.reportSelectedItems.delete(i.code);
        });
        container.appendChild(div);
    });
}

function filterReportItemModal(text) { renderReportItemModalList(text); }

function generateReport() {
    const dFrom = new Date(document.getElementById('rpt-date-from').value);
    const dTo = new Date(document.getElementById('rpt-date-to').value);
    dTo.setHours(23,59,59);

    const useBranchFilter = salesState.reportSelectedBranches.size > 0;
    const useItemFilter = salesState.reportSelectedItems.size > 0;

    const tbody = document.querySelector('#rpt-table tbody');
    tbody.innerHTML = '';
    let totalQty = 0; let totalRev = 0;

    const reportData = state.transactions.filter(t => {
        const isSale = (t.batchId.startsWith('SALE') || (t.price !== undefined && t.price !== null));
        if(!isSale) return false;
        const tDate = new Date(t.date);
        if(tDate < dFrom || tDate > dTo) return false;
        if(useBranchFilter && !salesState.reportSelectedBranches.has(t.branchCode)) return false;
        if(useItemFilter && !salesState.reportSelectedItems.has(t.itemCode)) return false;
        return true;
    });

    if(reportData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">No records found.</td></tr>';
        document.getElementById('rpt-result-card').style.display = 'block';
        return;
    }

    reportData.sort((a,b) => new Date(b.date) - new Date(a.date));

    reportData.forEach(r => {
        const qty = parseFloat(r.quantity) || 0;
        const price = parseFloat(r.price) || 0;
        const rev = qty * price;
        totalQty += qty;
        totalRev += rev;
        const period = (r.StartDate && r.EndDate) ? `${r.StartDate} to ${r.EndDate}` : '-';
        const bName = findByKey(state.branches, 'branchCode', r.branchCode)?.branchName || r.branchCode;
        const iName = findByKey(state.items, 'code', r.itemCode)?.name || r.itemCode;

        tbody.innerHTML += `<tr><td>${formatDate(r.date)}</td><td>${period}</td><td>${bName}</td><td>${iName}</td><td>${qty.toFixed(3)}</td><td>${price.toFixed(2)}</td><td>${rev.toFixed(2)}</td><td>${r.ref || r.batchId}</td></tr>`;
    });

    document.getElementById('rpt-total-qty').textContent = totalQty.toFixed(3);
    document.getElementById('rpt-total-rev').textContent = formatCurrency(totalRev);
    document.getElementById('rpt-result-card').style.display = 'block';
}

function handleExcel(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
        let found = 0;
        if(json.length === 0) { showToast('Empty file', 'error'); return; }
        const headers = Object.keys(json[0]);
        const branchCols = headers.filter(h => state.branches.some(b => b.branchCode === h));

        json.forEach(r => {
            const code = r['ItemCode'];
            // Manual overrides in Excel still take precedence, else lookup
            let manualPrice = parseFloat(r['SellingPrice'] || r['Price'] || 0);
            
            if(code) {
                const item = findByKey(state.items, 'code', code);
                if(item) {
                    branchCols.forEach(branchCode => {
                        const qty = parseFloat(r[branchCode]);
                        if(qty > 0) {
                            // If Excel has specific price use it, else lookup branch category price
                            const price = manualPrice > 0 ? manualPrice : getPriceForBranch(branchCode, item);
                            addItemToList(branchCode, item, qty, price);
                        }
                    });
                    found++;
                }
            }
        });
        if(found > 0) { showToast(`Imported ${found} rows.`, 'success'); renderSalesTable(); } 
        else showToast('No data found.', 'info');
        e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

function downloadMatrixTemplate() {
    const data = [];
    state.items.forEach(item => {
        if(String(item.isActive) === 'false') return;
        const row = { "ItemCode": item.code, "ItemName": item.name };
        state.branches.forEach(b => { if(String(b.isActive) !== 'false') row[b.branchCode] = ""; });
        data.push(row);
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesMatrix");
    XLSX.writeFile(wb, "Sales_Matrix_Template.xlsx");
}

const poller = setInterval(() => {
    if (state.currentUser && document.getElementById('main-nav') && !salesState.initialized) {
        initSalesModule();
        clearInterval(poller);
    }
}, 500);
