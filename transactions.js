import { state, resetStateLists } from './state.js';
import { postData, showToast, _t, generateId, findByKey, requestAdminContext } from './utils.js';
import { 
    renderButcheryListTable, 
    renderReceiveListTable, 
    renderTransferListTable, 
    renderReturnListTable, 
    renderAdjustmentListTable, 
    renderPOListTable,
    renderPendingTransfers, 
    renderInTransitReport,
    renderPendingInvoices 
} from './renderers.js';
import { calculateStockLevels } from './calculations.js';
import { generateReceiveDocument, generateTransferDocument, generateReturnDocument, generatePODocument } from './documents.js';

// --- BUTCHERY (YIELD) ---
export async function handleButcherySubmit(e) {
    if (e) e.preventDefault();
    const btn = e.currentTarget;
    const parentCode = document.getElementById('butchery-parent-code').value;
    let parentQty = parseFloat(document.getElementById('butchery-parent-qty').value); 
    const branchCode = document.getElementById('butchery-branch').value;
    let batchNo = document.getElementById('butchery-batch').value;
    const expiryDate = document.getElementById('butchery-expiry').value;

    if (!parentCode || !parentQty || !branchCode || !expiryDate || state.currentButcheryList.length === 0) {
        showToast('Please fill all fields and add cuts.', 'error');
        return;
    }

    // 1. Calculate Totals
    const totalChildWeight = state.currentButcheryList.reduce((a,b) => a + (parseFloat(b.quantity) || 0), 0);
    const difference = parentQty - totalChildWeight;

    // 2. Logic: Handle Weight Difference
    if (difference > 0.001) {
        // Difference detected.
        const msg = `⚠️ Weight Mismatch Detected!\n\n` +
                    `Input Weight: ${parentQty} kg\n` +
                    `Total Cuts: ${totalChildWeight.toFixed(3)} kg\n` +
                    `Remaining: ${difference.toFixed(3)} kg\n\n` +
                    `• Click OK to PROCEED: The remaining ${difference.toFixed(3)} kg will stay in your stock.\n` +
                    `• Click CANCEL to go back and modify the weights.`;

        if (!confirm(msg)) {
            // User clicked Cancel -> Return to form
            return; 
        }
        
        // User clicked OK -> Proceed, but AUTO-ADJUST input to match output.
        // This ensures the "difference" is never deducted from the database.
        parentQty = totalChildWeight; 
        showToast(`Processed. ${difference.toFixed(3)}kg remains in parent stock.`, 'info');

    } else if (difference < -0.001) {
        showToast(`Error: Output (${totalChildWeight}kg) cannot exceed Input (${parentQty}kg).`, 'error');
        return;
    }

    const stock = calculateStockLevels();
    const parentAvgCost = stock[branchCode]?.[parentCode]?.avgCost || 0;
    
    if(!batchNo) batchNo = `PRD-${Date.now().toString().slice(-8)}`;

    const childItems = state.currentButcheryList.map(c => ({
        itemCode: c.itemCode,
        itemName: c.itemName, 
        quantity: parseFloat(c.quantity),
        cost: parentAvgCost 
    }));

    const payload = {
        parentItemCode: parentCode,
        parentQuantity: parentQty, // This uses the Adjusted Quantity
        branchCode: branchCode,
        childItems: childItems,
        batchNo: batchNo,
        expiryDate: expiryDate,
        notes: `Yield Process`
    };

    const result = await postData('processButchery', payload, btn);
    if (result) {
        showToast('Production Complete!', 'success');
        // Optimistic Update
        const now = new Date().toISOString();
        childItems.forEach(c => state.transactions.push({
            batchId: batchNo, date: now, type: 'production_in', itemCode: c.itemCode, quantity: c.quantity, cost: c.cost, branchCode: branchCode, Status: 'Completed', isApproved: true
        }));
        state.transactions.push({
            batchId: batchNo, date: now, type: 'production_out', itemCode: parentCode, quantity: parentQty, cost: parentAvgCost, branchCode: branchCode, fromBranchCode: branchCode, Status: 'Completed', isApproved: true
        });

        state.currentButcheryList = [];
        document.getElementById('form-butchery').reset();
        document.getElementById('butchery-parent-display').value = '';
        document.getElementById('butchery-parent-code').value = '';
        renderButcheryListTable();
    }
}

