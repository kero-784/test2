// --- START OF FILE financials_extension.js ---

import { state } from './state.js';
import { postData, showToast, findByKey, formatCurrency, formatDate, populateOptions, _t } from './utils.js';
import { calculateSupplierFinancials } from './calculations.js';
import * as Documents from './documents.js';

const finState = {
    initialized: false,
    invoiceSelections: new Set()
};

// --- INITIALIZATION ---
function initFinancialsModule() {
    if (finState.initialized) return;
    if (!document.getElementById('main-nav')) return;

    const user = state.currentUser;
    if (!user) return;

    // Permission Check: opRecordPayment OR Admin
    const canAccess = user.permissions?.opRecordPayment === true || user.RoleName === 'Admin';
    if (!canAccess) return;

    injectFinancialsUI();
    attachFinancialListeners();
    finState.initialized = true;
    console.log("Financials Module Loaded (Standalone)");
}

// --- UI INJECTION ---
function injectFinancialsUI() {
    // 1. Sidebar Link
    const sidebar = document.getElementById('main-nav');
    if (sidebar && !document.getElementById('nav-financials-link')) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `<a href="#" id="nav-financials-link" data-view="financials-ext">
            <svg style="width:22px;height:22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span style="margin-left:10px;">Financials & Reports</span>
        </a>`;
        
        // Insert after Purchasing
        const refEntry = sidebar.querySelector('a[data-view="purchasing"]')?.parentElement;
        if (refEntry) refEntry.after(li);
        else sidebar.appendChild(li);
    }

    // 2. Main View
    const mainContent = document.querySelector('.main-content');
    if (mainContent && !document.getElementById('view-financials-ext')) {
        const viewDiv = document.createElement('div');
        viewDiv.id = 'view-financials-ext';
        viewDiv.className = 'view';
        
        viewDiv.innerHTML = `
            <div class="sub-nav">
                <button class="sub-nav-item active" data-target="fin-payment">Record Payment</button>
                <button class="sub-nav-item" data-target="fin-statement">Supplier Statement</button>
            </div>

            <!-- TAB 1: RECORD PAYMENT -->
            <div id="tab-fin-payment" class="fin-tab" style="display:block;">
                <div class="card">
                    <h2>Record a Payment</h2>
                    <form id="ext-form-payment">
                        <div class="form-grid">
                            <div class="form-group"><label>Supplier</label><select id="ext-pay-supplier" required></select></div>
                            <div class="form-group"><label>Select Invoices</label><button type="button" id="ext-btn-sel-inv" class="secondary" style="width: 100%;">Select...</button></div>
                            <div class="form-group"><label>Method</label><select id="ext-pay-method" required><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="Cheque">Cheque</option><option value="Credit">Credit</option></select></div>
                        </div>
                        <div id="ext-pay-list-container" class="report-area" style="display:none; margin-top:24px;">
                            <table id="ext-pay-table"><thead><tr><th>Invoice #</th><th>Due</th><th>Pay</th></tr></thead><tbody></tbody><tfoot><tr><td colspan="2">Total:</td><td id="ext-pay-total">0.00</td></tr></tfoot></table>
                        </div>
                        <button type="submit" class="primary" style="margin-top: 24px; width:100%;">Submit Payment</button>
                    </form>
                </div>
            </div>

            <!-- TAB 2: SUPPLIER STATEMENT -->
            <div id="tab-fin-statement" class="fin-tab" style="display:none;">
                <div class="card">
                    <div class="report-generator-controls">
                        <select id="ext-stmt-supplier"></select>
                        <input type="date" id="ext-stmt-start">
                        <input type="date" id="ext-stmt-end">
                        <button id="ext-btn-gen-stmt" class="primary small">Generate</button>
                    </div>
                    <div id="ext-stmt-results" class="printable-area" style="display: none;"></div>
                </div>
            </div>

            <!-- INVOICE MODAL -->
            <div id="ext-inv-modal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header"><h2>Select Invoices</h2><button class="close-button" id="ext-inv-close">×</button></div>
                    <div class="modal-body"><div id="ext-inv-list" class="modal-item-list"></div></div>
                    <div class="modal-footer"><button class="primary" id="ext-inv-confirm">Confirm Selection</button></div>
                </div>
            </div>
        `;
        mainContent.appendChild(viewDiv);
    }
}

