// transactions.js
import { state, resetStateLists } from './state.js';
import { postData, showToast, _t, generateId, findByKey, requestAdminContext } from './utils.js';
import { 
    renderButcheryListTable, 
    renderReceiveListTable, 
    renderTransferListTable, 
    renderPOListTable,
    renderReturnListTable,
    renderRequestListTable,
    renderAdjustmentListTable
} from './renderers.js';
import { calculateStockLevels } from './calculations.js';
import { generateReceiveDocument, generateTransferDocument, generatePODocument, generateReturnDocument } from './documents.js';

export async function handleButcherySubmit(e) {
    if(e) e.preventDefault(); // STOP PAGE RELOAD
    const btn = e.currentTarget;
    const parentCode = document.getElementById('butchery-parent-code').value;
    const parentQty = parseFloat(document.getElementById('butchery-parent-qty').value);
    const branchCode = document.getElementById('butchery-branch').value;
    let batchNo = document.getElementById('butchery-batch').value;
    const expiryDate = document.getElementById('butchery-expiry').value;

    if (!parentCode || !parentQty || !branchCode || !expiryDate || state.currentButcheryList.length === 0) {
        showToast('Please fill all fields, select a parent item, and add cuts.', 'error');
        return;
    }

    // Cost Logic: Inherit Parent Average Cost per unit weight
    const stock = calculateStockLevels();
    const parentAvgCost = stock[branchCode]?.[parentCode]?.avgCost || 0;
    
    // Auto-Generate Batch if empty
    if(!batchNo) {
        batchNo = `BATCH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const childItems = state.currentButcheryList.map(c => ({
        itemCode: c.itemCode,
        quantity: parseFloat(c.quantity),
        cost: parentAvgCost // Inheriting cost per kg
    }));

    const payload = {
        parentItemCode: parentCode,
        parentQuantity: parentQty,
        branchCode: branchCode,
        childItems: childItems,
        batchNo: batchNo,
        expiryDate: expiryDate,
        notes: `Butchery Yield Process`
    };

    const result = await postData('processButchery', payload, btn);
    if (result) {
        showToast('Butchery production processed successfully!', 'success');
        state.currentButcheryList = [];
        document.getElementById('form-butchery').reset();
        document.getElementById('butchery-parent-display').value = '';
        document.getElementById('butchery-parent-code').value = '';
        renderButcheryListTable();
    }
}

export async function handleReceiveSubmit(e) {
    if(e) e.preventDefault(); // STOP PAGE RELOAD
    const btn = e.currentTarget;
    let branchCode = document.getElementById('receive-branch').value;
    const supplierCode = document.getElementById('receive-supplier').value;
    const invoiceNumber = document.getElementById('receive-invoice').value;
    const batchNo = document.getElementById('receive-batch').value;
    const expiryDate = document.getElementById('receive-expiry').value;
    const poId = document.getElementById('receive-po-select').value;
    const notes = document.getElementById('receive-notes').value;

    const user = state.currentUser;
    if (user.permissions.viewAllBranches && !user.AssignedBranchCode && !branchCode) {
        const context = await requestAdminContext({ branch: true });
        if(!context) return;
        branchCode = context.branch;
    }

    if (!supplierCode || !branchCode || !invoiceNumber || state.currentReceiveList.length === 0) {
        showToast(_t('fill_required_fields_toast'), 'error');
        return;
    }

    const payload = {
        type: 'receive',
        batchId: `GRN-${Date.now()}`,
        supplierCode,
        branchCode,
        invoiceNumber,
        poId,
        date: new Date().toISOString(),
        notes,
        items: state.currentReceiveList.map(i => ({
            ...i,
            type: 'receive',
            batchNo: batchNo, 
            expiryDate: expiryDate
        }))
    };

    const result = await postData('addTransactionBatch', payload, btn);
    if (result) {
        showToast('Stock Received Successfully!', 'success');
        generateReceiveDocument(payload);
        resetStateLists();
        document.getElementById('form-receive-details').reset();
        renderReceiveListTable();
    }
}

export async function handleTransferSubmit(e) {
    if(e) e.preventDefault(); // STOP PAGE RELOAD
    const btn = e.currentTarget;
    let fromBranchCode = document.getElementById('transfer-from-branch').value;
    let toBranchCode = document.getElementById('transfer-to-branch').value;
    const notes = document.getElementById('transfer-notes').value;
    const ref = document.getElementById('transfer-ref').value;

    if(state.currentUser.permissions.viewAllBranches && !state.currentUser.AssignedBranchCode) {
        const context = await requestAdminContext({ fromBranch: true, toBranch: true });
        if(!context) return;
        fromBranchCode = context.fromBranch;
        toBranchCode = context.toBranch;
    }

    if (!fromBranchCode || !toBranchCode || fromBranchCode === toBranchCode || state.currentTransferList.length === 0) {
        showToast('Please select valid different branches and add items.', 'error');
        return;
    }

    const payload = {
        type: 'transfer_out',
        batchId: ref,
        ref: ref,
        fromBranchCode,
        toBranchCode,
        date: new Date().toISOString(),
        items: state.currentTransferList.map(i => ({...i, type: 'transfer_out'})),
        notes
    };

    const result = await postData('addTransactionBatch', payload, btn);
    if (result) {
        showToast('Transfer initiated!', 'success');
        generateTransferDocument(payload);
        resetStateLists();
        document.getElementById('form-transfer-details').reset();
        document.getElementById('transfer-ref').value = generateId('TRN');
        renderTransferListTable();
    }
}

export async function handlePOSubmit(e) {
    if(e) e.preventDefault(); // STOP PAGE RELOAD
    const btn = e.currentTarget;
    const supplierCode = document.getElementById('po-supplier').value;
    const poId = document.getElementById('po-ref').value;
    const notes = document.getElementById('po-notes').value;

    if (!supplierCode || state.currentPOList.length === 0) {
        showToast('Please select a supplier and add items.', 'error');
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
        showToast('Purchase Order created!', 'success');
        generatePODocument(payload);
        resetStateLists();
        document.getElementById('form-po-details').reset();
        document.getElementById('po-ref').value = generateId('PO');
        renderPOListTable();
    }
}

export async function handleReturnSubmit(e) {
    if(e) e.preventDefault(); // STOP PAGE RELOAD
    const btn = e.currentTarget;
    const supplierCode = document.getElementById('return-supplier').value;
    let fromBranchCode = document.getElementById('return-branch').value;
    const ref = document.getElementById('return-ref').value;
    const notes = document.getElementById('return-notes').value;

    if(state.currentUser.permissions.viewAllBranches && !state.currentUser.AssignedBranchCode) {
        const context = await requestAdminContext({ fromBranch: true });
        if(!context) return;
        fromBranchCode = context.fromBranch;
    }

    if (!supplierCode || !fromBranchCode || !ref || state.currentReturnList.length === 0) {
        showToast('Please fill all required fields and add items to return.', 'error');
        return;
    }

    const payload = {
        type: 'return_out',
        batchId: `RTN-${Date.now()}`,
        ref: ref,
        supplierCode,
        fromBranchCode,
        date: new Date().toISOString(),
        items: state.currentReturnList.map(i => ({...i, type: 'return_out'})),
        notes
    };

    const result = await postData('addTransactionBatch', payload, btn);
    if (result) {
        showToast('Return processed!', 'success');
        generateReturnDocument(payload);
        resetStateLists();
        document.getElementById('form-return-details').reset();
        renderReturnListTable();
    }
}

export async function handleRequestSubmit(e) {
    if(e) e.preventDefault(); // STOP PAGE RELOAD
    const btn = e.currentTarget;
    let fromSection = state.currentUser.AssignedSectionCode;
    let toBranch = state.currentUser.AssignedBranchCode;
    const requestType = document.getElementById('request-type').value;
    const notes = document.getElementById('request-notes').value;

    if(state.currentUser.permissions.viewAllBranches && (!fromSection || !toBranch)) {
        const context = await requestAdminContext({ toBranch: true, fromSection: true });
        if(!context) return;
        fromSection = context.fromSection;
        toBranch = context.toBranch;
    }

    if(state.currentRequestList.length === 0){
        showToast('Please select items for your request.', 'error');
        return;
    }

    const payload = {
        requestId: `REQ-${Date.now()}`,
        requestType,
        notes,
        items: state.currentRequestList,
        FromSection: fromSection,
        ToBranch: toBranch
    };

    const result = await postData('addItemRequest', payload, btn);
    if(result){
        showToast('Request submitted successfully!', 'success');
        resetStateLists();
        document.getElementById('form-create-request').reset();
        renderRequestListTable();
    }
}

export async function handleAdjustmentSubmit(e) {
    if(e) e.preventDefault(); // STOP PAGE RELOAD
    const btn = e.currentTarget;
    let branchCode = document.getElementById('adjustment-branch').value;
    const ref = document.getElementById('adjustment-ref').value;
    const notes = document.getElementById('adjustment-notes').value;

    if(state.currentUser.permissions.viewAllBranches && !state.currentUser.AssignedBranchCode) {
        const context = await requestAdminContext({ branch: true });
        if(!context) return;
        branchCode = context.branch;
    }

    if (!branchCode || !ref || !state.currentAdjustmentList || state.currentAdjustmentList.length === 0) {
        showToast('Please select a branch and add items to adjust.', 'error');
        return;
    }

    const stock = calculateStockLevels();
    const adjustmentItems = state.currentAdjustmentList.map(item => {
        const systemQty = (stock[branchCode]?.[item.itemCode]?.quantity) || 0;
        const physicalCount = item.physicalCount || 0;
        const adjustmentQty = physicalCount - systemQty;
        
        if (Math.abs(adjustmentQty) < 0.001) return null; // No change

        return {
            itemCode: item.itemCode,
            quantity: Math.abs(adjustmentQty),
            type: adjustmentQty > 0 ? 'adjustment_in' : 'adjustment_out',
            cost: findByKey(state.items, 'code', item.itemCode)?.cost || 0
        };
    }).filter(Boolean);

    if (adjustmentItems.length === 0) {
        showToast('No adjustments needed based on entered counts.', 'info');
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
        showToast('Stock adjustment processed!', 'success');
        resetStateLists();
        renderAdjustmentListTable();
        document.getElementById('form-adjustment-details').reset();
    }
}