// --- RECEIVE (GRN) ---
export async function handleReceiveSubmit(e) {
    if (e) e.preventDefault();
    const btn = e.currentTarget;
    
    let branchCode = document.getElementById('receive-branch').value;
    const supplierCode = document.getElementById('receive-supplier').value;
    let invoiceNumber = document.getElementById('receive-invoice').value;
    let batchNo = document.getElementById('receive-batch').value;
    const expiryDate = document.getElementById('receive-expiry').value;
    const poId = document.getElementById('receive-po-select').value;
    const notes = document.getElementById('receive-notes').value;

    if (state.currentUser.permissions.viewAllBranches && !state.currentUser.AssignedBranchCode && !branchCode) {
        const context = await requestAdminContext({ branch: true });
        if(!context) return;
        branchCode = context.branch;
    }

    if (!supplierCode || !branchCode || state.currentReceiveList.length === 0) {
        showToast('Please fill required fields', 'error');
        return;
    }

    if (!batchNo) batchNo = `GRN-${Date.now().toString().slice(-6)}`;
    if (!invoiceNumber) invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const payload = {
        type: 'receive',
        batchId: batchNo, 
        supplierCode,
        branchCode,
        invoiceNumber,
        poId,
        date: new Date().toISOString(),
        notes,
        items: state.currentReceiveList.map(i => ({
            itemCode: i.itemCode,
            itemName: i.itemName,
            quantity: parseFloat(i.quantity),
            cost: parseFloat(i.cost),
            type: 'receive',
            batchNo: batchNo,
            expiryDate: expiryDate
        }))
    };

    const result = await postData('addTransactionBatch', payload, btn);
    if (result) {
        showToast('Stock Received!', 'success');
        // Default to Pending Approval locally until refresh confirms
        payload.items.forEach(item => {
            state.transactions.push({ ...item, branchCode, supplierCode, invoiceNumber, isApproved: false, Status: 'Pending Approval' });
        });
        
        generateReceiveDocument(payload);
        resetStateLists();
        document.getElementById('form-receive-details').reset();
        renderReceiveListTable();
        renderPendingInvoices();
    }
}

// --- TRANSFER SEND ---
export async function handleTransferSubmit(e) {
    if (e) e.preventDefault();
    const btn = e.currentTarget;
    let fromBranchCode = document.getElementById('transfer-from-branch').value;
    let toBranchCode = document.getElementById('transfer-to-branch').value;
    const notes = document.getElementById('transfer-notes').value;
    const ref = document.getElementById('transfer-ref').value || generateId('TRN');

    if (state.currentUser.permissions.viewAllBranches && !state.currentUser.AssignedBranchCode) {
        const context = await requestAdminContext({ fromBranch: true, toBranch: true });
        if(!context) return;
        fromBranchCode = context.fromBranch;
        toBranchCode = context.toBranch;
    }

    if (!fromBranchCode || !toBranchCode || fromBranchCode === toBranchCode || state.currentTransferList.length === 0) {
        showToast('Invalid branch selection or empty list.', 'error');
        return;
    }

    const payload = {
        type: 'transfer_out',
        batchId: ref,
        ref: ref,
        fromBranchCode,
        toBranchCode,
        date: new Date().toISOString(),
        items: state.currentTransferList.map(i => ({
            itemCode: i.itemCode,
            itemName: i.itemName,
            quantity: parseFloat(i.quantity),
            type: 'transfer_out'
        })),
        notes
    };

    const result = await postData('addTransactionBatch', payload, btn);
    if (result) {
        showToast('Transfer Sent!', 'success');
        payload.items.forEach(item => {
            state.transactions.push({ ...item, batchId: payload.batchId, date: payload.date, fromBranchCode, toBranchCode, Status: 'In Transit', isApproved: true });
        });
        generateTransferDocument(payload);
        resetStateLists();
        document.getElementById('form-transfer-details').reset();
        document.getElementById('transfer-ref').value = generateId('TRN');
        renderTransferListTable();
        renderInTransitReport();
    }
}

