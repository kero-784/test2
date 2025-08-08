// =================================================================
// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNqNxS8aKrFSERj3JNRTyIOwf4VQCRdMM5hyCUWvuiifJZkzWYvNsmT0P5RZsnbipKNg/exec";
// =================================================================

// --- GLOBAL STATE & DOM ELEMENTS ---
let APP_DATA = { branches: [], sections: [], tasks: [] };
let reportChart = null;
let lastReportPayload = null; // To regenerate report on theme switch

const LOADER = document.getElementById('loading-overlay');
const confirmModal = new bootstrap.Modal(document.getElementById('confirm-modal'));
const createTaskModal = new bootstrap.Modal(document.getElementById('create-task-modal'));
let confirmCallback = () => {};

// --- API & INITIALIZATION ---
function apiCall(action, payload = {}, callback) {
    const isSilent = payload.silent;
    if (!isSilent) LOADER.style.display = 'flex';
    
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    window[callbackName] = function(response) {
        if (response.success) {
            if (callback) callback(response.data);
        } else {
            showToast(`Error: ${response.message}`, 'danger');
        }
        cleanup(script, callbackName, isSilent);
    };

    const script = document.createElement('script');
    delete payload.silent;
    const payloadString = encodeURIComponent(JSON.stringify(payload));
    script.src = `${SCRIPT_URL}?action=${action}&payload=${payloadString}&callback=${callbackName}`;
    script.onerror = function() {
        showToast('Network error: Could not communicate with the server.', 'danger');
        cleanup(script, callbackName, isSilent);
    };
    document.body.appendChild(script);

    function cleanup(scriptEl, cbName, silent) {
        delete window[cbName];
        if (document.body.contains(scriptEl)) document.body.removeChild(scriptEl);
        if (!silent) LOADER.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    apiCall('getInitialData', {}, (data) => {
        APP_DATA = data;
        renderAllViews();
        addEventListeners();
        showView('dashboard');
    });
});

function addEventListeners() {
    document.querySelectorAll("#sidebar .nav-link").forEach(link => link.addEventListener("click", e => { e.preventDefault(); showView(e.currentTarget.dataset.view); }));
    document.getElementById("theme-switcher").addEventListener("click", toggleTheme);
    document.getElementById("confirm-modal-button").addEventListener("click", () => { if (typeof confirmCallback === "function") confirmCallback(); confirmModal.hide(); });
    document.getElementById("create-task-btn").addEventListener("click", handleCreateTask);
}

// --- VIEW MANAGEMENT ---
function showView(viewId) {
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active-view"));
    document.getElementById(`${viewId}-view`).classList.add("active-view");
    document.querySelectorAll("#sidebar .nav-link").forEach(link => link.classList.toggle("active", link.dataset.view === viewId));
    const viewLink = document.querySelector(`#sidebar .nav-link[data-view="${viewId}"]`);
    document.getElementById('view-title').textContent = viewLink ? viewLink.querySelector('span').textContent : 'Dashboard';
}

function renderAllViews() {
    renderDashboardView();
    renderKanbanView();
    renderManagementView();
    renderReportsView();
    renderCreateTaskForm();
}

// --- THEME MANAGEMENT ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const switcher = document.getElementById('theme-switcher');
    switcher.innerHTML = savedTheme === 'dark' ? `<i class="bi bi-sun-fill"></i><span>Light Mode</span>` : `<i class="bi bi-moon-stars-fill"></i><span>Dark Mode</span>`;
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    initTheme();
    if (reportChart && lastReportPayload) {
        generateReport(true);
    }
}

// --- KANBAN VIEW ---
function renderKanbanView() {
    const view = document.getElementById("tasks-view");
    view.innerHTML = `<div class="kanban-board">${APP_DATA.branches.map(createBranchGroup).join('')}</div>`;
    addDragAndDropListeners();
}

function createBranchGroup(branch) {
    const assignments = APP_DATA.tasks.flatMap(task => 
        task.assignments
            .filter(a => a.branchId === branch.id)
            .map(a => ({...a, taskTitle: task.title, taskType: task.taskType, creationTimestamp: task.creationTimestamp}))
    );
    const pending = assignments.filter(a => a.status === 'Pending');
    const completed = assignments.filter(a => a.status === 'Completed');
    return `<div class="kanban-branch-group" id="branch-group-${branch.id}"><h4><i class="bi bi-building me-2"></i>${branch.name}</h4><div class="kanban-columns"><div class="kanban-column" data-status="Pending"><div class="kanban-column-header">Pending (${pending.length})</div><div class="kanban-column-body" data-branch-id="${branch.id}" data-status="Pending">${pending.map(createAssignmentCard).join('')}</div></div><div class="kanban-column" data-status="Completed"><div class="kanban-column-header">Completed (${completed.length})</div><div class="kanban-column-body" data-branch-id="${branch.id}" data-status="Completed">${completed.map(createAssignmentCard).join('')}</div></div></div></div>`;
}