// --- LOGIC & LISTENERS ---
function attachFinancialListeners() {
    // 1. Navigation
    document.getElementById('nav-financials-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
        document.getElementById('view-financials-ext').classList.add('active');
        e.currentTarget.classList.add('active');
        refreshFinancialsContext();
    });

    // 2. Tabs
    document.querySelectorAll('#view-financials-ext .sub-nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#view-financials-ext .sub-nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.fin-tab').forEach(t => t.style.display = 'none');
            e.target.classList.add('active');
            document.getElementById(`tab-${e.target.dataset.target}`).style.display = 'block';
        });
    });

    // 3. Payment Logic
    document.getElementById('ext-btn-sel-inv')?.addEventListener('click', openInvoiceModal);
    document.getElementById('ext-inv-close')?.addEventListener('click', () => document.getElementById('ext-inv-modal').classList.remove('active'));
    document.getElementById('ext-inv-confirm')?.addEventListener('click', () => {
        document.getElementById('ext-inv-modal').classList.remove('active');
        renderPaymentTable();
    });

    // 4. Modal Checkbox Handling
    document.getElementById('ext-inv-list')?.addEventListener('change', (e) => {
        if(e.target.type === 'checkbox') {
            const num = e.target.dataset.number;
            e.target.checked ? finState.invoiceSelections.add(num) : finState.invoiceSelections.delete(num);
        }
    });

    // 5. Submit Payment
    document.getElementById('ext-form-payment')?.addEventListener('submit', handleSubmitPayment);

    // 6. Statement Generation
    document.getElementById('ext-btn-gen-stmt')?.addEventListener('click', () => {
        const sup = document.getElementById('ext-stmt-supplier').value;
        const d1 = document.getElementById('ext-stmt-start').value;
        const d2 = document.getElementById('ext-stmt-end').value;
        renderSupplierStatement(sup, d1, d2);
    });

    // 7. Global Button Interception (Pay Supplier / Print Voucher)
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if(!btn) return;

        // Shortcut from Master Data
        if(btn.classList.contains('btn-pay-supplier')) {
            const supCode = btn.dataset.supplier;
            document.getElementById('nav-financials-link').click();
            setTimeout(() => {
                document.getElementById('ext-pay-supplier').value = supCode;
                openInvoiceModal();
            }, 100);
        }

        // Print Voucher History
        if(btn.classList.contains('btn-print-voucher')) {
            const pid = btn.dataset.id;
            const lines = state.payments.filter(p => p.paymentId === pid);
            if(lines.length > 0) {
                const d = lines[0];
                Documents.generatePaymentVoucher({
                    supplierCode: d.supplierCode, date: d.date, method: d.method,
                    totalAmount: lines.reduce((s,x)=>s+x.amount,0), payments: lines
                });
            }
        }
        
        // Export Statement
        if(btn.id === 'ext-btn-export-stmt') {
            // Check global export function availability or define local logic
             const supName = document.querySelector('#ext-stmt-results h3')?.innerText || 'Statement';
             if(window.XLSX) {
                 const tbl = document.getElementById('table-supplier-statement');
                 const wb = XLSX.utils.table_to_book(tbl);
                 XLSX.writeFile(wb, `${supName}.xlsx`);
             }
        }
    });
}

function refreshFinancialsContext() {
    const pSel = document.getElementById('ext-pay-supplier');
    const sSel = document.getElementById('ext-stmt-supplier');
    if(pSel && pSel.options.length <= 1) populateOptions(pSel, state.suppliers, 'Select Supplier', 'supplierCode', 'name');
    if(sSel && sSel.options.length <= 1) populateOptions(sSel, state.suppliers, 'Select Supplier', 'supplierCode', 'name');
}

// --- PAYMENT LOGIC ---
function openInvoiceModal() {
    const sup = document.getElementById('ext-pay-supplier').value;
    const list = document.getElementById('ext-inv-list');
    list.innerHTML = '';
    
    if(!sup) { list.innerHTML = '<p>Select a supplier first.</p>'; return; }
    
    const fin = calculateSupplierFinancials();
    const invoices = fin[sup]?.invoices || {};
    const unpaid = Object.values(invoices).filter(i => i.status !== 'Paid');

    if(unpaid.length === 0) { list.innerHTML = '<p>No unpaid invoices.</p>'; }
    else {
        unpaid.forEach(inv => {
            const checked = finState.invoiceSelections.has(inv.number) ? 'checked' : '';
            list.innerHTML += `<div class="modal-item"><input type="checkbox" id="inv-${inv.number}" data-number="${inv.number}" ${checked}><label for="inv-${inv.number}"><strong>${inv.number}</strong><br><small>Due: ${formatCurrency(inv.balance)}</small></label></div>`;
        });
    }
    document.getElementById('ext-inv-modal').classList.add('active');
}

