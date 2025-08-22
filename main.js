// --- CONFIGURATION ---
const RESUPPLY_API_URL = 'https://script.google.com/macros/s/AKfycby5U249gcUs4UTldvH1_1Ty4hDI_Hw8Dbyu8QF2__4V8xm0ikDPEODQOu8vykFVi4gAjA/exec'; 

// --- GLOBAL STATE ---
let currentBranch = null; 
let allBranches = [];
let allSuppliers = [];
let dataTable;
let selectionState = {};
const loadingOverlay = $('#loading-overlay');
let suppliersInitialized = false;
let selectedBranchCodesForReport = []; 
let selectedSupplierNamesForReport = [];

// --- BARCODE SCANNER STATE ---
let scannerStream = null;
let isScanning = false;
let scannerFacingMode = 'environment';
let barcodeDetector = null;
let detectionInterval = null;


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

    // Scanner Initialization
    if (!isBarcodeDetectionSupported()) {
        $('#scanBarcodeBtn').hide();
    } else {
        initializeBarcodeDetector();
    }
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
    $('#openBranchModalBtn').on('click', openBranchSelectionModal);
    $('#saveBranchSelectionBtn').on('click', saveBranchSelection);
    $('#branchSearchInput').on('keyup', filterBranchesInModal);
    $('#modalSelectAllBranches').on('click', () => toggleAllBranchesInModal(true));
    $('#modalDeselectAllBranches').on('click', () => toggleAllBranchesInModal(false));
    $('#openSupplierModalBtn').on('click', openSupplierSelectionModal);
    $('#saveSupplierSelectionBtn').on('click', saveSupplierSelection);
    $('#supplierSearchInput').on('keyup', filterSuppliersInModal);
    $('#modalSelectAllSuppliers').on('click', () => toggleAllSuppliersInModal(true));
    $('#modalDeselectAllSuppliers').on('click', () => toggleAllSuppliersInModal(false));
    $('#stockOperator').on('change', function() { $('#stockValue').prop('disabled', $(this).val() === 'all'); });
    $('#extractStockExcelBtn').on('click', () => handleExtractStock('excel'));
    $('#extractStockPdfBtn').on('click', () => handleExtractStock('pdf'));
    $('#printPdfBtn').on('click', () => {
        const title = $('#pdf-preview-modal-title').text();
        $('#pdf-preview-modal-body').attr('data-print-title', title);
        window.print();
    });

    // Barcode Scanner Event Listeners
    $('#scanBarcodeBtn').on('click', startScanner);
    $('#scannerSwitchBtn').on('click', switchScannerCamera);
    $('#barcode-scanner-modal').on('hidden.bs.modal', stopScanner);
}

