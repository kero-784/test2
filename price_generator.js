

import { state } from './state.js';
import { postData, showToast, formatCurrency, _t } from './utils.js';

const priceGenState = {
    initialized: false,
    previewList: [],
    currentEditId: null, 
    currentSection: null,
    operations: [],
    masterDataFilter: null, 
    compSelectedOps: new Set(),
    foreignPricesTemp: {} // Temporary storage for comparison inputs
};

// --- UPDATED CSS STYLES FOR RESPONSIVENESS ---
const pgStyles = `
    .pg-compact-input { width: 100px !important; display: inline-block; padding: 6px 10px; font-size: 14px; }
    .pg-label-inline { font-weight: 600; width: 120px; display: inline-block; color: var(--text-light-color); font-size: 14px; }
    .pg-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .pg-tab-btn { margin-right: 5px; margin-bottom: 5px; }
    .pg-tab-btn.active { background-color: var(--primary-color); color: white; border-color: var(--primary-color); }
    .pg-calc-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; }
    
    /* Comparison Input Style */
    .comp-foreign-input { width: 140px !important; border: 1px solid #ccc; padding: 8px; border-radius: 4px; font-weight:bold; }

    /* MOBILE MENU STYLES */
    #pg-mobile-menu-btn { display: none; width: 100%; margin-bottom: 15px; text-align: left; justify-content: space-between; }
    #pg-mobile-menu-content { display: none; background: white; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    #pg-mobile-menu-content button { width: 100%; text-align: left; border: none; border-bottom: 1px solid #eee; background: none; padding: 12px 20px; border-radius: 0; }
    #pg-mobile-menu-content button:last-child { border-bottom: none; }

    /* MOBILE OVERRIDES */
    @media (max-width: 768px) {
        #pg-nav-container { display: none; }
        #pg-mobile-menu-btn { display: flex; }
        .pg-calc-header { flex-direction: column; align-items: stretch; gap: 10px; }
        .pg-calc-header h2 { font-size: 18px; margin-bottom: 5px; }
        
        .pg-row { flex-wrap: wrap; background: #f9f9f9; padding: 10px; border-radius: 8px; gap: 15px; }
        .pg-label-inline { width: 100%; display: block; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        
        /* Expand inputs on mobile for easier tapping */
        .pg-compact-input { width: 100% !important; max-width: none !important; min-height: 44px; }
        
        .form-grid { grid-template-columns: 1fr !important; gap: 10px; }
        .modal-content { width: 95%; max-height: 95vh; }
        
        /* Comparison specific */
        .comp-foreign-input { width: 100px !important; }
    }
`;

function initPriceGenModule() {
    if (priceGenState.initialized) return;
    const sidebar = document.getElementById('main-nav');
    if (!sidebar) return;

    const user = state.currentUser;
    if (!user) return;

    const hasPermission = (user.permissions && (user.permissions.opManagePriceLists === true || String(user.permissions.opManagePriceLists) === 'true'));
    const isAdmin = user.RoleName === 'Admin';
    if (!hasPermission && !isAdmin) return;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = pgStyles;
    document.head.appendChild(styleSheet);

    priceGenState.operations = (state.operations || []).map(o => ({
        Name: o.Name,
        Discount: parseFloat(o.Discount) || 0,
        Borsa: parseFloat(o.Borsa) || 0,
        Transport: parseFloat(o.Transport) || 0,
        Margins: o.Margins ? JSON.parse(o.Margins) : null
    }));
    
    if(priceGenState.operations.length === 0) {
        priceGenState.operations = [{Name: 'Tamri', Discount: 0, Borsa:0, Transport:0, Margins:null}, {Name: 'Shahd', Discount: 0, Borsa:0, Transport:0, Margins:null}];
    }
    
    if (!priceGenState.currentSection) priceGenState.currentSection = priceGenState.operations[0].Name;
    priceGenState.masterDataFilter = priceGenState.operations[0].Name;

    injectPriceGenUI();
    attachPriceGenListeners();
    // Removed loadSavedSettings() call here because we rely on DB state now
    
    priceGenState.initialized = true;
    console.log("Price Generator V25 Loaded (Fixed Init)");
}

