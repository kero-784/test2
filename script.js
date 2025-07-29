// PART 1 OF 4: CORE SETUP & API
window.printReport = function(elementId) {
    const reportContent = document.querySelector(`#${elementId} .printable-document`);
    if (reportContent) {
        document.getElementById('print-area').innerHTML = reportContent.outerHTML;
        setTimeout(() => window.print(), 100);
    } else {
        console.error(`Could not find content to print in #${elementId}`);
        // Note: getText() will only work after the main script is loaded.
        alert("Error: Report content not found.");
    }
};

const translations = {
    // English
    en: {
        // General & UI
        app_title: "Packing Stock Control",
        login_title: "Packing Stock",
        login_prompt: "Please enter your credentials to continue.",
        login_username_label: "Username",
        login_password_label: "Password / Login Code",
        login_button: "Login",
        login_signing_in: "Signing in...",
        refresh_all_data: "Refresh All Data",
        nav_dashboard: "Dashboard",
        nav_operations: "Stock Operations",
        nav_purchasing: "Purchasing",
        nav_requests: "Requests",
        nav_payments: "Payments",
        nav_reports: "Reports",
        nav_stock_levels: "Stock Levels",
        nav_transaction_history: "Transaction History",
        nav_setup: "Add Data",
        nav_master_data: "Master Data",
        nav_user_management: "User Management",
        nav_backup: "Backup",
        nav_activity_log: "Activity Log",
        nav_logout: "Logout",
        pending_requests: "Pending Requests",
        total_items: "Total Items",
        total_stock_value: "Total Stock Value",
        total_suppliers: "Total Suppliers",
        total_branches: "Total Branches",
        add_new_item: "Add New Item",
        item_code_label: "Item Code (Unique ID)",
        item_barcode_label: "Barcode",
        item_name_label: "Item Name",
        item_unit_label: "Unit (e.g., PCS, KG)",
        item_category_label: "Category",
        item_supplier_label: "Default Supplier",
        item_cost_label: "Default Cost",
        add_item_button: "Add Item",
        add_new_supplier: "Add New Supplier",
        supplier_code_label: "Supplier Code (Unique ID)",
        supplier_name_label: "Supplier Name",
        supplier_contact_label: "Contact Info",
        add_supplier_button: "Add Supplier",
        add_new_branch: "Add New Branch",
        branch_code_label: "Branch Code (Unique ID)",
        branch_name_label: "Branch Name",
        add_branch_button: "Add Branch",
        add_new_section: "Add New Section",
        section_code_label: "Section Code (Unique ID)",
        section_name_label: "Section Name",
        add_section_button: "Add Section",
        auto_backup_settings: "Automatic Backup Settings",
        auto_backup_desc: "Enable automatic backups to save a copy of your data periodically. Backups are stored in \"StockApp Backups\" in Google Drive.",
        enable_auto_backups: "Enable Automatic Backups",
        backup_frequency: "Backup Frequency",
        daily_backup: "Daily (at 2am)",
        weekly_backup: "Weekly (Sunday at 2am)",
        manual_backup_restore: "Manual Backup & Restore",
        manual_backup_desc: "Create an immediate backup or restore from a previously created file.",
        create_new_manual_backup: "Create New Manual Backup",
        available_backups: "Available Backups",
        loading_backups: "Loading backup list...",
        tab_items: "Items",
        tab_suppliers: "Suppliers",
        tab_branches: "Branches",
        tab_sections: "Sections",
        item_list: "Item List",
        search_items_placeholder: "Search by name, code, category...",
        export_to_excel: "Export to Excel",
        header_code: "Code",
        header_name: "Name",
        header_category: "Category",
        header_unit: "Unit",
        header_default_cost: "Default Cost",
        header_actions: "Actions",
        // Purchasing
        purchasing_create_po: "Create Purchase Order",
        purchasing_view_pos: "View Purchase Orders",
        purchasing_pending_approval: "Pending Approval",
        po_details: "Purchase Order Details",
        po_supplier: "Supplier",
        po_ref: "PO Reference #",
        po_notes: "Notes (Optional)",
        po_items_to_order: "Items to Order",
        po_grand_total: "Grand Total:",
        po_select_items: "Select Items",
        po_submit_for_approval: "Submit for Approval",
        po_list: "Purchase Order List",
        po_header_ponum: "PO #",
        po_header_date: "Date",
        po_header_supplier: "Supplier",
        po_header_items: "Items",
        po_header_value: "Total Value",
        po_header_status: "Status",
        po_pending_financial_approval: "Transactions Pending Financial Approval",
        // Requests
        requests_my_requests: "My Requests",
        requests_pending_approval: "Pending Approval",
        requests_create_new: "Create New Request",
        requests_type: "Request Type",
        requests_type_issue: "Request Items from Branch",
        requests_type_resupply: "Request Item Resupply (Low Stock)",
        requests_notes: "Notes / Justification",
        requests_items_for_request: "Items for Request",
        requests_submit: "Submit Request",
        requests_history: "My Request History",
        requests_header_id: "ID",
        requests_header_date: "Date",
        requests_header_type: "Type",
        requests_header_qty: "Items (Req/Issued)",
        requests_header_status: "Status",
        requests_header_notes: "Notes",
        requests_pending_approval_title: "Requests Pending Approval",
        requests_print_list: "Print List",
        requests_header_by: "Requested By",
        requests_header_details: "Details",
        // Payments
        payments_record_payment: "Record a Payment",
        payments_select_supplier: "1. Select Supplier",
        payments_select_invoices: "2. Select Invoices to Pay",
        payments_select_invoices_btn: "Select Invoices...",
        payments_method: "3. Enter Payment Method",
        payments_confirm_amounts: "4. Confirm Amounts",
        payments_header_invoice: "Invoice #",
        payments_header_due: "Balance Due",
        payments_header_to_pay: "Amount to Pay",
        payments_total: "Total Payment:",
        payments_submit: "Submit Payment",
        // Reports
        reports_supplier_statement: "Supplier Statement",
        reports_branch_consumption: "Branch Consumption",
        reports_section_consumption: "Section Usage",
        reports_resupply: "Resupply Report",
        reports_generate: "Generate",
        // Stock Levels
        stock_levels_by_item: "Stock by Item",
        stock_levels_all_branches: "Stock by Item (All Branches)",
        stock_levels_your_branch: "Stock by Item (Your Branch)",
        stock_levels_inquiry: "Item Stock Inquiry (Drill-down)",
        stock_levels_inquiry_placeholder: "Start typing an item name or code...",
        // Transaction History
        txlog_title: "Transaction Log",
        txlog_all_types: "All Types",
        txlog_all_branches: "All Branches",
        txlog_search_placeholder: "Search by Ref#, Item Code/Name...",
        txlog_header_date: "Date",
        txlog_header_type: "Type",
        txlog_header_ref: "Batch/Ref #",
        txlog_header_details: "Details",
        txlog_header_status: "Status",

        // Dynamic & Messages
        hi_user: "Hi, {0}",
        user_branch: "Branch: {0}",
        user_section: "Section: {0}",
        history_for: "History for: {0} ({1})",
        edit_item_title: "Edit Item",
        edit_supplier_title: "Edit Supplier",
        edit_branch_title: "Edit Branch",
        edit_section_title: "Edit Section",
        edit_user_title: "Edit User",
        add_user_title: "Add New User",
        edit_role_title: "Edit Permissions for {0}",
        toast_success_item_added: "Item added!",
        toast_success_item_updated: "Item updated successfully!",
        toast_confirm_backup: "This will create a full, manual backup of the current spreadsheet. Continue?",
        toast_backup_created: "Backup created: {0}",
        toast_data_refreshed: "Data refreshed!",
        error_report_content_not_found: "Error: Report content not found.",
        confirm_delete_role: "Are you sure you want to delete this role? This cannot be undone.",
        session_error_logout: "Session error. Please logout and login again.",
        action_failed: "Action Failed: {0}",
    },
    // Arabic
    ar: {
        // General & UI
        app_title: "برنامج مخازن التعبئة",
        login_title: "مخازن التعبئة",
        login_prompt: "الرجاء إدخال بيانات الاعتماد الخاصة بك للمتابعة.",
        login_username_label: "اسم المستخدم",
        login_password_label: "كلمة المرور / رمز الدخول",
        login_button: "تسجيل الدخول",
        login_signing_in: "جاري تسجيل الدخول...",
        refresh_all_data: "تحديث كل البيانات",
        nav_dashboard: "الرئيسية",
        nav_operations: "عمليات المخزن",
        nav_purchasing: "المشتريات",
        nav_requests: "الطلبات",
        nav_payments: "المدفوعات",
        nav_reports: "التقارير",
        nav_stock_levels: "أرصدة المخزون",
        nav_transaction_history: "سجل الحركات",
        nav_setup: "إضافة بيانات",
        nav_master_data: "البيانات الرئيسية",
        nav_user_management: "إدارة المستخدمين",
        nav_backup: "النسخ الاحتياطي",
        nav_activity_log: "سجل النشاط",
        nav_logout: "تسجيل الخروج",
        pending_requests: "طلبات معلقة",
        total_items: "إجمالي الأصناف",
        total_stock_value: "قيمة المخزون",
        total_suppliers: "إجمالي الموردين",
        total_branches: "إجمالي الفروع",
        add_new_item: "إضافة صنف جديد",
        item_code_label: "كود الصنف (ID فريد)",
        item_barcode_label: "باركود",
        item_name_label: "اسم الصنف",
        item_unit_label: "الوحدة (مثل: قطعة، كجم)",
        item_category_label: "الفئة",
        item_supplier_label: "المورد الافتراضي",
        item_cost_label: "التكلفة الافتراضية",
        add_item_button: "إضافة صنف",
        add_new_supplier: "إضافة مورد جديد",
        supplier_code_label: "كود المورد (ID فريد)",
        supplier_name_label: "اسم المورد",
        supplier_contact_label: "بيانات الاتصال",
        add_supplier_button: "إضافة مورد",
        add_new_branch: "إضافة فرع جديد",
        branch_code_label: "كود الفرع (ID فريد)",
        branch_name_label: "اسم الفرع",
        add_branch_button: "إضافة فرع",
        add_new_section: "إضافة قسم جديد",
        section_code_label: "كود القسم (ID فريد)",
        section_name_label: "اسم القسم",
        add_section_button: "إضافة قسم",
        auto_backup_settings: "إعدادات النسخ الاحتياطي التلقائي",
        auto_backup_desc: "قم بتمكين النسخ الاحتياطي التلقائي لحفظ نسخة من بياناتك بشكل دوري. يتم تخزين النسخ الاحتياطية في مجلد \"StockApp Backups\" في Google Drive.",
        enable_auto_backups: "تمكين النسخ الاحتياطي التلقائي",
        backup_frequency: "تكرار النسخ الاحتياطي",
        daily_backup: "يوميًا (الساعة 2 صباحًا)",
        weekly_backup: "أسبوعيًا (الأحد الساعة 2 صباحًا)",
        manual_backup_restore: "النسخ الاحتياطي والاستعادة اليدوي",
        manual_backup_desc: "أنشئ نسخة احتياطية فورية أو قم بالاستعادة من ملف تم إنشاؤه مسبقًا.",
        create_new_manual_backup: "إنشاء نسخة احتياطية يدوية جديدة",
        available_backups: "النسخ الاحتياطية المتاحة",
        loading_backups: "جاري تحميل قائمة النسخ الاحتياطية...",
        tab_items: "الأصناف",
        tab_suppliers: "الموردون",
        tab_branches: "الفروع",
        tab_sections: "الأقسام",
        item_list: "قائمة الأصناف",
        search_items_placeholder: "ابحث بالاسم، الكود، الفئة...",
        export_to_excel: "تصدير إلى Excel",
        header_code: "الكود",
        header_name: "الاسم",
        header_category: "الفئة",
        header_unit: "الوحدة",
        header_default_cost: "التكلفة",
        header_actions: "إجراءات",
        // Purchasing
        purchasing_create_po: "إنشاء أمر شراء",
        purchasing_view_pos: "عرض أوامر الشراء",
        purchasing_pending_approval: "بانتظار الموافقة",
        po_details: "تفاصيل أمر الشراء",
        po_supplier: "المورد",
        po_ref: "رقم مرجع أمر الشراء",
        po_notes: "ملاحظات (اختياري)",
        po_items_to_order: "الأصناف المطلوب شراؤها",
        po_grand_total: "المجموع الإجمالي:",
        po_select_items: "اختر الأصناف",
        po_submit_for_approval: "إرسال للموافقة",
        po_list: "قائمة أوامر الشراء",
        po_header_ponum: "رقم أمر الشراء",
        po_header_date: "التاريخ",
        po_header_supplier: "المورد",
        po_header_items: "الأصناف",
        po_header_value: "القيمة الإجمالية",
        po_header_status: "الحالة",
        po_pending_financial_approval: "الحركات المالية بانتظار الموافقة",
        // Requests
        requests_my_requests: "طلباتي",
        requests_pending_approval: "بانتظار الموافقة",
        requests_create_new: "إنشاء طلب جديد",
        requests_type: "نوع الطلب",
        requests_type_issue: "طلب أصناف من الفرع",
        requests_type_resupply: "طلب إعادة تزويد (مخزون منخفض)",
        requests_notes: "ملاحظات / مبررات",
        requests_items_for_request: "أصناف الطلب",
        requests_submit: "إرسال الطلب",
        requests_history: "سجل طلباتي",
        requests_header_id: "الرقم",
        requests_header_date: "التاريخ",
        requests_header_type: "النوع",
        requests_header_qty: "الكمية (مطلوب/مصروف)",
        requests_header_status: "الحالة",
        requests_header_notes: "ملاحظات",
        requests_pending_approval_title: "طلبات بانتظار الموافقة",
        requests_print_list: "طباعة القائمة",
        requests_header_by: "مقدم الطلب",
        requests_header_details: "التفاصيل",
        // Payments
        payments_record_payment: "تسجيل دفعة",
        payments_select_supplier: "1. اختر المورد",
        payments_select_invoices: "2. اختر الفواتير للدفع",
        payments_select_invoices_btn: "اختر الفواتير...",
        payments_method: "3. أدخل طريقة الدفع",
        payments_confirm_amounts: "4. تأكيد المبالغ",
        payments_header_invoice: "رقم الفاتورة",
        payments_header_due: "الرصيد المستحق",
        payments_header_to_pay: "المبلغ المدفوع",
        payments_total: "إجمالي الدفعة:",
        payments_submit: "تسجيل الدفعة",
        // Reports
        reports_supplier_statement: "كشف حساب مورد",
        reports_branch_consumption: "استهلاك فرع",
        reports_section_consumption: "استخدام قسم",
        reports_resupply: "تقرير إعادة التزويد",
        reports_generate: "إنشاء",
        // Stock Levels
        stock_levels_by_item: "المخزون حسب الصنف",
        stock_levels_all_branches: "المخزون حسب الصنف (كل الفروع)",
        stock_levels_your_branch: "المخزون حسب الصنف (فرعك)",
        stock_levels_inquiry: "استعلام عن رصيد صنف",
        stock_levels_inquiry_placeholder: "ابدأ بكتابة اسم أو كود الصنف...",
        // Transaction History
        txlog_title: "سجل الحركات",
        txlog_all_types: "كل الأنواع",
        txlog_all_branches: "كل الفروع",
        txlog_search_placeholder: "ابحث بالمرجع، كود/اسم الصنف...",
        txlog_header_date: "التاريخ",
        txlog_header_type: "النوع",
        txlog_header_ref: "الدفعة/المرجع #",
        txlog_header_details: "التفاصيل",
        txlog_header_status: "الحالة",
        
        // Dynamic & Messages
        hi_user: "مرحباً، {0}",
        user_branch: "الفرع: {0}",
        user_section: "القسم: {0}",
        history_for: "سجل الصنف: {0} ({1})",
        edit_item_title: "تعديل صنف",
        edit_supplier_title: "تعديل مورد",
        edit_branch_title: "تعديل فرع",
        edit_section_title: "تعديل قسم",
        edit_user_title: "تعديل مستخدم",
        add_user_title: "إضافة مستخدم جديد",
        edit_role_title: "تعديل صلاحيات دور {0}",
        toast_success_item_added: "تمت إضافة الصنف بنجاح!",
        toast_success_item_updated: "تم تعديل الصنف بنجاح!",
        toast_confirm_backup: "سيؤدي هذا إلى إنشاء نسخة احتياطية يدوية كاملة من جدول البيانات الحالي. هل تريد المتابعة؟",
        toast_backup_created: "تم إنشاء النسخة الاحتياطية: {0}",
        toast_data_refreshed: "تم تحديث البيانات بنجاح!",
        error_report_content_not_found: "خطأ: لم يتم العثور على محتوى التقرير.",
        confirm_delete_role: "هل أنت متأكد من رغبتك في حذف هذا الدور؟ لا يمكن التراجع عن هذا الإجراء.",
        session_error_logout: "خطأ في الجلسة. يرجى تسجيل الخروج والدخول مرة أخرى.",
        action_failed: "فشل الإجراء: {0}",
    }
};

