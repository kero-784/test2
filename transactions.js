// --- START OF FILE transactions.js ---

import { state, resetStateLists } from './state.js';
import { postData, showToast, generateId, findByKey } from './utils.js';
import { renderPOListTable } from './renderers.js'; 
import { generatePODocument } from './documents.js';

/*
 * NOTE: 
 * - Logic for Receive, Transfer Send, Return, and Adjustment has been moved to 'operations_extension.js'.
 * - Logic for Butchery has been moved to 'butchery_extension.js'.
 * - This file retains Core Purchasing logic and Global Actions (e.g. Dashboard buttons).
 */

// --- PURCHASE ORDER SUBMISSION (Core View) ---
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
        state.purchaseOrders.push({ 
            poId: payload.poId, 
            date: payload.date, 
            supplierCode: payload.supplierCode, 
            totalValue: payload.totalValue, 
            Status: 'Pending Approval' 
        });
        
        generatePODocument(payload);
        resetStateLists();
        document.getElementById('form-po-details').reset();
        document.getElementById('po-ref').value = generateId('PO');
        renderPOListTable();
    }
}

// --- GLOBAL TRANSFER ACTIONS (Used by Dashboard & History) ---

export function openTransferModal(batchId) {
    const modal = document.getElementById('view-transfer-modal');
    const body = document.getElementById('view-transfer-modal-body');
    const title = document.getElementById('view-transfer-modal-title');
    
    if (!modal || !body || !title) return;
    
    const txs = state.transactions.filter(t => t.batchId === batchId && t.type === 'transfer_out');
    if(!txs.length) {
        showToast("Transfer details not found locally.", "info");
        return;
    }
    
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
    
    // Bind Batch ID to buttons in the modal
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
        
        // Update local state
        state.transactions.forEach(t => {
            if(t.batchId === batchId) t.Status = (action === 'receiveTransfer' ? 'Completed' : 'Rejected');
        });
        
        if(action === 'receiveTransfer') {
            const now = new Date().toISOString();
            payload.items.forEach(i => {
                state.transactions.push({
                    ...i, 
                    batchId: batchId, 
                    date: now, 
                    type: 'transfer_in', 
                    fromBranchCode: payload.fromBranchCode, 
                    toBranchCode: payload.toBranchCode, 
                    Status: 'Completed'
                });
            });
        }
        
        document.getElementById('view-transfer-modal').classList.remove('active');
        
        // Refresh extension view if it is loaded (Global Scope Check)
        // Since renderOpsPendingTransfers is defined in operations_extension.js, it isn't automatically global.
        // We rely on the extension re-rendering itself on tab switch or data change.
        // If we want immediate update:
        const opsBtn = document.querySelector('button[data-view="operations-ext"]');
        if(opsBtn) opsBtn.click(); 
    }
}

export async function handleCancelTransfer(batchId, btn) {
    if(!confirm('Cancel transfer?')) return;
    
    const result = await postData('cancelTransfer', { batchId }, btn);
    if(result) {
        showToast('Cancelled', 'success');
        state.transactions.forEach(t => { 
            if(t.batchId === batchId) t.Status = 'Cancelled'; 
        });
        
        // Trigger refresh if Operations view is active
        const opsBtn = document.querySelector('button[data-view="operations-ext"]');
        if(opsBtn && opsBtn.classList.contains('active')) {
             // Just clicking it again usually triggers the refresh logic in extensions
             opsBtn.click();
        }
    }
}