function injectPriceGenUI() {
    if (document.getElementById('nav-price-gen-link')) return;

    const sidebar = document.getElementById('main-nav');
    const li = document.createElement('li');
    li.className = 'nav-item';
    li.innerHTML = `<a href="#" id="nav-price-gen-link" data-view="price-gen">
        <svg style="width:22px;height:22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/><path d="M20 7L16 3L12 7L8 3L4 7L12 15L20 7Z"/></svg>
        <span style="margin-left:10px;">Price Generator</span>
    </a>`;
    const logoutBtn = sidebar.querySelector('.nav-item-logout');
    if (logoutBtn) sidebar.insertBefore(li, logoutBtn); else sidebar.appendChild(li);

    const mainContent = document.querySelector('.main-content');
    if (mainContent && !document.getElementById('view-price-gen')) {
        const viewDiv = document.createElement('div');
        viewDiv.id = 'view-price-gen';
        viewDiv.className = 'view';
        
        let tabsHtml = '';
        let mobileMenuHtml = '';
        priceGenState.operations.forEach(op => {
            tabsHtml += `<button class="sub-nav-item" data-pg-section="${op.Name}">${op.Name}</button>`;
            mobileMenuHtml += `<button class="pg-mobile-link" data-pg-section="${op.Name}">${op.Name}</button>`;
        });

        const stdTabs = [{id:'comparison', label:'Comparison'}, {id:'manage', label:'Master Data'}, {id:'ops', label:'Operations'}];
        stdTabs.forEach(t => {
            tabsHtml += `<button class="sub-nav-item" data-pg-section="${t.id}">${t.label}</button>`;
            mobileMenuHtml += `<button class="pg-mobile-link" data-pg-section="${t.id}">${t.label}</button>`;
        });

        let masterTabsHtml = '';
        priceGenState.operations.forEach(op => {
            masterTabsHtml += `<button class="secondary small pg-tab-btn" onclick="filterMasterData('${op.Name}')">${op.Name}</button>`;
        });

        viewDiv.innerHTML = `
            <!-- MOBILE MENU -->
            <button id="pg-mobile-menu-btn" class="secondary" onclick="toggleMobileMenu()">
                <span id="pg-mobile-current-title">Select Section</span>
                <span>☰</span>
            </button>
            <div id="pg-mobile-menu-content">
                ${mobileMenuHtml}
            </div>

            <!-- DESKTOP TABS -->
            <div class="sub-nav" id="pg-nav-container">
                ${tabsHtml}
            </div>

            <!-- MAIN VIEW (CALCULATOR) -->
            <div id="pg-calculator-container" class="pg-section">
                <!-- Header / Controls -->
                <div class="card">
                    <div class="pg-calc-header">
                        <div style="display:flex; flex-direction:column;">
                            <h2 id="pg-section-title" style="margin:0; border:none; font-size:22px;">Price Calculator</h2>
                            <span class="status-tag status-pending" id="pg-display-discount" style="margin-top:5px; align-self:flex-start;">Disc: 0%</span>
                        </div>
                        <div class="toolbar-actions" style="margin-left:0;">
                            <button class="secondary" onclick="openCalcModal()">⚙️ Config</button>
                            <button class="primary" id="pg-btn-save">Save Prices</button>
                            <button class="secondary" id="pg-btn-export">Export Excel</button>
                        </div>
                    </div>
                </div>

                <!-- Results Table -->
                <div class="card" id="pg-result-card" style="margin-top:0;">
                    <div class="report-area" style="max-height: 70vh;">
                        <table id="pg-preview-table">
                            <thead><tr><th>Code</th><th>Name</th><th>Sub-Cat</th><th>Base Cost</th><th>Net Cost</th><th>Price A</th><th>Price B</th><th>Price C</th></tr></thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- COMPARISON -->
            <div id="pg-comparison-container" class="pg-section" style="display:none;">
                <div class="card">
                    <div class="toolbar">
                        <h2>Comparison Tool</h2>
                        <button class="secondary small" onclick="printComparison()">Print / PDF</button>
                    </div>
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr auto; align-items:end;">
                        <div class="form-group"><label>Side A</label><div style="display:flex; gap:5px;"><select id="pg-comp-op-a" style="flex:1;"></select><select id="pg-comp-cat-a" style="width:100px;"><option value="Cost">Cost</option><option value="PriceA" selected>Price A</option><option value="PriceB">Price B</option><option value="PriceC">Price C</option></select></div></div>
                        <div class="form-group"><label>Side B</label><div style="display:flex; gap:5px;"><select id="pg-comp-op-b" style="flex:1;"></select><select id="pg-comp-cat-b" style="width:100px;"><option value="Cost">Cost</option><option value="PriceA" selected>Price A</option><option value="PriceB">Price B</option><option value="PriceC">Price C</option></select></div></div>
                        <button class="primary" id="pg-btn-run-compare" style="margin-bottom:16px;">Compare</button>
                    </div>
                    <div id="pg-print-area">
                        <div class="report-area" style="margin-top:20px; max-height:70vh;">
                            <table id="pg-compare-table">
                                <thead>
                                    <tr>
                                        <th>Common Name</th>
                                        <th id="th-side-a">Side A</th>
                                        <th id="th-side-b">Side B</th>
                                        <th>Diff</th>
                                        <th style="background:#e3f2fd">Foreign Market</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MANAGE DATA -->
            <div id="pg-manage-container" class="pg-section" style="display:none;">
                 <div class="card">
                    <div class="toolbar">
                        <h2>Manage Pricing Items</h2>
                        <div class="toolbar-actions">
                            <input type="search" id="pg-manage-search" placeholder="Search..." class="search-bar-input">
                            <button class="primary small" id="pg-btn-add-item">Add Item</button>
                        </div>
                    </div>
                    <div class="sub-nav" style="margin-bottom:15px; border-bottom:1px solid #eee;">
                        ${masterTabsHtml}
                    </div>
                    <div class="report-area" style="max-height:70vh;">
                        <table id="pg-manage-table"><thead><tr><th>Code</th><th>Name</th><th>Sub-Cat</th><th>Logic</th><th>Action</th></tr></thead><tbody></tbody></table>
                    </div>
                </div>
            </div>

            <!-- OPS -->
            <div id="pg-ops-container" class="pg-section" style="display:none;">
                <div class="card">
                    <h2>Manage Operations</h2>
                    <div style="display:flex; gap:10px; margin-bottom:20px; align-items:end;">
                        <div class="form-group" style="margin-bottom:0;"><label>Name</label><input type="text" id="pg-new-op-name"></div>
                        <div class="form-group" style="margin-bottom:0;"><label>Discount %</label><input type="number" id="pg-new-op-disc" class="pg-compact-input"></div>
                        <button class="primary" id="pg-btn-add-op">Add</button>
                    </div>
                    <div class="report-area">
                        <table style="margin-top:20px;"><thead><tr><th>Name</th><th>Discount %</th><th>Action</th></tr></thead><tbody id="pg-ops-list-tbody"></tbody></table>
                    </div>
                </div>
            </div>

            <!-- POPUP CALCULATOR MODAL -->
            <div id="pg-modal-calc" class="modal-overlay">
                <div class="modal-content" style="max-width:900px;">
                    <div class="modal-header"><h2 id="pg-calc-modal-title">Config & Calculate</h2><button class="close-button" onclick="document.getElementById('pg-modal-calc').classList.remove('active')">×</button></div>
                    <div class="modal-body">
                        <div class="form-group" style="margin-bottom: 20px;">
                            <div class="radio-group">
                                <input type="radio" id="method-borsa" name="calc-method" checked onchange="toggleMethod('borsa')">
                                <label for="method-borsa" style="margin-right:10px;">By Factor / Formula</label>
                                <input type="radio" id="method-file" name="calc-method" onchange="toggleMethod('file')">
                                <label for="method-file">By File Upload</label>
                            </div>
                        </div>

                        <div id="box-method-borsa" class="method-box">
                            <div class="pg-row" style="background:#f9f9f9; padding:10px; border-radius:8px;">
                                <div style="flex: 1; min-width: 150px;">
                                    <label style="font-size:12px; display:block; color:#666; margin-bottom:4px;">Borsa Price</label>
                                    <input type="number" id="pg-borsa" class="pg-compact-input" placeholder="0.00">
                                </div>
                                <div style="flex: 1; min-width: 150px;">
                                    <label style="font-size:12px; display:block; color:#666; margin-bottom:4px;">Transport</label>
                                    <input type="number" id="pg-nawlon" class="pg-compact-input" placeholder="0.00">
                                </div>
                            </div>
                        </div>

                        <div id="box-method-file" class="method-box" style="display:none; border: 2px dashed #ccc; padding: 15px; text-align: center; margin-bottom: 15px;">
                            <input type="file" id="pg-file-upload" accept=".xlsx, .xls">
                        </div>

                        <hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;">

                        <div class="pg-row">
                            <span class="pg-label-inline" style="color:var(--primary-color);">Normal (عادي)</span>
                            <div style="display:flex; align-items:center; gap:5px; flex:1;"><span style="font-size:12px; color:#888;">A%</span><input type="number" id="pg-pct-a-norm" class="pg-compact-input" style="flex:1;"></div>
                            <div style="display:flex; align-items:center; gap:5px; flex:1;"><span style="font-size:12px; color:#888;">B%</span><input type="number" id="pg-pct-b-norm" class="pg-compact-input" style="flex:1;"></div>
                            <div style="display:flex; align-items:center; gap:5px; flex:1;"><span style="font-size:12px; color:#888;">C%</span><input type="number" id="pg-pct-c-norm" class="pg-compact-input" style="flex:1;"></div>
                        </div>

                        <div class="pg-row">
                            <span class="pg-label-inline" style="color:#E65100;">Marinated (متبل)</span>
                            <div style="display:flex; align-items:center; gap:5px; flex:1;"><span style="font-size:12px; color:#888;">A%</span><input type="number" id="pg-pct-a-mar" class="pg-compact-input" style="flex:1;"></div>
                            <div style="display:flex; align-items:center; gap:5px; flex:1;"><span style="font-size:12px; color:#888;">B%</span><input type="number" id="pg-pct-b-mar" class="pg-compact-input" style="flex:1;"></div>
                            <div style="display:flex; align-items:center; gap:5px; flex:1;"><span style="font-size:12px; color:#888;">C%</span><input type="number" id="pg-pct-c-mar" class="pg-compact-input" style="flex:1;"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="primary" id="pg-btn-calc" style="width:100%;">Calculate & Save Config</button>
                    </div>
                </div>
            </div>

             <!-- ADD/EDIT MODAL -->
            <div id="pg-modal-add" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header"><h2 id="pg-modal-title">Edit Item</h2><button class="close-button" onclick="document.getElementById('pg-modal-add').classList.remove('active')">×</button></div>
                    <div class="modal-body">
                        <form id="pg-form-add">
                            <div class="form-grid">
                                <div class="form-group"><label>Operation</label><select name="Type" id="pg-input-type"></select></div>
                                <div class="form-group"><label>Sub-Category</label><select name="SubCategory"><option value="Normal">Normal</option><option value="Marinated">Marinated</option></select></div>
                                <div class="form-group"><label>Code</label><input type="text" name="Code" id="pg-input-code" required></div>
                                <div class="form-group"><label>Name</label><input type="text" name="Name" required></div>
                                <div class="form-group"><label>Comparison Name</label><input type="text" name="CommonName"></div>
                                <div class="form-group span-full" style="border-top:1px solid #ddd; padding-top:10px; margin-top:10px;">
                                    <label>Cost Method</label>
                                    <div class="radio-group">
                                        <input type="radio" name="calc_mode" id="mode-direct" value="direct" checked onclick="toggleCalcMode('direct')">
                                        <label for="mode-direct">Factor (x Borsa)</label>
                                        <input type="radio" name="calc_mode" id="mode-formula" value="formula" onclick="toggleCalcMode('formula')">
                                        <label for="mode-formula">Formula / Linked</label>
                                    </div>
                                </div>
                                <div class="form-group" id="div-direct"><label>Factor</label><input type="number" name="Factor" step="0.001"></div>
                                <div id="div-formula" style="display:none; width:100%; grid-column:1/-1;">
                                    <div class="form-group"><label>Formula</label><input type="text" name="Formula" id="pg-input-formula" placeholder="e.g. ([SELF]/1150)*1000"><button type="button" class="secondary small" style="margin-top:5px;" onclick="document.getElementById('pg-modal-parent-select').classList.add('active')">Pick Code</button></div>
                                </div>
                            </div>
                            <button type="submit" class="primary" style="margin-top:20px;">Save Item</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- CODE PICKER -->
            <div id="pg-modal-parent-select" class="modal-overlay">
                <div class="modal-content" style="max-width:500px">
                     <div class="modal-header"><h2>Pick Item</h2><button class="close-button" onclick="document.getElementById('pg-modal-parent-select').classList.remove('active')">×</button></div>
                     <div class="modal-body">
                        <input type="search" id="pg-parent-search" class="search-bar-input" placeholder="Search item...">
                        <div id="pg-parent-list" style="margin-top:10px; display:flex; flex-direction:column; gap:5px;"></div>
                     </div>
                </div>
            </div>
        `;
        mainContent.appendChild(viewDiv);
        
        document.querySelector(`.sub-nav-item[data-pg-section="${priceGenState.currentSection}"]`).click();
    }
}

