import { state, resetStateLists } from './state.js';
import { postData, showToast, _t, generateId, findByKey, requestAdminContext } from './utils.js';
import { 
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
        isApproved: false, 
        Status: 'Pending Approval',
        items: state.currentReceiveList.map(i => ({
            itemCode: i.itemCode,
            itemName: i.itemName,
            quantity: parseFloat(i.quantity),
            cost: parseFloat(i.cost),
            type: 'receive',
            batchNo: batchNo,
            expiryDate: expiryDate,
            isApproved: false,
            Status: 'Pending Approval'
        }))
    };

    const result = await postData('addTransactionBatch', payload, btn);
    if (result) {
        showToast('Stock Received!', 'success');
        
        // Update local state
        payload.items.forEach(item => {
            state.transactions.push({ 
                ...item, 
                batchId: batchNo, 
                branchCode, 
                supplierCode, 
                invoiceNumber, 
                isApproved: false, 
                Status: 'Pending Approval' 
            });
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

    // Validation
    const stock = calculateStockLevels();
    const branchStock = stock[fromBranchCode] || {};
    
    for (let item of state.currentTransferList) {
        const currentQty = branchStock[item.itemCode]?.quantity || 0;
        const transferQty = parseFloat(item.quantity);
        if (transferQty > currentQty) {
            showToast(`Insufficient stock for ${item.itemName}. Available: ${currentQty.toFixed(3)}`, 'error');
            return;
        }
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

    // Validation
    const stock = calculateStockLevels();
    const branchStock = stock[fromBranchCode] || {};

    for (let item of state.currentReturnList) {
        const currentQty = branchStock[item.itemCode]?.quantity || 0;
        const returnQty = parseFloat(item.quantity);
        if (returnQty > currentQty) {
            showToast(`Insufficient stock for ${item.itemName}. Available: ${currentQty.toFixed(3)}`, 'error');
            return;
        }
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
    
    if (!modal || !body || !title) return;
    
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