// --- PURCHASE ORDER ---
export async function handlePOSubmit(e) {
    if (e) e.preventDefault();
    const btn = e.currentTarget;
    const supplierCode = document.getElementById('po-supplier').value;
    const poId = document.getElementById('po-ref').value || generateId('PO');
    const notes = document.getElementById('po-notes').value;

    if (!supplierCode || state.currentPOList.length === 0) {
        showToast('Select supplier and add items.', 'error');
        return;
    }

    const totalValue = state.currentPOList.reduce((acc, item) => acc + ((parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0)), 0);
    
    const payload = {
        type: 'po',
        poId,
        supplierCode,
        date: new Date().toISOString(),
        items: state.currentPOList,
        totalValue,
        notes,
        createdBy: state.currentUser.Name
    };

    const result = await postData('addPurchaseOrder', payload, btn);
    if (result) {
        showToast('PO Created!', 'success');
        state.purchaseOrders.push({ poId: payload.poId, date: payload.date, supplierCode: payload.supplierCode, totalValue: payload.totalValue, Status: 'Pending Approval' });
        generatePODocument(payload);
        resetStateLists();
        document.getElementById('form-po-details').reset();
        document.getElementById('po-ref').value = generateId('PO');
        renderPOListTable();
    }
}

// --- RETURN ---
export async function handleReturnSubmit(e) {
    if (e) e.preventDefault();
    const btn = e.currentTarget;
    const supplierCode = document.getElementById('return-supplier').value;
    let fromBranchCode = document.getElementById('return-branch').value;
    const ref = document.getElementById('return-ref').value;
    const notes = document.getElementById('return-notes').value;

    if (state.currentUser.permissions.viewAllBranches && !state.currentUser.AssignedBranchCode) {
        const context = await requestAdminContext({ fromBranch: true });
        if(!context) return;
        fromBranchCode = context.fromBranch;
    }

    if (!supplierCode || !fromBranchCode || !ref || state.currentReturnList.length === 0) {
        showToast('Fill all fields.', 'error');
        return;
    }

    const payload = {
        type: 'return_out',
        batchId: `RTN-${Date.now()}`,
        ref: ref,
        supplierCode,
        fromBranchCode,
        date: new Date().toISOString(),
        items: state.currentReturnList.map(i => ({
            itemCode: i.itemCode,
            itemName: i.itemName,
            quantity: parseFloat(i.quantity),
            cost: parseFloat(i.cost),
            type: 'return_out'
        })),
        notes
    };

    const result = await postData('addTransactionBatch', payload, btn);
    if (result) {
        showToast('Return processed!', 'success');
        payload.items.forEach(item => state.transactions.push({ ...item, batchId: payload.batchId, date: payload.date, supplierCode, fromBranchCode, Status: 'Completed' }));
        generateReturnDocument(payload);
        resetStateLists();
        document.getElementById('form-return-details').reset();
        renderReturnListTable();
    }
}

