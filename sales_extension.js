import { state } from './state.js';
import { postData, showToast, findByKey, formatCurrency, formatDate } from './utils.js';
import { calculateStockLevels } from './calculations.js';

// --- 1. LOCAL STATE ---
const salesState = {
    currentList: [],
    initialized: false,
    isAdmin: false,
    // Report Filters
    reportSelectedBranches: new Set(),
    reportSelectedItems: new Set()
};

// --- 2. PERMISSION & INJECTION ---
function initSalesModule() {
    if(salesState.initialized) return;

    // PERMISSION CHECK
    const user = state.currentUser;
    // We assume 'opRecordSales' is the key. If you haven't added it to roles yet, 
    // you can use 'opStockAdjustment' as a temporary fallback or add the role in the app.
    const hasPermission = user.permissions?.opRecordSales || user.permissions?.opStockAdjustment; 
    
    if (!hasPermission) {
        console.log("User does not have permission to view Sales.");
        return;
    }

    injectSalesUI();
    attachEventListeners();
    salesState.initialized = true;
    console.log("Sales Module Loaded");
}

function injectSalesUI() {
    // A. Sidebar Link
    const sidebar = document.getElementById('main-nav');
    if (sidebar && !document.getElementById('nav-sales-link')) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `<a href="#" id="nav-sales-link" data-view="sales">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.72 2.13-1.55 0-1.35-1.91-1.53-3.55-2.11C9.6 12.48 8 11.4 8 8.99c0-2.08 1.55-3.18 3.23-3.6V3.49h2.67v1.63c1.5.18 2.8 1.18 2.94 3.01h-2.02c-.13-.88-1.07-1.57-2.31-1.57-1.16 0-1.95.73-1.95 1.48 0 1.2 2.05 1.43 3.68 2.03 2.01.73 3.32 1.87 3.32 3.97 0 2.06-1.4 3.16-3.15 3.55z"></path></svg>
            <span>Sales</span>
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
        viewDiv.innerHTML = `
            <div class="sub-nav">
                <button class="sub-nav-item active" data-target="sales-record">Record Sales</button>
                <button class="sub-nav-item" data-target="sales-report">Sales Reports</button>
            </div>

            <!-- RECORD TAB -->
            <div id="tab-sales-record" class="sales-tab active">
                <div class="card">
                    <div class="toolbar">
                        <h2>Record Sales Period</h2>
                        <div style="display:flex; gap:10px;">
                            <input type="file" id="ext-sales-upload" accept=".xlsx, .xls" style="display:none">
                            <button class="secondary small" onclick="document.getElementById('ext-sales-upload').click()">Upload Matrix Excel</button>
                            <button class="secondary small" id="ext-btn-template">Download Template</button>
                        </div>
                    </div>
                    <form id="ext-sales-form" class="form-grid" onsubmit="return false;">
                        <div class="form-group" id="ext-div-branch-select"><label>Default Branch (Manual)</label><select id="ext-sales-branch"></select></div>
                        <div class="form-group"><label>Period From</label><input type="date" id="ext-sales-from" required></div>
                        <div class="form-group"><label>Period To</label><input type="date" id="ext-sales-to" required></div>
                        <div class="form-group"><label>Reference</label><input type="text" id="ext-sales-ref" placeholder="e.g. Weekly Sales"></div>
                    </form>
                </div>
                
                <div class="card">
                    <h2>Items to Sell</h2>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                         <input type="search" id="ext-sales-item-search" placeholder="Type item name or code..." class="search-bar-input">
                         <div id="ext-sales-item-results" style="position:absolute; background:white; border:1px solid #ddd; z-index:100; margin-top:45px; width:300px; max-height:200px; overflow-y:auto; display:none;"></div>
                    </div>
                    <p id="ext-helper-text" style="font-size:0.9em; color:#666; margin-bottom:10px;"></p>
                    
                    <table id="ext-sales-table">
                        <thead><tr><th>Branch</th><th>Item</th><th>Stock</th><th>Qty Sold</th><th>Price</th><th>Total</th><th>Action</th></tr></thead>
                        <tbody></tbody>
                        <tfoot><tr><td colspan="5" style="text-align:right;"><strong>Total Revenue:</strong></td><td id="ext-sales-total">0.00</td><td></td></tr></tfoot>
                    </table>
                    <div style="margin-top:20px; text-align:right;">
                        <button id="ext-btn-submit-sales" class="primary">Confirm Sales</button>
                    </div>
                </div>
            </div>

            <!-- REPORT TAB -->
            <div id="tab-sales-report" class="sales-tab" style="display:none;">
                <div class="card">
                    <h2>Generate Sales Report</h2>
                    <div class="form-grid">
                        <div class="form-group"><label>From Date</label><input type="date" id="rpt-date-from"></div>
                        <div class="form-group"><label>To Date</label><input type="date" id="rpt-date-to"></div>
                        <div class="form-group span-full">
                            <label>Filter Branches (Leave empty for All)</label>
                            <div id="rpt-branch-selector" style="max-height:100px; overflow-y:auto; border:1px solid #eee; padding:5px; display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"></div>
                        </div>
                        <div class="form-group span-full">
                            <label>Filter Items (Leave empty for All)</label>
                            <div style="display:flex; gap:10px;">
                                <input type="search" id="rpt-item-search" placeholder="Search item to add filter..." class="search-bar-input">
                                <button class="secondary small" id="rpt-btn-clear-items">Clear</button>
                            </div>
                            <div id="rpt-selected-items" style="margin-top:5px; display:flex; gap:5px; flex-wrap:wrap;"></div>
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
                            <tfoot>
                                <tr>
                                    <td colspan="4" style="text-align:right;"><strong>Totals:</strong></td>
                                    <td id="rpt-total-qty">0</td>
                                    <td>-</td>
                                    <td id="rpt-total-rev">0.00</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <!-- MODAL FOR MULTI-BRANCH ENTRY -->
            <div id="ext-sales-modal" class="modal-overlay">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2 id="ext-modal-title">Sales for Item</h2>
                        <button class="close-button" onclick="document.getElementById('ext-sales-modal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom:15px; color:#666;">Enter sales quantity and price for each branch.</p>
                        <table style="width:100%">
                            <thead><tr><th>Branch</th><th>Stock</th><th>Qty Sold</th><th>Price</th></tr></thead>
                            <tbody id="ext-modal-tbody"></tbody>
                        </table>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary" onclick="document.getElementById('ext-sales-modal').classList.remove('active')">Cancel</button>
                        <button class="primary" id="ext-btn-modal-add">Add to List</button>
                    </div>
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
            }
        });
    });

    // Record Actions
    document.getElementById('ext-sales-upload')?.addEventListener('change', handleExcel);
    document.getElementById('ext-btn-submit-sales')?.addEventListener('click', submitSales);
    document.getElementById('ext-btn-template')?.addEventListener('click', downloadMatrixTemplate);
    
    // Search Actions
    setupSearch();

    // Table Actions
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
    document.getElementById('rpt-item-search')?.addEventListener('input', handleReportItemSearch);
    document.getElementById('rpt-btn-clear-items')?.addEventListener('click', () => {
        salesState.reportSelectedItems.clear();
        renderReportItemTags();
    });
    document.getElementById('rpt-btn-export')?.addEventListener('click', () => {
        if(typeof XLSX !== 'undefined') {
            const tbl = document.getElementById('rpt-table');
            const wb = XLSX.utils.table_to_book(tbl);
            XLSX.writeFile(wb, 'Sales_Report.xlsx');
        } else {
            showToast('Excel library not loaded', 'error');
        }
    });
}

