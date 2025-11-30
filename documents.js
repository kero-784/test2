// documents.js
import { state } from './state.js';
import { findByKey, _t } from './utils.js';

/**
 * Injects HTML into the print area and triggers the browser print dialog.
 */
export const printContent = (content) => { 
    const printArea = document.getElementById('print-area');
    if (printArea) {
        printArea.innerHTML = content; 
        setTimeout(() => window.print(), 200); 
    }
};

export const generateReceiveDocument = (data) => { 
    const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'Unknown Supplier' }; 
    const branch = findByKey(state.branches, 'branchCode', data.branchCode) || { branchName: 'Unknown Branch' }; 
    let itemsHtml = '', totalValue = 0; 
    
    data.items.forEach(item => { 
        const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); 
        totalValue += itemTotal; 
        itemsHtml += `
            <tr>
                <td>${item.itemCode}</td>
                <td>${item.itemName}</td>
                <td>${item.batchNo || '-'}</td>
                <td>${item.expiryDate || '-'}</td>
                <td>${parseFloat(item.quantity).toFixed(3)}</td>
                <td>${itemTotal.toFixed(2)}</td>
            </tr>`; 
    }); 
    
    const content = `
        <div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}">
            <h2>Goods Received Note (GRN)</h2>
            <div style="display:flex; justify-content:space-between;">
                <div>
                    <p><strong>GRN No:</strong> ${data.batchId}</p>
                    <p><strong>Invoice Ref:</strong> ${data.invoiceNumber}</p>
                    <p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p>
                </div>
                <div>
                    <p><strong>Supplier:</strong> ${supplier.name}</p>
                    <p><strong>Branch:</strong> ${branch.branchName}</p>
                </div>
            </div>
            <hr>
            <table>
                <thead><tr><th>Code</th><th>Item</th><th>Batch</th><th>Expiry</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot><tr><td colspan="5" style="text-align:right;"><strong>Total Value:</strong></td><td><strong>${totalValue.toFixed(2)}</strong></td></tr></tfoot>
            </table>
            <hr>
            <p><strong>Notes:</strong> ${data.notes || ''}</p>
            <br><br>
            <div style="display:flex; justify-content:space-between;">
                <p>Received By: _________________</p>
                <p>Verified By: _________________</p>
            </div>
        </div>`; 
    printContent(content); 
};

export const generateTransferDocument = (data) => { 
    const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'Unknown' }; 
    const toBranch = findByKey(state.branches, 'branchCode', data.toBranchCode) || { branchName: 'Unknown' }; 
    let itemsHtml = ''; 
    
    data.items.forEach(item => { 
        itemsHtml += `
            <tr>
                <td>${item.itemCode}</td>
                <td>${item.itemName}</td>
                <td>${parseFloat(item.quantity).toFixed(3)}</td>
            </tr>`; 
    }); 
    
    const content = `
        <div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}">
            <h2>Internal Transfer Order</h2>
            <p><strong>Ref No:</strong> ${data.batchId}</p>
            <p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p>
            <hr>
            <p><strong>From:</strong> ${fromBranch.branchName}</p>
            <p><strong>To:</strong> ${toBranch.branchName}</p>
            <hr>
            <table>
                <thead><tr><th>Code</th><th>Item</th><th>Qty</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <br>
            <p><strong>Notes:</strong> ${data.notes || ''}</p>
            <br><br>
            <div style="display:flex; justify-content:space-between;">
                <p>Sender Signature: _________________</p>
                <p>Receiver Signature: _________________</p>
            </div>
        </div>`; 
    printContent(content); 
};

