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
        reports_select_branches: "Select Branches...",
        reports_select_sections: "Select Sections...",
        reports_select_items: "Select Items...",
        reports_all_branches: "All Branches",
        reports_all_sections: "All Sections",
        reports_all_items: "All Items",
        reports_num_selected: "{0} Selected",
        modal_select_all: "Select All",
        modal_search_placeholder: "Search...",
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
        reports_select_branches: "اختر الفروع...",
        reports_select_sections: "اختر الأقسام...",
        reports_select_items: "اختر الأصناف...",
        reports_all_branches: "كل الفروع",
        reports_all_sections: "كل الأقسام",
        reports_all_items: "كل الأصناف",
        reports_num_selected: "تم تحديد {0}",
        modal_select_all: "تحديد الكل",
        modal_search_placeholder: "ابحث...",
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
        backups: [],
        reportSelections: {
            branchConsumption: { branches: new Set(), items: new Set(), categories: new Set() },
            sectionConsumption: { sections: new Set(), items: new Set(), categories: new Set() }
        },
        multiSelectContext: null,
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
    const multiSelectModal = document.getElementById('multi-select-modal');
    
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
        document.getElementById('multi-select-search').value = '';
        modalContext = null;
        state.multiSelectContext = null;
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
```
--- START OF FILE style.css ---
```css
/* --- MODERN UI REDESIGN V3 --- */