function fetchBranches() { /* ... unchanged ... */ }
function setBranch(branch) { /* ... unchanged ... */ }
function handleBranchSelection() { /* ... unchanged ... */ }
function initializeSuppliers() { /* ... unchanged ... */ }
function initializeExtractTab() { /* ... unchanged ... */ }
function openBranchSelectionModal() { /* ... unchanged ... */ }
function saveBranchSelection() { /* ... unchanged ... */ }
function filterBranchesInModal() { /* ... unchanged ... */ }
function toggleAllBranchesInModal(select) { /* ... unchanged ... */ }
function openSupplierSelectionModal() { /* ... unchanged ... */ }
function saveSupplierSelection() { /* ... unchanged ... */ }
function filterSuppliersInModal() { /* ... unchanged ... */ }
function toggleAllSuppliersInModal(select) { /* ... unchanged ... */ }
function performSearch(params) { /* ... unchanged ... */ }
function fetchData(params = {}) { /* ... unchanged ... */ }
function initializeDataTable() { /* ... unchanged ... */ }
function renderTable(data) { /* ... unchanged ... */ }
function handleAddItems() { /* ... unchanged ... */ }
function updateOrderSummary() { /* ... unchanged ... */ }
function getOrderDataForExport() { /* ... unchanged ... */ }
function downloadOrderExcel() { /* ... unchanged ... */ }
function downloadDataAsExcel(data, filename, sheetName = "البيانات") { /* ... unchanged ... */ }
function clearSelection() { /* ... unchanged ... */ }

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
            const cleanedData = jsonData.filter(row => row.length > 0 && row.some(cell => cell !== null && cell !== ''));
            if (cleanedData.length < 1) { throw new Error("الملف المرفوع فارغ أو يحتوي على صفوف فارغة فقط."); }
            const payload = { action: 'updateStock', username: currentUserData.username, data: cleanedData };
            postWithAction(payload);
        } catch (err) {
            loadingOverlay.removeClass('active');
            alert("خطأ في قراءة الملف: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleExtractStock(format) { /* ... unchanged ... */ }
function renderPdfPreview({ headers, data }) { /* ... unchanged ... */ }
async function fetchWithAction(action, params = {}) { /* ... unchanged ... */ }
async function postWithAction(payload = {}) { /* ... unchanged ... */ }
function handleError(error) { /* ... unchanged ... */ }
function showToast(message) { /* ... unchanged ... */ }


// --- BARCODE SCANNER INTEGRATION ---

function isBarcodeDetectionSupported() {
    return 'BarcodeDetector' in window;
}

async function initializeBarcodeDetector() {
    try {
        const supportedFormats = await BarcodeDetector.getSupportedFormats();
        if (supportedFormats.length > 0) {
            barcodeDetector = new BarcodeDetector({ formats: supportedFormats });
        } else {
            $('#scanBarcodeBtn').hide();
            console.warn("Barcode detection supported, but no formats available.");
        }
    } catch (err) {
        $('#scanBarcodeBtn').hide();
        console.error("Error initializing BarcodeDetector:", err);
    }
}

function startScanner() {
    $('#scanner-error').addClass('d-none');
    new bootstrap.Modal('#barcode-scanner-modal').show();
    startScannerCamera();
}

async function startScannerCamera() {
    if (isScanning || !barcodeDetector) return;
    
    stopScanner(); // Ensure previous stream is stopped

    const constraints = { video: { facingMode: scannerFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } } };
    try {
        scannerStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = $('#video-scanner')[0];
        video.srcObject = scannerStream;
        await video.play();
        isScanning = true;
        detectBarcodes();
    } catch (err) {
        console.error("Camera error:", err);
        $('#scanner-error').text(`خطأ في الكاميرا: ${err.message}`).removeClass('d-none');
    }
}

function stopScanner() {
    isScanning = false;
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    if (scannerStream) {
        scannerStream.getTracks().forEach(track => track.stop());
    }
    const video = $('#video-scanner')[0];
    video.srcObject = null;
    scannerStream = null;
}

function switchScannerCamera() {
    scannerFacingMode = scannerFacingMode === 'environment' ? 'user' : 'environment';
    startScannerCamera();
}

function detectBarcodes() {
    if (!isScanning) return;
    
    detectionInterval = setInterval(async () => {
        if (!isScanning) return;
        try {
            const video = $('#video-scanner')[0];
            if (video.readyState < 2) return; // Wait for video to be ready
            
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes.length > 0) {
                isScanning = false; // Stop further scanning once one is found
                handleBarcodeDetection(barcodes[0]);
            }
        } catch (error) {
            console.error('Barcode detection error:', error);
            // Don't show error to user for intermittent detection issues
        }
    }, 500); // Check every 500ms
}

function handleBarcodeDetection(barcode) {
    if (barcode && barcode.rawValue) {
        navigator.vibrate(100); // Vibrate on success
        $('#searchTerm').val(barcode.rawValue);
        bootstrap.Modal.getInstance($('#barcode-scanner-modal')).hide();
        performSearch({ searchTerm: barcode.rawValue });
    }
}