export const generateIssueDocument = (data) => { 
    const fromBranch = findByKey(state.branches, 'branchCode', data.fromBranchCode) || { branchName: 'Unknown' }; 
    const toSection = findByKey(state.sections, 'sectionCode', data.sectionCode) || { sectionName: 'Unknown' }; 
    let itemsHtml = ''; 
    
    data.items.forEach(item => { 
        itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${parseFloat(item.quantity).toFixed(3)}</td></tr>`; 
    }); 
    
    const content = `
        <div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}">
            <h2>Stock Issue Note</h2>
            <p><strong>Issue Ref:</strong> ${data.ref}</p>
            <p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p>
            <hr>
            <p><strong>From Branch:</strong> ${fromBranch.branchName}</p>
            <p><strong>To Section:</strong> ${toSection.sectionName}</p>
            <hr>
            <table>
                <thead><tr><th>Code</th><th>Item</th><th>Qty</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <br>
            <p><strong>Notes:</strong> ${data.notes || ''}</p>
            <br><br>
            <p>Issued By: _________________</p>
        </div>`; 
    printContent(content); 
};

export const generatePODocument = (data) => { 
    const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'Unknown' }; 
    let itemsHtml = '', totalValue = 0; 
    
    data.items.forEach(item => { 
        const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0); 
        totalValue += itemTotal; 
        itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${parseFloat(item.quantity).toFixed(3)}</td><td>${parseFloat(item.cost).toFixed(2)}</td><td>${itemTotal.toFixed(2)}</td></tr>`; 
    }); 
    
    const content = `
        <div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}">
            <h2>Purchase Order</h2>
            <p><strong>PO Number:</strong> ${data.poId}</p>
            <p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p>
            <p><strong>Supplier:</strong> ${supplier.name}</p>
            <hr>
            <table>
                <thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot><tr><td colspan="4" style="text-align:right;"><strong>Total:</strong></td><td><strong>${totalValue.toFixed(2)}</strong></td></tr></tfoot>
            </table>
            <br>
            <p><strong>Notes:</strong> ${data.notes || ''}</p>
            <br><br>
            <p>Authorized By: ${data.createdBy || '_________________'}</p>
        </div>`; 
    printContent(content); 
};

export const generatePaymentVoucher = (data) => { 
    const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'Unknown' }; 
    let invoicesHtml = ''; 
    
    data.payments.forEach(p => { 
        invoicesHtml += `<tr><td>${p.invoiceNumber}</td><td>${p.amount.toFixed(2)}</td></tr>`; 
    }); 
    
    const content = `
        <div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}">
            <h2>Payment Voucher</h2>
            <p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p>
            <p><strong>Payee:</strong> ${supplier.name}</p>
            <p><strong>Method:</strong> ${data.method}</p>
            <hr>
            <h3>Payment Allocation</h3>
            <table>
                <thead><tr><th>Invoice Ref</th><th>Amount Paid</th></tr></thead>
                <tbody>${invoicesHtml}</tbody>
                <tfoot><tr><td style="text-align:right;"><strong>Total Paid:</strong></td><td><strong>${data.totalAmount.toFixed(2)}</strong></td></tr></tfoot>
            </table>
            <br><br>
            <p>Signature: _________________</p>
        </div>`; 
    printContent(content); 
};

export const generateReturnDocument = (data) => {
    const supplier = findByKey(state.suppliers, 'supplierCode', data.supplierCode) || { name: 'Unknown' };
    let itemsHtml = '', totalValue = 0;

    data.items.forEach(item => {
        const val = item.quantity * item.cost;
        totalValue += val;
        itemsHtml += `<tr><td>${item.itemCode}</td><td>${item.itemName}</td><td>${item.quantity.toFixed(3)}</td><td>${val.toFixed(2)}</td></tr>`;
    });

    const content = `
        <div class="printable-document card" dir="${state.currentLanguage === 'ar' ? 'rtl' : 'ltr'}">
            <h2>Return to Supplier Note</h2>
            <p><strong>Ref:</strong> ${data.ref}</p>
            <p><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</p>
            <p><strong>To Supplier:</strong> ${supplier.name}</p>
            <hr>
            <table>
                <thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Value</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot><tr><td colspan="3" style="text-align:right;">Total Credit</td><td>${totalValue.toFixed(2)}</td></tr></tfoot>
            </table>
            <p><strong>Reason:</strong> ${data.notes || ''}</p>
        </div>`;
    printContent(content);
};