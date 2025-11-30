import { state } from './state.js';
import { findByKey } from './utils.js';

export function calculateStockLevels() {
    const stock = {}; 
    (state.branches||[]).forEach(b => stock[b.branchCode] = {});
    const txs = [...(state.transactions||[])].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    txs.forEach(t => {
        if (t.type === 'receive' && (t.isApproved !== true && String(t.isApproved).toUpperCase() !== 'TRUE')) return;
        const item = findByKey(state.items, 'code', t.itemCode); if(!item) return;
        
        const update = (bc, qty, cost) => {
            if (!bc || !stock[bc]) return;
            const cur = stock[bc][t.itemCode] || { quantity: 0, avgCost: parseFloat(item.cost)||0, itemName: item.name };
            if (qty > 0) {
                const val = (cur.quantity * cur.avgCost) + (qty * cost);
                const tot = cur.quantity + qty;
                const navg = cur.quantity < 0 ? cost : (tot > 0 ? val/tot : cur.avgCost);
                stock[bc][t.itemCode] = { itemCode: t.itemCode, quantity: tot, avgCost: navg, itemName: item.name };
            } else {
                cur.quantity += qty;
                stock[bc][t.itemCode] = cur;
            }
        };
        const q = parseFloat(t.quantity)||0; const c = parseFloat(t.cost)||0;
        if(t.type === 'receive' || t.type === 'adjustment_in' || t.type === 'extraction_in') update(t.branchCode || t.fromBranchCode, q, c);
        if(t.type === 'transfer_out' || t.type === 'return_out' || t.type === 'issue' || t.type === 'adjustment_out' || t.type === 'extraction_out') update(t.fromBranchCode, -q, 0);
        if(t.type === 'transfer_in') update(t.toBranchCode, q, findByKey(state.items, 'code', t.itemCode)?.cost || 0);
    });
    return stock;
}

export function calculateSupplierFinancials() {
    const fins = {}; 
    (state.suppliers||[]).forEach(s => fins[s.supplierCode] = { invoices: {}, events: [], balance: 0, totalBilled: 0, totalPaid: 0, supplierName: s.name });
    
    (state.transactions||[]).forEach(t => {
        if(!t.supplierCode || !fins[t.supplierCode]) return;
        const val = (parseFloat(t.quantity)||0) * (parseFloat(t.cost)||0);
        if(t.type === 'receive' && (t.isApproved === true || String(t.isApproved).toUpperCase() === 'TRUE')) {
            fins[t.supplierCode].totalBilled += val;
            if(!fins[t.supplierCode].invoices[t.invoiceNumber]) fins[t.supplierCode].invoices[t.invoiceNumber] = { number: t.invoiceNumber, date: t.date, total: 0, paid: 0 };
            fins[t.supplierCode].invoices[t.invoiceNumber].total += val;
            // Add event
            fins[t.supplierCode].events.push({ date: t.date, type: 'Invoice', ref: t.invoiceNumber, debit: val, credit: 0 });
        }
    });
    
    (state.payments||[]).forEach(p => {
        if(fins[p.supplierCode]) {
            const amt = parseFloat(p.amount)||0;
            if(p.method === 'OPENING BALANCE') {
                fins[p.supplierCode].totalBilled += amt;
                fins[p.supplierCode].invoices[p.invoiceNumber] = { number: p.invoiceNumber, date: p.date, total: amt, paid: 0 };
                fins[p.supplierCode].events.push({ date: p.date, type: 'Opening Balance', ref: p.invoiceNumber, debit: amt, credit: 0 });
            } else {
                fins[p.supplierCode].totalPaid += amt;
                if(p.invoiceNumber && fins[p.supplierCode].invoices[p.invoiceNumber]) fins[p.supplierCode].invoices[p.invoiceNumber].paid += amt;
                fins[p.supplierCode].events.push({ date: p.date, type: 'Payment', ref: p.paymentId || 'PAY', debit: 0, credit: amt });
            }
        }
    });
    
    Object.values(fins).forEach(s => {
        s.balance = s.totalBilled - s.totalPaid;
        s.events.sort((a,b) => new Date(a.date) - new Date(b.date));
    });
    return fins;
}

export function prepareListForSubmission(list) {
    const processed = []; const map = {};
    list.forEach(i => {
        if(i.isMainItemPlaceholder) map[i.itemCode] = { ph: i, kids: [] };
        else {
            const p = findByKey(state.items, 'code', i.itemCode)?.ParentItemCode;
            if(p) { if(!map[p]) map[p] = { ph: null, kids: [] }; map[p].kids.push(i); }
            else processed.push(i);
        }
    });
    Object.values(map).forEach(g => {
        if(g.ph) {
            const totVal = parseFloat(g.ph.cost)||0; 
            const totWgt = g.kids.reduce((s,k) => s + (parseFloat(k.quantity)||0), 0);
            const unit = totWgt > 0 ? totVal/totWgt : 0;
            g.kids.forEach(k => { k.cost = unit; processed.push(k); });
        } else { g.kids.forEach(k => processed.push(k)); }
    });
    return processed;
}
