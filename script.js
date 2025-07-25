// PART 1 of 5: CORE SETUP & API

window.printReport = function(elementId) {
    const reportContent = document.querySelector(`#${elementId} .printable-document`);
    if (reportContent) {
        document.getElementById('print-area').innerHTML = reportContent.outerHTML;
        setTimeout(() => window.print(), 100);
    } else {
        console.error(`Could not find content to print in #${elementId}`);
        alert("Error: Report content not found.");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // !!! IMPORTANT: PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3U4zHR0ogl__vVPBNrVPaBXnl_i5REvQrvKkajPgAbs4FQ8_PG4FWV_3w9D4Yvfal/exec';

    const Logger = {
        info: (message, ...args) => console.log(`[StockWise INFO] ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[StockWise WARN] ${message}`, ...args),
        error: (message, ...args) => console.error(`[StockWise ERROR] ${message}`, ...args),
    };

    let state = {
        currentUser: null,
        username: null,
        loginCode: null,
        items: [],
        suppliers: [],
        branches: [],
        sections: [],
        transactions: [],
        payments: [],
        activityLog: [],
        purchaseOrders: [],
        purchaseOrderItems: [],
        priceHistory: [],
        orderRequests: [],
        orderRequestItems: [],
        shortageRequests: [],
        shortageRequestItems: [],
        currentReceiveList: [],
        currentPOList: [],
        currentTransferList: [],
        currentIssueList: [],
        currentReturnList: [],
        currentRequestList: [],
        currentShortageList: [],
        modalSelections: new Set(),
        invoiceModalSelections: new Set(),
        allUsers: [],
        allRoles: []
    };
    let modalContext = null;

    const userCan = (permission) => {
        const p = state.currentUser?.permissions?.[permission];
        return p === true || String(p).toUpperCase() === 'TRUE';
    };

    // --- DOM ELEMENT REFERENCES ---
    const loginContainer = document.getElementById('login-container');
    const loginForm = document.getElementById('login-form');
    const loginUsernameInput = document.getElementById('login-username');
    const loginCodeInput = document.getElementById('login-code');
    const loginError = document.getElementById('login-error');
    const loginLoader = document.getElementById('login-loader');
    const appContainer = document.getElementById('app-container');
    const btnLogout = document.getElementById('btn-logout');

    const itemSelectorModal = document.getElementById('item-selector-modal');
    const invoiceSelectorModal = document.getElementById('invoice-selector-modal');
    const editModal = document.getElementById('edit-modal');
    const modalItemList = document.getElementById('modal-item-list');
    const modalSearchInput = document.getElementById('modal-search-items');
    const editModalBody = document.getElementById('edit-modal-body');
    const editModalTitle = document.getElementById('edit-modal-title');
    const formEditRecord = document.getElementById('form-edit-record');
    const viewTransferModal = document.getElementById('view-transfer-modal');
    const requestReviewModal = document.getElementById('request-review-modal');


    async function attemptLogin(username, loginCode) {
        if (!username || !loginCode) return;
        loginForm.style.display = 'none';
        loginError.textContent = '';
        loginLoader.style.display = 'flex';
        Logger.info(`Attempting to login...`);
        if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_GOOGLE')) {
            const errorMsg = 'SCRIPT_URL is not set in script.js. Please paste your Web App URL.';
            Logger.error(errorMsg);
            loginError.textContent = errorMsg;
            loginLoader.style.display = 'none';
            loginForm.style.display = 'block';
            return;
        }
        try {
            const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`);
            if (!response.ok) throw new Error(`Network error: ${response.status} ${response.statusText}`);
            const data = await response.json();
            if (data.status === 'error' || !data.user) {
                throw new Error(data.message || 'Invalid username or login code.');
            }
            state.username = username;
            state.loginCode = loginCode;
            state.currentUser = data.user;
            Object.keys(data).forEach(key => {
                if (key !== 'user') state[key] = data[key] || [];
            });
            Logger.info(`Login successful for user: ${state.currentUser.Name} (Role: ${state.currentUser.RoleName})`);
            loginContainer.style.display = 'none';
            appContainer.style.display = 'flex';
            initializeAppUI();
        } catch (error) {
            const userMsg = error.message.includes('Network error') ? 'Failed to connect to server.' : error.message;
            Logger.error('Login failed:', error);
            loginError.textContent = userMsg;
            loginLoader.style.display = 'none';
            loginForm.style.display = 'block';
            loginCodeInput.value = '';
            loginUsernameInput.value = '';
        }
    }

    async function postData(action, data, buttonEl) {
        if(buttonEl) setButtonLoading(true, buttonEl);
        const {
            username,
            loginCode
        } = state;
        if (!username || !loginCode) {
            showToast('Session expired. Please log in again.', 'error');
            setTimeout(() => location.reload(), 2000);
            return null;
        }
        Logger.info(`POSTing data: ${action}`, data);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    loginCode,
                    action,
                    data
                })
            });
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'An unknown error occurred on the server.');
            Logger.info(`POST successful for ${action}`, result);
            return result;
        } catch (error) {
            const userMsg = `Could not save data: ${error.message}`;
            Logger.error(userMsg, error);
            showToast(userMsg, 'error');
            return null;
        } finally {
            if(buttonEl) setButtonLoading(false, buttonEl);
        }
    }

// PART 2 of 5: UI LOGIC & MODALS
    function openItemSelectorModal() {
        let currentList;
        if (document.getElementById('subview-po').classList.contains('active')) {
            modalContext = 'po'; currentList = state.currentPOList;
        } else if (document.getElementById('subview-receive').classList.contains('active')) {
            modalContext = 'receive'; currentList = state.currentReceiveList;
        } else if (document.getElementById('subview-transfer').classList.contains('active')) {
            modalContext = 'transfer'; currentList = state.currentTransferList;
        } else if (document.getElementById('subview-issue').classList.contains('active')) {
            modalContext = 'issue'; currentList = state.currentIssueList;
        } else if (document.getElementById('subview-return').classList.contains('active')) {
            modalContext = 'return'; currentList = state.currentReturnList;
        } else if (document.getElementById('subview-request-supplies').classList.contains('active')) {
            modalContext = 'request'; currentList = state.currentRequestList;
        } else if (document.getElementById('subview-report-shortage').classList.contains('active')) {
            modalContext = 'shortage'; currentList = state.currentShortageList;
        }

        if(currentList) {
            state.modalSelections = new Set(currentList.map(item => item.itemCode));
            renderItemsInModal();
            itemSelectorModal.classList.add('active');
        }
    }

    function openInvoiceSelectorModal() {
        modalContext = 'invoices';
        renderInvoicesInModal();
        invoiceSelectorModal.classList.add('active');
    }

    function closeModal() {
        [itemSelectorModal, invoiceSelectorModal, editModal, viewTransferModal, requestReviewModal].forEach(m => m.classList.remove('active'));
        modalSearchInput.value = '';
        modalContext = null;
    }

    function openViewTransferModal(batchId) {
        const transferGroup = state.transactions.filter(t => t.batchId === batchId && t.type === 'transfer_out');
        if (transferGroup.length === 0) { showToast('Could not find transfer details.', 'error'); return; }
        const first = transferGroup[0];
        const fromBranch = findByKey(state.branches, 'branchCode', first.fromBranchCode)?.name || first.fromBranchCode;
        const toBranch = findByKey(state.branches, 'branchCode', first.toBranchCode)?.name || first.toBranchCode;
        const modalBody = document.getElementById('view-transfer-modal-body');
        let html = `<p><strong>From Branch:</strong> ${fromBranch}</p><p><strong>To Branch:</strong> ${toBranch}</p><p><strong>Reference:</strong> ${first.ref || 'N/A'}</p><hr><h4>Items in Shipment</h4><table><thead><tr><th>Code</th><th>Name</th><th>Quantity</th></tr></thead><tbody>`;
        transferGroup.forEach(itemTx => { const item = findByKey(state.items, 'code', itemTx.itemCode) || { name: 'DELETED' }; html += `<tr><td>${itemTx.itemCode}</td><td>${item.name}</td><td>${itemTx.quantity}</td></tr>`; });
        html += `</tbody></table>`;
        modalBody.innerHTML = html;
        document.getElementById('btn-confirm-receive-transfer').dataset.batchId = batchId;
        viewTransferModal.classList.add('active');
    }

    function openEditModal(type, id) {
        let record, formHtml;
        formEditRecord.dataset.type = type;
        formEditRecord.dataset.id = id || '';
        switch (type) {
            case 'item':
                record = findByKey(state.items, 'code', id); if (!record) return;
                editModalTitle.textContent = 'Edit Item';
                formHtml = `<div class="form-grid"><div class="form-group"><label>Item Code</label><input type="text" value="${record.code}" readonly></div><div class="form-group"><label for="edit-item-barcode">Barcode</label><input type="text" id="edit-item-barcode" name="barcode" value="${record.barcode || ''}"></div><div class="form-group"><label for="edit-item-name">Item Name</label><input type="text" id="edit-item-name" name="name" value="${record.name}" required></div><div class="form-group"><label for="edit-item-category">Category</label><input type="text" id="edit-item-category" name="category" value="${record.category || ''}"></div><div class="form-group"><label for="edit-item-unit">Unit</label><input type="text" id="edit-item-unit" name="unit" value="${record.unit}" required></div><div class="form-group"><label for="edit-item-supplier">Default Supplier</label><select id="edit-item-supplier" name="supplierCode"></select></div><div class="form-group span-full"><label for="edit-item-cost">Default Cost</label><input type="number" id="edit-item-cost" name="cost" step="0.01" min="0" value="${record.cost}" required></div></div>`;
                editModalBody.innerHTML = formHtml;
                const supplierSelect = document.getElementById('edit-item-supplier');
                populateOptions(supplierSelect, state.suppliers, 'Select Supplier', 'supplierCode', 'name');
                supplierSelect.value = record.supplierCode;
                break;
            case 'user':
                record = id ? findByKey(state.allUsers, 'Username', id) : {};
                editModalTitle.textContent = id ? `Edit User: ${record.Username}` : 'Add New User';
                const roleOptions = state.allRoles.map(r => `<option value="${r.RoleName}" ${record.RoleName && r.RoleName === record.RoleName ? 'selected' : ''}>${r.RoleName}</option>`).join('');
                const branchOptions = state.branches.map(b => `<option value="${b.branchCode}" ${record.AssignedBranchCode && b.branchCode === record.AssignedBranchCode ? 'selected' : ''}>${b.name}</option>`).join('');
                formHtml = `<div class="form-grid">
                    <div class="form-group"><label>Username</label><input type="text" name="Username" value="${record.Username || ''}" ${id ? 'readonly' : 'required'}></div>
                    <div class="form-group"><label for="edit-user-name">Full Name</label><input type="text" id="edit-user-name" name="Name" value="${record.Name || ''}" required></div>
                    <div class="form-group"><label for="edit-user-role">Role</label><select id="edit-user-role" name="RoleName" required>${roleOptions}</select></div>
                    <div class="form-group"><label for="edit-user-branch">Assigned Branch</label><select id="edit-user-branch" name="AssignedBranchCode"><option value="">None</option>${branchOptions}</select></div>
                    <div class="form-group span-full"><label for="edit-user-password">Password ${id ? '(leave blank to keep unchanged)' : ''}</label><input type="password" id="edit-user-password" name="LoginCode" ${!id ? 'required' : ''}></div>
                    ${id ? `<div class="form-group span-full"><button type="button" id="btn-delete-user" class="danger">Delete User</button></div>` : ''}
                </div>`;
                editModalBody.innerHTML = formHtml;
                break;
            // Other cases like supplier, branch, section, role follow a similar pattern...
        }
        editModal.classList.add('active');
    }

    async function handleUpdateSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const type = formEditRecord.dataset.type;
        const id = formEditRecord.dataset.id;
        const formData = new FormData(formEditRecord);
        let payload, action;
        
        if (type === 'user') {
            if (id) {
                action = 'updateUser';
                const updates = {};
                for (let [key, value] of formData.entries()) { if (key === 'Username' || (key === 'LoginCode' && value === '')) continue; updates[key] = value; }
                payload = { Username: id, updates: updates };
            } else {
                action = 'addUser';
                payload = {};
                for (let [key, value] of formData.entries()) { payload[key] = value; }
                if (!payload.LoginCode) { showToast('Password is required for new users.', 'error'); return; }
            }
        } else {
             // Simplified for brevity; other types would be handled here.
            action = 'updateData';
            const updates = {};
            for (let [key, value] of formData.entries()) { updates[key] = value; }
            payload = { type, id, updates };
        }
        
        const result = await postData(action, payload, btn);
        if (result) {
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} data saved successfully!`, 'success');
            closeModal();
            await reloadDataAndRefreshUI();
        }
    }

    function confirmModalSelection() {
        const selectedCodes = Array.from(state.modalSelections);
        const addItemsToList = (currentList) => {
            const newList = [];
            selectedCodes.forEach(code => {
                const existing = currentList.find(i => i.itemCode === code);
                if (existing) newList.push(existing);
                else { const item = findByKey(state.items, 'code', code); if (item) newList.push({ itemCode: item.code, itemName: item.name, quantity: 1, cost: item.cost, category: item.category }); }
            });
            return newList.sort((a,b) => (a.category||'').localeCompare(b.category||'') || a.itemName.localeCompare(b.itemName));
        };
        switch (modalContext) {
            case 'invoices': renderPaymentList(); break;
            case 'po': state.currentPOList = addItemsToList(state.currentPOList); renderPOListTable(); break;
            case 'receive': state.currentReceiveList = addItemsToList(state.currentReceiveList); renderReceiveListTable(); break;
            case 'transfer': state.currentTransferList = addItemsToList(state.currentTransferList); renderTransferListTable(); break;
            case 'issue': state.currentIssueList = addItemsToList(state.currentIssueList); renderIssueListTable(); break;
            case 'return': state.currentReturnList = addItemsToList(state.currentReturnList); renderReturnListTable(); break;
            case 'request': state.currentRequestList = addItemsToList(state.currentRequestList); renderRequestItemsTable(); break;
            case 'shortage': state.currentShortageList = addItemsToList(state.currentShortageList); renderShortageItemsTable(); break;
        }
        closeModal();
    }

    function showView(viewId) {
        Logger.info(`Switching view to: ${viewId}`);
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('#main-nav a').forEach(link => link.classList.remove('active'));
        const viewElement = document.getElementById(`view-${viewId}`);
        if(viewElement) viewElement.classList.add('active');
        const activeLink = document.querySelector(`[data-view="${viewId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            document.getElementById('view-title').textContent = activeLink.querySelector('span').textContent;
        }
        refreshViewData(viewId);
    }

    function showToast(message, type = 'success') { if (type === 'error') Logger.error(`User Toast: ${message}`); const container = document.getElementById('toast-container'); const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; container.appendChild(toast); setTimeout(() => toast.remove(), 3500); }
    function setButtonLoading(isLoading, buttonEl) { if (!buttonEl) return; if (isLoading) { buttonEl.disabled = true; buttonEl.dataset.originalText = buttonEl.innerHTML; buttonEl.innerHTML = '<div class="button-spinner"></div><span>Processing...</span>'; } else { buttonEl.disabled = false; if (buttonEl.dataset.originalText) { buttonEl.innerHTML = buttonEl.dataset.originalText; } } }

// PART 3 of 5: VIEW RENDERING & PRINTING
    function renderItemsTable(data = state.items) {
        const tbody = document.getElementById('table-items').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No items found.</td></tr>'; return; }
        const canEdit = userCan('editItem');
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.code}</td><td>${item.name}</td><td>${item.category || ''}</td><td>${item.unit}</td><td>${parseFloat(item.cost || 0).toFixed(2)} EGP</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="item" data-id="${item.code}">Edit</button>`: 'N/A'}</td>`;
            tbody.appendChild(tr);
        });
    }

    function renderSuppliersTable(data = state.suppliers) { const tbody = document.getElementById('table-suppliers').querySelector('tbody'); tbody.innerHTML = ''; if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No suppliers found.</td></tr>'; return; } const financials = calculateSupplierFinancials(); const canEdit = userCan('editSupplier'); data.forEach(supplier => { const balance = financials[supplier.supplierCode]?.balance || 0; const tr = document.createElement('tr'); tr.innerHTML = `<td>${supplier.supplierCode || ''}</td><td>${supplier.name}</td><td>${supplier.contact || ''}</td><td>${balance.toFixed(2)} EGP</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="supplier" data-id="${supplier.supplierCode}">Edit</button>`: 'N/A'}</td>`; tbody.appendChild(tr); }); }
    function renderBranchesTable(data = state.branches) { const tbody = document.getElementById('table-branches').querySelector('tbody'); tbody.innerHTML = ''; if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="3">No branches found.</td></tr>'; return; } const canEdit = userCan('editBranch'); data.forEach(branch => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${branch.branchCode || ''}</td><td>${branch.name}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="branch" data-id="${branch.branchCode}">Edit</button>`: 'N/A'}</td>`; tbody.appendChild(tr); }); }
    function renderSectionsTable(data = state.sections) { const tbody = document.getElementById('table-sections').querySelector('tbody'); tbody.innerHTML = ''; if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="3">No sections found.</td></tr>'; return; } const canEdit = userCan('editSection'); data.forEach(section => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${section.sectionCode || ''}</td><td>${section.name}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="section" data-id="${section.sectionCode}">Edit</button>`: 'N/A'}</td>`; tbody.appendChild(tr); }); }
    function renderPriceHistoryTable(data = state.priceHistory) { const tbody = document.getElementById('table-price-history').querySelector('tbody'); tbody.innerHTML = ''; if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No price history found.</td></tr>'; return; } data.slice().reverse().forEach(h => { const item = findByKey(state.items, 'code', h.ItemCode); const tr = document.createElement('tr'); tr.innerHTML = `<td>${new Date(h.Timestamp).toLocaleString()}</td><td>${h.ItemCode}</td><td>${item ? item.name : 'DELETED ITEM'}</td><td>${parseFloat(h.OldCost).toFixed(2)}</td><td>${parseFloat(h.NewCost).toFixed(2)}</td><td>${h.UpdatedBy}</td>`; tbody.appendChild(tr); }); }
    
    function renderPOListTable() { const tbody = document.getElementById('table-po-list').querySelector('tbody'); tbody.innerHTML = ''; if (state.currentPOList.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; updatePOGrandTotal(); return; } state.currentPOList.forEach((item, index) => { const tr = document.createElement('tr'); const total = (item.quantity || 0) * (item.cost || 0); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td><input type="number" class="table-input" value="${item.quantity}" min="1" step="1" data-index="${index}" data-field="quantity"></td><td><input type="number" class="table-input" value="${(item.cost || 0).toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost"></td><td id="po-total-cost-${index}">${total.toFixed(2)} EGP</td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); }); updatePOGrandTotal(); }
    function renderReceiveListTable() { const tbody = document.getElementById('table-receive-list').querySelector('tbody'); tbody.innerHTML = ''; if (state.currentReceiveList.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; updateReceiveGrandTotal(); return; } state.currentReceiveList.forEach((item, index) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" step="0.01" data-index="${index}" data-field="quantity"></td><td><input type="number" class="table-input" value="${(item.cost || 0).toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost"></td><td id="total-cost-${index}">${(item.quantity * item.cost).toFixed(2)} EGP</td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); }); updateReceiveGrandTotal(); }
    function renderReturnListTable() { const tbody = document.getElementById('table-return-list').querySelector('tbody'); tbody.innerHTML = ''; if (state.currentReturnList.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; updateReturnGrandTotal(); return; } state.currentReturnList.forEach((item, index) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" step="0.01" data-index="${index}" data-field="quantity"></td><td><input type="number" class="table-input" value="${item.cost.toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost" readonly></td><td id="total-return-cost-${index}">${(item.quantity * item.cost).toFixed(2)} EGP</td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); }); updateReturnGrandTotal(); }
    function renderTransferListTable() { const tbody = document.getElementById('table-transfer-list').querySelector('tbody'); const fromBranchCode = document.getElementById('transfer-from-branch').value; const stock = calculateStockLevels(); tbody.innerHTML = ''; if (state.currentTransferList.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; updateTransferGrandTotal(); return; } state.currentTransferList.forEach((item, index) => { const availableStock = stock[fromBranchCode]?.[item.itemCode]?.quantity || 0; const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td>${availableStock.toFixed(2)}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" max="${availableStock}" step="0.01" data-index="${index}" data-field="quantity"></td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); }); updateTransferGrandTotal(); }
    function renderIssueListTable() { const tbody = document.getElementById('table-issue-list').querySelector('tbody'); const fromBranchCode = document.getElementById('issue-from-branch').value; const stock = calculateStockLevels(); tbody.innerHTML = ''; if (state.currentIssueList.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; updateIssueGrandTotal(); return; } state.currentIssueList.forEach((item, index) => { const availableStock = stock[fromBranchCode]?.[item.itemCode]?.quantity || 0; const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td>${availableStock.toFixed(2)}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" max="${availableStock}" step="0.01" data-index="${index}" data-field="quantity"></td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); }); updateIssueGrandTotal(); }
    function renderRequestItemsTable() { const tbody = document.getElementById('table-request-supplies-list').querySelector('tbody'); tbody.innerHTML = ''; if(state.currentRequestList.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; return; } state.currentRequestList.sort((a,b) => (a.category||'').localeCompare(b.category||'')).forEach((item, index) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.category || 'N/A'}</td><td><input type="number" class="table-input" value="${item.quantity}" min="1" step="1" data-index="${index}" data-field="quantity"></td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); }); }
    function renderShortageItemsTable() { const tbody = document.getElementById('table-shortage-list').querySelector('tbody'); tbody.innerHTML = ''; if(state.currentShortageList.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; return; } state.currentShortageList.forEach((item, index) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.category || 'N/A'}</td><td>0</td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); }); }

    function renderItemCentricStockView(itemsToRender = state.items) { const container = document.getElementById('item-centric-stock-container'); if (!container) return; const stockByBranch = calculateStockLevels(); const branchesToDisplay = getVisibleBranchesForCurrentUser(); let tableHTML = `<table id="table-stock-levels-by-item"><thead><tr><th>Code</th><th>Item Name</th><th>Category</th>`; branchesToDisplay.forEach(b => { tableHTML += `<th>${b.name}</th>` }); tableHTML += `<th>Total</th><th>Value</th></tr></thead><tbody>`; itemsToRender.forEach(item => { tableHTML += `<tr><td>${item.code}</td><td>${item.name}</td><td>${item.category || ''}</td>`; let total = 0; let totalValue = 0; branchesToDisplay.forEach(branch => { const stockItem = stockByBranch[branch.branchCode]?.[item.code]; const qty = stockItem?.quantity || 0; total += qty; totalValue += qty * (stockItem?.avgCost || 0); tableHTML += `<td>${qty > 0 ? qty.toFixed(2) : '-'}</td>`; }); tableHTML += `<td><strong>${total.toFixed(2)}</strong></td><td><strong>${totalValue.toFixed(2)}</strong></td></tr>`; }); tableHTML += `</tbody></table>`; container.innerHTML = tableHTML; }
    function renderItemInquiry(searchTerm) { const resultsContainer = document.getElementById('item-inquiry-results'); if (!searchTerm) { resultsContainer.innerHTML = ''; return; } const stockByBranch = calculateStockLevels(); const filteredItems = state.items.filter(i => i.name.toLowerCase().includes(searchTerm) || i.code.toLowerCase().includes(searchTerm)); let html = ''; const branchesToDisplay = getVisibleBranchesForCurrentUser(); filteredItems.slice(0, 10).forEach(item => { html += `<h4>${item.name} (${item.code})</h4><table><thead><tr><th>Branch</th><th>Qty</th><th>Avg. Cost</th><th>Value</th></tr></thead><tbody>`; let found = false, totalQty = 0, totalValue = 0; branchesToDisplay.forEach(branch => { const itemStock = stockByBranch[branch.branchCode]?.[item.code]; if (itemStock && itemStock.quantity > 0) { const value = itemStock.quantity * itemStock.avgCost; html += `<tr><td>${branch.name}</td><td>${itemStock.quantity.toFixed(2)}</td><td>${itemStock.avgCost.toFixed(2)}</td><td>${value.toFixed(2)} EGP</td></tr>`; totalQty += itemStock.quantity; totalValue += value; found = true; } }); if (!found) { html += `<tr><td colspan="4">No stock for this item.</td></tr>`; } else { html += `<tr style="font-weight:bold; background-color: var(--bg-color);"><td>Total</td><td>${totalQty.toFixed(2)}</td><td>-</td><td>${totalValue.toFixed(2)} EGP</td></tr>` } html += `</tbody></table><hr>`; }); resultsContainer.innerHTML = html; }
    // Other render functions like renderSupplierStatement, renderTransactionHistory, etc. would go here

// PART 4 of 5: DATA CALCULATION & HELPERS
    function updatePOGrandTotal() { let grandTotal = 0; state.currentPOList.forEach(item => { grandTotal += (item.quantity || 0) * (item.cost || 0); }); document.getElementById('po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
    function updateReceiveGrandTotal() { let grandTotal = 0; state.currentReceiveList.forEach(item => { grandTotal += (item.quantity || 0) * (item.cost || 0); }); document.getElementById('receive-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
    function updateReturnGrandTotal() { let grandTotal = 0; state.currentReturnList.forEach(item => { grandTotal += (item.quantity || 0) * (item.cost || 0); }); document.getElementById('return-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
    function updateTransferGrandTotal() { let grandTotalQty = 0; state.currentTransferList.forEach(item => { grandTotalQty += item.quantity || 0; }); document.getElementById('transfer-grand-total').textContent = grandTotalQty.toFixed(2); }
    function updateIssueGrandTotal() { let grandTotalQty = 0; state.currentIssueList.forEach(item => { grandTotalQty += item.quantity || 0; }); document.getElementById('issue-grand-total').textContent = grandTotalQty.toFixed(2); }
    async function handleTransactionSubmit(payload, buttonEl) { const result = await postData('addTransactionBatch', payload, buttonEl); if (result) { showToast(`${payload.type.replace(/_/g,' ').toUpperCase()} processed!`, 'success'); let docGenData = result.data; docGenData.items = docGenData.items.map(i => ({...i, itemName: findByKey(state.items, 'code', i.itemCode)?.name })); if (payload.type === 'receive' || payload.type === 'return_to_supplier') { /* generate docs if needed */ state.currentReceiveList = []; state.currentReturnList = []; document.getElementById('form-receive-details').reset(); document.getElementById('form-return-details').reset(); } else if (payload.type === 'transfer_out') { /* generate docs */ state.currentTransferList = []; document.getElementById('form-transfer-details').reset(); document.getElementById('transfer-ref').value = generateId('TRN'); } else if (payload.type === 'issue') { /* generate docs */ state.currentIssueList = []; document.getElementById('form-issue-details').reset(); document.getElementById('issue-ref').value = generateId('ISN'); } await reloadDataAndRefreshUI(); } }
    const findByKey = (array, key, value) => (array || []).find(el => String(el?.[key]) === String(value));
    const generateId = (prefix) => `${prefix}-${Date.now()}`;
    const exportToExcel = (tableId, filename) => { try { const table = document.getElementById(tableId); if (!table) { showToast('Please generate a report first.', 'error'); return; } const wb = XLSX.utils.table_to_book(table, {sheet: "Sheet1"}); XLSX.writeFile(wb, filename); showToast('Exporting to Excel...', 'success'); } catch (err) { showToast('Excel export failed.', 'error'); Logger.error('Export Error:', err); } };
    const calculateStockLevels = () => { const stock = {}; (state.branches || []).forEach(branch => { stock[branch.branchCode] = {}; }); const sortedTransactions = [...(state.transactions || [])].sort((a, b) => new Date(a.date) - new Date(b.date)); sortedTransactions.forEach(t => { const item = findByKey(state.items, 'code', t.itemCode); if (!item) return; const changeStock = (branchCode, qty, cost) => { if (!branchCode || !stock[branchCode]) return; const s = stock[branchCode][t.itemCode] || { quantity: 0, avgCost: 0, itemName: item.name, category: item.category }; if (qty > 0) { const totalValue = (s.quantity * s.avgCost) + (qty * cost); const totalQty = s.quantity + qty; s.avgCost = totalQty > 0 ? totalValue / totalQty : 0; } s.quantity += qty; stock[branchCode][t.itemCode] = s; }; switch (t.type) { case 'receive': changeStock(t.branchCode, t.quantity, t.cost); break; case 'transfer_in': changeStock(t.toBranchCode, t.quantity, t.cost); break; case 'transfer_out': changeStock(t.fromBranchCode, -t.quantity, null); break; case 'issue': changeStock(t.fromBranchCode, -t.quantity, null); break; case 'return_to_supplier': changeStock(t.branchCode, t.quantity, t.cost); break; } }); return stock; };
    const calculateSupplierFinancials = () => { const financials = {}; state.suppliers.forEach(s => { financials[s.supplierCode] = { supplierCode: s.supplierCode, supplierName: s.name, totalBilled: 0, totalPaid: 0, balance: 0, invoices: {}, events: [] }; }); state.transactions.forEach(t => { if (!t.supplierCode || !financials[t.supplierCode]) return; const val = t.quantity * t.cost; if (t.type === 'receive' || t.type === 'return_to_supplier') { financials[t.supplierCode].totalBilled += val; if (!financials[t.supplierCode].invoices[t.invoiceNumber]) { financials[t.supplierCode].invoices[t.invoiceNumber] = { number: t.invoiceNumber, date: t.date, total: 0, paid: 0 }; } financials[t.supplierCode].invoices[t.invoiceNumber].total += val; } }); state.payments.forEach(p => { if (financials[p.supplierCode]) { financials[p.supplierCode].totalPaid += p.amount; if (p.invoiceNumber && financials[p.supplierCode].invoices[p.invoiceNumber]) { financials[p.supplierCode].invoices[p.invoiceNumber].paid += p.amount; } } }); Object.values(financials).forEach(s => { s.balance = s.totalBilled - s.totalPaid; const invoiceEvents = []; Object.values(s.invoices).forEach(inv => { inv.balance = inv.total - inv.paid; if (Math.abs(inv.balance) < 0.01) { inv.status = 'Paid'; } else if (inv.paid > 0 || (inv.total < s.totalBilled && inv.paid === 0)) { inv.status = 'Partial'; } else { inv.status = 'Unpaid'; } if (inv.total > 0) invoiceEvents.push({ date: inv.date, type: 'Invoice', ref: inv.number, debit: inv.total, credit: 0 }); else if (inv.total < 0) invoiceEvents.push({ date: inv.date, type: 'Credit Note', ref: inv.number, debit: 0, credit: -inv.total }); }); const paymentEvents = state.payments.filter(p => p.supplierCode === s.supplierCode).map(p => ({ date: p.date, type: 'Payment', ref: p.invoiceNumber || 'On Account', debit: 0, credit: p.amount })); s.events = [...invoiceEvents, ...paymentEvents].sort((a,b) => new Date(a.date) - new Date(b.date)); }); financials.allInvoices = {}; Object.values(financials).forEach(s => { Object.assign(financials.allInvoices, s.invoices); }); return financials; };
    const populateOptions = (el, data, ph, valueKey, textKey) => { el.innerHTML = `<option value="">${ph}</option>`; (data || []).forEach(item => { el.innerHTML += `<option value="${item[valueKey]}">${item[textKey]}${item[valueKey] && item[valueKey] !== item[textKey] ? ' (' + item[valueKey] + ')' : ''}</option>`; }); };

// PART 5 of 5: EVENT LISTENERS & INITIALIZATION
    function getVisibleBranchesForCurrentUser() { if (!state.currentUser) return []; if (userCan('viewAllBranches')) { return state.branches; } if (state.currentUser.AssignedBranchCode) { return state.branches.filter(b => String(b.branchCode) === String(state.currentUser.AssignedBranchCode)); } return []; }
    function applyBranchUserUIConstraints() { const assignedBranchCode = String(state.currentUser.AssignedBranchCode); if (!assignedBranchCode) return; const elementsToUpdate = ['receive-branch', 'issue-from-branch', 'transfer-from-branch', 'return-branch', 'po-branch', 'request-supplies-from-branch', 'report-shortage-from-branch']; elementsToUpdate.forEach(id => { const el = document.getElementById(id); if (el) { el.value = assignedBranchCode; el.disabled = true; el.dispatchEvent(new Event('change')); } }); const branchStatementSelect = document.getElementById('branch-statement-select'); if (!userCan('viewAllBranches')) { branchStatementSelect.value = assignedBranchCode; branchStatementSelect.disabled = true; } else { branchStatementSelect.disabled = false; } }
    async function reloadDataAndRefreshUI() { Logger.info('Reloading data...'); const { username, loginCode } = state; if (!username || !loginCode) { logout(); return; } const currentView = document.querySelector('#main-nav a.active')?.dataset.view || 'dashboard'; try { const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`); if (!response.ok) throw new Error('Failed to reload data.'); const data = await response.json(); if (data.status === 'error') throw new Error(data.message); Object.keys(data).forEach(key => { if(key !== 'user') state[key] = data[key] || state[key]; }); updateUserBranchDisplay(); await refreshViewData(currentView); Logger.info('Reload complete.'); } catch (err) { Logger.error('Data reload failed:', err); showToast('Could not refresh data. Please log in again.', 'error'); setTimeout(logout, 2000); } }
    
    function renderUserManagementUI() { const usersTbody = document.getElementById('table-users').querySelector('tbody'); usersTbody.innerHTML = ''; state.allUsers.forEach(user => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${user.Username}</td><td>${user.Name}</td><td>${user.RoleName}</td><td>${findByKey(state.branches, 'branchCode', user.AssignedBranchCode)?.name || 'N/A'}</td><td><button class="secondary small btn-edit" data-type="user" data-id="${user.Username}">Edit</button></td>`; usersTbody.appendChild(tr); }); const rolesTbody = document.getElementById('table-roles').querySelector('tbody'); rolesTbody.innerHTML = ''; state.allRoles.forEach(role => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${role.RoleName}</td><td><button class="secondary small btn-edit" data-type="role" data-id="${role.RoleName}">Edit</button></td>`; rolesTbody.appendChild(tr); }); }
    function renderPendingTransfers() { const container = document.getElementById('pending-transfers-card'); const tbody = document.getElementById('table-pending-transfers').querySelector('tbody'); const groupedTransfers = {}; state.transactions.filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => { if (!groupedTransfers[t.batchId]) { groupedTransfers[t.batchId] = { ...t, items: [] }; } groupedTransfers[t.batchId].items.push(t); }); const visibleTransfers = Object.values(groupedTransfers).filter(t => userCan('viewAllBranches') || t.toBranchCode === state.currentUser.AssignedBranchCode); tbody.innerHTML = ''; if (visibleTransfers.length === 0) { container.style.display = 'none'; return; } visibleTransfers.forEach(t => { const tr = document.createElement('tr'); const fromBranch = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name || t.fromBranchCode; tr.innerHTML = `<td>${new Date(t.date).toLocaleString()}</td><td>${fromBranch}</td><td>${t.ref}</td><td>${t.items.length}</td><td><button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">Receive</button></td>`; tbody.appendChild(tr); }); container.style.display = 'block'; }
    function renderInTransitReport() { const tbody = document.getElementById('table-in-transit').querySelector('tbody'); const groupedTransfers = {}; state.transactions.filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => { if (!groupedTransfers[t.batchId]) { groupedTransfers[t.batchId] = { ...t, items: [] }; } groupedTransfers[t.batchId].items.push(t); }); const visibleTransfers = Object.values(groupedTransfers).filter(t => userCan('viewAllBranches') || t.toBranchCode === state.currentUser.AssignedBranchCode || t.fromBranchCode === state.currentUser.AssignedBranchCode); tbody.innerHTML = ''; visibleTransfers.forEach(t => { const tr = document.createElement('tr'); const fromBranch = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name || t.fromBranchCode; const toBranch = findByKey(state.branches, 'branchCode', t.toBranchCode)?.name || t.toBranchCode; const canManage = userCan('viewAllBranches') || t.fromBranchCode === state.currentUser.AssignedBranchCode; const actions = canManage ? `<div class="action-buttons"><button class="danger small btn-cancel-transfer" data-batch-id="${t.batchId}">Cancel</button></div>` : 'N/A'; tr.innerHTML = `<td>${new Date(t.date).toLocaleString()}</td><td>${fromBranch}</td><td>${toBranch}</td><td>${t.ref}</td><td>${t.items.length}</td><td><span class="status-tag status-partial">In Transit</span></td><td>${actions}</td>`; tbody.appendChild(tr); }); }
    function renderOrderRequestsTable() { const tbody = document.getElementById('table-review-requests').querySelector('tbody'); tbody.innerHTML = ''; state.orderRequests.slice().reverse().forEach(req => { const tr = document.createElement('tr'); tr.className = `status-${req.Status}`; tr.innerHTML = `<td>${new Date(req.date).toLocaleString()}</td><td>${req.requestId}</td><td>${findByKey(state.branches, 'branchCode', req.fromBranch)?.name || req.fromBranch}</td><td>${findByKey(state.sections, 'sectionCode', req.toSection)?.name || req.toSection}</td><td><span class="status-tag status-${req.Status.toLowerCase()}">${req.Status}</span></td><td>${req.items.length}</td><td><button class="secondary small btn-review-request" data-req-id="${req.requestId}">View/Edit</button></td>`; tbody.appendChild(tr); }); }
    function attachSubNavListeners() { document.querySelectorAll('.sub-nav').forEach(nav => { nav.addEventListener('click', e => { if (!e.target.classList.contains('sub-nav-item')) return; const subviewId = e.target.dataset.subview; const parentView = e.target.closest('.view'); parentView.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active')); e.target.classList.add('active'); parentView.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active')); parentView.querySelector(`#subview-${subviewId}`).classList.add('active'); }); }); }
    
    function attachEventListeners() {
        // Event listeners for all buttons, forms, and inputs go here...
    }

    function setupRoleBasedNav() {
        const user = state.currentUser;
        if (!user) return;
        const userFirstName = user.Name.split(' ')[0];
        document.querySelector('.sidebar-header h1').textContent = `Hi, ${userFirstName}`;
    
        const navConfig = {
            'dashboard': userCan('viewDashboard'),
            'section-dashboard': userCan('viewSectionDashboard'),
            'shortages': userCan('viewShortages'),
            'requisitions': userCan('manageOrderRequests'),
            'operations': userCan('viewOperations'),
            'payments': userCan('viewPayments'),
            'financials': userCan('viewFinancials'),
            'reports': userCan('viewReports'),
            'stock-levels': userCan('viewStockLevels'),
            'transaction-history': userCan('viewTransactionHistory'),
            'setup': userCan('viewSetup'),
            'master-data': userCan('viewMasterData'),
            'user-management': userCan('manageUsers'),
            'activity-log': userCan('viewActivityLog')
        };
    
        Object.entries(navConfig).forEach(([view, isVisible]) => {
            const el = document.querySelector(`[data-view="${view}"]`)?.parentElement;
            if (el) el.style.display = isVisible ? '' : 'none';
        });
    }

    function logout() { Logger.info('User logging out.'); location.reload(); }
    function initializeAppUI() {
        Logger.info('Application UI initializing...');
        setupRoleBasedNav();
        attachEventListeners(); // Note: This function needs to be fully populated
        attachSubNavListeners();
        // Setup all search bars
        setupSearch('search-items', renderItemsTable, 'items', ['name', 'code', 'category']);
        setupSearch('search-suppliers', renderSuppliersTable, 'suppliers', ['name', 'supplierCode']);
        setupSearch('search-branches', renderBranchesTable, 'branches', ['name', 'branchCode']);
        setupSearch('search-sections', renderSectionsTable, 'sections', ['name', 'sectionCode']);
        setupSearch('search-price-history', renderPriceHistoryTable, 'priceHistory', ['ItemCode']);
        setupSearch('stock-levels-search', renderItemCentricStockView, 'items', ['name', 'code', 'category']);
        updateUserBranchDisplay();
        
        // Determine the initial view
        let initialView = 'dashboard';
        if (userCan('viewSectionDashboard') && !userCan('viewDashboard')) {
            initialView = 'section-dashboard';
        } else {
            initialView = document.querySelector('#main-nav .nav-item:not([style*="display: none"]) a')?.dataset.view || 'dashboard';
        }
        showView(initialView);
        Logger.info('Application initialized successfully.');
    }

    function updateUserBranchDisplay() { const displayEl = document.getElementById('user-branch-display'); if (!state.currentUser || !state.currentUser.AssignedBranchCode) { displayEl.style.display = 'none'; return; } const branch = findByKey(state.branches, 'branchCode', state.currentUser.AssignedBranchCode); if (branch) { displayEl.textContent = `Branch: ${branch.name}`; displayEl.style.display = 'inline-block'; } else { displayEl.style.display = 'none'; } }
    async function init() { loginContainer.style.display = 'flex'; appContainer.style.display = 'none'; loginForm.addEventListener('submit', (e) => { e.preventDefault(); const username = loginUsernameInput.value.trim(); const code = loginCodeInput.value; if (username && code) { attemptLogin(username, code); } }); }
    init();
});