:root {
    --primary-color: #4A90E2;
    --primary-dark: #357ABD;
    --primary-light: #EAF2FC;
    --secondary-color: #50E3C2;
    --danger-color: #E94B3C;
    --warning-color: #F5A623;
    --info-color: #7f8c8d;
    --bg-color: #F7F8FC;
    --sidebar-bg: #FFFFFF;
    --card-bg-color: #FFFFFF;
    --text-color: #24292E;
    --text-light-color: #586069;
    --text-on-primary: #FFFFFF;
    --border-color: #E1E4E8;
    --border-radius: 12px;
    --shadow-sm: 0 1px 2px rgba(27, 31, 35, 0.07);
    --shadow-md: 0 4px 12px rgba(27, 31, 35, 0.08);
    --shadow-lg: 0 10px 30px rgba(27, 31, 35, 0.1);
    --shadow-focus-ring: 0 0 0 3px rgba(74, 144, 226, 0.25);
    --sidebar-width: 250px;
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');


*, *::before, *::after { box-sizing: border-box; }

body {
    margin: 0;
    font-family: var(--font-family);
    background-color: var(--bg-color);
    color: var(--text-color);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

body.lang-ar {
    font-family: 'Cairo', sans-serif;
}

.app-container { display: flex; }

/* --- Language Switcher --- */
.lang-switcher {
    display: flex;
    gap: 4px;
    background-color: var(--primary-light);
    border-radius: 8px;
    padding: 4px;
    margin-left: 16px;
}
.lang-switcher button {
    background: transparent;
    border: none;
    padding: 4px 10px;
    font-weight: 600;
    font-size: 13px;
    color: var(--primary-dark);
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
}
.lang-switcher button.active {
    background-color: var(--primary-color);
    color: white;
    box-shadow: var(--shadow-sm);
}

/* --- Login Screen --- */
#login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: var(--bg-color); }
.login-box { background-color: var(--card-bg-color); padding: 40px; border-radius: var(--border-radius); box-shadow: var(--shadow-lg); width: 100%; max-width: 400px; text-align: center; }
.login-header { display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 24px; }
.login-header .logo-icon { width: 32px; height: 32px; color: var(--primary-color); }
.login-header h1 { font-size: 24px; margin: 0; }
.login-box p { color: var(--text-light-color); margin-bottom: 24px; }
.login-box .form-group { text-align: left; margin-bottom: 16px; }
#login-code { font-size: 16px; }
.login-error { margin-top: 15px; color: var(--danger-color); font-weight: 500; min-height: 20px; }
#login-loader { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 15px; margin-top: 15px; }
#login-loader .spinner { width: 30px; height: 30px; border-width: 3px; }

/* --- Sidebar --- */
.sidebar { width: var(--sidebar-width); height: 100vh; position: fixed; top: 0; left: 0; background-color: var(--sidebar-bg); border-right: 1px solid var(--border-color); padding: 24px 0; display: flex; flex-direction: column; transition: width 0.3s ease; z-index: 200; }
.sidebar-header { padding: 0 24px; margin-bottom: 24px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
.sidebar-header .logo-container { display: flex; align-items: center; gap: 12px;}
.sidebar-header .logo-icon { width: 32px; height: 32px; color: var(--primary-color); }
.sidebar-header h1 { font-size: 22px; color: var(--text-color); margin: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#global-refresh-button { width: calc(100% - 48px); margin: 0 24px; }
.sidebar-nav { list-style: none; padding: 0 16px; margin: 24px 0 0 0; flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; }
.nav-item a { display: flex; align-items: center; gap: 16px; padding: 12px 16px; color: var(--text-light-color); text-decoration: none; font-weight: 500; font-size: 15px; border-radius: var(--border-radius); transition: all 0.2s ease-in-out; margin-bottom: 4px; }
.nav-item a:hover { background-color: var(--bg-color); color: var(--primary-dark); }
.nav-item a.active { background-color: var(--primary-light); color: var(--primary-dark); font-weight: 600; }
.nav-item a .icon { width: 22px; height: 22px; }
.nav-item-logout { margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-color); }
.nav-item-logout a:hover { background-color: #FDEDE9; color: var(--danger-color); }

/* --- Main Content Area --- */
.main-content { flex-grow: 1; margin-left: var(--sidebar-width); padding: 32px; height: 100vh; overflow-y: auto; }
.main-header { display: flex; justify-content: flex-start; align-items: center; margin-bottom: 24px; gap: 16px;}
#view-title { font-size: 32px; font-weight: 700; margin: 0; flex-shrink: 0; }
.pending-requests-widget { display: flex; align-items: center; gap: 8px; background-color: var(--warning-color); color: white; padding: 6px 12px; border-radius: var(--border-radius); font-weight: 600; font-size: 14px; margin-left: 24px; cursor: pointer; }
.pending-requests-widget .icon { width: 20px; height: 20px; }
.user-branch-display { margin-left: auto; background-color: var(--primary-light); color: var(--primary-dark); font-size: 14px; font-weight: 600; padding: 6px 12px; border-radius: 8px; flex-shrink: 0; }

/* --- Sub-Navigation for Tabs --- */
.sub-nav { display: flex; gap: 8px; border-bottom: 2px solid var(--border-color); margin-bottom: 24px; flex-wrap: wrap;}
.sub-nav-item { background: transparent; border: none; padding: 12px 20px; font-weight: 600; font-size: 16px; color: var(--text-light-color); cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s ease; margin-bottom: -2px; }
.sub-nav-item:hover { color: var(--text-color); }
.sub-nav-item.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
.sub-view { display: none; }
.sub-view.active { display: block; animation: fadeIn 0.4s; }

/* --- Card & Container Styles --- */
.card { background-color: var(--card-bg-color); padding: 24px; border-radius: var(--border-radius); border: none; margin-bottom: 24px; box-shadow: var(--shadow-md); }
.card h2 { font-size: 20px; font-weight: 600; margin: 0 0 24px 0; padding-bottom: 16px; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; }
.form-grid .span-full { grid-column: 1 / -1; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 20px; flex-wrap: wrap; }
.toolbar .search-bar { flex-grow: 1; max-width: 400px; margin-bottom: 0; }
.toolbar .filters-container { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-left: auto; }
.toolbar h2 { margin: 0; padding: 0; border: none; font-size: 20px; font-weight: 600;}

/* --- Report Controls --- */
.report-generator-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.report-generator-controls .filter-button { padding: 10px 16px; font-size: 14px; background-color: #fff; border: 1px solid var(--border-color); color: var(--text-light-color); border-radius: var(--border-radius); }
.report-generator-controls .filter-button:hover { border-color: var(--primary-color); color: var(--primary-dark); }
.report-generator-controls input { min-width: 120px; } 
.report-generator-controls button { flex-shrink: 0; }

/* --- Form Elements --- */
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 500; font-size: 14px; margin-bottom: 8px; color: var(--text-light-color); }
.form-group label small { font-weight: 400; color: #95a5a6; }
input, select, button, textarea { font-family: inherit; font-size: 16px; }
input, select, textarea, .search-bar-input { width: 100%; padding: 12px 16px; background-color: var(--bg-color); border: 1px solid var(--border-color); border-radius: var(--border-radius); transition: border-color 0.2s, box-shadow 0.2s; }
textarea { resize: vertical; }
input:focus, select:focus, textarea:focus, .search-bar-input:focus { outline: none; border-color: var(--primary-color); background-color: var(--card-bg-color); box-shadow: var(--shadow-focus-ring); }
input[readonly], select[disabled] { background-color: #E9ECEF; color: var(--text-light-color); cursor: not-allowed; }
.search-bar { position: relative; }
.search-bar input { background-color: var(--card-bg-color); padding-left: 16px; }

/* --- Radio & Checkbox Groups --- */
.radio-group { display: flex; gap: 20px; align-items: center; }
.radio-group input[type="radio"] { width: auto; }
.radio-group label { margin-bottom: 0; font-weight: normal; }
.form-group-checkbox { display: flex; align-items: center; gap: 10px; }
.form-group-checkbox input[type="checkbox"] { width: 20px; height: 20px; flex-shrink: 0; }
.form-group-checkbox label { margin: 0; font-weight: 500; font-size: 14px; }

/* --- Buttons --- */
button { padding: 12px 24px; border-radius: var(--border-radius); border: 1px solid transparent; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; line-height: 1; }
button.primary { background-color: var(--primary-color); color: var(--text-on-primary); border-color: var(--primary-color); }
button.primary:hover { background-color: var(--primary-dark); border-color: var(--primary-dark); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
button.primary.small { padding: 8px 12px; font-size: 14px; font-weight: 500; }
button.secondary { background-color: transparent; color: var(--primary-color); border-color: var(--primary-color); }
button.secondary:hover { background-color: var(--primary-light); }
button.secondary.small, button.small.btn-edit { padding: 8px 12px; font-size: 14px; font-weight: 500; border-radius: 8px; border-color: var(--border-color); color: var(--text-light-color); }
button.secondary.small:hover, button.small.btn-edit:hover { border-color: var(--primary-color); background-color: var(--primary-light); color: var(--primary-dark); }
button.danger { background-color: var(--danger-color); color: white; }
button.danger.small { padding: 6px 12px; font-size: 14px; border-radius: 8px; }
button:disabled { background-color: #D1D5DB; border-color: #D1D5DB; color: #6B7280; cursor: not-allowed; transform: none; box-shadow: none; }
.button-spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
.action-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-refresh { padding: 6px 10px !important; font-size: 16px !important; line-height: 1; font-weight: bold; margin-left: auto; flex-shrink: 0; }

/* --- Tables --- */
table { width: 100%; border-collapse: collapse; margin-top: 20px; }
th, td { padding: 16px; text-align: left; vertical-align: middle; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
th { font-size: 13px; font-weight: 600; color: var(--text-light-color); background-color: var(--bg-color); text-transform: uppercase; letter-spacing: 0.5px; }
td { font-size: 14px; }
td button.btn-edit { width: 100%; text-align: center; justify-content: center;}
tbody tr { transition: background-color 0.15s ease-in-out; }
tbody tr:hover { background-color: #f7faff; }

/* --- Views & Animations --- */
.view { display: none; }
.view.active { display: block; animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

/* --- Toasts & Loaders --- */
#toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 1001; display: flex; flex-direction: column; gap: 10px; }
.toast { padding: 16px 24px; border-radius: var(--border-radius); color: white; font-weight: 500; box-shadow: var(--shadow-lg); transform: translateX(calc(100% + 20px)); animation: slideIn 0.5s forwards; }
@keyframes slideIn { to { transform: translateX(0); } }
.toast.success { background: linear-gradient(45deg, var(--secondary-color), #2dbd9d); }
.toast.error { background: linear-gradient(45deg, var(--danger-color), #d93a2b); }
.toast.info { background: linear-gradient(45deg, var(--info-color), #5d6d7e); }
.spinner { width: 50px; height: 50px; border: 5px solid var(--primary-light); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* --- Modals --- */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(36, 41, 46, 0.6); display: none; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
.modal-overlay.active { display: flex; }
.modal-content, #form-edit-record.modal-content { background-color: white; padding: 0; border-radius: 16px; width: 90%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); overflow: hidden; transform: scale(0.95); animation: modal-pop-in 0.3s ease-out forwards; }
@keyframes modal-pop-in { to { transform: scale(1); } }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding: 20px 24px; flex-shrink: 0; }
.modal-header h2 { margin: 0; border: none; padding: 0; font-size: 18px; font-weight: 600; }
.close-button { background: transparent; border: none; font-size: 28px; cursor: pointer; padding: 0; line-height: 1; color: var(--text-light-color); transition: color 0.2s; }
.close-button:hover { color: var(--text-color); }
.modal-body { flex-grow: 1; overflow-y: auto; padding: 24px; min-height: 0; }
#modal-search-items { margin-bottom: 16px; }
.modal-item-list { display: flex; flex-direction: column; }
.modal-item { display: flex; align-items: center; padding: 12px; border-radius: var(--border-radius); cursor: pointer; transition: background-color 0.2s; }
.modal-item:hover { background-color: var(--bg-color); }
.modal-item input[type="checkbox"] { width: 20px; height: 20px; margin-right: 16px; accent-color: var(--primary-color); }
.modal-item label { flex-grow: 1; margin: 0; display: block; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px 24px; border-top: 1px solid var(--border-color); background-color: #F7F8FC; flex-shrink: 0; }

/* --- Multi-Select Modal Specific Styles --- */
#multi-select-modal .modal-content { max-width: 500px; }
.multi-select-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; padding: 0 4px; }
.multi-select-header .search-bar { flex-grow: 1; }
.multi-select-list { display: flex; flex-direction: column; gap: 4px; max-height: 400px; overflow-y: auto; padding: 4px; margin: 0 -4px; }
.multi-select-list .modal-item { padding: 10px 12px; }
.multi-select-list .modal-item strong { font-weight: 500; }
#multi-select-select-all-container { padding: 12px; border-bottom: 1px solid var(--border-color); margin: 0 -24px 16px -24px; }

/* --- Component-Specific Styles --- */
#table-receive-list input, #table-transfer-list input, #table-issue-list input, #table-po-list input, #table-return-list input, #table-request-list input, #table-edit-po-list input, #table-adjustment-list input { padding: 8px; font-size: 14px; max-width: 120px; background-color: white; }
.kpi-card { background-color: var(--card-bg-color); padding: 20px; border-radius: var(--border-radius); box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); text-align: center; }
.kpi-label { font-size: 14px; color: var(--text-light-color); margin-bottom: 8px; font-weight: 500; }
.kpi-value { font-size: 28px; font-weight: 700; color: var(--text-color); }
.status-tag { padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.status-paid, .status-completed, .status-approved { background-color: #E6F8F3; color: #008761; }
.status-unpaid, .status-rejected, .status-cancelled { background-color: #FDEDE9; color: var(--danger-color); }
.status-partial { background-color: #FFF6E0; color: #E89500; }
.status-pending, .status-intransit, .status-pendingapproval { background-color: #eaf2fc; color: var(--primary-dark); }
.report-area { overflow-x: auto; }
#item-centric-stock-container table, .printable-area table { table-layout: auto; }
#item-centric-stock-container td, .printable-area td, #history-modal-body td { white-space: normal; }
#table-activity-log td:nth-child(4) { white-space: normal; word-break: break-word; }
.permission-category { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color); color: var(--primary-dark); }
.permissions-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
#view-transfer-modal-body p { margin: 4px 0; font-size: 16px; }
#view-transfer-modal-body p strong { color: var(--text-light-color); display: inline-block; width: 120px; }

/* --- Toggle Switch Styles --- */
.form-group-toggle { display: flex; align-items: center; justify-content: space-between; max-width: 400px; }
.form-group-toggle label { margin-bottom: 0; font-weight: 600; }
.switch { position: relative; display: inline-block; width: 60px; height: 34px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; }
.slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; }
input:checked + .slider { background-color: var(--primary-color); }
input:focus + .slider { box-shadow: 0 0 1px var(--primary-color); }
input:checked + .slider:before { transform: translateX(26px); }
.slider.round { border-radius: 34px; }
.slider.round:before { border-radius: 50%; }

/* --- RTL (ARABIC) STYLES --- */
body.lang-ar {
    direction: rtl;
}
body.lang-ar .login-box .form-group {
    text-align: right;
}
body.lang-ar .sidebar {
    left: auto;
    right: 0;
    border-right: none;
    border-left: 1px solid var(--border-color);
}
body.lang-ar .main-content {
    margin-left: 0;
    margin-right: var(--sidebar-width);
}
body.lang-ar .sidebar-header {
    align-items: flex-start;
}
body.lang-ar .nav-item a {
    flex-direction: row-reverse;
}
body.lang-ar .nav-item a .icon {
    margin-left: 0;
    margin-right: 0;
}
body.lang-ar #btn-logout .icon {
    transform: scaleX(-1);
}
body.lang-ar .main-header {
    justify-content: flex-start;
    flex-direction: row-reverse;
}
body.lang-ar .user-branch-display {
    margin-left: 0;
    margin-right: auto;
}
body.lang-ar .pending-requests-widget {
    margin-left: 0;
    margin-right: 24px;
}
body.lang-ar .lang-switcher {
    margin-left: 0;
    margin-right: 16px;
}
body.lang-ar th, body.lang-ar td {
    text-align: right;
}
body.lang-ar .form-group label {
    text-align: right;
}
body.lang-ar .search-bar input {
    padding-left: 16px;
    padding-right: 16px; 
}
body.lang-ar .toolbar .filters-container {
    margin-left: 0;
    margin-right: auto;
}
body.lang-ar .modal-footer {
    justify-content: flex-start;
    flex-direction: row-reverse;
}
body.lang-ar .modal-header {
    flex-direction: row-reverse;
}
body.lang-ar .modal-item {
    flex-direction: row-reverse;
}
body.lang-ar .modal-item input[type="checkbox"] {
    margin-right: 0;
    margin-left: 16px;
}
body.lang-ar #toast-container {
    right: auto;
    left: 20px;
    align-items: flex-end;
}
body.lang-ar .toast {
    transform: translateX(calc(-100% - 20px));
}
body.lang-ar @keyframes slideIn { to { transform: translateX(0); } }
body.lang-ar .form-group-checkbox {
    flex-direction: row-reverse;
    justify-content: flex-end;
}
body.lang-ar button {
    flex-direction: row-reverse;
}
body.lang-ar tfoot td[style*="text-align:right"] {
    text-align: left !important;
}
body.lang-ar .multi-select-header {
    flex-direction: row-reverse;
}


/* --- Print & Responsive --- */
@media print { body { background-color: #fff !important; } .app-container, .no-print { display: none !important; } #print-area { display: block !important; } .printable-document { display: block !important; box-shadow: none; border: none; padding:0; } .printable-document h2, .printable-document p { margin: 0 0 10px 0; } #print-area table { table-layout: auto; } #print-area th, #print-area td { white-space: normal !important; word-break: break-word !important; overflow: visible !important; text-overflow: clip !important; font-size: 10pt; padding: 8px; } }
@media (max-width: 1200px) { .report-generator-controls { flex-direction: column; align-items: stretch; } }
@media (max-width: 768px) { :root { --sidebar-width: 0px; } .sidebar { width: 100%; height: auto; bottom: 0; top: auto; flex-direction: row; justify-content: space-around; padding: 5px; background-color: var(--sidebar-bg); border-top: 1px solid var(--border-color); box-shadow: 0 -2px 10px rgba(0,0,0,0.05); } .sidebar-header { display: none; } .sidebar-nav { display: flex; width: 100%; padding: 0; overflow-x: auto; flex-direction: row; } .nav-item { flex-shrink: 0; text-align: center; } .nav-item a { flex-direction: column; gap: 4px; padding: 8px 5px; font-size: 11px; font-weight: 500; border-radius: 8px; } .nav-item a .icon { width: 24px; height: 24px; } .nav-item a.active { color: var(--primary-color); background-color: var(--primary-light); } .nav-item-logout { margin-top: 0; padding-top: 0; border-top: none; } .main-content { margin-left: 0; margin-right: 0; padding: 20px 20px 100px 20px; } #view-title { font-size: 24px; } .modal-content { max-width: 95vw; } .main-header { flex-wrap: wrap; } .pending-requests-widget { order: 3; width: 100%; margin-left: 0; margin-right: 0; margin-top: 10px; justify-content: center;} }
```
--- START OF FILE index.html ---
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-lang="app_title">Packing Stock Control</title>
    <link rel="icon" href="favicon.ico" type="image/x-icon">
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
</head>
<body>
    <div id="login-container">
        <div class="login-box">
            <div class="login-header"><svg class="logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 7L16 3L12 7L8 3L4 7L12 15L20 7Z M4 9L12 17L20 9V17H4V9Z"/></svg><h1 data-lang="login_title">Packing Stock</h1></div>
            <form id="login-form"><p data-lang="login_prompt">Please enter your credentials to continue.</p><div class="form-group"><label for="login-username" data-lang="login_username_label">Username</label><input type="text" id="login-username" required autocomplete="username"></div><div class="form-group"><label for="login-code" data-lang="login_password_label">Password / Login Code</label><input type="password" id="login-code" required autocomplete="current-password"></div><button type="submit" class="primary" style="width:100%; margin-top:10px;" data-lang="login_button">Login</button></form>
            <div id="login-error" class="login-error"></div>
            <div id="login-loader" style="display: none;"><div class="spinner"></div><p data-lang="login_signing_in">Signing in...</p></div>
        </div>
    </div>

    <div id="app-container" class="app-container" style="display: none;">
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo-container">
                    <svg class="logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 7L16 3L12 7L8 3L4 7L12 15L20 7Z M4 9L12 17L20 9V17H4V9Z"/></svg><h1>Hi, User</h1>
                </div>
                <button id="global-refresh-button" class="secondary small">
                    <svg class="icon" style="width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" /></svg>
                    <span data-lang="refresh_all_data">Refresh All Data</span>
                </button>
            </div>
            <ul class="sidebar-nav" id="main-nav">
                <li class="nav-item"><a href="#" data-view="dashboard" class="active"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3V9H21V3M13 21H21V11H13M3 21H11V15H3M3 13H11V3H3V13Z"></path></svg><span data-lang="nav_dashboard">Dashboard</span></a></li>
                <li class="nav-item"><a href="#" data-view="operations"><svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M3,4H21V6H3V4M3,11H15V13H3V11M3,18H18V20H3V18Z" /></svg><span data-lang="nav_operations">Stock Operations</span></a></li>
                <li class="nav-item"><a href="#" data-view="purchasing"><svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M17,18C15.89,18 15,18.89 15,20A2,2 0 0,0 17,22A2,2 0 0,0 19,20C19,18.89 18.1,18 17,18M1,2V4H3L6.6,11.59L5.24,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42A0.25,0.25 0 0,1 7.17,14.75L8.1,13H15.55C16.3,13 16.96,12.58 17.3,11.97L20.88,5.5C20.95,5.34 21,5.17 21,5A1,1 0 0,0 20,4H5.21L4.27,2H1M7,18C5.89,18 5,18.89 5,20A2,2 0 0,0 7,22A2,2 0 0,0 9,20C9,18.89 8.1,18 7,18Z" /></svg><span data-lang="nav_purchasing">Purchasing</span></a></li>
                <li class="nav-item"><a href="#" data-view="requests"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 14H20V17H23V19H20V22H18V19H15V17H18V14M16.8 12.04C16.4 12.04 16 11.64 16 11.14V6.82L10.96 12H5V6H3V12A2 2 0 0 0 5 14H11.59L17.41 8.17V11.14C17.41 11.64 17.21 12.04 16.8 12.04Z" /></svg><span data-lang="nav_requests">Requests</span></a></li>
                <li class="nav-item"><a href="#" data-view="payments"><svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" /></svg><span data-lang="nav_payments">Payments</span></a></li>
                <li class="nav-item"><a href="#" data-view="reports"><svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M3,22V8H7V22H3M10,22V2H14V22H10M17,22V14H21V22H17Z" /></svg><span data-lang="nav_reports">Reports</span></a></li>
                <li class="nav-item"><a href="#" data-view="stock-levels"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7,5H21V7H7V5M7,11H21V13H7V11M7,17H21V19H7V17M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z"></path></svg><span data-lang="nav_stock_levels">Stock Levels</span></a></li>
                <li class="nav-item"><a href="#" data-view="transaction-history"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z"></path></svg><span data-lang="nav_transaction_history">Transaction History</span></a></li>
                <li class="nav-item"><a href="#" data-view="setup"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19,3H5C3.89,3 3,3.89 3,5V19C3,20.11 3.9,21 5,21H19C20.11,21 21,20.11 21,19V5C21,3.89 20.1,3 19,3M13.5,13H11V15H9V13H6.5V11H9V9H11V11H13.5V13M12,12Z"/></svg><span data-lang="nav_setup">Add Data</span></a></li>
                <li class="nav-item"><a href="#" data-view="master-data"><svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M16 20H20V16H16M16 14H20V10H16M14 20H10V16H14M14 14H10V10H14M8 20H4V16H8M8 14H4V10H8M22 8V4H2V8H22M20 6H16V6.03H4V6H4V6H20M2 22V10H0V22A2 2 0 0 0 2 24H22V22Z" /></svg><span data-lang="nav_master_data">Master Data</span></a></li>
                <li class="nav-item"><a href="#" data-view="user-management"><svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12,1L9,4H15L12,1M19,6H5A2,2 0 0,0 3,8V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V8A2,2 0 0,0 19,6M12,17A3,3 0 0,1 9,14A3,3 0 0,1 12,11A3,3 0 0,1 15,14A3,3 0 0,1 12,17M12,6A1.5,1.5 0 0,1 13.5,7.5A1.5,1.5 0 0,1 12,9A1.5,1.5 0 0,1 10.5,7.5A1.5,1.5 0 0,1 12,6Z" /></svg><span data-lang="nav_user_management">User Management</span></a></li>
                <li class="nav-item"><a href="#" data-view="backup"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12,3C7.58,3 4,4.79 4,7V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V7C20,4.79 16.42,3 12,3M12,5C15.31,5 18,6.34 18,8C18,9.66 15.31,11 12,11C8.69,11 6,9.66 6,8C6,6.34 8.69,5 12,5M18,13C18,14.66 15.31,16 12,16C8.69,16 6,14.66 6,13V12.42C7.75,13.42 9.79,14 12,14C14.21,14 16.25,13.42 18,12.42V13M18,17C18,18.66 15.31,20 12,20C8.69,20 6,18.66 6,17V16.42C7.75,17.42 9.79,18 12,18C14.21,18 16.25,17.42 18,16.42V17Z"></path></svg><span data-lang="nav_backup">Backup</span></a></li>
                <li class="nav-item"><a href="#" data-view="activity-log"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15,12A1,1 0 0,1 14,11A1,1 0 0,1 15,10A1,1 0 0,1 16,11A1,1 0 0,1 15,12M10,12A1,1 0 0,1 9,11A1,1 0 0,1 10,10A1,1 0 0,1 11,11A1,1 0 0,1 10,12M5,12A1,1 0 0,1 4,11A1,1 0 0,1 5,10A1,1 0 0,1 6,11A1,1 0 0,1 5,12M21,2V6H3V2H21M3,8H21V20H3V8M5,10V20H19V10H5Z"></path></svg><span data-lang="nav_activity_log">Activity Log</span></a></li>
                <li class="nav-item nav-item-logout"><a href="#" id="btn-logout"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"></path></svg><span data-lang="nav_logout">Logout</span></a></li>
            </ul>
        </aside>

        <main class="main-content">
           <header class="main-header">
                <h2 id="view-title">Dashboard</h2>
                <div id="pending-requests-widget" class="pending-requests-widget" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon"><path d="M22 6.98V16C22 17.1 21.1 18 20 18H6L2 22V4C2 2.9 2.9 2 4 2H18C18.3 2 18.6 2.1 18.8 2.2L21.8 5.2C21.9 5.4 22 5.6 22 5.98V6.98M20 6H18V4H4V16L5.2 15H20V6Z" /></svg>
                    <span data-lang="pending_requests">Pending Requests</span>: <span id="pending-requests-count">0</span>
                </div>
                <span id="user-branch-display" class="user-branch-display"></span>
            </header>

            <div id="view-dashboard" class="view active"><div class="kpi-grid"><div class="card"><div class="kpi-label" data-lang="total_items">Total Items</div><div id="dashboard-total-items" class="kpi-value">0</div></div><div class="card"><div class="kpi-label" data-lang="total_stock_value">Total Stock Value</div><div id="dashboard-total-value" class="kpi-value">0.00 EGP</div></div><div class="card"><div class="kpi-label" data-lang="total_suppliers">Total Suppliers</div><div id="dashboard-total-suppliers" class="kpi-value">0</div></div><div class="card"><div class="kpi-label" data-lang="total_branches">Total Branches</div><div id="dashboard-total-branches" class="kpi-value">0</div></div></div></div>
            <div id="view-setup" class="view"><div class="grid"><div class="card"><h2 class="card-title" data-lang="add_new_item">Add New Item</h2><form id="form-add-item"><div class="form-grid"><div class="form-group"><label for="item-code" data-lang="item_code_label">Item Code (Unique ID)</label><input type="text" id="item-code" required></div><div class="form-group"><label for="item-barcode" data-lang="item_barcode_label">Barcode</label><input type="text" id="item-barcode"></div><div class="form-group"><label for="item-name" data-lang="item_name_label">Item Name</label><input type="text" id="item-name" required></div><div class="form-group"><label for="item-unit" data-lang="item_unit_label">Unit (e.g., PCS, KG)</label><input type="text" id="item-unit" required></div><div class="form-group"><label for="item-category" data-lang="item_category_label">Category</label><select id="item-category" required><option value="">Select Category</option><option value="Packing">Packing</option><option value="Cleaning">Cleaning</option></select></div><div class="form-group"><label for="item-supplier" data-lang="item_supplier_label">Default Supplier</label><select id="item-supplier"></select></div><div class="form-group span-full"><label for="item-cost" data-lang="item_cost_label">Default Cost</label><input type="number" id="item-cost" step="0.01" min="0" required></div></div><button type="submit" class="primary" style="margin-top: 20px;" data-lang="add_item_button">Add Item</button></form></div><div class="card"><h2 data-lang="add_new_supplier">Add New Supplier</h2><form id="form-add-supplier"><div class="form-grid"><div class="form-group"><label for="supplier-code" data-lang="supplier_code_label">Supplier Code (Unique ID)</label><input type="text" id="supplier-code" required></div><div class="form-group"><label for="supplier-name" data-lang="supplier_name_label">Supplier Name</label><input type="text" id="supplier-name" required></div><div class="form-group"><label for="supplier-contact" data-lang="supplier_contact_label">Contact Info</label><input type="text" id="supplier-contact"></div></div><button type="submit" class="primary" style="margin-top: 20px; width:100%;" data-lang="add_supplier_button">Add Supplier</button></form></div><div class="card"><h2 data-lang="add_new_branch">Add New Branch</h2><form id="form-add-branch"><div class="form-grid"><div class="form-group"><label for="branch-code" data-lang="branch_code_label">Branch Code (Unique ID)</label><input type="text" id="branch-code" required></div><div class="form-group"><label for="branch-name" data-lang="branch_name_label">Branch Name</label><input type="text" id="branch-name" required></div></div><button type="submit" class="primary" style="margin-top: 20px;" data-lang="add_branch_button">Add Branch</button></form></div><div class="card"><h2 data-lang="add_new_section">Add New Section</h2><form id="form-add-section"><div class="form-grid"><div class="form-group"><label for="section-code" data-lang="section_code_label">Section Code (Unique ID)</label><input type="text" id="section-code" required></div><div class="form-group"><label for="section-name" data-lang="section_name_label">Section Name</label><input type="text" id="section-name" required></div></div><button type="submit" class="primary" style="margin-top: 20px;" data-lang="add_section_button">Add Section</button></form></div></div></div>
            <div id="view-backup" class="view"><div class="card"><h2 class="card-title" data-lang="auto_backup_settings">Automatic Backup Settings</h2><p data-lang="auto_backup_desc">Enable automatic backups to save a copy of your data periodically. Backups are stored in "StockApp Backups" in Google Drive.</p><div class="form-group-toggle"><label for="auto-backup-toggle" data-lang="enable_auto_backups">Enable Automatic Backups</label><label class="switch"><input type="checkbox" id="auto-backup-toggle"><span class="slider round"></span></label></div><div id="auto-backup-frequency-container" class="form-group" style="display: none; max-width: 300px; margin-top: 16px;"><label for="auto-backup-frequency" data-lang="backup_frequency">Backup Frequency</label><select id="auto-backup-frequency"><option value="daily" data-lang="daily_backup">Daily (at 2am)</option><option value="weekly" data-lang="weekly_backup">Weekly (Sunday at 2am)</option></select></div><p id="auto-backup-status" style="margin-top: 16px; color: var(--text-light-color); font-style: italic;"></p></div><div class="card"><h2 class="card-title" data-lang="manual_backup_restore">Manual Backup & Restore</h2><p data-lang="manual_backup_desc">Create an immediate backup or restore from a previously created file.</p><button id="btn-create-backup" class="primary" data-lang="create_new_manual_backup">Create New Manual Backup</button><hr style="margin: 24px 0;"><h3 data-lang="available_backups">Available Backups</h3><div id="backup-list-container" class="report-area"><p data-lang="loading_backups">Loading backup list...</p></div></div></div>
            <div id="view-master-data" class="view"><div class="sub-nav"><button class="sub-nav-item active" data-subview="items" data-lang="tab_items">Items</button><button class="sub-nav-item" data-subview="suppliers" data-lang="tab_suppliers">Suppliers</button><button class="sub-nav-item" data-subview="branches" data-lang="tab_branches">Branches</button><button class="sub-nav-item" data-subview="sections" data-lang="tab_sections">Sections</button></div><div id="subview-items" class="sub-view active"><div class="card"><div class="toolbar"><h2 data-lang="item_list">Item List</h2><div class="search-bar"><input type="search" id="search-items" class="search-bar-input" data-lang-placeholder="search_items_placeholder" placeholder="Search by name, code, category..."></div><button id="btn-export-items" class="secondary" data-lang="export_to_excel">Export to Excel</button></div><div class="report-area"><table id="table-items"><thead><tr><th data-lang="header_code">Code</th><th data-lang="header_name">Name</th><th data-lang="header_category">Category</th><th data-lang="header_unit">Unit</th><th data-lang="header_default_cost">Default Cost</th><th data-lang="header_actions">Actions</th></tr></thead><tbody></tbody></table></div></div></div><div id="subview-suppliers" class="sub-view"><div class="card"><div class="toolbar"><h2>Supplier List</h2><div class="search-bar"><input type="search" id="search-suppliers" class="search-bar-input" placeholder="Search by name or code..."></div><button id="btn-export-suppliers" class="secondary">Export to Excel</button></div><div class="report-area"><table id="table-suppliers"><thead><tr><th>Code</th><th>Name</th><th>Contact</th><th>Balance (Owed)</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div><div id="subview-branches" class="sub-view"><div class="card"><div class="toolbar"><h2>Branch List</h2><div class="search-bar"><input type="search" id="search-branches" class="search-bar-input" placeholder="Search by name or code..."></div><button id="btn-export-branches" class="secondary">Export to Excel</button></div><div class="report-area"><table id="table-branches"><thead><tr><th>Code</th><th>Name</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div><div id="subview-sections" class="sub-view"><div class="card"><div class="toolbar"><h2>Section List</h2><div class="search-bar"><input type="search" id="search-sections" class="search-bar-input" placeholder="Search by name or code..."></div><button id="btn-export-sections" class="secondary">Export to Excel</button></div><div class="report-area"><table id="table-sections"><thead><tr><th>Code</th><th>Name</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div></div>
            <div id="view-payments" class="view"><div class="card"><h2>Record a Payment</h2><form id="form-record-payment"><div class="form-grid"><div class="form-group"><label for="payment-supplier-select">1. Select Supplier</label><select id="payment-supplier-select" required></select></div><div class="form-group"><label>2. Select Invoices to Pay</label><button type="button" id="btn-select-invoices" class="secondary" style="width: 100%;" disabled>Select Invoices...</button></div><div class="form-group"><label for="payment-method">3. Enter Payment Method</label><input type="text" id="payment-method" placeholder="e.g., Cash, Bank Transfer" required></div></div><div id="payment-invoice-list-container" class="report-area" style="display:none; margin-top:24px;"><h3>4. Confirm Amounts</h3><table id="table-payment-list"><thead><tr><th>Invoice #</th><th>Balance Due</th><th>Amount to Pay</th></tr></thead><tbody></tbody><tfoot><tr style="font-weight:bold;"><td colspan="2" style="text-align:right;">Total Payment:</td><td id="payment-total-amount">0.00 EGP</td></tr></tfoot></table></div><button type="submit" class="primary" style="margin-top: 24px; width:100%;">Submit Payment</button></form></div></div>
            <div id="view-reports" class="view"><div class="sub-nav"><button class="sub-nav-item active" data-subview="supplier-statement" data-lang="reports_supplier_statement">Supplier Statement</button><button class="sub-nav-item" data-subview="branch-consumption" data-lang="reports_branch_consumption">Branch Consumption</button><button class="sub-nav-item" data-subview="section-consumption" data-lang="reports_section_consumption">Section Usage</button><button class="sub-nav-item" data-subview="resupply-report" data-lang="reports_resupply">Resupply Report</button></div>
                <div id="subview-supplier-statement" class="sub-view active"><div class="card"><div class="report-generator-controls"><select id="supplier-statement-select"></select><input type="date" id="statement-start-date"><input type="date" id="statement-end-date"><button id="btn-generate-supplier-statement" class="primary small" data-lang="reports_generate">Generate</button><button id="btn-export-supplier-statement" class="secondary small" disabled data-lang="export_to_excel">Export to Excel</button></div><div id="supplier-statement-results" class="printable-area" style="display: none; margin-top:20px;"></div></div></div>
                <div id="subview-branch-consumption" class="sub-view"><div class="card"><div class="report-generator-controls"><button id="btn-select-branch-consumption-branches" class="filter-button" data-report="branchConsumption" data-type="branches" data-lang="reports_select_branches">Select Branches...</button><button id="btn-select-branch-consumption-items" class="filter-button" data-report="branchConsumption" data-type="items" data-lang="reports_select_items">Select Items...</button><input type="date" id="branch-consumption-start-date"><input type="date" id="branch-consumption-end-date"><button id="btn-generate-branch-consumption" class="primary small" data-lang="reports_generate">Generate</button><button id="btn-export-branch-consumption" class="secondary small" disabled data-lang="export_to_excel">Export</button></div><div id="branch-consumption-results" class="printable-area" style="display: none; margin-top:20px;"></div></div></div>
                <div id="subview-section-consumption" class="sub-view"><div class="card"><div class="report-generator-controls"><button id="btn-select-section-consumption-sections" class="filter-button" data-report="sectionConsumption" data-type="sections" data-lang="reports_select_sections">Select Sections...</button><button id="btn-select-section-consumption-items" class="filter-button" data-report="sectionConsumption" data-type="items" data-lang="reports_select_items">Select Items...</button><input type="date" id="section-consumption-start-date"><input type="date" id="section-consumption-end-date"><button id="btn-generate-section-consumption" class="primary small" data-lang="reports_generate">Generate</button><button id="btn-export-section-consumption" class="secondary small" disabled data-lang="export_to_excel">Export</button></div><div id="section-consumption-results" class="printable-area" style="display: none; margin-top:20px;"></div></div></div>
                <div id="subview-resupply-report" class="sub-view"><div class="card"><div class="report-generator-controls"><select id="resupply-branch-filter"></select><input type="date" id="resupply-start-date"><input type="date" id="resupply-end-date"><button id="btn-generate-resupply-report" class="primary small" data-lang="reports_generate">Generate</button><button id="btn-export-resupply-report" class="secondary small" disabled data-lang="export_to_excel">Export to Excel</button></div><div id="resupply-report-results" class="printable-area" style="display: none; margin-top:20px;"></div></div></div>
            </div>
            <div id="view-operations" class="view"><div class="sub-nav"><button class="sub-nav-item active" data-subview="receive">Receive Stock</button><button class="sub-nav-item" data-subview="issue">Issue Stock</button><button class="sub-nav-item" data-subview="transfer">Internal Transfer</button><button class="sub-nav-item" data-subview="return">Return to Supplier</button><button class="sub-nav-item" data-subview="in-transit">In-Transit Report</button><button class="sub-nav-item" data-subview="adjustments">Adjustments</button></div>
                <div id="subview-receive" class="sub-view active"><div class="card" id="pending-transfers-card" style="display: none;"><h2>Pending Incoming Transfers</h2><div class="report-area"><table id="table-pending-transfers"><thead><tr><th>Date Sent</th><th>From Branch</th><th>Reference #</th><th>Items</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div><div class="card"><h2>Receive Stock from Supplier</h2><form id="form-receive-details" class="form-grid" onsubmit="return false;"><div class="form-group"><label for="receive-po-select">Receive Against PO <small>(Optional)</small></label><select id="receive-po-select"><option value="">Select a Purchase Order</option></select></div><div class="form-group"><label for="receive-supplier">Supplier</label><select id="receive-supplier" required></select></div><div class="form-group"><label for="receive-invoice">Invoice Number</label><input type="text" id="receive-invoice" required></div><div class="form-group"><label for="receive-branch">To Branch</label><select id="receive-branch" required></select></div><div class="form-group span-full"><label for="receive-notes">Notes (Optional)</label><textarea id="receive-notes" rows="2"></textarea></div></form></div><div class="card" id="receive-list-card"><h2>Items to be Received</h2><table id="table-receive-list"><thead><tr><th>Code</th><th>Item Name</th><th>Quantity</th><th>Cost/Unit</th><th>Total</th><th>Action</th></tr></thead><tbody></tbody><tfoot><tr style="font-weight: bold; background-color: var(--bg-color);"><td colspan="4" style="text-align: right;">Grand Total:</td><td id="receive-grand-total" colspan="2">0.00 EGP</td></tr></tfoot></table><div style="margin-top: 20px; display: flex; gap: 10px;"><button type="button" data-context="receive" class="secondary">Select Items</button><button id="btn-submit-receive-batch" class="primary">Submit for Approval</button></div></div></div>
                <div id="subview-issue" class="sub-view"><div class="card"><h2>Issue Note Details</h2><form id="form-issue-details" class="form-grid" onsubmit="return false;"><div class="form-group"><label for="issue-from-branch">From Branch</label><select id="issue-from-branch" required></select></div><div class="form-group"><label for="issue-to-section">To Section</label><select id="issue-to-section" required></select></div><div class="form-group"><label for="issue-ref">Issue Ref #</label><input type="text" id="issue-ref" readonly></div><div class="form-group span-full"><label for="issue-notes">Notes (Optional)</label><textarea id="issue-notes" rows="2"></textarea></div></form></div><div class="card" id="issue-list-card"><h2>Items to be Issued</h2><table id="table-issue-list"><thead><tr><th>Code</th><th>Item Name</th><th>Available</th><th>Quantity to Issue</th><th>Action</th></tr></thead><tbody></tbody><tfoot><tr style="font-weight: bold; background-color: var(--bg-color);"><td colspan="3" style="text-align: right;">Total Items to Issue:</td><td id="issue-grand-total" colspan="2">0.00</td></tr></tfoot></table><div style="margin-top: 20px; display: flex; gap: 10px;"><button type="button" data-context="issue" class="secondary">Select Items</button><button id="btn-submit-issue-batch" class="primary">Confirm & Issue All Items</button></div></div></div>
                <div id="subview-transfer" class="sub-view"><div class="card"><h2>Send Stock to Another Branch</h2><form id="form-transfer-details" class="form-grid" onsubmit="return false;"><div class="form-group"><label for="transfer-from-branch">From Branch</label><select id="transfer-from-branch" required></select></div><div class="form-group"><label for="transfer-to-branch">To Branch</label><select id="transfer-to-branch" required></select></div><div class="form-group"><label for="transfer-ref">Transfer Reference #</label><input type="text" id="transfer-ref" readonly></div><div class="form-group span-full"><label for="transfer-notes">Notes (Optional)</label><textarea id="transfer-notes" rows="2"></textarea></div></form></div><div class="card" id="transfer-list-card"><h2>Items to be Transferred</h2><table id="table-transfer-list"><thead><tr><th>Code</th><th>Item Name</th><th>Available</th><th>Quantity to Transfer</th><th>Action</th></tr></thead><tbody></tbody><tfoot><tr style="font-weight: bold; background-color: var(--bg-color);"><td colspan="3" style="text-align: right;">Total Items to Transfer:</td><td id="transfer-grand-total" colspan="2">0.00</td></tr></tfoot></table><div style="margin-top: 20px; display: flex; gap: 10px;"><button type="button" data-context="transfer" class="secondary">Select Items</button><button id="btn-submit-transfer-batch" class="primary">Confirm & Transfer All Items</button></div></div></div>
                <div id="subview-return" class="sub-view"><div class="card"><h2>Return to Supplier</h2><form id="form-return-details" class="form-grid" onsubmit="return false;"><div class="form-group"><label for="return-supplier">Supplier</label><select id="return-supplier" required></select></div><div class="form-group"><label for="return-branch">From Branch</label><select id="return-branch" required></select></div><div class="form-group"><label for="return-ref">Credit Note Ref #</label><input type="text" id="return-ref" required></div><div class="form-group span-full"><label for="return-notes">Reason for Return (Optional)</label><textarea id="return-notes" rows="2"></textarea></div></form></div><div class="card" id="return-list-card"><h2>Items to Return</h2><table id="table-return-list"><thead><tr><th>Code</th><th>Item Name</th><th>Available</th><th>Qty to Return</th><th>Cost</th><th>Action</th></tr></thead><tbody></tbody><tfoot><tr style="font-weight: bold; background-color: var(--bg-color);"><td colspan="4" style="text-align: right;">Total Return Value:</td><td id="return-grand-total" colspan="2">0.00 EGP</td></tr></tfoot></table><div style="margin-top: 20px; display: flex; gap: 10px;"><button type="button" data-context="return" class="secondary">Select Items</button><button id="btn-submit-return" class="primary">Confirm & Return All Items</button></div></div></div>
                <div id="subview-in-transit" class="sub-view"><div class="card"><h2>Goods In-Transit Report</h2><div class="report-area"><table id="table-in-transit"><thead><tr><th>Date Sent</th><th>From Branch</th><th>To Branch</th><th>Reference #</th><th>Items</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div>
                <div id="subview-adjustments" class="sub-view"><div id="stock-adjustment-card" class="card"><h2>Stock Count Adjustment</h2><form id="form-adjustment-details" class="form-grid" onsubmit="return false;"><div class="form-group"><label for="adjustment-branch">Branch</label><select id="adjustment-branch" required></select></div><div class="form-group"><label for="adjustment-ref">Reference</label><input type="text" id="adjustment-ref" placeholder="e.g., Stocktake April 2024" required></div><div class="form-group span-full"><label for="adjustment-notes">Notes / Reason</label><textarea id="adjustment-notes" rows="2"></textarea></div></form></div><div id="stock-adjustment-list-card" class="card"><h2>Items to Adjust</h2><table id="table-adjustment-list"><thead><tr><th>Code</th><th>Item Name</th><th>System Qty</th><th>Physical Count</th><th>Adjustment</th><th>Action</th></tr></thead><tbody></tbody></table><div style="margin-top: 20px; display: flex; gap: 10px;"><button type="button" data-context="adjustment" class="secondary">Select Items</button><button id="btn-submit-adjustment" class="primary">Process Stock Adjustment</button></div></div><div id="financial-adjustment-card" class="card"><h2>Supplier Opening Balance Adjustment</h2><p>Use this to set the initial amount owed to a supplier. This should typically only be done once per supplier when setting up.</p><form id="form-financial-adjustment" class="form-grid"><div class="form-group"><label for="fin-adj-supplier">Supplier</label><select id="fin-adj-supplier" required></select></div><div class="form-group"><label for="fin-adj-balance">Opening Balance (Amount Owed)</label><input type="number" id="fin-adj-balance" step="0.01" min="0" required></div><button type="submit" class="primary" style="align-self: end;">Set Opening Balance</button></form></div></div>
            </div>
            <div id="view-purchasing" class="view"><div class="sub-nav"><button class="sub-nav-item active" data-subview="create-po">Create Purchase Order</button><button class="sub-nav-item" data-subview="view-pos">View Purchase Orders</button><button class="sub-nav-item" data-subview="pending-financial-approval">Pending Approval</button></div><div id="subview-create-po" class="sub-view active"><div class="card"><h2>Purchase Order Details</h2><form id="form-po-details" class="form-grid" onsubmit="return false;"><div class="form-group"><label for="po-supplier">Supplier</label><select id="po-supplier" required></select></div><div class="form-group"><label for="po-ref">PO Reference #</label><input type="text" id="po-ref" readonly></div><div class="form-group span-full"><label for="po-notes">Notes (Optional)</label><textarea id="po-notes" rows="2"></textarea></div></form></div><div class="card" id="po-list-card"><h2>Items to Order</h2><table id="table-po-list"><thead><tr><th>Code</th><th>Item Name</th><th>Quantity</th><th>Cost/Unit</th><th>Total</th><th>Action</th></tr></thead><tbody></tbody><tfoot><tr style="font-weight: bold; background-color: var(--bg-color);"><td colspan="4" style="text-align: right;">Grand Total:</td><td id="po-grand-total" colspan="2">0.00 EGP</td></tr></tfoot></table><div style="margin-top: 20px; display: flex; gap: 10px;"><button type="button" data-context="po" class="secondary">Select Items</button><button id="btn-submit-po" class="primary">Submit for Approval</button></div></div></div><div id="subview-view-pos" class="sub-view"><div class="card"><h2>Purchase Order List</h2><div class="report-area"><table id="table-po-viewer"><thead><tr><th>PO #</th><th>Date</th><th>Supplier</th><th>Items</th><th>Total Value</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div><div id="subview-pending-financial-approval" class="sub-view"><div class="card"><h2>Transactions Pending Financial Approval</h2><div class="report-area"><table id="table-pending-financial-approval"><thead><tr><th>Date</th><th>Type</th><th>Reference #</th><th>Details</th><th>Amount</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div></div>
            <div id="view-requests" class="view"><div class="sub-nav"><button class="sub-nav-item active" data-subview="my-requests">My Requests</button><button class="sub-nav-item" data-subview="pending-approval">Pending Approval</button></div><div id="subview-my-requests" class="sub-view active"><div class="card"><h2>Create New Request</h2><form id="form-create-request" class="form-grid" onsubmit="return false;"><div class="form-group"><label for="request-type">Request Type</label><select id="request-type"><option value="issue">Request Items from Branch</option><option value="resupply">Request Item Resupply (Low Stock)</option></select></div><div class="form-group span-full"><label for="request-notes">Notes / Justification</label><textarea id="request-notes" rows="2"></textarea></div></form></div><div class="card"><h2>Items for Request</h2><table id="table-request-list"><thead><tr><th>Code</th><th>Item Name</th><th>Quantity</th><th>Action</th></tr></thead><tbody></tbody></table><div style="margin-top: 20px; display: flex; gap: 10px;"><button type="button" data-context="request" class="secondary">Select Items</button><button id="btn-submit-request" class="primary">Submit Request</button></div></div><div class="card"><h2>My Request History</h2><div class="report-area"><table id="table-my-requests-history"><thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Items (Req/Issued)</th><th>Status</th><th>Notes</th></tr></thead><tbody></tbody></table></div></div></div><div id="subview-pending-approval" class="sub-view"><div class="card"><div class="toolbar"><h2>Requests Pending Approval</h2><button id="btn-print-pending-requests" class="secondary small">Print List</button></div><div class="report-area"><table id="table-pending-requests"><thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Requested By</th><th>Details</th><th>Items</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div></div>
            <div id="view-stock-levels" class="view"><div class="card"><div class="toolbar"><h2 id="stock-levels-title">Stock by Item</h2><div class="search-bar"><input type="search" id="stock-levels-search" class="search-bar-input" placeholder="Search by item name or code..."></div><button id="btn-export-stock" class="secondary">Export to Excel</button></div><div id="item-centric-stock-container" class="report-area"></div></div><div class="card"><h2>Item Stock Inquiry (Drill-down)</h2><input type="search" id="item-inquiry-search" class="search-bar-input" placeholder="Start typing an item name or code..."><div id="item-inquiry-results" class="report-area"></div></div></div>
            <div id="view-transaction-history" class="view"><div class="card"><div class="toolbar"><h2>Transaction Log</h2><div class="filters-container"><input type="date" id="tx-filter-start-date" class="small"><input type="date" id="tx-filter-end-date" class="small"><select id="tx-filter-type" class="small"><option value="">All Types</option></select><select id="tx-filter-branch" class="small"><option value="">All Branches</option></select><input type="search" id="transaction-search" class="search-bar-input small" placeholder="Search by Ref#, Item Code/Name..." style="width: 250px;"></div></div><div class="report-area"><table id="table-transaction-history"><thead><tr><th>Date</th><th>Type</th><th>Batch/Ref #</th><th>Details</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div>
            <div id="view-user-management" class="view"><div class="card"><div class="toolbar"><h2>Users</h2><button id="btn-add-new-user" class="primary">Add New User</button></div><div class="report-area"><table id="table-users"><thead><tr><th>Username</th><th>Full Name</th><th>Role</th><th>Assigned Branch/Section</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div><div class="card"><div class="toolbar"><h2>Roles</h2><button id="btn-add-new-role" class="primary">Add New Role</button></div><div class="report-area"><table id="table-roles"><thead><tr><th>Role Name</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div>
            <div id="view-activity-log" class="view"><div class="card"><h2>System Activity Log</h2><div class="report-area"><table id="table-activity-log"><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Description</th></tr></thead><tbody></tbody></table></div></div></div>
        </main>
    </div>
    
    <div id="item-selector-modal" class="modal-overlay"><div class="modal-content"><div class="modal-header"><h2>Select Items</h2><button class="close-button">×</button></div><div class="modal-body"><input type="search" id="modal-search-items" placeholder="Search items..."><div id="modal-item-list" class="modal-item-list"></div></div><div class="modal-footer"><button class="secondary modal-cancel">Cancel</button><button id="btn-confirm-modal-selection" class="primary">Confirm Selection</button></div></div></div>
    <div id="invoice-selector-modal" class="modal-overlay"><div class="modal-content"><div class="modal-header"><h2>Select Invoices to Pay</h2><button class="close-button">×</button></div><div class="modal-body"><div id="modal-invoice-list" class="modal-item-list"></div></div><div class="modal-footer"><button class="secondary modal-cancel">Cancel</button><button id="btn-confirm-invoice-selection" class="primary">Confirm Selection</button></div></div></div>
    <div id="edit-modal" class="modal-overlay"><form id="form-edit-record" class="modal-content"><div class="modal-header"><h2 id="edit-modal-title">Edit</h2><button type="button" class="close-button">×</button></div><div class="modal-body" id="edit-modal-body"></div><div class="modal-footer"><button type="button" class="secondary modal-cancel">Cancel</button><button type="submit" class="primary">Save Changes</button></div></form></div>
    <div id="view-transfer-modal" class="modal-overlay"><div class="modal-content"><div class="modal-header"><h2 id="view-transfer-modal-title">Confirm Transfer Receipt</h2><button class="close-button">×</button></div><div class="modal-body" id="view-transfer-modal-body"></div><div class="modal-footer"><button class="secondary modal-cancel">Cancel</button><button id="btn-reject-transfer" class="danger">Reject</button><button id="btn-confirm-receive-transfer" class="primary">Confirm Receipt</button></div></div></div>
    <div id="history-modal" class="modal-overlay"><div class="modal-content" style="max-width: 900px;"><div class="modal-header"><h2 id="history-modal-title">Item History</h2><button class="close-button">×</button></div><div class="modal-body" id="history-modal-body"><div class="sub-nav"><button class="sub-nav-item active" data-subview="price-history">Price History</button><button class="sub-nav-item" data-subview="movement-history">Movement History</button></div><div id="subview-price-history" class="sub-view active report-area"></div><div id="subview-movement-history" class="sub-view report-area"><div class="filters-container" style="padding: 10px 0; gap: 10px;"><input type="date" id="history-filter-start-date" class="small"><input type="date" id="history-filter-end-date" class="small"><select id="history-filter-type" class="small"><option value="">All Types</option></select><select id="history-filter-branch" class="small"><option value="">All Branches</option></select></div><div id="movement-history-table-container"></div></div></div><div class="modal-footer"><button class="secondary modal-cancel">Close</button></div></div></div>
    <div id="edit-po-modal" class="modal-overlay"><div class="modal-content" style="max-width: 900px;"><div class="modal-header"><h2 id="edit-po-modal-title">Edit Purchase Order</h2><button class="close-button">×</button></div><div class="modal-body" id="edit-po-modal-body"></div><div class="modal-footer"><button class="secondary modal-cancel">Cancel</button><button id="btn-save-po-changes" class="primary">Save Changes</button></div></div></div>
    <div id="approve-request-modal" class="modal-overlay"><div class="modal-content" style="max-width: 900px;"><div class="modal-header"><h2 id="approve-request-modal-title">Approve Item Request</h2><button class="close-button">×</button></div><div class="modal-body" id="approve-request-modal-body"></div><div class="modal-footer"><button class="secondary modal-cancel">Cancel</button><button id="btn-confirm-request-approval" class="primary">Confirm and Issue</button></div></div></div>
    <div id="restore-modal" class="modal-overlay"><div class="modal-content" style="max-width: 600px;"><div class="modal-header"><h2 id="restore-modal-title">Restore from Backup</h2><button class="close-button">×</button></div><div class="modal-body" id="restore-modal-body"><p>You are about to restore data from the backup file:</p><p><strong id="restore-filename-display"></strong></p><hr><p><strong>1. Select which data sheets to restore.</strong></p><div id="restore-sheet-list" class="form-grid permissions-grid"></div><hr><div class="form-group" style="margin-top: 20px;"><label><strong>2. Confirm this irreversible action.</strong></label><div style="padding: 15px; background-color: #FDEDE9; border: 1px solid var(--danger-color); border-radius: 8px;"><strong style="color: var(--danger-color);">EXTREME DANGER:</strong> This will permanently delete the current data in the selected live sheets and replace it with the data from the backup. This action CANNOT be undone.</div><p style="margin-top: 15px;">Please type <strong>RESTORE</strong> into the box below to proceed.</p><input type="text" id="restore-confirmation-input" autocomplete="off"></div></div><div class="modal-footer"><button class="secondary modal-cancel">Cancel</button><button id="btn-confirm-restore" class="danger" disabled>Confirm and Restore Data</button></div></div></div>
    <div id="context-selector-modal" class="modal-overlay"><div class="modal-content" style="max-width: 500px;"><div class="modal-header"><h2 id="context-modal-title">Select Operational Context</h2></div><div class="modal-body"><p id="context-modal-message">Before you can proceed, please select the branch or section you are operating on behalf of for this session.</p><div id="context-modal-branch-group" class="form-group"><label for="context-branch-select">Select Branch</label><select id="context-branch-select"></select></div><div id="context-modal-section-group" class="form-group" style="display: none;"><label for="context-section-select">Select Section</label><select id="context-section-select"></select></div></div><div class="modal-footer"><button id="btn-confirm-context" class="primary">Confirm Selection</button></div></div></div>

    <!-- NEW Multi-Select Modal -->
    <div id="multi-select-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="multi-select-modal-title">Select Items</h2>
                <button class="close-button">×</button>
            </div>
            <div class="modal-body">
                <div class="multi-select-header">
                     <div class="search-bar">
                         <input type="search" id="multi-select-search" class="search-bar-input" data-lang-placeholder="modal_search_placeholder" placeholder="Search...">
                     </div>
                </div>
                <div id="multi-select-select-all-container" class="form-group-checkbox">
                    <input type="checkbox" id="multi-select-select-all">
                    <label for="multi-select-select-all" data-lang="modal_select_all">Select All</label>
                </div>
                <div id="multi-select-list" class="multi-select-list">
                    <!-- Items will be rendered here by JS -->
                </div>
            </div>
            <div class="modal-footer">
                <button class="secondary modal-cancel">Cancel</button>
                <button id="btn-confirm-multi-selection" class="primary">Confirm Selection</button>
            </div>
        </div>
    </div>

    <div id="print-area" style="display: none;"></div>
    <div id="toast-container"></div>
    <script src="script.js"></script>
</body>
</html>
```
--- START OF FILE New Text Document.txt ---
```javascript
/**
 * Helper function to get a sheet by its name.
 */
function getSheet(sheetName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
}

/**
 * Converts a 2D array from a sheet into an array of objects.
 */
function sheetDataToObjects(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  var data = sheet.getDataRange().getValues();
  var headers = data.shift().map(function(h) { return String(h).trim(); });
  
  const numericHeaders = [ 'quantity', 'cost', 'totalValue', 'amount', 'OldCost', 'NewCost', 'IssuedQuantity', 'Quantity', 'Cost', 'TotalValue', 'Amount' ];
  const lowerCaseNumericHeaders = numericHeaders.map(h => h.toLowerCase());

  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      if (header) {
        const value = row[i];
        if (lowerCaseNumericHeaders.indexOf(header.toLowerCase()) !== -1) {
          if (value === '' || value === null || isNaN(value)) {
            obj[header] = 0;
          } else {
            obj[header] = parseFloat(value);
          }
        } else {
          obj[header] = String(value);
        }
      }
    });
    return obj;
  });
}

/**
 * Builds a row array in the correct order based on sheet headers.
 */
function buildRow(sheet, dataObject) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = headers.map(function(header) {
        return dataObject[String(header).trim()] !== undefined ? dataObject[String(header).trim()] : null;
    });
    return row;
}

/**
 * Finds a user by username/code and merges their permissions.
 */
function checkUser(username, loginCode) {
  if (!username || !loginCode) return null;
  var usersSheet = getSheet('Users');
  if (!usersSheet) { console.error("Users sheet not found!"); return null; }
  var users = sheetDataToObjects(usersSheet);
  var user = users.find(function(u) {
    return u && String(u.Username).toLowerCase() === String(username).toLowerCase() && String(u.LoginCode) === String(loginCode) && (u.isDisabled !== true && String(u.isDisabled).toUpperCase() !== 'TRUE');
  });

  if (!user) return null;

  var permissionsSheet = getSheet('Permissions');
  if (!permissionsSheet) { console.error("Permissions sheet not found!"); user.permissions = {}; return user; }
  var allPermissions = sheetDataToObjects(permissionsSheet);
  var rolePermissions = allPermissions.find(function(p) { return p.RoleName === user.RoleName; });

  user.permissions = rolePermissions || {};
  return user;
}

/**
 * Logs an activity to the ActivityLog sheet.
 */
function logActivity(action, description, user) {
  try {
    var logSheet = getSheet('ActivityLog');
    if (!logSheet) return;
    var userName = user ? user.Name : 'System';
    logSheet.appendRow(buildRow(logSheet, {Timestamp: new Date(), User: userName, Action: action, Description: description}));
  } catch (e) {
    console.error("Failed to log activity: " + e.toString());
  }
}

function logPriceChange(itemCode, oldCost, newCost, updatedBy, source) {
    try {
        var historySheet = getSheet('PriceHistory');
        if (!historySheet) {
            historySheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('PriceHistory').getRange(1,1,1,6).setValues([['Timestamp','ItemCode','OldCost','NewCost','Source','UpdatedBy']]);
        }
        historySheet.appendRow(buildRow(historySheet, {Timestamp: new Date(), ItemCode: itemCode, OldCost: oldCost, NewCost: newCost, Source: source, UpdatedBy: updatedBy}));
    } catch(e) {
        console.error("Failed to log price change: " + e.toString());
    }
}

/**
 * Creates a backup copy of the spreadsheet in a dedicated Google Drive folder.
 */
function createBackup(user) {
  const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
  const SPREADSHEET_NAME = SpreadsheetApp.getActiveSpreadsheet().getName();
  const FOLDER_NAME = "StockApp Backups";
  
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  var backupFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
  
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH.mm.ss");
  const backupFileName = `${SPREADSHEET_NAME} Backup - ${timestamp}`;
  
  const backupFile = DriveApp.getFileById(SPREADSHEET_ID).makeCopy(backupFileName, backupFolder);
  
  logActivity('Create Backup', `Created backup file: ${backupFileName}`, user);
  return { fileName: backupFile.getName(), fileUrl: backupFile.getUrl() };
}

/**
 * Lists all backup files from the dedicated Google Drive folder.
 */
function listBackups() {
  const FOLDER_NAME = "StockApp Backups";
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  
  if (!folders.hasNext()) return [];
  
  const backupFolder = folders.next();
  const files = backupFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const backupList = [];
  
  while (files.hasNext()) {
    let file = files.next();
    backupList.push({
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      dateCreated: file.getDateCreated().toISOString()
    });
  }
  
  backupList.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
  return backupList;
}

/**
 * Function specifically for an automatic, time-driven trigger.
 */
function createAutomaticBackup() {
  try {
    const systemUser = { Name: 'System (Automatic)' };
    createBackup(systemUser);
    console.log("Automatic backup created successfully at " + new Date());
  } catch (e) {
    console.error("Automatic backup failed: " + e.toString());
  }
}

/**
 * Checks if an automatic backup trigger is currently set.
 */
function getAutomaticBackupStatus() {
    const triggers = ScriptApp.getProjectTriggers();
    const existingTrigger = triggers.find(function(t) {
        return t.getHandlerFunction() === 'createAutomaticBackup';
    });
    return { enabled: !!existingTrigger };
}

/**
 * Enables or disables the automatic backup trigger based on UI input.
 */
function setAutomaticBackup(data, user) {
    const triggers = ScriptApp.getProjectTriggers();
    
    triggers.forEach(function(trigger) {
        if (trigger.getHandlerFunction() === 'createAutomaticBackup') {
            ScriptApp.deleteTrigger(trigger);
        }
    });

    if (data.enabled) {
        let newTrigger;
        switch(data.frequency) {
            case 'daily':
                newTrigger = ScriptApp.newTrigger('createAutomaticBackup').timeBased().everyDays(1).atHour(2).create();
                break;
            case 'weekly':
                newTrigger = ScriptApp.newTrigger('createAutomaticBackup').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(2).create();
                break;
            default:
                throw new Error("Invalid backup frequency specified.");
        }
        logActivity('Auto Backup Enabled', 'Enabled automatic backups with frequency: ' + data.frequency, user);
        return { status: 'Enabled', triggerId: newTrigger.getUniqueId() };
    } else {
        logActivity('Auto Backup Disabled', 'Disabled automatic backups.', user);
        return { status: 'Disabled' };
    }
}

/**
 * Restores specific sheets from a backup file to the live spreadsheet.
 */
function restoreFromBackup(data, user) {
  const liveSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const backupSpreadsheet = SpreadsheetApp.openById(data.backupFileId);
  const sheetsToRestore = data.sheetsToRestore;
  let restoredSheetsLog = [];

  sheetsToRestore.forEach(function(sheetName) {
    const backupSheet = backupSpreadsheet.getSheetByName(sheetName);
    const liveSheet = liveSpreadsheet.getSheetByName(sheetName);

    if (backupSheet && liveSheet) {
      const backupData = backupSheet.getDataRange().getValues();
      liveSheet.clear();
      if (backupData.length > 0) {
        liveSheet.getRange(1, 1, backupData.length, backupData[0].length).setValues(backupData);
      }
      restoredSheetsLog.push(sheetName);
    }
  });

  if (restoredSheetsLog.length > 0) {
    const logMessage = `Restored data for sheets: [${restoredSheetsLog.join(', ')}] from backup file ID: ${data.backupFileId}`;
    logActivity('Restore from Backup', logMessage, user);
    return { success: true, message: `Successfully restored ${restoredSheetsLog.length} sheets.` };
  } else {
    throw new Error("No valid sheets were found to restore.");
  }
}

/**
 * Handles GET requests to the web app.
 */
function doGet(e) {
  try {
    var username = e.parameter.username;
    var loginCode = e.parameter.loginCode;
    var user = checkUser(username, loginCode);

    if (!user) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid username or password.' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var safeUser = JSON.parse(JSON.stringify(user));
    delete safeUser.LoginCode;
    
    var allTransactions = sheetDataToObjects(getSheet('Transactions'));
    var activeTransactions = allTransactions.filter(function(t) { return t.is_deleted !== true && String(t.is_deleted).toUpperCase() !== 'TRUE'; });

    var data = {
      user: safeUser,
      items: sheetDataToObjects(getSheet('Items')),
      suppliers: sheetDataToObjects(getSheet('Suppliers')),
      branches: sheetDataToObjects(getSheet('Branches')),
      sections: sheetDataToObjects(getSheet('Sections')),
      transactions: activeTransactions,
      payments: sheetDataToObjects(getSheet('Payments')),
      purchaseOrders: sheetDataToObjects(getSheet('PurchaseOrders')),
      purchaseOrderItems: sheetDataToObjects(getSheet('PurchaseOrderItems')),
      itemRequests: sheetDataToObjects(getSheet('ItemRequests')),
      activityLog: sheetDataToObjects(getSheet('ActivityLog'))
    };

    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error("doGet Error: ", err, err.stack);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: "Server error during data load: " + err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles POST requests to the web app.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  var request = {};
  var user = null;

  try {
    request = JSON.parse(e.postData.contents);
    user = checkUser(request.username, request.loginCode);

    if (!user || !user.permissions) {
      throw new Error("Authentication failed. Invalid credentials or role configuration error.");
    }
    
    var userCan = function(permission) {
      return user.permissions[permission] === true || String(user.permissions[permission]).toUpperCase() === 'TRUE';
    };

    var action = request.action;
    var data = request.data;
    var responseData = {};
    
    if (action.includes('User') || action.includes('Role')) {
        if (!userCan('manageUsers')) throw new Error("Unauthorized: You do not have permission to manage users and roles.");
    }
    if (action.includes('Backup') || action.includes('Restore')) {
        if (!userCan('opBackupRestore')) throw new Error("Unauthorized: You do not have permission to manage backups.");
    }

    switch (action) {
      // --- BACKUP & RESTORE ACTIONS ---
      case 'createBackup': responseData = createBackup(user); break;
      case 'listBackups': responseData = listBackups(); break;
      case 'getAutomaticBackupStatus': responseData = getAutomaticBackupStatus(); break;
      case 'setAutomaticBackup': responseData = setAutomaticBackup(data, user); break;
      case 'restoreFromBackup': responseData = restoreFromBackup(data, user); break;
      
      // --- FINANCIAL APPROVAL ACTIONS ---
      case 'approveFinancial':
        if (!userCan('opApproveFinancials')) throw new Error("Unauthorized to approve transactions.");
        if (data.type === 'po') {
          updateRecordInSheet(getSheet('PurchaseOrders'), data.id, 'poId', { Status: 'Approved' });
          logActivity('Approve PO', `Approved PO #${data.id}`, user);
        } else if (data.type === 'receive') {
          updateRecordInSheet(getSheet('Transactions'), data.id, 'batchId', { isApproved: true }, true);
          logActivity('Approve GRN', `Approved GRN/Invoice #${data.id}`, user);
        }
        break;
      case 'rejectFinancial':
        if (!userCan('opApproveFinancials')) throw new Error("Unauthorized to reject transactions.");
        if (data.type === 'po') {
          updateRecordInSheet(getSheet('PurchaseOrders'), data.id, 'poId', { Status: 'Rejected' });
          logActivity('Reject PO', `Rejected PO #${data.id}`, user);
        } else if (data.type === 'receive') {
          updateRecordInSheet(getSheet('Transactions'), data.id, 'batchId', { Status: 'Rejected', is_deleted: true }, true);
          logActivity('Reject GRN', `Rejected GRN/Invoice #${data.id}`, user);
        }
        break;

      // --- USER MANAGEMENT ---
      case 'getAllUsersAndRoles':
        var allUsers = sheetDataToObjects(getSheet('Users'));
        var allRoles = sheetDataToObjects(getSheet('Permissions'));
        var safeUsers = allUsers.map(function(u) { delete u.LoginCode; return u; });
        responseData = { users: safeUsers, roles: allRoles };
        break;
      case 'addUser':
        var usersSheet = getSheet('Users');
        var allUsersData = sheetDataToObjects(usersSheet);
        if (allUsersData.some(function(u) { return String(u.Username).toLowerCase() === String(data.Username).toLowerCase(); })) throw new Error("Username '" + data.Username + "' already exists.");
        usersSheet.appendRow(buildRow(usersSheet, data));
        logActivity('Add User', `Added new user '${data.Name}' (${data.Username}).`, user);
        break;
      case 'updateUser': updateRecordInSheet(getSheet('Users'), data.Username, 'Username', data.updates); logActivity('Update User', `Updated user '${data.Username}'.`, user); break;
      case 'deleteUser': deleteRecordFromSheet(getSheet('Users'), data.username, 'Username'); logActivity('Delete User', `Deleted user '${data.username}'.`, user); break;
      case 'addRole':
        var permsSheet = getSheet('Permissions');
        var allRolesData = sheetDataToObjects(permsSheet);
        if (allRolesData.some(function(r) { return r.RoleName === data.RoleName; })) throw new Error("Role '" + data.RoleName + "' already exists.");
        permsSheet.appendRow(buildRow(permsSheet, data));
        logActivity('Add Role', `Added new role '${data.RoleName}'.`, user);
        break;
      case 'updateRolePermissions': updateRecordInSheet(getSheet('Permissions'), data.RoleName, 'RoleName', data.updates); logActivity('Update Role', `Updated permissions for role '${data.RoleName}'.`, user); break;
      case 'deleteRole': deleteRecordFromSheet(getSheet('Permissions'), data.roleName, 'RoleName'); logActivity('Delete Role', `Deleted role '${data.roleName}'.`, user); break;

      // --- DATA SETUP ---
      case 'addItem': if (!userCan('createItem')) throw new Error("Unauthorized"); getSheet('Items').appendRow(buildRow(getSheet('Items'), data)); logActivity('Add Item', `Added new item '${data.name}'.`, user); break;
      case 'addSupplier': if (!userCan('createSupplier')) throw new Error("Unauthorized"); getSheet('Suppliers').appendRow(buildRow(getSheet('Suppliers'), data)); logActivity('Add Supplier', `Added new supplier '${data.name}'.`, user); break;
      case 'addBranch': if (!userCan('createBranch')) throw new Error("Unauthorized"); getSheet('Branches').appendRow(buildRow(getSheet('Branches'), data)); logActivity('Add Branch', `Added new branch '${data.branchName}'.`, user); break;
      case 'addSection': if (!userCan('createSection')) throw new Error("Unauthorized"); getSheet('Sections').appendRow(buildRow(getSheet('Sections'), data)); logActivity('Add Section', `Added new section '${data.sectionName}'.`, user); break;
      
      // --- PURCHASING ---
      case 'addPurchaseOrder':
        if (!userCan('opCreatePO')) throw new Error("Unauthorized to create Purchase Orders.");
        var poSheet = getSheet('PurchaseOrders');
        var poItemsSheet = getSheet('PurchaseOrderItems');
        poSheet.appendRow(buildRow(poSheet, { poId: data.poId, date: new Date(), supplierCode: data.supplierCode, createdBy: user.Name, totalValue: data.totalValue, Status: 'Pending Approval', notes: data.notes }));
        var newPoItemsRows = data.items.map(function(item) {
          return buildRow(poItemsSheet, { poId: data.poId, itemCode: item.itemCode, quantity: item.quantity, cost: item.cost });
        });
        if (newPoItemsRows.length > 0) { poItemsSheet.getRange(poItemsSheet.getLastRow() + 1, 1, newPoItemsRows.length, newPoItemsRows[0].length).setValues(newPoItemsRows); }
        logActivity('Create PO', `Created PO ${data.poId} for supplier ${data.supplierCode}.`, user);
        responseData = data;
        break;
      case 'editPurchaseOrder':
        if (!userCan('opCreatePO')) throw new Error("Unauthorized to edit Purchase Orders.");
        var poSheet = getSheet('PurchaseOrders');
        var poItemsSheet = getSheet('PurchaseOrderItems');
        var poToEdit = sheetDataToObjects(poSheet).find(function(p){ return p.poId === data.poId; });
        if (!poToEdit || poToEdit.Status !== 'Pending Approval') { throw new Error("This PO cannot be edited. It may have already been approved or rejected."); }
        updateRecordInSheet(poSheet, data.poId, 'poId', { notes: data.notes, totalValue: data.totalValue });
        deleteRecordFromSheet(poItemsSheet, data.poId, 'poId', true);
        var newPoItemsRows = data.items.map(function(item) {
          return buildRow(poItemsSheet, { poId: data.poId, itemCode: item.itemCode, quantity: item.quantity, cost: item.cost });
        });
        if (newPoItemsRows.length > 0) { poItemsSheet.getRange(poItemsSheet.getLastRow() + 1, 1, newPoItemsRows.length, newPoItemsRows[0].length).setValues(newPoItemsRows); }
        logActivity('Edit PO', `Edited PO ${data.poId}.`, user);
        responseData = data;
        break;
      case 'editInvoice':
        if (!userCan('opEditInvoice')) throw new Error("Unauthorized to edit invoices.");
        var txSheet = getSheet('Transactions');
        var txGroup = sheetDataToObjects(txSheet).filter(function(t) { return t.batchId === data.batchId && t.type === 'receive'; });
        if (txGroup.length === 0 || txGroup[0].isApproved === true || String(txGroup[0].isApproved).toUpperCase() === 'TRUE') {
          throw new Error("This invoice cannot be edited. It may have already been approved or does not exist.");
        }
        var originalTx = txGroup[0];
        deleteRecordFromSheet(txSheet, data.batchId, 'batchId', true);
        var newTxRows = data.items.map(function(item) {
            var rowData = { 
                batchId: data.batchId, date: new Date(originalTx.date), type: 'receive', 
                itemCode: item.itemCode, quantity: item.quantity, cost: item.cost,
                branchCode: originalTx.branchCode,
                supplierCode: originalTx.supplierCode, invoiceNumber: data.invoiceNumber,
                ref: originalTx.ref, notes: data.notes, is_deleted: false, 
                Status: 'Pending Approval', isApproved: false 
            };
            return buildRow(txSheet, rowData);
        });
        if(newTxRows.length > 0) { txSheet.getRange(txSheet.getLastRow() + 1, 1, newTxRows.length, newTxRows[0].length).setValues(newTxRows); }
        logActivity('Edit Invoice', `Edited GRN/Invoice #${data.invoiceNumber} (Batch ID: ${data.batchId}).`, user);
        break;

      // --- STOCK TRANSACTIONS ---
      case 'addTransactionBatch':
        if (data.type === 'receive' && !userCan('opReceive')) throw new Error("Unauthorized to receive stock.");
        if (data.type === 'receive' && !data.poId && !userCan('opReceiveWithoutPO')) throw new Error("Unauthorized: You must select a PO to receive stock.");
        if (data.type === 'transfer_out' && !userCan('opTransfer')) throw new Error("Unauthorized to transfer stock.");
        if (data.type === 'issue' && !userCan('opIssue')) throw new Error("Unauthorized to issue stock.");
        if (data.type === 'return_out' && !userCan('opReturn')) throw new Error("Unauthorized to return stock.");
        if (data.type === 'stock_adjustment' && !userCan('opStockAdjustment')) throw new Error("Unauthorized to perform stock adjustments.");
        if (!userCan('viewAllBranches')) {
          var assignedBranch = String(user.AssignedBranchCode);
          if (data.type === 'receive' && String(data.branchCode) !== assignedBranch) throw new Error("Unauthorized: You can only receive into your assigned branch.");
          if ( (data.type === 'transfer_out' || data.type === 'issue' || data.type === 'return_out' || data.type === 'stock_adjustment') && String(data.fromBranchCode) !== assignedBranch ) throw new Error("Unauthorized: You can only move stock from your assigned branch.");
        }
        var transactionsSheet = getSheet('Transactions');
        var newRows = data.items.map(function(item) {
            if (data.type === 'receive') {
                var itemsSheet = getSheet('Items');
                var oldItem = sheetDataToObjects(itemsSheet).find(function(i) { return i.code == item.itemCode; });
                if (oldItem && parseFloat(oldItem.cost) !== parseFloat(item.cost)) {
                    logPriceChange(item.itemCode, oldItem.cost, item.cost, user.Name, 'GRN: ' + data.batchId);
                }
            }
            var rowData = { batchId: data.batchId, date: new Date(), type: item.type, itemCode: item.itemCode, quantity: item.quantity, notes: data.notes, is_deleted: false, ref: data.ref, cost: item.cost };
            if (item.type === 'receive') { Object.assign(rowData, { branchCode: data.branchCode, supplierCode: data.supplierCode, invoiceNumber: data.invoiceNumber, Status: 'Pending Approval', isApproved: false }); }
            else if (item.type === 'transfer_out') { Object.assign(rowData, { fromBranchCode: data.fromBranchCode, toBranchCode: data.toBranchCode, Status: 'In Transit' }); }
            else if (item.type === 'return_out') { Object.assign(rowData, { fromBranchCode: data.fromBranchCode, supplierCode: data.supplierCode, Status: 'Completed' }); }
            else if (item.type === 'issue') { Object.assign(rowData, { fromBranchCode: data.fromBranchCode, sectionCode: data.sectionCode, Status: 'Completed' }); }
            else if (item.type === 'adjustment_in' || item.type === 'adjustment_out') { Object.assign(rowData, { fromBranchCode: data.fromBranchCode, Status: 'Completed' }); }
            return buildRow(transactionsSheet, rowData);
        });
        if (newRows.length > 0) { transactionsSheet.getRange(transactionsSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows); }
        if(data.type === 'receive' && data.poId) { updateRecordInSheet(getSheet('PurchaseOrders'), data.poId, 'poId', { Status: 'Completed' }); }
        logActivity('Add Transaction', `Processed ${data.type} with ${newRows.length} items. Batch ID: ${data.batchId}`, user);
        responseData = data;
        break;
      case 'receiveTransfer':
        if (!userCan('opReceive')) throw new Error("Unauthorized");
        var assignedBranch = String(user.AssignedBranch