let currentLang = 'en';

function getText(key, ...args) {
    let text = (translations[currentLang] && translations[currentLang][key]) || translations['en'][key] || `MISSING_KEY: ${key}`;
    args.forEach((arg, index) => {
        text = text.replace(`{${index}}`, arg);
    });
    return text;
}


document.addEventListener('DOMContentLoaded', () => {
    // !!! IMPORTANT: PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6ILWFJPd8gsFQY-h4ZVZSByQfSXIzl6OpKk2m488Ihu9u1TCFSxsWAjvkW5Ws65NU/exec';

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
        currentEditingPOList: [],
        currentAdjustmentList: [],
        modalSelections: new Set(),
        invoiceModalSelections: new Set(),
        allUsers: [],
        allRoles: [],
        backups: []
    };
    let modalContext = null;

    // CORRECTED: All functions are now declared within the DOMContentLoaded scope.
    // The language switcher is defined first so it can be used by other functions.
    function switchLanguage(lang) {
        if (!['en', 'ar'].includes(lang)) lang = 'en';
        
        currentLang = lang;
        localStorage.setItem('stockAppLang', lang);

        // Update static text on all elements with data-lang
        document.querySelectorAll('[data-lang]').forEach(el => {
            const key = el.dataset.lang;
            const translation = getText(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if(el.type !== 'submit' && el.type !== 'button') el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        });
        
        document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
             const key = el.dataset.langPlaceholder;
             el.placeholder = getText(key);
        });

        document.documentElement.lang = lang;
        document.body.className = lang === 'ar' ? 'lang-ar' : '';

        document.querySelectorAll('.lang-switcher button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        
        if (state.currentUser) {
            const currentView = document.querySelector('.nav-item a.active')?.dataset.view || 'dashboard';
            refreshViewData(currentView);
            initializeAppUI();
        }
        Logger.info(`Language switched to ${lang}`);
    }

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
    const globalRefreshBtn = document.getElementById('global-refresh-button');
    const mainContent = document.querySelector('.main-content');

    const itemSelectorModal = document.getElementById('item-selector-modal');
    const invoiceSelectorModal = document.getElementById('invoice-selector-modal');
    const editModal = document.getElementById('edit-modal');
    const historyModal = document.getElementById('history-modal');
    const editPOModal = document.getElementById('edit-po-modal');
    const approveRequestModal = document.getElementById('approve-request-modal');
    
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
            loginContainer.style.display = 'none';
            appContainer.style.display = 'flex';
            
            switchLanguage(currentLang);
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
            showToast(getText('session_error_logout'), 'error');
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
            const userMsg = getText('action_failed', error.message);
            Logger.error(userMsg, error);
            showToast(userMsg, 'error');
            return null;
        } finally {
            setButtonLoading(false, buttonEl);
        }
    }