// --- 4. RECORD SALES LOGIC ---

function updateRecordContext() {
    const user = state.currentUser;
    const select = document.getElementById('ext-sales-branch');
    const div = document.getElementById('ext-div-branch-select');
    const helper = document.getElementById('ext-helper-text');
    
    select.innerHTML = '';
    state.branches.forEach(b => select.innerHTML += `<option value="${b.branchCode}">${b.branchName}</option>`);

    // Set Dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('ext-sales-from').value = today;
    document.getElementById('ext-sales-to').value = today;

    if (user && user.AssignedBranchCode) {
        salesState.isAdmin = false;
        select.value = user.AssignedBranchCode;
        select.disabled = true;
        helper.textContent = "Search and select items to add them to the list.";
    } else {
        salesState.isAdmin = true;
        div.style.display = 'none'; // Admin uses matrix logic
        helper.textContent = "Select an item to enter sales for multiple branches at once.";
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
            type: 'issue', // Using 'issue' for stock deduction compatibility
            batchId: batchId,
            ref: ref || 'Sales Period',
            branchCode: branchCode,
            fromBranchCode: branchCode,
            
            // DATES
            date: new Date(dTo).toISOString(), // Main date = End of Period (for stock logic)
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
            // Update Local State for immediate feedback
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

// --- 5. REPORTING LOGIC ---

function initReportFilters() {
    const branchContainer = document.getElementById('rpt-branch-selector');
    if(branchContainer.innerHTML === '') {
        state.branches.forEach(b => {
            if(String(b.isActive) !== 'false') {
                branchContainer.innerHTML += `
                    <label style="display:flex; gap:5px; align-items:center; cursor:pointer;">
                        <input type="checkbox" class="rpt-branch-chk" value="${b.branchCode}"> ${b.branchName}
                    </label>`;
            }
        });
    }
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('rpt-date-from').value = today;
    document.getElementById('rpt-date-to').value = today;
}

function handleReportItemSearch(e) {
    const val = e.target.value.toLowerCase();
    // Simple autocomplete could go here, for now just exact match or logic to add by code
    // Let's implement a simple dropdown logic similar to record
    // For brevity, we will assume user hits "Enter" to add fuzzy match
    // OR we can create a datalist.
    // Let's use the simplest: If they type, show suggestions below.
    
    // Actually, reused logic from record search is best.
    // For this specific requirements, let's just make a datalist
    let dl = document.getElementById('rpt-item-datalist');
    if(!dl) {
        dl = document.createElement('datalist');
        dl.id = 'rpt-item-datalist';
        document.body.appendChild(dl);
        e.target.setAttribute('list', 'rpt-item-datalist');
    }
    
    if(val.length > 1) {
        dl.innerHTML = '';
        state.items.filter(i => i.name.toLowerCase().includes(val) || i.code.toLowerCase().includes(val))
        .slice(0,10).forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.name;
            opt.dataset.code = i.code;
            dl.appendChild(opt);
        });
    }
    
    // Check if valid selection
    const selected = state.items.find(i => i.name === e.target.value);
    if(selected) {
        salesState.reportSelectedItems.add(selected.code);
        renderReportItemTags();
        e.target.value = '';
    }
}

