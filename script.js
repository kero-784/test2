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
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby2w_2TdmRX6TXqgmRBX5Zi73soXKFQDbB0BuZxXUaUA4ptSxWLHMR6RMaiSNuqFIF6/exec';

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
        purchaseOrders: [],
        purchaseOrderItems: [],
        itemRequests: [],
        activityLog: [],
        currentReceiveList: [],
        currentTransferList: [],
        currentIssueList: [],
        currentPOList: [],
        currentReturnList: [],
        currentRequestList: [],
        modalSelections: new Set(),
        invoiceModalSelections: new Set(),
        allUsers: [],
        allRoles: []
    };
    let modalContext = null;

    const userCan = (permission) => {
        if (!state.currentUser || !state.currentUser.permissions) return false;
        const p = state.currentUser.permissions[permission];
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
    const historyModal = document.getElementById('history-modal');
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
            modalContext = 'receive'; currentList = state.currentReceiveList;
        } else if (document.getElementById('subview-transfer').classList.contains('active')) {
            modalContext = 'transfer'; currentList = state.currentTransferList;
        } else if (document.getElementById('subview-issue').classList.contains('active')) {
            modalContext = 'issue'; currentList = state.currentIssueList;
        } else if (document.getElementById('subview-create-po').classList.contains('active')) {
            modalContext = 'po'; currentList = state.currentPOList;
        } else if (document.getElementById('subview-return').classList.contains('active')) {
            modalContext = 'return'; currentList = state.currentReturnList;
        } else if (document.getElementById('subview-my-requests').classList.contains('active')) {
            modalContext = 'request'; currentList = state.currentRequestList;
        }

        if (modalContext) {
            state.modalSelections = new Set((currentList || []).map(item => item.itemCode));
            renderItemsInModal();
            itemSelectorModal.classList.add('active');
        }
    }

    function openInvoiceSelectorModal() {
        modalContext = 'invoices';
        renderInvoicesInModal();
        invoiceSelectorModal.classList.add('active');
    }

    async function openHistoryModal(itemCode) {
        const item = findByKey(state.items, 'code', itemCode);
        if (!item) return;
        document.getElementById('history-modal-title').textContent = `History for: ${item.name} (${item.code})`;
        const historyModalBody = document.getElementById('history-modal-body');
        historyModalBody.querySelector('#subview-price-history').innerHTML = '<div class="spinner"></div>';
        historyModalBody.querySelector('#subview-movement-history').innerHTML = '<div class="spinner"></div>';
        historyModal.classList.add('active');
        // Activate the first tab
        historyModalBody.querySelector('.sub-nav-item').click();

        const result = await postData('getItemHistory', { itemCode }, null);
        if (result && result.data) {
            renderPriceHistory(result.data.priceHistory);
            renderMovementHistory(result.data.movementHistory, itemCode);
        } else {
            historyModalBody.querySelector('#subview-price-history').innerHTML = '<p>Could not load price history.</p>';
            historyModalBody.querySelector('#subview-movement-history').innerHTML = '<p>Could not load movement history.</p>';
        }
    }


    function closeModal() {
        itemSelectorModal.classList.remove('active');
        invoiceSelectorModal.classList.remove('active');
        editModal.classList.remove('active');
        historyModal.classList.remove('active');
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
                formHtml = `<div class="form-grid"><div class="form-group"><label>Item Code</label><input type="text" value="${record.code}" readonly></div><div class="form-group"><label for="edit-item-barcode">Barcode</label><input type="text" id="edit-item-barcode" name="barcode" value="${record.barcode || ''}"></div><div class="form-group"><label for="edit-item-name">Item Name</label><input type="text" id="edit-item-name" name="name" value="${record.name}" required></div><div class="form-group"><label for="edit-item-unit">Unit</label><input type="text" id="edit-item-unit" name="unit" value="${record.unit}" required></div><div class="form-group"><label for="edit-item-category">Category</label><select id="edit-item-category" name="category" required><option value="Packing">Packing</option><option value="Cleaning">Cleaning</option></select></div><div class="form-group"><label for="edit-item-supplier">Default Supplier</label><select id="edit-item-supplier" name="supplierCode"></select></div><div class="form-group span-full"><label for="edit-item-cost">Default Cost</label><input type="number" id="edit-item-cost" name="cost" step="0.01" min="0" value="${record.cost}" required></div></div>`;
                editModalBody.innerHTML = formHtml;
                document.getElementById('edit-item-category').value = record.category;
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
                const sectionOptions = state.sections.map(s => `<option value="${s.sectionCode}" ${s.sectionCode === record.AssignedSectionCode ? 'selected' : ''}>${s.name}</option>`).join('');
                formHtml = `<div class="form-grid"><div class="form-group"><label>Username</label><input type="text" value="${record.Username}" readonly></div><div class="form-group"><label for="edit-user-name">Full Name</label><input type="text" id="edit-user-name" name="Name" value="${record.Name}" required></div><div class="form-group"><label for="edit-user-role">Role</label><select id="edit-user-role" name="RoleName" required>${roleOptions}</select></div><div class="form-group"><label for="edit-user-branch">Assigned Branch</label><select id="edit-user-branch" name="AssignedBranchCode"><option value="">None</option>${branchOptions}</select></div><div class="form-group"><label for="edit-user-section">Assigned Section</label><select id="edit-user-section" name="AssignedSectionCode"><option value="">None</option>${sectionOptions}</select></div><div class="form-group span-full"><label for="edit-user-password">New Password (leave blank to keep unchanged)</label><input type="password" id="edit-user-password" name="LoginCode"></div><div class="form-group span-full"><button type="button" id="btn-delete-user" class="danger">Delete User</button></div></div>`;
                editModalBody.innerHTML = formHtml;
                break;
            case 'role':
                record = findByKey(state.allRoles, 'RoleName', id);
                if (!record) return;
                editModalTitle.textContent = `Edit Permissions for ${record.RoleName}`;
                const permissionKeys = Object.keys(state.allRoles[0] || {}).filter(key => key !== 'RoleName');
                const permissionCategories = {
                    'General Access': ['viewDashboard', 'viewActivityLog'],
                    'User Management': ['manageUsers'],
                    'Data Management': ['viewSetup', 'viewMasterData', 'createItem', 'editItem', 'createSupplier', 'editSupplier', 'createBranch', 'editBranch', 'createSection', 'editSection'],
                    'Stock Operations': ['viewOperations', 'opReceive', 'opIssue', 'opTransfer'],
                    'Purchasing & Returns': ['viewPurchasing', 'opCreatePO', 'opReturn'],
                    'Item Requests': ['viewRequests', 'opRequestItems', 'opApproveRequest'],
                    'Financials': ['viewPayments', 'opRecordPayment'],
                    'Reporting': ['viewReports', 'viewStockLevels', 'viewTransactionHistory', 'viewAllBranches'],
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
            const allPerms = Object.keys(findByKey(state.allRoles, 'RoleName', id) || {});
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
        const addToList = (currentList, newList, item) => {
            const existing = (currentList || []).find(i => i.itemCode === item.code);
            if (existing) {
                newList.push(existing);
            } else {
                newList.push({ itemCode: item.code, itemName: item.name, quantity: 1, cost: item.cost });
            }
        };

        const createNewList = (currentList) => {
            const newList = [];
            selectedCodes.forEach(code => {
                const item = findByKey(state.items, 'code', code);
                if (item) addToList(currentList, newList, item);
            });
            return newList;
        };

        switch (modalContext) {
            case 'invoices': renderPaymentList(); break;
            case 'receive': state.currentReceiveList = createNewList(state.currentReceiveList); renderReceiveListTable(); break;
            case 'transfer': state.currentTransferList = createNewList(state.currentTransferList); renderTransferListTable(); break;
            case 'issue': state.currentIssueList = createNewList(state.currentIssueList); renderIssueListTable(); break;
            case 'po': state.currentPOList = createNewList(state.currentPOList); renderPOListTable(); break;
            case 'return': state.currentReturnList = createNewList(state.currentReturnList); renderReturnListTable(); break;
            case 'request': state.currentRequestList = createNewList(state.currentRequestList); renderRequestListTable(); break;
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
// PART 3 OF 4: VIEW RENDERING & DOCUMENT GENERATION
    function renderItemsTable(data = state.items) {
        const tbody = document.getElementById('table-items').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No items found.</td></tr>';
            return;
        }
        const canEdit = userCan('editItem');
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.code}</td><td>${item.name}</td><td>${item.category || 'N/A'}</td><td>${item.unit}</td><td>${parseFloat(item.cost).toFixed(2)} EGP</td><td><div class="action-buttons"><button class="secondary small btn-edit" data-type="item" data-id="${item.code}" ${!canEdit ? 'disabled' : ''}>Edit</button><button class="secondary small btn-history" data-type="item" data-id="${item.code}">History</button></div></td>`;
            tbody.appendChild(tr);
        });
    }

    // renderSuppliersTable, renderBranchesTable, renderSectionsTable are unchanged...

    // All renderDynamicListTable and individual list table functions (renderReceiveListTable, etc.) are unchanged...

    // renderItemCentricStockView, renderItemInquiry, renderConsumptionReport are unchanged...
    
    function renderPriceHistory(priceHistory) {
        const container = document.getElementById('subview-price-history');
        let html = '<h4>Price Change Log</h4><table id="table-price-history"><thead><tr><th>Date</th><th>Old Cost</th><th>New Cost</th><th>Change</th><th>Source</th><th>Updated By</th></tr></thead><tbody>';
        if (!priceHistory || priceHistory.length === 0) {
            html += '<tr><td colspan="6" style="text-align:center;">No price history found for this item.</td></tr>';
        } else {
            priceHistory.forEach(h => {
                const oldCost = parseFloat(h.OldCost);
                const newCost = parseFloat(h.NewCost);
                const change = newCost - oldCost;
                const changeClass = change > 0 ? 'danger' : (change < 0 ? 'success' : 'info');
                const changeIcon = change > 0 ? '▲' : (change < 0 ? '▼' : '–');
                html += `<tr><td>${new Date(h.Timestamp).toLocaleString()}</td><td>${oldCost.toFixed(2)}</td><td>${newCost.toFixed(2)}</td><td style="color:var(--${changeClass}-color);">${changeIcon} ${Math.abs(change).toFixed(2)}</td><td>${h.Source}</td><td>${h.UpdatedBy}</td></tr>`;
            });
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function renderMovementHistory(movementHistory, itemCode) {
        const container = document.getElementById('subview-movement-history');
        let html = '<h4>Item Movement Ledger</h4><table id="table-movement-history"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Details</th><th style="text-align:right;">Qty In</th><th style="text-align:right;">Qty Out</th></tr></thead><tbody>';
        if (!movementHistory || movementHistory.length === 0) {
            html += '<tr><td colspan="6" style="text-align:center;">No movement history found for this item.</td></tr>';
        } else {
            movementHistory.forEach(t => {
                let type = t.type.replace('_', ' ').toUpperCase();
                let details = '', qtyIn = '-', qtyOut = '-';
                switch (t.type) {
                    case 'receive': 
                        details = `From: ${findByKey(state.suppliers, 'supplierCode', t.supplierCode)?.name || t.supplierCode} To: ${findByKey(state.branches, 'branchCode', t.branchCode)?.name || t.branchCode}`;
                        qtyIn = t.quantity.toFixed(2);
                        break;
                    case 'issue':
                        details = `From: ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name || t.fromBranchCode} To: ${findByKey(state.sections, 'sectionCode', t.sectionCode)?.name || t.sectionCode}`;
                        qtyOut = t.quantity.toFixed(2);
                        break;
                    case 'transfer_out':
                        details = `Sent from: ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name} To: ${findByKey(state.branches, 'branchCode', t.toBranchCode)?.name}`;
                        qtyOut = t.quantity.toFixed(2);
                        break;
                    case 'transfer_in':
                        details = `Received at: ${findByKey(state.branches, 'branchCode', t.toBranchCode)?.name} From: ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name}`;
                        qtyIn = t.quantity.toFixed(2);
                        break;
                    case 'return_out':
                        details = `Returned from: ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name} To: ${findByKey(state.suppliers, 'supplierCode', t.supplierCode)?.name}`;
                        qtyOut = t.quantity.toFixed(2);
                        break;
                }
                html += `<tr><td>${new Date(t.date).toLocaleString()}</td><td>${type}</td><td>${t.invoiceNumber || t.ref || t.batchId}</td><td>${details}</td><td style="text-align:right;">${qtyIn}</td><td style="text-align:right;">${qtyOut}</td></tr>`;
            });
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function renderTransactionHistory(filter = '') {
        const tbody = document.getElementById('table-transaction-history').querySelector('tbody');
        tbody.innerHTML = '';
        const lowerFilter = filter.toLowerCase();
        
        // Combine transactions and POs into a single list for rendering
        const allHistoryItems = [
            ...state.transactions,
            ...state.purchaseOrders.map(po => ({...po, type: 'po', batchId: po.poId, ref: po.poId})) // Adapt POs to look like transactions
        ];

        const grouped = {};
        allHistoryItems.forEach(t => {
            const key = t.batchId;
            if (!grouped[key]) {
                grouped[key] = {
                    date: t.date,
                    type: t.type,
                    batchId: key,
                    transactions: []
                };
            }
            grouped[key].transactions.push(t);
        });

        Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(group => {
            const first = group.transactions[0];
            let details = '', searchableText = `${group.batchId} ${first.ref || ''} ${first.type}`, statusTag = '', refNum = first.ref || first.batchId, typeDisplay = first.type.replace('_', ' ').toUpperCase();

            switch(first.type) {
                case 'receive':
                    const supplier = findByKey(state.suppliers, 'supplierCode', first.supplierCode);
                    const branch = findByKey(state.branches, 'branchCode', first.branchCode);
                    details = `Received ${group.transactions.length} item(s) from <strong>${supplier?.name || 'N/A'}</strong> to <strong>${branch?.name || 'N/A'}</strong>`;
                    searchableText += ` ${supplier?.name} ${branch?.name} ${first.invoiceNumber}`;
                    refNum = first.invoiceNumber;
                    break;
                case 'return_out':
                    const r_supplier = findByKey(state.suppliers, 'supplierCode', first.supplierCode);
                    const r_branch = findByKey(state.branches, 'branchCode', first.fromBranchCode);
                    details = `Returned ${group.transactions.length} item(s) from <strong>${r_branch?.name || 'N/A'}</strong> to <strong>${r_supplier?.name || 'N/A'}</strong>`;
                    searchableText += ` ${r_supplier?.name} ${r_branch?.name}`;
                    typeDisplay = "SUPPLIER RETURN";
                    break;
                case 'issue':
                    const i_from = findByKey(state.branches, 'branchCode', first.fromBranchCode);
                    const i_to = findByKey(state.sections, 'sectionCode', first.sectionCode);
                    details = `Issued ${group.transactions.length} item(s) from <strong>${i_from?.name || 'N/A'}</strong> to <strong>${i_to?.name || 'N/A'}</strong>`;
                    searchableText += ` ${i_from?.name} ${i_to?.name}`;
                    break;
                case 'transfer_out':
                case 'transfer_in':
                     const t_from = findByKey(state.branches, 'branchCode', first.fromBranchCode);
                     const t_to = findByKey(state.branches, 'branchCode', first.toBranchCode);
                     details = `Transferred ${group.transactions.length} item(s) from <strong>${t_from?.name || 'N/A'}</strong> to <strong>${t_to?.name || 'N/A'}</strong>`;
                     searchableText += ` ${t_from?.name} ${t_to?.name}`;
                     typeDisplay = first.Status === 'In Transit' ? "TRANSFER (IN TRANSIT)" : "TRANSFER";
                     statusTag = `<span class="status-tag status-${first.Status?.toLowerCase().replace(' ','')}">${first.Status}</span>`;
                     break;
                case 'po':
                    typeDisplay = "PURCHASE ORDER";
                    const po_supplier = findByKey(state.suppliers, 'supplierCode', first.supplierCode);
                    details = `Created PO for <strong>${po_supplier?.name || 'N/A'}</strong>`;
                    searchableText += ` ${po_supplier?.name}`;
                    statusTag = `<span class="status-tag status-${first.Status?.toLowerCase()}">${first.Status}</span>`;
                    break;
            }
            if (filter && !searchableText.toLowerCase().includes(lowerFilter)) return;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(first.date).toLocaleString()}</td><td>${typeDisplay}</td><td>${refNum}</td><td>${details}</td><td>${statusTag}</td><td><button class="secondary small no-print btn-view-tx" data-batch-id="${group.batchId}" data-type="${first.type}">View/Print</button></td>`;
            tbody.appendChild(tr);
        });
    }

    function renderActivityLog() {
        const tbody = document.getElementById('table-activity-log').querySelector('tbody');
        tbody.innerHTML = '';
        if (!state.activityLog || state.activityLog.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No activity logged.</td></tr>';
            return;
        }
        state.activityLog.slice().reverse().forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(log.Timestamp).toLocaleString()}</td><td><strong>${log.User}</strong>: ${log.Action}</td><td>${log.Description}</td>`;
            tbody.appendChild(tr);
        });
    }
    
    // All generateDocument functions are unchanged...
// PART 4 OF 4: CALCULATION ENGINES, EVENT LISTENERS & INITIALIZATION
    // All updateGrandTotal functions are unchanged...
    
    async function handleTransactionSubmit(payload, buttonEl) { /* ... unchanged from previous response ... */ }

    // findByKey, generateId, printContent, exportToExcel are unchanged...
    
    // calculateStockLevels, calculateSupplierFinancials are unchanged...
    
    // populateOptions, getVisibleBranchesForCurrentUser, applyUserUIConstraints are unchanged...

    const refreshViewData = async (viewId) => {
        if (!state.currentUser) return;
        switch(viewId) {
            // All cases are mostly unchanged, but ensure they call the correct rendering functions...
            case 'operations':
                 document.querySelector('[data-subview="receive"]').style.display = userCan('opReceive') ? 'inline-block' : 'none';
                 document.querySelector('[data-subview="issue"]').style.display = userCan('opIssue') ? 'inline-block' : 'none';
                 document.querySelector('[data-subview="transfer"]').style.display = userCan('opTransfer') ? 'inline-block' : 'none';
                 document.querySelector('[data-subview="return"]').style.display = userCan('opReturn') ? 'inline-block' : 'none';
                 // ... rest of the logic
                 break;
            case 'purchasing':
                 document.querySelector('[data-subview="create-po"]').style.display = userCan('opCreatePO') ? 'inline-block' : 'none';
                 document.querySelector('[data-subview="view-pos"]').style.display = userCan('opCreatePO') ? 'inline-block' : 'none';
                 // ... rest of the logic
                 break;
            // Other cases...
            case 'activity-log': renderActivityLog(); break;
        }
        applyUserUIConstraints();
    };

    // reloadDataAndRefreshUI, renderUserManagementUI, etc. are unchanged...

    function attachEventListeners() {
        btnLogout.addEventListener('click', logout);
        document.querySelectorAll('#main-nav a:not(#btn-logout)').forEach(link => { link.addEventListener('click', e => { e.preventDefault(); showView(link.dataset.view); }); });
        
        // Modal Buttons
        ['btn-show-receive-modal', 'btn-show-transfer-modal', 'btn-show-issue-modal', 'btn-show-po-modal', 'btn-show-return-modal', 'btn-show-request-modal'].forEach(id => { document.getElementById(id)?.addEventListener('click', openItemSelectorModal); });
        ['btn-close-item-selector-modal', 'btn-cancel-item-selector-modal', 'btn-close-invoice-modal', 'btn-cancel-invoice-modal', 'btn-close-edit-modal', 'btn-cancel-edit-modal', 'btn-close-view-transfer-modal', 'btn-cancel-view-transfer-modal', 'btn-close-history-modal', 'btn-cancel-history-modal'].forEach(id => { document.getElementById(id)?.addEventListener('click', closeModal); });
        document.getElementById('btn-confirm-modal-selection').addEventListener('click', confirmModalSelection);
        // ... Other modal buttons...

        // Modal Content Listeners
        modalItemList.addEventListener('change', handleModalCheckboxChange);
        modalSearchInput.addEventListener('input', e => renderItemsInModal(e.target.value));
        formEditRecord.addEventListener('submit', handleUpdateSubmit);

        // Edit/History Buttons in Tables (DELEGATION)
        document.getElementById('view-master-data').addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.classList.contains('btn-edit')) { openEditModal(btn.dataset.type, btn.dataset.id); }
            if (btn.classList.contains('btn-history')) { openHistoryModal(btn.dataset.id); }
        });
        document.getElementById('view-user-management').addEventListener('click', e => { /* ... similar delegation for user edit ... */ });
        
        // Transaction History View Button
        document.getElementById('table-transaction-history').addEventListener('click', e => {
            const btn = e.target.closest('.btn-view-tx');
            if (btn) {
                const batchId = btn.dataset.batchId;
                const type = btn.dataset.type;
                let data, items;
                
                switch(type) {
                    case 'po':
                        data = findByKey(state.purchaseOrders, 'poId', batchId);
                        items = state.purchaseOrderItems.filter(i => i.poId === batchId);
                        if (data && items) generatePODocument({ ...data, items });
                        break;
                    case 'receive':
                    case 'return_out':
                    case 'issue':
                    case 'transfer_out':
                    case 'transfer_in':
                        const transactionGroup = state.transactions.filter(t => t.batchId === batchId);
                        if (transactionGroup.length > 0) {
                            const first = transactionGroup[0];
                            data = { ...first, notes: first.notes, items: transactionGroup.map(t => ({...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name })) };
                            if (type === 'receive') generateReceiveDocument(data);
                            else if (type.startsWith('transfer')) generateTransferDocument(data);
                            else if (type === 'issue') generateIssueDocument(data);
                            else if (type === 'return_out') generateReturnDocument(data);
                        }
                        break;
                }
            }
        });
        
        // Add Data Forms (Unchanged)
        
        // Transaction/PO Submit Buttons
        document.getElementById('btn-submit-receive-batch').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const supplierCode = document.getElementById('receive-supplier').value;
            const branchCode = document.getElementById('receive-branch').value;
            const invoiceNumber = document.getElementById('receive-invoice').value;
            const notes = document.getElementById('receive-notes').value;
            const poId = document.getElementById('receive-po-select').value;

            if (!userCan('opReceiveWithoutPO') && !poId) {
                showToast('You must select a Purchase Order to receive stock.', 'error');
                return;
            }
            if (!supplierCode || !branchCode || !invoiceNumber || state.currentReceiveList.length === 0) {
                showToast('Please fill all required fields and add items.', 'error');
                return;
            }
            const payload = { type: 'receive', batchId: `GRN-${Date.now()}`, supplierCode, branchCode, invoiceNumber, poId, date: new Date().toISOString(), items: state.currentReceiveList, notes };
            await handleTransactionSubmit(payload, btn);
        });
        // ... other submit buttons (po, return, etc.) unchanged ...
        
        // Input Table Listeners (delegated, corrected)
        const handleTableInput = (e, list, rendererFn, totalizerFn) => {
            if (e.target.classList.contains('table-input')) {
                const index = e.target.dataset.index, field = e.target.dataset.field, value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    list[index][field] = value;
                    if(field === 'quantity' || field === 'cost') {
                       rendererFn(); // Re-render to update calculated totals per row
                    } else {
                       if(totalizerFn) totalizerFn();
                    }
                }
            }
        };
        const handleTableRemove = (e, list, rendererFn) => { if (e.target.classList.contains('danger')) { list.splice(e.target.dataset.index, 1); rendererFn(); } };

        const setupInputTableListeners = (tableId, listName, rendererFn, totalizerFn) => {
            const table = document.getElementById(tableId);
            if (!table) return;
            table.addEventListener('input', e => handleTableInput(e, state[listName], rendererFn, totalizerFn));
            table.addEventListener('click', e => handleTableRemove(e, state[listName], rendererFn));
        };
        setupInputTableListeners('table-receive-list', 'currentReceiveList', renderReceiveListTable, updateReceiveGrandTotal);
        setupInputTableListeners('table-po-list', 'currentPOList', renderPOListTable, updatePOGrandTotal);
        setupInputTableListeners('table-return-list', 'currentReturnList', renderReturnListTable, updateReturnGrandTotal);
        setupInputTableListeners('table-transfer-list', 'currentTransferList', renderTransferListTable, updateTransferGrandTotal);
        setupInputTableListeners('table-issue-list', 'currentIssueList', renderIssueListTable, updateIssueGrandTotal);
        setupInputTableListeners('table-request-list', 'currentRequestList', renderRequestListTable, null);

        // ... rest of event listeners ...
    }

    // setupRoleBasedNav, logout, initializeAppUI, updateUserBranchDisplay, init are unchanged...
    
    init();
});                          
