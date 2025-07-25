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
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXwaW9hUybmCj2x8bfAxU2OMLMCn0uFPoKGLP-23ZM9-oEgaHhmkxHy6ypxmO22O0t/exec';

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
        const activeSubView = document.querySelector('.sub-view.active');
        if (!activeSubView) return;

        if (activeSubView.id === 'subview-receive') {
            modalContext = 'receive'; currentList = state.currentReceiveList;
        } else if (activeSubView.id === 'subview-transfer') {
            modalContext = 'transfer'; currentList = state.currentTransferList;
        } else if (activeSubView.id === 'subview-issue') {
            modalContext = 'issue'; currentList = state.currentIssueList;
        } else if (activeSubView.id === 'subview-create-po') {
            modalContext = 'po'; currentList = state.currentPOList;
        } else if (activeSubView.id === 'subview-return') {
            modalContext = 'return'; currentList = state.currentReturnList;
        } else if (activeSubView.id === 'subview-my-requests') {
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
        
        const firstTab = historyModalBody.querySelector('.sub-nav-item');
        if (firstTab) firstTab.click();

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
                    'Stock Operations': ['viewOperations', 'opReceive', 'opReceiveWithoutPO', 'opIssue', 'opTransfer', 'opReturn'],
                    'Purchasing': ['viewPurchasing', 'opCreatePO'],
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

    const renderDynamicListTable = (tbodyId, list, columnsConfig, emptyMessage, totalizerFn) => {
        const tbody = document.getElementById(tbodyId).querySelector('tbody');
        tbody.innerHTML = '';
        if (!list || list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columnsConfig.length + 1}" style="text-align:center;">${emptyMessage}</td></tr>`;
            if (totalizerFn) totalizerFn();
            return;
        }
        const stock = calculateStockLevels();
        list.forEach((item, index) => {
            const tr = document.createElement('tr');
            let cellsHtml = '';
            columnsConfig.forEach(col => {
                let content = '';
                const fromBranch = document.getElementById(col.branchSelectId)?.value;
                switch (col.type) {
                    case 'text': content = item[col.key]; break;
                    case 'number_input': content = `<input type="number" class="table-input" value="${item[col.key] || 1}" min="${col.min || 0.01}" ${col.maxKey ? `max="${stock[fromBranch]?.[item.itemCode]?.quantity || 0}"` : ''} step="${col.step || 0.01}" data-index="${index}" data-field="${col.key}">`; break;
                    case 'cost_input': content = `<input type="number" class="table-input" value="${(item.cost || 0).toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost">`; break;
                    case 'calculated': content = `<span id="${col.idPrefix}-${index}">${col.calculator(item)}</span>`; break;
                    case 'available_stock': content = (stock[fromBranch]?.[item.itemCode]?.quantity || 0).toFixed(2); break;
                }
                cellsHtml += `<td>${content}</td>`;
            });
            cellsHtml += `<td><button class="danger small" data-index="${index}">X</button></td>`;
            tr.innerHTML = cellsHtml;
            tbody.appendChild(tr);
        });
        if (totalizerFn) totalizerFn();
    };
    
    function renderReceiveListTable() { renderDynamicListTable('table-receive-list', state.currentReceiveList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', idPrefix: 'total-cost', calculator: item => `${((item.quantity || 0) * (item.cost || 0)).toFixed(2)} EGP` } ], 'No items selected. Click "Select Items".', updateReceiveGrandTotal); }
    function renderTransferListTable() { renderDynamicListTable('table-transfer-list', state.currentTransferList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'transfer-from-branch' } ], 'No items selected. Click "Select Items".', updateTransferGrandTotal); }
    function renderIssueListTable() { renderDynamicListTable('table-issue-list', state.currentIssueList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'issue-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'issue-from-branch' } ], 'No items selected. Click "Select Items".', updateIssueGrandTotal); }
    function renderPOListTable() { renderDynamicListTable('table-po-list', state.currentPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', idPrefix: 'po-total-cost', calculator: item => `${((item.quantity || 0) * (item.cost || 0)).toFixed(2)} EGP` } ], 'No items selected. Click "Select Items".', updatePOGrandTotal); }
    function renderReturnListTable() { renderDynamicListTable('table-return-list', state.currentReturnList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'return-branch' }, { type: 'cost_input', key: 'cost' } ], 'No items selected. Click "Select Items".', updateReturnGrandTotal); }
    function renderRequestListTable() { renderDynamicListTable('table-request-list', state.currentRequestList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' } ], 'No items selected. Click "Select Items".', null); }

    function renderItemCentricStockView(itemsToRender = state.items) {
        const container = document.getElementById('item-centric-stock-container');
        if (!container) return;
        const stockByBranch = calculateStockLevels();
        const branchesToDisplay = getVisibleBranchesForCurrentUser();
        let tableHTML = `<table id="table-stock-levels-by-item"><thead><tr><th>Code</th><th>Item Name</th>`;
        branchesToDisplay.forEach(b => { tableHTML += `<th>${b.name}</th>` });
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
    
    function renderConsumptionReport(config) { /* ... same as before ... */ }
    
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
        
        const allHistoryItems = [
            ...state.transactions,
            ...state.purchaseOrders.map(po => ({...po, type: 'po', batchId: po.poId, ref: po.poId}))
        ];

        const grouped = {};
        allHistoryItems.forEach(t => {
            const key = t.batchId;
            if (!key) return; // Skip items without a batchId
            if (!grouped[key]) {
                grouped[key] = { date: t.date, type: t.type, batchId: key, transactions: [] };
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
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No activity logged.</td></tr>';
            return;
        }
        state.activityLog.slice().reverse().forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(log.Timestamp).toLocaleString()}</td><td>${log.User || 'N/A'}</td><td>${log.Action}</td><td>${log.Description}</td>`;
            tbody.appendChild(tr);
        });
    }
    
    const generateReceiveDocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; const branch = findByKey(state.branches, 'branchCode', data.branchCode) || { name: 'DELETED' }; let itemsHtml = '', totalValue = 0; data.items.forEach(item => { const itemTotal = item.quantity * item.cost; totalValue += itemTotal; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.quantity.toFixed(2)}</td><td>${item.cost.toFixed(2)} EGP</td><td>${itemTotal.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card"><h2>Goods Received Note</h2><p><strong>GRN No:</strong> ${data.batchId}</p><p><strong>Invoice #:</strong> ${data.invoiceNumber}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>Supplier:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><p><strong>Received at:</strong> ${branch.name} (${branch.branchCode || ''})</p><hr><h3>Items Received</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Cost/Unit</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">Total Value</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Signature:</strong> _________________________</p></div>`; printContent(content); };
    const generateTransferDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { name: 'DELETED' }; const toBranch = findByKey(state.branches, 'branchCode', data.toBranchCode) || { name: 'DELETED' }; let itemsHtml = ''; data.items.forEach(item => { const fullItem = findByKey(state.items, 'code', item.itemCode) || { code: 'N/A', name: 'DELETED', unit: 'N/A' }; itemsHtml += `<tr><td>${fullItem.code}</td><td>${fullItem.name}</td><td>${item.quantity.toFixed(2)}</td><td>${fullItem.unit}</td></tr>`; }); const content = `<div class="printable-document card"><h2>Internal Transfer Order</h2><p><strong>Order ID:</strong> ${data.batchId}</p><p><strong>Reference:</strong> ${data.ref}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>From:</strong> ${fromBranch.name} (${fromBranch.branchCode || ''})</p><p><strong>To:</strong> ${toBranch.name} (${toBranch.branchCode || ''})</p><hr><h3>Items Transferred</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Unit</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Sender:</strong> _________________</p><p><strong>Receiver:</strong> _________________</p></div>`; printContent(content); };
    const generateIssueDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { name: 'DELETED' }; const toSection = findByKey(state.sections, 'sectionCode', data.sectionCode) || { name: 'DELETED' }; let itemsHtml = ''; data.items.forEach(item => { const fullItem = findByKey(state.items, 'code', item.itemCode) || { name: 'DELETED', unit: 'N/A' }; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName || fullItem.name}</td><td>${item.quantity.toFixed(2)}</td><td>${fullItem.unit}</td></tr>`; }); const content = `<div class="printable-document card"><h2>Stock Issue Note</h2><p><strong>Issue Ref #:</strong> ${data.ref}</p><p><strong>Batch ID:</strong> ${data.batchId}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>From Branch:</strong> ${fromBranch.name} (${fromBranch.branchCode || ''})</p><p><strong>To Section:</strong> ${toSection.name} (${toSection.sectionCode || ''})</p><hr><h3>Items Issued</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Unit</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Issued By:</strong> _________________</p><p><strong>Received By:</strong> _________________</p></div>`; printContent(content); };
    const generatePaymentVoucher = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; let invoicesHtml = ''; data.payments.forEach(p => { invoicesHtml += `<tr><td>${p.invoiceNumber}</td><td>${p.amount.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card"><h2>Payment Voucher</h2><p><strong>Voucher ID:</strong> ${data.payments[0].paymentId}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>Paid To:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><p><strong>Amount:</strong> ${data.totalAmount.toFixed(2)} EGP</p><p><strong>Method:</strong> ${data.method}</p><hr><h3>Payment Allocation</h3><table><thead><tr><th>Invoice #</th><th>Amount Paid</th></tr></thead><tbody>${invoicesHtml}</tbody></table><br><p><strong>Signature:</strong> _________________</p></div>`; printContent(content); };
    const generatePODocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; let itemsHtml = '', totalValue = 0; data.items.forEach(item => { const itemDetails = findByKey(state.items, 'code', item.itemCode) || {name: "N/A"}; const itemTotal = item.quantity * item.cost; totalValue += itemTotal; itemsHtml += `<tr><td>${item.itemCode}</td><td>${itemDetails.name}</td><td>${item.quantity.toFixed(2)}</td><td>${item.cost.toFixed(2)} EGP</td><td>${itemTotal.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card"><h2>Purchase Order</h2><p><strong>PO No:</strong> ${data.poId || data.batchId}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>Supplier:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><hr><h3>Items Ordered</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Cost/Unit</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">Total Value</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Authorized By:</strong> ${state.currentUser.Name}</p></div>`; printContent(content); };
    const generateReturnDocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; const branch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { name: 'DELETED' }; let itemsHtml = '', totalValue = 0; data.items.forEach(item => { const itemTotal = item.quantity * item.cost; totalValue += itemTotal; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.quantity.toFixed(2)}</td><td>${item.cost.toFixed(2)} EGP</td><td>${itemTotal.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card"><h2>Supplier Return Note</h2><p><strong>Credit Note Ref:</strong> ${data.ref}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>Returned To:</strong> ${supplier.name}</p><p><strong>Returned From:</strong> ${branch.name}</p><hr><h3>Items Returned</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Cost/Unit</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">Total Value</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>Reason:</strong> ${data.notes || 'N/A'}</p></div>`; printContent(content); };
    // PART 4 OF 4: CALCULATION ENGINES, EVENT LISTENERS & INITIALIZATION
    function updateReceiveGrandTotal() { let grandTotal = 0; (state.currentReceiveList || []).forEach(item => { grandTotal += (item.quantity || 0) * (item.cost || 0); }); document.getElementById('receive-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
    function updateTransferGrandTotal() { let grandTotalQty = 0; (state.currentTransferList || []).forEach(item => { grandTotalQty += item.quantity || 0; }); document.getElementById('transfer-grand-total').textContent = grandTotalQty.toFixed(2); }
    function updateIssueGrandTotal() { let grandTotalQty = 0; (state.currentIssueList || []).forEach(item => { grandTotalQty += item.quantity || 0; }); document.getElementById('issue-grand-total').textContent = grandTotalQty.toFixed(2); }
    function updatePOGrandTotal() { let grandTotal = 0; (state.currentPOList || []).forEach(item => { grandTotal += (item.quantity || 0) * (item.cost || 0); }); document.getElementById('po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
    function updateReturnGrandTotal() { let grandTotal = 0; (state.currentReturnList || []).forEach(item => { grandTotal += (item.quantity || 0) * (item.cost || 0); }); document.getElementById('return-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }

    async function handleTransactionSubmit(payload, buttonEl) {
        const action = payload.type === 'po' ? 'addPurchaseOrder' : 'addTransactionBatch';
        const result = await postData(action, payload, buttonEl);
        if (result) {
            let message = `${payload.type.replace(/_/g,' ').toUpperCase()} processed!`;
            if (payload.type === 'receive') { generateReceiveDocument(result.data); state.currentReceiveList = []; document.getElementById('form-receive-details').reset(); }
            else if (payload.type === 'transfer_out') { generateTransferDocument(result.data); state.currentTransferList = []; document.getElementById('form-transfer-details').reset(); document.getElementById('transfer-ref').value = generateId('TRN'); }
            else if (payload.type === 'issue') { generateIssueDocument(result.data); state.currentIssueList = []; document.getElementById('form-issue-details').reset(); document.getElementById('issue-ref').value = generateId('ISN'); }
            else if (payload.type === 'po') { generatePODocument(result.data); state.currentPOList = []; document.getElementById('form-po-details').reset(); document.getElementById('po-ref').value = generateId('PO'); message = "Purchase Order created!"; }
            else if (payload.type === 'return_out') { generateReturnDocument(result.data); state.currentReturnList = []; document.getElementById('form-return-details').reset(); }
            showToast(message, 'success');
            await reloadDataAndRefreshUI();
        }
    }

    const findByKey = (array, key, value) => (array || []).find(el => el && String(el[key]) === String(value));
    const generateId = (prefix) => `${prefix}-${Date.now()}`;
    const printContent = (content) => { document.getElementById('print-area').innerHTML = content; setTimeout(() => window.print(), 100); };
    const exportToExcel = (tableId, filename) => { try { const table = document.getElementById(tableId); if (!table) { showToast('Please generate a report first.', 'error'); return; } const wb = XLSX.utils.table_to_book(table, {sheet: "Sheet1"}); XLSX.writeFile(wb, filename); showToast('Exporting to Excel...', 'success'); } catch (err) { showToast('Excel export failed.', 'error'); Logger.error('Export Error:', err); } };
    
    const calculateStockLevels = () => { /* ... Unchanged from previous correct version ... */ };
    const calculateSupplierFinancials = () => { /* ... Unchanged from previous correct version ... */ };
    
    const populateOptions = (el, data, ph, valueKey, textKey, textKey2) => { el.innerHTML = `<option value="">${ph}</option>`; (data || []).forEach(item => { el.innerHTML += `<option value="${item[valueKey]}">${item[textKey]}${textKey2 && item[textKey2] ? ' (' + item[textKey2] + ')' : ''}</option>`; }); };
    
    function getVisibleBranchesForCurrentUser() { if (!state.currentUser) return []; if (userCan('viewAllBranches')) { return state.branches; } if (state.currentUser.AssignedBranchCode) { return state.branches.filter(b => String(b.branchCode) === String(state.currentUser.AssignedBranchCode)); } return []; }
    
    function applyUserUIConstraints() {
        if (!state.currentUser) return;
        const branchCode = state.currentUser.AssignedBranchCode;
        const sectionCode = state.currentUser.AssignedSectionCode;
        if (branchCode) {
            ['receive-branch', 'issue-from-branch', 'transfer-from-branch', 'return-branch'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.value = branchCode; el.disabled = true; el.dispatchEvent(new Event('change')); }
            });
            if (!userCan('viewAllBranches')) {
                ['branch-consumption-select'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) { el.value = branchCode; el.disabled = true; }
                });
            }
        }
        if (sectionCode && !userCan('viewAllBranches')) {
            const el = document.getElementById('section-consumption-select');
            if(el) { el.value = sectionCode; el.disabled = true; }
        }
    }

    const refreshViewData = async (viewId) => {
        if (!state.currentUser) return;
        switch(viewId) {
            case 'dashboard':
                const stock = calculateStockLevels();
                document.getElementById('dashboard-total-items').textContent = (state.items || []).length;
                document.getElementById('dashboard-total-suppliers').textContent = (state.suppliers || []).length;
                document.getElementById('dashboard-total-branches').textContent = (state.branches || []).length;
                let totalValue = 0;
                Object.values(stock).forEach(bs => Object.values(bs).forEach(i => totalValue += i.quantity * i.avgCost));
                document.getElementById('dashboard-total-value').textContent = `${totalValue.toFixed(2)} EGP`;
                break;
            case 'setup':
                document.getElementById('form-add-item').parentElement.style.display = userCan('createItem') ? 'block' : 'none';
                document.getElementById('form-add-supplier').parentElement.style.display = userCan('createSupplier') ? 'block' : 'none';
                document.getElementById('form-add-branch').parentElement.style.display = userCan('createBranch') ? 'block' : 'none';
                document.getElementById('form-add-section').parentElement.style.display = userCan('createSection') ? 'block' : 'none';
                populateOptions(document.getElementById('item-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
                break;
            case 'master-data':
                document.querySelector('[data-subview="items"]').style.display = userCan('editItem') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="suppliers"]').style.display = userCan('editSupplier') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="branches"]').style.display = userCan('editBranch') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="sections"]').style.display = userCan('editSection') ? 'inline-block' : 'none';
                renderItemsTable(); renderSuppliersTable(); renderBranchesTable(); renderSectionsTable();
                document.querySelector('#view-master-data .sub-nav-item[style*="inline-block"]')?.click();
                break;
            case 'operations':
                document.querySelector('[data-subview="receive"]').style.display = userCan('opReceive') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="issue"]').style.display = userCan('opIssue') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="transfer"]').style.display = userCan('opTransfer') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="return"]').style.display = userCan('opReturn') ? 'inline-block' : 'none';
                populateOptions(document.getElementById('receive-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
                populateOptions(document.getElementById('receive-branch'), state.branches, 'Select Branch', 'branchCode', 'name');
                populateOptions(document.getElementById('transfer-from-branch'), state.branches, 'Select Source', 'branchCode', 'name');
                populateOptions(document.getElementById('transfer-to-branch'), state.branches, 'Select Destination', 'branchCode', 'name');
                populateOptions(document.getElementById('issue-from-branch'), state.branches, 'Select Source', 'branchCode', 'name');
                populateOptions(document.getElementById('issue-to-section'), state.sections, 'Select Destination', 'sectionCode', 'name');
                populateOptions(document.getElementById('return-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
                populateOptions(document.getElementById('return-branch'), state.branches, 'Select Branch', 'branchCode', 'name');
                const openPOs = (state.purchaseOrders || []).filter(po => po.Status === 'Pending');
                populateOptions(document.getElementById('receive-po-select'), openPOs, 'Select a Purchase Order', 'poId', 'poId', 'supplierCode');
                document.getElementById('issue-ref').value = generateId('ISN'); document.getElementById('transfer-ref').value = generateId('TRN');
                renderReceiveListTable(); renderIssueListTable(); renderTransferListTable(); renderReturnListTable(); renderPendingTransfers(); renderInTransitReport();
                document.querySelector('#view-operations .sub-nav-item[style*="inline-block"]')?.click();
                break;
            case 'purchasing':
                 document.querySelector('[data-subview="create-po"]').style.display = userCan('opCreatePO') ? 'inline-block' : 'none';
                 document.querySelector('[data-subview="view-pos"]').style.display = userCan('opCreatePO') ? 'inline-block' : 'none';
                 populateOptions(document.getElementById('po-supplier'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
                 document.getElementById('po-ref').value = generateId('PO');
                 renderPOListTable(); //renderPurchaseOrdersViewer();
                 document.querySelector('#view-purchasing .sub-nav-item[style*="inline-block"]')?.click();
                 break;
            case 'requests':
                document.querySelector('[data-subview="my-requests"]').style.display = userCan('opRequestItems') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="pending-approval"]').style.display = userCan('opApproveRequest') ? 'inline-block' : 'none';
                renderRequestListTable(); //renderMyRequests(); renderPendingRequests();
                document.querySelector('#view-requests .sub-nav-item[style*="inline-block"]')?.click();
                break;
            case 'payments':
                populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, 'Select Supplier', 'supplierCode', 'name');
                renderPaymentList();
                break;
            case 'reports':
                populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, 'Select a Supplier', 'supplierCode', 'name');
                populateOptions(document.getElementById('branch-consumption-select'), getVisibleBranchesForCurrentUser(), 'Select a Branch', 'branchCode', 'name');
                populateOptions(document.getElementById('section-consumption-select'), state.sections, 'Select a Section', 'sectionCode', 'name');
                populateOptions(document.getElementById('branch-consumption-item-filter'), state.items, 'All Items', 'code', 'name');
                populateOptions(document.getElementById('section-consumption-item-filter'), state.items, 'All Items', 'code', 'name');
                document.querySelector('#view-reports .sub-nav-item').click();
                break;
            case 'stock-levels':
                document.getElementById('stock-levels-title').textContent = userCan('viewAllBranches') ? 'Stock by Item (All Branches)' : 'Stock by Item (Your Branch)';
                renderItemCentricStockView();
                document.getElementById('item-inquiry-search').value = ''; renderItemInquiry('');
                document.getElementById('stock-levels-search').value = '';
                break;
            case 'transaction-history': renderTransactionHistory(); break;
            case 'activity-log': renderActivityLog(); break;
            case 'user-management':
                const result = await postData('getAllUsersAndRoles', {}, null);
                if (result) { state.allUsers = result.data.users; state.allRoles = result.data.roles; renderUserManagementUI(); }
                break;
        }
        applyUserUIConstraints();
    };

    async function reloadDataAndRefreshUI() { Logger.info('Reloading data...'); const { username, loginCode } = state; if (!username || !loginCode) { logout(); return; } const currentView = document.querySelector('.nav-item a.active')?.dataset.view || 'dashboard'; try { const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`); if (!response.ok) throw new Error('Failed to reload data.'); const data = await response.json(); if (data.status === 'error') throw new Error(data.message); Object.keys(data).forEach(key => { if(key !== 'user') state[key] = data[key] || state[key]; }); updateUserBranchDisplay(); updatePendingRequestsWidget(); await refreshViewData(currentView); Logger.info('Reload complete.'); } catch (err) { Logger.error('Data reload failed:', err); showToast('Could not refresh data. Please log in again.', 'error'); setTimeout(logout, 2000); } }
    
    function renderUserManagementUI() {
        const usersTbody = document.getElementById('table-users').querySelector('tbody');
        usersTbody.innerHTML = '';
        (state.allUsers || []).forEach(user => {
            const tr = document.createElement('tr');
            const assigned = findByKey(state.branches, 'branchCode', user.AssignedBranchCode)?.name || findByKey(state.sections, 'sectionCode', user.AssignedSectionCode)?.name || 'N/A';
            tr.innerHTML = `<td>${user.Username}</td><td>${user.Name}</td><td>${user.RoleName}</td><td>${assigned}</td><td><button class="secondary small btn-edit" data-type="user" data-id="${user.Username}">Edit</button></td>`;
            usersTbody.appendChild(tr);
        });
        const rolesTbody = document.getElementById('table-roles').querySelector('tbody');
        rolesTbody.innerHTML = '';
        (state.allRoles || []).forEach(role => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${role.RoleName}</td><td><button class="secondary small btn-edit" data-type="role" data-id="${role.RoleName}">Edit</button></td>`;
            rolesTbody.appendChild(tr);
        });
    }

    function renderPendingTransfers() { /* ... unchanged ... */ }
    function renderInTransitReport() { /* ... unchanged ... */ }
    // function renderPurchaseOrdersViewer() { /* ... stub ... */ }
    // function renderMyRequests() { /* ... stub ... */ }
    // function renderPendingRequests() { /* ... stub ... */ }
    
    function updatePendingRequestsWidget() { /* ... unchanged ... */ }

    function setupSearch(inputId, renderFn, dataKey, searchKeys) { const searchInput = document.getElementById(inputId); if (!searchInput) return; searchInput.addEventListener('input', e => { const searchTerm = e.target.value.toLowerCase(); const dataToFilter = state[dataKey] || []; renderFn(searchTerm ? dataToFilter.filter(item => searchKeys.some(key => item[key] && String(item[key]).toLowerCase().includes(searchTerm))) : dataToFilter); }); }
    
    function attachSubNavListeners() { document.querySelectorAll('.sub-nav').forEach(nav => { nav.addEventListener('click', e => { if (!e.target.classList.contains('sub-nav-item')) return; const subviewId = e.target.dataset.subview; const parentView = e.target.closest('.view'); parentView.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active')); e.target.classList.add('active'); parentView.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active')); const subViewToShow = parentView.querySelector(`#subview-${subviewId}`); if (subViewToShow) subViewToShow.classList.add('active'); }); }); }
    
    function attachEventListeners() {
        btnLogout.addEventListener('click', logout);
        document.querySelectorAll('#main-nav a:not(#btn-logout)').forEach(link => { link.addEventListener('click', e => { e.preventDefault(); showView(link.dataset.view); }); });
        
        // Modal Buttons
        ['btn-show-receive-modal', 'btn-show-transfer-modal', 'btn-show-issue-modal', 'btn-show-po-modal', 'btn-show-return-modal', 'btn-show-request-modal'].forEach(id => { document.getElementById(id)?.addEventListener('click', openItemSelectorModal); });
        ['btn-close-item-selector-modal', 'btn-cancel-item-selector-modal', 'btn-close-invoice-modal', 'btn-cancel-invoice-modal', 'btn-close-edit-modal', 'btn-cancel-edit-modal', 'btn-close-view-transfer-modal', 'btn-cancel-view-transfer-modal', 'btn-close-history-modal', 'btn-cancel-history-modal'].forEach(id => { document.getElementById(id)?.addEventListener('click', closeModal); });
        document.getElementById('btn-confirm-modal-selection').addEventListener('click', confirmModalSelection);
        document.getElementById('btn-confirm-invoice-selection').addEventListener('click', confirmModalSelection);

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
        document.getElementById('view-user-management').addEventListener('click', e => {
             const btn = e.target.closest('button.btn-edit');
             if (btn) { openEditModal(btn.dataset.type, btn.dataset.id); }
        });
        
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
                        items = (state.purchaseOrderItems || []).filter(i => i.poId === batchId);
                        if (data && items) generatePODocument({ ...data, items });
                        break;
                    default:
                        const transactionGroup = state.transactions.filter(t => t.batchId === batchId);
                        if (transactionGroup.length > 0) {
                            const first = transactionGroup[0];
                            data = { ...first, items: transactionGroup.map(t => ({...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name })) };
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
        document.getElementById('form-add-item').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { code: document.getElementById('item-code').value, barcode: document.getElementById('item-barcode').value, name: document.getElementById('item-name').value, unit: document.getElementById('item-unit').value, category: document.getElementById('item-category').value, supplierCode: document.getElementById('item-supplier').value, cost: parseFloat(document.getElementById('item-cost').value) }; const result = await postData('addItem', data, btn); if (result) { showToast('Item added!', 'success'); e.target.reset(); reloadDataAndRefreshUI(); } });

        // Transaction/PO Submit Buttons
        document.getElementById('btn-submit-receive-batch').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const supplierCode = document.getElementById('receive-supplier').value, branchCode = document.getElementById('receive-branch').value, invoiceNumber = document.getElementById('receive-invoice').value, notes = document.getElementById('receive-notes').value, poId = document.getElementById('receive-po-select').value;
            if (!userCan('opReceiveWithoutPO') && !poId) { showToast('You must select a Purchase Order to receive stock.', 'error'); return; }
            if (!supplierCode || !branchCode || !invoiceNumber || state.currentReceiveList.length === 0) { showToast('Please fill all required fields and add items.', 'error'); return; }
            const payload = { type: 'receive', batchId: `GRN-${Date.now()}`, supplierCode, branchCode, invoiceNumber, poId, date: new Date().toISOString(), items: state.currentReceiveList, notes };
            await handleTransactionSubmit(payload, btn);
        });
        document.getElementById('btn-submit-po').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('po-supplier').value, poId = document.getElementById('po-ref').value, notes = document.getElementById('po-notes').value; if (!supplierCode || state.currentPOList.length === 0) { showToast('Please select a supplier and add items.', 'error'); return; } const totalValue = state.currentPOList.reduce((acc, item) => acc + (item.quantity * item.cost), 0); const payload = { type: 'po', poId, supplierCode, date: new Date().toISOString(), items: state.currentPOList, totalValue, notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-return').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('return-supplier').value, fromBranchCode = document.getElementById('return-branch').value, ref = document.getElementById('return-ref').value, notes = document.getElementById('return-notes').value; if (!supplierCode || !fromBranchCode || !ref || state.currentReturnList.length === 0) { showToast('Please fill all required fields and add items.', 'error'); return; } const payload = { type: 'return_out', batchId: `RTN-${Date.now()}`, supplierCode, fromBranchCode, ref, date: new Date().toISOString(), items: state.currentReturnList, notes }; await handleTransactionSubmit(payload, btn); });
        
        // Input Table Listeners (delegated, corrected)
        const handleTableInput = (e, list, rendererFn) => {
            if (e.target.classList.contains('table-input')) {
                const index = e.target.dataset.index, field = e.target.dataset.field, value = parseFloat(e.target.value);
                if (list && list[index]) {
                   if (!isNaN(value)) {
                       list[index][field] = value;
                   }
                   rendererFn(); // Always re-render to update calculated totals
                }
            }
        };
        const handleTableRemove = (e, list, rendererFn) => { if (e.target.classList.contains('danger')) { list.splice(e.target.dataset.index, 1); rendererFn(); } };
        
        const setupInputTableListeners = (tableId, listName, rendererFn) => {
            const table = document.getElementById(tableId);
            if (!table) return;
            table.addEventListener('input', e => handleTableInput(e, state[listName], rendererFn));
            table.addEventListener('click', e => handleTableRemove(e, state[listName], rendererFn));
        };
        setupInputTableListeners('table-receive-list', 'currentReceiveList', renderReceiveListTable);
        setupInputTableListeners('table-po-list', 'currentPOList', renderPOListTable);
        setupInputTableListeners('table-return-list', 'currentReturnList', renderReturnListTable);
        setupInputTableListeners('table-transfer-list', 'currentTransferList', renderTransferListTable);
        setupInputTableListeners('table-issue-list', 'currentIssueList', renderIssueListTable);
        setupInputTableListeners('table-request-list', 'currentRequestList', renderRequestListTable);
    }
    
    function setupRoleBasedNav() {
        const user = state.currentUser; if (!user) return;
        const userFirstName = user.Name.split(' ')[0];
        document.querySelector('.sidebar-header h1').textContent = `Hi, ${userFirstName}`;
        const navMap = { 'dashboard': 'viewDashboard', 'operations': 'viewOperations', 'purchasing': 'viewPurchasing', 'requests': 'viewRequests', 'payments': 'viewPayments', 'reports': 'viewReports', 'stock-levels': 'viewStockLevels', 'transaction-history': 'viewTransactionHistory', 'setup': 'viewSetup', 'master-data': 'viewMasterData', 'user-management': 'manageUsers', 'activity-log': 'viewActivityLog' };
        for (const [view, permission] of Object.entries(navMap)) {
            const navItem = document.querySelector(`[data-view="${view}"]`);
            if (navItem) { navItem.parentElement.style.display = userCan(permission) ? '' : 'none'; }
        }
    }
    
    function logout() { Logger.info('User logging out.'); location.reload(); }
    
    function initializeAppUI() {
        Logger.info('Application UI initializing...');
        setupRoleBasedNav();
        attachEventListeners();
        attachSubNavListeners();
        setupSearch('search-items', renderItemsTable, 'items', ['name', 'code', 'category']);
        setupSearch('search-suppliers', renderSuppliersTable, 'suppliers', ['name', 'supplierCode']);
        setupSearch('search-branches', renderBranchesTable, 'branches', ['name', 'branchCode']);
        setupSearch('search-sections', renderSectionsTable, 'sections', ['name', 'sectionCode']);
        setupSearch('stock-levels-search', renderItemCentricStockView, 'items', ['name', 'code']);
        updateUserBranchDisplay();
        updatePendingRequestsWidget();
        const firstVisibleView = document.querySelector('#main-nav .nav-item[style*="display:"]:not([style*="display: none"]) a')?.dataset.view || 'dashboard';
        showView(firstVisibleView);
        Logger.info('Application initialized successfully.');
    }
    
    function updateUserBranchDisplay() {
        const displayEl = document.getElementById('user-branch-display');
        if (!state.currentUser) { displayEl.textContent = ''; return; }
        const branch = findByKey(state.branches, 'branchCode', state.currentUser.AssignedBranchCode);
        const section = findByKey(state.sections, 'sectionCode', state.currentUser.AssignedSectionCode);
        let displayText = '';
        if (branch) displayText += `Branch: ${branch.name}`;
        if (section) displayText += `${displayText ? ' / ' : ''}Section: ${section.name}`;
        displayEl.textContent = displayText;
    }

    function init() {
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