function renderReportItemTags() {
    const c = document.getElementById('rpt-selected-items');
    c.innerHTML = '';
    salesState.reportSelectedItems.forEach(code => {
        const i = findByKey(state.items, 'code', code);
        c.innerHTML += `<span style="background:#eee; padding:2px 8px; border-radius:10px; font-size:0.9em;">${i.name} <span style="cursor:pointer; color:red; font-weight:bold;" onclick="removeReportItem('${code}')">&times;</span></span>`;
    });
}
window.removeReportItem = (code) => { salesState.reportSelectedItems.delete(code); renderReportItemTags(); };

function generateReport() {
    const dFrom = new Date(document.getElementById('rpt-date-from').value);
    const dTo = new Date(document.getElementById('rpt-date-to').value);
    dTo.setHours(23,59,59);

    // Get selected branches
    const selBranches = [];
    document.querySelectorAll('.rpt-branch-chk:checked').forEach(c => selBranches.push(c.value));
    const branchFilter = selBranches.length > 0;

    // Get selected items
    const itemFilter = salesState.reportSelectedItems.size > 0;

    const tbody = document.querySelector('#rpt-table tbody');
    tbody.innerHTML = '';
    let totalQty = 0;
    let totalRev = 0;

    // Filter Transactions
    const reportData = state.transactions.filter(t => {
        // 1. Must be sales (Type 'issue' AND has Price OR batchId starts with SALE)
        // We look for 'price' field primarily now
        const isSale = (t.batchId.startsWith('SALE') || (t.price !== undefined && t.price !== null));
        if(!isSale) return false;

        // 2. Date Filter (Check Transaction Date OR Start/End if available)
        // We use the transaction date which represents the End Date/Posting Date
        const tDate = new Date(t.date);
        if(tDate < dFrom || tDate > dTo) return false;

        // 3. Branch Filter
        if(branchFilter && !selBranches.includes(t.branchCode)) return false;

        // 4. Item Filter
        if(itemFilter && !salesState.reportSelectedItems.has(t.itemCode)) return false;

        return true;
    });

    if(reportData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">No records found for criteria.</td></tr>';
        document.getElementById('rpt-result-card').style.display = 'block';
        return;
    }

    // Sort by date
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

        tbody.innerHTML += `
            <tr>
                <td>${formatDate(r.date)}</td>
                <td>${period}</td>
                <td>${bName}</td>
                <td>${iName}</td>
                <td>${qty.toFixed(3)}</td>
                <td>${price.toFixed(2)}</td>
                <td>${rev.toFixed(2)}</td>
                <td>${r.ref || r.batchId}</td>
            </tr>
        `;
    });

    document.getElementById('rpt-total-qty').textContent = totalQty.toFixed(3);
    document.getElementById('rpt-total-rev').textContent = formatCurrency(totalRev);
    document.getElementById('rpt-result-card').style.display = 'block';
}

