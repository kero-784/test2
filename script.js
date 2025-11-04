// --- CONFIG & STATE ---
const API_URL = "https://script.google.com/macros/s/AKfycbwmmKiZjdk30LvEJM0ZzH6U4P8kknT9c0BGErar6aQzqoDDoE4qDBOwdN4XxCQ8pYIS/exec"; // <-- IMPORTANT
let currentUser = null;
let appData = { items: [], suppliers: [] };

// --- DOM ELEMENTS ---
const loader = document.getElementById('loader');
const loginContainer = document.getElementById('login-container');
const mainAppContainer = document.getElementById('main-app-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const sidebarLinks = document.querySelectorAll('#sidebar .nav-link');
const allPages = document.querySelectorAll('.app-page');
const navbarContent = document.getElementById('navbar-content');

// --- API HELPER ---
async function callApi(action, payload = {}) {
    loader.style.display = 'flex';
    try {
        const response = await fetch(API_URL, {
            method: 'POST', mode: 'cors', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action, payload,
                actingUserId: currentUser ? currentUser.UserID : null,
                actingUserRole: currentUser ? currentUser.Role : null,
            })
        });
        const result = await response.json();
        if (result.status === 'error') throw new Error(result.message);
        return result;
    } catch (error) {
        console.error('API Error:', error);
        alert('An error occurred: ' + error.message);
        return null;
    } finally {
        loader.style.display = 'none';
    }
}

// --- SESSION & UI MANAGEMENT ---
function checkSession() {
    const userData = sessionStorage.getItem('meatStockUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        loginSuccess();
    }
}

async function loginSuccess() {
    loginContainer.style.display = 'none';
    mainAppContainer.classList.remove('d-none');
    
    navbarContent.innerHTML = `
        <div class="navbar-text text-white me-3">Welcome, ${currentUser.UserName} (${currentUser.AssignedBranchID})</div>
        <button class="btn btn-outline-danger" id="logout-btn">Logout</button>`;
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    if (currentUser.Role === 'Admin') {
        document.getElementById('admin-nav-link').classList.remove('d-none');
    }
    
    await loadInitialData();
    navigateTo('page-dashboard');
}

function logout() {
    sessionStorage.removeItem('meatStockUser');
    window.location.reload();
}

async function loadInitialData() {
    const itemsResult = await callApi('getRecords', { sheetName: 'Items' });
    if (itemsResult) appData.items = itemsResult.data;
    
    const suppliersResult = await callApi('getRecords', { sheetName: 'Suppliers' });
    if (suppliersResult) appData.suppliers = suppliersResult.data;
}

// --- SPA NAVIGATION ---
function navigateTo(pageId) {
    allPages.forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    
    sidebarLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(`#sidebar .nav-link[data-page="${pageId}"]`).classList.add('active');
    
    switch (pageId) {
        case 'page-dashboard': renderDashboard(); break;
        case 'page-invoices': renderInvoicesPage(); break;
        case 'page-admin': renderAdminPage(); break;
    }
}

// --- PAGE RENDERERS ---
async function renderDashboard() {
    const page = document.getElementById('page-dashboard');
    page.innerHTML = `<h2>Dashboard</h2>`;
    const result = await callApi('getDashboardData');
    if (!result || !result.data) return;
    
    const { pendingInvoices } = result.data;
    if (currentUser.Role === 'Admin' && pendingInvoices.length > 0) {
        let approvalHtml = `<div class="card mt-4"><div class="card-header"><h4>Invoices Pending Approval</h4></div><div class="card-body">`;
        approvalHtml += `<table class="table"><thead><tr><th>ID</th><th>Supplier</th><th>Branch</th><th>Date</th><th>Action</th></tr></thead><tbody>`;
        pendingInvoices.forEach(inv => {
            approvalHtml += `<tr>
                <td>${inv.InvoiceID}</td>
                <td>${appData.suppliers.find(s=>s.SupplierID === inv.SupplierID)?.SupplierName || inv.SupplierID}</td>
                <td>${inv.BranchID}</td>
                <td>${new Date(inv.DateReceived).toLocaleDateString()}</td>
                <td><button class="btn btn-sm btn-success" onclick="approveInvoice('${inv.InvoiceID}')">Approve</button></td>
            </tr>`;
        });
        approvalHtml += `</tbody></table></div></div>`;
        page.innerHTML += approvalHtml;
    } else {
        page.innerHTML += `<p class="mt-3">Welcome to your stock management dashboard.</p>`;
    }
}