function renderPaymentTable() {
    const tbody = document.querySelector('#ext-pay-table tbody');
    const container = document.getElementById('ext-pay-list-container');
    const sup = document.getElementById('ext-pay-supplier').value;
    
    tbody.innerHTML = '';
    if(finState.invoiceSelections.size === 0 || !sup) { container.style.display = 'none'; return; }

    const fin = calculateSupplierFinancials();
    const invoices = fin[sup]?.invoices || {};
    let total = 0;

    finState.invoiceSelections.forEach(num => {
        const inv = invoices[num];
        if(inv) {
            total += inv.balance;
            tbody.innerHTML += `<tr><td>${inv.number}</td><td>${formatCurrency(inv.balance)}</td><td><input type="number" class="table-input ext-pay-amt" data-inv="${inv.number}" value="${inv.balance.toFixed(2)}"></td></tr>`;
        }
    });
    
    document.getElementById('ext-pay-total').innerText = formatCurrency(total);
    container.style.display = 'block';
}

async function handleSubmitPayment(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const sup = document.getElementById('ext-pay-supplier').value;
    const method = document.getElementById('ext-pay-method').value;
    
    const payments = [];
    document.querySelectorAll('.ext-pay-amt').forEach(inp => {
        const val = parseFloat(inp.value);
        if(val > 0) payments.push({ paymentId: `PAY-${Date.now()}`, date: new Date().toISOString(), supplierCode: sup, invoiceNumber: inp.dataset.inv, amount: val, method });
    });

    if(payments.length === 0) return;

    const payload = { supplierCode: sup, method, date: new Date().toISOString(), totalAmount: payments.reduce((a,b)=>a+b.amount,0), payments };
    
    if(await postData('addPaymentBatch', payload, btn)) {
        showToast('Payment Recorded', 'success');
        finState.invoiceSelections.clear();
        e.target.reset();
        document.getElementById('ext-pay-list-container').style.display = 'none';
        
        // Push to local state manually to update UI instantly
        state.payments.push(...payments);
        
        if(confirm("Print Voucher?")) Documents.generatePaymentVoucher(payload);
    }
}

// --- STATEMENT RENDERER ---
function renderSupplierStatement(code, d1, d2) {
    const container = document.getElementById('ext-stmt-results');
    const sup = findByKey(state.suppliers, 'supplierCode', code);
    if (!sup) return;

    const data = calculateSupplierFinancials()[code];
    const sDate = d1 ? new Date(d1) : null;
    const eDate = d2 ? new Date(d2) : null;
    if(eDate) eDate.setHours(23,59,59);

    let running = 0;
    let html = '';
    
    // Opening Balance
    if (sDate) {
        let openBal = 0;
        data.events.forEach(ev => { if(new Date(ev.date) < sDate) openBal += (ev.debit - ev.credit); });
        running = openBal;
        html += `<tr style="background:#eee"><td>-</td><td>Opening Balance</td><td>-</td><td>-</td><td>-</td><td>${formatCurrency(openBal)}</td><td></td></tr>`;
    }

    data.events.forEach(ev => {
        const d = new Date(ev.date);
        if((!sDate || d >= sDate) && (!eDate || d <= eDate)) {
            running += (ev.debit - ev.credit);
            const btn = (ev.type === 'Pay' && ev.ref) ? `<button class="secondary small btn-print-voucher" data-id="${ev.ref}">Print</button>` : '';
            html += `<tr><td>${formatDate(ev.date)}</td><td>${ev.type}</td><td>${ev.ref}</td><td>${ev.debit||'-'}</td><td>${ev.credit||'-'}</td><td>${formatCurrency(running)}</td><td>${btn}</td></tr>`;
        }
    });

    html += `<tr style="background:#ddd; font-weight:bold"><td colspan="5" style="text-align:right">Closing Balance:</td><td>${formatCurrency(running)}</td><td></td></tr>`;

    container.innerHTML = `
        <div class="printable-document">
            <h3>Statement: ${sup.name}</h3>
            <table id="table-supplier-statement"><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Action</th></tr></thead><tbody>${html}</tbody></table>
            <div style="margin-top:20px; text-align:right;">
                <button class="secondary" id="ext-btn-export-stmt">Export Excel</button>
                <button class="primary btn-pay-supplier" data-supplier="${sup.supplierCode}">Pay Supplier</button>
            </div>
        </div>`;
    container.style.display = 'block';
}

// Auto Init
const interval = setInterval(() => {
    if (state.currentUser && document.getElementById('main-nav')) {
        initFinancialsModule();
        clearInterval(interval);
    }
}, 500);