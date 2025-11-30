import { state, translations } from './state.js';

export const Logger = {
    info: (m, ...a) => console.log(`[StockWise INFO] ${m}`, ...a),
    warn: (m, ...a) => console.warn(`[StockWise WARN] ${m}`, ...a),
    error: (m, ...a) => console.error(`[StockWise ERROR] ${m}`, ...a),
    debug: (m, ...a) => { if (state.currentUser?.RoleName === 'Admin') showToast(`DEBUG: ${m}`, 'info'); }
};

export const _t = (key, r) => { 
    // Fallback logic for keys not found (often the uppercase ones)
    let t = translations[state.currentLanguage]?.[key] || translations['en']?.[key] || key;
    if(r) {
        for(let k in r) t = t.replaceAll(`{${k}}`, r[k]); 
    }
    return t; 
};

export function printContent(content) {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) { showToast('Popup blocked. Please allow popups.', 'error'); return; }
    printWindow.document.write('<html><head><title>Print</title>');
    printWindow.document.write('<link rel="stylesheet" href="style.css">'); 
    printWindow.document.write('</head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
}

export function applyTranslations() {
    document.documentElement.lang = state.currentLanguage;
    document.documentElement.dir = state.currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        el.textContent = _t(key);
    });
    document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
        const key = el.dataset.translatePlaceholder;
        el.placeholder = _t(key);
    });
    // Fix for table headers that might be static
    document.querySelectorAll('th').forEach(th => {
        const key = th.getAttribute('data-translate-key') || th.innerText.trim();
        if(translations['en'][key]) th.innerText = _t(key);
    });
}

export const userCan = (p) => state.currentUser?.permissions?.[p] === true || String(state.currentUser?.permissions?.[p]).toUpperCase() === 'TRUE';
export const findByKey = (arr, k, v) => (arr || []).find(el => el && String(el[k]) === String(v));
export const generateId = (p) => `${p}-${Date.now()}`;

export function showToast(m, t='success') { 
    const c = document.getElementById('toast-container'); 
    if(!c) return;
    const d = document.createElement('div'); d.className = `toast ${t}`; d.textContent = m; 
    c.appendChild(d); setTimeout(() => d.remove(), 3500); 
}

export function setButtonLoading(l, b) { 
    if(!b) return; 
    if(l) { b.disabled = true; b.dataset.originalText = b.innerHTML; b.innerHTML = '<div class="button-spinner"></div>'; } 
    else { b.disabled = false; if(b.dataset.originalText) b.innerHTML = b.dataset.originalText; } 
}

export function populateOptions(el, data, ph, valK, txtK, txtK2) { 
    if(!el) return; 
    let html = `<option value="">${ph}</option>`; 
    (data||[]).forEach(i => html += `<option value="${i[valK]}">${i[txtK]}${txtK2 && i[txtK2] ? ' (' + i[txtK2] + ')' : ''}</option>`); 
    el.innerHTML = html;
}