function createAssignmentCard(assignment) {
    const isCompleted = assignment.status === 'Completed';
    const creationDate = assignment.creationTimestamp ? new Date(assignment.creationTimestamp).toLocaleDateString() : 'N/A';
    return `<div class="kanban-assignment-card ${isCompleted ? 'completed' : ''}" draggable="true" id="assignment-${assignment.assignmentId}" data-assignment-id="${assignment.assignmentId}"><div class="assignment-card-title">${assignment.taskTitle}</div><div class="assignment-card-info"><span class="badge bg-secondary">${assignment.taskType}</span>${isCompleted ? `<div class="mt-2"><i class="bi bi-check-circle-fill text-success"></i> ${assignment.timeTaken}</div>` : ''}</div><div class="assignment-card-footer"><i class="bi bi-clock me-1"></i>Created: ${creationDate}</div><div class="assignment-card-loader"><div class="spinner-border spinner-border-sm" role="status"></div></div></div>`;
}

function addDragAndDropListeners() { /* ... unchanged from previous version ... */ }
function updateAssignmentStatus(assignmentId, newStatus) { /* ... unchanged from previous version ... */ }
function findBranchIdForAssignment(assignmentId) { /* ... unchanged from previous version ... */ }

// --- REPORTS VIEW ---
function renderReportsView() {
    const view = document.getElementById("reports-view");
    view.innerHTML = `<div class="card mb-4"><div class="card-body"><div id="report-filters-form" class="row g-3 align-items-end"></div></div></div><div id="report-output"></div>`;
    renderReportFilters();
}

function renderReportFilters() {
    const container = document.getElementById('report-filters-form');
    container.innerHTML = `
        <div class="col-md-3">
            <label for="report-type" class="form-label fw-bold">Report Type</label>
            <select id="report-type" class="form-select">
                <option value="task_detail">Task Detail</option>
                <option value="branch_performance">Overall Branch Performance</option>
                <option value="branch_section_report">Single Branch Report</option>
                <option value="section_performance_report">Section Performance Report</option>
            </select>
        </div>
        
        <!-- Filter Groups -->
        <div class="col-md-3 report-filter-group" id="report-task-selector-container">
            <label for="report-task-selector" class="form-label fw-bold">Select Task</label>
            <select id="report-task-selector" class="form-select">${APP_DATA.tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('')}</select>
        </div>

        <div class="col-md-3 report-filter-group" id="report-branch-selector-container" style="display: none;">
            <label for="report-branch-selector" class="form-label fw-bold">Select Branch</label>
            <select id="report-branch-selector" class="form-select">${APP_DATA.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}</select>
        </div>

        <div class="col-md-3 report-filter-group" id="report-section-selector-container" style="display: none;">
            <label for="report-section-selector" class="form-label fw-bold">Select Section</label>
            <select id="report-section-selector" class="form-select">${APP_DATA.sections.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
        </div>

        <div class="col-md-4 report-filter-group" id="report-date-range-container" style="display: none;">
            <!-- Date range inputs for branch_performance -->
        </div>

        <div class="col-md-2">
            <button class="btn btn-primary w-100" id="generate-report-btn">Generate</button>
        </div>
    `;

    document.getElementById("report-type").addEventListener("change", toggleReportOptions);
    document.getElementById("generate-report-btn").addEventListener("click", () => generateReport(false));
    toggleReportOptions(); // Set initial visibility
}

function toggleReportOptions() {
    const reportType = document.getElementById("report-type").value;
    document.querySelectorAll('.report-filter-group').forEach(el => el.style.display = 'none');
    
    if (reportType === 'task_detail') {
        document.getElementById('report-task-selector-container').style.display = 'block';
    } else if (reportType === 'branch_performance') {
        // Here you would show date pickers etc.
    } else if (reportType === 'branch_section_report') {
        document.getElementById('report-branch-selector-container').style.display = 'block';
    } else if (reportType === 'section_performance_report') {
        document.getElementById('report-section-selector-container').style.display = 'block';
    }
}

function generateReport(isThemeChange = false) {
    let payload;
    if (isThemeChange && lastReportPayload) {
        payload = lastReportPayload;
    } else {
        const reportType = document.getElementById("report-type").value;
        payload = { reportType };
        if (reportType === 'task_detail') payload.taskId = document.getElementById('report-task-selector').value;
        if (reportType === 'branch_section_report') payload.branchId = document.getElementById('report-branch-selector').value;
        if (reportType === 'section_performance_report') payload.sectionId = document.getElementById('report-section-selector').value;
        lastReportPayload = payload;
    }
    
    apiCall("getReportsData", payload, data => {
        renderReport(data);
    });
}