// --- 6. EXCEL / SEARCH UTILS ---

function setupSearch() {
    const input = document.getElementById('ext-sales-item-search');
    const results = document.getElementById('ext-sales-item-results');
    
    input.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if(val.length < 2) { results.style.display = 'none'; return; }
        
        results.innerHTML = '';
        const matches = state.items.filter(i => 
            (i.name.toLowerCase().includes(val) || i.code.toLowerCase().includes(val)) && 
            String(i.isActive) !== 'false'
        ).slice(0, 10);
        
        if(matches.length > 0) {
            results.style.display = 'block';
            matches.forEach(m => {
                const div = document.createElement('div');
                div.style.padding = '8px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid #eee';
                div.innerHTML = `<strong>${m.name}</strong> <span style="color:#888; font-size:0.8em">${m.code}</span>`;
                
                div.onclick = () => {
                    results.style.display = 'none';
                    input.value = '';
                    if (salesState.isAdmin) openMultiBranchModal(m);
                    else {
                        const userBranch = document.getElementById('ext-sales-branch').value;
                        addItemToList(userBranch, m, 1, 0); 
                    }
                };
                
                div.onmouseover = () => div.style.backgroundColor = '#f0f0f0';
                div.onmouseout = () => div.style.backgroundColor = 'white';
                results.appendChild(div);
            });
        } else {
            results.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if(!e.target.closest('#ext-sales-item-search')) results.style.display = 'none';
    });
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

        tbody.innerHTML += `
            <tr>
                <td>${b.branchName}</td>
                <td style="color:${available <= 0 ? 'red' : 'green'}">${available.toFixed(3)}</td>
                <td><input type="number" class="table-input modal-qty" data-branch="${b.branchCode}" placeholder="Qty"></td>
                <td><input type="number" class="table-input modal-price" data-branch="${b.branchCode}" placeholder="Price"></td>
            </tr>`;
    });

    btnAdd.onclick = () => {
        document.querySelectorAll('.modal-qty').forEach(input => {
            const qty = parseFloat(input.value);
            if (qty > 0) {
                const branchCode = input.dataset.branch;
                const price = parseFloat(document.querySelector(`.modal-price[data-branch="${branchCode}"]`).value) || 0;
                addItemToList(branchCode, item, qty, price);
            }
        });
        modal.classList.remove('active');
        renderSalesTable();
    };
    modal.classList.add('active');
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
            const price = parseFloat(r['SellingPrice'] || r['Price'] || 0);
            if(code) {
                const item = findByKey(state.items, 'code', code);
                if(item) {
                    branchCols.forEach(branchCode => {
                        const qty = parseFloat(r[branchCode]);
                        if(qty > 0) addItemToList(branchCode, item, qty, price);
                    });
                    found++;
                }
            }
        });
        if(found > 0) {
            showToast(`Imported ${found} rows.`, 'success');
            renderSalesTable();
        } else showToast('No data found.', 'info');
        e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

function downloadMatrixTemplate() {
    const data = [];
    state.items.forEach(item => {
        if(String(item.isActive) === 'false') return;
        const row = { "ItemCode": item.code, "ItemName": item.name, "SellingPrice": 0 };
        state.branches.forEach(b => { if(String(b.isActive) !== 'false') row[b.branchCode] = ""; });
        data.push(row);
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesMatrix");
    XLSX.writeFile(wb, "Sales_Matrix_Template.xlsx");
}

// Start
document.addEventListener('DOMContentLoaded', () => { setTimeout(initSalesModule, 500); });
