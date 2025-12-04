import { state } from './state.js';
import { postData, showToast, findByKey, formatCurrency } from './utils.js';
import { calculateStockLevels } from './calculations.js';

// --- 1. LOCAL STATE ---
const salesState = {
    currentList: [],
    initialized: false,
    isAdmin: false
};

// --- 2. UI INJECTION ---
function injectSalesUI() {
    // A. Inject Sidebar Link
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

    // B. Inject Sales View
    const mainContent = document.querySelector('.main-content');
    if (mainContent && !document.getElementById('view-sales')) {
        const viewDiv = document.createElement('div');
        viewDiv.id = 'view-sales';
        viewDiv.className = 'view';
        viewDiv.innerHTML = `
            <div class="card">
                <div class="toolbar">
                    <h2>Record Sales</h2>
                    <div style="display:flex; gap:10px;">
                        <input type="file" id="ext-sales-upload" accept=".xlsx, .xls" style="display:none">
                        <button class="secondary small" onclick="document.getElementById('ext-sales-upload').click()">Upload Matrix Excel</button>
                        <button class="secondary small" id="ext-btn-template">Download Matrix Template</button>
                    </div>
                </div>
                <form id="ext-sales-form" class="form-grid" onsubmit="return false;">
                    <!-- Branch Select: Hidden/Locked based on permission -->
                    <div class="form-group" id="ext-div-branch-select"><label>Default Branch (Manual Entry)</label><select id="ext-sales-branch"></select></div>
                    <div class="form-group"><label>Date</label><input type="date" id="ext-sales-date" required></div>
                    <div class="form-group"><label>Reference</label><input type="text" id="ext-sales-ref" placeholder="e.g. Daily Sales"></div>
                    <div class="form-group span-full"><label>Notes</label><textarea id="ext-sales-notes" rows="1"></textarea></div>
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

            <!-- MULTI-BRANCH INPUT MODAL -->
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

// --- 3. RENDERERS ---

function renderSalesTable() {
    const tbody = document.querySelector('#ext-sales-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let totalRevenue = 0;
    const stock = calculateStockLevels(); 

    salesState.currentList.forEach((row, index) => {
        const available = stock[row.branchCode] && stock[row.branchCode][row.itemCode] 
            ? stock[row.branchCode][row.itemCode].quantity 
            : 0;
        
        const lineTotal = (parseFloat(row.quantity) || 0) * (parseFloat(row.price) || 0);
        totalRevenue += lineTotal;

        const branchName = findByKey(state.branches, 'branchCode', row.branchCode)?.branchName || row.branchCode;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${branchName}</td>
            <td>${row.itemName}<br><small>${row.itemCode}</small></td>
            <td>${available.toFixed(3)}</td>
            <td><input type="number" class="table-input ext-qty-input" data-index="${index}" value="${row.quantity}" step="0.001"></td>
            <td><input type="number" class="table-input ext-price-input" data-index="${index}" value="${row.price}" step="0.01"></td>
            <td>${lineTotal.toFixed(2)}</td>
            <td><button class="danger small ext-btn-remove" data-index="${index}">X</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('ext-sales-total').textContent = formatCurrency(totalRevenue);
}

function updateContext() {
    const user = state.currentUser;
    const select = document.getElementById('ext-sales-branch');
    const div = document.getElementById('ext-div-branch-select');
    const helper = document.getElementById('ext-helper-text');
    
    // Reset options
    select.innerHTML = '';
    state.branches.forEach(b => select.innerHTML += `<option value="${b.branchCode}">${b.branchName}</option>`);

    if (user && user.AssignedBranchCode) {
        // BRANCH USER
        salesState.isAdmin = false;
        select.value = user.AssignedBranchCode;
        select.disabled = true;
        helper.textContent = "Search and select items to add them to the list.";
    } else {
        // ADMIN / NO ASSIGNED BRANCH
        salesState.isAdmin = true;
        div.style.display = 'none'; 
        helper.textContent = "Select an item to enter sales for multiple branches at once.";
    }
}

// --- 4. LOGIC HANDLERS ---

// A. Handle MATRIX Excel Upload
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
        
        // 1. Identify which headers are valid branches
        if(json.length === 0) { showToast('Empty file', 'error'); return; }
        const headers = Object.keys(json[0]);
        const branchCols = headers.filter(h => state.branches.some(b => b.branchCode === h));

        if(branchCols.length === 0) {
            showToast('No valid Branch Codes found in headers. Please use the Template.', 'error');
            return;
        }

        // 2. Iterate rows (Items)
        json.forEach(r => {
            const code = r['ItemCode'];
            // Price column is optional, if missing defaults to 0
            const price = parseFloat(r['SellingPrice'] || r['Price'] || 0);

            if(code) {
                const item = findByKey(state.items, 'code', code);
                if(item) {
                    // 3. Iterate columns (Branches)
                    branchCols.forEach(branchCode => {
                        const qty = parseFloat(r[branchCode]);
                        if(qty > 0) {
                            salesState.currentList.push({
                                branchCode: branchCode,
                                itemCode: item.code,
                                itemName: item.name,
                                quantity: qty,
                                price: price,
                                cost: parseFloat(item.cost)
                            });
                            found++;
                        }
                    });
                }
            }
        });
        
        if(found > 0) {
            showToast(`Imported ${found} sales entries across ${branchCols.length} branches.`, 'success');
            renderSalesTable();
        } else {
            showToast('No quantities found.', 'info');
        }
        e.target.value = ''; 
    };
    reader.readAsArrayBuffer(file);
}

// B. Submit Sales (Grouped by Branch)
async function submitSales() {
    const btn = document.getElementById('ext-btn-submit-sales');
    const date = document.getElementById('ext-sales-date').value;
    const ref = document.getElementById('ext-sales-ref').value;
    const notes = document.getElementById('ext-sales-notes').value;

    if(!date || salesState.currentList.length === 0) {
        showToast('Please add items and select a date.', 'error');
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
            ref: ref || 'POS Sale',
            branchCode: branchCode,
            fromBranchCode: branchCode, 
            date: new Date(date).toISOString(),
            notes: `SALES (${branchCode}): ${notes}`, 
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
            const now = new Date(date).toISOString();
            payload.items.forEach(i => {
                state.transactions.push({
                    ...i,
                    batchId: batchId,
                    date: now,
                    branchCode: branchCode,
                    fromBranchCode: branchCode,
                    Status: 'Completed',
                    isApproved: true
                });
            });
        }
    }

    if(processed === totalBatches) {
        showToast('All Sales Recorded Successfully', 'success');
        salesState.currentList = [];
        renderSalesTable();
        document.getElementById('ext-sales-ref').value = '';
    }
}

// C. Search & Multi-Branch Modal
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
                    
                    if (salesState.isAdmin) {
                        openMultiBranchModal(m);
                    } else {
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
        
        const available = stock[b.branchCode] && stock[b.branchCode][item.code] 
            ? stock[b.branchCode][item.code].quantity 
            : 0;

        tbody.innerHTML += `
            <tr>
                <td>${b.branchName}</td>
                <td style="color:${available <= 0 ? 'red' : 'green'}">${available.toFixed(3)}</td>
                <td><input type="number" class="table-input modal-qty" data-branch="${b.branchCode}" placeholder="Qty"></td>
                <td><input type="number" class="table-input modal-price" data-branch="${b.branchCode}" placeholder="Price"></td>
            </tr>
        `;
    });

    btnAdd.onclick = () => {
        document.querySelectorAll('.modal-qty').forEach(input => {
            const qty = parseFloat(input.value);
            if (qty > 0) {
                const branchCode = input.dataset.branch;
                const priceInput = document.querySelector(`.modal-price[data-branch="${branchCode}"]`);
                const price = parseFloat(priceInput.value) || 0;
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

// D. Download Matrix Template
function downloadMatrixTemplate() {
    // 1. Prepare Headers: ItemCode, ItemName, SellingPrice, [Branch1], [Branch2]...
    const data = [];
    
    state.items.forEach(item => {
        if(String(item.isActive) === 'false') return;
        
        const row = {
            "ItemCode": item.code,
            "ItemName": item.name,
            "SellingPrice": 0
        };
        
        // Add a column for each branch
        state.branches.forEach(b => {
            if(String(b.isActive) !== 'false') {
                row[b.branchCode] = ""; // Empty string for user to fill
            }
        });
        
        data.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesMatrix");
    XLSX.writeFile(wb, "Sales_Matrix_Template.xlsx");
}

// --- 5. INITIALIZATION ---

function initSalesModule() {
    if(salesState.initialized) return;
    
    injectSalesUI();
    
    document.getElementById('nav-sales-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
        document.getElementById('view-sales').classList.add('active');
        e.currentTarget.classList.add('active');
        updateContext();
        document.getElementById('ext-sales-date').valueAsDate = new Date();
    });

    document.getElementById('ext-sales-upload')?.addEventListener('change', handleExcel);
    document.getElementById('ext-btn-submit-sales')?.addEventListener('click', submitSales);
    document.getElementById('ext-btn-template')?.addEventListener('click', downloadMatrixTemplate);
    
    document.querySelector('#ext-sales-table tbody')?.addEventListener('change', (e) => {
        if(e.target.classList.contains('ext-qty-input')) {
            const idx = e.target.dataset.index;
            salesState.currentList[idx].quantity = parseFloat(e.target.value);
            renderSalesTable();
        }
        if(e.target.classList.contains('ext-price-input')) {
            const idx = e.target.dataset.index;
            salesState.currentList[idx].price = parseFloat(e.target.value);
            renderSalesTable();
        }
    });
    
    document.querySelector('#ext-sales-table tbody')?.addEventListener('click', (e) => {
        if(e.target.classList.contains('ext-btn-remove')) {
            const idx = e.target.dataset.index;
            salesState.currentList.splice(idx, 1);
            renderSalesTable();
        }
    });

    setupSearch();
    salesState.initialized = true;
    console.log("Matrix Sales Module Loaded");
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initSalesModule, 500);
});