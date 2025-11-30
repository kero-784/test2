// calculations.js
import { state } from './state.js';
import { findByKey } from './utils.js';

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
        // Skip unapproved Receives (they don't affect stock yet)
        const isApproved = t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE';
        if (t.type === 'receive' && !isApproved) return;
        
        const item = findByKey(state.items, 'code', t.itemCode);
        if (!item) return;

        /**
         * Helper to update a specific branch's stock record
         * @param {string} branchCode 
         * @param {number} qtyChange (Positive for IN, Negative for OUT)
         * @param {number} cost (Unit cost, required for IN transactions)
         */
        const processStockUpdate = (branchCode, qtyChange, cost) => {
            if (!branchCode || !stock.hasOwnProperty(branchCode)) return;
            
            // Get current state or initialize with 0
            const current = stock[branchCode][t.itemCode] || { 
                quantity: 0, 
                avgCost: parseFloat(item.cost) || 0, 
                itemName: item.name 
            };
            
            if(qtyChange > 0) {
                // Weighted Average Cost Calculation
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
            case 'issue': 
            case 'transfer_out': 
            case 'return_out': 
            case 'adjustment_out': 
                processStockUpdate(t.fromBranchCode, -qty, 0); 
                break;
            
            // Butchery: Parent item leaves inventory
            case 'production_out': 
                processStockUpdate(t.branchCode, -qty, 0); 
                break; 
            
            // Butchery: Child items enter inventory
            case 'production_in': 
                processStockUpdate(t.branchCode, qty, transactionCost); 
                break; 
            
            case 'transfer_in':
                // Incoming transfer inherits the cost from the sender branch at that moment
                // Fallback to Master Item Default Cost if live tracking fails
                const fromCost = tempAvgCosts[t.fromBranchCode]?.[t.itemCode] || findByKey(state.items, 'code', t.itemCode)?.cost || 0;
                processStockUpdate(t.toBranchCode, qty, parseFloat(fromCost));
                break;
                
            case 'adjustment_in':
                processStockUpdate(t.fromBranchCode, qty, transactionCost);
                break;
        }
    });
    
    return stock;
};

/**
 * Calculates financial standing with suppliers (Invoices vs Payments).
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
    
    // Process Bills (Receives) and Credits (Returns)
    (state.transactions || []).forEach(t => {
        const isApproved = t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE';
        
        // Skip if not related to a supplier or no cost data
        if (!t.supplierCode || !financials[t.supplierCode] || t.cost === undefined) return;
        
        const value = (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0);
        
        if (t.type === 'receive' && isApproved) {
            financials[t.supplierCode].totalBilled += value;
            const invNum = t.invoiceNumber || 'Unknown';
            
            if (!financials[t.supplierCode].invoices[invNum]) { 
                financials[t.supplierCode].invoices[invNum] = { number: invNum, date: t.date, total: 0, paid: 0 }; 
            }
            financials[t.supplierCode].invoices[invNum].total += value;
            
        } else if (t.type === 'return_out') {
            financials[t.supplierCode].totalCredited += value;
        }
    });

    // Process Payments
    (state.payments || []).forEach(p => { 
        if (financials[p.supplierCode]) { 
            const amount = parseFloat(p.amount) || 0;
            
            if (p.method === 'OPENING BALANCE') {
                financials[p.supplierCode].totalBilled += amount;
            } else {
                financials[p.supplierCode].totalPaid += amount;
            }
            
            // Allocate payment to specific invoice if indicated
            if (p.invoiceNumber && financials[p.supplierCode].invoices[p.invoiceNumber]) { 
                financials[p.supplierCode].invoices[p.invoiceNumber].paid += amount;
            } else if (p.method === 'OPENING BALANCE') {
                // Create a virtual invoice for opening balance
                financials[p.supplierCode].invoices[p.invoiceNumber] = { number: p.invoiceNumber, date: p.date, total: amount, paid: 0 };
            }
        } 
    });

    // Summarize
    Object.values(financials).forEach(s => {
        s.balance = s.totalBilled - s.totalPaid - s.totalCredited;
        
        // Calculate status for each invoice
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

        // Build chronological event list for Statement generation
        const allEvents = [
            ...Object.values(s.invoices).map(i => ({ date: i.date, type: 'Invoice/OB', ref: i.number, debit: i.total, credit: 0 })),
            ...(state.transactions || []).filter(t => t.type === 'return_out' && t.supplierCode === s.supplierCode).map(t => ({ date: t.date, type: 'Return (Credit)', ref: t.ref, debit: 0, credit: (parseFloat(t.quantity) || 0) * (parseFloat(t.cost) || 0) })),
            ...(state.payments || []).filter(p => p.supplierCode === s.supplierCode && p.method !== 'OPENING BALANCE').map(p => ({ date: p.date, type: 'Payment', ref: p.paymentId, debit: 0, credit: (parseFloat(p.amount) || 0) }))
        ];
        s.events = allEvents.sort((a,b) => new Date(a.date) - new Date(b.date));
    });
    
    return financials;
};