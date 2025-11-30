import { state, SCRIPT_URL } from './state.js';
import { Logger, showToast, setButtonLoading, _t } from './utils.js';
import { initializeAppUI } from './main.js';

export async function attemptLogin(u, c) {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginLoader = document.getElementById('login-loader');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');

    if (!u || !c) return;
    loginForm.style.display = 'none'; loginError.textContent = ''; loginLoader.style.display = 'flex';
    Logger.info(`Attempting to login...`);
    
    try {
        const res = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(u)}&loginCode=${encodeURIComponent(c)}`);
        if (!res.ok) throw new Error(`Network: ${res.status}`);
        const data = await res.json();
        if (data.status === 'error' || !data.user) throw new Error(data.message || 'Invalid credentials.');
        if (data.user.isDisabled === true) throw new Error('Account disabled.');
        
        state.username = u; state.loginCode = c; state.currentUser = data.user;
        Object.keys(data).forEach(k => { if(k !== 'user') state[k] = data[k] || []; });
        
        Logger.info(`Login successful for user: ${state.currentUser.Name}`);
        const savedLang = localStorage.getItem('userLanguage') || 'en';
        state.currentLanguage = savedLang;
        document.getElementById('lang-switcher').value = savedLang;
        
        loginContainer.style.display = 'none'; appContainer.style.display = 'flex';
        initializeAppUI(); 
    } catch (err) {
        Logger.error('Login failed:', err); 
        loginError.textContent = err.message; 
        loginLoader.style.display = 'none'; 
        loginForm.style.display = 'block';
    }
}

export async function postData(action, data, btn) {
    setButtonLoading(true, btn);
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ username: state.username, loginCode: state.loginCode, action, data }) });
        const result = await res.json();
        if (result.status !== 'success') throw new Error(result.message);
        return result;
    } catch (err) {
        showToast(_t('action_failed_toast', {errorMessage: err.message}), 'error'); return null;
    } finally { setButtonLoading(false, btn); }
}

export async function reloadDataAndRefreshUI() {
    const globalRefreshBtn = document.getElementById('global-refresh-button');
    if (!state.username) return;
    setButtonLoading(true, globalRefreshBtn);
    try {
        const res = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(state.username)}&loginCode=${encodeURIComponent(state.loginCode)}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data.status === 'error') throw new Error(data.message);
        Object.keys(data).forEach(k => { if(k !== 'user') state[k] = data[k] || state[k]; });
        
        const currentView = document.querySelector('.nav-item a.active')?.dataset.view || 'dashboard';
        // Note: refreshViewData needs to be imported or passed if used here directly, typically handled in main.js
        // For simplicity, triggering a custom event or callback in main is safer
        document.dispatchEvent(new CustomEvent('dataRefreshed', { detail: { view: currentView }}));
        
        showToast(_t('data_refreshed_toast'), 'success');
    } catch (err) { showToast(_t('data_refresh_fail_toast'), 'error'); } 
    finally { setButtonLoading(false, globalRefreshBtn); }
}