// PART 1 OF 4: CORE SETUP & API

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
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwSXecg7HzInAAJzNbjfYs8I75xBQNjOJQUqqT83Yn7VAMAq6Rumw2yPLOzJetAgo_4/exec';

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
        priceHistory: [],
        orderRequests: [],
        orderRequestItems: [],
        currentReceiveList: [],
        currentTransferList: [],
        currentIssueList: [],
        currentReturnList: [],
        currentRequestList: [],
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
        if (!SCRIPT_URL || !SCRIPT_URL.includes('macros/s')) {
            const errorMsg = 'SCRIPT_URL is not set or invalid in script.js.';
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
    // PART 2 OF 4: MODAL & UI LOGIC
    function openItemSelectorModal() {
        let currentList;
        if (document.getElementById('subview-receive').classList.contains('active')) {
            modalContext = 'receive'; currentList = state.currentReceiveList;
        } else if (document.getElementById('subview-transfer').classList.contains('active')) {
            modalContext = 'transfer'; currentList = state.currentTransferList;
        } else if (document.getElementById('subview-issue').classList.contains('active')) {
            modalContext = 'issue'; currentList = state.currentIssueList;
        } else if (document.getElementById('subview-return').classList.contains('active')) {
            modalContext = 'return'; currentList = state.currentReturnList;
        } else if (document.getElementById('subview-make-request').classList.contains('active')) {
            modalContext = 'request'; currentList = state.currentRequestList;
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
        if (transferGroup.length === 0) {
            showToast('Could not find transfer details.', 'error');
            return;
        }
        const first = transferGroup[0];
        const fromBranch = findByKey(state.branches, 'branchCode', first.fromBranchCode)?.name || first.fromBranchCode;
        const toBranch = findByKey(state.branches, 'branchCode', first.toBranchCode)?.name || first.toBranchCode;

        const modalBody = document.getElementById('view-transfer-modal-body');
        let html = `<p><strong>From Branch:</strong> ${fromBranch}</p>
                    <p><strong>To Branch:</strong> ${toBranch}</p>
                    <p><strong>Reference:</strong> ${first.ref || 'N/A'}</p>
                    <hr>
                    <h4>Items in Shipment</h4>
                    <table><thead><tr><th>Code</th><th>Name</th><th>Quantity</th></tr></thead><tbody>`;

        transferGroup.forEach(itemTx => {
            const item = findByKey(state.items, 'code', itemTx.itemCode) || { name: 'DELETED' };
            html += `<tr><td>${itemTx.itemCode}</td><td>${item.name}</td><td>${itemTx.quantity}</td></tr>`;
        });
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
            case 'supplier':
                record = findByKey(state.suppliers, 'supplierCode', id); if (!record) return;
                editModalTitle.textContent = 'Edit Supplier';
                formHtml = `<div class="form-grid"><div class="form-group"><label>Supplier Code</label><input type="text" value="${record.supplierCode}" readonly></div><div class="form-group"><label for="edit-supplier-name">Supplier Name</label><input type="text" id="edit-supplier-name" name="name" value="${record.name}" required></div><div class="form-group"><label for="edit-supplier-contact">Contact Info</label><input type="text" id="edit-supplier-contact" name="contact" value="${record.contact || ''}"></div></div>`;
                editModalBody.innerHTML = formHtml;
                break;
            case 'branch':
                record = findByKey(state.branches, 'branchCode', id); if (!record) return;
                editModalTitle.textContent = 'Edit Branch';
                formHtml = `<div class="form-grid"><div class="form-group"><label>Branch Code</label><input type="text" value="${record.branchCode}" readonly></div><div class="form-group"><label for="edit-branch-name">Branch Name</label><input type="text" id="edit-branch-name" name="name" value="${record.name}" required></div></div>`;
                editModalBody.innerHTML = formHtml;
                break;
            case 'section':
                record = findByKey(state.sections, 'sectionCode', id); if (!record) return;
                editModalTitle.textContent = 'Edit Section';
                formHtml = `<div class="form-grid"><div class="form-group"><label>Section Code</label><input type="text" value="${record.sectionCode}" readonly></div><div class="form-group"><label for="edit-section-name">Section Name</label><input type="text" id="edit-section-name" name="name" value="${record.name}" required></div></div>`;
                editModalBody.innerHTML = formHtml;
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
            case 'role':
                record = findByKey(state.allRoles, 'RoleName', id); if (!record) return;
                editModalTitle.textContent = `Edit Permissions for ${record.RoleName}`;
                const permissionKeys = Object.keys(state.allRoles[0] || {}).filter(key => key !== 'RoleName');
                const permissionCategories = {
                    'General Access': ['manageUsers', 'viewDashboard', 'viewActivityLog'],
                    'Order Requests': ['createOrderRequest', 'manageOrderRequests'],
                    'Stock Operations': ['viewOperations', 'opReceive', 'opIssue', 'opTransfer', 'opReturnToSupplier'],
                    'Financials & Payments': ['viewPayments', 'viewFinancials', 'opRecordPayment'],
                    'Reports': ['viewReports', 'viewStockLevels', 'viewTransactionHistory', 'viewAllBranches'],
                    'Data Management': ['viewSetup', 'viewMasterData', 'createItem', 'editItem', 'createSupplier', 'editSupplier', 'createBranch', 'editBranch', 'createSection', 'editSection', 'viewPriceHistory'],
                };
                formHtml = '<h3>Permissions</h3>';
                for (const category in permissionCategories) {
                    formHtml += `<h4 class="permission-category">${category}</h4><div class="form-grid permissions-grid">`;
                    permissionCategories[category].forEach(key => {
                        if (permissionKeys.includes(key)) {
                            const isChecked = record[key] === true || String(record[key]).toUpperCase() === 'TRUE';
                            formHtml += `<div class="form-group-checkbox"><input type="checkbox" id="edit-perm-${key}" name="${key}" ${isChecked ? 'checked' : ''}><label for="edit-perm-${key}">${key}</label></div>`;
                        }
                    });
                    formHtml += `</div>`;
                }
                formHtml += `<div class="form-group span-full" style="margin-top: 24px;"><button type="button" id="btn-delete-role" class="danger">Delete Role</button></div>`
                editModalBody.innerHTML = formHtml;
                break;
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
            if (id) { // UPDATE
                action = 'updateUser';
                const updates = {};
                for (let [key, value] of formData.entries()) {
                    if (key === 'Username') continue;
                    if (key === 'LoginCode' && value === '') continue;
                    updates[key] = value;
                }
                payload = { Username: id, updates: updates };
            } else { // ADD
                action = 'addUser';
                payload = {};
                for (let [key, value] of formData.entries()) { payload[key] = value; }
                if (!payload.LoginCode) { showToast('Password is required for new users.', 'error'); return; }
            }
        } else if (type === 'role') {
            action = 'updateRolePermissions';
            const updates = {};
            const allPerms = Object.keys(findByKey(state.allRoles, 'RoleName', id) || {});
            allPerms.forEach(key => { if (key !== 'RoleName') { updates[key] = formData.has(key); }});
            payload = { RoleName: id, updates: updates };
        } else {
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


    function renderItemsInModal(filter = '') {
        modalItemList.innerHTML = '';
        const lowercasedFilter = filter.toLowerCase();
        state.items.filter(item => item.name.toLowerCase().includes(lowercasedFilter) || item.code.toLowerCase().includes(lowercasedFilter)).forEach(item => {
            const isChecked = state.modalSelections.has(item.code);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'modal-item';
            itemDiv.innerHTML = `<input type="checkbox" id="modal-item-${item.code}" data-code="${item.code}" ${isChecked ? 'checked' : ''}><label for="modal-item-${item.code}"><strong>${item.name}</strong><br><small style="color:var(--text-light-color)">Code: ${item.code} | Category: ${item.category || 'N/A'}</small></label>`;
            modalItemList.appendChild(itemDiv);
        });
    }

    function renderInvoicesInModal() {
        const modalInvoiceList = document.getElementById('modal-invoice-list');
        const supplierCode = document.getElementById('payment-supplier-select').value;
        const supplierFinancials = calculateSupplierFinancials();
        const supplierInvoices = supplierFinancials[supplierCode]?.invoices;
        modalInvoiceList.innerHTML = '';
        if (!supplierInvoices || Object.keys(supplierInvoices).length === 0) {
            modalInvoiceList.innerHTML = '<p>No invoices found for this supplier.</p>';
            return;
        }
        const unpaidInvoices = Object.values(supplierInvoices).filter(inv => inv.status !== 'Paid');
        if (unpaidInvoices.length === 0) {
            modalInvoiceList.innerHTML = '<p>No unpaid invoices for this supplier.</p>';
            return;
        }
        unpaidInvoices.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(invoice => {
            const isChecked = state.invoiceModalSelections.has(invoice.number);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'modal-item';
            itemDiv.innerHTML = `<input type="checkbox" id="modal-invoice-${invoice.number}" data-number="${invoice.number}" ${isChecked ? 'checked' : ''}><label for="modal-invoice-${invoice.number}"><strong>Invoice #: ${invoice.number}</strong><br><small style="color:var(--text-light-color)">Date: ${new Date(invoice.date).toLocaleDateString()} | Amount Due: ${invoice.balance.toFixed(2)} EGP</small></label>`;
            modalInvoiceList.appendChild(itemDiv);
        });
    }

    function handleModalCheckboxChange(e) { if (e.target.type === 'checkbox') { const itemCode = e.target.dataset.code; if (e.target.checked) state.modalSelections.add(itemCode); else state.modalSelections.delete(itemCode); } }
    function handleInvoiceModalCheckboxChange(e) { if (e.target.type === 'checkbox') { const invoiceNumber = e.target.dataset.number; if (e.target.checked) state.invoiceModalSelections.add(invoiceNumber); else state.invoiceModalSelections.delete(invoiceNumber); } }

    function renderPaymentList() {
        const supplierCode = document.getElementById('payment-supplier-select').value;
        const container = document.getElementById('payment-invoice-list-container');
        if (!supplierCode || state.invoiceModalSelections.size === 0) { container.style.display = 'none'; return; }
        const supplierInvoices = calculateSupplierFinancials()[supplierCode]?.invoices;
        const tableBody = document.getElementById('table-payment-list').querySelector('tbody');
        tableBody.innerHTML = '';
        let total = 0;
        state.invoiceModalSelections.forEach(invNum => {
            const invoice = supplierInvoices[invNum];
            if (!invoice) return;
            const balance = invoice.balance;
            total += balance;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${invoice.number}</td><td>${balance.toFixed(2)} EGP</td><td><input type="number" class="table-input payment-amount-input" data-invoice="${invoice.number}" value="${balance.toFixed(2)}" step="0.01" min="0" max="${balance.toFixed(2)}" style="max-width: 150px;"></td>`;
            tableBody.appendChild(tr);
        });
        document.getElementById('payment-total-amount').textContent = `${total.toFixed(2)} EGP`;
        container.style.display = 'block';
    }

    function handlePaymentInputChange() { let total = 0; document.querySelectorAll('.payment-amount-input').forEach(input => { total += parseFloat(input.value) || 0; }); document.getElementById('payment-total-amount').textContent = `${total.toFixed(2)} EGP`; }

    function confirmModalSelection() {
        const selectedCodes = Array.from(state.modalSelections);
        const addItemsToList = (currentList) => {
            const newList = [];
            selectedCodes.forEach(code => {
                const existing = currentList.find(i => i.itemCode === code);
                if (existing) newList.push(existing);
                else { const item = findByKey(state.items, 'code', code); if (item) newList.push({ itemCode: item.code, itemName: item.name, quantity: 1, cost: item.cost, category: item.category }); }
            });
            return newList.sort((a,b) => a.itemName.localeCompare(b.itemName));
        };
        switch (modalContext) {
            case 'invoices': renderPaymentList(); break;
            case 'receive': state.currentReceiveList = addItemsToList(state.currentReceiveList); renderReceiveListTable(); break;
            case 'transfer': state.currentTransferList = addItemsToList(state.currentTransferList); renderTransferListTable(); break;
            case 'issue': state.currentIssueList = addItemsToList(state.currentIssueList); renderIssueListTable(); break;
            case 'return': state.currentReturnList = addItemsToList(state.currentReturnList); renderReturnListTable(); break;
            case 'request': state.currentRequestList = addItemsToList(state.currentRequestList); renderRequestItemsTable(); break;
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
    // PART 3 OF 4: VIEW RENDERING
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

    function renderSuppliersTable(data = state.suppliers) {
        const tbody = document.getElementById('table-suppliers').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="5">No suppliers found.</td></tr>'; return; }
        const financials = calculateSupplierFinancials();
        const canEdit = userCan('editSupplier');
        data.forEach(supplier => {
            const balance = financials[supplier.supplierCode]?.balance || 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${supplier.supplierCode || ''}</td><td>${supplier.name}</td><td>${supplier.contact || ''}</td><td>${balance.toFixed(2)} EGP</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="supplier" data-id="${supplier.supplierCode}">Edit</button>`: 'N/A'}</td>`;
            tbody.appendChild(tr);
        });
    }

    function renderBranchesTable(data = state.branches) { const tbody = document.getElementById('table-branches').querySelector('tbody'); tbody.innerHTML = ''; if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="3">No branches found.</td></tr>'; return; } const canEdit = userCan('editBranch'); data.forEach(branch => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${branch.branchCode || ''}</td><td>${branch.name}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="branch" data-id="${branch.branchCode}">Edit</button>`: 'N/A'}</td>`; tbody.appendChild(tr); }); }
    function renderSectionsTable(data = state.sections) { const tbody = document.getElementById('table-sections').querySelector('tbody'); tbody.innerHTML = ''; if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="3">No sections found.</td></tr>'; return; } const canEdit = userCan('editSection'); data.forEach(section => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${section.sectionCode || ''}</td><td>${section.name}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="section" data-id="${section.sectionCode}">Edit</button>`: 'N/A'}</td>`; tbody.appendChild(tr); }); }
    function renderPriceHistoryTable(data = state.priceHistory) { const tbody = document.getElementById('table-price-history').querySelector('tbody'); tbody.innerHTML = ''; if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No price history found.</td></tr>'; return; } data.slice().reverse().forEach(h => { const item = findByKey(state.items, 'code', h.ItemCode); const tr = document.createElement('tr'); tr.innerHTML = `<td>${new Date(h.Timestamp).toLocaleString()}</td><td>${h.ItemCode}</td><td>${item ? item.name : 'DELETED ITEM'}</td><td>${parseFloat(h.OldCost).toFixed(2)}</td><td>${parseFloat(h.NewCost).toFixed(2)}</td><td>${h.UpdatedBy}</td>`; tbody.appendChild(tr); }); }

    function renderReceiveListTable() {
        const tbody = document.getElementById('table-receive-list').querySelector('tbody');
        tbody.innerHTML = '';
        if (state.currentReceiveList.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; updateReceiveGrandTotal(); return; }
        state.currentReceiveList.forEach((item, index) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" step="0.01" data-index="${index}" data-field="quantity"></td><td><input type="number" class="table-input" value="${(item.cost || 0).toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost"></td><td id="total-cost-${index}">${(item.quantity * item.cost).toFixed(2)} EGP</td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); });
        updateReceiveGrandTotal();
    }
    
    function renderReturnListTable() {
        const tbody = document.getElementById('table-return-list').querySelector('tbody');
        tbody.innerHTML = '';
        if (state.currentReturnList.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; updateReturnGrandTotal(); return; }
        state.currentReturnList.forEach((item, index) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" step="0.01" data-index="${index}" data-field="quantity"></td><td><input type="number" class="table-input" value="${item.cost.toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost"></td><td id="total-return-cost-${index}">${(item.quantity * item.cost).toFixed(2)} EGP</td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); });
        updateReturnGrandTotal();
    }

    function renderTransferListTable() {
        const tbody = document.getElementById('table-transfer-list').querySelector('tbody');
        const fromBranchCode = document.getElementById('transfer-from-branch').value;
        const stock = calculateStockLevels();
        tbody.innerHTML = '';
        if (state.currentTransferList.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; updateTransferGrandTotal(); return; }
        state.currentTransferList.forEach((item, index) => { const availableStock = stock[fromBranchCode]?.[item.itemCode]?.quantity || 0; const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td>${availableStock.toFixed(2)}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" max="${availableStock}" step="0.01" data-index="${index}" data-field="quantity"></td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); });
        updateTransferGrandTotal();
    }

    function renderIssueListTable() {
        const tbody = document.getElementById('table-issue-list').querySelector('tbody');
        const fromBranchCode = document.getElementById('issue-from-branch').value;
        const stock = calculateStockLevels();
        tbody.innerHTML = '';
        if (state.currentIssueList.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; updateIssueGrandTotal(); return; }
        state.currentIssueList.forEach((item, index) => { const availableStock = stock[fromBranchCode]?.[item.itemCode]?.quantity || 0; const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td>${availableStock.toFixed(2)}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" max="${availableStock}" step="0.01" data-index="${index}" data-field="quantity"></td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); });
        updateIssueGrandTotal();
    }
    
    function renderRequestItemsTable() {
        const tbody = document.getElementById('table-request-items').querySelector('tbody');
        tbody.innerHTML = '';
        if(state.currentRequestList.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items selected. Click "Select Items".</td></tr>'; return; }
        state.currentRequestList.forEach((item, index) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.category || 'N/A'}</td><td><input type="number" class="table-input" value="${item.quantity}" min="1" step="1" data-index="${index}" data-field="quantity"></td><td><button class="danger small" data-index="${index}">X</button></td>`; tbody.appendChild(tr); });
    }

    function renderItemCentricStockView(itemsToRender = state.items) {
        const container = document.getElementById('item-centric-stock-container');
        if (!container) return;
        const stockByBranch = calculateStockLevels();
        const branchesToDisplay = getVisibleBranchesForCurrentUser();
        let tableHTML = `<table id="table-stock-levels-by-item"><thead><tr><th>Code</th><th>Item Name</th><th>Category</th>`;
        branchesToDisplay.forEach(b => { tableHTML += `<th>${b.name}</th>` });
        tableHTML += `<th>Total</th><th>Value</th></tr></thead><tbody>`;
        itemsToRender.forEach(item => {
            tableHTML += `<tr><td>${item.code}</td><td>${item.name}</td><td>${item.category || ''}</td>`;
            let total = 0;
            let totalValue = 0;
            branchesToDisplay.forEach(branch => {
                const stockItem = stockByBranch[branch.branchCode]?.[item.code];
                const qty = stockItem?.quantity || 0;
                total += qty;
                totalValue += qty * (stockItem?.avgCost || 0);
                tableHTML += `<td>${qty > 0 ? qty.toFixed(2) : '-'}</td>`;
            });
            tableHTML += `<td><strong>${total.toFixed(2)}</strong></td><td><strong>${totalValue.toFixed(2)}</strong></td></tr>`;
        });
        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;
    }

    function renderItemInquiry(searchTerm) {
        const resultsContainer = document.getElementById('item-inquiry-results');
        if (!searchTerm) { resultsContainer.innerHTML = ''; return; }
        const stockByBranch = calculateStockLevels();
        const filteredItems = state.items.filter(i => i.name.toLowerCase().includes(searchTerm) || i.code.toLowerCase().includes(searchTerm));
        let html = '';
        const branchesToDisplay = getVisibleBranchesForCurrentUser();
        filteredItems.slice(0, 10).forEach(item => {
            html += `<h4>${item.name} (${item.code})</h4><table><thead><tr><th>Branch</th><th>Qty</th><th>Avg. Cost</th><th>Value</th></tr></thead><tbody>`;
            let found = false, totalQty = 0, totalValue = 0;
            branchesToDisplay.forEach(branch => {
                const itemStock = stockByBranch[branch.branchCode]?.[item.code];
                if (itemStock && itemStock.quantity > 0) {
                    const value = itemStock.quantity * itemStock.avgCost;
                    html += `<tr><td>${branch.name}</td><td>${itemStock.quantity.toFixed(2)}</td><td>${itemStock.avgCost.toFixed(2)}</td><td>${value.toFixed(2)} EGP</td></tr>`;
                    totalQty += itemStock.quantity; totalValue += value; found = true;
                }
            });
            if (!found) { html += `<tr><td colspan="4">No stock for this item.</td></tr>`; } 
            else { html += `<tr style="font-weight:bold; background-color: var(--bg-color);"><td>Total</td><td>${totalQty.toFixed(2)}</td><td>-</td><td>${totalValue.toFixed(2)} EGP</td></tr>` }
            html += `</tbody></table><hr>`;
        });
        resultsContainer.innerHTML = html;
    }

    function renderSupplierStatement(supplierCode, startDateStr, endDateStr) {
        const resultsContainer = document.getElementById('supplier-statement-results');
        const exportBtn = document.getElementById('btn-export-supplier-statement');
        const supplier = findByKey(state.suppliers, 'supplierCode', supplierCode);
        if (!supplier) { exportBtn.disabled = true; return; }
        const financials = calculateSupplierFinancials();
        const supplierData = financials[supplierCode];
        const sDate = startDateStr ? new Date(startDateStr) : null;
        const eDate = endDateStr ? new Date(endDateStr) : null;
        if(sDate) sDate.setHours(0,0,0,0);
        if (eDate) eDate.setHours(23, 59, 59, 999);
        let openingBalance = 0;
        if (sDate) { supplierData.events.forEach(event => { if (new Date(event.date) < sDate) { openingBalance += event.debit - event.credit; } }); }
        const filteredEvents = supplierData.events.filter(event => { const eventDate = new Date(event.date); return (!sDate || eventDate >= sDate) && (!eDate || eventDate <= eDate); });
        let balance = openingBalance;
        let tableBodyHtml = '';
        if (sDate) { tableBodyHtml += `<tr style="background-color: var(--bg-color);"><td colspan="3"><strong>Opening Balance as of ${sDate.toLocaleDateString()}</strong></td><td>-</td><td>-</td><td><strong>${openingBalance.toFixed(2)} EGP</strong></td></tr>`; }
        filteredEvents.forEach(event => { balance += event.debit - event.credit; tableBodyHtml += `<tr><td>${new Date(event.date).toLocaleDateString()}</td><td>${event.type}</td><td>${event.ref}</td><td>${event.debit > 0 ? event.debit.toFixed(2) : '-'}</td><td>${event.credit > 0 ? event.credit.toFixed(2) : '-'}</td><td>${balance.toFixed(2)} EGP</td></tr>`; });
        let dateHeader = `for all time`;
        if (sDate && eDate) { dateHeader = `from ${sDate.toLocaleDateString()} to ${eDate.toLocaleDateString()}`; } else if (sDate) { dateHeader = `from ${sDate.toLocaleDateString()}`; } else if (eDate) { dateHeader = `until ${eDate.toLocaleDateString()}`; }
        resultsContainer.innerHTML = `<div class="printable-document"><div class="printable-header"><div><h2>Supplier Statement: ${supplier.name}</h2><p style="margin:0; color: var(--text-light-color);">For period: ${dateHeader}</p></div><button class="secondary no-print" onclick="printReport('supplier-statement-results')">Print</button></div><p><strong>Date Generated:</strong> ${new Date().toLocaleString()}</p><div class="report-area"><table id="table-supplier-statement-report"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${tableBodyHtml}</tbody><tfoot><tr style="font-weight:bold; background-color: var(--bg-color);"><td colspan="5" style="text-align:right;">Closing Balance:</td><td>${balance.toFixed(2)} EGP</td></tr></tfoot></table></div></div>`;
        resultsContainer.style.display = 'block';
        exportBtn.disabled = false;
    }
    
    function renderConsumptionReport(startDateStr, endDateStr, branchCode, sectionCode, category) {
        const resultsContainer = document.getElementById('consumption-report-results');
        const exportBtn = document.getElementById('btn-export-consumption-report');
        const sDate = startDateStr ? new Date(startDateStr) : null;
        const eDate = endDateStr ? new Date(endDateStr) : null;
        if(sDate) sDate.setHours(0,0,0,0);
        if (eDate) eDate.setHours(23, 59, 59, 999);

        const issueTransactions = state.transactions.filter(t => {
            const item = findByKey(state.items, 'code', t.itemCode);
            const eventDate = new Date(t.date);
            return t.type === 'issue' &&
                   (!sDate || eventDate >= sDate) &&
                   (!eDate || eventDate <= eDate) &&
                   (!branchCode || t.fromBranchCode === branchCode) &&
                   (!sectionCode || t.sectionCode === sectionCode) &&
                   (!category || (item && item.category === category));
        });
        
        const groupedBySection = {};
        let grandTotalCost = 0;

        issueTransactions.forEach(t => {
            if(!groupedBySection[t.sectionCode]) {
                groupedBySection[t.sectionCode] = {
                    sectionName: findByKey(state.sections, 'sectionCode', t.sectionCode)?.name || 'N/A',
                    items: {},
                    totalCost: 0
                };
            }
            const section = groupedBySection[t.sectionCode];
            const item = findByKey(state.items, 'code', t.itemCode) || {name: 'N/A'};
            if(!section.items[t.itemCode]) {
                section.items[t.itemCode] = {
                    itemName: item.name,
                    quantity: 0,
                    totalCost: 0
                };
            }
            const itemEntry = section.items[t.itemCode];
            const cost = t.quantity * (t.cost || 0);
            itemEntry.quantity += t.quantity;
            itemEntry.totalCost += cost;
            section.totalCost += cost;
            grandTotalCost += cost;
        });

        let tableHtml = '';
        Object.keys(groupedBySection).forEach(secCode => {
            const sectionData = groupedBySection[secCode];
            tableHtml += `<tr style="background-color: var(--primary-light); font-weight: bold;"><td colspan="4">${sectionData.sectionName}</td><td style="text-align:right;">${sectionData.totalCost.toFixed(2)} EGP</td></tr>`;
            Object.keys(sectionData.items).forEach(itemCode => {
                const itemData = sectionData.items[itemCode];
                tableHtml += `<tr><td>${itemCode}</td><td>${itemData.itemName}</td><td style="text-align:right;">${itemData.quantity.toFixed(2)}</td><td style="text-align:right;">${(itemData.totalCost / itemData.quantity).toFixed(2)}</td><td style="text-align:right;">${itemData.totalCost.toFixed(2)}</td></tr>`;
            });
        });
        
        let dateHeader = `for all time`;
        if (sDate && eDate) { dateHeader = `from ${sDate.toLocaleDateString()} to ${eDate.toLocaleDateString()}`; } else if (sDate) { dateHeader = `from ${sDate.toLocaleDateString()}`; } else if (eDate) { dateHeader = `until ${eDate.toLocaleDateString()}`; }
        resultsContainer.innerHTML = `<div class="printable-document"><div class="printable-header"><div><h2>Consumption Report</h2><p style="margin:0; color: var(--text-light-color);">${dateHeader}</p></div><button class="secondary no-print" onclick="printReport('consumption-report-results')">Print</button></div><div class="report-area"><table id="table-consumption-report"><thead><tr><th>Item Code</th><th>Item Name</th><th style="text-align:right;">Qty Issued</th><th style="text-align:right;">Avg Cost</th><th style="text-align:right;">Total Cost</th></tr></thead><tbody>${tableHtml}</tbody><tfoot><tr style="font-weight:bold; background-color: var(--bg-color);"><td colspan="4" style="text-align:right;">Grand Total:</td><td style="text-align:right;">${grandTotalCost.toFixed(2)} EGP</td></tr></tfoot></table></div></div>`;
        resultsContainer.style.display = 'block';
        exportBtn.disabled = false;
    }

    function renderTransactionHistory(filter = '') {
        const tbody = document.getElementById('table-transaction-history').querySelector('tbody');
        tbody.innerHTML = '';
        const lowerFilter = filter.toLowerCase();
        const invoiceFinances = calculateSupplierFinancials().allInvoices;
        const grouped = {};
        state.transactions.forEach(t => {
            const key = t.batchId || t.ref || t.invoiceNumber;
            if (!grouped[key]) { grouped[key] = { date: t.date, type: t.type, batchId: key, transactions: [] }; }
            grouped[key].transactions.push(t);
        });
        Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(group => {
            const first = group.transactions[0];
            let details = '', searchableText = `${group.batchId} ${first.invoiceNumber || ''} ${first.ref || ''} ${first.type}`, statusTag = '', refNum = first.invoiceNumber || first.ref || first.batchId, typeDisplay = first.type.replace('_',' ').toUpperCase();
            switch(first.type) {
                case 'receive':
                case 'return_to_supplier':
                    const status = invoiceFinances[first.invoiceNumber]?.status || 'Unpaid';
                    statusTag = `<span class="status-tag status-${status.toLowerCase()}">${status}</span>`;
                    const supplier = findByKey(state.suppliers, 'supplierCode', first.supplierCode);
                    const branch = findByKey(state.branches, 'branchCode', first.branchCode);
                    details = `${typeDisplay === 'RECEIVE' ? 'Received' : 'Returned'} ${group.transactions.length} item(s) ${typeDisplay === 'RECEIVE' ? 'from' : 'to'} <strong>${supplier?.name || 'N/A'}</strong> at <strong>${branch?.name || 'N/A'}</strong>`;
                    searchableText += ` ${supplier?.name} ${branch?.name}`;
                    break;
                case 'transfer_out':
                case 'transfer_in':
                    const from = findByKey(state.branches, 'branchCode', first.fromBranchCode);
                    const to = findByKey(state.branches, 'branchCode', first.toBranchCode);
                    details = `Transferred ${group.transactions.length} item(s) from <strong>${from?.name || 'N/A'}</strong> to <strong>${to?.name || 'N/A'}</strong>`;
                    searchableText += ` ${from?.name} ${to?.name}`;
                    statusTag = `<span class="status-tag status-partial">${first.Status || 'N/A'}</span>`;
                    break;
                 case 'issue':
                    const fromBranch = findByKey(state.branches, 'branchCode', first.fromBranchCode);
                    const toSection = findByKey(state.sections, 'sectionCode', first.sectionCode || first.ref);
                    details = `Issued ${group.transactions.length} item(s) from <strong>${fromBranch?.name || 'N/A'}</strong> to <strong>${toSection?.name || 'N/A'}</strong>`;
                    searchableText += ` ${fromBranch?.name} ${toSection?.name}`;
                    break;
            }
            if (filter && !searchableText.toLowerCase().includes(lowerFilter)) return;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(first.date).toLocaleString()}</td><td>${typeDisplay}</td><td>${refNum}</td><td>${details}</td><td>${statusTag}</td><td><button class="secondary small no-print" data-batch-id="${group.batchId}" data-type="${first.type}">View/Print</button></td>`;
            tbody.appendChild(tr);
        });
    }

    function renderActivityLog() { const tbody = document.getElementById('table-activity-log').querySelector('tbody'); tbody.innerHTML = ''; state.activityLog.slice().reverse().forEach(log => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${new Date(log.timestamp).toLocaleString()}</td><td>${log.action}</td><td>${log.description}</td>`; tbody.appendChild(tr); }); }
    const generateReceiveDocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; const branch = findByKey(state.branches, 'branchCode', data.branchCode) || { name: 'DELETED' }; let itemsHtml = '', totalValue = 0; data.items.forEach(item => { const itemTotal = Math.abs(item.quantity * item.cost); totalValue += itemTotal; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${Math.abs(item.quantity).toFixed(2)}</td><td>${item.cost.toFixed(2)} EGP</td><td>${itemTotal.toFixed(2)} EGP</td></tr>`; }); const isReturn = data.type === 'return_to_supplier'; const content = `<div class="printable-document card"><h2>${isReturn ? 'Goods Return Note' : 'Goods Received Note'}</h2><p><strong>GRN No:</strong> ${data.batchId}</p><p><strong>Invoice #:</strong> ${data.invoiceNumber}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>Supplier:</strong> ${supplier.name}</p><p><strong>${isReturn ? 'Returned From' : 'Received at'}:</strong> ${branch.name}</p><hr><h3>Items ${isReturn ? 'Returned' : 'Received'}</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Cost/Unit</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">Total Value</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Signature:</strong> _________________________</p></div>`; printContent(content); };
    const generateTransferDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { name: 'DELETED' }; const toBranch = findByKey(state.branches, 'branchCode', data.toBranchCode) || { name: 'DELETED' }; let itemsHtml = ''; data.items.forEach(item => { const fullItem = findByKey(state.items, 'code', item.itemCode) || { code: 'N/A', name: 'DELETED', unit: 'N/A' }; itemsHtml += `<tr><td>${fullItem.code}</td><td>${fullItem.name}</td><td>${item.quantity.toFixed(2)}</td><td>${fullItem.unit}</td></tr>`; }); const content = `<div class="printable-document card"><h2>Internal Transfer Order</h2><p><strong>Order ID:</strong> ${data.batchId}</p><p><strong>Reference:</strong> ${data.ref}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>From:</strong> ${fromBranch.name}</p><p><strong>To:</strong> ${toBranch.name}</p><hr><h3>Items Transferred</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Unit</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Sender:</strong> _________________</p><p><strong>Receiver:</strong> _________________</p></div>`; printContent(content); };
    const generateIssueDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { name: 'DELETED' }; const toSection = findByKey(state.sections, 'sectionCode', data.sectionCode || data.ref) || { name: 'DELETED' }; let itemsHtml = '', totalValue = 0; data.items.forEach(item => { const fullItem = findByKey(state.items, 'code', item.itemCode) || { name: 'DELETED', unit: 'N/A' }; const itemCost = item.quantity * (item.cost || 0); totalValue += itemCost; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName || fullItem.name}</td><td>${item.quantity.toFixed(2)}</td><td>${(item.cost || 0).toFixed(2)}</td><td>${itemCost.toFixed(2)}</td></tr>`; }); const content = `<div class="printable-document card"><h2>Stock Issue Note</h2><p><strong>Issue Ref #:</strong> ${data.ref}</p><p><strong>Batch ID:</strong> ${data.batchId}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>From Branch:</strong> ${fromBranch.name}</p><p><strong>To Section:</strong> ${toSection.name}</p><hr><h3>Items Issued</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Cost</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" align="right"><strong>Total Cost:</strong></td><td><strong>${totalValue.toFixed(2)}</strong></td></tr></tfoot></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Issued By:</strong> _________________</p><p><strong>Received By:</strong> _________________</p></div>`; printContent(content); };
    const generatePaymentVoucher = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; let invoicesHtml = ''; data.payments.forEach(p => { invoicesHtml += `<tr><td>${p.invoiceNumber}</td><td>${p.amount.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card"><h2>Payment Voucher</h2><p><strong>Voucher ID:</strong> ${data.payments[0].paymentId}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>Paid To:</strong> ${supplier.name}</p><p><strong>Amount:</strong> ${data.totalAmount.toFixed(2)} EGP</p><p><strong>Method:</strong> ${data.method}</p><hr><h3>Payment Allocation</h3><table><thead><tr><th>Invoice #</th><th>Amount Paid</th></tr></thead><tbody>${invoicesHtml}</tbody></table><br><p><strong>Signature:</strong> _________________</p></div>`; printContent(content); };
    // PART 4 OF 4: CALCULATION ENGINES, EVENT LISTENERS & INITIALIZATION
    function updateReceiveGrandTotal() { let grandTotal = 0; state.currentReceiveList.forEach(item => { grandTotal += (item.quantity || 0) * (item.cost || 0); }); document.getElementById('receive-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
    function updateReturnGrandTotal() { let grandTotal = 0; state.currentReturnList.forEach(item => { grandTotal += (item.quantity || 0) * (item.cost || 0); }); document.getElementById('return-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
    function updateTransferGrandTotal() { let grandTotalQty = 0; state.currentTransferList.forEach(item => { grandTotalQty += item.quantity || 0; }); document.getElementById('transfer-grand-total').textContent = grandTotalQty.toFixed(2); }
    function updateIssueGrandTotal() { let grandTotalQty = 0; state.currentIssueList.forEach(item => { grandTotalQty += item.quantity || 0; }); document.getElementById('issue-grand-total').textContent = grandTotalQty.toFixed(2); }
    async function handleTransactionSubmit(payload, buttonEl) { const result = await postData('addTransactionBatch', payload, buttonEl); if (result) { showToast(`${payload.type.replace(/_/g,' ').toUpperCase()} processed!`, 'success'); let docGenData = result.data; docGenData.items = docGenData.items.map(i => ({...i, itemName: findByKey(state.items, 'code', i.itemCode)?.name })); if (payload.type === 'receive' || payload.type === 'return_to_supplier') { generateReceiveDocument(docGenData); state.currentReceiveList = []; state.currentReturnList = []; document.getElementById('form-receive-details').reset(); document.getElementById('form-return-details').reset(); } else if (payload.type === 'transfer_out') { generateTransferDocument(docGenData); state.currentTransferList = []; document.getElementById('form-transfer-details').reset(); document.getElementById('transfer-ref').value = generateId('TRN'); } else if (payload.type === 'issue') { generateIssueDocument(docGenData); state.currentIssueList = []; document.getElementById('form-issue-details').reset(); document.getElementById('issue-ref').value = generateId('ISN'); } await reloadDataAndRefreshUI(); } }
    const findByKey = (array, key, value) => (array || []).find(el => String(el?.[key]) === String(value));
    const generateId = (prefix) => `${prefix}-${Date.now()}`;
    const printContent = (content) => { document.getElementById('print-area').innerHTML = content; setTimeout(() => window.print(), 100); };
    const exportToExcel = (tableId, filename) => { try { const table = document.getElementById(tableId); if (!table) { showToast('Please generate a report first.', 'error'); return; } const wb = XLSX.utils.table_to_book(table, {sheet: "Sheet1"}); XLSX.writeFile(wb, filename); showToast('Exporting to Excel...', 'success'); } catch (err) { showToast('Excel export failed.', 'error'); Logger.error('Export Error:', err); } };
    const calculateStockLevels = () => { const stock = {}; (state.branches || []).forEach(branch => { stock[branch.branchCode] = {}; }); const sortedTransactions = [...(state.transactions || [])].sort((a, b) => new Date(a.date) - new Date(b.date)); sortedTransactions.forEach(t => { const item = findByKey(state.items, 'code', t.itemCode); if (!item) return; const changeStock = (branchCode, qty, cost) => { if (!branchCode || !stock[branchCode]) return; const s = stock[branchCode][t.itemCode] || { quantity: 0, avgCost: 0, itemName: item.name, category: item.category }; if (qty > 0) { const totalValue = (s.quantity * s.avgCost) + (qty * cost); const totalQty = s.quantity + qty; s.avgCost = totalQty > 0 ? totalValue / totalQty : 0; } s.quantity += qty; stock[branchCode][t.itemCode] = s; }; switch (t.type) { case 'receive': changeStock(t.branchCode, t.quantity, t.cost); break; case 'transfer_in': changeStock(t.toBranchCode, t.quantity, t.cost); break; case 'transfer_out': changeStock(t.fromBranchCode, -t.quantity, null); break; case 'issue': changeStock(t.fromBranchCode, -t.quantity, null); break; case 'return_to_supplier': changeStock(t.branchCode, t.quantity, t.cost); break; } }); return stock; };
    const calculateSupplierFinancials = () => { const financials = {}; state.suppliers.forEach(s => { financials[s.supplierCode] = { supplierCode: s.supplierCode, supplierName: s.name, totalBilled: 0, totalPaid: 0, balance: 0, invoices: {}, events: [] }; }); state.transactions.forEach(t => { if (!t.supplierCode || !financials[t.supplierCode]) return; const val = t.quantity * t.cost; if (t.type === 'receive' || t.type === 'return_to_supplier') { financials[t.supplierCode].totalBilled += val; if (!financials[t.supplierCode].invoices[t.invoiceNumber]) { financials[t.supplierCode].invoices[t.invoiceNumber] = { number: t.invoiceNumber, date: t.date, total: 0, paid: 0 }; } financials[t.supplierCode].invoices[t.invoiceNumber].total += val; } }); state.payments.forEach(p => { if (financials[p.supplierCode]) { financials[p.supplierCode].totalPaid += p.amount; if (p.invoiceNumber && financials[p.supplierCode].invoices[p.invoiceNumber]) { financials[p.supplierCode].invoices[p.invoiceNumber].paid += p.amount; } } }); Object.values(financials).forEach(s => { s.balance = s.totalBilled - s.totalPaid; const invoiceEvents = []; Object.values(s.invoices).forEach(inv => { inv.balance = inv.total - inv.paid; if (Math.abs(inv.balance) < 0.01) { inv.status = 'Paid'; } else if (inv.paid > 0 || (inv.total < s.totalBilled && inv.paid === 0)) { inv.status = 'Partial'; } else { inv.status = 'Unpaid'; } if (inv.total > 0) invoiceEvents.push({ date: inv.date, type: 'Invoice', ref: inv.number, debit: inv.total, credit: 0 }); else if (inv.total < 0) invoiceEvents.push({ date: inv.date, type: 'Credit Note', ref: inv.number, debit: 0, credit: -inv.total }); }); const paymentEvents = state.payments.filter(p => p.supplierCode === s.supplierCode).map(p => ({ date: p.date, type: 'Payment', ref: p.invoiceNumber || 'On Account', debit: 0, credit: p.amount })); s.events = [...invoiceEvents, ...paymentEvents].sort((a,b) => new Date(a.date) - new Date(b.date)); }); financials.allInvoices = {}; Object.values(financials).forEach(s => { Object.assign(financials.allInvoices, s.invoices); }); return financials; };
    const populateOptions = (el, data, ph, valueKey, textKey) => { el.innerHTML = `<option value="">${ph}</option>`; (data || []).forEach(item => { el.innerHTML += `<option value="${item[valueKey]}">${item[textKey]}${item[valueKey] && item[valueKey] !== item[textKey] ? ' (' + item[valueKey] + ')' : ''}</option>`; }); };
        function getVisibleBranchesForCurrentUser() { if (!state.currentUser) return []; if (userCan('viewAllBranches')) { return state.branches; } if (state.currentUser.AssignedBranchCode) { return state.branches.filter(b => String(b.branchCode) === String(state.currentUser.AssignedBranchCode)); } return []; }
    function applyBranchUserUIConstraints() { const assignedBranchCode = String(state.currentUser.AssignedBranchCode); if (!assignedBranchCode) return; const elementsToUpdate = ['receive-branch', 'issue-from-branch', 'transfer-from-branch', 'return-branch', 'request-from-branch']; elementsToUpdate.forEach(id => { const el = document.getElementById(id); if (el) { el.value = assignedBranchCode; el.disabled = true; el.dispatchEvent(new Event('change')); } }); const branchStatementSelect = document.getElementById('branch-statement-select'); if (!userCan('viewAllBranches')) { branchStatementSelect.value = assignedBranchCode; branchStatementSelect.disabled = true; } else { branchStatementSelect.disabled = false; } }
    const refreshViewData = async (viewId) => { if (!state.currentUser) return; switch(viewId) { case 'dashboard': const stock = calculateStockLevels(); document.getElementById('dashboard-total-items').textContent = (state.items || []).length; document.getElementById('dashboard-total-suppliers').textContent = (state.suppliers || []).length; document.getElementById('dashboard-total-branches').textContent = (state.branches || []).length; let totalValue = 0; Object.values(stock).forEach(bs => Object.values(bs).forEach(i => totalValue += i.quantity * i.avgCost)); document.getElementById('dashboard-total-value').textContent = `${totalValue.toFixed(2)} EGP`; break; case 'setup': ['createItem', 'createSupplier', 'createBranch', 'createSection'].forEach(p => { const form = document.getElementById(`form-add-${p.replace('create','').toLowerCase()}`); if(form) form.parentElement.style.display = userCan(p) ? 'block' : 'none'; }); populateOptions(document.getElementById('item-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name'); break; case 'master-data': ['items', 'suppliers', 'branches', 'sections', 'price-history'].forEach(sv => { const canView = userCan(`edit${sv.charAt(0).toUpperCase() + sv.slice(1)}`) || (sv === 'price-history' && userCan('viewPriceHistory')); document.querySelector(`[data-subview="${sv}"]`).style.display = canView ? 'inline-block' : 'none'; }); renderItemsTable(); renderSuppliersTable(); renderBranchesTable(); renderSectionsTable(); renderPriceHistoryTable(); document.querySelector('#view-master-data .sub-nav-item[style*="inline-block"]')?.click(); break; case 'operations': ['receive', 'issue', 'transfer', 'return'].forEach(op => { document.querySelector(`[data-subview="${op}"]`).style.display = userCan(`op${op.charAt(0).toUpperCase() + op.slice(1)}`) || (op ==='return' && userCan('opReturnToSupplier')) ? 'inline-block' : 'none'; }); populateOptions(document.getElementById('receive-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name'); populateOptions(document.getElementById('return-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name'); ['receive-branch', 'transfer-from-branch', 'transfer-to-branch', 'issue-from-branch', 'return-branch'].forEach(id => populateOptions(document.getElementById(id), state.branches, 'Select Branch', 'branchCode', 'name')); populateOptions(document.getElementById('issue-to-section'), state.sections, 'Select Destination', 'sectionCode', 'name'); ['issue-ref', 'transfer-ref'].forEach(id => document.getElementById(id).value = generateId(id.split('-')[0].toUpperCase())); renderReceiveListTable(); renderIssueListTable(); renderTransferListTable(); renderReturnListTable(); renderPendingTransfers(); renderInTransitReport(); document.querySelector('#view-operations .sub-nav-item:not([style*="display: none"])')?.click(); break; case 'payments': populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, 'Select Supplier', 'supplierCode', 'name'); renderPaymentList(); break; case 'financials': populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, 'Select a Supplier', 'supplierCode', 'name'); populateOptions(document.getElementById('branch-statement-select'), getVisibleBranchesForCurrentUser(), 'Select a Branch', 'branchCode', 'name'); populateOptions(document.getElementById('section-statement-select'), state.sections, 'Select a Section', 'sectionCode', 'name'); document.querySelector('#view-financials .sub-nav-item').click(); break; case 'requests': document.querySelector('[data-subview="make-request"]').style.display = userCan('createOrderRequest') ? 'inline-block' : 'none'; document.querySelector('[data-subview="review-requests"]').style.display = userCan('manageOrderRequests') ? 'inline-block' : 'none'; populateOptions(document.getElementById('request-from-branch'), state.branches, 'Select Branch', 'branchCode', 'name'); renderRequestItemsTable(); renderOrderRequestsTable(); document.querySelector('#view-requests .sub-nav-item[style*="inline-block"]')?.click(); break; case 'reports': populateOptions(document.getElementById('consumption-branch-select'), getVisibleBranchesForCurrentUser(), 'All Branches', 'branchCode', 'name'); populateOptions(document.getElementById('consumption-section-select'), state.sections, 'All Sections', 'sectionCode', 'name'); const categories = [...new Set(state.items.map(i => i.category).filter(Boolean))]; populateOptions(document.getElementById('consumption-category-select'), categories.map(c => ({val:c, txt:c})), 'All Categories', 'val', 'txt'); break; case 'stock-levels': document.getElementById('stock-levels-title').textContent = userCan('viewAllBranches') ? 'Stock by Item (All Branches)' : 'Stock by Item (Your Branch)'; renderItemCentricStockView(); document.getElementById('item-inquiry-search').value = ''; renderItemInquiry(''); document.getElementById('stock-levels-search').value = ''; break; case 'transaction-history': renderTransactionHistory(); break; case 'activity-log': renderActivityLog(); break; case 'user-management': if(userCan('manageUsers')) { const result = await postData('getAllUsersAndRoles', {}, null); if (result) { state.allUsers = result.data.users; state.allRoles = result.data.roles; renderUserManagementUI(); } } break; } if (state.currentUser.AssignedBranchCode) applyBranchUserUIConstraints(); };
    async function reloadDataAndRefreshUI() { Logger.info('Reloading data...'); const { username, loginCode } = state; if (!username || !loginCode) { logout(); return; } const currentView = document.querySelector('#main-nav a.active')?.dataset.view || 'dashboard'; try { const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`); if (!response.ok) throw new Error('Failed to reload data.'); const data = await response.json(); if (data.status === 'error') throw new Error(data.message); Object.keys(data).forEach(key => { if(key !== 'user') state[key] = data[key] || state[key]; }); updateUserBranchDisplay(); await refreshViewData(currentView); Logger.info('Reload complete.'); } catch (err) { Logger.error('Data reload failed:', err); showToast('Could not refresh data. Please log in again.', 'error'); setTimeout(logout, 2000); } }
    function renderUserManagementUI() { const usersTbody = document.getElementById('table-users').querySelector('tbody'); usersTbody.innerHTML = ''; state.allUsers.forEach(user => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${user.Username}</td><td>${user.Name}</td><td>${user.RoleName}</td><td>${findByKey(state.branches, 'branchCode', user.AssignedBranchCode)?.name || 'N/A'}</td><td><button class="secondary small btn-edit" data-type="user" data-id="${user.Username}">Edit</button></td>`; usersTbody.appendChild(tr); }); const rolesTbody = document.getElementById('table-roles').querySelector('tbody'); rolesTbody.innerHTML = ''; state.allRoles.forEach(role => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${role.RoleName}</td><td><button class="secondary small btn-edit" data-type="role" data-id="${role.RoleName}">Edit</button></td>`; rolesTbody.appendChild(tr); }); }
    function renderPendingTransfers() { const container = document.getElementById('pending-transfers-card'); const tbody = document.getElementById('table-pending-transfers').querySelector('tbody'); const groupedTransfers = {}; state.transactions.filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => { if (!groupedTransfers[t.batchId]) { groupedTransfers[t.batchId] = { ...t, items: [] }; } groupedTransfers[t.batchId].items.push(t); }); const visibleTransfers = Object.values(groupedTransfers).filter(t => userCan('viewAllBranches') || t.toBranchCode === state.currentUser.AssignedBranchCode); tbody.innerHTML = ''; if (visibleTransfers.length === 0) { container.style.display = 'none'; return; } visibleTransfers.forEach(t => { const tr = document.createElement('tr'); const fromBranch = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name || t.fromBranchCode; tr.innerHTML = `<td>${new Date(t.date).toLocaleString()}</td><td>${fromBranch}</td><td>${t.ref}</td><td>${t.items.length}</td><td><button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">Receive</button></td>`; tbody.appendChild(tr); }); container.style.display = 'block'; }
    function renderInTransitReport() { const tbody = document.getElementById('table-in-transit').querySelector('tbody'); const groupedTransfers = {}; state.transactions.filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => { if (!groupedTransfers[t.batchId]) { groupedTransfers[t.batchId] = { ...t, items: [] }; } groupedTransfers[t.batchId].items.push(t); }); const visibleTransfers = Object.values(groupedTransfers).filter(t => userCan('viewAllBranches') || t.toBranchCode === state.currentUser.AssignedBranchCode || t.fromBranchCode === state.currentUser.AssignedBranchCode); tbody.innerHTML = ''; visibleTransfers.forEach(t => { const tr = document.createElement('tr'); const fromBranch = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name || t.fromBranchCode; const toBranch = findByKey(state.branches, 'branchCode', t.toBranchCode)?.name || t.toBranchCode; const canManage = userCan('viewAllBranches') || t.fromBranchCode === state.currentUser.AssignedBranchCode; const actions = canManage ? `<div class="action-buttons"><button class="danger small btn-cancel-transfer" data-batch-id="${t.batchId}">Cancel</button></div>` : 'N/A'; tr.innerHTML = `<td>${new Date(t.date).toLocaleString()}</td><td>${fromBranch}</td><td>${toBranch}</td><td>${t.ref}</td><td>${t.items.length}</td><td><span class="status-tag status-partial">In Transit</span></td><td>${actions}</td>`; tbody.appendChild(tr); }); }
    function renderOrderRequestsTable() { const tbody = document.getElementById('table-review-requests').querySelector('tbody'); tbody.innerHTML = ''; state.orderRequests.slice().reverse().forEach(req => { const tr = document.createElement('tr'); tr.className = `status-${req.Status}`; tr.innerHTML = `<td>${new Date(req.date).toLocaleString()}</td><td>${req.requestId}</td><td>${findByKey(state.branches, 'branchCode', req.fromBranch)?.name || req.fromBranch}</td><td><span class="status-tag status-${req.Status.toLowerCase()}">${req.Status}</span></td><td>${req.items.length}</td><td><button class="secondary small btn-review-request" data-req-id="${req.requestId}">View/Edit</button></td>`; tbody.appendChild(tr); }); }
    function setupSearch(inputId, renderFn, dataKey, searchKeys) { const searchInput = document.getElementById(inputId); if (!searchInput) return; searchInput.addEventListener('input', e => { const searchTerm = e.target.value.toLowerCase(); const dataToFilter = state[dataKey] || []; renderFn(searchTerm ? dataToFilter.filter(item => searchKeys.some(key => item[key] && String(item[key]).toLowerCase().includes(searchTerm))) : dataToFilter); }); }
    function attachSubNavListeners() { document.querySelectorAll('.sub-nav').forEach(nav => { nav.addEventListener('click', e => { if (!e.target.classList.contains('sub-nav-item')) return; const subviewId = e.target.dataset.subview; const parentView = e.target.closest('.view'); parentView.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active')); e.target.classList.add('active'); parentView.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active')); parentView.querySelector(`#subview-${subviewId}`).classList.add('active'); }); }); }
        function attachEventListeners() {
        btnLogout.addEventListener('click', logout);
        document.querySelectorAll('#main-nav a').forEach(link => {
            if (link.id !== 'btn-logout') link.addEventListener('click', e => {
                e.preventDefault();
                showView(link.dataset.view);
            });
        });

        // Modal open/close and generic interactions
        ['btn-show-receive-modal', 'btn-show-transfer-modal', 'btn-show-issue-modal', 'btn-show-return-modal', 'btn-show-request-modal'].forEach(id => document.getElementById(id)?.addEventListener('click', openItemSelectorModal));
        ['btn-close-item-selector-modal', 'btn-cancel-item-selector-modal', 'btn-close-invoice-modal', 'btn-cancel-invoice-modal', 'btn-close-edit-modal', 'btn-cancel-edit-modal', 'btn-close-view-transfer-modal', 'btn-cancel-view-transfer-modal', 'btn-close-request-review-modal'].forEach(id => document.getElementById(id)?.addEventListener('click', closeModal));
        document.getElementById('btn-confirm-modal-selection').addEventListener('click', confirmModalSelection);
        document.getElementById('modal-item-list').addEventListener('change', handleModalCheckboxChange);
        modalSearchInput.addEventListener('input', e => renderItemsInModal(e.target.value));

        // Edit/Delete listeners in tables
        ['view-master-data', 'view-user-management'].forEach(v => document.getElementById(v).addEventListener('click', e => { if (e.target.classList.contains('btn-edit')) { openEditModal(e.target.dataset.type, e.target.dataset.id); } }));
        editModal.addEventListener('click', async e => {
            const btn = e.target;
            const type = formEditRecord.dataset.type;
            const id = formEditRecord.dataset.id;
            if(!id || !type) return;
            if(btn.id === 'btn-delete-user') {
                if(confirm(`Are you sure you want to delete user '${id}'? This cannot be undone.`)) {
                    const result = await postData('deleteUser', { username: id }, btn);
                    if(result) { showToast(`User ${id} deleted.`, 'success'); closeModal(); await reloadDataAndRefreshUI(); }
                }
            } else if (btn.id === 'btn-delete-role') {
                 if(confirm(`Are you sure you want to delete role '${id}'? This cannot be undone.`)) {
                    const result = await postData('deleteRole', { roleName: id }, btn);
                    if(result) { showToast(`Role ${id} deleted.`, 'success'); closeModal(); await reloadDataAndRefreshUI(); }
                }
            }
        });

        // Form Submissions
        formEditRecord.addEventListener('submit', handleUpdateSubmit);
        document.getElementById('form-add-item').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { code: document.getElementById('item-code').value, name: document.getElementById('item-name').value, barcode: document.getElementById('item-barcode').value, category: document.getElementById('item-category').value, unit: document.getElementById('item-unit').value, supplierCode: document.getElementById('item-supplier').value, cost: parseFloat(document.getElementById('item-cost').value) }; const result = await postData('addItem', data, btn); if (result) { showToast('Item added!', 'success'); e.target.reset(); reloadDataAndRefreshUI(); } });
        ['supplier', 'branch', 'section'].forEach(type => { document.getElementById(`form-add-${type}`).addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = {}; new FormData(e.target).forEach((val, key) => data[key.split('-')[1]] = val); data[`${type}Code`] = document.getElementById(`${type}-code`).value; const result = await postData(`add${type.charAt(0).toUpperCase() + type.slice(1)}`, data, btn); if (result) { showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} added!`, 'success'); e.target.reset(); reloadDataAndRefreshUI(); } }); });
        document.getElementById('form-record-payment').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const supplierCode = document.getElementById('payment-supplier-select').value; const method = document.getElementById('payment-method').value; let totalAmount = 0; const payments = []; document.querySelectorAll('.payment-amount-input').forEach(input => { const amount = parseFloat(input.value); if (amount > 0) { totalAmount += amount; payments.push({ paymentId: generateId('PAY'), date: new Date().toISOString(), supplierCode: supplierCode, invoiceNumber: input.dataset.invoice, amount: amount, method: method }); } }); if(payments.length === 0) { showToast("No payment amounts entered.", 'error'); return; } const result = await postData('addPaymentBatch', { payments, totalAmount, supplierCode, date: new Date().toISOString(), method }, btn); if (result) { showToast(`${payments.length} payment(s) recorded!`, 'success'); generatePaymentVoucher(result.data); e.target.reset(); state.invoiceModalSelections.clear(); renderPaymentList(); reloadDataAndRefreshUI(); } });
        document.getElementById('btn-submit-receive-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('receive-supplier').value; const branchCode = document.getElementById('receive-branch').value; const invoiceNumber = document.getElementById('receive-invoice').value; const notes = document.getElementById('receive-notes').value; if (!supplierCode || !branchCode || !invoiceNumber || state.currentReceiveList.length === 0) { showToast('Please fill all required fields and add items.', 'error'); return; } const payload = { type: 'receive', batchId: `GRN-${invoiceNumber || Date.now()}`, supplierCode, branchCode, invoiceNumber, date: new Date().toISOString(), items: state.currentReceiveList, notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-return-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('return-supplier').value; const branchCode = document.getElementById('return-branch').value; const invoiceNumber = document.getElementById('return-invoice').value; const notes = document.getElementById('return-notes').value; if (!supplierCode || !branchCode || state.currentReturnList.length === 0) { showToast('Please fill all required fields and add items.', 'error'); return; } const payload = { type: 'return_to_supplier', batchId: `RTN-${invoiceNumber || Date.now()}`, supplierCode, branchCode, invoiceNumber, date: new Date().toISOString(), items: state.currentReturnList, notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-transfer-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; const fromBranchCode = document.getElementById('transfer-from-branch').value, toBranchCode = document.getElementById('transfer-to-branch').value, notes = document.getElementById('transfer-notes').value, ref = document.getElementById('transfer-ref').value; if (!fromBranchCode || !toBranchCode || fromBranchCode === toBranchCode || state.currentTransferList.length === 0) { showToast('Please select valid branches and add at least one item.', 'error'); return; } const stock = calculateStockLevels(); const itemsWithCost = state.currentTransferList.map(item => ({...item, cost: stock[fromBranchCode]?.[item.itemCode]?.avgCost || 0 })); const payload = { type: 'transfer_out', batchId: ref, fromBranchCode, toBranchCode, ref, date: new Date().toISOString(), items: itemsWithCost, notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-issue-batch').addEventListener('click', async(e) => { const btn = e.currentTarget; const fromBranchCode = document.getElementById('issue-from-branch').value, sectionCode = document.getElementById('issue-to-section').value, ref = document.getElementById('issue-ref').value, notes = document.getElementById('issue-notes').value; if (!fromBranchCode || !sectionCode || !ref || state.currentIssueList.length === 0) { showToast('Please fill all issue details and select at least one item.', 'error'); return; } const stock = calculateStockLevels(); const itemsWithCost = state.currentIssueList.map(item => ({...item, cost: stock[fromBranchCode]?.[item.itemCode]?.avgCost || 0 })); const payload = { type: 'issue', batchId: ref, fromBranchCode, sectionCode, ref, date: new Date().toISOString(), items: itemsWithCost, notes }; await handleTransactionSubmit(payload, btn); });
        
        // Input listeners for dynamic tables
        document.getElementById('table-receive-list').addEventListener('input', e => { if (e.target.classList.contains('table-input')) { const index = e.target.dataset.index; state.currentReceiveList[index][e.target.dataset.field] = parseFloat(e.target.value); const item = state.currentReceiveList[index]; document.getElementById(`total-cost-${index}`).textContent = `${(item.quantity * item.cost).toFixed(2)} EGP`; updateReceiveGrandTotal(); } });
        document.getElementById('table-receive-list').addEventListener('click', e => { if (e.target.classList.contains('danger')) { state.currentReceiveList.splice(e.target.dataset.index, 1); renderReceiveListTable(); } });
        document.getElementById('table-return-list').addEventListener('input', e => { if (e.target.classList.contains('table-input')) { const index = e.target.dataset.index; state.currentReturnList[index][e.target.dataset.field] = parseFloat(e.target.value); const item = state.currentReturnList[index]; document.getElementById(`total-return-cost-${index}`).textContent = `${(item.quantity * item.cost).toFixed(2)} EGP`; updateReturnGrandTotal(); } });
        document.getElementById('table-return-list').addEventListener('click', e => { if (e.target.classList.contains('danger')) { state.currentReturnList.splice(e.target.dataset.index, 1); renderReturnListTable(); } });
        document.getElementById('table-transfer-list').addEventListener('input', e => { if (e.target.classList.contains('table-input')) { state.currentTransferList[e.target.dataset.index][e.target.dataset.field] = parseFloat(e.target.value) || 0; updateTransferGrandTotal(); } });
        document.getElementById('table-transfer-list').addEventListener('click', e => { if (e.target.classList.contains('danger')) { state.currentTransferList.splice(e.target.dataset.index, 1); renderTransferListTable(); } });
        document.getElementById('transfer-from-branch').addEventListener('change', renderTransferListTable);
        document.getElementById('table-issue-list').addEventListener('input', e => { if (e.target.classList.contains('table-input')) { state.currentIssueList[e.target.dataset.index][e.target.dataset.field] = parseFloat(e.target.value) || 0; updateIssueGrandTotal(); } });
        document.getElementById('table-issue-list').addEventListener('click', e => { if (e.target.classList.contains('danger')) { state.currentIssueList.splice(e.target.dataset.index, 1); renderIssueListTable(); } });
        document.getElementById('issue-from-branch').addEventListener('change', renderIssueListTable);

        // Report generation
        ['supplier', 'branch', 'section'].forEach(type => document.getElementById(`btn-generate-${type}-statement`).addEventListener('click', () => { const code = document.getElementById(`${type}-statement-select`).value; if (!code) { showToast(`Please select a ${type}.`, 'error'); return; } const startDate = document.getElementById(`${type}-statement-start-date`).value; const endDate = document.getElementById(`${type}-statement-end-date`).value; if (startDate && endDate && new Date(startDate) > new Date(endDate)) { showToast('Start date cannot be after end date.', 'error'); return; } window[`render${type.charAt(0).toUpperCase() + type.slice(1)}Statement`](code, startDate, endDate); }));
        ['supplier', 'branch', 'section'].forEach(type => document.getElementById(`btn-export-${type}-statement`).addEventListener('click', () => exportToExcel(`table-${type}-statement-report`, `${type}Statement.xlsx`)));
        document.getElementById('btn-generate-consumption-report').addEventListener('click', () => { const startDate = document.getElementById('consumption-start-date').value; const endDate = document.getElementById('consumption-end-date').value; if (startDate && endDate && new Date(startDate) > new Date(endDate)) { showToast('Start date cannot be after end date.', 'error'); return; } const branch = document.getElementById('consumption-branch-select').value; const section = document.getElementById('consumption-section-select').value; const category = document.getElementById('consumption-category-select').value; renderConsumptionReport(startDate, endDate, branch, section, category); });
        document.getElementById('btn-export-consumption-report').addEventListener('click', () => exportToExcel('table-consumption-report', 'ConsumptionReport.xlsx'));
        
        // Table search and export
        document.getElementById('item-inquiry-search').addEventListener('input', e => renderItemInquiry(e.target.value.toLowerCase()));
        document.getElementById('transaction-search').addEventListener('input', e => renderTransactionHistory(e.target.value));
        document.getElementById('table-transaction-history').addEventListener('click', e => { if (e.target.tagName === 'BUTTON' && e.target.dataset.batchId) { const batchId = e.target.dataset.batchId; const transactionGroup = state.transactions.filter(t => (t.batchId || t.ref || t.invoiceNumber) === batchId); if (transactionGroup.length > 0) { const first = transactionGroup[0]; const data = { ...first, items: transactionGroup.map(t => ({...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name })) }; if (first.type === 'receive' || first.type === 'return_to_supplier') generateReceiveDocument(data); else if (first.type.startsWith('transfer')) generateTransferDocument(data); else if (first.type === 'issue') generateIssueDocument(data); } } });
        ['items', 'suppliers', 'branches', 'sections'].forEach(type => document.getElementById(`btn-export-${type}`).addEventListener('click', () => exportToExcel(`table-${type}`, `${type}List.xlsx`)));
        document.getElementById('btn-export-stock').addEventListener('click', () => exportToExcel('table-stock-levels-by-item', 'StockLevels.xlsx'));
        
        // Transfer management
        document.getElementById('table-pending-transfers').addEventListener('click', e => { if (e.target.classList.contains('btn-receive-transfer')) { const batchId = e.target.dataset.batchId; openViewTransferModal(batchId); }});
        document.getElementById('btn-confirm-receive-transfer').addEventListener('click', async e => { const btn = e.currentTarget; const batchId = btn.dataset.batchId; const transfer = state.transactions.filter(t => t.batchId === batchId && t.type === 'transfer_out'); if (transfer.length > 0) { const first = transfer[0]; const payload = { originalBatchId: batchId, fromBranchCode: first.fromBranchCode, toBranchCode: first.toBranchCode, ref: first.ref, notes: `Received from transfer ${batchId}`, items: transfer.map(t => ({ itemCode: t.itemCode, quantity: t.quantity, cost: t.cost })) }; const result = await postData('receiveTransfer', payload, btn); if (result) { showToast(`Transfer ${batchId} received successfully!`, 'success'); closeModal(); await reloadDataAndRefreshUI(); } } });
        document.getElementById('subview-in-transit').addEventListener('click', async e => { if (e.target.classList.contains('btn-cancel-transfer')) { const btn = e.target; const batchId = btn.dataset.batchId; if (confirm(`Are you sure you want to cancel transfer ${batchId}?`)) { const result = await postData('cancelTransfer', { batchId }, btn); if (result) { showToast(`Transfer ${batchId} cancelled.`, 'success'); await reloadDataAndRefreshUI(); } } } });

        // User Management
        document.getElementById('btn-add-new-user').addEventListener('click', () => { openEditModal('user', null); });
        document.getElementById('btn-add-new-role').addEventListener('click', async () => { const roleName = prompt("Enter new role name:"); if(roleName) { const result = await postData('addRole', { RoleName: roleName }); if (result) { showToast("Role added!", 'success'); await reloadDataAndRefreshUI(); } } });
        
        // New Listeners for Request module
        document.getElementById('table-request-items').addEventListener('click', e => { if (e.target.classList.contains('danger')) { state.currentRequestList.splice(e.target.dataset.index, 1); renderRequestItemsTable(); } });
        document.getElementById('table-request-items').addEventListener('input', e => { if (e.target.classList.contains('table-input')) { state.currentRequestList[e.target.dataset.index][e.target.dataset.field] = parseFloat(e.target.value) || 0; } });
        document.getElementById('btn-submit-request-batch').addEventListener('click', async e => {
            const btn = e.target;
            const fromBranch = document.getElementById('request-from-branch').value;
            const notes = document.getElementById('request-notes').value;
            if(!fromBranch || state.currentRequestList.length === 0) { showToast('Please select a branch and add items.', 'error'); return; }
            const payload = {
                requestId: generateId('REQ'),
                fromBranch: fromBranch,
                notes: notes,
                requestedBy: state.currentUser.Name,
                items: state.currentRequestList.map(i => ({itemCode: i.itemCode, quantity: i.quantity}))
            };
            const result = await postData('createOrderRequest', payload, btn);
            if(result) {
                showToast('Request submitted successfully!', 'success');
                state.currentRequestList = [];
                document.getElementById('form-request-details').reset();
                renderRequestItemsTable();
                await reloadDataAndRefreshUI();
            }
        });
    }

    function setupRoleBasedNav() { const user = state.currentUser; if (!user) return; const userFirstName = user.Name.split(' ')[0]; document.querySelector('.sidebar-header h1').textContent = `Hi, ${userFirstName}`; const navItems = { dashboard: 'viewDashboard', requests: 'createOrderRequest', operations: 'viewOperations', payments: 'viewPayments', financials: 'viewFinancials', reports: 'viewReports', stock_levels: 'viewStockLevels', transaction_history: 'viewTransactionHistory', setup: 'viewSetup', master_data: 'viewMasterData', user_management: 'manageUsers', activity_log: 'viewActivityLog' }; Object.keys(navItems).forEach(key => { const perm = navItems[key]; const el = document.querySelector(`[data-view="${key.replace('_','-')}"]`)?.parentElement; if(el) el.style.display = userCan(perm) ? '' : 'none'; }); }
    function logout() { Logger.info('User logging out.'); location.reload(); }
    function initializeAppUI() { Logger.info('Application UI initializing...'); setupRoleBasedNav(); attachEventListeners(); attachSubNavListeners(); setupSearch('search-items', renderItemsTable, 'items', ['name', 'code', 'category']); setupSearch('search-suppliers', renderSuppliersTable, 'suppliers', ['name', 'supplierCode']); setupSearch('search-branches', renderBranchesTable, 'branches', ['name', 'branchCode']); setupSearch('search-sections', renderSectionsTable, 'sections', ['name', 'sectionCode']); setupSearch('search-price-history', (filteredData) => renderPriceHistoryTable(filteredData), 'priceHistory', ['ItemCode']); setupSearch('stock-levels-search', (filteredData) => renderItemCentricStockView(filteredData), 'items', ['name', 'code', 'category']); updateUserBranchDisplay(); const firstVisibleView = document.querySelector('#main-nav .nav-item:not([style*="display: none"]) a')?.dataset.view || 'dashboard'; showView(firstVisibleView); Logger.info('Application initialized successfully.'); }
    function updateUserBranchDisplay() { const displayEl = document.getElementById('user-branch-display'); if (!state.currentUser || !state.currentUser.AssignedBranchCode) { displayEl.style.display = 'none'; return; } const branch = findByKey(state.branches, 'branchCode', state.currentUser.AssignedBranchCode); if (branch) { displayEl.textContent = `Branch: ${branch.name}`; displayEl.style.display = 'inline-block'; } else { displayEl.style.display = 'none'; } }
    async function init() { loginContainer.style.display = 'flex'; appContainer.style.display = 'none'; loginForm.addEventListener('submit', (e) => { e.preventDefault(); const username = loginUsernameInput.value.trim(); const code = loginCodeInput.value; if (username && code) { attemptLogin(username, code); } }); }
    init();
});