// --- LOGIC ---

window.openCalcModal = () => {
    document.getElementById('pg-modal-calc').classList.add('active');
    document.getElementById('pg-calc-modal-title').innerText = `${priceGenState.currentSection} Config`;
    loadSettingsFromState(priceGenState.currentSection);
}

window.toggleMobileMenu = () => {
    const m = document.getElementById('pg-mobile-menu-content');
    if(m) m.style.display = (m.style.display === 'block') ? 'none' : 'block';
};

function switchSection(sec) {
    priceGenState.currentSection = sec;
    
    document.querySelectorAll('.pg-section').forEach(el => el.style.display = 'none');
    document.getElementById('pg-mobile-current-title').textContent = sec;
    document.getElementById('pg-mobile-menu-content').style.display = 'none'; 
    
    document.querySelectorAll('.sub-nav-item').forEach(b => {
        b.classList.toggle('active', b.dataset.pgSection === sec);
    });

    if (sec === 'comparison') {
        document.getElementById('pg-comparison-container').style.display = 'block';
        initComparisonSelects();
    } else if (sec === 'manage') {
        document.getElementById('pg-manage-container').style.display = 'block';
        filterMasterData(priceGenState.masterDataFilter || priceGenState.currentSection);
    } else if (sec === 'ops') {
        document.getElementById('pg-ops-container').style.display = 'block';
        renderOpsList();
    } else {
        document.getElementById('pg-section-title').textContent = `${sec} Calculator`;
        document.getElementById('pg-calculator-container').style.display = 'block';
        loadSettingsFromState(sec);
        loadSectionItems();
    }
}