// --- ADJUSTMENT ---
export async function handleAdjustmentSubmit(e) {
    if (e) e.preventDefault();
    const btn = e.currentTarget;
    let branchCode = document.getElementById('adjustment-branch').value;
    const ref = document.getElementById('adjustment-ref').value;
    const notes = document.getElementById('adjustment-notes').value;

    if (state.currentUser.permissions.viewAllBranches && !state.currentUser.AssignedBranchCode) {
        const context = await requestAdminContext({ branch: true });
        if(!context) return;
        branchCode = context.branch;
    }

    if (!branchCode || !ref || !state.currentAdjustmentList || state.currentAdjustmentList.length === 0) {
        showToast('Select branch and items.', 'error');
        return;
    }

    const stock = calculateStockLevels();
    const adjustmentItems = state.currentAdjustmentList.map(item => {
        const systemQty = (stock[branchCode]?.[item.itemCode]?.quantity) || 0;
        const physicalCount = parseFloat(item.physicalCount) || 0;
        const adjustmentQty = physicalCount - systemQty;
        
        if (Math.abs(adjustmentQty) < 0.001) return null; 

        return {
            itemCode: item.itemCode,
            itemName: item.itemName,
            quantity: Math.abs(adjustmentQty),
            type: adjustmentQty > 0 ? 'adjustment_in' : 'adjustment_out',
            cost: findByKey(state.items, 'code', item.itemCode)?.cost || 0
        };
    }).filter(Boolean);

    if (adjustmentItems.length === 0) {
        showToast('No variance found.', 'info');
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

    const result = await postData('addTransactionBatch', payload, btn);
    if (result) {
        showToast('Adjustment processed!', 'success');
        const now = new Date().toISOString();
        adjustmentItems.forEach(item => state.transactions.push({ ...item, batchId: payload.batchId, date: now, branchCode: branchCode, fromBranchCode: branchCode, Status: 'Completed', isApproved: true }));
        resetStateLists();
        renderAdjustmentListTable();
        document.getElementById('form-adjustment-details').reset();
    }
}

// --- TRANSFER MANAGEMENT (ACTIONS) ---

export function openTransferModal(batchId) {
    const modal = document.getElementById('view-transfer-modal');
    const body = document.getElementById('view-transfer-modal-body');
    const title = document.getElementById('view-transfer-modal-title');
    
    if (!modal || !body || !title) {
        console.error('Transfer modal HTML missing');
        return;
    }
    
    const txs = state.transactions.filter(t => t.batchId === batchId && t.type === 'transfer_out');
    if(!txs.length) return;
    
    const first = txs[0];
    const fromBranch = findByKey(state.branches, 'branchCode', first.fromBranchCode)?.branchName || first.fromBranchCode;
    
    title.textContent = `Receive Transfer: ${batchId}`;
    
    let itemsHtml = '<table style="width:100%"><thead><tr><th>Item</th><th>Qty</th></tr></thead><tbody>';
    txs.forEach(t => {
        const item = findByKey(state.items, 'code', t.itemCode);
        itemsHtml += `<tr><td>${item?.name || t.itemCode}</td><td>${t.quantity}</td></tr>`;
    });
    itemsHtml += '</tbody></table>';
    
    body.innerHTML = `<p><strong>From:</strong> ${fromBranch}</p><p><strong>Date:</strong> ${new Date(first.date).toLocaleString()}</p><p><strong>Ref:</strong> ${first.ref}</p><hr>${itemsHtml}`;
    
    // Bind Batch ID to buttons
    const btnConfirm = document.getElementById('btn-confirm-receive-transfer');
    const btnReject = document.getElementById('btn-reject-transfer');
    if(btnConfirm) btnConfirm.dataset.batchId = batchId;
    if(btnReject) btnReject.dataset.batchId = batchId;
    
    modal.classList.add('active');
}

export async function processTransferAction(action, batchId, btn) {
    const txs = state.transactions.filter(t => t.batchId === batchId && t.type === 'transfer_out');
    if(!txs.length) return;

    const payload = {
        originalBatchId: batchId,
        batchId: batchId, 
        fromBranchCode: txs[0].fromBranchCode,
        toBranchCode: txs[0].toBranchCode,
        ref: txs[0].ref,
        items: txs.map(t => ({ itemCode: t.itemCode, quantity: t.quantity }))
    };

    const result = await postData(action, payload, btn);
    if (result) {
        showToast(`Transfer ${action === 'receiveTransfer' ? 'Received' : 'Rejected'}`, 'success');
        
        state.transactions.forEach(t => {
            if(t.batchId === batchId) t.Status = (action === 'receiveTransfer' ? 'Completed' : 'Rejected');
        });
        
        if(action === 'receiveTransfer') {
            const now = new Date().toISOString();
            payload.items.forEach(i => state.transactions.push({
                ...i, batchId: batchId, date: now, type: 'transfer_in', fromBranchCode: payload.fromBranchCode, toBranchCode: payload.toBranchCode, Status: 'Completed'
            }));
        }
        
        document.getElementById('view-transfer-modal').classList.remove('active');
        renderPendingTransfers(); 
    }
}

export async function handleCancelTransfer(batchId, btn) {
    if(!confirm('Cancel transfer?')) return;
    const result = await postData('cancelTransfer', { batchId }, btn);
    if(result) {
        showToast('Cancelled', 'success');
        state.transactions.forEach(t => { if(t.batchId === batchId) t.Status = 'Cancelled'; });
        renderInTransitReport();
    }
}
