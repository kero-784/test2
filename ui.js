import { state, modalContext } from './state.js';
import { _t, findByKey } from './utils.js';
import { updateReceiveGrandTotal, updateTransferGrandTotal, updatePOGrandTotal, updatePOEditGrandTotal, updateReturnGrandTotal, renderReceiveListTable, renderTransferListTable, renderPOListTable, renderPOEditListTable, renderReturnListTable } from './renderers.js';

export function handleTableInputUpdate(e, listName, rendererFn) {
    if (e.target.classList.contains('table-input')) {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        const value = e.target.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value;
        
        if (state[listName] && state[listName][index]) {
            state[listName][index][field] = value;
        }

        if (listName === 'currentReceiveList') updateReceiveGrandTotal();
        if (listName === 'currentTransferList') updateTransferGrandTotal();
        if (listName === 'currentPOList') updatePOGrandTotal();
        if (listName === 'currentEditingPOList') updatePOEditGrandTotal();
        if (listName === 'currentReturnList') updateReturnGrandTotal();
    }
}

export function handleTableRemove(e, listName, rendererFn) { 
    const btn = e.target.closest('button');
    if (btn && btn.classList.contains('danger') && btn.dataset.index) {
        state[listName].splice(parseInt(btn.dataset.index), 1);
        rendererFn(); 
    }
}

export function attachTableListeners(id, listKey, renderFn) {
    const t = document.getElementById(id); if(!t) return;
    t.addEventListener('input', e => handleTableInputUpdate(e, listKey, renderFn)); 
    t.addEventListener('click', e => handleTableRemove(e, listKey, renderFn));
}