function updateSectionDiscountLabel() {
    const op = priceGenState.operations.find(o => o.Name === priceGenState.currentSection);
    const disc = op ? op.Discount : 0;
    const label = document.getElementById('pg-display-discount');
    if(label) label.textContent = `Applied Discount: ${disc}%`;
}

function loadSettingsFromState(sectionName) {
    const op = priceGenState.operations.find(o => o.Name === sectionName);
    if (!op) return;

    if(document.getElementById('pg-borsa')) {
        document.getElementById('pg-borsa').value = op.Borsa || '';
        document.getElementById('pg-nawlon').value = op.Transport || '';
    }

    const m = op.Margins || { norm: {a:'',b:'',c:''}, mar: {a:'',b:'',c:''} };
    if(document.getElementById('pg-pct-a-norm')) {
        document.getElementById('pg-pct-a-norm').value = m.norm ? m.norm.a : '';
        document.getElementById('pg-pct-b-norm').value = m.norm ? m.norm.b : '';
        document.getElementById('pg-pct-c-norm').value = m.norm ? m.norm.c : '';
        document.getElementById('pg-pct-a-mar').value = m.mar ? m.mar.a : '';
        document.getElementById('pg-pct-b-mar').value = m.mar ? m.mar.b : '';
        document.getElementById('pg-pct-c-mar').value = m.mar ? m.mar.c : '';
    }
}

async function saveSettingsToDB() {
    const sectionName = priceGenState.currentSection;
    const op = priceGenState.operations.find(o => o.Name === sectionName);
    if(!op) return;

    const borsa = document.getElementById('pg-borsa').value;
    const nawlon = document.getElementById('pg-nawlon').value;
    
    const margins = {
        norm: {
            a: document.getElementById('pg-pct-a-norm').value,
            b: document.getElementById('pg-pct-b-norm').value,
            c: document.getElementById('pg-pct-c-norm').value
        },
        mar: {
            a: document.getElementById('pg-pct-a-mar').value,
            b: document.getElementById('pg-pct-b-mar').value,
            c: document.getElementById('pg-pct-c-mar').value
        }
    };

    op.Borsa = borsa;
    op.Transport = nawlon;
    op.Margins = margins;

    await postData('deleteOperation', {Name: sectionName}, null);
    await postData('addOperation', {
        Name: sectionName, 
        Discount: op.Discount,
        Borsa: borsa,
        Transport: nawlon,
        Margins: JSON.stringify(margins)
    }, null);
}