// PART 2 OF 4: MODAL & UI LOGIC
    function showView(viewId, subViewId = null) {
        Logger.info(`Switching view to: ${viewId}` + (subViewId ? `/${subViewId}` : ''));
        
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('#main-nav a').forEach(link => link.classList.remove('active'));

        const viewToShow = document.getElementById(`view-${viewId}`);
        if(viewToShow) viewToShow.classList.add('active');
        
        const activeLink = document.querySelector(`[data-view="${viewId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            document.getElementById('view-title').textContent = activeLink.querySelector('span').textContent;
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
            case 'issue': currentList = state.currentIssueList; break;
            case 'po': currentList = state.currentPOList; break;
            case 'return': currentList = state.currentReturnList; break;
            case 'request': currentList = state.currentRequestList; break;
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

        document.getElementById('history-modal-title').textContent = getText('history_for', item.name, item.code);
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
        
        populateOptions(document.getElementById('history-filter-branch'), state.branches, 'All Branches', 'branchCode', 'name');
        const txTypes = ['receive', 'issue', 'transfer_out', 'transfer_in', 'return_out', 'adjustment_in', 'adjustment_out'];
        populateOptions(document.getElementById('history-filter-type'), txTypes.map(t => ({'type': t, 'name': t.replace(/_/g, ' ').toUpperCase()})), 'All Types', 'type', 'name');

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
            priceHistoryContainer.innerHTML = '<p>Could not load price history.</p>';
            movementHistoryContainer.querySelector('#movement-history-table-container').innerHTML = '<p>Could not load movement history.</p>';
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
            showToast('Could not find transfer details.', 'error');
            return;
        }
        const first = transferGroup[0];
        const fromBranch = findByKey(state.branches, 'branchCode', first.fromBranchCode)?.name || first.fromBranchCode;
        const toBranch = findByKey(state.branches, 'branchCode', first.toBranchCode)?.name || first.toBranchCode;

        const modalBody = document.getElementById('view-transfer-modal-body');
        const items = transferGroup.map(tx => {
            const item = findByKey(state.items, 'code', tx.itemCode) || { name: 'DELETED' };
            return { itemCode: tx.itemCode, itemName: item.name, quantity: tx.quantity };
        });

        let itemsHtml = items.map(item => `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.quantity}</td></tr>`).join('');

        modalBody.innerHTML = `
            <p><strong>From Branch:</strong> ${fromBranch}</p>
            <p><strong>To Branch:</strong> ${toBranch}</p>
            <p><strong>Reference:</strong> ${first.ref || 'N/A'}</p>
            <hr>
            <h4>Items in Shipment</h4>
            <table><thead><tr><th>Code</th><th>Name</th><th>Quantity</th></tr></thead><tbody>${itemsHtml}</tbody></table>`;
        
        const modal = document.getElementById('view-transfer-modal');
        modal.querySelector('.modal-footer').innerHTML = `
            <button class="secondary modal-cancel">Cancel</button>
            <button id="btn-print-transfer-receipt" class="secondary">Print Receipt</button>
            <button id="btn-reject-transfer" class="danger" data-batch-id="${batchId}">Reject</button>
            <button id="btn-confirm-receive-transfer" class="primary" data-batch-id="${batchId}">Confirm Receipt</button>
        `;

        document.getElementById('btn-print-transfer-receipt').onclick = () => {
            const dataToPrint = { ...first, items: items, date: new Date() };
            generateTransferDocument(dataToPrint);
        };

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
                editModalTitle.textContent = getText('edit_item_title');
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
                editModalTitle.textContent = getText('edit_supplier_title');
                formHtml = `<div class="form-grid"><div class="form-group"><label>Supplier Code</label><input type="text" value="${record.supplierCode}" readonly></div><div class="form-group"><label for="edit-supplier-name">Supplier Name</label><input type="text" id="edit-supplier-name" name="name" value="${record.name}" required></div><div class="form-group"><label for="edit-supplier-contact">Contact Info</label><input type="text" id="edit-supplier-contact" name="contact" value="${record.contact || ''}"></div></div>`;
                editModalBody.innerHTML = formHtml;
                break;
            case 'branch':
                record = findByKey(state.branches, 'branchCode', id);
                if (!record) return;
                editModalTitle.textContent = getText('edit_branch_title');
                formHtml = `<div class="form-grid"><div class="form-group"><label>Branch Code</label><input type="text" value="${record.branchCode}" readonly></div><div class="form-group"><label for="edit-branch-name">Branch Name</label><input type="text" id="edit-branch-name" name="name" value="${record.name}" required></div></div>`;
                editModalBody.innerHTML = formHtml;
                break;
            case 'section':
                record = findByKey(state.sections, 'sectionCode', id);
                if (!record) return;
                editModalTitle.textContent = getText('edit_section_title');
                formHtml = `<div class="form-grid"><div class="form-group"><label>Section Code</label><input type="text" value="${record.sectionCode}" readonly></div><div class="form-group"><label for="edit-section-name">Section Name</label><input type="text" id="edit-section-name" name="name" value="${record.name}" required></div></div>`;
                editModalBody.innerHTML = formHtml;
                break;
            case 'user':
                record = findByKey(state.allUsers, 'Username', id);
                if (!record && id !== null) return;
                editModalTitle.textContent = id ? getText('edit_user_title') : getText('add_user_title');
                const isUserDisabled = record ? (record.isDisabled === true || String(record.isDisabled).toUpperCase() === 'TRUE') : false;
                const currentUsername = record ? record.Username : '';
                const currentName = record ? record.Name : '';
                const currentRole = record ? record.RoleName : '';
                const currentBranch = record ? record.AssignedBranchCode : '';
                const currentSection = record ? record.AssignedSectionCode : '';

                const roleOptions = state.allRoles.map(r => `<option value="${r.RoleName}" ${r.RoleName === currentRole ? 'selected' : ''}>${r.RoleName}</option>`).join('');
                const branchOptions = state.branches.map(b => `<option value="${b.branchCode}" ${b.branchCode === currentBranch ? 'selected' : ''}>${b.name}</option>`).join('');
                const sectionOptions = state.sections.map(s => `<option value="${s.sectionCode}" ${s.sectionCode === currentSection ? 'selected' : ''}>${s.name}</option>`).join('');
                
                formHtml = `<div class="form-grid"><div class="form-group"><label>Username</label><input type="text" id="edit-user-username" name="Username" value="${currentUsername}" ${id ? 'readonly' : 'required'}></div><div class="form-group"><label for="edit-user-name">Full Name</label><input type="text" id="edit-user-name" name="Name" value="${currentName}" required></div><div class="form-group"><label for="edit-user-role">Role</label><select id="edit-user-role" name="RoleName" required>${roleOptions}</select></div><div class="form-group"><label for="edit-user-branch">Assigned Branch</label><select id="edit-user-branch" name="AssignedBranchCode"><option value="">None</option>${branchOptions}</select></div><div class="form-group"><label for="edit-user-section">Assigned Section</label><select id="edit-user-section" name="AssignedSectionCode"><option value="">None</option>${sectionOptions}</select></div><div class="form-group span-full"><label for="edit-user-password">Password / Login Code ${id ? '(leave blank to keep unchanged)' : ''}</label><input type="password" id="edit-user-password" name="LoginCode" ${!id ? 'required' : ''}></div>`;
                if(id) {
                    const btnText = isUserDisabled ? 'Enable User' : 'Disable User';
                    const btnClass = isUserDisabled ? 'primary' : 'danger';
                    formHtml += `<div class="form-group span-full"><button type="button" id="btn-toggle-user-status" class="${btnClass}">${btnText}</button></div>`;
                }
                formHtml += `</div>`;
                editModalBody.innerHTML = formHtml;

                const toggleBtn = document.getElementById('btn-toggle-user-status');
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', async () => {
                        const newStatus = !isUserDisabled;
                        const confirmationText = newStatus ? `Are you sure you want to disable this user? They will not be able to log in.` : `Are you sure you want to enable this user? They will be able to log in again.`;
                        if (confirm(confirmationText)) {
                            const result = await postData('updateUser', { Username: id, updates: { isDisabled: newStatus } }, toggleBtn);
                            if (result) {
                                showToast(`User ${newStatus ? 'disabled' : 'enabled'} successfully!`, 'success');
                                closeModal();
                                reloadDataAndRefreshUI();
                            }
                        }
                    });
                }
                break;
            case 'role':
                record = findByKey(state.allRoles, 'RoleName', id);
                if (!record) {
                    showToast('Role data not found. Please refresh and try again.', 'error');
                    return;
                }
                editModalTitle.textContent = getText('edit_role_title', record.RoleName);

                const permissionCategories = {
                    'General Access': ['viewDashboard', 'viewActivityLog'],
                    'User Management': ['manageUsers', 'opBackupRestore'],
                    'Data Management': ['viewSetup', 'viewMasterData', 'createItem', 'editItem', 'createSupplier', 'editSupplier', 'createBranch', 'editBranch', 'createSection', 'editSection'],
                    'Stock Operations': ['viewOperations', 'opReceive', 'opReceiveWithoutPO', 'opIssue', 'opTransfer', 'opReturn', 'opStockAdjustment'],
                    'Purchasing': ['viewPurchasing', 'opCreatePO'],
                    'Item Requests': ['viewRequests', 'opRequestItems', 'opApproveIssueRequest', 'opApproveResupplyRequest'],
                    'Financials': ['viewPayments', 'opRecordPayment', 'opFinancialAdjustment', 'opApproveFinancials', 'opEditInvoice'],
                    'Reporting': ['viewReports', 'viewStockLevels', 'viewTransactionHistory', 'viewAllBranches'],
                };
                
                formHtml = '<h3>Permissions</h3>';
                for (const category in permissionCategories) {
                    formHtml += `<h4 class="permission-category">${category}</h4><div class="form-grid permissions-grid">`;
                    permissionCategories[category].forEach(key => {
                        const isChecked = record[key] === true || String(record[key]).toUpperCase() === 'TRUE';
                        formHtml += `<div class="form-group-checkbox"><input type="checkbox" id="edit-perm-${key}" name="${key}" ${isChecked ? 'checked' : ''}><label for="edit-perm-${key}">${key}</label></div>`;
                    });
                    formHtml += `</div>`;
                }

                formHtml += `<div class="form-group span-full" style="margin-top: 24px;"><button type="button" id="btn-delete-role" class="danger">Delete Role</button></div>`;
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
        let payload = {}, action;

        if (type === 'user') {
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
            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} ${id ? 'updated' : 'added'} successfully!`, 'success');
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
                const newItem = { itemCode: item.code, itemName: item.name, quantity: 1, cost: item.cost };
                if (modalContext === 'adjustment') {
                    newItem.physicalCount = 0;
                }
                newList.push(newItem);
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
            case 'edit-po': state.currentEditingPOList = createNewList(state.currentEditingPOList); renderPOEditListTable(); break;
            case 'adjustment': state.currentAdjustmentList = createNewList(state.currentAdjustmentList); renderAdjustmentListTable(); break;
        }
        closeModal();
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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No items found.</td></tr>';
            return;
        }
        const canEdit = userCan('editItem');
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.code}</td><td>${item.name}</td><td>${item.category || 'N/A'}</td><td>${item.unit}</td><td>${(parseFloat(item.cost) || 0).toFixed(2)} EGP</td><td><div class="action-buttons"><button class="secondary small btn-edit" data-type="item" data-id="${item.code}" ${!canEdit ? 'disabled' : ''}>Edit</button><button class="secondary small btn-history" data-type="item" data-id="${item.code}">History</button></div></td>`;
            tbody.appendChild(tr);
        });
    }

    function renderSuppliersTable(data = state.suppliers) {
        const tbody = document.getElementById('table-suppliers').querySelector('tbody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No suppliers found.</td></tr>';
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
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No branches found.</td></tr>';
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
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No sections found.</td></tr>';
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
                const availableStock = (stock[fromBranch]?.[item.itemCode]?.quantity || 0);
                switch (col.type) {
                    case 'text': content = item[col.key]; break;
                    case 'number_input': content = `<input type="number" class="table-input" value="${item[col.key] || 1}" min="${col.min || 0.01}" ${col.maxKey ? `max="${availableStock}"` : ''} step="${col.step || 0.01}" data-index="${index}" data-field="${col.key}">`; break;
                    case 'cost_input': content = `<input type="number" class="table-input" value="${(item.cost || 0).toFixed(2)}" min="0" step="0.01" data-index="${index}" data-field="cost">`; break;
                    case 'calculated': content = `<span>${col.calculator(item)}</span>`; break;
                    case 'available_stock': content = availableStock.toFixed(2); break;
                }
                cellsHtml += `<td>${content}</td>`;
            });
            cellsHtml += `<td><button class="danger small" data-index="${index}">X</button></td>`;
            tr.innerHTML = cellsHtml;
            tbody.appendChild(tr);
        });
        if (totalizerFn) totalizerFn();
    };
    
    function renderReceiveListTable() { renderDynamicListTable('table-receive-list', state.currentReceiveList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)} EGP` } ], 'No items selected. Click "Select Items".', updateReceiveGrandTotal); }
    function renderTransferListTable() { renderDynamicListTable('table-transfer-list', state.currentTransferList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'transfer-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'transfer-from-branch' } ], 'No items selected. Click "Select Items".', updateTransferGrandTotal); }
    function renderIssueListTable() { renderDynamicListTable('table-issue-list', state.currentIssueList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'issue-from-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'issue-from-branch' } ], 'No items selected. Click "Select Items".', updateIssueGrandTotal); }
    function renderPOListTable() { renderDynamicListTable('table-po-list', state.currentPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)} EGP` } ], 'No items selected. Click "Select Items".', updatePOGrandTotal); }
    function renderPOEditListTable() { renderDynamicListTable('table-edit-po-list', state.currentEditingPOList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' }, { type: 'cost_input', key: 'cost' }, { type: 'calculated', calculator: item => `${((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)).toFixed(2)} EGP` } ], 'No items selected. Click "Select Items".', updatePOEditGrandTotal); }
    function renderReturnListTable() { renderDynamicListTable('table-return-list', state.currentReturnList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'available_stock', branchSelectId: 'return-branch' }, { type: 'number_input', key: 'quantity', maxKey: true, branchSelectId: 'return-branch' }, { type: 'cost_input', key: 'cost' } ], 'No items selected. Click "Select Items".', updateReturnGrandTotal); }
    function renderRequestListTable() { renderDynamicListTable('table-request-list', state.currentRequestList, [ { type: 'text', key: 'itemCode' }, { type: 'text', key: 'itemName' }, { type: 'number_input', key: 'quantity' } ], 'No items selected. Click "Select Items".', null); }

    function renderAdjustmentListTable() {
        const tbody = document.getElementById('table-adjustment-list').querySelector('tbody');
        tbody.innerHTML = '';
        if (!state.currentAdjustmentList || state.currentAdjustmentList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No items selected for adjustment.</td></tr>`;
            return;
        }
        const stock = calculateStockLevels();
        const branchCode = document.getElementById('adjustment-branch').value;

        state.currentAdjustmentList.forEach((item, index) => {
            const systemQty = (branchCode && stock[branchCode]?.[item.itemCode]?.quantity) || 0;
            const physicalCount = typeof item.physicalCount !== 'undefined' ? item.physicalCount : systemQty;
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
        if(!supplierData) {
            resultsContainer.innerHTML = '<p>No financial data found for this supplier.</p>';
            exportBtn.disabled = true;
            return;
        }
        const sDate = startDateStr ? new Date(startDateStr) : null;
        if(sDate) sDate.setHours(0,0,0,0);
        const eDate = endDateStr ? new Date(endDateStr) : null;
        if (eDate) eDate.setHours(23, 59, 59, 999);
        let openingBalance = 0;
        if (sDate) {
            supplierData.events.forEach(event => {
                if (new Date(event.date) < sDate) {
                    openingBalance += (event.debit || 0) - (event.credit || 0);
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
            balance += (event.debit || 0) - (event.credit || 0);
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
        resultsContainer.innerHTML = `<div class="printable-document"><div class="printable-header"><div><h2>Supplier Statement: ${supplier.name}</h2><p style="margin:0; color: var(--text-light-color);">For period: ${dateHeader}</p></div><button class="secondary small no-print" onclick="printReport('supplier-statement-results')">Print</button></div><p><strong>Date Generated:</strong> ${new Date().toLocaleString()}</p><div class="report-area"><table id="table-supplier-statement-report"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${tableBodyHtml}</tbody><tfoot><tr style="font-weight:bold; background-color: var(--bg-color);"><td colspan="5" style="text-align:right;">Closing Balance:</td><td>${balance.toFixed(2)} EGP</td></tr></tfoot></table></div></div>`;
        resultsContainer.style.display = 'block';
        exportBtn.disabled = false;
    }

    function renderConsumptionReport(config) {
        const { resultsContainerId, exportBtnId, data, title, entityName, dateHeader, historicalCosts, qtyColumnHeader = 'Total Qty Consumed' } = config;
        const resultsContainer = document.getElementById(resultsContainerId);
        const exportBtn = document.getElementById(exportBtnId);
    
        const hasValue = !!historicalCosts;
    
        const groupedByItem = {};
        (data || []).forEach(t => {
            if (!groupedByItem[t.itemCode]) {
                const item = findByKey(state.items, 'code', t.itemCode) || { name: 'N/A', unit: 'N/A', category: 'N/A' };
                groupedByItem[t.itemCode] = { item, totalQty: 0, totalValue: 0 };
            }
            
            const quantity = parseFloat(t.quantity) || 0;
            groupedByItem[t.itemCode].totalQty += quantity;
    
            if (hasValue) {
                const costAtTransaction = historicalCosts[`${t.batchId}-${t.itemCode}`] || findByKey(state.items, 'code', t.itemCode)?.cost || 0;
                groupedByItem[t.itemCode].totalValue += quantity * costAtTransaction;
            }
        });
    
        let tableBodyHtml = '';
        const sortedGroups = Object.values(groupedByItem).sort((a, b) => a.item.name.localeCompare(b.item.name));
    
        sortedGroups.forEach(group => {
            tableBodyHtml += `<tr>
                <td>${group.item.code}</td>
                <td>${group.item.name}</td>
                <td>${group.item.category || 'N/A'}</td>
                <td style="text-align:right;">${group.totalQty.toFixed(2)} ${group.item.unit}</td>
                ${hasValue ? `<td style="text-align:right;">${group.totalValue.toFixed(2)} EGP</td>` : ''}
            </tr>`;
        });
        
        const grandTotalValue = sortedGroups.reduce((sum, group) => sum + group.totalValue, 0);
    
        const headerHtml = `<thead><tr><th>Item Code</th><th>Item Name</th><th>Category</th><th style="text-align:right;">${qtyColumnHeader}</th>${hasValue ? '<th style="text-align:right;">Total Value</th>' : ''}</tr></thead>`;
        const footerHtml = hasValue ? `<tfoot><tr style="font-weight:bold; background-color: var(--bg-color);">
            <td colspan="4" style="text-align:right;">Grand Total Value:</td>
            <td style="text-align:right;">${grandTotalValue.toFixed(2)} EGP</td>
        </tr></tfoot>` : '';
    
        resultsContainer.innerHTML = `<div class="printable-document">
            <div class="printable-header"><div><h2>${title}: ${entityName}</h2><p style="margin:0; color: var(--text-light-color);">For period: ${dateHeader}</p></div><button class="secondary small no-print" onclick="printReport('${resultsContainerId}')">Print</button></div>
            <div class="report-area"><table id="table-${resultsContainerId}-report">
                ${headerHtml}
                <tbody>${tableBodyHtml}</tbody>
                ${footerHtml}
            </table></div></div>`;
        resultsContainer.style.display = 'block';
        exportBtn.disabled = false;
    }
    
    function renderPriceHistory(priceHistory) {
        const container = document.getElementById('subview-price-history');
        let html = '<h4>Price Change Log</h4><table id="table-price-history"><thead><tr><th>Date</th><th>Old Cost</th><th>New Cost</th><th>Change</th><th>Source</th><th>Updated By</th></tr></thead><tbody>';
        if (!priceHistory || priceHistory.length === 0) {
            html += '<tr><td colspan="6" style="text-align:center;">No price history found for this item.</td></tr>';
        } else {
            priceHistory.forEach(h => {
                const oldCost = parseFloat(h.OldCost) || 0;
                const newCost = parseFloat(h.NewCost) || 0;
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
        const container = document.getElementById('movement-history-table-container');
        
        const startDate = document.getElementById('history-filter-start-date').value;
        const endDate = document.getElementById('history-filter-end-date').value;
        const type = document.getElementById('history-filter-type').value;
        const branch = document.getElementById('history-filter-branch').value;
        
        const sDate = startDate ? new Date(startDate) : null;
        if(sDate) sDate.setHours(0,0,0,0);
        const eDate = endDate ? new Date(endDate) : null;
        if(eDate) eDate.setHours(23,59,59,999);

        const filteredHistory = (movementHistory || []).filter(t => {
            const eventDate = new Date(t.date);
            const typeMatch = !type || t.type === type;
            const branchMatch = !branch || t.fromBranchCode === branch || t.toBranchCode === branch || t.branchCode === branch;
            const startDateMatch = !sDate || eventDate >= sDate;
            const endDateMatch = !eDate || eventDate <= eDate;
            return typeMatch && branchMatch && startDateMatch && endDateMatch;
        });
        
        let html = '<table id="table-movement-history"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Details</th><th style="text-align:right;">Qty In</th><th style="text-align:right;">Qty Out</th></tr></thead><tbody>';
        if (filteredHistory.length === 0) {
            html += '<tr><td colspan="6" style="text-align:center;">No movements found for the selected filters.</td></tr>';
        } else {
            filteredHistory.forEach(t => {
                let type = t.type.replace('_', ' ').toUpperCase();
                let details = '', qtyIn = '-', qtyOut = '-';
                const quantity = parseFloat(t.quantity) || 0;

                switch (t.type) {
                    case 'receive': 
                        details = `From: ${findByKey(state.suppliers, 'supplierCode', t.supplierCode)?.name || t.supplierCode} To: ${findByKey(state.branches, 'branchCode', t.branchCode)?.name || t.branchCode}`;
                        qtyIn = quantity.toFixed(2);
                        break;
                    case 'issue':
                        details = `From: ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name || t.fromBranchCode} To: ${findByKey(state.sections, 'sectionCode', t.sectionCode)?.name || t.sectionCode}`;
                        qtyOut = quantity.toFixed(2);
                        break;
                    case 'transfer_out':
                        details = `Sent from: ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name} To: ${findByKey(state.branches, 'branchCode', t.toBranchCode)?.name}`;
                        qtyOut = quantity.toFixed(2);
                        break;
                    case 'transfer_in':
                        details = `Received at: ${findByKey(state.branches, 'branchCode', t.toBranchCode)?.name} From: ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name}`;
                        qtyIn = quantity.toFixed(2);
                        break;
                    case 'return_out':
                        details = `Returned from: ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name} To: ${findByKey(state.suppliers, 'supplierCode', t.supplierCode)?.name}`;
                        qtyOut = quantity.toFixed(2);
                        break;
                    case 'adjustment_in':
                        details = `Stock count at: ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name}`;
                        qtyIn = quantity.toFixed(2);
                        break;
                    case 'adjustment_out':
                        details = `Stock count at: ${findByKey(state.branches, 'branchCode', t.fromBranchCode)?.name}`;
                        qtyOut = quantity.toFixed(2);
                        break;
                }
                html += `<tr><td>${new Date(t.date).toLocaleString()}</td><td>${type}</td><td>${t.invoiceNumber || t.ref || t.batchId}</td><td>${details}</td><td style="text-align:right;">${qtyIn}</td><td style="text-align:right;">${qtyOut}</td></tr>`;
            });
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function renderTransactionHistory(filters = {}) {
        const tbody = document.getElementById('table-transaction-history').querySelector('tbody');
        tbody.innerHTML = '';
        
        const tHead = tbody.previousElementSibling;
        tHead.innerHTML = `<tr><th data-lang="txlog_header_date">Date</th><th data-lang="txlog_header_type">Type</th><th data-lang="txlog_header_ref">Batch/Ref #</th><th data-lang="txlog_header_details">Details</th><th data-lang="txlog_header_status">Status</th><th data-lang="header_actions">Actions</th></tr>`;
        
        let allTx = [...state.transactions];
        let allPo = [...state.purchaseOrders];

        if (!userCan('viewAllBranches')) {
            const branchCode = state.currentUser.AssignedBranchCode;
            if (branchCode) {
                allTx = allTx.filter(t => String(t.branchCode) === branchCode || String(t.fromBranchCode) === branchCode || String(t.toBranchCode) === branchCode);
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
        if (filters.branch) allHistoryItems = allHistoryItems.filter(t => String(t.branchCode) === String(filters.branch) || String(t.fromBranchCode) === String(filters.branch) || String(t.toBranchCode) === String(filters.branch));
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

            let actionsHtml = `<button class="secondary small btn-view-tx" data-batch-id="${group.batchId}" data-type="${first.type}">View/Print</button>`;
            if(canEditInvoice){
                actionsHtml += `<button class="secondary small btn-edit-invoice" data-batch-id="${group.batchId}">Edit</button>`;
            }

            switch(first.type) {
                case 'receive':
                    details = `Received ${group.transactions.length} item(s) from <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong> to <strong>${findByKey(state.branches, 'branchCode', first.branchCode)?.name || 'N/A'}</strong>`;
                    refNum = first.invoiceNumber;
                    statusTag = first.isApproved === true || String(first.isApproved).toUpperCase() === 'TRUE' ? `<span class="status-tag status-approved">Approved</span>` : `<span class="status-tag status-pendingapproval">Pending Approval</span>`;
                    break;
                case 'return_out':
                    details = `Returned ${group.transactions.length} item(s) from <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.name || 'N/A'}</strong> to <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`;
                    typeDisplay = "SUPPLIER RETURN";
                    break;
                case 'issue':
                    details = `Issued ${group.transactions.length} item(s) from <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.name || 'N/A'}</strong> to <strong>${findByKey(state.sections, 'sectionCode', first.sectionCode)?.name || 'N/A'}</strong>`;
                    break;
                case 'transfer_out':
                case 'transfer_in':
                     details = `Transferred ${group.transactions.length} item(s) from <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.name || 'N/A'}</strong> to <strong>${findByKey(state.branches, 'branchCode', first.toBranchCode)?.name || 'N/A'}</strong>`;
                     typeDisplay = "TRANSFER";
                     statusTag = `<span class="status-tag status-${(first.Status || '').toLowerCase().replace(/ /g,'')}">${first.Status}</span>`;
                     break;
                case 'po':
                    typeDisplay = "PURCHASE ORDER";
                    details = `Created PO for <strong>${findByKey(state.suppliers, 'supplierCode', first.supplierCode)?.name || 'N/A'}</strong>`;
                    statusTag = `<span class="status-tag status-${(first.Status || 'pending').toLowerCase().replace(/ /g,'')}">${first.Status}</span>`;
                    break;
                case 'adjustment_in':
                case 'adjustment_out':
                     typeDisplay = "STOCK ADJUSTMENT";
                     details = `Adjusted ${group.transactions.length} item(s) at <strong>${findByKey(state.branches, 'branchCode', first.fromBranchCode)?.name || 'N/A'}</strong>`;
                     break;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(first.date).toLocaleString()}</td><td>${typeDisplay}</td><td>${refNum}</td><td>${details}</td><td>${statusTag}</td><td><div class="action-buttons">${actionsHtml}</div></td>`;
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
    const generateTransferDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { name: 'DELETED' }; const toBranch = findByKey(state.branches, 'branchCode', data.toBranchCode) || { name: 'DELETED' }; let itemsHtml = ''; data.items.forEach(item => { const fullItem = findByKey(state.items, 'code', item.itemCode) || { code: 'N/A', name: 'DELETED', unit: 'N/A' }; itemsHtml += `<tr><td>${fullItem.code || item.itemCode}</td><td>${item.itemName || fullItem.name}</td><td>${parseFloat(item.quantity).toFixed(2)}</td><td>${fullItem.unit}</td></tr>`; }); const content = `<div class="printable-document card"><h2>Internal Transfer Order</h2><p><strong>Order ID:</strong> ${data.batchId}</p><p><strong>Reference:</strong> ${data.ref}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>From:</strong> ${fromBranch.name} (${fromBranch.branchCode || ''})</p><p><strong>To:</strong> ${toBranch.name} (${toBranch.branchCode || ''})</p><hr><h3>Items Transferred</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Unit</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Sender:</strong> _________________</p><p><strong>Receiver:</strong> _________________</p></div>`; printContent(content); };
    const generateIssueDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { name: 'DELETED' }; const toSection = findByKey(state.sections, 'sectionCode', data.sectionCode) || { name: 'DELETED' }; let itemsHtml = ''; data.items.forEach(item => { const fullItem = findByKey(state.items, 'code', item.itemCode) || { name: 'DELETED', unit: 'N/A' }; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName || fullItem.name}</td><td>${item.quantity.toFixed(2)}</td><td>${fullItem.unit}</td></tr>`; }); const content = `<div class="printable-document card"><h2>Stock Issue Note</h2><p><strong>Issue Ref #:</strong> ${data.ref}</p><p><strong>Batch ID:</strong> ${data.batchId}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>From Branch:</strong> ${fromBranch.name} (${fromBranch.branchCode || ''})</p><p><strong>To Section:</strong> ${toSection.name} (${toSection.sectionCode || ''})</p><hr><h3>Items Issued</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Unit</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Issued By:</strong> _________________</p><p><strong>Received By:</strong> _________________</p></div>`; printContent(content); };
    const generatePaymentVoucher = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; let invoicesHtml = ''; data.payments.forEach(p => { invoicesHtml += `<tr><td>${p.invoiceNumber}</td><td>${p.amount.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card"><h2>Payment Voucher</h2><p><strong>Voucher ID:</strong> ${data.payments[0].paymentId}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>Paid To:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><p><strong>Amount:</strong> ${data.totalAmount.toFixed(2)} EGP</p><p><strong>Method:</strong> ${data.method}</p><hr><h3>Payment Allocation</h3><table><thead><tr><th>Invoice #</th><th>Amount Paid</th></tr></thead><tbody>${invoicesHtml}</tbody></table><br><p><strong>Signature:</strong> _________________</p></div>`; printContent(content); };
    const generatePODocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; let itemsHtml = '', totalValue = 0; data.items.forEach(item => { const itemDetails = findByKey(state.items, 'code', item.itemCode) || {name: "N/A"}; const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); totalValue += itemTotal; itemsHtml += `<tr><td>${item.itemCode}</td><td>${itemDetails.name}</td><td>${(parseFloat(item.quantity) || 0).toFixed(2)}</td><td>${(parseFloat(item.cost) || 0).toFixed(2)} EGP</td><td>${itemTotal.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card"><h2>Purchase Order</h2><p><strong>PO No:</strong> ${data.poId || data.batchId}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>Supplier:</strong> ${supplier.name} (${supplier.supplierCode || ''})</p><hr><h3>Items Ordered</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Cost/Unit</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">Total Value</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Authorized By:</strong> ${data.createdBy || state.currentUser.Name}</p></div>`; printContent(content); };
    const generateReturnDocument = (data) => { const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'DELETED' }; const branch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { name: 'DELETED' }; let itemsHtml = '', totalValue = 0; data.items.forEach(item => { const itemTotal = item.quantity * item.cost; totalValue += itemTotal; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.quantity.toFixed(2)}</td><td>${item.cost.toFixed(2)} EGP</td><td>${itemTotal.toFixed(2)} EGP</td></tr>`; }); const content = `<div class="printable-document card"><h2>Supplier Return Note</h2><p><strong>Credit Note Ref:</strong> ${data.ref}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><p><strong>Returned To:</strong> ${supplier.name}</p><p><strong>Returned From:</strong> ${branch.name}</p><hr><h3>Items Returned</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Cost/Unit</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">Total Value</td><td style="font-weight:bold;">${totalValue.toFixed(2)} EGP</td></tr></tfoot></table><hr><p><strong>Reason:</strong> ${data.notes || 'N/A'}</p></div>`; printContent(content); };
    const generateRequestIssueDocument = (data) => { const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { name: 'DELETED' }; const toSection = findByKey(state.sections, 'sectionCode', data.sectionCode) || { name: 'DELETED' }; let itemsHtml = ''; data.items.forEach(item => { const fullItem = findByKey(state.items, 'code', item.itemCode) || { name: 'DELETED', unit: 'N/A' }; itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName || fullItem.name}</td><td>${(item.quantity || 0).toFixed(2)}</td><td>${fullItem.unit}</td></tr>`; }); const content = `<div class="printable-document card"><h2>DRAFT Stock Issue Note (from Request)</h2><p><strong>Request ID:</strong> ${data.ref}</p><p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p><hr><p><strong>From Branch:</strong> ${fromBranch.name} (${fromBranch.branchCode || ''})</p><p><strong>To Section:</strong> ${toSection.name} (${toSection.sectionCode || ''})</p><hr><h3>Items to be Issued</h3><table><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Unit</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><strong>Notes:</strong> ${data.notes || 'N/A'}</p><br><p><strong>Issued By:</strong> _________________</p><p><strong>Received By:</strong> _________________</p></div>`; printContent(content); };

// PART 4 OF 4: CALCULATION ENGINES, EVENT LISTENERS & INITIALIZATION
    function updateReceiveGrandTotal() { let grandTotal = 0; (state.currentReceiveList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('receive-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
    function updateTransferGrandTotal() { let grandTotalQty = 0; (state.currentTransferList || []).forEach(item => { grandTotalQty += (parseFloat(item.quantity) || 0); }); document.getElementById('transfer-grand-total').textContent = grandTotalQty.toFixed(2); }
    function updateIssueGrandTotal() { let grandTotalQty = 0; (state.currentIssueList || []).forEach(item => { grandTotalQty += (parseFloat(item.quantity) || 0); }); document.getElementById('issue-grand-total').textContent = grandTotalQty.toFixed(2); }
    function updatePOGrandTotal() { let grandTotal = 0; (state.currentPOList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
    function updatePOEditGrandTotal() { let grandTotal = 0; (state.currentEditingPOList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('edit-po-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }
    function updateReturnGrandTotal() { let grandTotal = 0; (state.currentReturnList || []).forEach(item => { grandTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); }); document.getElementById('return-grand-total').textContent = `${grandTotal.toFixed(2)} EGP`; }

    async function loadAndRenderBackups() {
        const container = document.getElementById('backup-list-container');
        container.innerHTML = '<table><tbody><tr><td><div class="spinner" style="width:30px;height:30px;border-width:3px;"></div></td><td>Loading backups...</td></tr></tbody></table>';
        const result = await postData('listBackups', {}, null);
        if (result && result.data) {
            state.backups = result.data;
            if (state.backups.length === 0) {
                container.innerHTML = '<p>No backups found.</p>';
                return;
            }
            let tableHtml = `<table id="table-backups"><thead><tr><th>Backup Name</th><th>Date Created</th><th>Actions</th></tr></thead><tbody>`;
            state.backups.forEach(backup => {
                tableHtml += `
                    <tr>
                        <td>${backup.name}</td>
                        <td>${new Date(backup.dateCreated).toLocaleString()}</td>
                        <td>
                            <div class="action-buttons">
                                <a href="${backup.url}" target="_blank" rel="noopener noreferrer" class="secondary small" style="text-decoration: none;">Open</a>
                                <button class="danger small btn-restore" data-url="${backup.url}">Restore</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tableHtml += '</tbody></table>';
            container.innerHTML = tableHtml;
        } else {
            container.innerHTML = '<p>Could not load backup list. Please check permissions or try again.</p>';
        }
    }
    
    async function loadAutoBackupSettings() {
        const toggle = document.getElementById('auto-backup-toggle');
        const frequencyContainer = document.getElementById('auto-backup-frequency-container');
        const statusEl = document.getElementById('auto-backup-status');
        
        statusEl.textContent = 'Checking status...';
        const result = await postData('getAutomaticBackupStatus', {}, null);
        
        if (result && typeof result.data.enabled !== 'undefined') {
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
            showToast('Automatic backup settings updated!', 'success');
            statusEl.textContent = isEnabled
                ? `Automatic backups are now enabled (${frequency}).`
                : 'Automatic backups have been disabled.';
        } else {
            toggle.checked = !isEnabled;
            frequencyContainer.style.display = toggle.checked ? 'block' : 'none';
            statusEl.textContent = 'Failed to update settings. Please try again.';
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
    
        const coreSheets = [ 'Items', 'Suppliers', 'Branches', 'Sections', 'Transactions', 'Payments', 'PurchaseOrders', 'PurchaseOrderItems', 'ItemRequests', 'Users', 'Permissions' ];
        
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
            showToast('You must select at least one sheet to restore.', 'error');
            return;
        }
    
        const payload = {
            backupFileId: backupFileId,
            sheetsToRestore: selectedSheets
        };
    
        const result = await postData('restoreFromBackup', payload, btn);
    
        if (result) {
            showToast(result.data.message || 'Restore completed successfully!', 'success');
            closeModal();
            await reloadDataAndRefreshUI();
        }
    }

    async function handleTransactionSubmit(payload, buttonEl) {
        const action = payload.type === 'po' ? 'addPurchaseOrder' : 'addTransactionBatch';
        const result = await postData(action, payload, buttonEl);
        if (result) {
            let message = `${payload.type.replace(/_/g,' ').toUpperCase()} processed!`;
            if(payload.type === 'receive' || payload.type === 'po') message += " Submitted for approval.";
            if (payload.type === 'receive') { state.currentReceiveList = []; document.getElementById('form-receive-details').reset(); renderReceiveListTable(); }
            else if (payload.type === 'transfer_out') { generateTransferDocument(result.data); state.currentTransferList = []; document.getElementById('form-transfer-details').reset(); document.getElementById('transfer-ref').value = generateId('TRN'); renderTransferListTable(); }
            else if (payload.type === 'issue') { generateIssueDocument(result.data); state.currentIssueList = []; document.getElementById('form-issue-details').reset(); document.getElementById('issue-ref').value = generateId('ISN'); renderIssueListTable(); }
            else if (payload.type === 'po') { state.currentPOList = []; document.getElementById('form-po-details').reset(); document.getElementById('po-ref').value = generateId('PO'); renderPOListTable(); }
            else if (payload.type === 'return_out') { generateReturnDocument(result.data); state.currentReturnList = []; document.getElementById('form-return-details').reset(); renderReturnListTable(); }
            showToast(message, 'success');
            await reloadDataAndRefreshUI();
        }
    }

    function setupRoleBasedNav() {
        const user = state.currentUser; if (!user) return;
        const userFirstName = user.Name.split(' ')[0];
        document.querySelector('.sidebar-header h1').textContent = getText('hi_user', userFirstName);
        const navMap = { 'dashboard': 'viewDashboard', 'operations': 'viewOperations', 'purchasing': 'viewPurchasing', 'requests': 'viewRequests', 'payments': 'viewPayments', 'reports': 'viewReports', 'stock-levels': 'viewStockLevels', 'transaction-history': 'viewTransactionHistory', 'setup': 'viewSetup', 'master-data': 'viewMasterData', 'user-management': 'manageUsers', 'backup': 'opBackupRestore', 'activity-log': 'viewActivityLog' };
        for (const [view, permission] of Object.entries(navMap)) {
            const navItem = document.querySelector(`[data-view="${view}"]`);
            if (navItem) { 
                let hasPermission = userCan(permission);
                if (view === 'requests') { hasPermission = userCan('opRequestItems') || userCan('opApproveIssueRequest') || userCan('opApproveResupplyRequest'); }
                if (view === 'operations') { hasPermission = userCan('viewOperations') || userCan('opStockAdjustment') || userCan('opFinancialAdjustment'); }
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
        setupSearch('search-items', renderItemsTable, 'items', ['name', 'code', 'category']);
        setupSearch('search-suppliers', renderSuppliersTable, 'suppliers', ['name', 'supplierCode']);
        setupSearch('search-branches', renderBranchesTable, 'branches', ['name', 'branchCode']);
        setupSearch('search-sections', renderSectionsTable, 'sections', ['name', 'sectionCode']);
        setupSearch('stock-levels-search', renderItemCentricStockView, 'items', ['name', 'code']);
        document.getElementById('item-inquiry-search').addEventListener('input', e => renderItemInquiry(e.target.value.toLowerCase()));
        
        document.getElementById('btn-export-items').addEventListener('click', () => exportToExcel('table-items', 'ItemList.xlsx'));
        document.getElementById('btn-export-suppliers').addEventListener('click', () => exportToExcel('table-suppliers', 'SupplierList.xlsx'));
        document.getElementById('btn-export-branches').addEventListener('click', () => exportToExcel('table-branches', 'BranchList.xlsx'));
        document.getElementById('btn-export-sections').addEventListener('click', () => exportToExcel('table-sections', 'SectionList.xlsx'));
        document.getElementById('btn-export-stock').addEventListener('click', () => exportToExcel('table-stock-levels-by-item', 'StockLevels.xlsx'));
        document.getElementById('btn-export-supplier-statement').addEventListener('click', () => exportToExcel('table-supplier-statement-report', 'SupplierStatement.xlsx'));
        document.getElementById('btn-export-branch-consumption').addEventListener('click', () => exportToExcel('table-branch-consumption-results-report', 'BranchConsumption.xlsx'));
        document.getElementById('btn-export-section-consumption').addEventListener('click', () => exportToExcel('table-section-consumption-results-report', 'SectionConsumption.xlsx'));
        document.getElementById('btn-export-resupply-report').addEventListener('click', () => exportToExcel('table-resupply-report-results-report', 'ResupplyReport.xlsx'));
        
        updateUserBranchDisplay();
        updatePendingRequestsWidget();
        const firstVisibleView = document.querySelector('#main-nav .nav-item:not([style*="display: none"]) a')?.dataset.view || 'dashboard';
        showView(firstVisibleView);
        Logger.info('Application initialized successfully.');
    }
    
    function updateUserBranchDisplay() {
        const displayEl = document.getElementById('user-branch-display');
        if (!state.currentUser) { displayEl.textContent = ''; return; }
        const branch = findByKey(state.branches, 'branchCode', state.currentUser.AssignedBranchCode);
        const section = findByKey(state.sections, 'sectionCode', state.currentUser.AssignedSectionCode);
        let displayText = '';
        if (branch) displayText += getText('user_branch', branch.name);
        if (section) displayText += `${displayText ? ' / ' : ''}` + getText('user_section', section.name);
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
                <div class="form-group"><label>PO Number</label><input type="text" id="edit-po-id" value="${po.poId}" readonly></div>
                <div class="form-group"><label>Supplier</label><input type="text" value="${findByKey(state.suppliers, 'supplierCode', po.supplierCode)?.name}" readonly></div>
                <div class="form-group span-full"><label for="edit-po-notes">Notes</label><textarea id="edit-po-notes" rows="2">${po.notes || ''}</textarea></div>
            </div>
            <div class="card" style="margin-top: 20px;">
                <h2>Items to Order</h2>
                <table id="table-edit-po-list">
                    <thead><tr><th>Code</th><th>Item Name</th><th>Quantity</th><th>Cost/Unit</th><th>Total</th><th>Action</th></tr></thead>
                    <tbody></tbody>
                    <tfoot><tr style="font-weight: bold; background-color: var(--bg-color);"><td colspan="4" style="text-align: right;">Grand Total:</td><td id="edit-po-grand-total" colspan="2">0.00 EGP</td></tr></tfoot>
                </table>
                <div style="margin-top: 20px;"><button type="button" data-context="edit-po" class="secondary">Add More Items</button></div>
            </div>
        `;
        
        const modal = document.getElementById('edit-po-modal');
        modal.querySelector('.modal-footer').innerHTML = `
            <button class="secondary modal-cancel">Cancel</button>
            <button id="btn-print-draft-po" class="secondary">Print Draft</button>
            <button id="btn-save-po-changes" class="primary" data-po-id="${po.poId}">Save Changes</button>
        `;
        
        document.getElementById('btn-print-draft-po').onclick = () => {
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
                <div class="form-group"><label>Supplier</label><input type="text" value="${supplier?.name || 'N/A'}" readonly></div>
                <div class="form-group"><label>Branch</label><input type="text" value="${branch?.name || 'N/A'}" readonly></div>
                <div class="form-group"><label for="edit-invoice-number">Invoice Number</label><input type="text" id="edit-invoice-number" value="${firstTx.invoiceNumber || ''}" required></div>
                <div class="form-group span-full"><label for="edit-invoice-notes">Notes</label><textarea id="edit-invoice-notes" rows="2">${firstTx.notes || ''}</textarea></div>
            </div>
            <div class="card" style="margin-top: 20px;">
                <h2>Items Received</h2>
                <table id="table-edit-po-list">
                    <thead><tr><th>Code</th><th>Item Name</th><th>Quantity</th><th>Cost/Unit</th><th>Total</th><th>Action</th></tr></thead>
                    <tbody></tbody>
                    <tfoot><tr style="font-weight: bold; background-color: var(--bg-color);"><td colspan="4" style="text-align: right;">Grand Total:</td><td id="edit-po-grand-total" colspan="2">0.00 EGP</td></tr></tfoot>
                </table>
                <div style="margin-top: 20px;"><button type="button" data-context="edit-po" class="secondary">Add/Edit Items</button></div>
            </div>
        `;

        const modal = document.getElementById('edit-po-modal');
        document.getElementById('edit-po-modal-title').textContent = 'Edit Invoice / GRN';
        modal.querySelector('.modal-footer').innerHTML = `
            <button type="button" class="secondary modal-cancel">Cancel</button>
            <button id="btn-save-invoice-changes" class="primary" data-batch-id="${batchId}">Save Changes</button>
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

    function openApproveRequestModal(requestId) {
        const requestGroup = state.itemRequests.filter(r => r.RequestID === requestId);
        if (requestGroup.length === 0) return;
        const first = requestGroup[0];
        const stock = calculateStockLevels();
        const branchStock = stock[first.ToBranch] || {};
        
        document.getElementById('approve-request-modal-title').textContent = `Approve Request: ${requestId}`;
        const modalBody = document.getElementById('approve-request-modal-body');

        let itemsHtml = '';
        requestGroup.forEach(req => {
            const item = findByKey(state.items, 'code', req.ItemCode);
            const availableQty = branchStock[req.ItemCode]?.quantity || 0;
            itemsHtml += `
                <tr>
                    <td>${req.ItemCode}</td>
                    <td>${item?.name || 'N/A'}</td>
                    <td>${req.Quantity}</td>
                    <td>${availableQty.toFixed(2)}</td>
                    <td><input type="number" class="table-input" data-item-code="${req.ItemCode}" value="${req.Quantity}" min="0" max="${availableQty}" step="0.01"></td>
                </tr>
            `;
        });

        modalBody.innerHTML = `
            <p><strong>From Section:</strong> ${findByKey(state.sections, 'sectionCode', first.FromSection)?.name}</p>
            <p><strong>To Branch:</strong> ${findByKey(state.branches, 'branchCode', first.ToBranch)?.name}</p>
            <p><strong>Notes:</strong> ${first.Notes || 'N/A'}</p>
            <hr>
            <table id="table-approve-request-items">
                <thead><tr><th>Code</th><th>Item</th><th>Qty Req.</th><th>Available</th><th>Qty to Issue</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <div class="form-group" style="margin-top: 20px;">
                <label for="approve-status-notes">Notes (Optional)</label>
                <textarea id="approve-status-notes" rows="2" placeholder="e.g., Partial issue due to stock availability."></textarea>
            </div>
        `;
        
        const modal = document.getElementById('approve-request-modal');
        const confirmBtn = modal.querySelector('#btn-confirm-request-approval');
        confirmBtn.dataset.requestId = requestId;
        
        modal.querySelector('.modal-footer').innerHTML = `
            <button class="secondary modal-cancel">Cancel</button>
            <button id="btn-print-draft-issue-note" class="secondary">Print Draft</button>
            <button id="btn-confirm-request-approval" class="primary" data-request-id="${requestId}">Confirm and Issue</button>
        `;

        document.getElementById('btn-print-draft-issue-note').onclick = () => {
            const itemsToPrint = [];
            document.querySelectorAll('#table-approve-request-items tbody tr').forEach(tr => {
                const input = tr.querySelector('input');
                const itemCode = input.dataset.itemCode;
                const quantity = parseFloat(input.value) || 0;
                if (quantity > 0) {
                    itemsToPrint.push({
                        itemCode: itemCode,
                        itemName: findByKey(state.items, 'code', itemCode)?.name,
                        quantity: quantity
                    });
                }
            });
            const dataToPrint = {
                ref: requestId,
                date: new Date(),
                fromBranchCode: first.ToBranch,
                sectionCode: first.FromSection,
                notes: document.getElementById('approve-status-notes').value,
                items: itemsToPrint
            };
            generateRequestIssueDocument(dataToPrint);
        };
        
        approveRequestModal.classList.add('active');
    }
    
    async function confirmRequestApproval(e) {
        const btn = e.currentTarget;
        const requestId = btn.dataset.requestId;
        if (!requestId) {
            showToast('Error: Request ID is missing.', 'error');
            return;
        }
        const statusNotes = document.getElementById('approve-status-notes').value;
        const editedItems = [];
        document.querySelectorAll('#table-approve-request-items tbody tr').forEach(tr => {
            const input = tr.querySelector('input');
            editedItems.push({
                itemCode: input.dataset.itemCode,
                issuedQuantity: parseFloat(input.value) || 0
            });
        });
        
        const payload = { requestId, statusNotes, editedItems };
        const result = await postData('approveItemRequest', payload, btn);
        if (result) {
            showToast('Request approved and processed!', 'success');
            closeModal();
            reloadDataAndRefreshUI();
        }
    }

    function init() {
        // Language switcher logic
        const langSwitcher = document.createElement('div');
        langSwitcher.className = 'lang-switcher';
        langSwitcher.innerHTML = `
            <button data-lang="en" class="active">EN</button>
            <button data-lang="ar">AR</button>
        `;
        document.querySelector('.main-header').appendChild(langSwitcher);
        langSwitcher.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                switchLanguage(e.target.dataset.lang);
            }
        });

        // Set initial language from localStorage or default
        const savedLang = localStorage.getItem('stockAppLang') || 'en';
        switchLanguage(savedLang);

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
