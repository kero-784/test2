import { state, translations } from './state.js';

export const Logger = {
    info: (m, ...a) => console.log(`[StockWise INFO] ${m}`, ...a),
    warn: (m, ...a) => console.warn(`[StockWise WARN] ${m}`, ...a),
    error: (m, ...a) => console.error(`[StockWise ERROR] ${m}`, ...a),
    debug: (m, ...a) => { if (state.currentUser && state.currentUser.RoleName === 'Admin') showToast(`DEBUG: ${m}`, 'info'); }
};

export const _t = (key, r) => { 
    let t = translations[state.currentLanguage]?.[key] || key; 
    for(let k in r) t = t.replace(`{${k}}`, r[k]); 
    return t; 
};

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
    el.innerHTML = `<option value="">${ph}</option>`; 
    (data||[]).forEach(i => el.innerHTML += `<option value="${i[valK]}">${i[txtK]}${txtK2 && i[txtK2] ? ' (' + i[txtK2] + ')' : ''}</option>`); 
}