export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwSM8G9AqHy6Nnhwcpit7xRJbKMkY93ACaHA3_3pzwZlNaF6ORzVL-Ev10FF7HQiu9M/exec';

export let state = {
    currentUser: null, username: null, loginCode: null, currentLanguage: 'en',
    items: [], suppliers: [], branches: [], transactions: [], payments: [],
    purchaseOrders: [], purchaseOrderItems: [], activityLog: [], settlements: [], settlementItems: [],
    currentReceiveList: [], currentTransferList: [], currentPOList: [], currentReturnList: [],
    currentEditingPOList: [], currentAdjustmentList: [], uploadedSalesData: [],
    salesReportDataByBranch: {}, modalSelections: new Set(), invoiceModalSelections: new Set(),
    allUsers: [], allRoles: [], backups: [], adminContextPromise: {},
};

export let modalContext = { value: null }; // Object wrapper to allow reference passing

export const translations = {
    'en': {
        'packing_stock': 'Packing Stock', 'login_prompt': 'Please enter your credentials.', 'username': 'Username', 
        'password_code': 'Password / Login Code', 'login': 'Login', 'signing_in': 'Signing in...', 'loading': 'Loading...',
        'refresh_all_data': 'Refresh Data', 'dashboard': 'Dashboard', 'stock_operations': 'Operations', 
        'purchasing': 'Purchasing', 'payments': 'Payments', 'reports': 'Reports', 'stock_levels': 'Stock Levels', 
        'transaction_history': 'History', 'master_data': 'Master Data', 'user_management': 'Users', 'backup_restore': 'Backup',
        'activity_log': 'Logs', 'logout': 'Logout', 'total_items': 'Total Items', 'total_stock_value': 'Stock Value',
        'total_suppliers': 'Suppliers', 'total_branches': 'Branches', 'grand_total': 'Total:', 'submit_for_approval': 'Submit',
        'action_failed_toast': 'Failed: {errorMessage}', 'data_refreshed_toast': 'Refreshed!', 'data_refresh_fail_toast': 'Failed.',
        'update_success_toast': 'Updated!', 'tx_processed_toast': 'Processed!', 'backup_created_toast': 'Backup Created.',
        'restore_completed_toast': 'Restored!', 'select_parent_item': 'Select Parent', 'select_supplier': 'Select Supplier',
        'select_a_branch': 'Select Branch', 'select_a_po': 'Select PO', 'all_branches': 'All Branches', 'all_types': 'All Types',
        'no_items_found': 'No items found.', 'no_invoices_for_supplier': 'No invoices.', 'no_unpaid_invoices': 'No unpaid.',
        'status_approved': 'Approved', 'status_pending': 'Pending', 'status_rejected': 'Rejected'
    }
};
