
const RESUPPLY_API_URL = 'https://script.google.com/macros/s/AKfycbzKBLjK5CP6Zz71xCKW0v2woZYbR0nJiBkySckqR94IDmjou7mqiG1jJxetskQTOwvL7Q/exec';

let currentBranch = null; 
let allBranches = [];
let dataTable;
let selectionState = {};
const loadingOverlay = $('#loading-overlay');
let suppliersInitialized = false;

$(document).ready(function() {
    if (!currentUserData) return;
    initializeUI();
    initializeDataTable();
    attachEventListeners();
    fetchBranches();
});

function initializeUI() {
    $('#loggedInUser').text(currentUserData.username);
    const permissions = currentUserData.permissions || [];
    const canUpdateStock = permissions.includes('admin') || permissions.includes('update_stock');
    
    $('#pills-update-tab, #pills-extract-tab').hide();

    if (canUpdateStock) {
        $('#pills-update-tab, #pills-extract-tab').show();
    }
    $('#search-container').addClass('disabled-overlay');
    $('#addItemsBtn').prop('disabled', true);
}

function attachEventListeners() {
    $('#logoutBtn').on('click', () => { sessionStorage.removeItem('keroUser'); window.location.href = '../login/'; });
    $('#branchSelect').on('change', handleBranchSelection);
    $('#supplierFilter').on('change', () => {
        const supplier = $('#supplierFilter').val();
        if (supplier) {
            $('#searchTerm').val('');
            performSearch({ supplier: supplier });
        }
    });
    $('#searchBtn').on('click', () => performSearch({ searchTerm: $('#searchTerm').val() }));
    $('#searchTerm').on('keypress', (e) => { if(e.which == 13) performSearch({ searchTerm: $('#searchTerm').val() }); });
    $('#addItemsBtn').on('click', handleAddItems);
    $('#exportBtn').on('click', downloadOrderExcel);
    $('#updateStockBtn').on('click', handleStockUpdate);
    $('#extractStockBtn').on('click', handleExtractStock);
}

function fetchBranches() {
    loadingOverlay.addClass('active');
    fetchWithAction('getBranches').then(branches => {
        allBranches = branches;
        const userString = sessionStorage.getItem('keroUser');
        const userData = JSON.parse(userString);
        const userBranchCode = userData.AssignedBranchCode;
        if (userBranchCode && allBranches.some(b => String(b.code) === String(userBranchCode))) {
            const assignedBranch = allBranches.find(b => String(b.code) === String(userBranchCode));
            setBranch(assignedBranch);
        } else {
            const select = $('#branchSelect');
            select.append(new Option('--- اختر فرع ---', ''));
            branches.forEach(b => select.append(new Option(b.name, b.code)));
            loadingOverlay.removeClass('active');
        }
    }).catch(handleError);
}

function setBranch(branch) {
    currentBranch = branch;
    $('#currentBranchName').text(currentBranch.name);
    $('#branch-selector-view').hide();
    $('#main-content').removeClass('d-none');
    $('#search-container').removeClass('disabled-overlay');
    if (!suppliersInitialized) {
        initializeSuppliers();
    } else {
        loadingOverlay.removeClass('active');
    }
}

function handleBranchSelection() {
    const selectedCode = $(this).val();
    if (selectedCode) {
        loadingOverlay.addClass('active');
        const selectedBranch = allBranches.find(b => b.code == selectedCode);
        setBranch(selectedBranch);
    }
}

function initializeSuppliers() {
    fetchWithAction('getSuppliers').then(suppliers => {
        const select = $('#supplierFilter');
        select.empty().append(new Option('', ''));
        suppliers.forEach(s => select.append(new Option(s, s)));
        select.select2({ 
            placeholder: "اختر مورد...", 
            theme: "bootstrap-5", 
            dir: "rtl", 
            allowClear: true 
        });
        
        initializeExtractTab(suppliers);
        
        suppliersInitialized = true;
        loadingOverlay.removeClass('active');
    }).catch(handleError);
}

function initializeExtractTab(suppliers) {
    const branchSelect = $('#extractBranchSelect');
    branchSelect.empty();
    allBranches.forEach(b => branchSelect.append(new Option(b.name, b.code)));
    branchSelect.select2({
        placeholder: "اختر فرع واحد أو أكثر...",
        theme: "bootstrap-5",
        dir: "rtl"
    });

    const supplierSelect = $('#extractSupplierSelect');
    supplierSelect.empty();
    suppliers.forEach(s => supplierSelect.append(new Option(s, s)));
    supplierSelect.select2({
        placeholder: "اختر مورد واحد أو أكثر...",
        theme: "bootstrap-5",
        dir: "rtl"
    });
}

