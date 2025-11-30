// transactions.js
import { state, resetStateLists } from './state.js';
import { postData, showToast, _t, generateId, requestAdminContext } from './utils.js';
import { renderButcheryListTable, renderReceiveListTable, renderTransferListTable, renderReturnListTable, renderAdjustmentListTable, renderPOListTable } from './renderers.js';
import { calculateStockLevels } from './calculations.js';
import { generateReceiveDocument, generateTransferDocument, generateReturnDocument, generatePODocument } from './documents.js';

export async function handleButcherySubmit(e) {
    if(e) e.preventDefault();
    const btn = e.currentTarget;
    const pCode = document.getElementById('butchery-parent-code').value;
    const pQty = parseFloat(document.getElementById('butchery-parent-qty').value);
    const br = document.getElementById('butchery-branch').value;
    const exp = document.getElementById('butchery-expiry').value;
    let batch = document.getElementById('butchery-batch').value || `BATCH-${Date.now()}`;

    // Detailed Validation
    if(!br) { showToast('Select a Branch.', 'error'); return; }
    if(!pCode) { showToast('Select a Parent Item.', 'error'); return; }
    if(isNaN(pQty) || pQty <= 0) { showToast('Enter valid processing weight.', 'error'); return; }
    if(!exp) { showToast('Enter Expiry Date.', 'error'); return; }
    if(!state.currentButcheryList.length) { showToast('Add at least one Cut.', 'error'); return; }
    
    const stock = calculateStockLevels();
    const cost = stock[br]?.[pCode]?.avgCost || 0;
    const children = state.currentButcheryList.map(c => ({ itemCode: c.itemCode, quantity: parseFloat(c.quantity)||0, cost: cost }));
    
    const payload = { parentItemCode: pCode, parentQuantity: pQty, branchCode: br, childItems: children, batchNo: batch, expiryDate: exp };
    
    if(await postData('processButchery', payload, btn)) {
        showToast('Butchery Done', 'success');
        state.currentButcheryList = [];
        document.getElementById('form-butchery').reset();
        renderButcheryListTable();
    }
}

export async function handleReceiveSubmit(e) {
    if(e) e.preventDefault();
    const btn = e.currentTarget;
    const sup = document.getElementById('receive-supplier').value;
    let br = document.getElementById('receive-branch').value;
    const inv = document.getElementById('receive-invoice').value || `INV-${Date.now()}`;
    const batch = document.getElementById('receive-batch').value || `GRN-${Date.now()}`;
    const exp = document.getElementById('receive-expiry').value;
    const notes = document.getElementById('receive-notes').value;

    if(state.currentUser.permissions.viewAllBranches && !br) {
        const c = await requestAdminContext({ branch: true });
        if(!c) return; br = c.branch;
    }

    if(!sup) { showToast('Select Supplier', 'error'); return; }
    if(!br) { showToast('Select Branch', 'error'); return; }
    if(!state.currentReceiveList.length) { showToast('Add Items to receive', 'error'); return; }
    
    const items = state.currentReceiveList.map(i => ({ 
        ...i, 
        type: 'receive', 
        quantity: parseFloat(i.quantity)||0,
        cost: parseFloat(i.cost)||0,
        batchNo: batch, 
        expiryDate: exp 
    }));

    const payload = { type: 'receive', batchId: batch, supplierCode: sup, branchCode: br, invoiceNumber: inv, date: new Date().toISOString(), notes, items };
    
    if(await postData('addTransactionBatch', payload, btn)) {
        showToast('Received', 'success');
        generateReceiveDocument(payload);
        resetStateLists();
        document.getElementById('form-receive-details').reset();
        renderReceiveListTable();
    }
}

// ... (Other handlers remain similar, ensuring preventDefault is in place)

export async function handleTransferSubmit(e) {
    if(e) e.preventDefault();
    const btn = e.currentTarget;
    let fBr = document.getElementById('transfer-from-branch').value;
    let tBr = document.getElementById('transfer-to-branch').value;
    const ref = document.getElementById('transfer-ref').value || generateId('TRN');
    const notes = document.getElementById('transfer-notes').value;
    
    if(state.currentUser.permissions.viewAllBranches) {
        const c = await requestAdminContext({ fromBranch: true, toBranch: true });
        if(!c) return; fBr = c.fromBranch; tBr = c.toBranch;
    }
    
    if(!fBr || !tBr || !state.currentTransferList.length) { showToast('Fill Data', 'error'); return; }
    const payload = { type: 'transfer_out', batchId: ref, ref, fromBranchCode: fBr, toBranchCode: tBr, date: new Date().toISOString(), items: state.currentTransferList.map(i => ({ ...i, type: 'transfer_out', quantity: parseFloat(i.quantity) })), notes };
    
    if(await postData('addTransactionBatch', payload, btn)) {
        showToast('Transferred', 'success');
        generateTransferDocument(payload);
        resetStateLists();
        document.getElementById('form-transfer-details').reset();
        renderTransferListTable();
    }
}