function renderInvoicesPage() {
    const page = document.getElementById('page-invoices');
    const supplierOptions = appData.suppliers.map(s => `<option value="${s.SupplierID}">${s.SupplierName}</option>`).join('');
    
    page.innerHTML = `
        <h3>Receive New Invoice</h3>
        <form id="invoice-form">
            <div class="mb-3">
                <label for="supplier-select" class="form-label">Supplier</label>
                <select id="supplier-select" class="form-select" required>${supplierOptions}</select>
            </div>
            <h4>Items</h4>
            <div id="invoice-items-container"></div>
            <button type="button" class="btn btn-secondary mt-2" id="add-item-btn"><i class="bi bi-plus-circle"></i> Add Item</button>
            <hr>
            <button type="submit" class="btn btn-primary">Save Invoice</button>
        </form>
    `;
    addItemRow(); // Add the first row
    
    document.getElementById('add-item-btn').addEventListener('click', addItemRow);
    document.getElementById('invoice-form').addEventListener('submit', handleInvoiceSubmit);
}

async function renderAdminPage() {
    const page = document.getElementById('page-admin');
    page.innerHTML = `<h3>User Management</h3>`;
    const result = await callApi('getRecords', { sheetName: 'Users' });
    if(result && result.data){
        let table = `<table class="table"><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Branch</th><th>Status</th></tr></thead><tbody>`;
        result.data.forEach(u => {
            table += `<tr><td>${u.UserID}</td><td>${u.UserName}</td><td>${u.Role}</td><td>${u.AssignedBranchID}</td><td>${u.IsActive ? 'Active' : 'Inactive'}</td></tr>`;
        });
        table += `</tbody></table>`;
        page.innerHTML += table;
    }
}

// --- ACTION FUNCTIONS & EVENT HANDLERS ---
document.addEventListener('DOMContentLoaded', checkSession);

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const userId = document.getElementById('username').value;
    const signInCode = document.getElementById('signInCode').value;
    const result = await callApi('loginUser', { userId, signInCode });
    if (result && result.status === 'success') {
        currentUser = result.data;
        sessionStorage.setItem('meatStockUser', JSON.stringify(currentUser));
        loginSuccess();
    } else {
        loginError.textContent = result ? result.message : 'Login failed.';
        loginError.style.display = 'block';
    }
});

sidebarLinks.forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.page);
}));

async function approveInvoice(invoiceId) {
    if (!confirm(`Are you sure you want to approve invoice ${invoiceId}? This will add items to stock.`)) return;
    const result = await callApi('approveInvoice', { invoiceId });
    if (result && result.status === 'success') {
        alert(result.message);
        renderDashboard(); // Refresh the dashboard
    }
}

async function handleInvoiceSubmit(e) {
    e.preventDefault();
    const payload = {
        supplierId: document.getElementById('supplier-select').value,
        branchId: currentUser.AssignedBranchID,
        items: []
    };
    document.querySelectorAll('.item-row').forEach(row => {
        const subItemId = row.querySelector('.sub-item-select').value;
        const mainItemId = row.querySelector('.main-item-select').value;
        const quantity = parseFloat(row.querySelector('.quantity-input').value);
        const finalItemId = subItemId || mainItemId;
        if (finalItemId && quantity > 0) {
            payload.items.push({ itemId: finalItemId, quantity: quantity });
        }
    });

    if (payload.items.length === 0) return alert('Please add at least one item.');
    
    const result = await callApi('createInvoice', payload);
    if (result) {
        alert(result.message);
        renderInvoicesPage(); // Reset the form
    }
}

function addItemRow() {
    const container = document.getElementById('invoice-items-container');
    const row = document.createElement('div');
    row.className = 'row mb-2 align-items-center item-row';
    const mainItems = appData.items.filter(i => i.ItemType === 'Main');
    let mainOptions = mainItems.map(i => `<option value="${i.ItemID}">${i.ItemName}</option>`).join('');
    
    row.innerHTML = `
        <div class="col-md-4"><select class="form-select main-item-select"><option value="">Select Main Item</option>${mainOptions}</select></div>
        <div class="col-md-4"><select class="form-select sub-item-select"><option value="">(Select Main First)</option></select></div>
        <div class="col-md-3"><input type="number" class="form-control quantity-input" placeholder="Quantity" required min="0.01" step="0.01"></div>
        <div class="col-md-1"><button type="button" class="btn btn-danger btn-sm"><i class="bi bi-trash"></i></button></div>`;

    row.querySelector('.main-item-select').addEventListener('change', (e) => {
        const subSelect = row.querySelector('.sub-item-select');
        const subItems = appData.items.filter(i => i.ParentItemID === e.target.value);
        subSelect.innerHTML = `<option value="">Select Sub Item (Optional)</option>` + subItems.map(i => `<option value="${i.ItemID}">${i.ItemName}</option>`).join('');
    });
    row.querySelector('.btn-danger').addEventListener('click', () => row.remove());
    container.appendChild(row);
}