function renderReport(reportData) {
    const outputDiv = document.getElementById("report-output");
    if (!reportData || !reportData.kpis) {
        outputDiv.innerHTML = `<div class="empty-state"><i class="bi bi-file-earmark-x"></i><h5>No Data Available</h5><p>There is no report data for the selected criteria.</p></div>`;
        return;
    }
    
    // Main report structure
    outputDiv.innerHTML = `
      <div class="report-container">
        <div class="report-header">
            <h3 class="report-title">${reportData.title}</h3>
            <div><button class="btn btn-outline-secondary btn-sm"><i class="bi bi-printer"></i> Export</button></div>
        </div>
        <div class="report-body">
            <div class="report-kpi-grid">${renderKpiCards(reportData.kpis)}</div>
            <div class="row">
                <div class="col-lg-7 report-data-container">${renderReportData(reportData)}</div>
                <div class="col-lg-5 report-chart-container"><canvas id="report-chart-canvas"></canvas></div>
            </div>
        </div>
      </div>`;

    renderReportChart(reportData.chartData);
}

function renderKpiCards(kpis) {
    if (!kpis) return '';
    const kpiMap = {
        completionRate: { title: "Completion Rate", icon: "bi-check2-all", color: "success" },
        pendingTasks: { title: "Pending Tasks", icon: "bi-hourglass-split", color: "warning" },
        overdueTasks: { title: "Overdue Tasks", icon: "bi-exclamation-triangle", color: "danger" },
        avgTime: { title: "Avg. Completion", icon: "bi-alarm", color: "primary" }
    };
    return Object.entries(kpis).map(([key, value]) => {
        const config = kpiMap[key];
        if (!config) return '';
        return `<div class="report-kpi-card"><div class="kpi-title">${config.title}</div><div class="kpi-value text-${config.color}">${value}</div><i class="bi ${config.icon} kpi-icon text-${config.color}"></i></div>`;
    }).join('');
}

function renderReportData(reportData) {
    if (reportData.type === 'branch_section_report') {
        // Group data by section
        const groupedBySection = reportData.table.reduce((acc, row) => {
            const section = row["Section Name"];
            if (!acc[section]) acc[section] = [];
            acc[section].push(row);
            return acc;
        }, {});
        
        return Object.entries(groupedBySection).map(([sectionName, rows]) => {
            const headers = Object.keys(rows[0]).filter(h => h !== 'Section Name');
            return `
                <div class="report-section-group">
                    <h5>${sectionName}</h5>
                    <table class="table table-sm">
                        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                        <tbody>${rows.map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('')}</tbody>
                    </table>
                </div>`;
        }).join('');
    } else {
        // Default table rendering
        const headers = Object.keys(reportData.table[0]);
        return `
            <div class="report-section-group">
                <h5>Details</h5>
                <table class="table">
                    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>${reportData.table.map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
            </div>`;
    }
}

function renderReportChart(chartData) {
    if (reportChart) reportChart.destroy();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: isDark ? '#f1f5f9' : '#1e293b' }}},
        scales: (chartData.type === 'bar') ? { 
            x: { ticks: { color: isDark ? '#94a3b8' : '#64748b' }, grid: { color: isDark ? '#334155' : '#e2e8f0' } }, 
            y: { ticks: { color: isDark ? '#94a3b8' : '#64748b' }, grid: { color: isDark ? '#334155' : '#e2e8f0' }, beginAtZero: true } 
        } : {}
    };

    reportChart = new Chart(document.getElementById("report-chart-canvas").getContext("2d"), {
        type: chartData.type,
        data: chartData,
        options: chartOptions
    });
}


// --- OTHER FUNCTIONS (Create, Manage, Modals etc) ---
// These are largely unchanged from the previous complete version.
// Abridged here for focus, but the full code is implicitly included.
function renderDashboardView() { const view = document.getElementById("dashboard-view"); view.innerHTML = `<div class="alert alert-info">Welcome to TaskFlow Pro! Use the sidebar to navigate. Check out the powerful new reporting features.</div>`;}
function renderManagementView() { /* ... unchanged ... */ }
function renderCreateTaskForm() { /* ... unchanged ... */ }
function handleCreateTask(e) { /* ... unchanged ... */ }
function showToast(message, type="success"){ /* ... unchanged ... */ }
function showConfirmModal(bodyText, onConfirm){ /* ... unchanged ... */ }
