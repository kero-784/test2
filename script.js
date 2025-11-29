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

    // --- 1. STATE & HELPERS ---
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

    // --- TRANSLATIONS ---
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

    const findByKey = (array, key, value) => (array || []).find(el => el && String(el[key]) === String(value));
    const generateId = (prefix) => `${prefix}-${Date.now()}`;
    const printContent = (content) => { document.getElementById('print-area').innerHTML = content; setTimeout(() => window.print(), 200); };
    const exportToExcel = (tableId, filename, sheetName = 'Sheet1') => { try { const table = document.getElementById(tableId); if (!table) { showToast('Please generate a report first.', 'error'); return; } const wb = XLSX.utils.table_to_book(table, {sheet: sheetName}); XLSX.writeFile(wb, filename); showToast('Exporting to Excel...', 'success'); } catch (err) { showToast('Excel export failed.', 'error'); Logger.error('Export Error:', err); } };

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
        el.innerHTML = `<option value="">${ph}</option>`; 
        (data || []).forEach(item => { 
            el.innerHTML += `<option value="${item[valueKey]}">${item[textKey]}${textKey2 && item[textKey2] ? ' (' + item[textKey2] + ')' : ''}</option>`;
        }); 
    };

    // --- 2. CORE LOGIC & CALCULATIONS ---

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
            s.events = allEvents.sort((a,b) => new Date(a.date) - new Date(b.date));
        });
        financials.allInvoices = {}; Object.values(financials).forEach(s => { Object.assign(financials.allInvoices, s.invoices); }); return financials;
    };

    // --- 3. BACKUP & RESTORE FUNCTIONS ---
    
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

    // --- 4. PAYMENT & MODAL HELPERS ---

    function handlePaymentInputChange() {
        let total = 0;
        document.querySelectorAll('.payment-amount-input').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        document.getElementById('payment-total-amount').textContent = `${total.toFixed(2)} EGP`;
    }

    function renderInvoicesInModal() {
        const modalInvoiceList = document.getElementById('modal-invoice-list');
        const supplierCode = document.getElementById('payment-supplier-select').value;
        const supplierFinancials = calculateSupplierFinancials();
        const supplierInvoices = supplierFinancials[supplierCode]?.invoices;
        modalInvoiceList.innerHTML = '';
        if (!supplierInvoices || Object.keys(supplierInvoices).length === 0) {
            modalInvoiceList.innerHTML = `<p>${_t('no_invoices_for_supplier')}</p>`;
            return;
        }
        const unpaidInvoices = Object.values(supplierInvoices).filter(inv => inv.status !== 'Paid');
        if (unpaidInvoices.length === 0) {
            modalInvoiceList.innerHTML = `<p>${_t('no_unpaid_invoices')}</p>`;
            return;
        }
        unpaidInvoices.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(invoice => {
            const isChecked = state.invoiceModalSelections.has(invoice.number);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'modal-item';
            const detailsText = _t('invoice_modal_details', { date: new Date(invoice.date).toLocaleDateString(), balance: invoice.balance.toFixed(2) });
            itemDiv.innerHTML = `<input type="checkbox" id="modal-invoice-${invoice.number}" data-number="${invoice.number}" ${isChecked ? 'checked' : ''}><label for="modal-invoice-${invoice.number}"><strong>${_t('table_h_invoice_no')}: ${invoice.number}</strong><br><small style="color:var(--text-light-color)">${detailsText}</small></label>`;
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

    // --- 5. RENDERERS & UTILS (MUST BE DEFINED BEFORE LISTENERS) ---

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

    function renderReceiveListTable() { renderDynamicListTable('table-receive-list', state.currentReceiveList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' } ], 'no_items_selected_toast', updateReceiveGrandTotal); }
    function renderTransferListTable() { renderDynamicListTable('table-transfer-list', state.currentTransferList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'transfer-from-branch' } ], 'no_items_selected_toast', updateTransferGrandTotal); }
    function renderPOListTable() { renderDynamicListTable('table-po-list', state.currentPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' } ], 'no_items_selected_toast', updatePOGrandTotal); }
    function renderPOEditListTable() { renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated' } ], 'no_items_selected_toast', updatePOEditGrandTotal); }
    function renderReturnListTable() { renderDynamicListTable('table-return-list', state.currentReturnList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'return-branch' }, { type: 'cost_input', key: 'cost' } ], 'no_items_selected_toast', updateReturnGrandTotal); }

    // --- 6. DOCUMENT GENERATORS ---
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
    
            if(fullItem.ParentItemCode) { 
                groupedItems[parentCode].children.push(item);
                groupedItems[parentCode].totalWeight += (parseFloat(item.quantity) || 0);
            } else { 
                 if(item.isMainItemPlaceholder) {
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


    // --- 7. INITIALIZATION & EVENT LISTENERS (FINAL BLOCK) ---

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
