import { state, SCRIPT_URL } from './state.js';
import { Logger, showToast, setButtonLoading, _t } from './utils.js';

// Only fetches data. Does not Initialize UI.
export async function attemptLogin(u, c) {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginLoader = document.getElementById('login-loader');

    if (!u || !c) return false;
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
        
        return true; // Return success status
    } catch (err) {
        Logger.error('Login failed:', err); 
        loginError.textContent = err.message; 
        loginLoader.style.display = 'none'; 
        loginForm.style.display = 'block';
        return false; // Return failure status
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

export async function fetchRefreshData() {
    // Pure data fetch, no UI updates
    try {
        const res = await fetch(`${SCRIPT_URL}?username=${encodeURIComponent(state.username)}&loginCode=${encodeURIComponent(state.loginCode)}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data.status === 'error') throw new Error(data.message);
        Object.keys(data).forEach(k => { if(k !== 'user') state[k] = data[k] || state[k]; });
        return true;
    } catch (err) { 
        console.error(err);
        return false; 
    }
}
