import { state, setState } from './state.js';
import { SCRIPT_URL, translations } from './config.js';

export const Logger = {
    info: (msg, data) => console.log(`%c[INFO] ${msg}`, 'color: #2196F3; font-weight: bold;', data || ''),
    warn: (msg, data) => console.warn(`%c[WARN] ${msg}`, 'color: #ff9800; font-weight: bold;', data || ''),
    error: (msg, error) => { 
        console.error(`%c[ERROR] ${msg}`, 'color: #f44336; font-weight: bold;', error || ''); 
        showToast(`Error: ${msg}`, 'error'); 
    },
    debug: (msg, data) => { 
        if (state.currentUser?.RoleName === 'Admin') { 
            console.log(`%c[DEBUG] ${msg}`, 'color: #9c27b0;', data || ''); 
        } 
    }
};

export const _t = (key) => {
    return translations[state.currentLanguage]?.[key] || translations['en'][key] || key;
};

export const userCan = (permission) => {
    if (!state.currentUser || !state.currentUser.permissions) return false;
    const p = state.currentUser.permissions[permission];
    return p === true || String(p).toUpperCase() === 'TRUE';
};

export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    if (type === 'error') { 
        toast.style.cursor = 'pointer'; 
        toast.title = 'Click to close'; 
        toast.onclick = () => toast.remove(); 
    }

    container.appendChild(toast);
    
    if (type !== 'error') { 
        setTimeout(() => { if(toast.parentNode) toast.remove(); }, 3500); 
    }
}

export function setButtonLoading(isLoading, buttonEl) {
    if (!buttonEl) return;
    if (isLoading) {
        buttonEl.disabled = true;
        if(!buttonEl.dataset.originalText) buttonEl.dataset.originalText = buttonEl.innerHTML;
        buttonEl.innerHTML = `<div class="button-spinner"></div>`;
    } else {
        buttonEl.disabled = false;
        if (buttonEl.dataset.originalText) buttonEl.innerHTML = buttonEl.dataset.originalText;
    }
}

export const findByKey = (array, key, value) => { 
    if (!Array.isArray(array)) return null; 
    return array.find(el => el && String(el[key]) === String(value)); 
};

export const generateId = (prefix) => `${prefix}-${Date.now()}`;

export async function postData(action, data, buttonEl) {
    setButtonLoading(true, buttonEl);
    
    // Session Auto-Recovery
    if (!state.username) { 
        const u = sessionStorage.getItem('meatUser'); 
        const p = sessionStorage.getItem('meatPass'); 
        if (u && p) { setState('username', u); setState('loginCode', p); } 
    }

    if (!state.username || !state.loginCode) { 
        showToast(_t('session_error_toast'), 'error'); 
        setButtonLoading(false, buttonEl); 
        return null; 
    }

    try {
        Logger.debug(`POST: ${action}`, data);
        
        const response = await fetch(SCRIPT_URL, { 
            method: 'POST', 
            mode: 'cors', 
            body: JSON.stringify({ username: state.username, loginCode: state.loginCode, action, data }) 
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) { 
            const text = await response.text(); 
            throw new Error(`Server Error (HTML): ${text.substring(0, 100)}`); 
        }

        const result = await response.json();
        
        if (result.status !== 'success') { 
            throw new Error(result.message || 'Unknown API Error'); 
        }
        
        return result;

    } catch (error) { 
        Logger.error(`Failed action: ${action}`, error); 
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

export function populateOptions(el, data, ph, valueKey, textKey) { 
    if (!el) return;
    el.innerHTML = `<option value="">${ph}</option>`; 
    if (!Array.isArray(data)) return;
    data.forEach(item => { 
        el.innerHTML += `<option value="${item[valueKey]}">${item[textKey]}</option>`;
    }); 
}

export function formatCurrency(amount) { 
    return `${(parseFloat(amount) || 0).toFixed(2)} EGP`; 
}

export function formatDate(dateString) { 
    if (!dateString) return '-'; 
    try { 
        return new Date(dateString).toLocaleDateString(); 
    } catch(e) { return dateString; } 
}

export function printContent(content) {
    const printArea = document.getElementById('print-area');
    if(printArea) { 
        printArea.innerHTML = content; 
        setTimeout(() => window.print(), 500); 
    }
}

export async function requestAdminContext(config) {
    const modal = document.getElementById('context-selector-modal');
    if (!modal) return null;

    modal.querySelectorAll('.form-group').forEach(el => el.style.display = 'none');
    
    const showGroup = (id, selectId, list) => {
        const group = document.getElementById(id);
        const select = document.getElementById(selectId);
        if(group && select) {
            populateOptions(select, list, 'Select Option', 'branchCode', 'branchName'); 
            if(id.includes('Section')) populateOptions(select, state.sections, 'Select Section', 'sectionCode', 'sectionName'); 
            group.style.display = 'block';
        }
    };

    if(config.branch) showGroup('context-modal-branch-group', 'context-branch-select', state.branches);
    if(config.fromBranch) showGroup('context-modal-fromBranch-group', 'context-from-branch-select', state.branches);
    if(config.toBranch) showGroup('context-modal-toBranch-group', 'context-to-branch-select', state.branches);
    if(config.toSection) showGroup('context-modal-toSection-group', 'context-to-section-select', state.sections);
    if(config.fromSection) showGroup('context-modal-fromSection-group', 'context-from-section-select', state.sections);

    modal.classList.add('active');
    
    return new Promise((resolve, reject) => {
        state.adminContextPromise = { resolve, reject };
    });
}

export function exportTableToExcel(tableId, filename = 'export.xlsx') {
    const table = document.getElementById(tableId);
    if (!table) { 
        showToast("No data to export", "error"); 
        return; 
    }
    
    // Clone table to avoid modifying UI
    const clone = table.cloneNode(true);
    
    // Remove "Action" columns and buttons
    const rows = clone.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        // Typically the last column is actions
        const lastCell = cells[cells.length - 1];
        if(lastCell && (lastCell.innerText === 'Actions' || lastCell.querySelector('button') || lastCell.querySelector('.action-buttons'))) {
            lastCell.remove();
        }
    });

    const wb = XLSX.utils.table_to_book(clone, { sheet: "Sheet1" });
    XLSX.writeFile(wb, filename);
}
