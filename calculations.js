import { state } from './state.js';
import { findByKey, Logger } from './utils.js';

/**
 * Calculates current stock quantity and average cost for every item at every branch.
 * Iterates through chronological transactions to build the state.
 */
export const calculateStockLevels = () => {
    const stock = {};
    
    // Initialize stock objects for all known branches
    (state.branches || []).forEach(branch => { 
        stock[branch.branchCode] = {}; 
    });

    // Sort transactions by date to ensure correct running balances
    const sortedTransactions = [...(state.transactions || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Temporary storage for transfer costs (to pass cost from Sender to Receiver)
    const tempAvgCosts = {}; 

    sortedTransactions.forEach(t => {
        try {
            // Skip unapproved Receives (they don't affect stock yet)
            const isApproved = t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE';
            if (t.type === 'receive' && !isApproved) return;
            
            // Skip deleted transactions
            if (t.is_deleted === true || String(t.is_deleted).toUpperCase() === 'TRUE') return;
            if (t.Status === 'Rejected' || t.Status === 'Cancelled') return;

            const item = findByKey(state.items, 'code', t.itemCode);
            if (!item) return;

            const processStockUpdate = (branchCode, qtyChange, cost) => {
                if (!branchCode || !stock.hasOwnProperty(branchCode)) return;
                
                // Get current state or initialize with 0
                const current = stock[branchCode][t.itemCode] || { 
                    quantity: 0, 
                    avgCost: parseFloat(item.cost) || 0, 
                    itemName: item.name 
                };
                
                if(qtyChange > 0) {
                    // Weighted Average Cost Calculation (INCOMING)
                    const currentTotalValue = current.quantity * current.avgCost;
                    const newTransactionValue = qtyChange * cost;
                    const totalQty = current.quantity + qtyChange;
                    
                    // Prevent division by zero
                    const newAvgCost = totalQty > 0 
                        ? (currentTotalValue + newTransactionValue) / totalQty 
                        : current.avgCost;

                    stock[branchCode][t.itemCode] = { 
                        itemCode: t.itemCode, 
                        quantity: totalQty, 
                        avgCost: newAvgCost, 
                        itemName: item.name 
                    };
                    
                    // Store this cost for potential transfers out
                    if (!tempAvgCosts[branchCode]) tempAvgCosts[branchCode] = {};
                    tempAvgCosts[branchCode][t.itemCode] = newAvgCost;

                } else {
                    // Outgoing stock reduces quantity but maintains Average Cost
                    current.quantity += qtyChange;
                    stock[branchCode][t.itemCode] = current;
                }
            };

            const qty = parseFloat(t.quantity) || 0;
            const transactionCost = parseFloat(t.cost) || 0;

            switch (t.type) {
                case 'receive': 
                    processStockUpdate(t.branchCode, qty, transactionCost); 
                    break;
                case 'transfer_out': 
                case 'issue':
                case 'return_out': 
                case 'adjustment_out': 
                case 'production_out':
                    processStockUpdate(t.fromBranchCode || t.branchCode, -qty, 0); 
                    break;
                
                case 'production_in': 
                    processStockUpdate(t.branchCode, qty, transactionCost); 
                    break; 
                
                case 'transfer_in':
                    // Incoming transfer inherits the cost from the sender branch
                    const fromCost = tempAvgCosts[t.fromBranchCode]?.[t.itemCode] || findByKey(state.items, 'code', t.itemCode)?.cost || 0;
                    processStockUpdate(t.toBranchCode, qty, parseFloat(fromCost));
                    break;
                    
                case 'adjustment_in':
                    processStockUpdate(t.fromBranchCode || t.branchCode, qty, transactionCost);
                    break;
            }
        } catch (e) {
            Logger.warn(`Calc error on tx ${t.batchId}`, e);
        }
    });
    
    return stock;
};

/**
 * Calculates financial standing with suppliers.
 */
export const calculateSupplierFinancials = () => {
    const financials = {};
    
    // Initialize
    (state.suppliers || []).forEach(s => { 
        financials[s.supplierCode] = { 
            supplierCode: s.supplierCode, 
            supplierName: s.name, 
            totalBilled: 0, 
            totalPaid: 0, 
            totalCredited: 0, 
            balance: 0, 
            invoices: {}, 
            events: [] 
        }; 
    });
    
    // Process Bills and Credits
    (state.transactions || []).forEach(t => {
        const isApproved = t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE';
        const isDeleted = t.is_deleted === true || String(t.is_deleted).toUpperCase() === 'TRUE';
        
        if (isDeleted || !t.supplierCode || !financials[t.supplierCode] || t.cost === undefined) return;
        
        const value = (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0);
        
        if (t.type === 'receive' && isApproved) {
            financials[t.supplierCode].totalBilled += value;
            const invNum = t.invoiceNumber || 'Unknown';
            if (!financials[t.supplierCode].invoices[invNum]) { 
                financials[t.supplierCode].invoices[invNum] = { number: invNum, date: t.date, total: 0, paid: 0 }; 
            }
            financials[t.supplierCode].invoices[invNum].total += value;
            financials[t.supplierCode].events.push({ date: t.date, type: 'Bill', ref: invNum, debit: value, credit: 0 });
            
        } else if (t.type === 'return_out') {
            financials[t.supplierCode].totalCredited += value;
            financials[t.supplierCode].events.push({ date: t.date, type: 'Credit', ref: t.ref, debit: 0, credit: value });
        }
    });

    // Process Payments
    (state.payments || []).forEach(p => { 
        if (financials[p.supplierCode]) { 
            const amount = parseFloat(p.amount) || 0;
            
            if (p.method === 'OPENING BALANCE') {
                financials[p.supplierCode].totalBilled += amount;
                // Create a virtual invoice for opening balance
                if(p.invoiceNumber) {
                    financials[p.supplierCode].invoices[p.invoiceNumber] = { number: p.invoiceNumber, date: p.date, total: amount, paid: 0 };
                }
            } else {
                financials[p.supplierCode].totalPaid += amount;
                financials[p.supplierCode].events.push({ date: p.date, type: 'Pay', ref: p.paymentId, debit: 0, credit: amount });
            }
            
            // Allocate payment to specific invoice
            if (p.invoiceNumber && financials[p.supplierCode].invoices[p.invoiceNumber]) { 
                if(p.method !== 'OPENING BALANCE') {
                    financials[p.supplierCode].invoices[p.invoiceNumber].paid += amount;
                }
            }
        } 
    });

    // Summarize
    Object.values(financials).forEach(s => {
        s.balance = s.totalBilled - s.totalPaid - s.totalCredited;
        
        Object.values(s.invoices).forEach(inv => { 
            inv.balance = inv.total - inv.paid; 
            if (Math.abs(inv.balance) < 0.01) { 
                inv.status = 'Paid'; 
            } else if (inv.paid > 0) { 
                inv.status = 'Partial'; 
            } else { 
                inv.status = 'Unpaid'; 
            } 
        });
        s.events.sort((a,b) => new Date(a.date) - new Date(b.date));
    });
    
    return financials;
};
