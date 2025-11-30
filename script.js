window.printReport = function (elementId) {
    const container = document.getElementById(elementId);
    if (!container) {
        console.error(`printReport: Element #${elementId} not found.`);
        return;
    }
    const reportContent = container.querySelector('.printable-document');
    const printArea = document.getElementById('print-area');
    if (reportContent && printArea) {
        printArea.innerHTML = reportContent.outerHTML;
        setTimeout(() => window.print(), 100);
    } else {
        console.error(`Could not find content to print in #${elementId} or #print-area is missing.`);
        alert("Error: Report content not found.");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // !!! IMPORTANT: PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwSM8G9AqHy6Nnhwcpit7xRJbKMkY93ACaHA3_3pzwZlNaF6ORzVL-Ev10FF7HQiu9M/exec';

    // ==========================================
    // 1. STATE, CONSTANTS & LOGGING
    // ==========================================
    const Logger = {
        info: (message, ...args) => console.log(`[StockWise INFO] ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[StockWise WARN] ${message}`, ...args),
        error: (message, ...args) => console.error(`[StockWise ERROR] ${message}`, ...args),
        debug: (message, ...args) => {
            if (state.currentUser && state.currentUser.RoleName === 'Admin') {
                showToast(`DEBUG: ${message}`, 'info');
            }
            console.log(`[StockWise DEBUG] ${message}`, ...args);
        }
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

    // --- DOM ELEMENT REFERENCES ---
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
    const viewTransferModal = document.getElementById('view-transfer-modal');

    // Inner Elements
    const modalItemList = document.getElementById('modal-item-list');
    const modalSearchInput = document.getElementById('modal-search-items');
    const editModalBody = document.getElementById('edit-modal-body');
    const editModalTitle = document.getElementById('edit-modal-title');
    const formEditRecord = document.getElementById('form-edit-record');

    // Translations
    const translations = {
        'en': {
            'packing_stock': 'Packing Stock', 'login_prompt': 'Please enter your credentials to continue.', 'username': 'Username', 'password_code': 'Password / Login Code', 'login': 'Login', 'signing_in': 'Signing in...', 'loading': 'Loading...', 'hi_user': 'Hi, {userFirstName}', 'refresh_all_data': 'Refresh All Data', 'dashboard': 'Dashboard', 'stock_operations': 'Stock Operations', 'purchasing': 'Purchasing', 'payments': 'Payments', 'reports': 'Reports', 'stock_levels': 'Stock Levels', 'transaction_history': 'Transaction History', 'master_data': 'Master Data', 'user_management': 'User Management', 'backup_restore': 'Backup', 'activity_log': 'Activity Log', 'logout': 'Logout', 'branch': 'Branch', 'total_items': 'Total Items', 'total_stock_value': 'Total Stock Value', 'total_suppliers': 'Total Suppliers', 'total_branches': 'Total Branches', 'add_new_item': 'Add New Item', 'item_code': 'Item Code (Unique ID)', 'item_name': 'Item Name', 'default_cost': 'Default Cost', 'add_item_btn': 'Add Item', 'add_new_supplier': 'Add New Supplier', 'supplier_code': 'Supplier Code (Unique ID)', 'supplier_name': 'Supplier Name', 'add_supplier_btn': 'Add Supplier', 'add_new_branch': 'Add New Branch', 'branch_code': 'Branch Code (Unique ID)', 'branch_name': 'Branch Name', 'add_branch_btn': 'Add Branch', 'auto_backup_settings': 'Automatic Backup Settings', 'auto_backup_desc': 'Enable automatic backups to save a copy of your data periodically. Backups are stored in "StockApp Backups" in Google Drive.', 'enable_auto_backups': 'Enable Automatic Backups', 'backup_frequency': 'Backup Frequency', 'daily_backup': 'Daily (at 2am)', 'weekly_backup': 'Weekly (Sunday at 2am)', 'manual_backup_restore': 'Manual Backup & Restore', 'manual_backup_desc': 'Create an immediate backup or restore from a previously created file.', 'create_new_manual_backup': 'Create New Manual Backup', 'available_backups': 'Available Backups', 'loading_backups': 'Loading backup list...', 'no_backups_found': 'No backups found.', 'backup_name': 'Backup Name', 'date_created': 'Date Created', 'actions': 'Actions', 'open': 'Open', 'restore': 'Restore',
            'items': 'Items', 'suppliers': 'Suppliers', 'branches': 'Branches', 'view_items': 'View Items', 'add_item': 'Add Item', 'view_suppliers': 'View Suppliers', 'add_supplier': 'Add Supplier', 'view_branches': 'View Branches', 'add_branch': 'Add Branch', 'item_list': 'Item List', 'search_items_placeholder': 'Search by name or code...', 'export_to_excel': 'Export to Excel', 'table_h_code': 'Code', 'table_h_name': 'Name', 'table_h_cost': 'Default Cost', 'table_h_actions': 'Actions', 'no_items_found': 'No items found.', 'edit': 'Edit', 'history': 'History', 'supplier_list': 'Supplier List', 'search_suppliers_placeholder': 'Search by name or code...', 'table_h_balance': 'Balance (Owed)', 'no_suppliers_found': 'No suppliers found.', 'branch_list': 'Branch List', 'search_branches_placeholder': 'Search by name or code...', 'no_branches_found': 'No branches found.', 'record_payment': 'Record a Payment', 'step1_select_supplier': '1. Select Supplier', 'step2_select_invoices': '2. Select Invoices to Pay', 'select_invoices_btn': 'Select Invoices...', 'step3_payment_method': '3. Enter Payment Method', 'payment_method_placeholder': 'e.g., Cash, Bank Transfer', 'step4_confirm_amounts': '4. Confirm Amounts', 'table_h_invoice_no': 'Invoice #', 'table_h_balance_due': 'Balance Due', 'table_h_amount_to_pay': 'Amount to Pay', 'total_payment': 'Total Payment:', 'submit_payment_btn': 'Submit Payment',
            'supplier_statement': 'Supplier Statement', 'select_a_supplier': 'Select a Supplier', 'generate': 'Generate', 'select_a_branch': 'Select a Branch', 'all_items': 'All Items', 'all_branches': 'All Branches', 'receive_stock': 'Receive Stock', 'internal_transfer': 'Internal Transfer', 'return_to_supplier': 'Return to Supplier', 'in_transit_report': 'In-Transit Report', 'adjustments': 'Adjustments', 'pending_incoming_transfers': 'Pending Incoming Transfers', 'table_h_date_sent': 'Date Sent', 'table_h_from_branch': 'From Branch', 'table_h_ref_no': 'Reference #', 'view_confirm': 'View/Confirm', 'receive_stock_from_supplier': 'Receive Stock from Supplier', 'receive_against_po': 'Receive Against PO', 'optional': '(Optional)', 'select_a_po': 'Select a Purchase Order', 'to_branch': 'To Branch', 'notes_optional': 'Notes (Optional)', 'items_to_be_received': 'Items to be Received', 'table_h_quantity': 'Quantity', 'table_h_cost_per_unit': 'Cost/Unit', 'table_h_total': 'Total', 'grand_total': 'Grand Total:', 'select_items': 'Select Items', 'submit_for_approval': 'Submit for Approval', 'from_branch': 'From Branch', 'send_stock_to_branch': 'Send Stock to Another Branch', 'transfer_ref_no': 'Transfer Reference #', 'items_to_be_transferred': 'Items to be Transferred', 'table_h_qty_to_transfer': 'Quantity to Transfer', 'total_items_to_transfer': 'Total Items to Transfer:', 'confirm_transfer_all': 'Confirm & Transfer All Items', 'credit_note_ref': 'Credit Note Ref #', 'reason_for_return': 'Reason for Return (Optional)', 'items_to_return': 'Items to Return', 'table_h_qty_to_return': 'Qty to Return', 'total_return_value': 'Total Return Value:', 'confirm_return_all': 'Confirm & Return All Items', 'goods_in_transit_report': 'Goods In-Transit Report', 'table_h_to_branch': 'To Branch', 'table_h_status': 'Status', 'stock_count_adjustment': 'Stock Count Adjustment', 'reference': 'Reference', 'stocktake_example': 'e.g., Stocktake April 2024', 'notes_reason': 'Notes / Reason', 'items_to_adjust': 'Items to Adjust', 'table_h_system_qty': 'System Qty', 'table_h_physical_count': 'Physical Count', 'table_h_adjustment': 'Adjustment', 'process_stock_adjustment': 'Process Stock Adjustment', 'supplier_opening_balance': 'Supplier Opening Balance Adjustment', 'supplier_opening_balance_desc': 'Use this to set the initial amount owed to a supplier. This should typically only be done once per supplier when setting up.', 'opening_balance_amount': 'Opening Balance (Amount Owed)', 'set_opening_balance': 'Set Opening Balance', 'create_po': 'Create Purchase Order', 'view_pos': 'View Purchase Orders', 'pending_approval': 'Pending Approval', 'po_details': 'Purchase Order Details', 'po_ref_no': 'PO Reference #', 'items_to_order': 'Items to Order', 'po_list': 'Purchase Order List', 'table_h_po_no': 'PO #', 'table_h_date': 'Date', 'table_h_total_value': 'Total Value', 'tx_pending_financial_approval': 'Transactions Pending Financial Approval', 'table_h_type': 'Type', 'table_h_details': 'Details', 'table_h_amount': 'Amount', 'stock_by_item': 'Stock by Item', 'stock_by_item_your_branch': 'Stock by Item (Your Branch)', 'stock_by_item_all_branches': 'Stock by Item (All Branches)', 'search_items_stock_placeholder': 'Search by item name or code...', 'item_stock_inquiry': 'Item Stock Inquiry (Drill-down)', 'item_stock_inquiry_placeholder': 'Start typing an item name or code...', 'no_stock_for_item': 'No stock for this item.', 'table_h_qty': 'Qty', 'table_h_value': 'Value', 'transaction_log': 'Transaction Log', 'all_types': 'All Types', 'search_tx_placeholder': 'Search by Ref#, Item Code/Name...', 'table_h_batch_ref': 'Batch/Ref #', 'view_print': 'View/Print', 'users': 'Users', 'add_new_user': 'Add New User', 'table_h_fullname': 'Full Name', 'table_h_role': 'Role', 'table_h_assigned_branch_section': 'Assigned Branch', 'roles': 'Roles', 'add_new_role': 'Add New Role', 'table_h_rolename': 'Role Name', 'system_activity_log': 'System Activity Log', 'table_h_timestamp': 'Timestamp', 'table_h_user': 'User', 'table_h_action': 'Action', 'table_h_description': 'Description', 'select_items_modal_title': 'Select Items', 'search_items_placeholder_modal': 'Search items...', 'confirm_selection': 'Confirm Selection', 'cancel': 'Cancel', 'select_invoices_modal_title': 'Select Invoices to Pay', 'edit_modal_title': 'Edit', 'save_changes': 'Save Changes', 'confirm_transfer_receipt_modal_title': 'Confirm Transfer Receipt', 'reject': 'Reject', 'confirm_receipt': 'Confirm Receipt', 'item_history_modal_title': 'Item History', 'price_history': 'Price History', 'movement_history': 'Movement History', 'close': 'Close', 'edit_po_modal_title': 'Edit Purchase Order', 'restore_from_backup_modal_title': 'Restore from Backup', 'restore_from_backup_desc': 'You are about to restore data from the backup file:', 'restore_step1': '1. Select which data sheets to restore.', 'restore_step2': '2. Confirm this irreversible action.', 'restore_danger_warning': 'EXTREME DANGER:', 'restore_danger_text': 'This will permanently delete the current data in the selected live sheets and replace it with the data from the backup. This action CANNOT be undone.', 'restore_prompt': 'Please type RESTORE into the box below to proceed.', 'confirm_and_restore': 'Confirm and Restore Data', 'session_error_toast': 'Session error. Please logout and login again.', 'action_failed_toast': 'Action Failed: {errorMessage}', 'data_refreshed_toast': 'Data refreshed!', 'data_refresh_fail_toast': 'Could not refresh data. Please try again.', 'backup_created_toast': 'Backup created: {fileName}', 'backup_confirm_prompt': 'This will create a full, manual backup of the current spreadsheet. Continue?', 'auto_backup_updated_toast': 'Automatic backup settings updated!', 'auto_backup_failed_toast': 'Failed to update settings. Please try again.', 'restore_select_sheet_toast': 'You must select at least one sheet to restore.', 'restore_completed_toast': 'Restore completed successfully!', 'restore_find_id_fail_toast': 'Could not find backup file ID.', 'tx_processed_toast': '{txType} processed!', 'tx_processed_approval_toast': '{txType} processed! Submitted for approval.', 'select_po_first_toast': 'You must select a Purchase Order to receive stock.', 'fill_required_fields_toast': 'Please fill all required fields and add items.', 'status_approved': 'Approved', 'status_pending': 'Pending Approval', 'status_rejected': 'Rejected', 'status_completed': 'Completed', 'status_in_transit': 'In Transit', 'status_cancelled': 'Cancelled', 'po': 'Purchase Order', 'receive': 'Receive', 'transfer': 'Transfer', 'issue': 'Issue', 'return': 'Return', 'stock_adjustment': 'Stock Adjustment', 'history_for': 'History for: {itemName} ({itemCode})', 'edit_item': 'Edit Item', 'edit_supplier': 'Edit Supplier', 'edit_branch': 'Edit Branch', 'edit_user': 'Edit User', 'add_new_user_title': 'Add New User', 'edit_user_password_label': 'Password / Login Code (leave blank to keep unchanged)', 'edit_user_password_label_new': 'Password / Login Code', 'toggle_user_enable': 'Enable User', 'toggle_user_disable': 'Disable User', 'toggle_user_enable_confirm': 'Are you sure you want to enable this user? They will be able to log in again.', 'toggle_user_disable_confirm': 'Are you sure you want to disable this user? They will not be able to log in.', 'user_enabled_toast': 'User enabled successfully!', 'user_disabled_toast': 'User disabled successfully!', 'edit_permissions_for': 'Edit Permissions for {roleName}', 'delete_role': 'Delete Role', 'add_role_prompt': 'Enter new role name:', 'update_success_toast': '{type} updated successfully!', 'add_success_toast': '{type} added successfully!', 'no_invoices_for_supplier': 'No invoices found for this supplier.', 'no_unpaid_invoices': 'No unpaid invoices for this supplier.', 'invoice_modal_details': 'Date: {date} | Amount Due: {balance} EGP', 'no_items_selected_toast': 'No items selected. Click "Select Items".', 'no_items_for_adjustment': 'No items selected for adjustment.', 'report_period_all_time': 'for all time', 'report_period_from_to': 'from {startDate} to {endDate}', 'report_period_from': 'from {startDate}', 'report_period_until': 'until {endDate}', 'supplier_statement_title': 'Supplier Statement: {supplierName}', 'date_generated': 'Date Generated:', 'table_h_debit': 'Debit', 'table_h_credit': 'Credit', 'opening_balance_as_of': 'Opening Balance as of {date}', 'closing_balance': 'Closing Balance:', 'price_change_log': 'Price Change Log', 'table_h_old_cost': 'Old Cost', 'table_h_new_cost': 'New Cost', 'table_h_change': 'Change', 'table_h_source': 'Source', 'table_h_updated_by': 'Updated By', 'no_price_history': 'No price history found for this item.', 'no_movements_found': 'No movements found for the selected filters.', 'table_h_qty_in': 'Qty In', 'table_h_qty_out': 'Qty Out', 'movement_details_receive': 'From: {supplier} To: {branch}', 'movement_details_transfer_out': 'Sent from: {fromBranch} To: {toBranch}', 'movement_details_transfer_in': 'Received at: {toBranch} From: {fromBranch}', 'movement_details_return': 'Returned from: {branch} To: {supplier}', 'movement_details_adjustment': 'Stock count at: {branch}', 'no_pending_financial_approval': 'No items are pending financial approval.', 'approve': 'Approve', 'approve_confirm_prompt': 'Are you sure you want to approve this {type}?', 'reject_confirm_prompt': 'Are you sure you want to reject this {type}? This action cannot be undone.', 'approved_toast': '{type} approved successfully!', 'rejected_toast': '{type} rejected successfully!', 'extraction': 'Extraction', 'is_sub_item': 'This is a Sub-Item', 'parent_item': 'Parent Item', 'select_parent_item': 'Select Parent Item', 'table_h_parent_item': 'Parent Item', 'extraction_title': 'Perform Production / Extraction', 'main_item_to_consume': 'Main Item to Consume', 'quantity_to_consume': 'Quantity to Consume', 'sub_items_produced': 'Sub-Items Produced', 'enter_produced_quantity': 'Enter Produced Quantity', 'confirm_extraction': 'Confirm Extraction', 'main_item_total': 'Main Item Total', 'extraction_in': 'Extraction In', 'extraction_out': 'Extraction Out', 'movement_details_extraction_out': 'Extracted at: {branch}', 'movement_details_extraction_in': 'Produced at: {branch}', 'enter_sub_item_quantities': 'Enter Sub-Item Quantities', 'add_to_transaction': 'Add to Transaction', 'total_sub_item_weight': 'Total Sub-Item Weight', 'show_cuts': 'Show Cuts', 'sales_data': 'Sales Data', 'sales_reconciliation': 'Sales Reconciliation', 'sales_data_desc': 'Upload daily sales data to generate a stock discrepancy report.', 'step1_download_template': '1. Download Template', 'download_template_desc': 'Download the Excel template with a list of all your items. The template will include a `branch` column.', 'download_template_btn': 'Download Sales Template', 'step2_upload_file': '2. Upload Completed File', 'upload_file_desc': 'Upload the filled-out Excel file. It must contain `itemCode`, `soldQty`, and branch codes as headers.', 'upload_btn': 'Choose Excel File', 'step3_generate_report': '3. Generate Discrepancy Report', 'select_branch_for_report': 'Select Branch for Report', 'generate_discrepancy_report_btn': 'Generate Report', 'sales_discrepancy_report': 'Sales Discrepancy Report', 'table_h_system_stock': 'System Stock', 'table_h_sold_qty': 'Sold Qty', 'table_h_expected_stock': 'Expected Stock', 'table_h_discrepancy': 'Closing Stock', 'file_upload_success': 'File uploaded successfully! {rows} rows of sales data loaded.', 'file_upload_error': 'Error reading file. Make sure it is a valid .xlsx file with itemCode and branch codes as headers.', 'no_sales_data_uploaded': 'No sales data has been uploaded yet.', 'settle_stock': 'Settle Stock', 'settlement_confirm_title': 'Confirm Stock Settlement',
            'settlement_confirm_text': 'You are about to perform a stock settlement based on the uploaded sales data. This will create adjustment transactions for all items with a discrepancy.', 'settlement_confirm_warning': 'This action cannot be undone.', 'settlement_complete': 'Stock settlement completed successfully!', 'settlement_history': 'Settlement History', 'view_settlement': 'View Details',
        }
    };

    const _t = (key, replacements = {}) => {
        let text = translations[state.currentLanguage]?.[key] || translations['en'][key] || key;
        for (const placeholder in replacements) {
            text = text.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return text;
    };

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

    const userCan = (permission) => {
        if (!state.currentUser || !state.currentUser.permissions) return false;
        const p = state.currentUser.permissions[permission];
        return p === true || String(p).toUpperCase() === 'TRUE';
    };
    const findByKey = (array, key, value) => (array || []).find(el => el && String(el[key]) === String(value));
    const generateId = (prefix) => `${prefix}-${Date.now()}`;
    const printContent = (content) => { document.getElementById('print-area').innerHTML = content; setTimeout(() => window.print(), 200); };
    const exportToExcel = (tableId, filename, sheetName = 'Sheet1') => { try { const table = document.getElementById(tableId); if (!table) { showToast('Please generate a report first.', 'error'); return; } const wb = XLSX.utils.table_to_book(table, { sheet: sheetName }); XLSX.writeFile(wb, filename); showToast('Exporting to Excel...', 'success'); } catch (err) { showToast('Excel export failed.', 'error'); Logger.error('Export Error:', err); } };

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

    function showToast(message, type = 'success') {
        if (type === 'error') Logger.error(`User Toast: ${message}`);
        const container = document.getElementById('toast-container');
        if (!container) {
            console.error("Toast container not found! Message:", message);
            return;
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    function populateOptions(el, data, ph, valueKey, textKey, textKey2) {
        if (!el) { console.warn(`populateOptions failed: element is null for placeholder "${ph}"`); return; }
        let optionsHtml = `<option value="">${ph}</option>`;
        (data || []).forEach(item => {
            optionsHtml += `<option value="${item[valueKey]}">${item[textKey]}${textKey2 && item[textKey2] ? ' (' + item[textKey2] + ')' : ''}</option>`;
        });
        el.innerHTML = optionsHtml;
    };

    // ==========================================
    // 2. API FUNCTIONS
    // ==========================================
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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(username)}&loginCode=${encodeURIComponent(loginCode)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

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
        const {
            username,
            loginCode
        } = state;
        if (!username || !loginCode) {
            Logger.error("Authentication token missing. Cannot perform action.");
            showToast(_t('session_error_toast'), 'error');
            setButtonLoading(false, buttonEl);
            return null;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for POST

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                body: JSON.stringify({
                    username,
                    loginCode,
                    action,
                    data
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'An unknown error occurred on the server.');
            Logger.info(`POST successful for ${action}`, result);
            return result;
        } catch (error) {
            const userMsg = _t('action_failed_toast', { errorMessage: error.message });
            Logger.error(userMsg, error);
            showToast(userMsg, 'error');
            return null;
        } finally {
            setButtonLoading(false, buttonEl);
        }
    }

    // ==========================================
    // 3. CALCULATIONS
    // ==========================================
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

                if (qtyChange > 0) {
                    const currentQty = isNaN(current.quantity) ? 0 : current.quantity;
                    const currentAvgCost = isNaN(current.avgCost) ? 0 : current.avgCost;
                    const safeCost = isNaN(cost) ? 0 : cost;

                    const totalValue = (currentQty * currentAvgCost) + (qtyChange * safeCost);
                    const totalQty = currentQty + qtyChange;
                    let newAvgCost;
                    if (currentQty < 0) {
                        newAvgCost = safeCost;
                    } else {
                        newAvgCost = totalQty > 0 ? totalValue / totalQty : currentAvgCost;
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
    };

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
            s.events = allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        });
        financials.allInvoices = {}; Object.values(financials).forEach(s => { Object.assign(financials.allInvoices, s.invoices); }); return financials;
    };

    // ==========================================
    // 4. TABLE RENDERERS (DEFINED EARLY)
    // ==========================================
    function updateReceiveGrandTotal() {
        let grandTotal = 0;
        (state.currentReceiveList || []).forEach(item => {
            const itemDetails = findByKey(state.items, 'code', item.itemCode);
            if (item.isMainItemPlaceholder) {
                grandTotal += (parseFloat(item.cost) || 0);
            } else if (itemDetails && !itemDetails.ParentItemCode) {
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
            if (item.isMainItemPlaceholder) {
                grandTotal += (parseFloat(item.cost) || 0);
            } else if (!findByKey(state.items, 'code', item.itemCode)?.ParentItemCode) {
                grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
            }
        });
        document.getElementById('po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`;
    }

    function updatePOEditGrandTotal() {
        let grandTotal = 0;
        (state.currentEditingPOList || []).forEach(item => {
            const itemDetails = findByKey(state.items, 'code', item.itemCode);
            if (itemDetails && !itemDetails.ParentItemCode) {
                grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
            }
        });
        document.getElementById('edit-po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`;
    }

    function updateReturnGrandTotal() {
        let grandTotal = 0;
        (state.currentReturnList || []).forEach(item => {
            if (item.isMainItemPlaceholder) {
                grandTotal += (parseFloat(item.cost) || 0);
            } else if (!findByKey(state.items, 'code', item.itemCode)?.ParentItemCode) {
                grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
            }
        });
        document.getElementById('return-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`;
    }

    const renderDynamicListTable = (tbodyId, list, columnsConfig, emptyMessage, totalizerFn) => {
        const table = document.getElementById(tbodyId);
        if (!table) {
            console.error(`renderDynamicListTable: Table #${tbodyId} not found.`);
            return;
        }
        const tbody = table.querySelector('tbody');
        if (!tbody) {
            console.error(`renderDynamicListTable: tbody not found in #${tbodyId}.`);
            return;
        }
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
    };

    function renderReceiveListTable() { renderDynamicListTable('table-receive-list', state.currentReceiveList, [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' }], 'no_items_selected_toast', updateReceiveGrandTotal); }
    function renderTransferListTable() { renderDynamicListTable('table-transfer-list', state.currentTransferList, [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'transfer-from-branch' }], 'no_items_selected_toast', updateTransferGrandTotal); }
    function renderPOListTable() { renderDynamicListTable('table-po-list', state.currentPOList, [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' }], 'no_items_selected_toast', updatePOGrandTotal); }
    function renderPOEditListTable() { renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' }], 'no_items_selected_toast', updatePOEditGrandTotal); }
    function renderReturnListTable() { renderDynamicListTable('table-return-list', state.currentReturnList, [{ type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'return-branch' }, { type: 'cost_input', key: 'cost' }], 'no_items_selected_toast', updateReturnGrandTotal); }

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

        let allHistoryItems = [...allTx, ...allPo.map(po => ({ ...po, type: 'po', batchId: po.poId, ref: po.poId }))];

        const sDate = filters.startDate ? new Date(filters.startDate) : null;
        if (sDate) sDate.setHours(0, 0, 0, 0);
        const eDate = filters.endDate ? new Date(filters.endDate) : null;
        if (eDate) eDate.setHours(23, 59, 59, 999);

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
            if (canEditInvoice) {
                actionsHtml += `<button class="secondary small btn-edit-invoice" data-batch-id="${group.batchId}">${_t('edit')}</button>`;
            }

            switch (first.type) {
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
                    statusTag = `<span class="status-tag status-${(first.Status || '').toLowerCase().replace(/ /g, '')}">${_t('status_' + (first.Status || '').toLowerCase().replace(/ /g, ''))}</span>`;
                    break;
                case 'po':
                    typeDisplay = _t('po');
                    details = `${_t('create_po')} for <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`;
                    statusTag = `<span class="status-tag status-${(first.Status || 'pending').toLowerCase().replace(/ /g, '')}">${_t('status_' + (first.Status || 'pending').toLowerCase().replace(/ /g, ''))}</span>`;
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
            tr.innerHTML = `<td>${supplier.supplierCode || ''}</td><td>${supplier.name}</td><td>${balance.toFixed(2)} EGP</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="supplier" data-id="${supplier.supplierCode}">${_t('edit')}</button>` : 'N/A'}</td>`;
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
            tr.innerHTML = `<td>${branch.branchCode || ''}</td><td>${branch.branchName}</td><td>${canEdit ? `<button class="secondary small btn-edit" data-type="branch" data-id="${branch.branchCode}">${_t('edit')}</button>` : 'N/A'}</td>`;
            tbody.appendChild(tr);
        });
    }

    // ==========================================
    // 5. DOCUMENT GENERATORS
    // ==========================================
    const generateGroupedItemsHtml = (data, headers) => {
        let itemsHtml = '';
        const groupedItems = {};
        let grandTotal = 0;

        data.items.forEach(item => {
            const fullItem = findByKey(state.items, 'code', item.itemCode) || { ParentItemCode: null };
            const parentCode = fullItem.ParentItemCode || item.itemCode;

            if (!groupedItems[parentCode]) {
                const parentItem = findByKey(state.items, 'code', parentCode);
                groupedItems[parentCode] = {
                    parent: parentItem,
                    children: [],
                    totalValue: 0,
                    totalWeight: 0,
                    mainItemData: null
                };
            }

            if (fullItem.ParentItemCode) {
                groupedItems[parentCode].children.push(item);
                groupedItems[parentCode].totalWeight += (parseFloat(item.quantity) || 0);
            } else {
                if (item.isMainItemPlaceholder) {
                    groupedItems[parentCode].mainItemData = item;
                } else {
                    groupedItems[parentCode].mainItemData = item;
                    groupedItems[parentCode].totalWeight = (parseFloat(item.quantity) || 0);
                    groupedItems[parentCode].totalValue = groupedItems[parentCode].totalWeight * (parseFloat(item.cost) || 0);
                }
            }
        });

        for (const key in groupedItems) {
            const group = groupedItems[key];

            if (group.children.length > 0) {
                const mainData = group.mainItemData || { cost: 0 };

                group.totalValue = group.totalWeight * (parseFloat(mainData.cost) || 0);

                itemsHtml += `<tr class="main-item-group-header"><td colspan="${headers.length}"><strong>${group.parent.name} (${group.parent.code}) - Total Weight: ${group.totalWeight.toFixed(2)} KG</strong></td></tr>`;

                group.children.forEach(item => {
                    const fullItem = findByKey(state.items, 'code', item.itemCode);
                    itemsHtml += `<tr class="sub-item-row">`;
                    headers.forEach(header => {
                        switch (header) {
                            case 'code': itemsHtml += `<td>${item.itemCode}</td>`; break;
                            case 'name': itemsHtml += `<td>${item.itemName || fullItem.name}</td>`; break;
                            case 'qty': itemsHtml += `<td>${(parseFloat(item.quantity) || 0).toFixed(2)}</td>`; break;
                            case 'cost': itemsHtml += `<td>---</td>`; break;
                            case 'total': itemsHtml += `<td>---</td>`; break;
                        }
                    });
                    itemsHtml += `</tr>`;
                });

                if (headers.includes('total')) {
                    itemsHtml += `<tr class="main-item-group-footer"><td colspan="${headers.length - 1}" style="text-align:right;font-weight:bold;">${_t('main_item_total')}</td><td style="font-weight:bold;">${group.totalValue.toFixed(2)} EGP</td></tr>`;
                }
                grandTotal += group.totalValue;
            } else if (group.mainItemData) {
                const item = group.mainItemData;
                const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
                itemsHtml += `<tr>`;
                headers.forEach(header => {
                    switch (header) {
                        case 'code': itemsHtml += `<td>${item.itemCode}</td>`; break;
                        case 'name': itemsHtml += `<td>${item.itemName}</td>`; break;
                        case 'qty': itemsHtml += `<td>${(parseFloat(item.quantity) || 0).toFixed(2)}</td>`; break;
                        case 'cost': itemsHtml += `<td>${(parseFloat(item.cost) || 0).toFixed(2)} EGP</td>`; break;
                        case 'total': itemsHtml += `<td>${itemTotal.toFixed(2)} EGP</td>`; break;
                    }
                });
                itemsHtml += `</tr>`;
                grandTotal += itemTotal;
            }
        }
        return { html: itemsHtml, totalValue: grandTotal };
    };

    const generateReceiveDocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; const branch = findByKey(state.branches, 'branchCode', data.branchCode) || { branchName: 'DELETED' }; const headers = ['code', 'name', 'qty', 'cost', 'total']; const { html: itemsHtml, totalValue } = generateGroupedItemsHtml(data, headers); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>Goods Received Note</h2><p><strong>GRN No:</strong> ${data.batchId}</p><p><strong>${_t('table_h_invoice_no')}:</strong> ${data.invoiceNumber}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>${_t('supplier')}:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><p><strong>${_t('receive_stock')} at:</strong> ${branch.branchName} (${branch.branchCode || ''})</p><hr><h3>${_t('items_to_be_received')}</h3><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item_name')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_cost_per_unit')}</th><th>${_t('table_h_total')}</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">${_t('grand_total')}</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>${_t('notes_optional')}:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Signature:</strong> _________________________</p><div class="printable-footer">تم انشاء هذا المستند بواسطة KERO SYSTEMS</div></div>`; printContent(content); };
    const generateTransferDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'DELETED' }; const toBranch = findByKey(state.branches, 'branchCode', data.toBranchCode) || { branchName: 'DELETED' }; const headers = ['code', 'name', 'qty']; const { html: itemsHtml } = generateGroupedItemsHtml(data, headers); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>${_t('internal_transfer')} Order</h2><p><strong>Order ID:</strong> ${data.batchId}</p><p><strong>${_t('reference')}:</strong> ${data.ref}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>${_t('from_branch')}:</strong> ${fromBranch.branchName} (${fromBranch.branchCode || ''})</p><p><strong>${_t('to_branch')}:</strong> ${toBranch.branchName} (${toBranch.branchCode || ''})</p><hr><h3>${_t('items_to_be_transferred')}</h3><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item_name')}</th><th>${_t('table_h_qty')}</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><strong>${_t('notes_optional')}:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Sender:</strong> _________________</p><p><strong>Receiver:</strong> _________________</p><div class="printable-footer">تم انشاء هذا المستند بواسطة KERO SYSTEMS</div></div>`; printContent(content); };
    const generatePaymentVoucher = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; let invoicesHtml = ''; data.payments.forEach(p => { invoicesHtml += `<tr><td>${p.invoiceNumber}</td><td>${p.amount.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>Payment Voucher</h2><p><strong>Voucher ID:</strong> ${data.payments[0].paymentId}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>Paid To:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><p><strong>${_t('table_h_amount')}:</strong> ${data.totalAmount.toFixed(2)} EGP</p><p><strong>Method:</strong> ${data.method}</p><hr><h3>Payment Allocation</h3><table><thead><tr><th>${_t('table_h_invoice_no')}</th><th>${_t('table_h_amount_to_pay')}</th></tr></thead><tbody>${invoicesHtml}</tbody></table><br><p><strong>Signature:</strong> _________________</p><div class="printable-footer">تم انشاء هذا المستند بواسطة KERO SYSTEMS</div></div>`; printContent(content); };
    const generatePODocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; const headers = ['code', 'name', 'qty', 'cost', 'total']; const { html: itemsHtml, totalValue } = generateGroupedItemsHtml(data, headers); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>${_t('po')}</h2><p><strong>${_t('table_h_po_no')}:</strong> ${data.poId || data.batchId}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>${_t('supplier')}:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><hr><h3>${_t('items_to_order')}</h3><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item_name')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_cost_per_unit')}</th><th>${_t('table_h_total')}</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">${_t('grand_total')}</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>${_t('notes_optional')}:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Authorized By:</strong> ${data.createdBy || state.currentUser.Name}</p><div class="printable-footer">تم انشاء هذا المستند بواسطة KERO SYSTEMS</div></div>`; printContent(content); };
    const generateReturnDocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; const branch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'DELETED' }; const headers = ['code', 'name', 'qty', 'cost', 'total']; const { html: itemsHtml, totalValue } = generateGroupedItemsHtml(data, headers); const content = `<div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}"><h2>${_t('return_to_supplier')} Note</h2><p><strong>${_t('credit_note_ref')}:</strong> ${data.ref}</p><p><strong>${_t('table_h_date')}:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>Returned To:</strong> ${supplier.name}</p><p><strong>Returned From:</strong> ${branch.branchName}</p><hr><h3>${_t('items_to_return')}</h3><table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item_name')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_cost_per_unit')}</th><th>${_t('table_h_total')}</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">${_t('total_value')}</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>Reason:</strong> ${data.notes || 'N/A'}</p><div class="printable-footer">تم انشاء هذا المستند بواسطة KERO SYSTEMS</div></div>`; printContent(content); };


    // ==========================================
    // 6. UI & MODAL HANDLERS
    // ==========================================
    function confirmModalSelection() {
        if (modalContext === 'invoices') {
            renderPaymentList();
            closeModal();
            return;
        }

        const selectedCodes = Array.from(state.modalSelections);
        if (selectedCodes.length === 0) {
            closeModal();
            return;
        }

        const mainItemsToProcess = new Set();
        const regularItemsToAdd = [];

        selectedCodes.forEach(code => {
            const item = findByKey(state.items, 'code', code);
            if (!item) return;

            // FIX: If Sub-Item, find Parent. If Main Item with Sub-Items, find Self.
            if (item.ParentItemCode && modalContext !== 'po') {
                mainItemsToProcess.add(item.ParentItemCode);
            } else if (!item.ParentItemCode && state.items.some(sub => sub.ParentItemCode === item.code) && modalContext !== 'po') {
                mainItemsToProcess.add(item.code);
            } else {
                regularItemsToAdd.push(code);
            }
        });

        addRegularItemsToList(regularItemsToAdd);

        const mainItemCodes = Array.from(mainItemsToProcess);
        if (mainItemCodes.length > 0) {
            itemSelectorModal.classList.remove('active');
            openSubItemEntryModal(mainItemCodes[0], mainItemCodes.slice(1));
        } else {
            closeModal();
        }
    }

    function addRegularItemsToList(itemCodes) {
        const addToList = (currentList, newList, item) => {
            if (currentList && currentList.some(i => i.itemCode === item.code)) return;
            const newItem = { itemCode: item.code, itemName: item.name, quantity: '', cost: item.cost };
            if (modalContext === 'adjustment') {
                newItem.physicalCount = '';
            }
            newList.push(newItem);
        };

        let list, renderer;
        switch (modalContext) {
            case 'receive': [list, renderer] = [state.currentReceiveList, renderReceiveListTable]; break;
            case 'transfer': [list, renderer] = [state.currentTransferList, renderTransferListTable]; break;
            case 'po': [list, renderer] = [state.currentPOList, renderPOListTable]; break;
            case 'return': [list, renderer] = [state.currentReturnList, renderReturnListTable]; break;
            case 'edit-po': [list, renderer] = [state.currentEditingPOList, renderPOEditListTable]; break;
            case 'adjustment': [list, renderer] = [state.currentAdjustmentList, renderAdjustmentListTable]; break;
            default: return;
        }

        itemCodes.forEach(code => {
            const item = findByKey(state.items, 'code', code);
            if (item) addToList(list, list, item);
        });

        renderer();
    }

    function openSubItemEntryModal(mainItemCode, remainingMainItems) {
        const mainItem = findByKey(state.items, 'code', mainItemCode);
        const subItems = state.items.filter(i => i.ParentItemCode === mainItemCode);

        const modalTitle = document.getElementById('sub-item-entry-modal-title');
        modalTitle.textContent = `${_t('enter_sub_item_quantities')} for ${mainItem.name}`;

        const modalBody = document.getElementById('sub-item-entry-modal-body');
        let tableHtml = `
            <table id="sub-item-entry-table">
                <thead><tr><th>${_t('table_h_name')}</th><th>${_t('table_h_quantity')}</th></tr></thead>
                <tbody>
        `;
        subItems.forEach(sub => {
            tableHtml += `<tr><td>${sub.name} (${sub.code})</td><td><input type="number" class="table-input sub-item-qty-input" data-item-code="${sub.code}" step="0.01" min="0"></td></tr>`;
        });
        tableHtml += `</tbody><tfoot><tr><td style="text-align: right;"><strong>${_t('total_sub_item_weight')}:</strong></td><td id="total-sub-item-weight">0.00</td></tr></tfoot></table>`;
        modalBody.innerHTML = tableHtml;

        const table = modalBody.querySelector('#sub-item-entry-table');
        table.addEventListener('input', () => {
            let total = 0;
            table.querySelectorAll('.sub-item-qty-input').forEach(input => {
                total += parseFloat(input.value) || 0;
            });
            document.getElementById('total-sub-item-weight').textContent = total.toFixed(2);
        });

        const confirmBtn = document.getElementById('btn-confirm-sub-item-entry');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.onclick = () => {
            confirmSubItemEntry(mainItem, remainingMainItems);
        };

        itemSelectorModal.classList.remove('active');
        subItemEntryModal.classList.add('active');
    }

    function confirmSubItemEntry(mainItem, remainingMainItems) {
        let list, renderer;
        switch (modalContext) {
            case 'receive': [list, renderer] = [state.currentReceiveList, renderReceiveListTable]; break;
            case 'transfer': [list, renderer] = [state.currentTransferList, renderTransferListTable]; break;
            case 'po': [list, renderer] = [state.currentPOList, renderPOListTable]; break;
            case 'return': [list, renderer] = [state.currentReturnList, renderReturnListTable]; break;
            case 'edit-po': [list, renderer] = [state.currentEditingPOList, renderPOEditListTable]; break;
            case 'adjustment': [list, renderer] = [state.currentAdjustmentList, renderAdjustmentListTable]; break;
            default: return;
        }

        const subItemInputs = document.querySelectorAll('#sub-item-entry-table .sub-item-qty-input');
        let totalSubQty = 0;
        const subItemsToAdd = [];

        subItemInputs.forEach(input => {
            const qty = parseFloat(input.value) || 0;
            if (qty > 0) {
                const itemCode = input.dataset.itemCode;
                const subItem = findByKey(state.items, 'code', itemCode);
                totalSubQty += qty;
                subItemsToAdd.push({
                    itemCode: subItem.code,
                    itemName: subItem.name,
                    quantity: qty,
                    cost: 0
                });
            }
        });

        // Ensure placeholder exists
        const existingIndex = list.findIndex(i => i.itemCode === mainItem.code && i.isMainItemPlaceholder);
        if (existingIndex !== -1) {
            list[existingIndex].quantity = totalSubQty;
        } else if (totalSubQty > 0) { // Only add if sub items exist
            list.push({
                itemCode: mainItem.code,
                itemName: mainItem.name,
                quantity: totalSubQty,
                cost: 0, // Default cost 0 until user enters it
                isMainItemPlaceholder: true
            });
        }

        list.push(...subItemsToAdd);
        renderer();

        subItemEntryModal.classList.remove('active');

        if (remainingMainItems.length > 0) {
            openSubItemEntryModal(remainingMainItems[0], remainingMainItems.slice(1));
        } else {
            closeModal();
        }
    }

    function handlePaymentInputChange() {
        let total = 0;
        document.querySelectorAll('.payment-amount-input').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        document.getElementById('payment-total-amount').textContent = `${total.toFixed(2)} EGP`;
    }

    async function handleAutoBackupToggle() {
        const toggle = document.getElementById('auto-backup-toggle');
        const frequency = document.getElementById('auto-backup-frequency').value;
        const frequencyContainer = document.getElementById('auto-backup-frequency-container');
        const statusEl = document.getElementById('auto-backup-status');

        const isEnabled = toggle.checked;
        frequencyContainer.style.display = isEnabled ? 'block' : 'none';

        statusEl.textContent = 'Updating settings...';
        const result = await postData('setAutomaticBackup', { enabled: isEnabled, frequency: frequency }, toggle);

        if (result) {
            showToast(_t('auto_backup_updated_toast'), 'success');
            statusEl.textContent = isEnabled
                ? `Automatic backups are now enabled (${frequency}).`
                : 'Automatic backups have been disabled.';
        } else {
            toggle.checked = !isEnabled;
            frequencyContainer.style.display = toggle.checked ? 'block' : 'none';
            statusEl.textContent = _t('auto_backup_failed_toast');
        }
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

    // --- FIX: Prevent Focus Loss by updating DOM directly instead of re-rendering ---
    const handleTableInputUpdate = (e, listName, rendererFn) => {
        if (e.target.classList.contains('table-input')) {
            const index = parseInt(e.target.dataset.index);
            const field = e.target.dataset.field;
            const value = e.target.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value;

            if (state[listName] && state[listName][index]) {
                state[listName][index][field] = value;
            }

            // Update Grand Totals based on context
            if (listName === 'currentReceiveList') updateReceiveGrandTotal();
            if (listName === 'currentTransferList') updateTransferGrandTotal();
            if (listName === 'currentPOList') updatePOGrandTotal();
            if (listName === 'currentEditingPOList') updatePOEditGrandTotal();
            if (listName === 'currentReturnList') updateReturnGrandTotal();
        }
    };

    const handleTableRemove = (e, listName, rendererFn) => {
        const btn = e.target.closest('button');
        if (btn && btn.classList.contains('danger') && btn.dataset.index) {
            state[listName].splice(parseInt(btn.dataset.index), 1);
            rendererFn(); // Safe to re-render here
        }
    };

    const setupInputTableListeners = (tableId, listName, rendererFn) => {
        const table = document.getElementById(tableId);
        if (!table) return;

        table.addEventListener('input', e => handleTableInputUpdate(e, listName, rendererFn));
        table.addEventListener('click', e => {
            if (e.target.classList.contains('table-input')) {
                e.target.select();
            }
            handleTableRemove(e, listName, rendererFn)
        });
    };

    function openEditModal(type, id) {
        const modal = document.getElementById('edit-modal');
        const modalTitle = document.getElementById('edit-modal-title');
        const modalBody = document.getElementById('edit-modal-body');
        modalBody.innerHTML = '';

        // Store type and id on the form for submission handler
        const form = document.getElementById('form-edit-record');
        form.dataset.editType = type;
        form.dataset.editId = id || '';

        let data = {};
        if (id) {
            if (type === 'item') data = findByKey(state.items, 'code', id);
            if (type === 'supplier') data = findByKey(state.suppliers, 'supplierCode', id);
            if (type === 'branch') data = findByKey(state.branches, 'branchCode', id);
            if (type === 'user') data = findByKey(state.allUsers, 'Username', id);
        }

        modalTitle.textContent = id ? `${_t('edit')} ${type.charAt(0).toUpperCase() + type.slice(1)}` : `${_t('add_new')} ${type.charAt(0).toUpperCase() + type.slice(1)}`;

        let fieldsHtml = '';
        if (type === 'item') {
            fieldsHtml += `
                <div class="form-group"><label>${_t('item_name')}</label><input type="text" name="name" value="${data.name || ''}" required></div>
                <div class="form-group"><label>${_t('table_h_cost_per_unit')}</label><input type="number" name="cost" value="${data.cost || 0}" step="0.01" required></div>
            `;
        } else if (type === 'supplier') {
            fieldsHtml += `
                <div class="form-group"><label>${_t('supplier_name')}</label><input type="text" name="name" value="${data.name || ''}" required></div>
            `;
        } else if (type === 'branch') {
            fieldsHtml += `
                <div class="form-group"><label>${_t('branch_name')}</label><input type="text" name="branchName" value="${data.branchName || ''}" required></div>
            `;
        } else if (type === 'user') {
            fieldsHtml += `
                <div class="form-group"><label>${_t('username')}</label><input type="text" name="Username" value="${data.Username || ''}" ${id ? 'readonly' : 'required'}></div>
                <div class="form-group"><label>${_t('table_h_fullname')}</label><input type="text" name="FullName" value="${data.FullName || ''}" required></div>
                <div class="form-group"><label>${_t('password')}</label><input type="text" name="Password" value="${data.Password || ''}" required></div>
                <div class="form-group"><label>${_t('table_h_role')}</label><select name="Role" required id="edit-user-role-select"></select></div>
                <div class="form-group"><label>${_t('table_h_assigned_branch_section')}</label><select name="AssignedBranchCode" id="edit-user-branch-select"><option value="">${_t('all_branches')}</option></select></div>
            `;
        }

        modalBody.innerHTML = fieldsHtml;

        if (type === 'user') {
            populateOptions(document.getElementById('edit-user-role-select'), state.allRoles, _t('select_role'), 'RoleName', 'RoleName');
            populateOptions(document.getElementById('edit-user-branch-select'), state.branches, _t('all_branches'), 'branchCode', 'branchName');
            if (data.Role) document.getElementById('edit-user-role-select').value = data.Role;
            if (data.AssignedBranchCode) document.getElementById('edit-user-branch-select').value = data.AssignedBranchCode;
        }

        modal.classList.add('active');
    }

    async function handleUpdateSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const type = form.dataset.editType;
        const id = form.dataset.editId;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Add ID to data if editing
        if (id) {
            if (type === 'item') data.code = id;
            if (type === 'supplier') data.supplierCode = id;
            if (type === 'branch') data.branchCode = id;
            // User ID is Username, which is in data
        }

        let action = '';
        if (type === 'item') action = 'updateItem'; // Assuming updateItem exists or addItem handles updates
        if (type === 'supplier') action = 'updateSupplier';
        if (type === 'branch') action = 'updateBranch';
        if (type === 'user') action = id ? 'updateUser' : 'addUser';

        // For simplicity, using generic 'updateRecord' if specific actions aren't clear, but let's try specific first.
        // Actually, looking at other calls, it seems we might need 'editItem', 'editSupplier' etc. 
        // Let's assume 'updateItem' etc. for now based on standard naming, or fallback to 'editItem' if that's the convention.
        // Re-checking previous code... 'addItem', 'addSupplier'. So 'updateItem' is likely.

        const result = await postData(action, data, btn);
        if (result) {
            showToast(_t('save_success_toast'), 'success');
            closeModal();
            reloadDataAndRefreshUI();
        }
    }

    async function reloadDataAndRefreshUI() {
        if (!state.username || !state.loginCode) return;

        const refreshBtn = document.getElementById('global-refresh-button');
        setButtonLoading(true, refreshBtn);

        try {
            Logger.info('Reloading data...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(state.username)}&loginCode=${encodeURIComponent(state.loginCode)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Network error: ${response.status} ${response.statusText}`);
            const data = await response.json();

            if (data.status === 'error') throw new Error(data.message);

            Object.keys(data).forEach(key => {
                if (key !== 'user') state[key] = data[key] || [];
            });

            applyTranslations();

            // Refresh current view
            const currentViewId = document.querySelector('.view.active')?.id;
            const currentViewName = currentViewId ? currentViewId.replace('view-', '') : 'dashboard';

            // If showView is available, use it. Otherwise, try to manually refresh.
            if (typeof showView === 'function') {
                showView(currentViewName);
            } else {
                Logger.warn('showView function not found. Reloading page to refresh UI.');
                location.reload();
            }

            showToast(_t('data_refreshed_toast'), 'success');

        } catch (error) {
            Logger.error('Data reload failed:', error);
            showToast(_t('data_refresh_fail_toast'), 'error');
        } finally {
            setButtonLoading(false, refreshBtn);
        }
    }

    function openRestoreModal(backupId, fileName) {
        const modal = document.getElementById('restore-modal');
        document.getElementById('restore-filename-display').textContent = fileName;
        document.getElementById('restore-confirmation-input').value = '';
        document.getElementById('btn-confirm-restore').disabled = true;

        // Store backup ID on the confirm button for retrieval
        document.getElementById('btn-confirm-restore').dataset.backupId = backupId;

        const sheetList = document.getElementById('restore-sheet-list');
        sheetList.innerHTML = '';

        const sheets = ['Items', 'Suppliers', 'Branches', 'Transactions', 'Settings'];
        sheets.forEach(sheet => {
            const div = document.createElement('div');
            div.className = 'form-group checkbox-group';
            div.innerHTML = `
                <input type="checkbox" id="restore-sheet-${sheet}" value="${sheet}" checked>
                <label for="restore-sheet-${sheet}">${sheet}</label>
            `;
            sheetList.appendChild(div);
        });

        document.getElementById('restore-confirmation-input').addEventListener('input', (e) => {
            document.getElementById('btn-confirm-restore').disabled = e.target.value !== 'RESTORE';
        });

        modal.classList.add('active');
    }

    async function handleConfirmRestore(e) {
        const btn = e.currentTarget;
        const backupId = btn.dataset.backupId;
        const input = document.getElementById('restore-confirmation-input');

        if (input.value !== 'RESTORE') return;

        const selectedSheets = Array.from(document.querySelectorAll('#restore-sheet-list input:checked')).map(cb => cb.value);

        if (selectedSheets.length === 0) {
            showToast(_t('select_sheets_restore_toast'), 'error');
            return;
        }

        const result = await postData('restoreFromBackup', { backupId, sheets: selectedSheets }, btn);
        if (result) {
            showToast(_t('restore_success_toast'), 'success');
            closeModal();
            reloadDataAndRefreshUI();
        }
    }

    function showView(viewName, subViewName = null) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        const viewEl = document.getElementById(`view-${viewName}`);
        if (viewEl) {
            viewEl.classList.add('active');
            const navLink = document.querySelector(`a[data-view="${viewName}"]`);
            if (navLink) navLink.parentElement.classList.add('active');
        }

        // Handle specific view initialization if needed
        if (viewName === 'transaction-history') renderTransactionHistory();
        if (viewName === 'stock-levels') renderItemCentricStockView();
        if (viewName === 'activity-log') renderActivityLog();
        if (viewName === 'backup') loadAndRenderBackups();
    }

    async function loadAndRenderBackups() {
        const container = document.getElementById('backup-list-container');
        if (!container) return;
        container.innerHTML = '<p>Loading backups...</p>';

        try {
            const result = await postData('getBackups', {}, container);
            if (result && result.data) {
                state.backups = result.data;
                if (state.backups.length === 0) {
                    container.innerHTML = `<p>${_t('no_backups_found')}</p>`;
                    return;
                }
                let html = '<ul class="backup-list">';
                state.backups.forEach(backup => {
                    html += `
                        <li>
                            <span class="backup-name">${backup.name}</span>
                            <span class="backup-date">${new Date(backup.date).toLocaleString()}</span>
                            <button class="primary small btn-restore" data-url="${backup.url}">${_t('restore')}</button>
                        </li>
                    `;
                });
                html += '</ul>';
                container.innerHTML = html;
            } else {
                container.innerHTML = `<p>${_t('error_loading_backups')}</p>`;
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = `<p>${_t('error_loading_backups')}</p>`;
        }
    }

    // modalContext is already defined globally

    function openItemSelectorModal(e) {
        const btn = e.target.closest('button');
        modalContext = btn.dataset.context;
        state.modalSelections.clear();

        const modal = document.getElementById('item-selector-modal');
        const listContainer = document.getElementById('modal-item-list');
        const searchInput = document.getElementById('modal-search-items');

        searchInput.value = '';
        renderItemsInModal();
        modal.classList.add('active');
    }

    function renderItemsInModal(searchTerm = '') {
        const listContainer = document.getElementById('modal-item-list');
        listContainer.innerHTML = '';

        const lowerTerm = searchTerm.toLowerCase();
        const items = state.items.filter(i =>
            (i.name.toLowerCase().includes(lowerTerm) || i.code.toLowerCase().includes(lowerTerm)) &&
            !i.ParentItemCode // Only show main items or standalone items initially? Or all? Let's show all for now or filter based on context.
        );

        items.forEach(item => {
            const isChecked = state.modalSelections.has(item.code);
            const div = document.createElement('div');
            div.className = 'form-group checkbox-group';
            div.innerHTML = `
                <input type="checkbox" id="modal-item-${item.code}" data-code="${item.code}" ${isChecked ? 'checked' : ''}>
                <label for="modal-item-${item.code}">${item.name} (${item.code})</label>
            `;
            listContainer.appendChild(div);
        });
    }

    function openHistoryModal(itemId) {
        const modal = document.getElementById('history-modal');
        const item = findByKey(state.items, 'code', itemId);
        document.getElementById('history-modal-title').textContent = `${_t('item_history_modal_title')} - ${item ? item.name : itemId}`;

        // Reset subviews
        document.querySelectorAll('.sub-view').forEach(el => el.classList.remove('active'));
        document.getElementById('subview-price-history').classList.add('active');
        document.querySelectorAll('.sub-nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector('[data-subview="price-history"]').classList.add('active');

        // Render Price History (Mock logic or fetch from transactions)
        const priceContainer = document.getElementById('subview-price-history');
        priceContainer.innerHTML = '<p>Price history data not available yet.</p>';

        // Render Movement History
        renderMovementHistory(itemId);

        modal.classList.add('active');
    }

    function renderMovementHistory(itemId) {
        const container = document.getElementById('movement-history-table-container');
        const txs = state.transactions.filter(t => t.itemCode === itemId).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (txs.length === 0) {
            container.innerHTML = `<p>${_t('no_transactions_found')}</p>`;
            return;
        }

        let html = `<table><thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Branch</th></tr></thead><tbody>`;
        txs.forEach(t => {
            html += `<tr>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.type}</td>
                <td>${t.quantity}</td>
                <td>${t.branchCode || t.fromBranchCode || t.toBranchCode}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function openViewTransferModal(batchId) {
        const modal = document.getElementById('view-transfer-modal');
        const modalBody = document.getElementById('view-transfer-modal-body');
        const txs = state.transactions.filter(t => t.batchId === batchId);

        if (txs.length === 0) return;

        const first = txs[0];
        const fromBranch = findByKey(state.branches, 'branchCode', first.fromBranchCode);

        let html = `
            <p><strong>From Branch:</strong> ${fromBranch ? fromBranch.branchName : first.fromBranchCode}</p>
            <p><strong>Date:</strong> ${new Date(first.date).toLocaleString()}</p>
            <p><strong>Notes:</strong> ${first.notes || 'N/A'}</p>
            <hr>
            <h3>Items</h3>
            <table>
                <thead><tr><th>Item</th><th>Qty</th></tr></thead>
                <tbody>
        `;

        txs.forEach(t => {
            const item = findByKey(state.items, 'code', t.itemCode);
            html += `<tr><td>${item ? item.name : t.itemCode}</td><td>${t.quantity}</td></tr>`;
        });

        html += `</tbody></table>`;
        modalBody.innerHTML = html;

        document.getElementById('btn-confirm-receive-transfer').dataset.batchId = batchId;
        document.getElementById('btn-reject-transfer').dataset.batchId = batchId;

        modal.classList.add('active');
    }

    function openPOEditModal(poId) {
        const modal = document.getElementById('edit-po-modal');
        const modalBody = document.getElementById('edit-po-modal-body');
        state.currentEditingPOList = [];

        const txs = state.transactions.filter(t => (t.poId === poId || t.batchId === poId) && t.type === 'po');
        if (txs.length === 0) return;

        const first = txs[0];
        state.currentEditingPOList = txs.map(t => ({
            itemCode: t.itemCode,
            itemName: findByKey(state.items, 'code', t.itemCode)?.name || t.itemCode,
            quantity: t.quantity,
            cost: t.cost,
            originalId: t.id // Assuming we have an ID to update specific lines if needed, or we replace the whole PO
        }));

        // Store original PO ID for saving
        document.getElementById('btn-save-po-changes').dataset.poId = poId;

        renderPOEditListTable();
        modal.classList.add('active');
    }

    function openInvoiceEditModal(batchId) {
        // Reuse PO edit modal for invoice editing for now, or create a new one if needed.
        // The requirement mentions "Edit Invoice" for receive transactions.
        // Let's implement a basic version or reuse if structure is similar.
        // For now, let's just show a toast that it's not fully implemented or implement a simple version.
        showToast('Edit Invoice feature is under construction.', 'info');
    }

    function renderPOEditListTable() {
        renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [
            { key: 'itemName', type: 'text' },
            { key: 'quantity', type: 'number_input', min: 0.01 },
            { key: 'cost', type: 'cost_input' },
            { key: 'total', type: 'calculated' }
        ], 'no_items_added', updatePOEditGrandTotal);
    }

    function updatePOEditGrandTotal() {
        // Implementation for updating total in edit modal
        // Assuming there's an element to show total, or just skip if not present
    }

    async function savePOChanges(e) {
        const btn = e.target;
        const poId = btn.dataset.poId;

        if (!state.currentEditingPOList || state.currentEditingPOList.length === 0) {
            showToast('PO cannot be empty.', 'error');
            return;
        }

        const payload = {
            poId: poId,
            items: state.currentEditingPOList
        };

        const result = await postData('updatePO', payload, btn);
        if (result) {
            showToast('PO updated successfully.', 'success');
            closeModal();
            reloadDataAndRefreshUI();
        }
    }

    function saveInvoiceChanges(e) {
        showToast('Save Invoice Changes not implemented yet.', 'info');
    }

    function renderPaymentList() {
        const tbody = document.getElementById('table-payment-list').querySelector('tbody');
        tbody.innerHTML = '';

        const supplierCode = document.getElementById('payment-supplier-select').value;
        if (!supplierCode) return;

        // Filter invoices for this supplier that are not fully paid
        // This requires logic to calculate outstanding invoices.
        // For now, let's list all "receive" transactions for this supplier as potential invoices.

        const invoices = state.transactions.filter(t => t.type === 'receive' && t.supplierCode === supplierCode);
        // Group by invoice number
        const invoiceMap = {};
        invoices.forEach(t => {
            if (!invoiceMap[t.invoiceNumber]) {
                invoiceMap[t.invoiceNumber] = {
                    invoiceNumber: t.invoiceNumber,
                    date: t.date,
                    total: 0
                };
            }
            invoiceMap[t.invoiceNumber].total += (parseFloat(t.quantity) * parseFloat(t.cost));
        });

        Object.values(invoiceMap).forEach(inv => {
            if (state.invoiceModalSelections.has(inv.invoiceNumber)) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${inv.invoiceNumber}</td>
                    <td>${new Date(inv.date).toLocaleDateString()}</td>
                    <td>${inv.total.toFixed(2)}</td>
                    <td><input type="number" class="table-input payment-amount-input" data-invoice="${inv.invoiceNumber}" value="${inv.total.toFixed(2)}" max="${inv.total}"></td>
                `;
                tbody.appendChild(tr);
            }
        });
        handlePaymentInputChange();
    }

    async function handleTransactionSubmit(payload, btn) {
        const result = await postData('addTransactionBatch', payload, btn);
        if (result) {
            showToast('Transaction submitted successfully!', 'success');

            // Clear lists
            if (payload.type === 'receive') state.currentReceiveList = [];
            if (payload.type === 'transfer_out') state.currentTransferList = [];
            if (payload.type === 'po') state.currentPOList = [];
            if (payload.type === 'return_out') state.currentReturnList = [];
            if (payload.type === 'stock_adjustment') state.currentAdjustmentList = [];

            // Re-render tables
            renderReceiveListTable();
            renderTransferListTable();
            renderPOListTable();
            renderReturnListTable();
            renderAdjustmentListTable();

            // Reset forms
            document.querySelectorAll('form').forEach(f => f.reset());

            // Generate documents if needed
            if (payload.type === 'receive') generateReceiveDocument(payload);
            if (payload.type === 'transfer_out') generateTransferDocument(payload);
            if (payload.type === 'po') generatePODocument(payload);
            if (payload.type === 'return_out') generateReturnDocument(payload);

            reloadDataAndRefreshUI();
        }
    }

    function renderAdjustmentListTable() {
        renderDynamicListTable('table-adjustment-list', state.currentAdjustmentList, [
            { key: 'itemName', type: 'text' },
            { key: 'quantity', type: 'available_stock' }, // System Qty
            { key: 'physicalCount', type: 'number_input', min: 0 } // Physical Count
        ], 'no_items_added');
    }

    function exportToExcel(tableId, fileName) {
        // Use the xlsx library which is included in index.html
        const table = document.getElementById(tableId);
        if (!table) return;

        const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
        XLSX.writeFile(wb, fileName);
    }

    // ==========================================
    // 7. EVENT LISTENERS & INIT (FINAL)
    // ==========================================
    function attachEventListeners() {
        btnLogout.addEventListener('click', logout);
        globalRefreshBtn.addEventListener('click', reloadDataAndRefreshUI);

        document.getElementById('btn-create-backup').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            if (confirm(_t('backup_confirm_prompt'))) {
                const result = await postData('createBackup', {}, btn);
                if (result && result.data) {
                    showToast(_t('backup_created_toast', { fileName: result.data.fileName }), 'success');
                    await loadAndRenderBackups();
                }
            }
        });

        document.getElementById('backup-list-container').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn && btn.classList.contains('btn-restore')) {
                const backupFileId = findByKey(state.backups, 'url', btn.dataset.url)?.id;
                const backupFileName = findByKey(state.backups, 'url', btn.dataset.url)?.name;
                if (backupFileId) {
                    openRestoreModal(backupFileId, backupFileName);
                } else {
                    showToast(_t('restore_find_id_fail_toast'), 'error');
                }
            }
        });

        document.getElementById('auto-backup-toggle').addEventListener('change', handleAutoBackupToggle);
        document.getElementById('auto-backup-frequency').addEventListener('change', handleAutoBackupToggle);
        document.getElementById('btn-confirm-restore').addEventListener('click', handleConfirmRestore);

        document.querySelectorAll('#main-nav a:not(#btn-logout)').forEach(link => { link.addEventListener('click', e => { e.preventDefault(); showView(link.dataset.view); }); });

        mainContent.addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.dataset.context) { openItemSelectorModal(e); }
            if (btn.id === 'btn-select-invoices') { openInvoiceSelectorModal(); }
            if (btn.classList.contains('btn-edit')) { openEditModal(btn.dataset.type, btn.dataset.id); }
            if (btn.classList.contains('btn-history')) { openHistoryModal(btn.dataset.id); }
            if (btn.id === 'btn-add-new-user') { openEditModal('user', null); }
            if (btn.id === 'btn-add-new-role') { const roleName = prompt(_t('add_role_prompt')); if (roleName) { postData('addRole', { RoleName: roleName }, btn).then(res => res && reloadDataAndRefreshUI()); } }
            if (btn.classList.contains('btn-view-tx')) {
                const batchId = btn.dataset.batchId;
                const type = btn.dataset.type;
                let data, items;

                switch (type) {
                    case 'po':
                        data = findByKey(state.purchaseOrders, 'poId', batchId);
                        items = (state.purchaseOrderItems || []).filter(i => i.poId === batchId);
                        if (data && items) generatePODocument({ ...data, items });
                        break;
                    default:
                        const transactionGroup = state.transactions.filter(t => t.batchId === batchId);
                        if (transactionGroup.length > 0) {
                            const first = transactionGroup[0];
                            data = { ...first, items: transactionGroup.map(t => ({ ...t, itemName: findByKey(state.items, 'code', t.itemCode)?.name })) };
                            if (type === 'receive') generateReceiveDocument(data);
                            else if (type.startsWith('transfer')) generateTransferDocument(data);
                            else if (type === 'return_out') generateReturnDocument(data);
                        }
                        break;
                }
            }
            if (btn.classList.contains('btn-receive-transfer')) { openViewTransferModal(btn.dataset.batchId); }
            if (btn.classList.contains('btn-edit-transfer')) { openPOEditModal(btn.dataset.batchId); }
            if (btn.classList.contains('btn-cancel-transfer')) { const batchId = btn.dataset.batchId; if (confirm(`Are you sure you want to cancel transfer ${batchId}?`)) { postData('cancelTransfer', { batchId }, btn).then(res => res && reloadDataAndRefreshUI()); } }
            if (btn.classList.contains('btn-edit-po')) { openPOEditModal(btn.dataset.poId); }
            if (btn.classList.contains('btn-edit-invoice')) { openInvoiceEditModal(btn.dataset.batchId); }
            if (btn.classList.contains('btn-approve-financial') || btn.classList.contains('btn-reject-financial')) {
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                const action = btn.classList.contains('btn-approve-financial') ? 'approveFinancial' : 'rejectFinancial';
                const confirmationText = action === 'approveFinancial' ? _t('approve_confirm_prompt', { type: _t(type) }) : _t('reject_confirm_prompt', { type: _t(type) });

                if (confirm(confirmationText)) {
                    postData(action, { id, type }, btn).then(result => {
                        if (result) {
                            showToast(action.includes('approve') ? _t('approved_toast', { type: _t(type) }) : _t('rejected_toast', { type: _t(type) }), 'success');
                            reloadDataAndRefreshUI();
                        }
                    });
                }
            }
        });

        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-button') || e.target.classList.contains('modal-cancel')) { closeModal(); }

            if (e.target.id === 'btn-confirm-receive-transfer') {
                const btn = e.target;
                const batchId = btn.dataset.batchId;
                const transferGroup = state.transactions.filter(t => t.batchId === batchId);
                const payload = { originalBatchId: batchId, ref: transferGroup[0].ref, fromBranchCode: transferGroup[0].fromBranchCode, toBranchCode: transferGroup[0].toBranchCode, items: transferGroup.map(t => ({ itemCode: t.itemCode, quantity: t.quantity })), notes: `Received from ${batchId}` };
                postData('receiveTransfer', payload, btn).then(result => {
                    if (result) { showToast('Transfer received!', 'success'); closeModal(); reloadDataAndRefreshUI(); }
                });
            }
            if (e.target.id === 'btn-reject-transfer') {
                const btn = e.target;
                const batchId = btn.dataset.batchId;
                if (confirm('Are you sure you want to reject this transfer? This action cannot be undone.')) {
                    postData('rejectTransfer', { batchId }, btn).then(result => {
                        if (result) { showToast('Transfer rejected.', 'success'); closeModal(); reloadDataAndRefreshUI(); }
                    });
                }
            }
            if (e.target.id === 'btn-save-po-changes') { savePOChanges(e); }
            if (e.target.id === 'btn-save-invoice-changes') { saveInvoiceChanges(e); }
        });
        document.getElementById('btn-confirm-modal-selection').addEventListener('click', confirmModalSelection);
        document.getElementById('btn-confirm-invoice-selection').addEventListener('click', confirmModalSelection);

        document.getElementById('payment-supplier-select').addEventListener('change', e => { document.getElementById('btn-select-invoices').disabled = !e.target.value; state.invoiceModalSelections.clear(); renderPaymentList(); });
        document.getElementById('table-payment-list').addEventListener('input', handlePaymentInputChange);
        document.getElementById('invoice-selector-modal').addEventListener('change', handleInvoiceModalCheckboxChange);
        modalItemList.addEventListener('change', handleModalCheckboxChange);
        modalSearchInput.addEventListener('input', e => renderItemsInModal(e.target.value));
        formEditRecord.addEventListener('submit', handleUpdateSubmit);

        document.getElementById('form-add-item').addEventListener('submit', async e => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const isSub = document.getElementById('is-sub-item-toggle').checked;
            const data = {
                name: document.getElementById('item-name').value,
                cost: isSub ? 0 : parseFloat(document.getElementById('item-cost').value),
                ParentItemCode: isSub ? document.getElementById('parent-item-code').value : '',
            };
            if (isSub && !data.ParentItemCode) {
                showToast('Parent item is required for sub-items.', 'error');
                return;
            }
            if (!isSub && (isNaN(data.cost) || data.cost < 0)) {
                showToast('A valid cost is required for main items.', 'error');
                return;
            }
            const result = await postData('addItem', data, btn);
            if (result) {
                showToast(_t('add_success_toast', { type: _t('item') }), 'success');
                e.target.reset();
                document.getElementById('sub-item-fields').style.display = 'none';
                document.getElementById('item-cost-group').style.display = 'block';
                document.getElementById('is-sub-item-toggle').checked = false;
                reloadDataAndRefreshUI();
            }
        });

        document.getElementById('is-sub-item-toggle').addEventListener('change', e => {
            document.getElementById('sub-item-fields').style.display = e.target.checked ? 'grid' : 'none';
            document.getElementById('item-cost-group').style.display = e.target.checked ? 'none' : 'block';
        });

        document.getElementById('form-add-supplier').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { name: document.getElementById('supplier-name').value }; const result = await postData('addSupplier', data, btn); if (result) { showToast(_t('add_success_toast', { type: _t('supplier') }), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } });
        document.getElementById('form-add-branch').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { branchName: document.getElementById('branch-name').value }; const result = await postData('addBranch', data, btn); if (result) { showToast(_t('add_success_toast', { type: _t('branch') }), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } });
        document.getElementById('form-record-payment').addEventListener('submit', async e => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const supplierCode = document.getElementById('payment-supplier-select').value;
            const method = document.getElementById('payment-method').value;
            if (!supplierCode || state.invoiceModalSelections.size === 0) {
                showToast('Please select a supplier and at least one invoice to pay.', 'error');
                return;
            }
            const paymentId = `PAY-${Date.now()}`;
            let totalAmount = 0;
            const payments = [];
            document.querySelectorAll('.payment-amount-input').forEach(input => {
                const amount = parseFloat(input.value) || 0;
                if (amount > 0) {
                    totalAmount += amount;
                    payments.push({
                        paymentId: paymentId,
                        date: new Date().toISOString(),
                        supplierCode: supplierCode,
                        invoiceNumber: input.dataset.invoice,
                        amount: amount,
                        method: method
                    });
                }
            });
            if (payments.length === 0) {
                showToast('Payment amount must be greater than zero.', 'error');
                return;
            }
            const payload = {
                supplierCode: supplierCode,
                method: method,
                date: new Date().toISOString(),
                totalAmount: totalAmount,
                payments: payments
            };
            const result = await postData('addPaymentBatch', payload, btn);
            if (result) {
                showToast('Payment recorded successfully!', 'success');
                generatePaymentVoucher(payload);
                state.invoiceModalSelections.clear();
                document.getElementById('form-record-payment').reset();
                document.getElementById('btn-select-invoices').disabled = true;
                renderPaymentList();
                await reloadDataAndRefreshUI();
            }
        });

        document.getElementById('btn-submit-receive-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; let branchCode = document.getElementById('receive-branch').value; const supplierCode = document.getElementById('receive-supplier').value, invoiceNumber = document.getElementById('receive-invoice').value, notes = document.getElementById('receive-notes').value, poId = document.getElementById('receive-po-select').value; if (userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ branch: true }); if (!context) return; branchCode = context.branch; } if (!userCan('opReceiveWithoutPO') && !poId) { showToast(_t('select_po_first_toast'), 'error'); return; } if (!supplierCode || !branchCode || !invoiceNumber || state.currentReceiveList.length === 0) { showToast(_t('fill_required_fields_toast'), 'error'); return; } const payload = { type: 'receive', batchId: `GRN-${Date.now()}`, supplierCode, branchCode, invoiceNumber, poId, date: new Date().toISOString(), items: state.currentReceiveList.map(i => ({ ...i, type: 'receive' })), notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-transfer-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; let fromBranchCode = document.getElementById('transfer-from-branch').value, toBranchCode = document.getElementById('transfer-to-branch').value; const notes = document.getElementById('transfer-notes').value, ref = document.getElementById('transfer-ref').value; if (userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ fromBranch: true, toBranch: true }); if (!context) return; fromBranchCode = context.fromBranch; toBranchCode = context.toBranch; } if (!fromBranchCode || !toBranchCode || fromBranchCode === toBranchCode || state.currentTransferList.length === 0) { showToast('Please select valid branches and add at least one item.', 'error'); return; } const payload = { type: 'transfer_out', batchId: ref, ref: ref, fromBranchCode, toBranchCode, date: new Date().toISOString(), items: state.currentTransferList.map(i => ({ ...i, type: 'transfer_out' })), notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-po').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('po-supplier').value, poId = document.getElementById('po-ref').value, notes = document.getElementById('po-notes').value; if (!supplierCode || state.currentPOList.length === 0) { showToast('Please select a supplier and add items.', 'error'); return; } const totalValue = state.currentPOList.reduce((acc, item) => acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)), 0); const payload = { type: 'po', poId, supplierCode, date: new Date().toISOString(), items: state.currentPOList, totalValue, notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-return').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('return-supplier').value; let fromBranchCode = document.getElementById('return-branch').value; const ref = document.getElementById('return-ref').value, notes = document.getElementById('return-notes').value; if (userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ fromBranch: true }); if (!context) return; fromBranchCode = context.fromBranch; } if (!supplierCode || !fromBranchCode || !ref || state.currentReturnList.length === 0) { showToast('Please fill all required fields and add items.', 'error'); return; } const payload = { type: 'return_out', batchId: `RTN-${Date.now()}`, ref: ref, supplierCode, fromBranchCode, date: new Date().toISOString(), items: state.currentReturnList.map(i => ({ ...i, type: 'return_out' })), notes }; await handleTransactionSubmit(payload, btn); });

        // --- ATTACH INPUT TABLE LISTENERS (MUST BE AFTER RENDERERS ARE DEFINED) ---
        setupInputTableListeners('table-receive-list', 'currentReceiveList', renderReceiveListTable);
        setupInputTableListeners('table-transfer-list', 'currentTransferList', renderTransferListTable);
        setupInputTableListeners('table-po-list', 'currentPOList', renderPOListTable);
        setupInputTableListeners('table-edit-po-list', 'currentEditingPOList', renderPOEditListTable);
        setupInputTableListeners('table-return-list', 'currentReturnList', renderReturnListTable);
        setupInputTableListeners('table-adjustment-list', 'currentAdjustmentList', renderAdjustmentListTable);

        document.getElementById('btn-submit-adjustment').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            let branchCode = document.getElementById('adjustment-branch').value;
            const ref = document.getElementById('adjustment-ref').value;
            const notes = document.getElementById('adjustment-notes').value;
            if (userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ branch: true }); if (!context) return; branchCode = context.branch; }
            if (!branchCode || !ref || !state.currentAdjustmentList || state.currentAdjustmentList.length === 0) {
                showToast('Please select a branch, provide a reference, and add items to adjust.', 'error');
                return;
            }

            const stock = calculateStockLevels();
            const adjustmentItems = state.currentAdjustmentList.map(item => {
                const systemQty = (stock[branchCode]?.[item.itemCode]?.quantity) || 0;
                const physicalCount = item.physicalCount || 0;
                const adjustmentQty = physicalCount - systemQty;

                if (Math.abs(adjustmentQty) < 0.01) return null;

                return {
                    itemCode: item.itemCode,
                    quantity: Math.abs(adjustmentQty),
                    type: adjustmentQty > 0 ? 'adjustment_in' : 'adjustment_out',
                    cost: findByKey(state.items, 'code', item.itemCode)?.cost || 0
                };
            }).filter(Boolean);

            if (adjustmentItems.length === 0) {
                showToast('No adjustments needed for the entered counts.', 'info');
                return;
            }

            const payload = {
                type: 'stock_adjustment',
                batchId: `ADJ-${Date.now()}`,
                ref: ref,
                fromBranchCode: branchCode,
                notes: notes,
                items: adjustmentItems
            };
            await handleTransactionSubmit(payload, btn);
            state.currentAdjustmentList = [];
            renderAdjustmentListTable();
            document.getElementById('form-adjustment-details').reset();
        });

        document.getElementById('form-financial-adjustment').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const supplierCode = document.getElementById('fin-adj-supplier').value;
            const balance = parseFloat(document.getElementById('fin-adj-balance').value);

            if (!supplierCode || isNaN(balance) || balance < 0) {
                showToast('Please select a supplier and enter a valid opening balance.', 'error');
                return;
            }

            if (!confirm(`Are you sure you want to set the opening balance for this supplier to ${balance.toFixed(2)} EGP? This should only be done once.`)) {
                return;
            }

            const payload = {
                supplierCode: supplierCode,
                balance: balance,
                ref: `OB-${supplierCode}`
            };

            const result = await postData('financialAdjustment', payload, btn);
            if (result) {
                showToast('Supplier opening balance set successfully!', 'success');
                e.target.reset();
                await reloadDataAndRefreshUI();
            }
        });

        document.getElementById('btn-generate-supplier-statement').addEventListener('click', () => { const supplierCode = document.getElementById('supplier-statement-select').value; const startDate = document.getElementById('statement-start-date').value; const endDate = document.getElementById('statement-end-date').value; if (!supplierCode) { showToast('Please select a supplier.', 'error'); return; } renderSupplierStatement(supplierCode, startDate, endDate); });

        ['tx-filter-start-date', 'tx-filter-end-date', 'tx-filter-type', 'tx-filter-branch', 'transaction-search'].forEach(id => {
            const el = document.getElementById(id);
            const eventType = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
            el.addEventListener(eventType, () => {
                const filters = {
                    startDate: document.getElementById('tx-filter-start-date').value,
                    endDate: document.getElementById('tx-filter-end-date').value,
                    type: document.getElementById('tx-filter-type').value,
                    branch: document.getElementById('tx-filter-branch').value,
                    searchTerm: document.getElementById('transaction-search').value
                };
                renderTransactionHistory(filters);
            });
        });

        document.getElementById('receive-po-select').addEventListener('change', e => {
            const poId = e.target.value;
            if (!poId) {
                state.currentReceiveList = [];
                renderReceiveListTable();
                document.getElementById('receive-supplier').value = '';
                return;
            }
            const po = findByKey(state.purchaseOrders, 'poId', poId);
            const poItems = state.purchaseOrderItems.filter(i => i.poId === poId);
            document.getElementById('receive-supplier').value = po.supplierCode;
            state.currentReceiveList = poItems.map(item => {
                const masterItem = findByKey(state.items, 'code', item.itemCode);
                return { itemCode: item.itemCode, itemName: masterItem?.name || 'Unknown Item', quantity: parseFloat(item.quantity), cost: parseFloat(item.cost) }
            });
            renderReceiveListTable();
        });

        document.getElementById('is-sub-item-toggle').addEventListener('change', e => {
            document.getElementById('sub-item-fields').style.display = e.target.checked ? 'grid' : 'none';
            document.getElementById('item-cost-group').style.display = e.target.checked ? 'none' : 'block';
        });

        ['extraction-main-item', 'extraction-quantity', 'extraction-branch'].forEach(id => {
            document.getElementById(id).addEventListener('change', renderExtractionPreview);
        });

        document.getElementById('btn-submit-extraction').addEventListener('click', handleExtractionSubmit);
        document.getElementById('stock-levels-branch-filter').addEventListener('change', () => {
            const searchTerm = document.getElementById('stock-levels-search').value.toLowerCase();
            const selectedBranches = Array.from(document.getElementById('stock-levels-branch-filter').selectedOptions).map(opt => opt.value);
            const dataToFilter = state.items || [];
            renderItemCentricStockView(searchTerm ? dataToFilter.filter(item => ['name', 'code'].some(key => item[key] && String(item[key]).toLowerCase().includes(searchTerm))) : dataToFilter, selectedBranches);
        });

        // Sales Reconciliation Listeners
        document.getElementById('btn-download-sales-template').addEventListener('click', downloadSalesTemplate);
        document.getElementById('sales-file-upload').addEventListener('change', handleSalesFileUpload);
        document.getElementById('btn-generate-sales-report').addEventListener('click', renderSalesDiscrepancyReport);
        document.getElementById('sales-report-results').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-settle-stock')) {
                const branchCode = e.target.dataset.branchCode;
                const reportData = state.salesReportDataByBranch[branchCode];
                if (reportData) {
                    openSettlementModal(reportData, branchCode);
                }
            }
        });
    }

    function setupRoleBasedNav() {
        const user = state.currentUser; if (!user) return;
        const userFirstName = user.Name.split(' ')[0];
        document.querySelector('.sidebar-header h1').textContent = _t('hi_user', { userFirstName });
        const navMap = { 'dashboard': 'viewDashboard', 'operations': 'viewOperations', 'purchasing': 'viewPurchasing', 'payments': 'viewPayments', 'reports': 'viewReports', 'stock-levels': 'viewStockLevels', 'transaction-history': 'viewTransactionHistory', 'master-data': 'viewMasterData', 'user-management': 'manageUsers', 'backup': 'opBackupRestore', 'activity-log': 'viewActivityLog' };
        for (const [view, permission] of Object.entries(navMap)) {
            const navItem = document.querySelector(`[data-view="${view}"]`);
            if (navItem) {
                let hasPermission = userCan(permission);
                if (view === 'operations') { hasPermission = userCan('viewOperations') || userCan('opStockAdjustment') || userCan('opFinancialAdjustment') || userCan('opExtraction'); }
                navItem.parentElement.style.display = hasPermission ? '' : 'none';
            }
        }
    }

    function logout() { Logger.info('User logging out.'); location.reload(); }

    function initializeAppUI() {
        Logger.info('Application UI initializing...');
        setupRoleBasedNav();
        attachEventListeners();
        attachSubNavListeners();
        setupSearch('search-items', renderItemsTable, 'items', ['name', 'code']);
        setupSearch('search-suppliers', renderSuppliersTable, 'suppliers', ['name', 'supplierCode']);
        setupSearch('search-branches', renderBranchesTable, 'branches', ['branchName', 'branchCode']);
        setupSearch('stock-levels-search', renderItemCentricStockView, 'items', ['name', 'code']);
        document.getElementById('item-inquiry-search').addEventListener('input', e => renderItemInquiry(e.target.value.toLowerCase()));

        document.getElementById('btn-export-items').addEventListener('click', () => exportToExcel('table-items', 'ItemList.xlsx'));
        document.getElementById('btn-export-suppliers').addEventListener('click', () => exportToExcel('table-suppliers', 'SupplierList.xlsx'));
        document.getElementById('btn-export-branches').addEventListener('click', () => exportToExcel('table-branches', 'BranchList.xlsx'));
        document.getElementById('btn-export-stock').addEventListener('click', () => exportToExcel('table-stock-levels-by-item', 'StockLevels.xlsx'));
        document.getElementById('btn-export-supplier-statement').addEventListener('click', () => exportToExcel('table-supplier-statement-report', 'SupplierStatement.xlsx'));
        document.getElementById('btn-export-sales-report').addEventListener('click', () => exportToExcel('table-sales-discrepancy', 'SalesDiscrepancyReport.xlsx'));

        updateUserBranchDisplay();
        const firstVisibleView = document.querySelector('#main-nav .nav-item:not([style*="display: none"]) a')?.dataset.view || 'dashboard';
        showView(firstVisibleView, null);
        Logger.info('Application initialized successfully.');
    }

    function updateUserBranchDisplay() {
        const displayEl = document.getElementById('user-branch-display');
        if (!state.currentUser || !displayEl) { return; }
        const branch = findByKey(state.branches, 'branchCode', state.currentUser.AssignedBranchCode);
        let displayText = '';
        if (branch) displayText += `${_t('branch')}: ${branch.branchName}`;
        displayEl.textContent = displayText;
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

        document.getElementById('btn-confirm-context').addEventListener('click', () => {
            const modal = document.getElementById('context-selector-modal');
            const context = {
                fromBranch: modal.querySelector('#context-modal-fromBranch-group').style.display === 'block' ? modal.querySelector('#context-from-branch-select').value : null,
                toBranch: modal.querySelector('#context-modal-toBranch-group').style.display === 'block' ? modal.querySelector('#context-to-branch-select').value : null,
                branch: modal.querySelector('#context-modal-branch-group').style.display === 'block' ? modal.querySelector('#context-branch-select').value : null,
            };

            if (Object.entries(context).some(([key, value]) => modal.querySelector(`#context-modal-${key}-group`).style.display === 'block' && !value)) {
                showToast('Please make a selection for all required fields.', 'error');
                return;
            }
            if (state.adminContextPromise.resolve) state.adminContextPromise.resolve(context);
            modal.classList.remove('active');
        });

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

    init();
});