export async function handlePOSubmit(e) {
    if(e) e.preventDefault();
    const btn = e.currentTarget;
    const sup = document.getElementById('po-supplier').value;
    const ref = document.getElementById('po-ref').value || generateId('PO');
    const notes = document.getElementById('po-notes').value;
    
    if(!sup || !state.currentPOList.length) { showToast('Fill Data', 'error'); return; }
    const total = state.currentPOList.reduce((a, i) => a + (i.quantity*i.cost), 0);
    const payload = { type: 'po', poId: ref, supplierCode: sup, date: new Date().toISOString(), items: state.currentPOList, totalValue: total, notes };
    
    if(await postData('addPurchaseOrder', payload, btn)) {
        showToast('PO Created', 'success');
        generatePODocument(payload);
        resetStateLists();
        document.getElementById('form-po-details').reset();
        renderPOListTable();
    }
}

export async function handleReturnSubmit(e) {
    if(e) e.preventDefault();
    const btn = e.currentTarget;
    const sup = document.getElementById('return-supplier').value;
    let br = document.getElementById('return-branch').value;
    const ref = document.getElementById('return-ref').value;
    const notes = document.getElementById('return-notes').value;
    
    if(state.currentUser.permissions.viewAllBranches) {
        const c = await requestAdminContext({ fromBranch: true });
        if(!c) return; br = c.fromBranch;
    }
    
    if(!sup || !br || !state.currentReturnList.length) { showToast('Fill Data', 'error'); return; }
    const payload = { type: 'return_out', batchId: `RTN-${Date.now()}`, ref, supplierCode: sup, fromBranchCode: br, date: new Date().toISOString(), items: state.currentReturnList.map(i => ({ ...i, type: 'return_out', quantity: parseFloat(i.quantity) })), notes };
    
    if(await postData('addTransactionBatch', payload, btn)) {
        showToast('Returned', 'success');
        generateReturnDocument(payload);
        resetStateLists();
        document.getElementById('form-return-details').reset();
        renderReturnListTable();
    }
}

export async function handleRequestSubmit(e) {
    if(e) e.preventDefault();
    const btn = e.currentTarget;
    const type = document.getElementById('request-type').value;
    const notes = document.getElementById('request-notes').value;
    let fSec = state.currentUser.AssignedSectionCode;
    let tBr = state.currentUser.AssignedBranchCode;
    
    if(state.currentUser.permissions.viewAllBranches) {
        const c = await requestAdminContext({ toBranch: true, fromSection: true });
        if(!c) return; tBr = c.toBranch; fSec = c.fromSection;
    }
    
    if(!state.currentRequestList.length) { showToast('Add items', 'error'); return; }
    const payload = { requestId: `REQ-${Date.now()}`, requestType: type, items: state.currentRequestList, FromSection: fSec, ToBranch: tBr, notes };
    
    if(await postData('addItemRequest', payload, btn)) {
        showToast('Requested', 'success');
        resetStateLists();
        document.getElementById('form-create-request').reset();
        renderRequestListTable();
    }
}

export async function handleAdjustmentSubmit(e) {
    if(e) e.preventDefault();
    const btn = e.currentTarget;
    let br = document.getElementById('adjustment-branch').value;
    const ref = document.getElementById('adjustment-ref').value;
    const notes = document.getElementById('adjustment-notes').value;
    
    if(state.currentUser.permissions.viewAllBranches) {
        const c = await requestAdminContext({ branch: true });
        if(!c) return; br = c.branch;
    }
    
    if(!br || !state.currentAdjustmentList.length) { showToast('Fill Data', 'error'); return; }
    const payload = { type: 'stock_adjustment', batchId: `ADJ-${Date.now()}`, ref, fromBranchCode: br, items: state.currentAdjustmentList.map(i => ({ ...i, type: 'adjustment_in', quantity: Math.abs(parseFloat(i.physicalCount)) })), notes }; 
    
    if(await postData('addTransactionBatch', payload, btn)) {
        showToast('Adjusted', 'success');
        resetStateLists();
        document.getElementById('form-adjustment-details').reset();
        renderAdjustmentListTable();
    }
}
