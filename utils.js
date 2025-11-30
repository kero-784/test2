// utils.js
import { state } from './state.js';
import { SCRIPT_URL, translations } from './config.js';

export const Logger = {
    info: (message, ...args) => console.log(`[MeatStock INFO] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[MeatStock WARN] ${message}`, ...args),
    error: (message, ...args) => console.error(`[MeatStock ERROR] ${message}`, ...args),
    debug: (message, ...args) => {
        if (state.currentUser && state.currentUser.RoleName === 'Admin') {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }
};

export const _t = (key, replacements = {}) => {
    let text = translations[state.currentLanguage]?.[key] || translations['en'][key] || key;
    for (const placeholder in replacements) {
        text = text.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    return text;
};

export const userCan = (permission) => {
    if (!state.currentUser || !state.currentUser.permissions) return false;
    const p = state.currentUser.permissions[permission];
    return p === true || String(p).toUpperCase() === 'TRUE';
};

export function showToast(message, type = 'success') {
    if (type === 'error') Logger.error(`User Toast: ${message}`);
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

export function setButtonLoading(isLoading, buttonEl) {
    if (!buttonEl) return;
    if (isLoading) {
        buttonEl.disabled = true;
        buttonEl.dataset.originalText = buttonEl.innerHTML;
        buttonEl.innerHTML = `<div class="button-spinner"></div><span>Loading...</span>`;
    } else {
        buttonEl.disabled = false;
        if (buttonEl.dataset.originalText) {
            buttonEl.innerHTML = buttonEl.dataset.originalText;
        }
    }
}

export const findByKey = (array, key, value) => (array || []).find(el => el && String(el[key]) === String(value));

export const generateId = (prefix) => `${prefix}-${Date.now()}`;

export async function postData(action, data, buttonEl) {
    setButtonLoading(true, buttonEl);
    const { username, loginCode } = state;
    
    if (!username || !loginCode) {
        showToast(_t('session_error_toast'), 'error');
        setButtonLoading(false, buttonEl);
        return null;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ username, loginCode, action, data })
        });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message || 'Server error.');
        return result;
    } catch (error) {
        showToast(_t('action_failed_toast', {errorMessage: error.message}), 'error');
        return null;
    } finally {
        setButtonLoading(false, buttonEl);
    }
}

export function applyTranslations() {
    const lang = state.currentLanguage;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        el.textContent = _t(el.dataset.translateKey);
    });
    document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
        el.placeholder = _t(el.dataset.translatePlaceholder);
    });
}

export function populateOptions(el, data, ph, valueKey, textKey, textKey2) { 
    if (!el) return;
    el.innerHTML = `<option value="">${ph}</option>`; 
    (data || []).forEach(item => { 
        el.innerHTML += `<option value="${item[valueKey]}">${item[textKey]}${textKey2 && item[textKey2] ? ' (' + item[textKey2] + ')' : ''}</option>`;
    }); 
}

export function formatCurrency(amount) {
    return `${(parseFloat(amount) || 0).toFixed(2)} EGP`;
}

export function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
}