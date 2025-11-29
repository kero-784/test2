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
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwSM8G9AqHy6Nnhwcpit7xRJbKMkY93ACaHA3_3pzwZlNaF6ORzVL-Ev10FF7HQiu9M/exec';

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
        currentUser: null,
        username: null,
        loginCode: null,
        currentLanguage: 'en',
        items: [],
        suppliers: [],
        branches: [],
        transactions: [],
        payments: [],
        purchaseOrders: [],
        purchaseOrderItems: [],
        activityLog: [],
        settlements: [],
        settlementItems: [],
        currentReceiveList: [],
        currentTransferList: [],
        currentPOList: [],
        currentReturnList: [],
        currentEditingPOList: [],
        currentAdjustmentList: [],
        uploadedSalesData: [],
        salesReportDataByBranch: {},
        modalSelections: new Set(),
        invoiceModalSelections: new Set(),
        allUsers: [],
        allRoles: [],
        backups: [],
        adminContextPromise: {},
    };
    let modalContext = null;

    const translations = {
        'en': {
            'packing_stock': 'Packing Stock',
            'login_prompt': 'Please enter your credentials to continue.',
            'username': 'Username',
            'password_code': 'Password / Login Code',
            'login': 'Login',
            'signing_in': 'Signing in...',
            'loading': 'Loading...',
            'hi_user': 'Hi, {userFirstName}',
            'refresh_all_data': 'Refresh All Data',
            'dashboard': 'Dashboard',
            'stock_operations': 'Stock Operations',
            'purchasing': 'Purchasing',
            'payments': 'Payments',
            'reports': 'Reports',
            'stock_levels': 'Stock Levels',
            'transaction_history': 'Transaction History',
            'master_data': 'Master Data',
            'user_management': 'User Management',
            'backup_restore': 'Backup',
            'activity_log': 'Activity Log',
            'logout': 'Logout',
            'branch': 'Branch',
            'total_items': 'Total Items',
            'total_stock_value': 'Total Stock Value',
            'total_suppliers': 'Total Suppliers',
            'total_branches': 'Total Branches',
            'add_new_item': 'Add New Item',
            'item_code': 'Item Code (Unique ID)',
            'item_name': 'Item Name',
            'default_cost': 'Default Cost',
            'add_item_btn': 'Add Item',
            'add_new_supplier': 'Add New Supplier',
            'supplier_code': 'Supplier Code (Unique ID)',
            'supplier_name': 'Supplier Name',
            'add_supplier_btn': 'Add Supplier',
            'add_new_branch': 'Add New Branch',
            'branch_code': 'Branch Code (Unique ID)',
            'branch_name': 'Branch Name',
            'add_branch_btn': 'Add Branch',
            'auto_backup_settings': 'Automatic Backup Settings',
            'auto_backup_desc': 'Enable automatic backups to save a copy of your data periodically. Backups are stored in "StockApp Backups" in Google Drive.',
            'enable_auto_backups': 'Enable Automatic Backups',
            'backup_frequency': 'Backup Frequency',
            'daily_backup': 'Daily (at 2am)',
            'weekly_backup': 'Weekly (Sunday at 2am)',
            'manual_backup_restore': 'Manual Backup & Restore',
            'manual_backup_desc': 'Create an immediate backup or restore from a previously created file.',
            'create_new_manual_backup': 'Create New Manual Backup',
            'available_backups': 'Available Backups',
            'loading_backups': 'Loading backup list...',
            'no_backups_found': 'No backups found.',
            'backup_name': 'Backup Name',
            'date_created': 'Date Created',
            'actions': 'Actions',
            'open': 'Open',
            'restore': 'Restore',
            'items': 'Items',
            'suppliers': 'Suppliers',
            'branches': 'Branches',
            'view_items': 'View Items',
            'add_item': 'Add Item',
            'view_suppliers': 'View Suppliers',
            'add_supplier': 'Add Supplier',
            'view_branches': 'View Branches',
            'add_branch': 'Add Branch',
            'item_list': 'Item List',
            'search_items_placeholder': 'Search by name or code...',
            'export_to_excel': 'Export to Excel',
            'table_h_code': 'Code',
            'table_h_name': 'Name',
            'table_h_cost': 'Default Cost',
            'table_h_actions': 'Actions',
            'no_items_found': 'No items found.',
            'edit': 'Edit',
            'history': 'History',
            'supplier_list': 'Supplier List',
            'search_suppliers_placeholder': 'Search by name or code...',
            'table_h_balance': 'Balance (Owed)',
            'no_suppliers_found': 'No suppliers found.',
            'branch_list': 'Branch List',
            'search_branches_placeholder': 'Search by name or code...',
            'no_branches_found': 'No branches found.',
            'record_payment': 'Record a Payment',
            'step1_select_supplier': '1. Select Supplier',
            'step2_select_invoices': '2. Select Invoices to Pay',
            'select_invoices_btn': 'Select Invoices...',
            'step3_payment_method': '3. Enter Payment Method',
            'payment_method_placeholder': 'e.g., Cash, Bank Transfer',
            'step4_confirm_amounts': '4. Confirm Amounts',
            'table_h_invoice_no': 'Invoice #',
            'table_h_balance_due': 'Balance Due',
            'table_h_amount_to_pay': 'Amount to Pay',
            'total_payment': 'Total Payment:',
            'submit_payment_btn': 'Submit Payment',
            'supplier_statement': 'Supplier Statement',
            'select_a_supplier': 'Select a Supplier',
            'generate': 'Generate',
            'select_a_branch': 'Select a Branch',
            'all_items': 'All Items',
            'all_branches': 'All Branches',
            'receive_stock': 'Receive Stock',
            'internal_transfer': 'Internal Transfer',
            'return_to_supplier': 'Return to Supplier',
            'in_transit_report': 'In-Transit Report',
            'adjustments': 'Adjustments',
            'pending_incoming_transfers': 'Pending Incoming Transfers',
            'table_h_date_sent': 'Date Sent',
            'table_h_from_branch': 'From Branch',
            'table_h_ref_no': 'Reference #',
            'view_confirm': 'View/Confirm',
            'receive_stock_from_supplier': 'Receive Stock from Supplier',
            'receive_against_po': 'Receive Against PO',
            'optional': '(Optional)',
            'select_a_po': 'Select a Purchase Order',
            'to_branch': 'To Branch',
            'notes_optional': 'Notes (Optional)',
            'items_to_be_received': 'Items to be Received',
            'table_h_quantity': 'Quantity',
            'table_h_cost_per_unit': 'Cost/Unit',
            'table_h_total': 'Total',
            'grand_total': 'Grand Total:',
            'select_items': 'Select Items',
            'submit_for_approval': 'Submit for Approval',
            'from_branch': 'From Branch',
            'send_stock_to_branch': 'Send Stock to Another Branch',
            'transfer_ref_no': 'Transfer Reference #',
            'items_to_be_transferred': 'Items to be Transferred',
            'table_h_qty_to_transfer': 'Quantity to Transfer',
            'total_items_to_transfer': 'Total Items to Transfer:',
            'confirm_transfer_all': 'Confirm & Transfer All Items',
            'credit_note_ref': 'Credit Note Ref #',
            'reason_for_return': 'Reason for Return (Optional)',
            'items_to_return': 'Items to Return',
            'table_h_qty_to_return': 'Qty to Return',
            'total_return_value': 'Total Return Value:',
            'confirm_return_all': 'Confirm & Return All Items',
            'goods_in_transit_report': 'Goods In-Transit Report',
            'table_h_to_branch': 'To Branch',
            'table_h_status': 'Status',
            'stock_count_adjustment': 'Stock Count Adjustment',
            'reference': 'Reference',
            'stocktake_example': 'e.g., Stocktake April 2024',
            'notes_reason': 'Notes / Reason',
            'items_to_adjust': 'Items to Adjust',
            'table_h_system_qty': 'System Qty',
            'table_h_physical_count': 'Physical Count',
            'table_h_adjustment': 'Adjustment',
            'process_stock_adjustment': 'Process Stock Adjustment',
            'supplier_opening_balance': 'Supplier Opening Balance Adjustment',
            'supplier_opening_balance_desc': 'Use this to set the initial amount owed to a supplier. This should typically only be done once per supplier when setting up.',
            'opening_balance_amount': 'Opening Balance (Amount Owed)',
            'set_opening_balance': 'Set Opening Balance',
            'create_po': 'Create Purchase Order',
            'view_pos': 'View Purchase Orders',
            'pending_approval': 'Pending Approval',
            'po_details': 'Purchase Order Details',
            'po_ref_no': 'PO Reference #',
            'items_to_order': 'Items to Order',
            'po_list': 'Purchase Order List',
            'table_h_po_no': 'PO #',
            'table_h_date': 'Date',
            'table_h_total_value': 'Total Value',
            'tx_pending_financial_approval': 'Transactions Pending Financial Approval',
            'table_h_type': 'Type',
            'table_h_details': 'Details',
            'table_h_amount': 'Amount',
            'stock_by_item': 'Stock by Item',
            'stock_by_item_your_branch': 'Stock by Item (Your Branch)',
            'stock_by_item_all_branches': 'Stock by Item (All Branches)',
            'search_items_stock_placeholder': 'Search by item name or code...',
            'item_stock_inquiry': 'Item Stock Inquiry (Drill-down)',
            'item_stock_inquiry_placeholder': 'Start typing an item name or code...',
            'no_stock_for_item': 'No stock for this item.',
            'table_h_qty': 'Qty',
            'table_h_value': 'Value',
            'transaction_log': 'Transaction Log',
            'all_types': 'All Types',
            'search_tx_placeholder': 'Search by Ref#, Item Code/Name...',
            'table_h_batch_ref': 'Batch/Ref #',
            'view_print': 'View/Print',
            'users': 'Users',
            'add_new_user': 'Add New User',
            'table_h_fullname': 'Full Name',
            'table_h_role': 'Role',
            'table_h_assigned_branch_section': 'Assigned Branch',
            'roles': 'Roles',
            'add_new_role': 'Add New Role',
            'table_h_rolename': 'Role Name',
            'system_activity_log': 'System Activity Log',
            'table_h_timestamp': 'Timestamp',
            'table_h_user': 'User',
            'table_h_action': 'Action',
            'table_h_description': 'Description',
            'select_items_modal_title': 'Select Items',
            'search_items_placeholder_modal': 'Search items...',
            'confirm_selection': 'Confirm Selection',
            'cancel': 'Cancel',
            'select_invoices_modal_title': 'Select Invoices to Pay',
            'edit_modal_title': 'Edit',
            'save_changes': 'Save Changes',
            'confirm_transfer_receipt_modal_title': 'Confirm Transfer Receipt',
            'reject': 'Reject',
            'confirm_receipt': 'Confirm Receipt',
            'item_history_modal_title': 'Item History',
            'price_history': 'Price History',
            'movement_history': 'Movement History',
            'close': 'Close',
            'edit_po_modal_title': 'Edit Purchase Order',
            'restore_from_backup_modal_title': 'Restore from Backup',
            'restore_from_backup_desc': 'You are about to restore data from the backup file:',
            'restore_step1': '1. Select which data sheets to restore.',
            'restore_step2': '2. Confirm this irreversible action.',
            'restore_danger_warning': 'EXTREME DANGER:',
            'restore_danger_text': 'This will permanently delete the current data in the selected live sheets and replace it with the data from the backup. This action CANNOT be undone.',
            'restore_prompt': 'Please type RESTORE into the box below to proceed.',
            'confirm_and_restore': 'Confirm and Restore Data',
            'session_error_toast': 'Session error. Please logout and login again.',
            'action_failed_toast': 'Action Failed: {errorMessage}',
            'data_refreshed_toast': 'Data refreshed!',
            'data_refresh_fail_toast': 'Could not refresh data. Please try again.',
            'backup_created_toast': 'Backup created: {fileName}',
            'backup_confirm_prompt': 'This will create a full, manual backup of the current spreadsheet. Continue?',
            'auto_backup_updated_toast': 'Automatic backup settings updated!',
            'auto_backup_failed_toast': 'Failed to update settings. Please try again.',
            'restore_select_sheet_toast': 'You must select at least one sheet to restore.',
            'restore_completed_toast': 'Restore completed successfully!',
            'restore_find_id_fail_toast': 'Could not find backup file ID.',
            'tx_processed_toast': '{txType} processed!',
            'tx_processed_approval_toast': '{txType} processed! Submitted for approval.',
            'select_po_first_toast': 'You must select a Purchase Order to receive stock.',
            'fill_required_fields_toast': 'Please fill all required fields and add items.',
            'status_approved': 'Approved',
            'status_pending': 'Pending Approval',
            'status_rejected': 'Rejected',
            'status_completed': 'Completed',
            'status_in_transit': 'In Transit',
            'status_cancelled': 'Cancelled',
            'po': 'Purchase Order',
            'receive': 'Receive',
            'transfer': 'Transfer',
            'issue': 'Issue',
            'return': 'Return',
            'stock_adjustment': 'Stock Adjustment',
            'history_for': 'History for: {itemName} ({itemCode})',
            'edit_item': 'Edit Item',
            'edit_supplier': 'Edit Supplier',
            'edit_branch': 'Edit Branch',
            'edit_user': 'Edit User',
            'add_new_user_title': 'Add New User',
            'edit_user_password_label': 'Password / Login Code (leave blank to keep unchanged)',
            'edit_user_password_label_new': 'Password / Login Code',
            'toggle_user_enable': 'Enable User',
            'toggle_user_disable': 'Disable User',
            'toggle_user_enable_confirm': 'Are you sure you want to enable this user? They will be able to log in again.',
            'toggle_user_disable_confirm': 'Are you sure you want to disable this user? They will not be able to log in.',
            'user_enabled_toast': 'User enabled successfully!',
            'user_disabled_toast': 'User disabled successfully!',
            'edit_permissions_for': 'Edit Permissions for {roleName}',
            'delete_role': 'Delete Role',
            'add_role_prompt': 'Enter new role name:',
            'update_success_toast': '{type} updated successfully!',
            'add_success_toast': '{type} added successfully!',
            'no_invoices_for_supplier': 'No invoices found for this supplier.',
            'no_unpaid_invoices': 'No unpaid invoices for this supplier.',
            'invoice_modal_details': 'Date: {date} | Amount Due: {balance} EGP',
            'no_items_selected_toast': 'No items selected. Click "Select Items".',
            'no_items_for_adjustment': 'No items selected for adjustment.',
            'report_period_all_time': 'for all time',
            'report_period_from_to': 'from {startDate} to {endDate}',
            'report_period_from': 'from {startDate}',
            'report_period_until': 'until {endDate}',
            'supplier_statement_title': 'Supplier Statement: {supplierName}',
            'date_generated': 'Date Generated:',
            'table_h_debit': 'Debit',
            'table_h_credit': 'Credit',
            'opening_balance_as_of': 'Opening Balance as of {date}',
            'closing_balance': 'Closing Balance:',
            'price_change_log': 'Price Change Log',
            'table_h_old_cost': 'Old Cost',
            'table_h_new_cost': 'New Cost',
            'table_h_change': 'Change',
            'table_h_source': 'Source',
            'table_h_updated_by': 'Updated By',
            'no_price_history': 'No price history found for this item.',
            'no_movements_found': 'No movements found for the selected filters.',
            'table_h_qty_in': 'Qty In',
            'table_h_qty_out': 'Qty Out',
            'movement_details_receive': 'From: {supplier} To: {branch}',
            'movement_details_transfer_out': 'Sent from: {fromBranch} To: {toBranch}',
            'movement_details_transfer_in': 'Received at: {toBranch} From: {fromBranch}',
            'movement_details_return': 'Returned from: {branch} To: {supplier}',
            'movement_details_adjustment': 'Stock count at: {branch}',
            'no_pending_financial_approval': 'No items are pending financial approval.',
            'approve': 'Approve',
            'approve_confirm_prompt': 'Are you sure you want to approve this {type}?',
            'reject_confirm_prompt': 'Are you sure you want to reject this {type}? This action cannot be undone.',
            'approved_toast': '{type} approved successfully!',
            'rejected_toast': '{type} rejected successfully!',
            'extraction': 'Extraction',
            'is_sub_item': 'This is a Sub-Item',
            'parent_item': 'Parent Item',
            'select_parent_item': 'Select Parent Item',
            'table_h_parent_item': 'Parent Item',
            'extraction_title': 'Perform Production / Extraction',
            'main_item_to_consume': 'Main Item to Consume',
            'quantity_to_consume': 'Quantity to Consume',
            'sub_items_produced': 'Sub-Items Produced',
            'enter_produced_quantity': 'Enter Produced Quantity',
            'confirm_extraction': 'Confirm Extraction',
            'main_item_total': 'Main Item Total',
            'extraction_in': 'Extraction In',
            'extraction_out': 'Extraction Out',
            'movement_details_extraction_out': 'Extracted at: {branch}',
            'movement_details_extraction_in': 'Produced at: {branch}',
            'enter_sub_item_quantities': 'Enter Sub-Item Quantities',
            'add_to_transaction': 'Add to Transaction',
            'total_sub_item_weight': 'Total Sub-Item Weight',
            'show_cuts': 'Show Cuts',
            'sales_data': 'Sales Data',
            'sales_reconciliation': 'Sales Reconciliation',
            'sales_data_desc': 'Upload daily sales data to generate a stock discrepancy report.',
            'step1_download_template': '1. Download Template',
            'download_template_desc': 'Download the Excel template with a list of all your items. The template will include a `branch` column.',
            'download_template_btn': 'Download Sales Template',
            'step2_upload_file': '2. Upload Completed File',
            'upload_file_desc': 'Upload the filled-out Excel file. It must contain `itemCode`, `soldQty`, and branch codes as headers.',
            'upload_btn': 'Choose Excel File',
            'step3_generate_report': '3. Generate Discrepancy Report',
            'select_branch_for_report': 'Select Branch for Report',
            'generate_discrepancy_report_btn': 'Generate Report',
            'sales_discrepancy_report': 'Sales Discrepancy Report',
            'table_h_system_stock': 'System Stock',
            'table_h_sold_qty': 'Sold Qty',
            'table_h_expected_stock': 'Expected Stock',
            'table_h_discrepancy': 'Closing Stock',
            'file_upload_success': 'File uploaded successfully! {rows} rows of sales data loaded.',
            'file_upload_error': 'Error reading file. Make sure it is a valid .xlsx file with itemCode and branch codes as headers.',
            'no_sales_data_uploaded': 'No sales data has been uploaded yet.',
            'settle_stock': 'Settle Stock',
            'settlement_confirm_title': 'Confirm Stock Settlement',
            'settlement_confirm_text': 'You are about to perform a stock settlement based on the uploaded sales data. This will create adjustment transactions for all items with a discrepancy.',
            'settlement_confirm_warning': 'This action cannot be undone.',
            'settlement_complete': 'Stock settlement completed successfully!',
            'settlement_history': 'Settlement History',
            'view_settlement': 'View Details',
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
            const userMsg = _t('action_failed_toast', {errorMessage: error.message});
            Logger.error(userMsg, error);
            showToast(userMsg, 'error');
            return null;
        } finally {
            setButtonLoading(false, buttonEl);
        }
    }

    function showView(viewId, subViewId = null) {
        Logger.info(`Switching view to: ${viewId}` + (subViewId ? `/${subViewId}` : ''));
        
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('#main-nav a').forEach(link => link.classList.remove('active'));

        const viewToShow = document.getElementById(`view-${viewId}`);
        if(viewToShow) viewToShow.classList.add('active');
        
        const activeLink = document.querySelector(`[data-view="${viewId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            const viewTitleKey = activeLink.querySelector('span').dataset.translateKey;
            document.getElementById('view-title').textContent = _t(viewTitleKey);
            document.getElementById('view-title').dataset.translateKey = viewTitleKey;
        }

        const parentView = document.getElementById(`view-${viewId}`);
        if (parentView) {
            parentView.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active'));
            parentView.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active'));

            let targetSubViewId = subViewId;

            if (!targetSubViewId) {
                const firstVisibleTab = parentView.querySelector('.sub-nav-item:not([style*="display: none"])');
                if (firstVisibleTab) {
                    targetSubViewId = firstVisibleTab.dataset.subview;
                }
            }
            
            if (targetSubViewId) {
                const subViewBtn = parentView.querySelector(`[data-subview="${targetSubViewId}"]`);
                if(subViewBtn) subViewBtn.classList.add('active');
                
                const subViewToShow = parentView.querySelector(`#subview-${targetSubViewId}`);
                if (subViewToShow) subViewToShow.classList.add('active');
            }
        }
        
        refreshViewData(viewId);
    }
    
    function openItemSelectorModal(event) {
        const context = event.target.dataset.context;
        if (!context) {
            Logger.error("openItemSelectorModal called without a data-context on the button.");
            return;
        }

        modalContext = context;
        let currentList = [];

        switch (context) {
            case 'receive': currentList = state.currentReceiveList; break;
            case 'transfer': currentList = state.currentTransferList; break;
            case 'po': currentList = state.currentPOList; break;
            case 'return': currentList = state.currentReturnList; break;
            case 'edit-po': currentList = state.currentEditingPOList; break;
            case 'adjustment': currentList = state.currentAdjustmentList; break;
            default:
                Logger.error(`Unknown modal context: ${context}`);
                return;
        }

        state.modalSelections = new Set((currentList || []).map(item => item.itemCode));
        renderItemsInModal();
        itemSelectorModal.classList.add('active');
    }

    function openInvoiceSelectorModal() {
        modalContext = 'invoices';
        renderInvoicesInModal();
        invoiceSelectorModal.classList.add('active');
    }

    async function openHistoryModal(itemCode) {
        const item = findByKey(state.items, 'code', itemCode);
        if (!item) return;

        document.getElementById('history-modal-title').textContent = _t('history_for', {itemName: item.name, itemCode: item.code});
        const historyModalBody = document.getElementById('history-modal-body');
        const priceHistoryContainer = historyModalBody.querySelector('#subview-price-history');
        const movementHistoryContainer = historyModalBody.querySelector('#subview-movement-history');
        const subNav = historyModalBody.querySelector('.sub-nav');

        priceHistoryContainer.innerHTML = '<div class="spinner"></div>';
        movementHistoryContainer.querySelector('#movement-history-table-container').innerHTML = '<div class="spinner"></div>';
        historyModal.classList.add('active');
        
        const subNavClickHandler = (e) => {
            if (!e.target.classList.contains('sub-nav-item')) return;
            const subviewId = e.target.dataset.subview;
            subNav.querySelectorAll('.sub-nav-item').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            historyModalBody.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active'));
            const subViewToShow = historyModalBody.querySelector(`#subview-${subviewId}`);
            if (subViewToShow) subViewToShow.classList.add('active');
        };

        subNav.removeEventListener('click', subNavClickHandler);
        subNav.addEventListener('click', subNavClickHandler);

        const firstTab = subNav.querySelector('.sub-nav-item');
        if (firstTab) firstTab.click();

        const result = await postData('getItemHistory', { itemCode }, null);
        
        populateOptions(document.getElementById('history-filter-branch'), state.branches, _t('all_branches'), 'branchCode', 'branchName');
        const txTypes = ['receive', 'issue', 'transfer_out', 'transfer_in', 'return_out', 'adjustment_in', 'adjustment_out', 'extraction_in', 'extraction_out'];
        const txTypeOptions = txTypes.map(t => ({'type': t, 'name': t.replace(/_/g, ' ').toUpperCase()}));
        populateOptions(document.getElementById('history-filter-type'), txTypeOptions, _t('all_types'), 'type', 'name');

        if (result && result.data) {
            renderPriceHistory(result.data.priceHistory);
            
            const renderFilteredMovementHistory = () => renderMovementHistory(result.data.movementHistory, itemCode);
            renderFilteredMovementHistory(); 

            ['history-filter-start-date', 'history-filter-end-date', 'history-filter-type', 'history-filter-branch'].forEach(id => {
                const element = document.getElementById(id);
                element.removeEventListener('change', renderFilteredMovementHistory);
                element.addEventListener('change', renderFilteredMovementHistory);
            });
        } else {
            priceHistoryContainer.innerHTML = `<p>${_t('no_price_history')}</p>`;
            movementHistoryContainer.querySelector('#movement-history-table-container').innerHTML = `<p>${_t('no_movements_found')}</p>`;
        }
    }

    function closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active'));
        modalSearchInput.value = '';
        modalContext = null;
    }
    
    function openViewTransferModal(batchId) {
        const transferGroup = state.transactions.filter(t => t.batchId === batchId && t.type === 'transfer_out');
        if (transferGroup.length === 0) {
            showToast('Transfer not found.', 'error');
            return;
        }
        const first = transferGroup[0];
        const fromBranch = findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName || first.fromBranchCode;
        const toBranch = findByKey(state.branches, 'branchCode', first.toBranchCode)?.branchName || first.toBranchCode;

        const modalBody = document.getElementById('view-transfer-modal-body');
        const items = transferGroup.map(tx => {
            const item = findByKey(state.items, 'code', tx.itemCode) || { name: 'DELETED' };
            return { itemCode: tx.itemCode, itemName: item.name, quantity: tx.quantity };
        });

        let itemsHtml = items.map(item => `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.quantity}</td></tr>`).join('');

        modalBody.innerHTML = `
            <p><strong>${_t('from_branch')}:</strong> ${fromBranch}</p>
            <p><strong>${_t('to_branch')}:</strong> ${toBranch}</p>
            <p><strong>${_t('reference')}:</strong> ${first.ref || 'N/A'}</p>
            <hr>
            <h4>Items in Shipment</h4>
            <table><thead><tr><th>${_t('table_h_code')}</th><th>${_t('item_name')}</th><th>${_t('table_h_quantity')}</th></tr></thead><tbody>${itemsHtml}</tbody></table>`;
        
        const modal = document.getElementById('view-transfer-modal');
        modal.querySelector('.modal-footer').innerHTML = `
            <button class="secondary modal-cancel">${_t('cancel')}</button>
            <button id="btn-print-transfer-receipt" class="secondary">${_t('view_print')}</button>
            <button id="btn-reject-transfer" class="danger" data-batch-id="${batchId}">${_t('reject')}</button>
            <button id="btn-confirm-receive-transfer" class="primary" data-batch-id="${batchId}">${_t('confirm_receipt')}</button>
        `;

        document.getElementById('btn-print-transfer-receipt').onclick = () => {
            const dataToPrint = { ...first, items: items, date: new Date() };
            generateTransferDocument(dataToPrint);
        };

        viewTransferModal.classList.add('active');
    }

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

    function openSubItemEntryModal(mainItemCode, remainingMainItems) {
        const mainItem = findByKey(state.items, 'code', mainItemCode);
        const subItems = state.items.filter(i => i.ParentItemCode === mainItemCode);
        
        const modalTitle = document.getElementById('sub-item-entry-modal-title');
        modalTitle.textContent = `${_t('enter_sub_item_quantities')} for ${mainItem.name}`;
    
        const modalBody = document.getElementById('sub-item-entry-modal-body');
        let tableHtml = `
            <table id="sub-item-entry-table">
                <thead>
                    <tr>
                        <th>${_t('table_h_name')}</th>
                        <th>${_t('table_h_quantity')}</th>
                    </tr>
                </thead>
                <tbody>
        `;
        subItems.forEach(sub => {
            tableHtml += `
                <tr>
                    <td>${sub.name} (${sub.code})</td>
                    <td><input type="number" class="table-input sub-item-qty-input" data-item-code="${sub.code}" step="0.01" min="0"></td>
                </tr>
            `;
        });
        tableHtml += `</tbody>
            <tfoot>
                <tr>
                    <td style="text-align: right;"><strong>${_t('total_sub_item_weight')}:</strong></td>
                    <td id="total-sub-item-weight">0.00</td>
                </tr>
            </tfoot>
        </table>`;
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

        if (totalSubQty > 0) {
            const existingIndex = list.findIndex(i => i.itemCode === mainItem.code && i.isMainItemPlaceholder);
            
            if (existingIndex !== -1) {
                 list[existingIndex].quantity = totalSubQty;
            } else {
                list.push({
                    itemCode: mainItem.code,
                    itemName: mainItem.name,
                    quantity: totalSubQty,
                    cost: 0, 
                    isMainItemPlaceholder: true 
                });
            }
            
            list.push(...subItemsToAdd);
            renderer();
        }

        subItemEntryModal.classList.remove('active');

        if (remainingMainItems.length > 0) {
            openSubItemEntryModal(remainingMainItems[0], remainingMainItems.slice(1));
        } else {
            closeModal(); 
        }
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

    const renderDynamicListTable = (tbodyId, list, columnsConfig, emptyMessage, totalizerFn) => {
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
    };
    
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
                } else {
                    processedList.push(item);
                }
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
            } else {
                group.children.forEach(child => processedList.push(child));
            }
        });

        return processedList;
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
            const systemQty = (branchCode && stock[branchCode]?.[item.itemCode]?.quantity) || 0;
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

    function renderItemCentricStockView(itemsToRender = state.items, selectedBranches = []) {
        const container = document.getElementById('item-centric-stock-container');
        if (!container) return;
        const stockByBranch = calculateStockLevels();
        
        let branchesToDisplay = getVisibleBranchesForCurrentUser();
        if (selectedBranches.length > 0 && userCan('viewAllBranches')) {
            branchesToDisplay = state.branches.filter(b => selectedBranches.includes(b.branchCode));
        }
    
        const itemsWithChildren = {};
        itemsToRender.forEach(item => {
            if (item.ParentItemCode) {
                if (!itemsWithChildren[item.ParentItemCode]) {
                    itemsWithChildren[item.ParentItemCode] = [];
                }
                itemsWithChildren[item.ParentItemCode].push(item);
            }
        });
    
        let tableHTML = `<table id="table-stock-levels-by-item"><thead><tr><th>${_t('table_h_code')}</th><th>${_t('table_h_name')}</th>`;
        branchesToDisplay.forEach(b => { tableHTML += `<th>${b.branchName}</th>` });
        tableHTML += `<th>${_t('table_h_total')}</th></tr></thead><tbody>`;
    
        const renderedItems = new Set();
    
        itemsToRender.forEach(item => {
            if (renderedItems.has(item.code)) return;
            if (!item.ParentItemCode) {
                tableHTML += renderStockRow(item, false);
                renderedItems.add(item.code);
                if (itemsWithChildren[item.code]) {
                    itemsWithChildren[item.code].forEach(child => {
                        tableHTML += renderStockRow(child, true);
                        renderedItems.add(child.code);
                    });
                }
            }
        });
    
        function renderStockRow(item, isSubItem) {
            let rowHtml = `<tr class="${isSubItem ? 'sub-item-row' : ''}"><td>${item.code}</td><td>${item.name}</td>`;
            let total = 0;
            branchesToDisplay.forEach(branch => {
                const qty = stockByBranch[branch.branchCode]?.[item.code]?.quantity || 0;
                total += qty;
                rowHtml += `<td>${qty > 0 ? qty.toFixed(2) : '-'}</td>`;
            });
            rowHtml += `<td><strong>${total.toFixed(2)}</strong></td></tr>`;
            return rowHtml;
        }
    
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
            html += `<h4>${item.name} (${item.code})</h4><table><thead><tr><th>${_t('branch')}</th><th>${_t('table_h_qty')}</th><th>${_t('table_h_value')}</th></tr></thead><tbody>`;
            let found = false;
            let totalQty = 0;
            let totalValue = 0;
            branchesToDisplay.forEach(branch => {
                const itemStock = stockByBranch[branch.branchCode]?.[item.code];
                if (itemStock && itemStock.quantity > 0) {
                    const value = itemStock.quantity * itemStock.avgCost;
                    html += `<tr><td>${branch.branchName} (${branch.branchCode || ''})</td><td>${itemStock.quantity.toFixed(2)}</td><td>${value.toFixed(2)} EGP</td></tr>`;
                    totalQty += itemStock.quantity;
                    totalValue += value;
                    found = true;
                }
            });
            if (!found) {
                html += `<tr><td colspan="3">${_t('no_stock_for_item')}</td></tr>`;
            } else {
                html += `<tr style="font-weight:bold; background-color: var(--bg-color);"><td>${_t('table_h_total')}</td><td>${totalQty.toFixed(2)}</td><td>${totalValue.toFixed(2)} EGP</td></tr>`
            }
            html += `</tbody></table><hr>`;
        });
        resultsContainer.innerHTML = html;
    }
    
    // --- BACKUP FUNCTIONS ---
    async function loadAndRenderBackups() {
        const container = document.getElementById('backup-list-container');
        container.innerHTML = `<table><tbody><tr><td><div class="spinner" style="width:30px;height:30px;border-width:3px;"></div></td><td>${_t('loading_backups')}</td></tr></tbody></table>`;
        const result = await postData('listBackups', {}, null);
        if (result && result.data) {
            state.backups = result.data;
            if (state.backups.length === 0) {
                container.innerHTML = `<p>${_t('no_backups_found')}</p>`;
                return;
            }
            let tableHtml = `<table id="table-backups"><thead><tr><th>${_t('backup_name')}</th><th>${_t('date_created')}</th><th>${_t('actions')}</th></tr></thead><tbody>`;
            state.backups.forEach(backup => {
                tableHtml += `
                    <tr>
                        <td>${backup.name}</td>
                        <td>${new Date(backup.dateCreated).toLocaleString()}</td>
                        <td>
                            <div class="action-buttons">
                                <a href="${backup.url}" target="_blank" rel="noopener noreferrer" class="secondary small" style="text-decoration: none;">${_t('open')}</a>
                                <button class="danger small btn-restore" data-url="${backup.url}">${_t('restore')}</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tableHtml += '</tbody></table>';
            container.innerHTML = tableHtml;
        } else {
            container.innerHTML = `<p>Could not load backup list. Please check permissions or try again.</p>`;
        }
    }
    
    async function loadAutoBackupSettings() {
        const toggle = document.getElementById('auto-backup-toggle');
        const frequencyContainer = document.getElementById('auto-backup-frequency-container');
        const statusEl = document.getElementById('auto-backup-status');
        
        statusEl.textContent = 'Checking status...';
        const result = await postData('getAutomaticBackupStatus', {}, null);
        
        if (result && result.data.enabled !== undefined) {
            const isEnabled = result.data.enabled;
            toggle.checked = isEnabled;
            frequencyContainer.style.display = isEnabled ? 'block' : 'none';
            statusEl.textContent = isEnabled 
                ? 'Automatic backups are currently active.'
                : 'Automatic backups are currently disabled.';
        } else {
            statusEl.textContent = 'Could not retrieve automatic backup status.';
        }
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

    function openRestoreModal(backupFileId, backupFileName) {
        const modal = document.getElementById('restore-modal');
        const sheetListContainer = document.getElementById('restore-sheet-list');
        const confirmInput = document.getElementById('restore-confirmation-input');
        const confirmBtn = document.getElementById('btn-confirm-restore');
    
        document.getElementById('restore-filename-display').textContent = backupFileName;
        confirmBtn.dataset.backupFileId = backupFileId;
        
        confirmInput.value = '';
        confirmBtn.disabled = true;
    
        const coreSheets = [ 'Items', 'Suppliers', 'Branches', 'Transactions', 'Payments', 'PurchaseOrders', 'PurchaseOrderItems', 'Users', 'Permissions', 'Settlements', 'SettlementItems' ];
        
        sheetListContainer.innerHTML = '';
        coreSheets.forEach(sheetName => {
            sheetListContainer.innerHTML += `<div class="form-group-checkbox"><input type="checkbox" id="restore-sheet-${sheetName}" name="restoreSheet" value="${sheetName}"><label for="restore-sheet-${sheetName}">${sheetName}</label></div>`;
        });
        
        const updateConfirmButtonState = () => {
            const sheetsSelected = document.querySelectorAll('#restore-sheet-list input:checked').length > 0;
            confirmBtn.disabled = !(confirmInput.value === 'RESTORE' && sheetsSelected);
        };

        confirmInput.addEventListener('input', updateConfirmButtonState);
        sheetListContainer.addEventListener('change', updateConfirmButtonState);
    
        modal.classList.add('active');
    }
    
    async function handleConfirmRestore(e) {
        const btn = e.target;
        const backupFileId = btn.dataset.backupFileId;
        const selectedSheets = Array.from(document.querySelectorAll('#restore-sheet-list input:checked')).map(el => el.value);
    
        if (selectedSheets.length === 0) {
            showToast(_t('restore_select_sheet_toast'), 'error');
            return;
        }
    
        const payload = {
            backupFileId: backupFileId,
            sheetsToRestore: selectedSheets
        };
    
        const result = await postData('restoreFromBackup', payload, btn);
    
        if (result) {
            showToast(result.data.message || _t('restore_completed_toast'), 'success');
            closeModal();
            await reloadDataAndRefreshUI();
        }
    }

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
            rendererFn(); 
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
                if (txFilterSupplier) {
                    populateOptions(txFilterSupplier, state.suppliers, 'All Suppliers', 'supplierCode', 'name');
                } else {
                    Logger.warn("tx-filter-supplier element not found in HTML");
                }
                
                if (state.currentUser.AssignedBranchCode && !userCan('viewAllBranches')) {
                    txFilterBranch.value = state.currentUser.AssignedBranchCode;
                    txFilterBranch.disabled = true;
                }

                const txTypes = ['receive', 'issue', 'transfer_out', 'transfer_in', 'return_out', 'po', 'adjustment_in', 'adjustment_out', 'extraction_in', 'extraction_out'];
                const txTypeOptions = txTypes.map(t => ({'type': t, 'name': _t(t.replace(/_/g,''))}));
                populateOptions(document.getElementById('tx-filter-type'), txTypeOptions, _t('all_types'), 'type', 'name');
                
                renderTransactionHistory({
                    startDate: document.getElementById('tx-filter-start-date').value,
                    endDate: document.getElementById('tx-filter-end-date').value,
                    type: document.getElementById('tx-filter-type').value,
                    branch: document.getElementById('tx-filter-branch').value,
                    searchTerm: document.getElementById('transaction-search').value
                }); 
                break;
            case 'master-data':
                document.querySelector('[data-subview="view-items"]').style.display = userCan('viewMasterData') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="add-item"]').style.display = userCan('createItem') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="view-suppliers"]').style.display = userCan('viewMasterData') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="add-supplier"]').style.display = userCan('createSupplier') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="view-branches"]').style.display = userCan('viewMasterData') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="add-branch"]').style.display = userCan('createBranch') ? 'inline-block' : 'none';
                renderItemsTable(); renderSuppliersTable(); renderBranchesTable();
                const mainItems = (state.items || []).filter(i => !i.ParentItemCode);
                populateOptions(document.getElementById('parent-item-code'), mainItems, _t('select_parent_item'), 'code', 'name');
                break;
            case 'backup':
                 loadAndRenderBackups();
                 loadAutoBackupSettings();
                 break;
            case 'operations':
                document.querySelector('[data-subview="receive"]').style.display = userCan('opReceive') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="transfer"]').style.display = userCan('opTransfer') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="return"]').style.display = userCan('opReturn') ? 'inline-block' : 'none';
                document.querySelector('[data-subview="extraction"]').style.display = userCan('opExtraction') ? 'inline-block' : 'none';
                const canAdjustStock = userCan('opStockAdjustment');
                const canAdjustFinance = userCan('opFinancialAdjustment');
                document.querySelector('[data-subview="adjustments"]').style.display = canAdjustStock || canAdjustFinance ? 'inline-block' : 'none';
                document.getElementById('stock-adjustment-card').style.display = canAdjustStock ? 'block' : 'none';
                document.getElementById('stock-adjustment-list-card').style.display = canAdjustStock ? 'block' : 'none';
                document.getElementById('financial-adjustment-card').style.display = canAdjustFinance ? 'block' : 'none';
                populateOptions(document.getElementById('receive-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                populateOptions(document.getElementById('receive-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('transfer-from-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('transfer-to-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('return-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                populateOptions(document.getElementById('return-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('adjustment-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                populateOptions(document.getElementById('extraction-branch'), state.branches, _t('select_a_branch'), 'branchCode', 'branchName');
                const mainItemsForExtraction = (state.items || []).filter(i => !i.ParentItemCode);
                populateOptions(document.getElementById('extraction-main-item'), mainItemsForExtraction, _t('select_main_item_to_extract'), 'code', 'name');
                populateOptions(document.getElementById('fin-adj-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                const openPOs = (state.purchaseOrders || []).filter(po => po.Status === 'Approved');
                populateOptions(document.getElementById('receive-po-select'), openPOs, _t('select_a_po'), 'poId', 'poId', 'supplierCode');
                document.getElementById('transfer-ref').value = generateId('TRN');
                renderReceiveListTable(); renderTransferListTable(); renderReturnListTable(); renderPendingTransfers(); renderInTransitReport(); renderAdjustmentListTable(); renderExtractionPreview();
                break;
            case 'purchasing':
                 document.querySelector('[data-subview="create-po"]').style.display = userCan('opCreatePO') ? 'inline-block' : 'none';
                 document.querySelector('[data-subview="view-pos"]').style.display = userCan('opCreatePO') || userCan('opApproveFinancials') ? 'inline-block' : 'none';
                 document.querySelector('[data-subview="pending-financial-approval"]').style.display = userCan('opApproveFinancials') ? 'inline-block' : 'none';
                 populateOptions(document.getElementById('po-supplier'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                 document.getElementById('po-ref').value = generateId('PO');
                 renderPOListTable(); renderPurchaseOrdersViewer(); renderPendingFinancials();
                 break;
            case 'payments':
                populateOptions(document.getElementById('payment-supplier-select'), state.suppliers, _t('select_supplier'), 'supplierCode', 'name');
                renderPaymentList();
                document.getElementById('btn-select-invoices').disabled = true;
                break;
            case 'reports':
                populateOptions(document.getElementById('supplier-statement-select'), state.suppliers, _t('select_a_supplier'), 'supplierCode', 'name');
                renderSettlementHistory();
                break;
            case 'stock-levels':
                document.getElementById('stock-levels-title').textContent = userCan('viewAllBranches') ? _t('stock_by_item_all_branches') : _t('stock_by_item_your_branch');
                 const branchFilterContainer = document.getElementById('stock-levels-branch-filter-container');
                if (userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) {
                    branchFilterContainer.style.display = 'block';
                    const select = document.getElementById('stock-levels-branch-filter');
                    select.innerHTML = '';
                    state.branches.forEach(branch => {
                        select.innerHTML += `<option value="${branch.branchCode}">${branch.branchName}</option>`;
                    });
                } else {
                    branchFilterContainer.style.display = 'none';
                }
                renderItemCentricStockView();
                document.getElementById('item-inquiry-search').value = ''; renderItemInquiry('');
                document.getElementById('stock-levels-search').value = '';
                break;
            case 'user-management':
                const result = await postData('getAllUsersAndRoles', {}, null);
                if (result) { state.allUsers = result.data.users; state.allRoles = result.data.roles; renderUserManagementUI(); }
                break;
            case 'activity-log':
                renderActivityLog();
                break;
        }
        applyUserUIConstraints();
        applyTranslations();
    };

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

    function attachSubNavListeners() { document.querySelectorAll('.sub-nav').forEach(nav => { if(nav.closest('#history-modal')) return; nav.addEventListener('click', e => { if (!e.target.classList.contains('sub-nav-item')) return; const subviewId = e.target.dataset.subview; const parentView = e.target.closest('.view'); if (!parentView) return; const currentActive = parentView.querySelector('.sub-nav-item.active'); if(currentActive) currentActive.classList.remove('active'); e.target.classList.add('active'); parentView.querySelectorAll('.sub-view').forEach(view => view.classList.remove('active')); const subViewToShow = parentView.querySelector(`#subview-${subviewId}`); if (subViewToShow) subViewToShow.classList.add('active'); refreshViewData(parentView.id.replace('view-','')); }); }); }
    
    function attachEventListeners() {
        btnLogout.addEventListener('click', logout);
        globalRefreshBtn.addEventListener('click', reloadDataAndRefreshUI);
        
        document.getElementById('btn-create-backup').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            if (confirm(_t('backup_confirm_prompt'))) {
                const result = await postData('createBackup', {}, btn);
                if (result && result.data) {
                    showToast(_t('backup_created_toast', {fileName: result.data.fileName}), 'success');
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
            if (btn.id === 'btn-add-new-role') { const roleName = prompt(_t('add_role_prompt')); if(roleName) { postData('addRole', { RoleName: roleName }, btn).then(res => res && reloadDataAndRefreshUI()); } }
            if (btn.classList.contains('btn-view-tx')) {
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
                             else if (type === 'return_out') generateReturnDocument(data);
                         }
                         break;
                 }
            }
            if (btn.classList.contains('btn-receive-transfer')) { openViewTransferModal(btn.dataset.batchId); }
            if (btn.classList.contains('btn-edit-transfer')) { openPOEditModal(btn.dataset.batchId); } // Re-using PO edit modal for transfers
            if (btn.classList.contains('btn-cancel-transfer')) { const batchId = btn.dataset.batchId; if (confirm(`Are you sure you want to cancel transfer ${batchId}?`)) { postData('cancelTransfer', { batchId }, btn).then(res => res && reloadDataAndRefreshUI()); } }
            if (btn.classList.contains('btn-edit-po')) { openPOEditModal(btn.dataset.poId); }
            if (btn.classList.contains('btn-edit-invoice')) { openInvoiceEditModal(btn.dataset.batchId); }
            if (btn.classList.contains('btn-approve-financial') || btn.classList.contains('btn-reject-financial')) {
                const id = btn.dataset.id;
                const type = btn.dataset.type;
                const action = btn.classList.contains('btn-approve-financial') ? 'approveFinancial' : 'rejectFinancial';
                const confirmationText = action === 'approveFinancial' ? _t('approve_confirm_prompt', {type: _t(type)}) : _t('reject_confirm_prompt', {type: _t(type)});
                
                if (confirm(confirmationText)) {
                    postData(action, { id, type }, btn).then(result => {
                        if (result) {
                            showToast(action.includes('approve') ? _t('approved_toast', {type: _t(type)}) : _t('rejected_toast', {type: _t(type)}), 'success');
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
                if(confirm('Are you sure you want to reject this transfer? This action cannot be undone.')) {
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

        document.getElementById('form-add-supplier').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { name: document.getElementById('supplier-name').value }; const result = await postData('addSupplier', data, btn); if (result) { showToast(_t('add_success_toast', {type: _t('supplier')}), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } });
        document.getElementById('form-add-branch').addEventListener('submit', async e => { e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); const data = { branchName: document.getElementById('branch-name').value }; const result = await postData('addBranch', data, btn); if (result) { showToast(_t('add_success_toast', {type: _t('branch')}), 'success'); e.target.reset(); reloadDataAndRefreshUI(); } });
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

        document.getElementById('btn-submit-receive-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; let branchCode = document.getElementById('receive-branch').value; const supplierCode = document.getElementById('receive-supplier').value, invoiceNumber = document.getElementById('receive-invoice').value, notes = document.getElementById('receive-notes').value, poId = document.getElementById('receive-po-select').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ branch: true }); if(!context) return; branchCode = context.branch; } if (!userCan('opReceiveWithoutPO') && !poId) { showToast(_t('select_po_first_toast'), 'error'); return; } if (!supplierCode || !branchCode || !invoiceNumber || state.currentReceiveList.length === 0) { showToast(_t('fill_required_fields_toast'), 'error'); return; } const payload = { type: 'receive', batchId: `GRN-${Date.now()}`, supplierCode, branchCode, invoiceNumber, poId, date: new Date().toISOString(), items: state.currentReceiveList.map(i => ({...i, type: 'receive'})), notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-transfer-batch').addEventListener('click', async (e) => { const btn = e.currentTarget; let fromBranchCode = document.getElementById('transfer-from-branch').value, toBranchCode = document.getElementById('transfer-to-branch').value; const notes = document.getElementById('transfer-notes').value, ref = document.getElementById('transfer-ref').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ fromBranch: true, toBranch: true }); if(!context) return; fromBranchCode = context.fromBranch; toBranchCode = context.toBranch; } if (!fromBranchCode || !toBranchCode || fromBranchCode === toBranchCode || state.currentTransferList.length === 0) { showToast('Please select valid branches and add at least one item.', 'error'); return; } const payload = { type: 'transfer_out', batchId: ref, ref: ref, fromBranchCode, toBranchCode, date: new Date().toISOString(), items: state.currentTransferList.map(i => ({...i, type: 'transfer_out'})), notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-po').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('po-supplier').value, poId = document.getElementById('po-ref').value, notes = document.getElementById('po-notes').value; if (!supplierCode || state.currentPOList.length === 0) { showToast('Please select a supplier and add items.', 'error'); return; } const totalValue = state.currentPOList.reduce((acc, item) => acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)), 0); const payload = { type: 'po', poId, supplierCode, date: new Date().toISOString(), items: state.currentPOList, totalValue, notes }; await handleTransactionSubmit(payload, btn); });
        document.getElementById('btn-submit-return').addEventListener('click', async (e) => { const btn = e.currentTarget; const supplierCode = document.getElementById('return-supplier').value; let fromBranchCode = document.getElementById('return-branch').value; const ref = document.getElementById('return-ref').value, notes = document.getElementById('return-notes').value; if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ fromBranch: true }); if(!context) return; fromBranchCode = context.fromBranch; } if (!supplierCode || !fromBranchCode || !ref || state.currentReturnList.length === 0) { showToast('Please fill all required fields and add items.', 'error'); return; } const payload = { type: 'return_out', batchId: `RTN-${Date.now()}`, ref: ref, supplierCode, fromBranchCode, date: new Date().toISOString(), items: state.currentReturnList.map(i => ({...i, type: 'return_out'})), notes }; await handleTransactionSubmit(payload, btn); });
        
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
            if(userCan('viewAllBranches') && !state.currentUser.AssignedBranchCode) { const context = await requestAdminContext({ branch: true }); if(!context) return; branchCode = context.branch; }
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

        document.getElementById('form-financial-adjustment').addEventListener('submit', async(e) => {
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
        
        document.getElementById('btn-generate-supplier-statement').addEventListener('click', () => { const supplierCode = document.getElementById('supplier-statement-select').value; const startDate = document.getElementById('statement-start-date').value; const endDate = document.getElementById('statement-end-date').value; if(!supplierCode) { showToast('Please select a supplier.', 'error'); return; } renderSupplierStatement(supplierCode, startDate, endDate); });
        
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
            if(!poId) {
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
        document.querySelector('.sidebar-header h1').textContent = _t('hi_user', {userFirstName});
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

    function openPOEditModal(poId) {
        const po = findByKey(state.purchaseOrders, 'poId', poId);
        if (!po) return;
        const poItems = state.purchaseOrderItems.filter(i => i.poId === poId);
        state.currentEditingPOList = poItems.map(item => {
            const masterItem = findByKey(state.items, 'code', item.itemCode);
            return {
                itemCode: item.itemCode,
                itemName: masterItem?.name || "N/A",
                quantity: parseFloat(item.quantity),
                cost: parseFloat(item.cost)
            };
        });

        const modalBody = document.getElementById('edit-po-modal-body');
        modalBody.innerHTML = `
            <div class="form-grid">
                <div class="form-group"><label>${_t('table_h_po_no')}</label><input type="text" id="edit-po-id" value="${po.poId}" readonly></div>
                <div class="form-group"><label>${_t('supplier')}</label><input type="text" value="${findByKey(state.suppliers, 'supplierCode', po.supplierCode)?.name}" readonly></div>
                <div class="form-group span-full"><label for="edit-po-notes">${_t('notes_optional')}</label><textarea id="edit-po-notes" rows="2">${po.notes || ''}</textarea></div>
            </div>
            <div class="card" style="margin-top: 20px;">
                <h2 data-translate-key="items_to_order">${_t('items_to_order')}</h2>
                <table id="table-edit-po-list">
                    <thead><tr><th>${_t('table_h_code')}</th><th>${_t('item_name')}</th><th>${_t('table_h_quantity')}</th><th>${_t('table_h_cost_per_unit')}</th><th>${_t('table_h_total')}</th><th>${_t('table_h_actions')}</th></tr></thead>
                    <tbody></tbody>
                    <tfoot><tr style="font-weight: bold; background-color: var(--bg-color);"><td colspan="4" style="text-align: right;">${_t('grand_total')}</td><td id="edit-po-grand-total" colspan="2">0.00 EGP</td></tr></tfoot>
                </table>
                <div style="margin-top: 20px;"><button type="button" data-context="edit-po" class="secondary">${_t('select_items')}</button></div>
            </div>
        `;
        
        const modal = document.getElementById('edit-po-modal');
        modal.querySelector('.modal-footer').innerHTML = `
            <button class="secondary modal-cancel">${_t('cancel')}</button>
            <button id="btn-print-draft-po" class="secondary">${_t('view_print')}</button>
            <button id="btn-save-po-changes" class="primary" data-po-id="${po.poId}">${_t('save_changes')}</button>
        `;
        
        document.getElementById('btn-print-draft-po').onclick = () => {
            const supplier = findByKey(state.suppliers, 'supplierCode', po.supplierCode);
            const dataToPrint = {
                poId: document.getElementById('edit-po-id').value,
                date: new Date(),
                supplierCode: po.supplierCode,
                notes: document.getElementById('edit-po-notes').value,
                items: state.currentEditingPOList,
                createdBy: po.createdBy || state.currentUser.Name
            };
            generatePODocument(dataToPrint);
        };

        renderPOEditListTable();
        editPOModal.classList.add('active');
    }

    function openInvoiceEditModal(batchId) {
        const txGroup = state.transactions.filter(t => t.batchId === batchId && t.type === 'receive');
        if (txGroup.length === 0) {
            showToast('Could not find invoice data to edit.', 'error');
            return;
        }
        const firstTx = txGroup[0];

        state.currentEditingPOList = txGroup.map(tx => {
            const masterItem = findByKey(state.items, 'code', tx.itemCode);
            return {
                itemCode: tx.itemCode,
                itemName: masterItem?.name || 'N/A',
                quantity: parseFloat(tx.quantity),
                cost: parseFloat(tx.cost)
            };
        });

        const modalBody = document.getElementById('edit-po-modal-body');
        const supplier = findByKey(state.suppliers, 'supplierCode', firstTx.supplierCode);
        const branch = findByKey(state.branches, 'branchCode', firstTx.branchCode);

        modalBody.innerHTML = `
            <div class="form-grid">
                <div class="form-group"><label>Batch ID</label><input type="text" value="${batchId}" readonly></div>
                <div class="form-group"><label>${_t('supplier')}</label><input type="text" value="${supplier?.name || 'N/A'}" readonly></div>
                <div class="form-group"><label>${_t('branch')}</label><input type="text" value="${branch?.branchName || 'N/A'}" readonly></div>
                <div class="form-group"><label for="edit-invoice-number">${_t('table_h_invoice_no')}</label><input type="text" id="edit-invoice-number" value="${firstTx.invoiceNumber || ''}" required></div>
                <div class="form-group span-full"><label for="edit-invoice-notes">${_t('notes_optional')}</label><textarea id="edit-invoice-notes" rows="2">${firstTx.notes || ''}</textarea></div>
            </div>
            <div class="card" style="margin-top: 20px;">
                <h2 data-translate-key="items_to_be_received">${_t('items_to_be_received')}</h2>
                <table id="table-edit-po-list">
                    <thead><tr><th>${_t('table_h_code')}</th><th>${_t('item_name')}</th><th>${_t('table_h_quantity')}</th><th>${_t('table_h_cost_per_unit')}</th><th>${_t('table_h_total')}</th><th>${_t('table_h_actions')}</th></tr></thead>
                    <tbody></tbody>
                    <tfoot><tr style="font-weight: bold; background-color: var(--bg-color);"><td colspan="4" style="text-align: right;">${_t('grand_total')}</td><td id="edit-po-grand-total" colspan="2">0.00 EGP</td></tr></tfoot>
                </table>
                <div style="margin-top: 20px;"><button type="button" data-context="edit-po" class="secondary">${_t('select_items')}</button></div>
            </div>
        `;

        const modal = document.getElementById('edit-po-modal');
        document.getElementById('edit-po-modal-title').textContent = _t('edit') + ' ' + _t('receive_stock');
        modal.querySelector('.modal-footer').innerHTML = `
            <button type="button" class="secondary modal-cancel">${_t('cancel')}</button>
            <button id="btn-save-invoice-changes" class="primary" data-batch-id="${batchId}">${_t('save_changes')}</button>
        `;

        renderPOEditListTable();
        editPOModal.classList.add('active');
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

    // --- NEW EXTRACTION LOGIC ---
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
    
    // --- NEW SALES RECONCILIATION & SETTLEMENT LOGIC ---
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
        // This handles "BR-001" and "CAIRO BRANCH" -> BR-001
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
            // FIX: Add new transactions to local state for immediate recalculation
            state.transactions = [...state.transactions, ...result.data.newTransactions]; 
            state.settlements.push(result.data.settlementRecord);
            if(result.data.settlementItems) result.data.settlementItems.forEach(si => state.settlementItems.push(si));
            
            showToast(_t('settlement_complete'), 'success');
            closeModal();
            
            const currentView = document.querySelector('.nav-item a.active')?.dataset.view || 'dashboard';
            refreshViewData(currentView); 
        }
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

    init();
});
