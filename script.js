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
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxvX_sYOa-K-578QP_MVLCz0oE8rKzq8geqmS4VClBcvVOv66U7qym5CAyRSN8_BSd6/exec';

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
        currentReceiveList: [],
        currentTransferList: [],
        currentIssueList: [],
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
        setButtonLoading(true, buttonEl);
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
            setButtonLoading(false, buttonEl);
        }
    }
        // PART 2 OF 4: MODAL & UI LOGIC
    function openItemSelectorModal() {
        let currentList;
        if (document.getElementById('subview-receive').classList.contains('active')) {
            modalContext = 'receive';
            currentList = state.currentReceiveList;
        } else if (document.getElementById('subview-transfer').classList.contains('active')) {
            modalContext = 'transfer';
            currentList = state.currentTransferList;
        } else if (document.getElementById('subview-issue').classList.contains('active')) {
            modalContext = 'issue';
            currentList = state.currentIssueList;
        }
        state.modalSelections = new Set(currentList.map(item => item.itemCode));
        renderItemsInModal();
        itemSelectorModal.classList.add('active');
    }

    function openInvoiceSelectorModal() {
        modalContext = 'invoices';
        renderInvoicesInModal();
        invoiceSelectorModal.classList.add('active');
    }

    function closeModal() {
        itemSelectorModal.classList.remove('active');
        invoiceSelectorModal.classList.remove('active');
        editModal.classList.remove('active');
        viewTransferModal.classList.remove('active');
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
        formEditRecord.dataset.id = id;
        switch (type) {
            case 'item':
                record = findByKey(state.items, 'code', id);
                if (!record) return;
                editModalTitle.textContent = 'Edit Item';
                formHtml = `<div class="form-grid"><div class="form-group"><label>Item Code</label><input type="text" value="${record.code}" readonly></div><div class="form-group"><label for="edit-item-barcode">Barcode</label><input type="text" id="edit-item-barcode" name="barcode" value="${record.barcode || ''}"></div><div class="form-group"><label for="edit-item-name">Item Name</label><input type="text" id="edit-item-name" name="name" value="${record.name}" required></div><div class="form-group"><label for="edit-item-unit">Unit</label><input type="text" id="edit-item-unit" name="unit" value="${record.unit}" required></div><div class="form-group"><label for="edit-item-supplier">Default Supplier</label><select id="edit-item-supplier" name="supplierCode"></select></div><div class="form-group"><label for="edit-item-cost">Default Cost</label><input type="number" id="edit-item-cost" name="cost" step="0.01" min="0" value="${record.cost}" required></div></div>`;
                editModalBody.innerHTML = formHtml;
                const supplierSelect = document.getElementById('edit-item-supplier');
                populateOptions(supplierSelect, state.suppliers, 'Select Supplier', 'supplierCode', 'name');
                supplierSelect.value = record.supplierCode;
                break;
            case 'supplier':
                record = findByKey(state.suppliers, 'supplierCode', id);
                if (!record) return;
                editModalTitle.textContent = 'Edit Supplier';
                formHtml = `<div class="form-grid"><div class="form-group"><label>Supplier Code</label><input type="text" value="${record.supplierCode}" readonly></div><div class="form-group"><label for="edit-supplier-name">Supplier Name</label><input type="text" id="edit-supplier-name" name="name" value="${record.name}" required></div><div class="form-group"><label for="edit-supplier-contact">Contact Info</label><input type="text" id="edit-supplier-contact" name="contact" value="${record.contact || ''}"></div></div>`;
                editModalBody.innerHTML = formHtml;
                break;
            case 'branch':
                record = findByKey(state.branches, 'branchCode', id);
                if (!record) return;
                editModalTitle.textContent = 'Edit Branch';
                formHtml = `<div class="form-grid"><div class="form-group"><label>Branch Code</label><input type="text" value="${record.branchCode}" readonly></div><div class="form-group"><label for="edit-branch-name">Branch Name</label><input type="text" id="edit-branch-name" name="name" value="${record.name}" required></div></div>`;
                editModalBody.innerHTML = formHtml;
                break;
            case 'section':
                record = findByKey(state.sections, 'sectionCode', id);
                if (!record) return;
                editModalTitle.textContent = 'Edit Section';
                formHtml = `<div class="form-grid"><div class="form-group"><label>Section Code</label><input type="text" value="${record.sectionCode}" readonly></div><div class="form-group"><label for="edit-section-name">Section Name</label><input type="text" id="edit-section-name" name="name" value="${record.name}" required></div></div>`;
                editModalBody.innerHTML = formHtml;
                break;
            case 'user':
                record = findByKey(state.allUsers, 'Username', id);
                if (!record) return;
                editModalTitle.textContent = 'Edit User';
                const roleOptions = state.allRoles.map(r => `<option value="${r.RoleName}" ${r.RoleName === record.RoleName ? 'selected' : ''}>${r.RoleName}</option>`).join('');
                const branchOptions = state.branches.map(b => `<option value="${b.branchCode}" ${b.branchCode === record.AssignedBranchCode ? 'selected' : ''}>${b.name}</option>`).join('');
                formHtml = `<div class="form-grid"><div class="form-group"><label>Username</label><input type="text" value="${record.Username}" readonly></div><div class="form-group"><label for="edit-user-name">Full Name</label><input type="text" id="edit-user-name" name="Name" value="${record.Name}" required></div><div class="form-group"><label for="edit-user-role">Role</label><select id="edit-user-role" name="RoleName" required>${roleOptions}</select></div><div class="form-group"><label for="edit-user-branch">Assigned Branch (if applicable)</label><select id="edit-user-branch" name="AssignedBranchCode"><option value="">None</option>${branchOptions}</select></div><div class="form-group span-full"><label for="edit-user-password">New Password (leave blank to keep unchanged)</label><input type="password" id="edit-user-password" name="LoginCode"></div><div class="form-group span-full"><button type="button" id="btn-delete-user" class="danger">Delete User</button></div></div>`;
                editModalBody.innerHTML = formHtml;
                break;
            case 'role':
                record = findByKey(state.allRoles, 'RoleName', id);
                if (!record) return;
                editModalTitle.textContent = `Edit Permissions for ${record.RoleName}`;
                const permissionKeys = Object.keys(state.allRoles[0] || {}).filter(key => key !== 'RoleName');
                const permissionCategories = {
                    'General Access': ['manageUsers', 'viewDashboard', 'viewActivityLog'],
                    'Operations': ['viewOperations', 'opReceive', 'opIssue', 'opTransfer'],
                    'Financials & Payments': ['viewPayments', 'viewFinancials', 'opRecordPayment'],
                    'Data Management': ['viewSetup', 'viewMasterData', 'createItem', 'editItem', 'createSupplier', 'editSupplier', 'createBranch', 'editBranch', 'createSection', 'editSection'],
                    'Reporting': ['viewStockLevels', 'viewTransactionHistory', 'viewAllBranches']
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
            action = 'updateUser';
            const updates = {};
            for (let [key, value] of formData.entries()) {
                if (key === 'LoginCode' && value === '') continue;
                updates[key] = value;
            }
            payload = {
                Username: id,
                updates: updates
            };
        } else if (type === 'role') {
            action = 'updateRolePermissions';
            const updates = {};
            const allPerms = Object.keys(findByKey(state.allRoles, 'RoleName', id));
            allPerms.forEach(key => {
                if (key !== 'RoleName') {
                    updates[key] = formData.has(key);
                }
            });
            payload = {
                RoleName: id,
                updates: updates
            };
        } else {
            action = 'updateData';
            const updates = {};
            for (let [key, value] of formData.entries()) {
                updates[key] = value;
            }
            payload = {
                type,
                id,
                updates
            };
        }
        const result = await postData(action, payload, btn);
        if (result) {
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`, 'success');
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
            itemDiv.innerHTML = `<input type="checkbox" id="modal-item-${item.code}" data-code="${item.code}" ${isChecked ? 'checked' : ''}><label for="modal-item-${item.code}"><strong>${item.name}</strong><br><small style="color:var(--text-light-color)">Code: ${item.code} | Barcode: ${item.barcode || 'N/A'}</small></label>`;
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

    function handleModalCheckboxChange(e) {
        if (e.target.type === 'checkbox') {
            const itemCode = e.target.dataset.code;
            if (e.target.checked) {
                state.modalSelections.add(itemCode);
            } else {
                state.modalSelections.delete(itemCode);
            }
        }
    }

    function handleInvoiceModalCheckboxChange(e) {
        if (e.target.type === 'checkbox') {
            const invoiceNumber = e.target.dataset.number;
            if (e.target.checked) {
                state.invoiceModalSelections.add(invoiceNumber);
            } else {
                state.invoiceModalSelections.delete(invoiceNumber);
            }
        }
    }

    function renderPaymentList() {
        const supplierCode = document.getElementById('payment-supplier-select').value;
        const container = document.getElementById('payment-invoice-list-container');
        if (!supplierCode) {
            container.style.display = 'none';
            return;
        }
        const supplierInvoices = calculateSupplierFinancials()[supplierCode]?.invoices;
        const tableBody = document.getElementById('table-payment-list').querySelector('tbody');
        tableBody.innerHTML = '';
        let total = 0;
        if (state.invoiceModalSelections.size === 0) {
            container.style.display = 'none';
            return;
        }
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

    function handlePaymentInputChange() {
        let total = 0;
        document.querySelectorAll('.payment-amount-input').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        document.getElementById('payment-total-amount').textContent = `${total.toFixed(2)} EGP`;
    }

    function confirmModalSelection() {
        const selectedCodes = state.modalSelections;
        switch (modalContext) {
            case 'invoices':
                renderPaymentList();
                break;
            case 'receive':
                const newReceiveList = [];
                selectedCodes.forEach(code => {
                    const existing = state.currentReceiveList.find(i => i.itemCode === code);
                    if (existing) {
                        newReceiveList.push(existing);
                    } else {
                        const item = findByKey(state.items, 'code', code);
                        if (item) newReceiveList.push({
                            itemCode: item.code,
                            itemName: item.name,
                            quantity: 1,
                            cost: item.cost
                        });
                    }
                });
                state.currentReceiveList = newReceiveList;
                renderReceiveListTable();
                break;
            case 'transfer':
                const newTransferList = [];
                selectedCodes.forEach(code => {
                    const existing = state.currentTransferList.find(i => i.itemCode === code);
                    if (existing) {
                        newTransferList.push(existing);
                    } else {
                        const item = findByKey(state.items, 'code', code);
                        if (item) newTransferList.push({
                            itemCode: item.code,
                            itemName: item.name,
                            quantity: 1
                        });
                    }
                });
                state.currentTransferList = newTransferList;
                renderTransferListTable();
                break;
            case 'issue':
                const newIssueList = [];
                selectedCodes.forEach(code => {
                    const existing = state.currentIssueList.find(i => i.itemCode === code);
                    if (existing) {
                        newIssueList.push(existing);
                    } else {
                        const item = findByKey(state.items, 'code', code);
                        if (item) newIssueList.push({
                            itemCode: item.code,
                            itemName: item.name,
                            quantity: 1
                        });
                    }
                });
                state.currentIssueList = newIssueList;
                renderIssueListTable();
                break;
        }
        closeModal();
    }

    function showView(viewId) {
        Logger.info(`Switching view to: ${viewId}`);
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('#main-nav a').forEach(link => link.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.add('active');
        const activeLink = document.querySelector(`[data-view="${viewId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            document.getElementById('view-title').textContent = activeLink.querySelector('span').textContent;
        }
        refreshViewData(viewId);
    }

    function showToast(message, type = 'success') {
        if (type === 'error') Logger.error(`User Toast: ${message}`);
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    function setButtonLoading(isLoading, buttonEl) {
        if (!buttonEl) return;
        if (isLoading) {
            buttonEl.disabled = true;
            buttonEl.dataset.originalText = buttonEl.innerHTML;
            buttonEl.innerHTML = '<div class="button-spinner"></div><span>Processing...</span>';
        } else {
            buttonEl.disabled = false;
            if (buttonEl.dataset.originalText) {
                buttonEl.innerHTML = buttonEl.dataset.originalText;
            }
        }
    }

    // PART 3 OF 4: VIEW RENDERING
    function renderItemsTable(data = state.items) {
        const tbody = document.getElementById('table-items').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No items found.</td></tr>';
            return;
        }
        const canEdit = userCan('editItem');
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.code}</td><td>${item.name}</td><td>${item.unit}</td><td>${parseFloat(item.cost).toFixed(2)} EGP</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="item" data-id="${item.code}">Edit</button>`: 'N/A'}</td>`;
            tbody.appendChild(tr);
        });
    }

    function renderSuppliersTable(data = state.suppliers) {
        const tbody = document.getElementById('table-suppliers').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No suppliers found.</td></tr>';
            return;
        }
        const financials = calculateSupplierFinancials();
        const canEdit = userCan('editSupplier');
        data.forEach(supplier => {
            const balance = financials[supplier.supplierCode]?.balance || 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${supplier.supplierCode || ''}</td><td>${supplier.name}</td><td>${supplier.contact}</td><td>${balance.toFixed(2)} EGP</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="supplier" data-id="${supplier.supplierCode}">Edit</button>`: 'N/A'}</td>`;
            tbody.appendChild(tr);
        });
    }

    function renderBranchesTable(data = state.branches) {
        const tbody = document.getElementById('table-branches').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No branches found.</td></tr>';
            return;
        }
        const canEdit = userCan('editBranch');
        data.forEach(branch => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${branch.branchCode || ''}</td><td>${branch.name}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="branch" data-id="${branch.branchCode}">Edit</button>`: 'N/A'}</td>`;
            tbody.appendChild(tr);
        });
    }

    function renderSectionsTable(data = state.sections) {
        const tbody = document.getElementById('table-sections').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No sections found.</td></tr>';
            return;
        }
        const canEdit = userCan('editSection');
        data.forEach(section => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${section.sectionCode || ''}</td><td>${section.name}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="section" data-id="${section.sectionCode}">Edit</button>`: 'N/A'}</td>`;
            tbody.appendChild(tr);
        });
    }

    function renderReceiveListTable() {
        const tbody = document.getElementById('table-receive-list').querySelector('tbody');
        tbody.innerHTML = '';
        if (state.currentReceiveList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No items selected. Click "Select Items".</td></tr>';
            updateReceiveGrandTotal();
            return;
        }
        state.currentReceiveList.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" step="0.01" data-index="${index}" data-field="quantity"></td><td><input type="number" class="table-input" value="${item.cost.toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost"></td><td id="total-cost-${index}">${(item.quantity * item.cost).toFixed(2)} EGP</td><td><button class="danger small" data-index="${index}">X</button></td>`;
            tbody.appendChild(tr);
        });
        updateReceiveGrandTotal();
    }
        function renderTransferListTable() {
        const tbody = document.getElementById('table-transfer-list').querySelector('tbody');
        const fromBranchCode = document.getElementById('transfer-from-branch').value;
        const stock = calculateStockLevels();
        tbody.innerHTML = '';
        if (state.currentTransferList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items selected. Click "Select Items".</td></tr>';
            updateTransferGrandTotal();
            return;
        }
        state.currentTransferList.forEach((item, index) => {
            const availableStock = stock[fromBranchCode]?.[item.itemCode]?.quantity || 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td>${availableStock.toFixed(2)}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" max="${availableStock}" step="0.01" data-index="${index}" data-field="quantity"></td><td><button class="danger small" data-index="${index}">X</button></td>`;
            tbody.appendChild(tr);
        });
        updateTransferGrandTotal();
    }

    function renderIssueListTable() {
        const tbody = document.getElementById('table-issue-list').querySelector('tbody');
        const fromBranchCode = document.getElementById('issue-from-branch').value;
        const stock = calculateStockLevels();
        tbody.innerHTML = '';
        if (state.currentIssueList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items selected. Click "Select Items".</td></tr>';
            updateIssueGrandTotal();
            return;
        }
        state.currentIssueList.forEach((item, index) => {
            const availableStock = stock[fromBranchCode]?.[item.itemCode]?.quantity || 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.itemCode}</td><td>${item.itemName}</td><td>${availableStock.toFixed(2)}</td><td><input type="number" class="table-input" value="${item.quantity}" min="0.01" max="${availableStock}" step="0.01" data-index="${index}" data-field="quantity"></td><td><button class="danger small" data-index="${index}">X</button></td>`;
            tbody.appendChild(tr);
        });
        updateIssueGrandTotal();
    }

    function renderItemCentricStockView(itemsToRender = state.items) {
        const container = document.getElementById('item-centric-stock-container');
        if (!container) return;
        const stockByBranch = calculateStockLevels();
        const branchesToDisplay = getVisibleBranchesForCurrentUser();
        let tableHTML = `<table id="table-stock-levels-by-item"><thead><tr><th>Code</th><th>Item Name</th>`;
        branchesToDisplay.forEach(b => {
            tableHTML += `<th>${b.name}</th>`
        });
        tableHTML += `<th>Total</th></tr></thead><tbody>`;
        itemsToRender.forEach(item => {
            tableHTML += `<tr><td>${item.code}</td><td>${item.name}</td>`;
            let total = 0;
            branchesToDisplay.forEach(branch => {
                const qty = stockByBranch[branch.branchCode]?.[item.code]?.quantity || 0;
                total += qty;
                tableHTML += `<td>${qty > 0 ? qty.toFixed(2) : '-'}</td>`;
            });
            tableHTML += `<td><strong>${total.toFixed(2)}</strong></td></tr>`;
        });
        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;
    }

    function renderItemInquiry(searchTerm) {
        const resultsContainer = document.getElementById('item-inquiry-results');
        if (!searchTerm) {
            resultsContainer.innerHTML = '';
            return;
        }
        const stockByBranch = calculateStockLevels();
        const filteredItems = state.items.filter(i => i.name.toLowerCase().includes(searchTerm) || i.code.toLowerCase().includes(searchTerm));
        let html = '';
        const branchesToDisplay = getVisibleBranchesForCurrentUser();
        filteredItems.slice(0, 10).forEach(item => {
            html += `<h4>${item.name} (${item.code})</h4><table><thead><tr><th>Branch</th><th>Qty</th><th>Value</th></tr></thead><tbody>`;
            let found = false;
            let totalQty = 0;
            let totalValue = 0;
            branchesToDisplay.forEach(branch => {
                const itemStock = stockByBranch[branch.branchCode]?.[item.code];
                if (itemStock && itemStock.quantity > 0) {
                    const value = itemStock.quantity * itemStock.avgCost;
                    html += `<tr><td>${branch.name} (${branch.branchCode || ''})</td><td>${itemStock.quantity.toFixed(2)}</td><td>${value.toFixed(2)} EGP</td></tr>`;
                    totalQty += itemStock.quantity;
                    totalValue += value;
                    found = true;
                }
            });
            if (!found) {
                html += `<tr><td colspan="3">No stock for this item.</td></tr>`;
            } else {
                html += `<tr style="font-weight:bold; background-color: var(--bg-color);"><td>Total</td><td>${totalQty.toFixed(2)}</td><td>${totalValue.toFixed(2)} EGP</td></tr>`
            }
            html += `</tbody></table><hr>`;
        });
        resultsContainer.innerHTML = html;
    }

    function renderSupplierStatement(supplierCode, startDateStr, endDateStr) {
        const resultsContainer = document.getElementById('supplier-statement-results');
        const exportBtn = document.getElementById('btn-export-supplier-statement');
        const supplier = findByKey(state.suppliers, 'supplierCode', supplierCode);
        if (!supplier) {
            exportBtn.disabled = true;
            return;
        }
        const financials = calculateSupplierFinancials();
        const supplierData = financials[supplierCode];
        const sDate = startDateStr ? new Date(startDateStr) : null;
        const eDate = endDateStr ? new Date(endDateStr) : null;
        if (eDate) eDate.setHours(23, 59, 59, 999);
        let openingBalance = 0;
        if (sDate) {
            supplierData.events.forEach(event => {
                if (new Date(event.date) < sDate) {
                    openingBalance += event.debit - event.credit;
                }
            });
        }
        const filteredEvents = supplierData.events.filter(event => {
            const eventDate = new Date(event.date);
            return (!sDate || eventDate >= sDate) && (!eDate || eventDate <= eDate);
        });
        let balance = openingBalance;
        let tableBodyHtml = '';
        if (sDate) {
            tableBodyHtml += `<tr style="background-color: var(--bg-color);"><td colspan="3"><strong>Opening Balance as of ${sDate.toLocaleDateString()}</strong></td><td>-</td><td>-</td><td><strong>${openingBalance.toFixed(2)} EGP</strong></td></tr>`;
        }
        filteredEvents.forEach(event => {
            balance += event.debit - event.credit;
            tableBodyHtml += `<tr><td>${new Date(event.date).toLocaleDateString()}</td><td>${event.type}</td><td>${event.ref}</td><td>${event.debit > 0 ? event.debit.toFixed(2) : '-'}</td><td>${event.credit > 0 ? event.credit.toFixed(2) : '-'}</td><td>${balance.toFixed(2)} EGP</td></tr>`;
        });
        let dateHeader = `for all time`;
        if (sDate && eDate) {
            dateHeader = `from ${sDate.toLocaleDateString()} to ${eDate.toLocaleDateString()}`;
        } else if (sDate) {
            dateHeader = `from ${sDate.toLocaleDateString()}`;
        } else if (eDate) {
            dateHeader = `until ${eDate.toLocaleDateString()}`;
        }
        resultsContainer.innerHTML = `<div class="printable-document"><div class="printable-header"><div><h2>Supplier Statement: ${supplier.name}</h2><p style="margin:0; color: var(--text-light-color);">For period: ${dateHeader}</p></div><button class="secondary no-print" onclick="printReport('supplier-statement-results')">Print</button></div><p><strong>Date Generated:</strong> ${new Date().toLocaleString()}</p><div class="report-area"><table id="table-supplier-statement-report"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${tableBodyHtml}</tbody><tfoot><tr style="font-weight:bold; background-color: var(--bg-color);"><td colspan="5" style="text-align:right;">Closing Balance:</td><td>${balance.toFixed(2)} EGP</td></tr></tfoot></table></div></div>`;
        resultsContainer.style.display = 'block';
        exportBtn.disabled = false;
    }
    
    // ... (rest of render functions)

    const findByKey = (array, key, value) => (array || []).find(el => String(el[key]) === String(value));
    
    // ... (All other functions from the last correct script.js response) ...

    function logout() {
        Logger.info('User logging out.');
        location.reload();
    }

    function initializeAppUI() {
        Logger.info('Application UI initializing...');
        setupRoleBasedNav();
        attachEventListeners();
        attachSubNavListeners();
        setupSearch('search-items', renderItemsTable, 'items', ['name', 'code']);
        setupSearch('search-suppliers', renderSuppliersTable, 'suppliers', ['name', 'supplierCode']);
        setupSearch('search-branches', renderBranchesTable, 'branches', ['name', 'branchCode']);
        setupSearch('search-sections', renderSectionsTable, 'sections', ['name', 'sectionCode']);
        setupSearch('stock-levels-search', renderItemCentricStockView, 'items', ['name', 'code']);
        const firstVisibleView = document.querySelector('#main-nav .nav-item[style*="display:"]:not([style*="display: none"]) a')?.dataset.view || 'dashboard';
        showView(firstVisibleView);
        Logger.info('Application initialized successfully.');
    }

    async function init() {
        loginContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = loginUsernameInput.value.trim();
            const code = loginCodeInput.value;
            if (username && code) {
                attemptLogin(username, code);
            }
        });
    }

    init();
});
