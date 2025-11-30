window.printReport = function(elementId) {
    const reportContent = document.querySelector(`#${elementId} .printable-document`);
    if (reportContent) {
        document.getElementById('print-area').innerHTML = reportContent.outerHTML;
        setTimeout(() => window.print(), 100);
    } else {
        alert("Error: Report content not found.");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // !!! IMPORTANT: PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwSM8G9AqHy6Nnhwcpit7xRJbKMkY93ACaHA3_3pzwZlNaF6ORzVL-Ev10FF7HQiu9M/exec';

    // --- STATE & CONSTANTS ---
    const Logger = {
        info: (m, ...a) => console.log(`[StockWise INFO] ${m}`, ...a),
        warn: (m, ...a) => console.warn(`[StockWise WARN] ${m}`, ...a),
        error: (m, ...a) => console.error(`[StockWise ERROR] ${m}`, ...a),
        debug: (m, ...a) => { if (state.currentUser && state.currentUser.RoleName === 'Admin') showToast(`DEBUG: ${m}`, 'info'); }
    };

    let state = {
        currentUser: null, username: null, loginCode: null, currentLanguage: 'en',
        items: [], suppliers: [], branches: [], transactions: [], payments: [],
        purchaseOrders: [], purchaseOrderItems: [], activityLog: [], settlements: [], settlementItems: [],
        currentReceiveList: [], currentTransferList: [], currentPOList: [], currentReturnList: [],
        currentEditingPOList: [], currentAdjustmentList: [], uploadedSalesData: [],
        salesReportDataByBranch: {}, modalSelections: new Set(), invoiceModalSelections: new Set(),
        allUsers: [], allRoles: [], backups: [], adminContextPromise: {},
    };
    let modalContext = null;

    // --- DOM ELEMENTS ---
    const loginContainer = document.getElementById('login-container');
    const loginForm = document.getElementById('login-form');
    const loginUsernameInput = document.getElementById('login-username');
    const loginCodeInput = document.getElementById('login-code');
    const loginError = document.getElementById('login-error');
    const loginLoader = document.getElementById('login-loader');
    const appContainer = document.getElementById('app-container');
    const btnLogout = document.getElementById('btn-logout');
    const globalRefreshBtn = document.getElementById('global-refresh-button');
    const mainContent = document.querySelector('.main-content');
    // Modals
    const itemSelectorModal = document.getElementById('item-selector-modal');
    const invoiceSelectorModal = document.getElementById('invoice-selector-modal');
    const editModal = document.getElementById('edit-modal');
    const historyModal = document.getElementById('history-modal');
    const editPOModal = document.getElementById('edit-po-modal');
    const subItemEntryModal = document.getElementById('sub-item-entry-modal');
    const settlementConfirmModal = document.getElementById('settlement-confirm-modal');
    const modalItemList = document.getElementById('modal-item-list');
    const modalSearchInput = document.getElementById('modal-search-items');
    const editModalBody = document.getElementById('edit-modal-body');
    const editModalTitle = document.getElementById('edit-modal-title');
    const formEditRecord = document.getElementById('form-edit-record');
    const viewTransferModal = document.getElementById('view-transfer-modal');

    const translations = {
        'en': {
            'packing_stock': 'Packing Stock', 'login_prompt': 'Please enter your credentials.', 'username': 'Username', 'password_code': 'Password / Login Code', 'login': 'Login', 'signing_in': 'Signing in...', 'loading': 'Loading...', 'hi_user': 'Hi, {userFirstName}', 'refresh_all_data': 'Refresh All Data', 'dashboard': 'Dashboard', 'stock_operations': 'Stock Operations', 'purchasing': 'Purchasing', 'payments': 'Payments', 'reports': 'Reports', 'stock_levels': 'Stock Levels', 'transaction_history': 'Transaction History', 'master_data': 'Master Data', 'user_management': 'User Management', 'backup_restore': 'Backup', 'activity_log': 'Activity Log', 'logout': 'Logout', 'branch': 'Branch', 'total_items': 'Total Items', 'total_stock_value': 'Total Stock Value', 'total_suppliers': 'Total Suppliers', 'total_branches': 'Total Branches', 'add_new_item': 'Add New Item', 'item_code': 'Item Code (Unique ID)', 'item_name': 'Item Name', 'default_cost': 'Default Cost', 'add_item_btn': 'Add Item', 'add_new_supplier': 'Add New Supplier', 'supplier_code': 'Supplier Code (Unique ID)', 'supplier_name': 'Supplier Name', 'add_supplier_btn': 'Add Supplier', 'add_new_branch': 'Add New Branch', 'branch_code': 'Branch Code (Unique ID)', 'branch_name': 'Branch Name', 'add_branch_btn': 'Add Branch', 'auto_backup_settings': 'Automatic Backup Settings', 'auto_backup_desc': 'Enable automatic backups to save a copy of your data periodically. Backups are stored in "StockApp Backups" in Google Drive.', 'enable_auto_backups': 'Enable Automatic Backups', 'backup_frequency': 'Backup Frequency', 'daily_backup': 'Daily (at 2am)', 'weekly_backup': 'Weekly (Sunday at 2am)', 'manual_backup_restore': 'Manual Backup & Restore', 'manual_backup_desc': 'Create an immediate backup or restore from a previously created file.', 'create_new_manual_backup': 'Create New Manual Backup', 'available_backups': 'Available Backups', 'loading_backups': 'Loading backup list...', 'no_backups_found': 'No backups found.', 'backup_name': 'Backup Name', 'date_created': 'Date Created', 'actions': 'Actions', 'open': 'Open', 'restore': 'Restore',
            'items': 'Items', 'suppliers': 'Suppliers', 'branches': 'Branches', 'view_items': 'View Items', 'add_item': 'Add Item', 'view_suppliers': 'View Suppliers', 'add_supplier': 'Add Supplier', 'view_branches': 'View Branches', 'add_branch': 'Add Branch', 'item_list': 'Item List', 'search_items_placeholder': 'Search by name or code...', 'export_to_excel': 'Export to Excel', 'table_h_code': 'Code', 'table_h_name': 'Name', 'table_h_cost': 'Default Cost', 'table_h_actions': 'Actions', 'no_items_found': 'No items found.', 'edit': 'Edit', 'history': 'History', 'supplier_list': 'Supplier List', 'search_suppliers_placeholder': 'Search by name or code...', 'table_h_balance': 'Balance (Owed)', 'no_suppliers_found': 'No suppliers found.', 'branch_list': 'Branch List', 'search_branches_placeholder': 'Search by name or code...', 'no_branches_found': 'No branches found.', 'record_payment': 'Record a Payment', 'step1_select_supplier': '1. Select Supplier', 'step2_select_invoices': '2. Select Invoices to Pay', 'select_invoices_btn': 'Select Invoices...', 'step3_payment_method': '3. Enter Payment Method', 'payment_method_placeholder': 'e.g., Cash, Bank Transfer', 'step4_confirm_amounts': '4. Confirm Amounts', 'table_h_invoice_no': 'Invoice #', 'table_h_balance_due': 'Balance Due', 'table_h_amount_to_pay': 'Amount to Pay', 'total_payment': 'Total Payment:', 'submit_payment_btn': 'Submit Payment',
            'supplier_statement': 'Supplier Statement', 'select_a_supplier': 'Select a Supplier', 'generate': 'Generate', 'select_a_branch': 'Select a Branch', 'all_items': 'All Items', 'all_branches': 'All Branches', 'receive_stock': 'Receive Stock', 'internal_transfer': 'Internal Transfer', 'return_to_supplier': 'Return to Supplier', 'in_transit_report': 'In-Transit Report', 'adjustments': 'Adjustments', 'pending_incoming_transfers': 'Pending Incoming Transfers', 'table_h_date_sent': 'Date Sent', 'table_h_from_branch': 'From Branch', 'table_h_ref_no': 'Reference #', 'view_confirm': 'View/Confirm', 'receive_stock_from_supplier': 'Receive Stock from Supplier', 'receive_against_po': 'Receive Against PO', 'optional': '(Optional)', 'select_a_po': 'Select a Purchase Order', 'to_branch': 'To Branch', 'notes_optional': 'Notes (Optional)', 'items_to_be_received': 'Items to be Received', 'table_h_quantity': 'Quantity', 'table_h_cost_per_unit': 'Cost/Unit', 'table_h_total': 'Total', 'grand_total': 'Grand Total:', 'select_items': 'Select Items', 'submit_for_approval': 'Submit for Approval', 'from_branch': 'From Branch', 'send_stock_to_branch': 'Send Stock to Another Branch', 'transfer_ref_no': 'Transfer Reference #', 'items_to_be_transferred': 'Items to be Transferred', 'table_h_qty_to_transfer': 'Quantity to Transfer', 'total_items_to_transfer': 'Total Items to Transfer:', 'confirm_transfer_all': 'Confirm & Transfer All Items', 'credit_note_ref': 'Credit Note Ref #', 'reason_for_return': 'Reason for Return (Optional)', 'items_to_return': 'Items to Return', 'table_h_qty_to_return': 'Qty to Return', 'total_return_value': 'Total Return Value:', 'confirm_return_all': 'Confirm & Return All Items', 'goods_in_transit_report': 'Goods In-Transit Report', 'table_h_to_branch': 'To Branch', 'table_h_status': 'Status', 'stock_count_adjustment': 'Stock Count Adjustment', 'reference': 'Reference', 'stocktake_example': 'e.g., Stocktake April 2024', 'notes_reason': 'Notes / Reason', 'items_to_adjust': 'Items to Adjust', 'table_h_system_qty': 'System Qty', 'table_h_physical_count': 'Physical Count', 'table_h_adjustment': 'Adjustment', 'process_stock_adjustment': 'Process Stock Adjustment', 'supplier_opening_balance': 'Supplier Opening Balance Adjustment', 'supplier_opening_balance_desc': 'Use this to set the initial amount owed to a supplier. This should typically only be done once per supplier when setting up.', 'opening_balance_amount': 'Opening Balance (Amount Owed)', 'set_opening_balance': 'Set Opening Balance', 'create_po': 'Create Purchase Order', 'view_pos': 'View Purchase Orders', 'pending_approval': 'Pending Approval', 'po_details': 'Purchase Order Details', 'po_ref_no': 'PO Reference #', 'items_to_order': 'Items to Order', 'po_list': 'Purchase Order List', 'table_h_po_no': 'PO #', 'table_h_date': 'Date', 'table_h_total_value': 'Total Value', 'tx_pending_financial_approval': 'Transactions Pending Financial Approval', 'table_h_type': 'Type', 'table_h_details': 'Details', 'table_h_amount': 'Amount', 'stock_by_item': 'Stock by Item', 'stock_by_item_your_branch': 'Stock by Item (Your Branch)', 'stock_by_item_all_branches': 'Stock by Item (All Branches)', 'search_items_stock_placeholder': 'Search by item name or code...', 'item_stock_inquiry': 'Item Stock Inquiry (Drill-down)', 'item_stock_inquiry_placeholder': 'Start typing an item name or code...', 'no_stock_for_item': 'No stock for this item.', 'table_h_qty': 'Qty', 'table_h_value': 'Value', 'transaction_log': 'Transaction Log', 'all_types': 'All Types', 'search_tx_placeholder': 'Search by Ref#, Item Code/Name...', 'table_h_batch_ref': 'Batch/Ref #', 'view_print': 'View/Print', 'users': 'Users', 'add_new_user': 'Add New User', 'table_h_fullname': 'Full Name', 'table_h_role': 'Role', 'table_h_assigned_branch_section': 'Assigned Branch', 'roles': 'Roles', 'add_new_role': 'Add New Role', 'table_h_rolename': 'Role Name', 'system_activity_log': 'System Activity Log', 'table_h_timestamp': 'Timestamp', 'table_h_user': 'User', 'table_h_action': 'Action', 'table_h_description': 'Description', 'select_items_modal_title': 'Select Items', 'search_items_placeholder_modal': 'Search items...', 'confirm_selection': 'Confirm Selection', 'cancel': 'Cancel', 'select_invoices_modal_title': 'Select Invoices to Pay', 'edit_modal_title': 'Edit', 'save_changes': 'Save Changes', 'confirm_transfer_receipt_modal_title': 'Confirm Transfer Receipt', 'reject': 'Reject', 'confirm_receipt': 'Confirm Receipt', 'item_history_modal_title': 'Item History', 'price_history': 'Price History', 'movement_history': 'Movement History', 'close': 'Close', 'edit_po_modal_title': 'Edit Purchase Order', 'restore_from_backup_modal_title': 'Restore from Backup', 'restore_from_backup_desc': 'You are about to restore data from the backup file:', 'restore_step1': '1. Select which data sheets to restore.', 'restore_step2': '2. Confirm this irreversible action.', 'restore_danger_warning': 'EXTREME DANGER:', 'restore_danger_text': 'This will permanently delete the current data in the selected live sheets and replace it with the data from the backup. This action CANNOT be undone.', 'restore_prompt': 'Please type RESTORE into the box below to proceed.', 'confirm_and_restore': 'Confirm and Restore Data', 'session_error_toast': 'Session error. Please logout and login again.', 'action_failed_toast': 'Action Failed: {errorMessage}', 'data_refreshed_toast': 'Data refreshed!', 'data_refresh_fail_toast': 'Could not refresh data. Please try again.', 'backup_created_toast': 'Backup created: {fileName}', 'backup_confirm_prompt': 'This will create a full, manual backup of the current spreadsheet. Continue?', 'auto_backup_updated_toast': 'Automatic backup settings updated!', 'auto_backup_failed_toast': 'Failed to update settings. Please try again.', 'restore_select_sheet_toast': 'You must select at least one sheet to restore.', 'restore_completed_toast': 'Restore completed successfully!', 'restore_find_id_fail_toast': 'Could not find backup file ID.', 'tx_processed_toast': '{txType} processed!', 'tx_processed_approval_toast': '{txType} processed! Submitted for approval.', 'select_po_first_toast': 'You must select a Purchase Order to receive stock.', 'fill_required_fields_toast': 'Please fill all required fields and add items.', 'status_approved': 'Approved', 'status_pending': 'Pending Approval', 'status_rejected': 'Rejected', 'status_completed': 'Completed', 'status_in_transit': 'In Transit', 'status_cancelled': 'Cancelled', 'po': 'Purchase Order', 'receive': 'Receive', 'transfer': 'Transfer', 'issue': 'Issue', 'return': 'Return', 'stock_adjustment': 'Stock Adjustment', 'history_for': 'History for: {itemName} ({itemCode})', 'edit_item': 'Edit Item', 'edit_supplier': 'Edit Supplier', 'edit_branch': 'Edit Branch', 'edit_user': 'Edit User', 'add_new_user_title': 'Add New User', 'edit_user_password_label': 'Password / Login Code (leave blank to keep unchanged)', 'edit_user_password_label_new': 'Password / Login Code', 'toggle_user_enable': 'Enable User', 'toggle_user_disable': 'Disable User', 'toggle_user_enable_confirm': 'Are you sure you want to enable this user? They will be able to log in again.', 'toggle_user_disable_confirm': 'Are you sure you want to disable this user? They will not be able to log in.', 'user_enabled_toast': 'User enabled successfully!', 'user_disabled_toast': 'User disabled successfully!', 'edit_permissions_for': 'Edit Permissions for {roleName}', 'delete_role': 'Delete Role', 'add_role_prompt': 'Enter new role name:', 'update_success_toast': '{type} updated successfully!', 'add_success_toast': '{type} added successfully!', 'no_invoices_for_supplier': 'No invoices found for this supplier.', 'no_unpaid_invoices': 'No unpaid invoices for this supplier.', 'invoice_modal_details': 'Date: {date} | Amount Due: {balance} EGP', 'no_items_selected_toast': 'No items selected. Click "Select Items".', 'no_items_for_adjustment': 'No items selected for adjustment.', 'report_period_all_time': 'for all time', 'report_period_from_to': 'from {startDate} to {endDate}', 'report_period_from': 'from {startDate}',
            'report_period_until': 'until {endDate}', 'supplier_statement_title': 'Supplier Statement: {supplierName}', 'date_generated': 'Date Generated:', 'table_h_debit': 'Debit', 'table_h_credit': 'Credit', 'opening_balance_as_of': 'Opening Balance as of {date}', 'closing_balance': 'Closing Balance:', 'price_change_log': 'Price Change Log', 'table_h_old_cost': 'Old Cost', 'table_h_new_cost': 'New Cost', 'table_h_change': 'Change', 'table_h_source': 'Source', 'table_h_updated_by': 'Updated By', 'no_price_history': 'No price history found for this item.', 'no_movements_found': 'No movements found for the selected filters.', 'table_h_qty_in': 'Qty In', 'table_h_qty_out': 'Qty Out', 'movement_details_receive': 'From: {supplier} To: {branch}', 'movement_details_transfer_out': 'Sent from: {fromBranch} To: {toBranch}', 'movement_details_transfer_in': 'Received at: {toBranch} From: {fromBranch}', 'movement_details_return': 'Returned from: {branch} To: {supplier}', 'movement_details_adjustment': 'Stock count at: {branch}', 'no_pending_financial_approval': 'No items are pending financial approval.', 'approve': 'Approve', 'approve_confirm_prompt': 'Are you sure you want to approve this {type}?', 'reject_confirm_prompt': 'Are you sure you want to reject this {type}? This action cannot be undone.', 'approved_toast': '{type} approved successfully!', 'rejected_toast': '{type} rejected successfully!', 'extraction': 'Extraction', 'is_sub_item': 'This is a Sub-Item', 'parent_item': 'Parent Item', 'select_parent_item': 'Select Parent Item', 'table_h_parent_item': 'Parent Item', 'extraction_title': 'Perform Production / Extraction', 'main_item_to_consume': 'Main Item to Consume', 'quantity_to_consume': 'Quantity to Consume', 'sub_items_produced': 'Sub-Items Produced', 'enter_produced_quantity': 'Enter Produced Quantity', 'confirm_extraction': 'Confirm Extraction', 'main_item_total': 'Main Item Total', 'extraction_in': 'Extraction In', 'extraction_out': 'Extraction Out', 'movement_details_extraction_out': 'Extracted at: {branch}', 'movement_details_extraction_in': 'Produced at: {branch}', 'enter_sub_item_quantities': 'Enter Sub-Item Quantities', 'add_to_transaction': 'Add to Transaction', 'total_sub_item_weight': 'Total Sub-Item Weight', 'show_cuts': 'Show Cuts', 'sales_data': 'Sales Data', 'sales_reconciliation': 'Sales Reconciliation', 'sales_data_desc': 'Upload daily sales data to generate a stock discrepancy report.', 'step1_download_template': '1. Download Template', 'download_template_desc': 'Download the Excel template with a list of all your items. The template will include a `branch` column.', 'download_template_btn': 'Download Sales Template', 'step2_upload_file': '2. Upload Completed File', 'upload_file_desc': 'Upload the filled-out Excel file. It must contain `itemCode`, `soldQty`, and branch codes as headers.', 'upload_btn': 'Choose Excel File', 'step3_generate_report': '3. Generate Discrepancy Report', 'select_branch_for_report': 'Select Branch for Report', 'generate_discrepancy_report_btn': 'Generate Report', 'sales_discrepancy_report': 'Sales Discrepancy Report', 'table_h_system_stock': 'System Stock', 'table_h_sold_qty': 'Sold Qty', 'table_h_expected_stock': 'Expected Stock', 'table_h_discrepancy': 'Closing Stock', 'file_upload_success': 'File uploaded successfully! {rows} rows of sales data loaded.', 'file_upload_error': 'Error reading file. Make sure it is a valid .xlsx file with itemCode and branch codes as headers.', 'no_sales_data_uploaded': 'No sales data has been uploaded yet.', 'settle_stock': 'Settle Stock', 'settlement_confirm_title': 'Confirm Stock Settlement', 'settlement_confirm_text': 'You are about to perform a stock settlement based on the uploaded sales data. This will create adjustment transactions for all items with a discrepancy.', 'settlement_confirm_warning': 'This action cannot be undone.', 'settlement_complete': 'Stock settlement completed successfully!', 'settlement_history': 'Settlement History', 'view_settlement': 'View Details',
        }
    };

    function _t(key, replacements = {}) {
        let text = translations[state.currentLanguage]?.[key] || translations['en'][key] || key;
        for (const placeholder in replacements) {
            text = text.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return text;
    }

    function applyTranslations() {
        const lang = state.currentLanguage;
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.querySelectorAll('[data-translate-key]').forEach(el => {
            const key = el.dataset.translateKey;
            el.textContent = _t(key);
        });
        document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
            const key = el.dataset.translatePlaceholder;
            el.placeholder = _t(key);
        });
    }

    function userCan(permission) {
        if (!state.currentUser || !state.currentUser.permissions) return false;
        const p = state.currentUser.permissions[permission];
        return p === true || String(p).toUpperCase() === 'TRUE';
    }

    function findByKey(array, key, value) {
        return (array || []).find(el => el && String(el[key]) === String(value));
    }

    function generateId(prefix) {
        return `${prefix}-${Date.now()}`;
    }

    function showToast(message, type = 'success') {
        if (type === 'error') Logger.error(`User Toast: ${message}`);
        const container = document.getElementById('toast-container');
        if (!container) return;
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
            const loaderText = (buttonEl.closest('#login-form')) ? _t('signing_in') : _t('loading');
            buttonEl.innerHTML = `<div class="button-spinner"></div><span>${loaderText}</span>`;
        } else {
            buttonEl.disabled = false;
            if (buttonEl.dataset.originalText) {
                buttonEl.innerHTML = buttonEl.dataset.originalText;
            }
        }
    }

    function populateOptions(el, data, ph, valueKey, textKey, textKey2) { 
        if (!el) { console.warn(`populateOptions failed: element is null for placeholder "${ph}"`); return; }
        el.innerHTML = `<option value="">${ph}</option>`; 
        (data || []).forEach(item => { 
            el.innerHTML += `<option value="${item[valueKey]}">${item[textKey]}${textKey2 && item[textKey2] ? ' (' + item[textKey2] + ')' : ''}</option>`;
        }); 
    }

    function getContextList() {
        if(modalContext === 'receive') return state.currentReceiveList;
        if(modalContext === 'transfer') return state.currentTransferList;
        if(modalContext === 'po') return state.currentPOList;
        return null;
    }

    // --- 2. API FUNCTIONS ---
    async function attemptLogin(username, loginCode) {
        if (!username || !loginCode) return;
        loginForm.style.display = 'none';
        loginError.textContent = '';
        loginLoader.style.display = 'flex';
        Logger.info(`Attempting to login...`);
        try {
            const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`);
            if (!response.ok) throw new Error(`Network error: ${response.status} ${response.statusText}`);
            const data = await response.json();
            if (data.status === 'error' || !data.user) {
                throw new Error(data.message || 'Invalid username or login code.');
            }
            if (data.user.isDisabled === true || String(data.user.isDisabled).toUpperCase() === 'TRUE') {
                throw new Error('This user account has been disabled. Please contact an administrator.');
            }
            state.username = username;
            state.loginCode = loginCode;
            state.currentUser = data.user;
            Object.keys(data).forEach(key => {
                if (key !== 'user') state[key] = data[key] || [];
            });
            Logger.info(`Login successful for user: ${state.currentUser.Name} (Role: ${state.currentUser.RoleName})`);
            
            const savedLang = localStorage.getItem('userLanguage') || 'en';
            state.currentLanguage = savedLang;
            document.getElementById('lang-switcher').value = savedLang;

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
        Logger.debug(`POSTing action: ${action}`, data);
        const { username, loginCode } = state;
        if (!username || !loginCode) {
            Logger.error("Authentication token missing. Cannot perform action.");
            showToast(_t('session_error_toast'), 'error');
            setButtonLoading(false, buttonEl);
            return null;
        }

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                body: JSON.stringify({ username, loginCode, action, data })
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'An unknown error occurred on the server.');
            Logger.info(`POST successful for ${action}`, result);
            return result;
        } catch (error) {
            const userMsg = _t('action_failed_toast', {errorMessage: error.message});
            Logger.error(userMsg, error);
            showToast(userMsg, 'error');
            return null;
        } finally {
            setButtonLoading(false, buttonEl);
        }
    }

    // --- 3. CALCULATIONS & LOGIC ---
    function calculateStockLevels() {
        const stock = {};
        (state.branches || []).forEach(branch => { stock[branch.branchCode] = {}; });
        const sortedTransactions = [...(state.transactions || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
        const tempAvgCosts = {};
        sortedTransactions.forEach(t => {
            const isApproved = t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE';
            if (t.type === 'receive' && !isApproved) return;
            
            const item = findByKey(state.items, 'code', t.itemCode);
            if (!item) return;
            const processStockUpdate = (branchCode, qtyChange, cost) => {
                if (!branchCode || !stock.hasOwnProperty(branchCode)) return;
                const current = stock[branchCode][t.itemCode] || { quantity: 0, avgCost: parseFloat(item.cost) || 0, itemName: item.name };
                
                if(qtyChange > 0) {
                    const totalValue = (current.quantity * current.avgCost) + (qtyChange * cost);
                    const totalQty = current.quantity + qtyChange;
                    let newAvgCost;
                    if (current.quantity < 0) {
                        newAvgCost = cost; 
                    } else {
                        newAvgCost = totalQty > 0 ? totalValue / totalQty : current.avgCost;
                    }
                    stock[branchCode][t.itemCode] = { itemCode: t.itemCode, quantity: totalQty, avgCost: newAvgCost, itemName: item.name };
                    if (!tempAvgCosts[branchCode]) tempAvgCosts[branchCode] = {};
                    tempAvgCosts[branchCode][t.itemCode] = newAvgCost;
                } else {
                    current.quantity += qtyChange;
                    stock[branchCode][t.itemCode] = current;
                }
            };
            const qty = parseFloat(t.quantity) || 0;
            switch (t.type) {
                case 'receive': processStockUpdate(t.branchCode, qty, parseFloat(t.cost) || 0); break;
                case 'transfer_out': processStockUpdate(t.fromBranchCode, -qty); break;
                case 'issue': processStockUpdate(t.fromBranchCode, -qty); break;
                case 'return_out': processStockUpdate(t.fromBranchCode, -qty); break;
                case 'adjustment_out': processStockUpdate(t.fromBranchCode, -qty); break;
                case 'extraction_out': processStockUpdate(t.fromBranchCode, -qty); break; 
                case 'transfer_in':
                    const fromAvgCost = tempAvgCosts[t.fromBranchCode]?.[t.itemCode] || findByKey(state.items, 'code', t.itemCode)?.cost || 0;
                    processStockUpdate(t.toBranchCode, qty, parseFloat(fromAvgCost));
                    break;
                case 'adjustment_in': processStockUpdate(t.fromBranchCode, qty, parseFloat(t.cost) || 0); break;
                case 'extraction_in': processStockUpdate(t.fromBranchCode, qty, parseFloat(t.cost) || 0); break;
            }
        });
        return stock;
    }

    function calculateSupplierFinancials() {
        const financials = {};
        (state.suppliers || []).forEach(s => { financials[s.supplierCode] = { supplierCode: s.supplierCode, supplierName: s.name, totalBilled: 0, totalPaid: 0, totalCredited: 0, balance: 0, invoices: {}, events: [] }; });
        (state.transactions || []).forEach(t => {
            const isApproved = t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE';
            if (!t.supplierCode || !financials[t.supplierCode] || t.cost === undefined) return;
            const value = (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0);
            if (t.type === 'receive' && isApproved) {
                financials[t.supplierCode].totalBilled += value;
                const invNum = t.invoiceNumber;
                if (!financials[t.supplierCode].invoices[invNum]) { financials[t.supplierCode].invoices[invNum] = { number: invNum, date: t.date, total: 0, paid: 0 }; }
                financials[t.supplierCode].invoices[invNum].total += value;
            } else if (t.type === 'return_out') {
                financials[t.supplierCode].totalCredited += value;
            }
        });
        (state.payments || []).forEach(p => { 
            if (financials[p.supplierCode]) { 
                const amount = parseFloat(p.amount) || 0;
                if (p.method === 'OPENING BALANCE') {
                    financials[p.supplierCode].totalBilled += amount;
                } else {
                    financials[p.supplierCode].totalPaid += amount;
                }
                if (p.invoiceNumber && financials[p.supplierCode].invoices[p.invoiceNumber]) { 
                    financials[p.supplierCode].invoices[p.invoiceNumber].paid += amount;
                } else if (p.method === 'OPENING BALANCE') {
                    financials[p.supplierCode].invoices[p.invoiceNumber] = { number: p.invoiceNumber, date: p.date, total: amount, paid: 0 };
                }
            } 
        });
        Object.values(financials).forEach(s => {
            s.balance = s.totalBilled - s.totalPaid - s.totalCredited;
            Object.values(s.invoices).forEach(inv => { inv.balance = inv.total - inv.paid; if (Math.abs(inv.balance) < 0.01) { inv.status = 'Paid'; } else if (inv.paid > 0) { inv.status = 'Partial'; } else { inv.status = 'Unpaid'; } });
            const allEvents = [
                ...Object.values(s.invoices).map(i => ({ date: i.date, type: 'Invoice/OB', ref: i.number, debit: i.total, credit: 0 })),
                ...(state.transactions || []).filter(t => t.type === 'return_out' && t.supplierCode === s.supplierCode).map(t => ({ date: t.date, type: 'Return (Credit)', ref: t.ref, debit: 0, credit: (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0) })),
                ...(state.payments || []).filter(p => p.supplierCode === s.supplierCode && p.method !== 'OPENING BALANCE').map(p => ({ date: p.date, type: 'Payment', ref: p.paymentId, debit: 0, credit: (parseFloat(p.amount) || 0) }))
            ];
            s.events = allEvents.sort((a,b) => new Date(a.date) - new Date(b.date));
        });
        financials.allInvoices = {}; Object.values(financials).forEach(s => { Object.assign(financials.allInvoices, s.invoices); }); return financials;
    }

    function prepareListForSubmission(list) {
        const processedList = [];
        const groupedList = {};
        list.forEach(item => {
            const itemDetails = findByKey(state.items, 'code', item.itemCode);
            if (itemDetails && itemDetails.ParentItemCode) {
                const parentCode = itemDetails.ParentItemCode;
                if (!groupedList[parentCode]) groupedList[parentCode] = { parent: null, children: [] };
                groupedList[parentCode].children.push(item);
            } else {
                if (item.isMainItemPlaceholder) {
                    if (!groupedList[item.itemCode]) groupedList[item.itemCode] = { parent: item, children: [] };
                    else groupedList[item.itemCode].parent = item;
                } else { processedList.push(item); }
            }
        });
        Object.values(groupedList).forEach(group => {
            if (group.parent && group.parent.isMainItemPlaceholder) {
                const totalBatchValue = parseFloat(group.parent.cost) || 0; 
                let totalBatchWeight = 0;
                group.children.forEach(child => totalBatchWeight += (parseFloat(child.quantity) || 0));
                const derivedUnitCost = totalBatchWeight > 0 ? (totalBatchValue / totalBatchWeight) : 0;
                group.children.forEach(child => {
                    const childCopy = { ...child };
                    childCopy.cost = derivedUnitCost;
                    processedList.push(childCopy);
                });
            } else { group.children.forEach(child => processedList.push(child)); }
        });
        return processedList;
    }

    // --- 4. RENDERERS ---
    function updateReceiveGrandTotal() { 
        let grandTotal = 0; 
        (state.currentReceiveList || []).forEach(item => { 
            const itemDetails = findByKey(state.items, 'code', item.itemCode);
            if(item.isMainItemPlaceholder) {
                grandTotal += (parseFloat(item.cost) || 0);
            } else if(itemDetails && !itemDetails.ParentItemCode) { 
                grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); 
            } 
        }); 
        document.getElementById('receive-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; 
    }
    
   function updateTransferGrandTotal() { 
        let grandTotalQty = 0; 
        (state.currentTransferList || []).forEach(item => { 
            grandTotalQty += (parseFloat(item.quantity) || 0); 
        }); 
        document.getElementById('transfer-grand-total').textContent = grandTotalQty.toFixed(2); 
    }
    
    function updatePOGrandTotal() { 
        let grandTotal = 0; 
        (state.currentPOList || []).forEach(item => { 
            if(item.isMainItemPlaceholder) {
                grandTotal += (parseFloat(item.cost) || 0);
            } else if(!findByKey(state.items, 'code', item.itemCode)?.ParentItemCode) { 
                grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); 
            } 
        }); 
        document.getElementById('po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; 
    }
    
    function updatePOEditGrandTotal() { 
        let grandTotal = 0; 
        (state.currentEditingPOList || []).forEach(item => { 
            const itemDetails = findByKey(state.items, 'code', item.itemCode);
            if(itemDetails && !itemDetails.ParentItemCode) { 
                 grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); 
            }
        }); 
        document.getElementById('edit-po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; 
    }
    
    function updateReturnGrandTotal() { 
        let grandTotal = 0; 
        (state.currentReturnList || []).forEach(item => { 
            if(item.isMainItemPlaceholder) {
                grandTotal += (parseFloat(item.cost) || 0);
            } else if(!findByKey(state.items, 'code', item.itemCode)?.ParentItemCode) { 
                grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); 
            } 
        }); 
        document.getElementById('return-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; 
    }

    function renderDynamicListTable(tbodyId, list, columnsConfig, emptyMessage, totalizerFn) {
        const tbody = document.getElementById(tbodyId).querySelector('tbody');
        tbody.innerHTML = '';
        if (!list || list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columnsConfig.length + 1}" style="text-align:center;">${_t(emptyMessage)}</td></tr>`;
            if (totalizerFn) totalizerFn();
            return;
        }

        const stock = calculateStockLevels();
        const branchCode = document.getElementById(columnsConfig.find(c => c.branchSelectId)?.branchSelectId)?.value;

        const groupedMap = {}; 
        const standaloneList = []; 

        list.forEach((item, index) => {
            if (item.isMainItemPlaceholder) {
                if (!groupedMap[item.itemCode]) {
                    groupedMap[item.itemCode] = { parentIndex: index, parentItem: item, children: [] };
                } else {
                    groupedMap[item.itemCode].parentIndex = index;
                    groupedMap[item.itemCode].parentItem = item;
                }
            } else {
                const itemDetails = findByKey(state.items, 'code', item.itemCode);
                if (itemDetails && itemDetails.ParentItemCode) {
                    if (!groupedMap[itemDetails.ParentItemCode]) {
                        groupedMap[itemDetails.ParentItemCode] = { parentIndex: -1, parentItem: null, children: [] };
                    }
                    groupedMap[itemDetails.ParentItemCode].children.push({ item, index });
                } else {
                    standaloneList.push({ item, index });
                }
            }
        });

        const allGroups = [...Object.values(groupedMap), ...standaloneList.map(s => ({ parentIndex: s.index, parentItem: s.item, children: [], isStandalone: true }))];
        allGroups.sort((a, b) => {
            const idxA = a.parentIndex > -1 ? a.parentIndex : (a.children[0]?.index || 9999);
            const idxB = b.parentIndex > -1 ? b.parentIndex : (b.children[0]?.index || 9999);
            return idxA - idxB;
        });

        allGroups.forEach(group => {
            if (!group.parentItem && group.children.length === 0) return;

            if (group.parentItem) {
                const parentItem = group.parentItem;
                const parentIndex = group.parentIndex;
                const isMainPlaceholder = parentItem.isMainItemPlaceholder;
                
                let totalSubItemWeight = 0;
                if (isMainPlaceholder) {
                    totalSubItemWeight = group.children.reduce((sum, entry) => sum + (parseFloat(entry.item.quantity) || 0), 0);
                }

                const tr = document.createElement('tr');
                if (isMainPlaceholder) tr.classList.add('main-item-group-header');

                let cellsHtml = '';
                let currentItem = parentItem;
                
                const currentItemQty = isMainPlaceholder ? totalSubItemWeight : (parseFloat(currentItem.quantity) || 0);
                const currentItemCost = parseFloat(currentItem.cost) || 0;
                
                columnsConfig.forEach(col => {
                    let content = '';
                    switch (col.type) {
                        case 'text': content = currentItem[col.key]; break;
                        case 'number_input':
                            const readOnlyAttr = isMainPlaceholder ? 'readonly' : '';
                            const valueDisplay = isMainPlaceholder ? currentItemQty.toFixed(2) : (currentItem.quantity || '');
                            content = `<input type="number" class="table-input" value="${valueDisplay}" min="${col.min || 0.01}" ${col.maxKey ? `max="${(stock[branchCode]?.[currentItem.itemCode]?.quantity || 0)}"` : ''} step="0.01" data-index="${parentIndex}" data-field="${col.key}" ${readOnlyAttr}>`;
                            break;
                        case 'cost_input':
                            if (isMainPlaceholder) {
                                content = `<input type="number" class="table-input" value="${currentItemCost.toFixed(2)}" min="0" step="0.01" data-index="${parentIndex}" data-field="cost" title="Enter Total Batch Value here">`;
                            } else {
                                content = `<input type="number" class="table-input" value="${currentItemCost.toFixed(2)}" min="0" step="0.01" data-index="${parentIndex}" data-field="cost">`;
                            }
                            break;
                        case 'calculated': 
                            let calculatedValue;
                            if (isMainPlaceholder) {
                                calculatedValue = currentItemCost; 
                            } else {
                                calculatedValue = currentItemQty * currentItemCost;
                            }
                            content = `<span>${calculatedValue.toFixed(2)} EGP</span>`;
                            break;
                        case 'available_stock': content = (stock[branchCode]?.[currentItem.itemCode]?.quantity || 0).toFixed(2); break;
                    }
                    cellsHtml += `<td>${content}</td>`;
                });
                
                cellsHtml += `<td>${!isMainPlaceholder ? `<button class="danger small" data-index="${parentIndex}">X</button>` : '---'}</td>`;
                tr.innerHTML = cellsHtml;
                tbody.appendChild(tr);
            }

            group.children.forEach(entry => {
                const subItem = entry.item;
                const subIndex = entry.index;
                const subTr = document.createElement('tr');
                subTr.classList.add('sub-item-row');
                
                let subCellsHtml = '';
                columnsConfig.forEach(col => {
                    let subContent = '';
                    switch (col.type) {
                        case 'text': subContent = subItem[col.key]; break;
                        case 'number_input': 
                            const subAvailableStock = (branchCode && stock[branchCode]?.[subItem.itemCode]?.quantity || 0);
                            subContent = `<input type="number" class="table-input" value="${subItem[col.key] || ''}" min="${col.min || 0}" step="0.01" data-index="${subIndex}" data-field="${col.key}" ${col.maxKey ? `max="${subAvailableStock}"` : ''}>`;
                            break;
                        case 'cost_input': 
                        case 'calculated': 
                            subContent = '---'; 
                            break;
                        case 'available_stock': 
                            subContent = (stock[branchCode]?.[subItem.itemCode]?.quantity || 0).toFixed(2); 
                            break;
                    }
                    subCellsHtml += `<td>${subContent}</td>`;
                });
                
                subCellsHtml += `<td><button class="danger small" data-index="${subIndex}">X</button></td>`;
                subTr.innerHTML = subCellsHtml;
                tbody.appendChild(subTr);
            });
        });

        if (totalizerFn) totalizerFn();
    }

    function renderReceiveListTable() { renderDynamicListTable('table-receive-list', state.currentReceiveList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' } ], 'no_items_selected_toast', updateReceiveGrandTotal); }
    function renderTransferListTable() { renderDynamicListTable('table-transfer-list', state.currentTransferList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'transfer-from-branch' } ], 'no_items_selected_toast', updateTransferGrandTotal); }
    function renderPOListTable() { renderDynamicListTable('table-po-list', state.currentPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' } ], 'no_items_selected_toast', updatePOGrandTotal); }
    function renderPOEditListTable() { renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' } ], 'no_items_selected_toast', updatePOEditGrandTotal); }
    function renderReturnListTable() { renderDynamicListTable('table-return-list', state.currentReturnList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'return-branch' }, { type: 'cost_input', key: 'cost' } ], 'no_items_selected_toast', updateReturnGrandTotal); }

    function renderAdjustmentListTable() {
        const tbody = document.getElementById('table-adjustment-list').querySelector('tbody');
        tbody.innerHTML = '';
        if (!state.currentAdjustmentList || state.currentAdjustmentList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_items_for_adjustment')}</td></tr>`;
            return;
        }
        const stock = calculateStockLevels();
        const branchCode = document.getElementById('adjustment-branch').value;

        state.currentAdjustmentList.forEach((item, index) => {
            const systemQty = (stock[branchCode]?.[item.itemCode]?.quantity) || 0;
            const physicalCount = typeof item.physicalCount !== 'undefined' ? item.physicalCount : '';
            const adjustment = physicalCount - systemQty;
            
            item.physicalCount = physicalCount;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.itemCode}</td>
                <td>${item.itemName}</td>
                <td>${systemQty.toFixed(2)}</td>
                <td><input type="number" class="table-input" value="${physicalCount}" min="0" step="0.01" data-index="${index}" data-field="physicalCount"></td>
                <td style="font-weight: bold; color: ${adjustment > 0 ? 'var(--secondary-color)' : (adjustment < 0 ? 'var(--danger-color)' : 'inherit')}">${adjustment.toFixed(2)}</td>
                <td><button class="danger small" data-index="${index}">X</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderTransactionHistory(filters = {}) {
        const tbody = document.getElementById('table-transaction-history').querySelector('tbody');
        tbody.innerHTML = '';
        
        let allTx = [...state.transactions];
        let allPo = [...state.purchaseOrders];

        if (!userCan('viewAllBranches')) {
            const branchCode = state.currentUser.AssignedBranchCode;
            if (branchCode) {
                allTx = allTx.filter(t => 
                    String(t.branchCode) === branchCode || 
                    String(t.fromBranchCode) === branchCode || 
                    String(t.toBranchCode) === branchCode
                );
                allPo = []; 
            }
        }
        
        let allHistoryItems = [ ...allTx, ...allPo.map(po => ({...po, type: 'po', batchId: po.poId, ref: po.poId})) ];

        const sDate = filters.startDate ? new Date(filters.startDate) : null;
        if(sDate) sDate.setHours(0,0,0,0);
        const eDate = filters.endDate ? new Date(filters.endDate) : null;
        if(eDate) eDate.setHours(23,59,59,999);

        if (sDate) allHistoryItems = allHistoryItems.filter(t => new Date(t.date) >= sDate);
        if (eDate) allHistoryItems = allHistoryItems.filter(t => new Date(t.date) <= eDate);
        if (filters.type) allHistoryItems = allHistoryItems.filter(t => String(t.type) === String(filters.type));
        
        if (filters.branch) {
            allHistoryItems = allHistoryItems.filter(t => 
                String(t.branchCode) === String(filters.branch) || 
                String(t.fromBranchCode) === String(filters.branch) || 
                String(t.toBranchCode) === String(filters.branch)
            );
        }

        if (filters.searchTerm) {
            const lowerFilter = filters.searchTerm.toLowerCase();
            allHistoryItems = allHistoryItems.filter(t => {
                const item = findByKey(state.items, 'code', t.itemCode);
                return (t.ref && String(t.ref).toLowerCase().includes(lowerFilter)) ||
                       (t.batchId && String(t.batchId).toLowerCase().includes(lowerFilter)) ||
                       (t.invoiceNumber && String(t.invoiceNumber).toLowerCase().includes(lowerFilter)) ||
                       (item && item.name.toLowerCase().includes(lowerFilter));
            });
        }

        const grouped = {};
        allHistoryItems.forEach(t => {
            const key = t.batchId;
            if (!key) return;
            if (!grouped[key]) grouped[key] = { date: t.date, type: t.type, batchId: key, transactions: [] };
            grouped[key].transactions.push(t);
        });

        Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(group => {
            const first = group.transactions[0];
            let details = '', statusTag = '', refNum = first.ref || first.batchId, typeDisplay = first.type.replace(/_/g, ' ').toUpperCase();
            const canEditInvoice = userCan('opEditInvoice') && first.type === 'receive' && (first.isApproved !== true && String(first.isApproved).toUpperCase() !== 'TRUE');

            let actionsHtml = `<button class="secondary small btn-view-tx" data-batch-id="${group.batchId}" data-type="${first.type}">${_t('view_print')}</button>`;
            if(canEditInvoice){
                actionsHtml += `<button class="secondary small btn-edit-invoice" data-batch-id="${group.batchId}">${_t('edit')}</button>`;
            }

            switch(first.type) {
                case 'receive':
                    details = `${_t('receive')} ${group.transactions.length} ${_t('items')} from <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong> to <strong>${findByKey(state.branches, 'branchCode', first.branchCode)?.branchName || 'N/A'}</strong>`;
                    refNum = first.invoiceNumber;
                    statusTag = first.isApproved === true || String(first.isApproved).toUpperCase() === 'TRUE' ? `<span class="status-tag status-approved">${_t('status_approved')}</span>` : `<span class="status-tag status-pendingapproval">${_t('status_pending')}</span>`;
                    break;
                case 'return_out':
                    details = `${_t('return')} ${group.transactions.length} ${_t('items')} from <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName || 'N/A'}</strong> to <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`;
                    typeDisplay = _t('return_to_supplier');
                    break;
                case 'issue':
                    details = `Consumed ${group.transactions.length} items at <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName || 'N/A'}</strong>`;
                    break;
                case 'transfer_out':
                case 'transfer_in':
                     details = `${_t('transfer')} ${group.transactions.length} ${_t('items')} from <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName || 'N/A'}</strong> to <strong>${findByKey(state.branches, 'branchCode', first.toBranchCode)?.branchName || 'N/A'}</strong>`;
                     typeDisplay = _t('transfer');
                     statusTag = `<span class="status-tag status-${(first.Status || '').toLowerCase().replace(/ /g,'')}">${_t('status_' + (first.Status || '').toLowerCase().replace(/ /g,''))}</span>`;
                     break;
                case 'po':
                    typeDisplay = _t('po');
                    details = `${_t('create_po')} for <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`;
                    statusTag = `<span class="status-tag status-${(first.Status || 'pending').toLowerCase().replace(/ /g,'')}">${_t('status_' + (first.Status || 'pending').toLowerCase().replace(/ /g,''))}</span>`;
                    break;
                case 'adjustment_in':
                case 'adjustment_out':
                     typeDisplay = _t('stock_adjustment');
                     details = `${_t('adjustments')} ${group.transactions.length} ${_t('items')} at <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName || 'N/A'}</strong>`;
                     break;
                case 'extraction_in':
                case 'extraction_out':
                    typeDisplay = _t('extraction');
                    const mainItemTx = group.transactions.find(t => t.type === 'extraction_out');
                    const mainItem = mainItemTx ? findByKey(state.items, 'code', mainItemTx.itemCode) : null;
                    details = mainItem ? `Extraction from ${mainItem.name} at <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName || 'N/A'}</strong>` : 'Extraction';
                    break;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(first.date).toLocaleString()}</td><td>${typeDisplay}</td><td>${refNum}</td><td>${details}</td><td>${statusTag}</td><td><div class="action-buttons">${actionsHtml}</div></td>`;
            tbody.appendChild(tr);
        });
    }

    function renderItemsTable(data = state.items) {
        const tbody = document.getElementById('table-items').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${_t('no_items_found')}</td></tr>`;
            return;
        }
        const canEdit = userCan('editItem');
        data.forEach(item => {
            const parentItem = item.ParentItemCode ? findByKey(state.items, 'code', item.ParentItemCode) : null;
            const parentName = parentItem ? `${parentItem.name} (${parentItem.code})` : 'N/A';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.code}</td>
                <td>${item.name}</td>
                <td>${parentName}</td>
                <td>${(parseFloat(item.cost) || 0).toFixed(2)} EGP</td>
                <td>
                    <div class="action-buttons">
                        <button class="secondary small btn-edit" data-type="item" data-id="${item.code}" ${!canEdit ? 'disabled' : ''}>${_t('edit')}</button>
                        <button class="secondary small btn-history" data-type="item" data-id="${item.code}">${_t('history')}</button>
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    }

    function renderSuppliersTable(data = state.suppliers) {
        const tbody = document.getElementById('table-suppliers').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">${_t('no_suppliers_found')}</td></tr>`;
            return;
        }
        const financials = calculateSupplierFinancials();
        const canEdit = userCan('editSupplier');
        data.forEach(supplier => {
            const balance = financials[supplier.supplierCode]?.balance || 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${supplier.supplierCode || ''}</td><td>${supplier.name}</td><td>${balance.toFixed(2)} EGP</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="supplier" data-id="${supplier.supplierCode}">${_t('edit')}</button>`: 'N/A'}</td>`;
            tbody.appendChild(tr);
        });
    }

    function renderBranchesTable(data = state.branches) {
        const tbody = document.getElementById('table-branches').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${_t('no_branches_found')}</td></tr>`;
            return;
        }
        const canEdit = userCan('editBranch');
        data.forEach(branch => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${branch.branchCode || ''}</td><td>${branch.branchName}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="branch" data-id="${branch.branchCode}">${_t('edit')}</button>`: 'N/A'}</td>`;
            tbody.appendChild(tr);
        });
    }
    
    function renderUserManagementUI() {
        const usersTbody = document.getElementById('table-users').querySelector('tbody');
        usersTbody.innerHTML = '';
        (state.allUsers || []).forEach(user => {
            const tr = document.createElement('tr');
            const assigned = findByKey(state.branches, 'branchCode', user.AssignedBranchCode);
            const isDisabled = user.isDisabled === true || String(user.isDisabled).toUpperCase() === 'TRUE';
            tr.innerHTML = `<td>${user.Username}</td><td>${user.Name}</td><td>${user.RoleName}</td><td>${assigned?.branchName || 'N/A'}</td><td><span class="status-tag ${isDisabled ? 'status-rejected' : 'status-approved'}">${isDisabled ? 'Disabled' : 'Active'}</span></td><td><button class="secondary small btn-edit" data-type="user" data-id="${user.Username}">${_t('edit')}</button></td>`;
            usersTbody.appendChild(tr);
        });
        const rolesTbody = document.getElementById('table-roles').querySelector('tbody');
        rolesTbody.innerHTML = '';
        (state.allRoles || []).forEach(role => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${role.RoleName}</td><td><button class="secondary small btn-edit" data-type="role" data-id="${role.RoleName}">${_t('edit')}</button></td>`;
            rolesTbody.appendChild(tr);
        });
    }

    function renderPurchaseOrdersViewer() {
        const tbody = document.getElementById('table-po-viewer').querySelector('tbody');
        tbody.innerHTML = '';
        (state.purchaseOrders || []).slice().reverse().forEach(po => {
            const supplier = findByKey(state.suppliers, 'supplierCode', po.supplierCode);
            const items = (state.purchaseOrderItems || []).filter(item => item.poId === po.poId);
            const tr = document.createElement('tr');
            const canEditPO = po.Status === 'Pending Approval' && userCan('opCreatePO');
            tr.innerHTML = `
                <td>${po.poId}</td>
                <td>${new Date(po.date).toLocaleDateString()}</td>
                <td>${supplier?.name || po.supplierCode}</td>
                <td>${items.length}</td>
                <td>${(parseFloat(po.totalValue) || 0).toFixed(2)} EGP</td>
                <td><span class="status-tag status-${(po.Status || 'pending').toLowerCase().replace(/ /g,'')}">${po.Status}</span></td>
                <td><div class="action-buttons">
                    <button class="secondary small btn-view-tx" data-batch-id="${po.poId}" data-type="po">${_t('view_print')}</button>
                    ${canEditPO ? `<button class="secondary small btn-edit-po" data-po-id="${po.poId}">${_t('edit')}</button>` : ''}
                </div></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderPendingFinancials() {
        const tbody = document.getElementById('table-pending-financial-approval').querySelector('tbody');
        tbody.innerHTML = '';
        
        const pendingPOs = (state.purchaseOrders || []).filter(po => po.Status === 'Pending Approval');
        
        const pendingReceivesGroups = {};
        (state.transactions || []).filter(t => t.type === 'receive' && (t.isApproved === false || String(t.isApproved).toUpperCase() === 'FALSE')).forEach(t => {
            if (!pendingReceivesGroups[t.batchId]) {
                pendingReceivesGroups[t.batchId] = {
                    date: t.date,
                    txType: 'receive',
                    ref: t.invoiceNumber,
                    batchId: t.batchId,
                    details: `GRN from ${findByKey(state.suppliers, 'supplierCode', t.supplierCode)?.name || 'N/A'}`,
                    totalValue: 0
                };
            }
            pendingReceivesGroups[t.batchId].totalValue += (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0);
        });

        let allPending = [
            ...pendingPOs.map(po => ({...po, txType: 'po', ref: po.poId, value: po.totalValue, details: `PO for ${findByKey(state.suppliers, 'supplierCode', po.supplierCode)?.name || 'N/A'}`})),
            ...Object.values(pendingReceivesGroups).map(rcv => ({...rcv, value: rcv.totalValue}))
        ];

        if (allPending.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${_t('no_pending_financial_approval')}</td></tr>`;
            return;
        }

        allPending.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(item.date).toLocaleDateString()}</td>
                <td>${_t(item.txType)}</td>
                <td>${item.ref}</td>
                <td>${item.details}</td>
                <td>${(parseFloat(item.value) || 0).toFixed(2)} EGP</td>
                <td>
                    <div class="action-buttons">
                        <button class="primary small btn-approve-financial" data-id="${item.txType === 'po' ? item.poId : item.batchId}" data-type="${item.txType}">${_t('approve')}</button>
                        <button class="danger small btn-reject-financial" data-id="${item.txType === 'po' ? item.poId : item.batchId}" data-type="${item.txType}">${_t('reject')}</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    function renderPendingTransfers() {
        const container = document.getElementById('pending-transfers-card');
        const tbody = document.getElementById('table-pending-transfers').querySelector('tbody');
        tbody.innerHTML = '';
        const groupedTransfers = {};
        (state.transactions || []).filter(t => t.type === 'transfer_out' && t.Status === 'In Transit').forEach(t => {
            if (!groupedTransfers[t.batchId]) groupedTransfers[t.batchId] = { ...t, items: [] };
            groupedTransfers[t.batchId].items.push(t);
        });
        const visibleTransfers = Object.values(groupedTransfers).filter(t => userCan('viewAllBranches') || t.toBranchCode === state.currentUser.AssignedBranchCode);
        
        if (visibleTransfers.length === 0) {
            container.style.display = 'none'; return;
        }

        tbody.innerHTML = '';
        visibleTransfers.forEach(t => {
            const tr = document.createElement('tr');
            const fromBranch = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || t.fromBranchCode;
            tr.innerHTML = `<td>${new Date(t.date).toLocaleString()}</td><td>${fromBranch}</td><td>${t.ref}</td><td>${t.items.length}</td><td><button class="primary small btn-receive-transfer" data-batch-id="${t.batchId}">${_t('view_confirm')}</button></td>`;
            tbody.appendChild(tr);
        });
        container.style.display = 'block';
    }

    function renderInTransitReport() {
        const tbody = document.getElementById('table-in-transit').querySelector('tbody');
        tbody.innerHTML = '';
        const groupedTransfers = {};
        (state.transactions || []).filter(t => t.type === 'transfer_out').forEach(t => {
            if (!groupedTransfers[t.batchId]) groupedTransfers[t.batchId] = { ...t, items: [] };
            groupedTransfers[t.batchId].items.push(t);
        });
        const visibleTransfers = Object.values(groupedTransfers).filter(t => userCan('viewAllBranches') || t.toBranchCode === state.currentUser.AssignedBranchCode || t.fromBranchCode === state.currentUser.AssignedBranchCode);
        
        visibleTransfers.forEach(t => {
            const tr = document.createElement('tr');
            const fromBranch = findByKey(state.branches, 'branchCode', t.fromBranchCode)?.branchName || t.fromBranchCode;
            const toBranch = findByKey(state.branches, 'branchCode', t.toBranchCode)?.branchName || t.toBranchCode;
            const canManage = (userCan('viewAllBranches') || t.fromBranchCode === state.currentUser.AssignedBranchCode) && t.Status === 'In Transit';
            const actions = canManage ? `<div class="action-buttons"><button class="secondary small btn-edit-transfer" data-batch-id="${t.batchId}">${_t('edit')}</button><button class="danger small btn-cancel-transfer" data-batch-id="${t.batchId}">${_t('cancel')}</button></div>` : 'N/A';
            tr.innerHTML = `<td>${new Date(t.date).toLocaleString()}</td><td>${fromBranch}</td><td>${toBranch}</td><td>${t.ref}</td><td>${t.items.length}</td><td><span class="status-tag status-${t.Status.toLowerCase().replace(/ /g,'')}">${_t('status_' + t.Status.toLowerCase().replace(/ /g, ''))}</span></td><td>${actions}</td>`;
            tbody.appendChild(tr);
        });
    }

    function renderActivityLog() {
        const tbody = document.getElementById('table-activity-log').querySelector('tbody');
        tbody.innerHTML = '';
        if (!state.activityLog || state.activityLog.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No activity logged.</td></tr>`;
            return;
        }
        state.activityLog.slice().reverse().forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(log.Timestamp).toLocaleString()}</td><td>${log.User || 'N/A'}</td><td>${log.Action}</td><td>${log.Description}</td>`;
            tbody.appendChild(tr);
        });
    }

    function renderSettlementHistory() {
        const tbody = document.getElementById('table-settlement-history').querySelector('tbody');
        tbody.innerHTML = '';
        if (!state.settlements || state.settlements.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No settlement history found.</td></tr>`;
            return;
        }

        state.settlements.slice().reverse().forEach(settlement => {
            const branch = findByKey(state.branches, 'branchCode', settlement.branchCode);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${settlement.settlementId}</td>
                <td>${new Date(settlement.date).toLocaleString()}</td>
                <td>${branch?.branchName || settlement.branchCode}</td>
                <td>${settlement.settledBy}</td>
                <td><button class="secondary small btn-view-settlement" data-id="${settlement.settlementId}">${_t('view_settlement')}</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderExtractionPreview() {
        const mainItemCode = document.getElementById('extraction-main-item').value;
        const quantity = parseFloat(document.getElementById('extraction-quantity').value) || 0;
        const branchCode = document.getElementById('extraction-branch').value;
        const previewContainer = document.getElementById('extraction-preview-container');

        if (!mainItemCode || !branchCode || quantity <= 0) {
            previewContainer.innerHTML = '';
            return;
        }

        const mainItem = findByKey(state.items, 'code', mainItemCode);
        const subItems = state.items.filter(i => i.ParentItemCode === mainItemCode);
        const stock = calculateStockLevels();
        const availableQty = stock[branchCode]?.[mainItemCode]?.quantity || 0;

        if (quantity > availableQty) {
            previewContainer.innerHTML = `<p class="login-error">Error: Quantity to consume (${quantity}) exceeds available stock (${availableQty}).</p>`;
            return;
        }

        let html = `<h4>${_t('sub_items_produced')}</h4>
            <table id="table-extraction-preview">
            <thead><tr><th>${_t('table_h_name')}</th><th>${_t('enter_produced_quantity')}</th></tr></thead>
            <tbody>`;

        if (subItems.length === 0) {
            html += `<tr><td colspan="2" style="text-align:center;">This main item has no sub-items defined.</td></tr>`;
        } else {
            subItems.forEach(sub => {
                html += `<tr><td>${sub.name} (${sub.code})</td><td><input type="number" class="table-input" data-item-code="${sub.code}" step="0.01" min="0"></td></tr>`;
            });
        }

        html += '</tbody></table>';
        previewContainer.innerHTML = html;
    }

    function renderSalesDiscrepancyReport() {
        const resultsContainer = document.getElementById('sales-report-results');
        const exportBtn = document.getElementById('btn-export-sales-report');
        
        if (state.uploadedSalesData.length === 0) {
            showToast(_t('no_sales_data_uploaded'), 'error');
            return;
        }
        
        const stock = calculateStockLevels();
        
        // FIX: Match against UPPERCASE system codes AND NAMES
        const headers = Object.keys(state.uploadedSalesData[0]);
        
        // Create a mapping of [HEADER] -> [BRANCH_CODE]
        const branchHeaderMap = {};
        state.branches.forEach(b => {
            if (headers.includes(b.branchCode.toUpperCase())) {
                branchHeaderMap[b.branchCode.toUpperCase()] = b.branchCode;
            }
            if (headers.includes(b.branchName.toUpperCase())) {
                branchHeaderMap[b.branchName.toUpperCase()] = b.branchCode;
            }
        });
        
        const branchHeadersFound = Object.keys(branchHeaderMap);
        
        if (branchHeadersFound.length === 0) {
             resultsContainer.innerHTML = `<p class="login-error">Error: Sales file headers must match system Branch Codes or Names. No matches found.</p>`;
             exportBtn.disabled = true;
             return;
        }

        // FIX: Create Lookup Map for performance and duplicates
        const salesMap = {};
        state.uploadedSalesData.forEach(row => {
            const itemCode = String(row.itemCode).trim();
            if (!salesMap[itemCode]) salesMap[itemCode] = {};
            
            // Merge/Sum sales data for each matched branch header
            branchHeadersFound.forEach(header => {
                const targetBranchCode = branchHeaderMap[header];
                const qty = parseFloat(row[header]) || 0;
                
                if (!salesMap[itemCode][targetBranchCode]) salesMap[itemCode][targetBranchCode] = 0;
                salesMap[itemCode][targetBranchCode] += qty;
            });
        });

        let finalHtml = '';
        state.salesReportDataByBranch = {};

        // Iterate through unique branch codes found
        const uniqueBranchCodes = [...new Set(Object.values(branchHeaderMap))];

        uniqueBranchCodes.forEach(branchCode => {
            const branch = findByKey(state.branches, 'branchCode', branchCode);
            if (!branch) return;

            const branchStock = stock[branchCode] || {};
            
            const reportData = state.items.map(item => {
                const systemStock = branchStock[item.code]?.quantity || 0;
                
                // FIX: Instant Lookup from Map
                const soldQty = salesMap[item.code] ? (salesMap[item.code][branchCode] || 0) : 0;
                
                const expectedStock = systemStock - soldQty;
                return { code: item.code, name: item.name, systemStock, soldQty, expectedStock, discrepancy: expectedStock };
            });

            state.salesReportDataByBranch[branchCode] = reportData;

            let tableHtml = `<table id="table-sales-discrepancy-${branchCode}">
                <thead><tr>
                    <th>${_t('item_code')}</th><th>${_t('item_name')}</th><th>${_t('table_h_system_stock')}</th>
                    <th>${_t('table_h_sold_qty')}</th><th>${_t('table_h_expected_stock')}</th><th>${_t('table_h_discrepancy')}</th>
                </tr></thead><tbody>`;

            reportData.forEach(row => {
                 if (row.systemStock > 0 || row.soldQty > 0 || row.discrepancy !== 0) {
                    const discrepancyClass = row.discrepancy !== 0 ? 'status-rejected' : '';
                    tableHtml += `<tr class="${discrepancyClass}">
                        <td>${row.code}</td><td>${row.name}</td><td>${row.systemStock.toFixed(2)}</td>
                        <td>${row.soldQty.toFixed(2)}</td><td>${row.expectedStock.toFixed(2)}</td><td>${row.discrepancy.toFixed(2)}</td>
                    </tr>`;
                 }
            });
            tableHtml += `</tbody></table>`;
            
            finalHtml += `<div class="printable-document card">
                <div class="printable-header">
                    <h2>${_t('sales_discrepancy_report')} - ${branch.branchName}</h2>
                    <p>${_t('date_generated')} ${new Date().toLocaleString()}</p>
                </div>
                ${tableHtml}
                <div style="margin-top:24px;">
                    <button class="danger btn-settle-stock" data-branch-code="${branchCode}">${_t('settle_stock')} for ${branch.branchName}</button>
                </div>
            </div>`;
        });
        
        resultsContainer.innerHTML = finalHtml || `<p>No valid branch data found in the uploaded file.</p>`;
        resultsContainer.style.display = 'block';
        exportBtn.disabled = finalHtml === '';
    }

    // --- 7. UI ACTION HANDLERS ---
    function openSettlementModal(reportData, branchCode) {
        document.getElementById('settlement-notes').value = '';
        settlementConfirmModal.classList.add('active');
        const confirmBtn = document.getElementById('btn-confirm-settlement');
        
        const newConfirmBtn = confirmBtn.cloneNode(true); // Clone to remove old event listeners
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.onclick = () => {
            handleConfirmSettlement(reportData, branchCode);
        };
    }

    async function handleConfirmSettlement(reportData, branchCode) {
        const btn = document.getElementById('btn-confirm-settlement');
        const notes = document.getElementById('settlement-notes').value;
        const settlementId = `SET-${Date.now()}`;
        const today = new Date().toISOString();

        const reportDataWithCost = reportData.map(item => {
            const masterItem = findByKey(state.items, 'code', item.code);
            return { ...item, cost: masterItem?.cost || 0 };
        });

        const payload = {
            branchCode,
            notes,
            settlementId,
            reportData: reportDataWithCost
        };

        const result = await postData('performSettlement', payload, btn);
        if (result && result.data.newTransactions) {
            state.transactions = [...state.transactions, ...result.data.newTransactions]; 
            state.settlements.push(result.data.settlementRecord);
            if(result.data.settlementItems) result.data.settlementItems.forEach(si => state.settlementItems.push(si));
            showToast(_t('settlement_complete'), 'success');
            closeModal();
            const currentView = document.querySelector('.nav-item a.active')?.dataset.view || 'dashboard';
            refreshViewData(currentView); 
        }
    }

    async function handleExtractionSubmit(e) {
        const btn = e.currentTarget;
        const mainItemCode = document.getElementById('extraction-main-item').value;
        const quantity = parseFloat(document.getElementById('extraction-quantity').value) || 0;
        const branchCode = document.getElementById('extraction-branch').value;
        const notes = document.getElementById('extraction-notes').value;

        if (!mainItemCode || !branchCode || quantity <= 0) {
            showToast('Please select a branch, a main item, and enter a valid quantity to consume.', 'error');
            return;
        }

        const mainItem = findByKey(state.items, 'code', mainItemCode);
        const stock = calculateStockLevels();
        const availableQty = stock[branchCode]?.[mainItemCode]?.quantity || 0;
        if (quantity > availableQty) {
            showToast(`Error: Quantity to consume (${quantity}) exceeds available stock (${availableQty}).`, 'error');
            return;
        }
        
        const mainItemCost = stock[branchCode]?.[mainItemCode]?.avgCost || mainItem.cost;
        const batchId = `EXT-${Date.now()}`;
        
        const itemsPayload = [];
        // Main item out
        itemsPayload.push({
            type: 'extraction_out',
            itemCode: mainItemCode,
            quantity: quantity,
            cost: mainItemCost
        });
        
        let hasSubItems = false;
        document.querySelectorAll('#table-extraction-preview input').forEach(input => {
            const subQty = parseFloat(input.value) || 0;
            if (subQty > 0) {
                hasSubItems = true;
                itemsPayload.push({
                    type: 'extraction_in',
                    itemCode: input.dataset.itemCode,
                    quantity: subQty,
                    cost: 0 // Sub-items have no cost
                });
            }
        });

        if (!hasSubItems) {
            showToast('Please enter the quantity produced for at least one sub-item.', 'error');
            return;
        }

        const payload = {
            type: 'extraction',
            batchId: batchId,
            ref: batchId,
            fromBranchCode: branchCode,
            notes: notes,
            items: itemsPayload
        };

        const result = await postData('addTransactionBatch', payload, btn);
        if(result) {
            showToast('Extraction processed successfully!', 'success');
            document.getElementById('form-extraction-details').reset();
            renderExtractionPreview();
            reloadDataAndRefreshUI();
        }
    }
    
    function downloadSalesTemplate() {
        const header = { itemCode: "itemCode", itemName: "itemName" };
        state.branches.forEach(b => {
            header[b.branchCode] = ''; 
        });
    
        const templateData = state.items.map(item => {
            const row = {
                itemCode: item.code,
                itemName: item.name
            };
            state.branches.forEach(b => {
                row[b.branchCode] = ''; 
            });
            return row;
        });
    
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SalesData");
        XLSX.writeFile(wb, "SalesUploadTemplate.xlsx");
    }

    function handleSalesFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                // FIX: Clean headers (Trim and Uppercase)
                const cleanedData = jsonData.map(row => {
                    const newRow = {};
                    Object.keys(row).forEach(key => {
                        newRow[key.trim().toUpperCase()] = row[key]; 
                    });
                    // Ensure itemCode is present even if casing differed in original
                    const itemCodeKey = Object.keys(newRow).find(k => k === 'ITEMCODE');
                    if(itemCodeKey) newRow.itemCode = newRow[itemCodeKey];
                    
                    return newRow;
                });

                if (!cleanedData[0] || !cleanedData[0].hasOwnProperty('itemCode')) {
                    throw new Error("Invalid format: 'itemCode' column missing.");
                }

                state.uploadedSalesData = cleanedData;
                showToast(_t('file_upload_success', { rows: cleanedData.length }), 'success');

            } catch (err) {
                showToast(_t('file_upload_error'), 'error');
                Logger.error(err);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function savePOChanges(e) {
        const btn = e.currentTarget;
        const poId = btn.dataset.poId;
        const notes = document.getElementById('edit-po-notes').value;
        const totalValue = state.currentEditingPOList.reduce((acc, item) => acc + (item.quantity * item.cost), 0);
        const payload = {
            poId,
            notes,
            totalValue,
            items: state.currentEditingPOList
        };
        const result = await postData('editPurchaseOrder', payload, btn);
        if (result) {
            showToast('PO updated successfully!', 'success');
            closeModal();
            reloadDataAndRefreshUI();
        }
    }

    async function saveInvoiceChanges(e) {
        const btn = e.currentTarget;
        const batchId = btn.dataset.batchId;
        const notes = document.getElementById('edit-invoice-notes').value;
        const invoiceNumber = document.getElementById('edit-invoice-number').value;

        if (!invoiceNumber) {
            showToast('Invoice Number is required.', 'error');
            return;
        }

        const payload = {
            batchId,
            invoiceNumber,
            notes,
            items: state.currentEditingPOList
        };
        const result = await postData('editInvoice', payload, btn);
        if (result) {
            showToast('Invoice updated successfully!', 'success');
            closeModal();
            reloadDataAndRefreshUI();
        }
    }
    
    async function handleUpdateSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const type = formEditRecord.dataset.type;
        const id = formEditRecord.dataset.id;
        const formData = new FormData(formEditRecord);
        let payload = {}, action;

        if (type === 'item') {
            action = 'updateData';
            const updates = {};
            for (let [key, value] of formData.entries()) {
                updates[key] = value;
            }
            if (!document.getElementById('edit-is-sub-item-toggle').checked) {
                updates.ParentItemCode = '';
            } else {
                updates.cost = 0; 
            }
            payload = { type, id, updates };
        } else if (type === 'user') {
            action = id ? 'updateUser' : 'addUser';
            payload = {};
            for (let [key, value] of formData.entries()) {
                 if (key === 'LoginCode' && value === '') continue;
                 payload[key] = value;
            }
            if(id) {
                payload = { Username: id, updates: {} };
                for (let [key, value] of formData.entries()) {
                    if (key === 'LoginCode' && value === '') continue;
                    if (key !== 'Username') payload.updates[key] = value;
                }
            }
        } else if (type === 'role') {
            action = 'updateRolePermissions';
            const updates = {};
            const allPerms = Object.keys(findByKey(state.allRoles, 'RoleName', id) || {});
            allPerms.forEach(key => {
                if (key !== 'RoleName') {
                    updates[key] = formData.has(key);
                }
            });
            payload = { RoleName: id, updates: updates };
        } else {
            action = 'updateData';
            const updates = {};
            for (let [key, value] of formData.entries()) {
                updates[key] = value;
            }
            payload = { type, id, updates };
        }
        
        const result = await postData(action, payload, btn);
        if (result) {
            const toastMessage = id ? _t('update_success_toast', {type: _t(type)}) : _t('add_success_toast', {type: _t(type)});
            showToast(toastMessage, 'success');
            closeModal();
            await reloadDataAndRefreshUI();
        }
    }

    // Admin Context Selector
    async function requestAdminContext(config) {
        const modal = document.getElementById('context-selector-modal');
        
        modal.querySelectorAll('.form-group').forEach(el => el.style.display = 'none');
        
        if(config.fromBranch) populateOptions(document.getElementById('context-from-branch-select'), state.branches, 'Select From Branch', 'branchCode', 'branchName');
        if(config.toBranch) populateOptions(document.getElementById('context-to-branch-select'), state.branches, 'Select To Branch', 'branchCode', 'branchName');
        if(config.branch) populateOptions(document.getElementById('context-branch-select'), state.branches, 'Select Branch', 'branchCode', 'branchName');

        Object.keys(config).forEach(key => {
            const group = document.getElementById(`context-modal-${key}-group`);
            if(group) group.style.display = 'block';
        });

        modal.classList.add('active');
        return new Promise((resolve, reject) => {
            state.adminContextPromise = { resolve, reject };
        });
    }
    
    function handlePaymentInputChange() {
        let total = 0;
        document.querySelectorAll('.payment-amount-input').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        document.getElementById('payment-total-amount').textContent = `${total.toFixed(2)} EGP`;
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
    
    function closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active'));
        modalSearchInput.value = '';
        modalContext = null;
    }
    
    function openInvoiceSelectorModal() {
        modalContext = 'invoices';
        renderInvoicesInModal();
        invoiceSelectorModal.classList.add('active');
    }
    
    function openItemSelectorModal(e) {
        const context = e.target.dataset.context;
        if (!context) {
            Logger.error("openItemSelectorModal called without a data-context on the button.");
            return;
        }
        modalContext = context;
        state.modalSelections = new Set(); 
        renderItemsInModal();
        itemSelectorModal.classList.add('active');
    }
    
    function renderItemsInModal(filter = '') {
        const modalItemList = document.getElementById('modal-item-list');
        modalItemList.innerHTML = '';
        const lowercasedFilter = filter.toLowerCase();
    
        let itemsToShow = state.items;
        if (modalContext === 'po') {
            itemsToShow = state.items.filter(i => !i.ParentItemCode);
        }
    
        const filteredItems = itemsToShow.filter(item => 
            item.name.toLowerCase().includes(lowercasedFilter) || 
            item.code.toLowerCase().includes(lowercasedFilter)
        );
    
        const itemTree = {};
        filteredItems.forEach(item => {
            if (item.ParentItemCode && modalContext !== 'po') {
                if (!itemTree[item.ParentItemCode]) {
                    const parent = findByKey(state.items, 'code', item.ParentItemCode);
                    if (parent) { 
                         itemTree[item.ParentItemCode] = { parent: parent, children: [] };
                    }
                }
                if(itemTree[item.ParentItemCode]) {
                    itemTree[item.ParentItemCode].children.push(item);
                }
            } else if (!item.ParentItemCode) {
                 if (!itemTree[item.code]) {
                    itemTree[item.code] = { parent: item, children: [] };
                }
            }
        });
    
        Object.values(itemTree).forEach(node => {
            if (!node.parent) return; 
            const isChecked = state.modalSelections.has(node.parent.code);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'modal-item-container';
            const hasSubItems = state.items.some(sub => sub.ParentItemCode === node.parent.code);

            let checkboxHtml = `<input type="checkbox" id="modal-item-${node.parent.code}" data-code="${node.parent.code}" ${isChecked ? 'checked' : ''}>`;
            if (hasSubItems && modalContext !== 'po') {
                checkboxHtml = `<div class="modal-checkbox-placeholder"></div>`; 
            }

            let itemHtml = `
                <div class="modal-item">
                    ${checkboxHtml}
                    <label for="modal-item-${node.parent.code}">
                        <strong>${node.parent.name}</strong><br>
                        <small style="color:var(--text-light-color)">${_t('table_h_code')}: ${node.parent.code}</small>
                    </label>`;
            
            if (hasSubItems && modalContext !== 'po') {
                itemHtml += `<button class="secondary small btn-show-cuts" data-parent-code="${node.parent.code}">${_t('show_cuts')}</button>`;
            }
    
            itemHtml += `</div><div class="sub-item-list" id="sub-items-for-${node.parent.code}" style="display:none;"></div>`;
            itemDiv.innerHTML = itemHtml;
            modalItemList.appendChild(itemDiv);
        });
    
        document.querySelectorAll('.btn-show-cuts').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const parentCode = e.target.dataset.parentCode;
                const subItemList = document.getElementById(`sub-items-for-${parentCode}`);
                if (subItemList.style.display === 'none') {
                    renderSubItemsInModal(parentCode, subItemList);
                    subItemList.style.display = 'block';
                } else {
                    subItemList.style.display = 'none';
                }
            });
        });
    }
    
    function renderSubItemsInModal(parentCode, container) {
        const subItems = state.items.filter(i => i.ParentItemCode === parentCode);
        let subItemsHtml = '';
        subItems.forEach(sub => {
            const isChecked = state.modalSelections.has(sub.code);
            subItemsHtml += `
                <div class="modal-item sub-item-row">
                    <input type="checkbox" id="modal-item-${sub.code}" data-code="${sub.code}" ${isChecked ? 'checked' : ''}>
                    <label for="modal-item-${sub.code}">
                        <strong>${sub.name}</strong><br>
                        <small style="color:var(--text-light-color)">${_t('table_h_code')}: ${sub.code}</small>
                    </label>
                </div>
            `;
        });
        container.innerHTML = subItemsHtml;
    }
    
    function setupSearch(inputId, renderFn, dataKey, searchKeys) {
        const searchInput = document.getElementById(inputId);
        if (!searchInput) return;
        searchInput.addEventListener('input', e => {
            const searchTerm = e.target.value.toLowerCase();
            const dataToFilter = state[dataKey] || [];
            if (inputId === 'stock-levels-search') {
                const selectedBranches = Array.from(document.getElementById('stock-levels-branch-filter').selectedOptions).map(opt => opt.value);
                renderFn(searchTerm ? dataToFilter.filter(item => searchKeys.some(key => item[key] && String(item[key]).toLowerCase().includes(searchTerm))) : dataToFilter, selectedBranches);
            } else {
                 renderFn(searchTerm ? dataToFilter.filter(item => searchKeys.some(key => item[key] && String(item[key]).toLowerCase().includes(searchTerm))) : dataToFilter);
            }
        });
    }
    
    function attachSubNavListeners() { document.querySelectorAll('.sub-nav').forEach(nav => { if(nav.closest('#history-modal')) return; nav.addEventListener('click', e => { if (!e.target.classList.contains('sub-nav-item')) return; const subviewId = e.target.dataset.subview; const parentView = e.target.closest('.view'); if (!parentView) return; const currentActive = parentView.querySelector('.sub-nav-item.active'); if(currentActive) currentActive.classList.remove('active'); e.target.classList.add('active'); parentView.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active')); const subViewToShow = parentView.querySelector(`#subview-${subviewId}`); if (subViewToShow) subViewToShow.classList.add('active'); refreshViewData(parentView.id.replace('view-','')); }); }); }
    
    async function reloadDataAndRefreshUI() { 
        Logger.info('Reloading data...'); 
        const { username, loginCode } = state; 
        if (!username || !loginCode) { logout(); return; } 
        const currentView = document.querySelector('.nav-item a.active')?.dataset.view || 'dashboard'; 
        setButtonLoading(true, globalRefreshBtn); 
        try { 
            const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`); 
            if (!response.ok) throw new Error('Failed to reload data.'); 
            const data = await response.json(); 
            if (data.status === 'error') throw new Error(data.message); 
            Object.keys(data).forEach(key => { 
                if(key !== 'user') state[key] = data[key] || state[key]; 
            }); 
            updateUserBranchDisplay(); 
            await refreshViewData(currentView); 
            Logger.info('Reload complete.'); 
            showToast(_t('data_refreshed_toast'), 'success'); 
        } catch (err) { 
            Logger.error('Data reload failed:', err); 
            showToast(_t('data_refresh_fail_toast'), 'error'); 
        } finally { 
            setButtonLoading(false, globalRefreshBtn); 
        } 
    }
    
    function updateUserBranchDisplay() {
        const displayEl = document.getElementById('user-branch-display');
        if (!state.currentUser || !displayEl) { return; }
        const branch = findByKey(state.branches, 'branchCode', state.currentUser.AssignedBranchCode);
        let displayText = '';
        if (branch) displayText += `${_t('branch')}: ${branch.branchName}`;
        displayEl.textContent = displayText;
    }
    
    function logout() { Logger.info('User logging out.'); location.reload(); }
    
    // --- 8. VIEW LOGIC (Defined AFTER all utilities) ---
    const refreshViewData = async (viewId) => {
        if (!state.currentUser) return;
        Logger.debug(`Refreshing view: ${viewId}`);
        switch(viewId) {
            case 'dashboard':
                const stock = calculateStockLevels();
                document.getElementById('dashboard-total-items').textContent = (state.items || []).length.toLocaleString();
                document.getElementById('dashboard-total-suppliers').textContent = (state.suppliers || []).length;
                document.getElementById('dashboard-total-branches').textContent = (state.branches || []).length;
                let totalValue = 0;
                Object.values(stock).forEach(bs => Object.values(bs).forEach(i => totalValue += i.quantity * i.avgCost));
                document.getElementById('dashboard-total-value').textContent = `${totalValue.toFixed(2)} EGP`;
                break;
            case 'transaction-history': 
                const txFilterBranch = document.getElementById('tx-filter-branch');
                const txFilterSupplier = document.getElementById('tx-filter-supplier'); 
                populateOptions(txFilterBranch, state.branches, _t('all_branches'), 'branchCode', 'branchName');
                if (txFilterSupplier) populateOptions(txFilterSupplier, state.suppliers, 'All Suppliers', 'supplierCode', 'name');
                const txTypes = ['receive', 'issue', 'transfer_out', 'transfer_in', 'return_out', 'po', 'adjustment_in', 'adjustment_out', 'extraction_in', 'extraction_out'];
                const txTypeOptions = txTypes.map(t => ({'type': t, 'name': _t(t.replace(/_/g,''))}));
                populateOptions(document.getElementById('tx-filter-type'), txTypeOptions, _t('all_types'), 'type', 'name');
                renderTransactionHistory({ startDate: document.getElementById('tx-filter-start-date').value, endDate: document.getElementById('tx-filter-end-date').value, type: document.getElementById('tx-filter-type').value, branch: document.getElementById('tx-filter-branch').value, searchTerm: document.getElementById('transaction-search').value }); 
                break;
            case 'master-data':
                renderItemsTable(); renderSuppliersTable(); renderBranchesTable();
                const mainItems = (state.items || []).filter(i => !i.ParentItemCode);
                populateOptions(document.getElementById('parent-item-code'), mainItems, _t('select_parent_item'), 'code', 'name');
                break;
            case 'backup': loadAndRenderBackups(); loadAutoBackupSettings(); break;
            case 'operations':
                populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                populateOptions(document.getElementById('receive-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('transfer-from-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('transfer-to-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('return-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                populateOptions(document.getElementById('return-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('adjustment-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('extraction-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('extraction-main-item'), (state.items || []).filter(i => !i.ParentItemCode), _t('select_main_item_to_extract'), 'code', 'name');
                populateOptions(document.getElementById('fin-adj-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                populateOptions(document.getElementById('receive-po-select'), (state.purchaseOrders || []).filter(po => po.Status === 'Approved'), _t('select_a_po'), 'poId', 'poId', 'supplierCode');
                renderReceiveListTable(); renderTransferListTable(); renderReturnListTable(); renderPendingTransfers(); renderInTransitReport(); renderAdjustmentListTable(); renderExtractionPreview();
                break;
            case 'purchasing':
                 populateOptions(document.getElementById('po-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                 renderPOListTable(); renderPurchaseOrdersViewer(); renderPendingFinancials();
                 break;
            case 'payments':
                populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                renderPaymentList();
                break;
            case 'reports':
                populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, _t('select_a_supplier'), 'supplierCode', 'name');
                renderSettlementHistory();
                break;
            case 'stock-levels':
                 const branchFilterContainer = document.getElementById('stock-levels-branch-filter-container');
                 if(branchFilterContainer) branchFilterContainer.style.display = 'none'; 
                renderItemCentricStockView();
                break;
            case 'user-management':
                const result = await postData('getAllUsersAndRoles', {}, null);
                if (result) { state.allUsers = result.data.users; state.allRoles = result.data.roles; renderUserManagementUI(); }
                break;
            case 'activity-log': renderActivityLog(); break;
        }
        applyTranslations();
    };

    // ==========================================
    // 9. EVENT LISTENERS & INIT (FINAL)
    // ==========================================
    function attachEventListeners() {
        btnLogout.addEventListener('click', logout);
        globalRefreshBtn.addEventListener('click', reloadDataAndRefreshUI);
        
        document.getElementById('btn-create-backup').addEventListener('click', async (e) => { if (confirm(_t('backup_confirm_prompt'))) { const result = await postData('createBackup', {}, e.target); if (result) { showToast(_t('backup_created_toast', {fileName: result.data.fileName}), 'success'); await loadAndRenderBackups(); } } });
        document.getElementById('auto-backup-toggle').addEventListener('change', handleAutoBackupToggle);
        document.getElementById('backup-list-container').addEventListener('click', (e) => {
            const btn = e.target.closest('button'); if (btn && btn.classList.contains('btn-restore')) openRestoreModal(findByKey(state.backups, 'url', btn.dataset.url)?.id, findByKey(state.backups, 'url', btn.dataset.url)?.name);
        });
        document.getElementById('btn-confirm-restore').addEventListener('click', handleConfirmRestore);

        document.querySelectorAll('#main-nav a:not(#btn-logout)').forEach(link => { link.addEventListener('click', e => { e.preventDefault(); showView(link.dataset.view); }); });
        attachSubNavListeners();

        mainContent.addEventListener('click', e => {
            const btn = e.target.closest('button'); if (!btn) return;
            if (btn.dataset.context) { modalContext = btn.dataset.context; state.modalSelections.clear(); renderItemsInModal(); itemSelectorModal.classList.add('active'); }
            if (btn.id === 'btn-select-invoices') { modalContext = 'invoices'; renderInvoicesInModal(); invoiceSelectorModal.classList.add('active'); }
            if (btn.classList.contains('btn-edit')) openEditModal(btn.dataset.type, btn.dataset.id);
            if (btn.classList.contains('btn-history')) openHistoryModal(btn.dataset.id);
            if (btn.id === 'btn-add-new-user') openEditModal('user', null);
            if (btn.classList.contains('btn-view-tx')) { /* Doc Hook */ }
            if (btn.classList.contains('btn-receive-transfer')) openViewTransferModal(btn.dataset.batchId);
            if (btn.classList.contains('btn-approve-financial') || btn.classList.contains('btn-reject-financial')) {
                const id = btn.dataset.id; const type = btn.dataset.type; const action = btn.classList.contains('btn-approve-financial') ? 'approveFinancial' : 'rejectFinancial';
                if (confirm(action === 'approveFinancial' ? _t('approve_confirm_prompt', {type: _t(type)}) : _t('reject_confirm_prompt', {type: _t(type)}))) {
                    postData(action, { id, type }, btn).then(result => { if (result) { showToast(action.includes('approve') ? _t('approved_toast', {type: _t(type)}) : _t('rejected_toast', {type: _t(type)}), 'success'); reloadDataAndRefreshUI(); } });
                }
            }
        });

        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-button') || e.target.classList.contains('modal-cancel')) closeModal();
            if (e.target.id === 'btn-save-po-changes') savePOChanges(e);
            if (e.target.id === 'btn-save-invoice-changes') saveInvoiceChanges(e);
        });

        document.getElementById('btn-confirm-modal-selection').addEventListener('click', confirmModalSelection);
        document.getElementById('btn-confirm-invoice-selection').addEventListener('click', confirmModalSelection);
        document.getElementById('payment-supplier-select').addEventListener('change', e => { document.getElementById('btn-select-invoices').disabled = !e.target.value; state.invoiceModalSelections.clear(); renderPaymentList(); });
        document.getElementById('table-payment-list').addEventListener('input', handlePaymentInputChange);
        document.getElementById('invoice-selector-modal').addEventListener('change', handleInvoiceModalCheckboxChange);
        modalItemList.addEventListener('change', handleModalCheckboxChange);
        modalSearchInput.addEventListener('input', e => renderItemsInModal(e.target.value));
        formEditRecord.addEventListener('submit', handleUpdateSubmit);
        
        // Submits
        document.getElementById('btn-submit-receive-batch').addEventListener('click', async (e) => { 
            const payload = { type: 'receive', batchId: generateId('GRN'), supplierCode: document.getElementById('receive-supplier').value, branchCode: document.getElementById('receive-branch').value, invoiceNumber: document.getElementById('receive-invoice').value, date: new Date(), items: prepareListForSubmission(state.currentReceiveList), notes: document.getElementById('receive-notes').value, poId: document.getElementById('receive-po-select').value }; 
            await handleTransactionSubmit(payload, e.target); 
        });
        
        // Attach Table Listeners
        const attachTable = (id, listKey, renderFn) => {
            const t = document.getElementById(id); if(!t) return;
            t.addEventListener('input', e => { if(e.target.classList.contains('table-input')) { const idx = e.target.dataset.index; const field = e.target.dataset.field; state[listKey][idx][field] = e.target.value; if(listKey === 'currentReceiveList') updateReceiveGrandTotal(); } });
            t.addEventListener('click', e => { if(e.target.classList.contains('danger')) { state[listKey].splice(e.target.dataset.index, 1); renderFn(); } });
        };
        attachTable('table-receive-list', 'currentReceiveList', renderReceiveListTable);
        attachTable('table-transfer-list', 'currentTransferList', renderTransferListTable);
        attachTable('table-po-list', 'currentPOList', renderPOListTable);
        attachTable('table-return-list', 'currentReturnList', renderReturnListTable);
        attachTable('table-adjustment-list', 'currentAdjustmentList', renderAdjustmentListTable);

        // Search Bars
        setupSearch('search-items', renderItemsTable, 'items', ['name', 'code']);
        setupSearch('search-suppliers', renderSuppliersTable, 'suppliers', ['name', 'supplierCode']);
        setupSearch('search-branches', renderBranchesTable, 'branches', ['branchName', 'branchCode']);
        setupSearch('stock-levels-search', renderItemCentricStockView, 'items', ['name', 'code']);
        document.getElementById('item-inquiry-search').addEventListener('input', e => renderItemInquiry(e.target.value.toLowerCase()));
    }

    function initializeAppUI() {
        document.getElementById('user-branch-display').textContent = state.currentUser?.AssignedBranchCode || '';
        attachEventListeners(); 
        showView('dashboard');
    }

    function init() {
        const langSwitcher = document.getElementById('lang-switcher');
        const savedLang = localStorage.getItem('userLanguage') || 'en';
        state.currentLanguage = savedLang;
        langSwitcher.value = savedLang;
        applyTranslations();
        langSwitcher.addEventListener('change', e => {
            const selectedLang = e.target.value;
            localStorage.setItem('userLanguage', selectedLang);
            state.currentLanguage = selectedLang;
            reloadDataAndRefreshUI();
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            attemptLogin(loginUsernameInput.value.trim(), loginCodeInput.value);
        });
    }

    init();
});