function smartRound(price) {
    if (!price || isNaN(price)) return 0;
    const integerPart = Math.floor(price);
    const decimalPart = price - integerPart;
    if (decimalPart <= 0.50) return integerPart + 0.50;
    if (decimalPart <= 0.75) return integerPart + 0.75;
    return integerPart + 0.95;
}

function calculateSalesPrice(cost, marginInput) {
    const margin = (parseFloat(marginInput) || 0) / 100;
    if (margin >= 1) return cost;
    const rawPrice = cost / (1 - margin);
    return smartRound(rawPrice);
}

// --- FORMULA EVALUATOR ---
function evaluateCost(item, borsa, nawlon, costMap, visited = new Set(), fileCost = null) {
    if (visited.has(item.Code)) return 0; 
    visited.add(item.Code);

    let baseCost = 0;
    if (fileCost !== null) {
        baseCost = fileCost;
    } else if (parseFloat(item.Factor) > 0) {
        baseCost = (borsa + nawlon) * parseFloat(item.Factor);
    }

    if (!item.Formula) return baseCost;

    let expression = item.Formula.toUpperCase();
    const selfTag = `[${item.Code.toUpperCase()}]`;
    if (expression.includes('[SELF]')) expression = expression.split('[SELF]').join(baseCost);
    if (expression.includes(selfTag)) expression = expression.split(selfTag).join(baseCost);

    const matches = expression.match(/\[(.*?)\]/g);
    if (matches) {
        matches.forEach(match => {
            const code = match.replace('[','').replace(']','').trim();
            let refCost = costMap.get(code);
            if (refCost === undefined) {
                const refItem = state.pricingItems.find(i => i.Code === code);
                if (refItem) refCost = evaluateCost(refItem, borsa, nawlon, costMap, visited);
                else refCost = 0;
            }
            expression = expression.split(match).join(refCost);
        });
    }

    try {
        const cleanExpr = expression.replace(/[^0-9+\-*/().. ]/g, ''); 
        if(cleanExpr.trim().length > 0) return new Function('return ' + cleanExpr)();
    } catch (e) {
        return 0;
    }
    return 0;
}

// --- TAB INITIALIZER ---
function loadSectionItems() {
    priceGenState.previewList = [];
    const items = (state.pricingItems || []).filter(i => i.Type === priceGenState.currentSection);
    items.forEach(item => {
        priceGenState.previewList.push({
            ...item, NewCost: 0, BaseCost: 0, NewPriceA: 0, NewPriceB: 0, NewPriceC: 0
        });
    });
    renderPreviewTable();
    updateSectionDiscountLabel();
}

// --- CALCULATION HANDLER ---
function handleCalculation() {
    saveSettingsToDB(); 
    document.getElementById('pg-modal-calc').classList.remove('active'); // Close modal

    if (document.getElementById('method-file').checked) {
        processFileCalculation();
    } else {
        processBorsaCalculation();
    }
}

function processBorsaCalculation() {
    const borsa = parseFloat(document.getElementById('pg-borsa').value) || 0;
    const nawlon = parseFloat(document.getElementById('pg-nawlon').value) || 0;
    if (borsa <= 0) showToast('Warning: Borsa is 0', 'info');
    runPricingLogic((item, costMap) => evaluateCost(item, borsa, nawlon, costMap, new Set(), null));
}

function processFileCalculation() {
    const file = document.getElementById('pg-file-upload').files[0];
    if (!file) { showToast('Upload File', 'error'); return; }

    const reader = new FileReader();
    reader.onload = function(evt) {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
        
        const fileCostMap = new Map();
        json.forEach(row => {
            const keys = Object.keys(row);
            const codeKey = keys.find(k => k.toLowerCase().includes('code'));
            const costKey = keys.find(k => k.toLowerCase().includes('cost'));
            if(codeKey && costKey) fileCostMap.set(String(row[codeKey]).trim(), parseFloat(row[costKey]));
        });

        runPricingLogic((item, costMap) => {
            const fCost = fileCostMap.get(item.Code) !== undefined ? fileCostMap.get(item.Code) : null;
            return evaluateCost(item, 0, 0, costMap, new Set(), fCost);
        });
    };
    reader.readAsArrayBuffer(file);
}

function runPricingLogic(costResolver) {
    const op = priceGenState.operations.find(o => o.Name === priceGenState.currentSection);
    const discountPct = (op ? op.Discount : 0) / 100;

    const norm = {
        a: document.getElementById('pg-pct-a-norm').value,
        b: document.getElementById('pg-pct-b-norm').value,
        c: document.getElementById('pg-pct-c-norm').value
    };
    const mar = {
        a: document.getElementById('pg-pct-a-mar').value,
        b: document.getElementById('pg-pct-b-mar').value,
        c: document.getElementById('pg-pct-c-mar').value
    };

    let sectionItems = (state.pricingItems || []).filter(i => i.Type === priceGenState.currentSection);
    const costMap = new Map(); 

    let changes = true; let passes = 0;
    sectionItems.forEach(item => {
        const c = costResolver(item, costMap);
        if (c > 0) costMap.set(item.Code, c);
    });

    while(changes && passes < 10) {
        changes = false;
        sectionItems.forEach(item => {
            const oldC = costMap.get(item.Code) || 0;
            const newC = costResolver(item, costMap);
            if (newC > 0 && Math.abs(newC - oldC) > 0.001) {
                costMap.set(item.Code, newC);
                changes = true;
            }
        });
        passes++;
    }

    priceGenState.previewList = [];
    sectionItems.forEach(item => {
        const rawCost = costMap.get(item.Code) || 0;
        const netCost = rawCost > 0 ? rawCost * (1 - discountPct) : 0;
        const margins = (item.SubCategory === 'Marinated') ? mar : norm;

        priceGenState.previewList.push({
            ...item,
            NewCost: netCost, 
            BaseCost: rawCost,
            NewPriceA: calculateSalesPrice(netCost, margins.a),
            NewPriceB: calculateSalesPrice(netCost, margins.b),
            NewPriceC: calculateSalesPrice(netCost, margins.c)
        });
    });
    renderPreviewTable();
}