function performSearch(params) {
    if (params.searchTerm && (!params.searchTerm || params.searchTerm.trim().length < 2)) {
        alert('الرجاء إدخال حرفين على الأقل للبحث.');
        return;
    }
    if (params.searchTerm) {
        $('#supplierFilter').val(null).trigger('change.select2');
    }
    fetchData(params);
}

function fetchData(params = {}) {
    if (!currentBranch) { alert("الرجاء اختيار فرع أولاً."); return; }
    loadingOverlay.addClass('active');
    params.branchCode = currentBranch.code;
    fetchWithAction('searchItems', params)
        .then(renderTable)
        .catch(handleError)
        .finally(() => loadingOverlay.removeClass('active'));
}

function initializeDataTable() {
     dataTable = $('#itemsTable').DataTable({
        responsive: true, searching: false, lengthChange: false, info: false, paging: false,
        language: { "url": "//cdn.datatables.net/plug-ins/1.13.6/i18n/ar.json", "emptyTable": "لم يتم العثور على نتائج للبحث." },
        data: [], 
        columns: [
            { data: 'name', title: 'الاسم' }, 
            { data: 'supplier_name', title: 'المورد' }, 
            { data: 'quantity', title: 'الكمية الحالية' },
            { data: null, defaultContent: '<input type="number" class="form-control form-control-sm order-quantity" min="1" placeholder="0">', orderable: false }
        ],
        createdRow: function (row, data, dataIndex) {
            const cells = $(row).children('td');
            $(cells[0]).attr('data-label', 'الاسم').addClass('td-name');
            $(cells[1]).attr('data-label', 'المورد:').addClass('td-supplier');
            
            const stockCell = $(cells[2]).attr('data-label', 'الكمية الحالية').addClass('td-stock');
            const orderCell = $(cells[3]).attr('data-label', 'الكمية المطلوبة').addClass('td-order-qty');

            if ($(window).width() < 768) {
                const container = $('<div class="mobile-qty-container"></div>');
                const stockDiv = $('<div><label>الكمية الحالية</label></div>').append(stockCell.contents());
                const orderDiv = $('<div><label>الكمية المطلوبة</label></div>').append(orderCell.contents());
                container.append(stockDiv, orderDiv);
                
                stockCell.empty().append(container);
                orderCell.remove();
            }
        },
        "error": "DT_RowData" 
    });
}

function renderTable(data) {
    dataTable.clear();
    dataTable.rows.add(data);
    dataTable.rows().every(function() {
        const rowNode = this.node();
        const rowData = this.data();
        if (selectionState[rowData.barcode]) {
            $(rowNode).find('.order-quantity').val(selectionState[rowData.barcode].quantity);
        }
    });
    dataTable.draw();
    $('#addItemsBtn').prop('disabled', data.length === 0);
}

function handleAddItems() {
    let itemsAdded = 0;
    dataTable.rows().every(function() {
        const rowNode = this.node();
        const rowData = this.data();
        const quantity = parseInt($(rowNode).find('.order-quantity').val());
        if (quantity && quantity > 0) {
            selectionState[rowData.barcode] = { itemData: rowData, quantity: quantity };
            itemsAdded++;
        }
    });
    if (itemsAdded > 0) {
        updateOrderSummary();
        dataTable.clear().draw();
        $('#searchTerm').val('').focus();
        $('#addItemsBtn').prop('disabled', true);
        showToast(`تمت إضافة ${itemsAdded} صنف للطلب.`);
    } else {
        alert("لم يتم إدخال أي كميات. الرجاء إدخال كمية لصنف واحد على الأقل.");
    }
}

function updateOrderSummary() {
    const count = Object.keys(selectionState).length;
    $('#selectionCount').text(count);
    $('#exportBtn').prop('disabled', count === 0);
    const summaryContent = $('#order-summary-content');
    if (count === 0) {
        summaryContent.html('<p class="placeholder-text text-center">الأصناف المختارة ستظهر هنا.</p>');
        return;
    }
    let listHtml = '<ul id="order-summary-list" class="list-group list-group-flush">';
    for (const barcode in selectionState) {
        const selection = selectionState[barcode];
        listHtml += `<li class="list-group-item d-flex justify-content-between align-items-center"><span class="item-name" title="${selection.itemData.name}">${selection.itemData.name}</span><span class="badge bg-primary rounded-pill">${selection.quantity}</span></li>`;
    }
    listHtml += '</ul>';
    summaryContent.html(listHtml);
}