// --- Full, unchanged functions (for reference) ---
// (The full functions from the original file would go here)
function fetchBranches() { loadingOverlay.addClass('active'); fetchWithAction('getBranches').then(branches => { allBranches = branches; const userString = sessionStorage.getItem('keroUser'); const userData = JSON.parse(userString); const userBranchCode = userData.AssignedBranchCode; if (userBranchCode && allBranches.some(b => String(b.code) === String(userBranchCode))) { const assignedBranch = allBranches.find(b => String(b.code) === String(userBranchCode)); setBranch(assignedBranch); } else { const select = $('#branchSelect'); select.append(new Option('--- اختر فرع ---', '')); branches.forEach(b => select.append(new Option(b.name, b.code))); loadingOverlay.removeClass('active'); } }).catch(handleError); }
function setBranch(branch) { currentBranch = branch; $('#currentBranchName').text(currentBranch.name); $('#branch-selector-view').hide(); $('#main-content').removeClass('d-none'); $('#search-container').removeClass('disabled-overlay'); if (!suppliersInitialized) { initializeSuppliers(); } else { loadingOverlay.removeClass('active'); } }
function handleBranchSelection() { const selectedCode = $(this).val(); if (selectedCode) { loadingOverlay.addClass('active'); const selectedBranch = allBranches.find(b => b.code == selectedCode); setBranch(selectedBranch); } }
function initializeSuppliers() { fetchWithAction('getSuppliers').then(suppliers => { allSuppliers = suppliers; $('#supplierFilter').empty().append(new Option('', '')); suppliers.forEach(s => $('#supplierFilter').append(new Option(s, s))); $('#supplierFilter').select2({ placeholder: "اختر مورد...", theme: "bootstrap-5", dir: "rtl", allowClear: true }); initializeExtractTab(); suppliersInitialized = true; loadingOverlay.removeClass('active'); }).catch(handleError); }
function initializeExtractTab() { const branchContainer = $('#branchListContainer'); branchContainer.empty(); allBranches.forEach(branch => { branchContainer.append(`<label class="list-group-item branch-item"><input class="form-check-input me-2" type="checkbox" value="${branch.code}">${branch.name}</label>`); }); const supplierContainer = $('#supplierListContainer'); supplierContainer.empty(); allSuppliers.forEach(supplier => { supplierContainer.append(`<label class="list-group-item supplier-item"><input class="form-check-input me-2" type="checkbox" value="${supplier}">${supplier}</label>`); }); }
function openBranchSelectionModal() { $('#branchListContainer .form-check-input').each(function() { $(this).prop('checked', selectedBranchCodesForReport.includes($(this).val())); }); new bootstrap.Modal('#branch-selection-modal').show(); }
function saveBranchSelection() { selectedBranchCodesForReport = []; $('#branchListContainer .form-check-input:checked').each(function() { selectedBranchCodesForReport.push($(this).val()); }); $('#branchSelectionCount').text(selectedBranchCodesForReport.length); bootstrap.Modal.getInstance($('#branch-selection-modal')).hide(); }
function filterBranchesInModal() { const searchTerm = $('#branchSearchInput').val().toLowerCase(); $('#branchListContainer .branch-item').each(function() { $(this).toggle($(this).text().trim().toLowerCase().includes(searchTerm)); }); }
function toggleAllBranchesInModal(select) { $('#branchListContainer .branch-item:visible .form-check-input').prop('checked', select); }
function openSupplierSelectionModal() { $('#supplierListContainer .form-check-input').each(function() { $(this).prop('checked', selectedSupplierNamesForReport.includes($(this).val())); }); new bootstrap.Modal('#supplier-selection-modal').show(); }
function saveSupplierSelection() { selectedSupplierNamesForReport = []; $('#supplierListContainer .form-check-input:checked').each(function() { selectedSupplierNamesForReport.push($(this).val()); }); $('#supplierSelectionCount').text(selectedSupplierNamesForReport.length); bootstrap.Modal.getInstance($('#supplier-selection-modal')).hide(); }
function filterSuppliersInModal() { const searchTerm = $('#supplierSearchInput').val().toLowerCase(); $('#supplierListContainer .supplier-item').each(function() { $(this).toggle($(this).text().trim().toLowerCase().includes(searchTerm)); }); }
function toggleAllSuppliersInModal(select) { $('#supplierListContainer .supplier-item:visible .form-check-input').prop('checked', select); }
function performSearch(params) { if (params.searchTerm && (!params.searchTerm || params.searchTerm.trim().length < 2)) { alert('الرجاء إدخال حرفين على الأقل للبحث.'); return; } if (params.searchTerm) { $('#supplierFilter').val(null).trigger('change.select2'); } fetchData(params); }
function fetchData(params = {}) { if (!currentBranch) { alert("الرجاء اختيار فرع أولاً."); return; } loadingOverlay.addClass('active'); params.branchCode = currentBranch.code; fetchWithAction('searchItems', params).then(renderTable).catch(handleError).finally(() => loadingOverlay.removeClass('active')); }
function initializeDataTable() { dataTable = $('#itemsTable').DataTable({ responsive: true, searching: false, lengthChange: false, info: false, paging: false, language: { "url": "//cdn.datatables.net/plug-ins/1.13.6/i18n/ar.json", "emptyTable": "لم يتم العثور على نتائج للبحث." }, data: [], columns: [{ data: 'name' }, { data: 'supplier_name' }, { data: 'quantity' }, { data: null, defaultContent: '<input type="number" class="form-control form-control-sm order-quantity" min="1" placeholder="0">', orderable: false }], createdRow: function (row, data, dataIndex) { const cells = $(row).children('td'); $(cells[0]).attr('data-label', 'الاسم').addClass('td-name'); $(cells[1]).attr('data-label', 'المورد:').addClass('td-supplier'); const stockCell = $(cells[2]).attr('data-label', 'الكمية الحالية').addClass('td-stock'); const orderCell = $(cells[3]).attr('data-label', 'الكمية المطلوبة').addClass('td-order-qty'); if ($(window).width() < 768) { const container = $('<div class="mobile-qty-container"></div>'); const stockDiv = $('<div><label>الكمية الحالية</label></div>').append(stockCell.contents()); const orderDiv = $('<div><label>الكمية المطلوبة</label></div>').append(orderCell.contents()); container.append(stockDiv, orderDiv); stockCell.empty().append(container); orderCell.remove(); } } }); }
function renderTable(data) { dataTable.clear().rows.add(data).draw(); $('#addItemsBtn').prop('disabled', data.length === 0); }
function handleAddItems() { let itemsAdded = 0; dataTable.rows().every(function() { const rowData = this.data(); const quantity = parseInt($(this.node()).find('.order-quantity').val()); if (quantity > 0) { selectionState[rowData.barcode] = { itemData: rowData, quantity: quantity }; itemsAdded++; } }); if (itemsAdded > 0) { updateOrderSummary(); dataTable.clear().draw(); $('#searchTerm').val('').focus(); $('#addItemsBtn').prop('disabled', true); showToast(`تمت إضافة ${itemsAdded} صنف للطلب.`); } else { alert("لم يتم إدخال أي كميات."); } }
function updateOrderSummary() { const count = Object.keys(selectionState).length; $('#selectionCount').text(count); $('#exportBtn').prop('disabled', count === 0); const summaryContent = $('#order-summary-content'); if (count === 0) { summaryContent.html('<p class="placeholder-text text-center">الأصناف المختارة ستظهر هنا.</p>'); return; } let listHtml = '<ul id="order-summary-list" class="list-group list-group-flush">'; for (const barcode in selectionState) { const selection = selectionState[barcode]; listHtml += `<li class="list-group-item d-flex justify-content-between align-items-center"><span class="item-name" title="${selection.itemData.name}">${selection.itemData.name}</span><span class="badge bg-primary rounded-pill">${selection.quantity}</span></li>`; } listHtml += '</ul>'; summaryContent.html(listHtml); }
function getOrderDataForExport() { return Object.values(selectionState).map(sel => ({ "الباركود": sel.itemData.barcode, "الكود": sel.itemData.code, "الاسم": sel.itemData.name, "المورد": sel.itemData.supplier_name, "الكمية الحالية": sel.itemData.quantity, "الكمية المطلوبة": sel.quantity })); }
function downloadOrderExcel() { const branchName = currentBranch.name; const filename = `طلب_${branchName || 'بدون اسم'}_${new Date().toISOString().slice(0,10)}.xlsx`; const data = getOrderDataForExport(); downloadDataAsExcel(data, filename, "الطلب"); clearSelection(); }
function downloadDataAsExcel(data, filename, sheetName = "البيانات") { const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheetName); XLSX.writeFile(wb, filename); }
function clearSelection() { selectionState = {}; updateOrderSummary(); dataTable.clear().draw(); $('#addItemsBtn').prop('disabled', true); }
function handleExtractStock(format) { if (selectedBranchCodesForReport.length === 0) { alert("الرجاء اختيار فرع واحد على الأقل."); return; } if (selectedSupplierNamesForReport.length === 0) { alert("الرجاء اختيار مورد واحد على الأقل."); return; } loadingOverlay.addClass('active'); const params = { branchCodes: selectedBranchCodesForReport.join(','), supplierNames: selectedSupplierNamesForReport.join(','), stockOperator: $('#stockOperator').val(), stockValue: $('#stockValue').val() || 0 }; fetchWithAction('getSupplierStock', params).then(response => { if (!response.data || response.data.length === 0) { alert("لم يتم العثور على بيانات تطابق معايير البحث."); return; } if (format === 'excel') { const filename = `تقرير_رصيد_الموردين_${new Date().toISOString().slice(0,10)}.xlsx`; downloadDataAsExcel(response.data, filename, "تقرير الرصيد"); } else if (format === 'pdf') { renderPdfPreview(response); } }).catch(handleError).finally(() => loadingOverlay.removeClass('active')); }
function renderPdfPreview({ headers, data }) { let table = '<table class="table table-bordered table-striped table-sm">'; table += '<thead><tr>'; headers.forEach(h => table += `<th>${h}</th>`); table += '</tr></thead>'; table += '<tbody>'; data.forEach(row => { table += '<tr>'; headers.forEach(header => { table += `<td>${row[header] !== undefined ? row[header] : ''}</td>`; }); table += '</tr>'; }); table += '</tbody></table>'; const title = `تقرير رصيد الموردين - تاريخ: ${new Date().toLocaleDateString('ar-EG')}`; $('#pdf-preview-modal-title').text(title); $('#pdf-preview-modal-body').html(table); new bootstrap.Modal('#pdf-preview-modal').show(); }
async function fetchWithAction(action, params = {}) { const url = new URL(RESUPPLY_API_URL); url.searchParams.append('action', action); for (const key in params) { if(params[key] !== null && params[key] !== undefined) { url.searchParams.append(key, params[key]); } } const response = await fetch(url); if (!response.ok) throw new Error(`Network error: ${response.statusText}`); const data = await response.json(); if (data.status === 'error') throw new Error(data.message); return data; }
async function postWithAction(payload = {}) { try { const response = await fetch(RESUPPLY_API_URL, { method: 'POST', body: JSON.stringify(payload) }); if (!response.ok) throw new Error(`Network error: ${response.statusText}`); const data = await response.json(); if (data.status === 'error') throw new Error(data.message); if (payload.action === 'updateStock') { loadingOverlay.removeClass('active'); $('#update-success').text(data.message).removeClass('d-none'); $('#update-error').addClass('d-none'); } return data; } catch(err) { handleError(err); } }
function handleError(error) { console.error('An error occurred:', error); loadingOverlay.removeClass('active'); alert('حدث خطأ: ' + error.message); }
function showToast(message) { const toastEl = $('<div class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true"></div>'); toastEl.html(`<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`); toastEl.css({ position: 'fixed', bottom: '20px', left: '20px', right: 'auto', zIndex: 1100 }); $('body').append(toastEl); const toast = new bootstrap.Toast(toastEl); toast.show(); toastEl.on('hidden.bs.toast', function () { $(this).remove(); }); }