function renderPreviewTable() {
    const tbody = document.querySelector('#pg-preview-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const itemsToRender = priceGenState.previewList; 

    itemsToRender.forEach(i => {
        const tr = document.createElement('tr');
        const costStyle = i.NewCost > 0 ? "background:#e3f2fd;font-weight:bold" : "background:#ffebee;color:red";
        const valDisp = i.NewCost > 0 ? formatCurrency(i.NewCost) : "0.00";
        tr.innerHTML = `<td>${i.Code}</td><td>${i.Name}</td><td>${i.SubCategory||'N'}</td><td>${formatCurrency(i.BaseCost)}</td><td style="${costStyle}">${valDisp}</td><td>${formatCurrency(i.NewPriceA)}</td><td>${formatCurrency(i.NewPriceB)}</td><td>${formatCurrency(i.NewPriceC)}</td>`;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
}

// --- COMPARISON ---
function initComparisonSelects() {
    const selA = document.getElementById('pg-comp-op-a');
    const selB = document.getElementById('pg-comp-op-b');
    if(!selA) return;
    
    const opts = [...priceGenState.operations.map(o=>o.Name), 'Foreign Market'];
    [selA, selB].forEach(sel => {
        sel.innerHTML = '';
        opts.forEach(op => sel.innerHTML += `<option value="${op}">${op}</option>`);
    });
    if(opts.length > 1) selB.value = opts[1]; 
}

function handleComparison() {
    const opA = document.getElementById('pg-comp-op-a').value;
    const catA = document.getElementById('pg-comp-cat-a').value;
    const opB = document.getElementById('pg-comp-op-b').value;
    const catB = document.getElementById('pg-comp-cat-b').value;

    document.getElementById('th-side-a').innerText = `${opA} (${catA})`;
    document.getElementById('th-side-b').innerText = `${opB} (${catB})`;

    const tbody = document.getElementById('pg-compare-table').querySelector('tbody');
    tbody.innerHTML = '';

    const getValue = (item, cat) => {
        if(!item) return 0;
        if(item.isForeign) {
            // Check temp first, else DB
            return priceGenState.foreignPricesTemp[item.CommonName] !== undefined ? priceGenState.foreignPricesTemp[item.CommonName] : (parseFloat(item.ForeignPrice) || 0);
        }
        return parseFloat(item[cat]) || 0;
    };

    const getList = (op) => {
        if(op === 'Foreign Market') {
            const distinctCommon = [...new Set(state.pricingItems.filter(i=>i.CommonName).map(i=>i.CommonName))];
            return distinctCommon.map(cn => {
                const ref = state.pricingItems.find(i => i.CommonName === cn);
                return { CommonName: cn, ForeignPrice: ref.ForeignPrice, isForeign: true };
            });
        }
        return state.pricingItems.filter(i => i.Type === op && i.CommonName);
    };

    const listA = getList(opA);
    const listB = getList(opB);

    listA.forEach(itemA => {
        const itemB = listB.find(x => x.CommonName.trim().toLowerCase() === itemA.CommonName.trim().toLowerCase());
        const valA = getValue(itemA, catA);
        const valB = getValue(itemB, catB);
        const diff = valA - valB;
        
        let foreignHtml = '';
        if(opA === 'Foreign Market' || opB === 'Foreign Market') {
            const displayVal = itemA.isForeign ? getValue(itemA, null) : (itemB && itemB.isForeign ? getValue(itemB, null) : 0);
            foreignHtml = `<td><input type="number" step="0.01" class="comp-foreign-input" data-common="${itemA.CommonName}" value="${displayVal}"></td>`;
        } else {
            const fVal = parseFloat(itemA.ForeignPrice || 0);
            foreignHtml = `<td style="background:#e3f2fd">${formatCurrency(fVal)}</td>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>${itemA.CommonName}</td>
                <td>${formatCurrency(valA)}</td>
                <td>${formatCurrency(valB)}</td>
                <td style="font-weight:bold; color:${diff>0?'red':(diff<0?'green':'black')}">${diff.toFixed(2)}</td>
                ${foreignHtml}
            </tr>`;
    });

    tbody.querySelectorAll('.comp-foreign-input').forEach(inp => {
        inp.addEventListener('change', (e) => {
            const cn = e.target.dataset.common;
            const val = parseFloat(e.target.value) || 0;
            priceGenState.foreignPricesTemp[cn] = val; 
            e.target.style.backgroundColor = '#fff3cd'; 
        });
    });
}

// --- PRINT COMPARISON (FIXED FOR INPUTS) ---
window.printComparison = () => {
    const sourceTable = document.getElementById('pg-compare-table');
    const printTable = sourceTable.cloneNode(true);
    
    const sourceInputs = sourceTable.querySelectorAll('input');
    const printInputs = printTable.querySelectorAll('input');
    
    for(let i=0; i<sourceInputs.length; i++) {
        const val = sourceInputs[i].value;
        const span = document.createElement('span');
        span.innerText = val ? formatCurrency(val) : '-';
        printInputs[i].parentNode.replaceChild(span, printInputs[i]);
    }

    const win = window.open('', '', 'height=600,width=800');
    win.document.write('<html><head><title>Comparison Report</title>');
    win.document.write('<style>table {width:100%; border-collapse:collapse; font-family:sans-serif;} th, td {border:1px solid #ccc; padding:8px; text-align:left;} th {background:#eee;} body{padding:20px;}</style>');
    win.document.write('</head><body><h2>Comparison Report</h2>');
    win.document.write(printTable.outerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
};

// --- MASTER DATA FILTER ---
window.filterMasterData = (opName) => {
    priceGenState.masterDataFilter = opName;
    document.querySelectorAll('.pg-tab-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.pg-tab-btn')).find(el => el.textContent === opName);
    if(activeBtn) activeBtn.classList.add('active');
    renderManageTable(document.getElementById('pg-manage-search').value);
};

function renderManageTable(filter = '') {
    const tbody = document.querySelector('#pg-manage-table tbody');
    tbody.innerHTML = '';
    const lower = filter.toLowerCase();
    
    let list = (state.pricingItems || []);
    if (priceGenState.masterDataFilter) {
        list = list.filter(i => i.Type === priceGenState.masterDataFilter);
    }
    list = list.filter(i => i.Name.toLowerCase().includes(lower) || i.Code.toLowerCase().includes(lower));

    list.slice(0, 100).forEach(i => {
        let calcInfo = i.Formula ? `Formula` : `Factor: ${i.Factor}`;
        tbody.innerHTML += `<tr><td>${i.Code}</td><td>${i.Name}</td><td>${i.SubCategory||'Normal'}</td><td>${calcInfo}</td><td><button class="secondary small" onclick="window.editPGItem('${i.Code}')">Edit</button></td></tr>`;
    });
}
window.editPGItem = openEditModal;

function renderOpsList() {
    const tbody = document.getElementById('pg-ops-list-tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    priceGenState.operations.forEach(op => {
        tbody.innerHTML += `<tr><td>${op.Name}</td><td><input type="number" class="op-disc-input" data-name="${op.Name}" value="${op.Discount}" style="width:80px"> %</td><td><button class="primary small" onclick="saveOpDiscount('${op.Name}')">Save</button> <button class="danger small" onclick="deleteOperation('${op.Name}')">X</button></td></tr>`;
    });
}

window.saveOpDiscount = async (name) => {
    const input = document.querySelector(`.op-disc-input[data-name="${name}"]`);
    const val = parseFloat(input.value) || 0;
    
    const op = priceGenState.operations.find(o => o.Name === name);
    
    await postData('deleteOperation', {Name: name}, null);
    await postData('addOperation', {
        Name: name, 
        Discount: val,
        Borsa: op.Borsa,
        Transport: op.Transport,
        Margins: JSON.stringify(op.Margins)
    }, null);
    
    showToast('Discount Updated');
    location.reload();
}

window.deleteOperation = async (name) => {
    if(!confirm('Delete operation '+name+'?')) return;
    await postData('deleteOperation', {Name: name}, null);
    location.reload();
}

document.getElementById('pg-btn-add-op')?.addEventListener('click', async () => {
    const name = document.getElementById('pg-new-op-name').value;
    const disc = document.getElementById('pg-new-op-disc').value || 0;
    if(name) { await postData('addOperation', {Name: name, Discount: disc}, null); location.reload(); }
});

// --- SAVING ---
async function saveToSystem() {
    const btn = document.getElementById('pg-btn-save');
    btn.textContent = 'Saving...'; btn.disabled = true;

    // SAFE SAVE: Only updates prices. Never touches Factor/Formula.
    const updates = priceGenState.previewList.filter(item => item.Code && item.NewCost > 0).map(item => ({
        type: 'pricingItem', id: item.Code,
        updates: { Cost: parseFloat(item.NewCost)||0, PriceA: parseFloat(item.NewPriceA)||0, PriceB: parseFloat(item.NewPriceB)||0, PriceC: parseFloat(item.NewPriceC)||0 }
    }));

    const CHUNK_SIZE = 50;
    let success = true;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE);
        const res = await postData('batchUpdateData', { updates: chunk }, null);
        if (!res) success = false;
        btn.textContent = `Saving (${Math.min(i+CHUNK_SIZE, updates.length)}/${updates.length})...`;
    }

    if (success) { showToast('Saved Successfully', 'success'); document.getElementById('global-refresh-button').click(); } 
    else { showToast('Errors occurred', 'error'); }
    btn.textContent = 'Save to System'; btn.disabled = false;
}

// --- HANDLERS ---
window.toggleCalcMode = (mode) => {
    document.getElementById('div-direct').style.display = mode === 'direct' ? 'block' : 'none';
    document.getElementById('div-formula').style.display = mode === 'formula' ? 'block' : 'none';
}
window.toggleMethod = (method) => {
    document.getElementById('box-method-borsa').style.display = method === 'borsa' ? 'block' : 'none';
    document.getElementById('box-method-file').style.display = method === 'file' ? 'block' : 'none';
}

function openAddModal() {
    priceGenState.currentEditId = null;
    document.getElementById('pg-modal-title').textContent = "Add Item";
    document.getElementById('pg-form-add').reset();
    document.getElementById('pg-input-code').readOnly = false;
    document.getElementById('mode-direct').click();
    const sel = document.getElementById('pg-input-type');
    sel.innerHTML = '';
    priceGenState.operations.forEach(op => sel.innerHTML+=`<option value="${op.Name}">${op.Name}</option>`);
    document.getElementById('pg-modal-add').classList.add('active');
}

function openEditModal(code) {
    const item = state.pricingItems.find(i => i.Code === code);
    if(!item) return;
    priceGenState.currentEditId = code;
    
    const sel = document.getElementById('pg-input-type');
    sel.innerHTML = '';
    priceGenState.operations.forEach(op => sel.innerHTML+=`<option value="${op.Name}" ${op.Name===item.Type?'selected':''}>${op.Name}</option>`);

    const form = document.getElementById('pg-form-add');
    form.Code.value = item.Code;
    document.getElementById('pg-input-code').readOnly = true;
    form.Name.value = item.Name;
    form.CommonName.value = item.CommonName || '';
    form.SubCategory.value = item.SubCategory || 'Normal';
    
    if (item.Formula) {
        document.getElementById('mode-formula').click();
        form.Formula.value = item.Formula;
    } else {
        document.getElementById('mode-direct').click();
        form.Factor.value = item.Factor;
    }
    document.getElementById('pg-modal-add').classList.add('active');
}

async function handleSaveItem(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    if(payload.calc_mode === 'direct') {
        payload.Formula = '';
    } else {
        payload.Factor = '';
    }
    delete payload.calc_mode;

    let action = 'addPricingItem';
    let data = payload;
    if(priceGenState.currentEditId) { action = 'updateData'; data = { type: 'pricingItem', id: priceGenState.currentEditId, updates: payload }; }
    
    await postData(action, data, e.target.querySelector('button'));
    showToast('Saved');
    document.getElementById('pg-modal-add').classList.remove('active');
    document.getElementById('global-refresh-button').click();
}

function exportExcel() {
    if (typeof XLSX === 'undefined') return;
    const data = priceGenState.previewList.map(i => ({ "Code":i.Code, "Name":i.Name, "SubCat":i.SubCategory, "Base Cost":i.BaseCost, "Net Cost":i.NewCost, "Price A":i.NewPriceA, "Price B":i.NewPriceB, "Price C":i.NewPriceC }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prices");
    XLSX.writeFile(wb, "Calculated_Prices.xlsx");
}

function attachPriceGenListeners() {
    // Nav Click Listener (Delegation)
    document.getElementById('pg-nav-container').addEventListener('click', (e) => {
        if(e.target.classList.contains('sub-nav-item')) {
            switchSection(e.target.dataset.pgSection);
        }
    });
    
    // Mobile Menu Delegation
    document.getElementById('pg-mobile-menu-content').addEventListener('click', (e) => {
        if(e.target.classList.contains('pg-mobile-link')) {
            switchSection(e.target.dataset.pgSection);
        }
    });

    document.getElementById('pg-btn-calc')?.addEventListener('click', handleCalculation);
    document.getElementById('pg-btn-save')?.addEventListener('click', saveToSystem);
    document.getElementById('pg-btn-export')?.addEventListener('click', exportExcel);
    document.getElementById('pg-btn-run-compare')?.addEventListener('click', handleComparison);
    
    document.getElementById('pg-btn-add-item')?.addEventListener('click', openAddModal);
    document.getElementById('pg-form-add')?.addEventListener('submit', handleSaveItem);
    document.getElementById('pg-manage-search')?.addEventListener('input', (e) => renderManageTable(e.target.value));
    
    document.getElementById('nav-price-gen-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-price-gen').classList.add('active');
    });
    
    document.querySelector('#pg-modal-parent-select .close-button').onclick = () => document.getElementById('pg-modal-parent-select').classList.remove('active');
    document.querySelector('#pg-input-formula + button').onclick = () => {
        const list = document.getElementById('pg-parent-list');
        list.innerHTML = '';
        state.pricingItems.forEach(i => {
            const div = document.createElement('div');
            div.style.padding='5px'; div.style.cursor='pointer'; div.style.borderBottom='1px solid #eee';
            div.innerText = `${i.Name} (${i.Code})`;
            div.onclick = () => {
                const input = document.getElementById('pg-input-formula');
                input.value = input.value + `[${i.Code}]`;
                document.getElementById('pg-modal-parent-select').classList.remove('active');
            };
            list.appendChild(div);
        });
        document.getElementById('pg-modal-parent-select').classList.add('active');
    };
    document.getElementById('pg-parent-search').oninput = (e) => {
        const val = e.target.value.toLowerCase();
        Array.from(document.getElementById('pg-parent-list').children).forEach(d => d.style.display = d.innerText.toLowerCase().includes(val) ? 'block' : 'none');
    };
}

const poller = setInterval(() => {
    if (state.currentUser && document.getElementById('main-nav') && !priceGenState.initialized) {
        initPriceGenModule();
        clearInterval(poller);
    }
}, 500);