function getOrderDataForExport() {
    return Object.values(selectionState).map(sel => ({ 
        "الباركود": sel.itemData.barcode, "الكود": sel.itemData.code, "الاسم": sel.itemData.name, 
        "المورد": sel.itemData.supplier_name, "الكمية الحالية": sel.itemData.quantity, "الكمية المطلوبة": sel.quantity 
    }));
}

function downloadOrderExcel() {
    const branchName = currentBranch.name;
    const filename = `طلب_${branchName || 'بدون اسم'}_${new Date().toISOString().slice(0,10)}.xlsx`;
    const data = getOrderDataForExport();
    downloadDataAsExcel(data, filename, "الطلب");
    clearSelection();
}

function downloadDataAsExcel(data, filename, sheetName = "البيانات") {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
}

function clearSelection() {
    selectionState = {};
    updateOrderSummary();
    dataTable.clear().draw();
    $('#addItemsBtn').prop('disabled', true);
}

function handleStockUpdate() {
    const file = $('#stockFile')[0].files[0];
    if (!file) { alert("الرجاء اختيار ملف."); return; }
    loadingOverlay.addClass('active');
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if(jsonData.length < 1) throw new Error("الملف المرفوع لا يحتوي على بيانات.");
            sendUpdatesToBackend(jsonData);
        } catch (err) {
            loadingOverlay.removeClass('active');
            alert("خطأ في قراءة الملف: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function sendUpdatesToBackend(updates) {
    fetch(RESUPPLY_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateStock', username: currentUserData.username, data: updates })
    })
    .then(res => res.json())
    .then(data => {
        loadingOverlay.removeClass('active');
        if (data.status === 'success') {
            $('#update-success').text(data.message).removeClass('d-none');
            $('#update-error').addClass('d-none');
        } else { throw new Error(data.message); }
    }).catch(err => {
        loadingOverlay.removeClass('active');
        $('#update-error').text("فشل التحديث: " + err.message).removeClass('d-none');
        $('#update-success').addClass('d-none');
    });
}

function handleExtractStock() {
    const selectedBranches = $('#extractBranchSelect').val();
    const selectedSuppliers = $('#extractSupplierSelect').val();

    if (!selectedBranches || selectedBranches.length === 0) { alert("الرجاء اختيار فرع واحد على الأقل."); return; }
    if (!selectedSuppliers || selectedSuppliers.length === 0) { alert("الرجاء اختيار مورد واحد على الأقل."); return; }
    
    loadingOverlay.addClass('active');
    const params = {
        branchCodes: selectedBranches.join(','),
        supplierNames: selectedSuppliers.join(',')
    };

    fetchWithAction('getSupplierStock', params)
        .then(data => {
            if (data && data.length > 0) {
                const filename = `رصيد_موردين_${new Date().toISOString().slice(0,10)}.xlsx`;
                downloadDataAsExcel(data, filename, "أرصدة الموردين");
            } else {
                alert("لم يتم العثور على أرصدة تطابق الفروع والموردين المختارين.");
            }
        })
        .catch(handleError)
        .finally(() => loadingOverlay.removeClass('active'));
}

async function fetchWithAction(action, params = {}) {
    const url = new URL(RESUPPLY_API_URL);
    url.searchParams.append('action', action);
    for (const key in params) {
        url.searchParams.append(key, params[key]);
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
    const data = await response.json();
    if (data.status === 'error') throw new Error(data.message);
    return data;
}
function handleError(error) {
    console.error('An error occurred:', error);
    loadingOverlay.removeClass('active');
    alert('حدث خطأ غير متوقع: ' + error.message);
}
function showToast(message) {
    const toastEl = $('<div class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true"></div>');
    toastEl.html(`<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`);
    toastEl.css({ position: 'fixed', bottom: '20px', left: '20px', right: 'auto', zIndex: 1100 });
    $('body').append(toastEl);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
    toastEl.on('hidden.bs.toast', function () { $(this).remove(); });
}
