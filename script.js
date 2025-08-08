// =================================================================
// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNqNxS8aKrFSERj3JNRTyIOwf4VQCRdMM5hyCUWvuiifJZkzWYvNsmT0P5RZsnbipKNg/exec";
// =================================================================

// --- GLOBAL STATE & DOM ELEMENTS ---
let APP_DATA = { branches: [], sections: [], tasks: [] };
let reportChart = null;
let lastReportPayload = null;

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

// --- VIEW RENDERERS (FIXED) ---

function renderDashboardView() {
    const view = document.getElementById("dashboard-view");
    const activeTasks = APP_DATA.tasks.filter(t => t.status === 'Active').length;
    const pendingAssignments = APP_DATA.tasks.flatMap(t => t.assignments).filter(a => a.status === 'Pending').length;
    const activeBranches = APP_DATA.branches.filter(b => b.status === 'Active').length;
    
    view.innerHTML = `
        <div class="row g-4">
            <div class="col-md-4">
                <div class="stat-card-v2">
                    <div class="stat-icon bg-primary bg-opacity-10 text-primary"><i class="bi bi-list-task"></i></div>
                    <div class="stat-title">Active Tasks</div>
                    <div class="stat-number">${activeTasks}</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="stat-card-v2">
                    <div class="stat-icon bg-warning bg-opacity-10 text-warning"><i class="bi bi-hourglass-split"></i></div>
                    <div class="stat-title">Pending Assignments</div>
                    <div class="stat-number">${pendingAssignments}</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="stat-card-v2">
                    <div class="stat-icon bg-success bg-opacity-10 text-success"><i class="bi bi-building"></i></div>
                    <div class="stat-title">Active Branches</div>
                    <div class="stat-number">${activeBranches}</div>
                </div>
            </div>
        </div>
        <div class="mt-4">
             <div class="alert alert-light border-0" role="alert">
                Welcome to <strong>TaskFlow Pro!</strong> Use the Kanban board for daily tasks and the Reports view for detailed analytics.
            </div>
        </div>
    `;
}

function renderKanbanView() {
    const view = document.getElementById("tasks-view");
    if (!APP_DATA.branches || APP_DATA.branches.length === 0) {
        view.innerHTML = `<div class="empty-state"><i class="bi bi-diagram-3-fill"></i><h5>No Branches</h5><p>Add a branch in the Management view to see the Kanban board.</p></div>`;
        return;
    }
    view.innerHTML = `<div class="kanban-board">${APP_DATA.branches.map(createBranchGroup).join('')}</div>`;
    addDragAndDropListeners();
}

function renderManagementView() {
    const view = document.getElementById("management-view");
    view.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-6">
                <div class="card h-100"><div class="card-header"><h4>Manage Branches</h4></div><div class="card-body">
                    <form id="branch-form" class="mb-3"><div class="input-group"><input type="text" id="new-branch-name" class="form-control" placeholder="New Branch Name" required><button class="btn btn-primary" type="submit">Add Branch</button></div></form>
                    <ul id="branch-list" class="list-group list-group-flush"></ul>
                </div></div>
            </div>
            <div class="col-lg-6">
                <div class="card h-100"><div class="card-header"><h4>Manage Sections</h4></div><div class="card-body">
                    <form id="section-form" class="mb-3"><div class="input-group"><input type="text" id="new-section-name" class="form-control" placeholder="New Section Name" required><button class="btn btn-primary" type="submit">Add Section</button></div></form>
                    <ul id="section-list" class="list-group list-group-flush"></ul>
                </div></div>
            </div>
        </div>`;
    
    renderManagementLists(); // Populate the lists
    document.getElementById("branch-form").addEventListener("submit", e => handleManageEntity(e, "branch"));
    document.getElementById("section-form").addEventListener("submit", e => handleManageEntity(e, "section"));
}

function renderReportsView() {
    const view = document.getElementById("reports-view");
    view.innerHTML = `<div class="card mb-4"><div class="card-body"><div id="report-filters-form" class="row g-3 align-items-end"></div></div></div><div id="report-output"></div>`;
    renderReportFilters();
}

function renderCreateTaskForm() {
    const container = document.getElementById("create-task-form");
    const activeSections = APP_DATA.sections.filter(s => s.status === "Active");
    const activeBranches = APP_DATA.branches.filter(b => b.status === "Active");
    container.innerHTML = `<div class="mb-3"><label for="task-title" class="form-label">Task Title</label><input type="text" class="form-control" id="task-title" required></div><div class="mb-3"><label for="task-description" class="form-label">Description</label><textarea class="form-control" id="task-description" rows="2"></textarea></div><div class="row"><div class="col-md-6 mb-3"><label for="task-section" class="form-label">Section</label><select class="form-select" id="task-section" required><option value="" disabled selected>Select...</option>${activeSections.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}</select></div><div class="col-md-6 mb-3"><label for="task-type" class="form-label">Type</label><select class="form-select" id="task-type"><option value="Normal">Normal</option><option value="Time-Limited">Time-Limited</option></select></div></div><div class="mb-3" id="deadline-container" style="display: none;"><label for="task-deadline" class="form-label">Deadline</label><input type="datetime-local" class="form-control" id="task-deadline"></div><div class="mb-3"><label class="form-label">Assign to Branches</label><div id="branch-checkboxes" class="border p-2 rounded" style="max-height: 150px; overflow-y: auto;">${activeBranches.map(b => `<div class="form-check"><input class="form-check-input" type="checkbox" value="${b.id}" id="branch-${b.id}"><label class="form-check-label" for="branch-${b.id}">${b.name}</label></div>`).join("") || '<p class="text-muted small p-2">No active branches found.</p>'}</div></div>`;
    
    const taskTypeSelect = container.closest('.modal-content').querySelector("#task-type");
    if(taskTypeSelect) {
         taskTypeSelect.addEventListener("change", () => {
            const form = taskTypeSelect.closest('form');
            const type = taskTypeSelect.value;
            form.querySelector("#deadline-container").style.display = type === "Time-Limited" ? "block" : "none";
            form.querySelector("#task-deadline").required = type === "Time-Limited";
        });
    }
}


// --- KANBAN LOGIC & HELPERS ---
// (Unchanged from previous correct versions, included for completeness)
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
function addDragAndDropListeners() {
    const cards = document.querySelectorAll('.kanban-assignment-card');
    const columns = document.querySelectorAll('.kanban-column-body');
    cards.forEach(card => {
        card.addEventListener('dragstart', () => card.classList.add('is-dragging'));
        card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
    });
    columns.forEach(column => {
        column.addEventListener('dragover', e => { e.preventDefault(); column.closest('.kanban-column').classList.add('drag-over'); });
        column.addEventListener('dragleave', () => column.closest('.kanban-column').classList.remove('drag-over'));
        column.addEventListener('drop', e => {
            e.preventDefault();
            column.closest('.kanban-column').classList.remove('drag-over');
            const draggingCard = document.querySelector('.is-dragging');
            if (draggingCard) {
                const newStatus = column.dataset.status;
                const assignmentId = draggingCard.dataset.assignmentId;
                column.appendChild(draggingCard);
                updateAssignmentStatus(assignmentId, newStatus);
            }
        });
    });
}
function updateAssignmentStatus(assignmentId, newStatus) {
    const card = document.getElementById(`assignment-${assignmentId}`);
    const loader = card.querySelector('.assignment-card-loader');
    loader.style.display = 'flex';
    let currentStatus = '';
    APP_DATA.tasks.forEach(task => { const a = task.assignments.find(a => a.assignmentId === assignmentId); if(a) currentStatus = a.status; });
    if (newStatus === currentStatus) { loader.style.display = 'none'; return; }
    const action = newStatus === 'Completed' ? 'markTaskAsComplete' : 'markTaskAsPending';
    apiCall(action, { assignmentId, silent: true }, (data) => {
        apiCall('getInitialData', {silent: true}, (newData) => {
            APP_DATA = newData;
            const branchId = findBranchIdForAssignment(assignmentId);
            if(branchId) {
                const branchGroupEl = document.getElementById(`branch-group-${branchId}`);
                if (branchGroupEl) {
                    branchGroupEl.outerHTML = createBranchGroup(APP_DATA.branches.find(b => b.id === branchId));
                    addDragAndDropListeners();
                }
            }
            showToast(data.message || 'Status updated!', 'success');
        });
    });
}
function findBranchIdForAssignment(assignmentId) { for (const task of APP_DATA.tasks) { const assignment = task.assignments.find(a => a.assignmentId === assignmentId); if (assignment) return assignment.branchId; } return null; }

// --- REPORTING LOGIC & HELPERS ---
// (Unchanged from previous correct versions, included for completeness)
function renderReportFilters() {
    const container = document.getElementById('report-filters-form');
    container.innerHTML = `
        <div class="col-md-3"><label for="report-type" class="form-label fw-bold">Report Type</label><select id="report-type" class="form-select"><option value="task_detail">Task Detail</option><option value="branch_section_report">Single Branch Report</option><option value="section_performance_report">Section Performance Report</option></select></div>
        <div class="col-md-3 report-filter-group" id="report-task-selector-container"><label for="report-task-selector" class="form-label fw-bold">Select Task</label><select id="report-task-selector" class="form-select">${APP_DATA.tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('')}</select></div>
        <div class="col-md-3 report-filter-group" id="report-branch-selector-container" style="display: none;"><label for="report-branch-selector" class="form-label fw-bold">Select Branch</label><select id="report-branch-selector" class="form-select">${APP_DATA.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}</select></div>
        <div class="col-md-3 report-filter-group" id="report-section-selector-container" style="display: none;"><label for="report-section-selector" class="form-label fw-bold">Select Section</label><select id="report-section-selector" class="form-select">${APP_DATA.sections.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
        <div class="col-md-2"><button class="btn btn-primary w-100" id="generate-report-btn">Generate</button></div>`;
    document.getElementById("report-type").addEventListener("change", toggleReportOptions);
    document.getElementById("generate-report-btn").addEventListener("click", () => generateReport(false));
    toggleReportOptions();
}
function toggleReportOptions() {
    const reportType = document.getElementById("report-type").value;
    document.querySelectorAll('.report-filter-group').forEach(el => el.style.display = 'none');
    if (reportType === 'task_detail') document.getElementById('report-task-selector-container').style.display = 'block';
    if (reportType === 'branch_section_report') document.getElementById('report-branch-selector-container').style.display = 'block';
    if (reportType === 'section_performance_report') document.getElementById('report-section-selector-container').style.display = 'block';
}
function generateReport(isThemeChange = false) {
    let payload;
    if (isThemeChange && lastReportPayload) { payload = lastReportPayload; } else {
        const reportType = document.getElementById("report-type").value;
        payload = { reportType };
        if (reportType === 'task_detail') payload.taskId = document.getElementById('report-task-selector').value;
        if (reportType === 'branch_section_report') payload.branchId = document.getElementById('report-branch-selector').value;
        if (reportType === 'section_performance_report') payload.sectionId = document.getElementById('report-section-selector').value;
        lastReportPayload = payload;
    }
    if (!payload.taskId && !payload.branchId && !payload.sectionId) { showToast("Please select an item for the report.", "danger"); return; }
    apiCall("getReportsData", payload, data => renderReport(data));
}
function renderReport(reportData) {
    const outputDiv = document.getElementById("report-output");
    if (!reportData || !reportData.kpis) { outputDiv.innerHTML = `<div class="empty-state"><i class="bi bi-file-earmark-x"></i><h5>No Data Available</h5><p>There is no report data for the selected criteria.</p></div>`; return; }
    outputDiv.innerHTML = `<div class="report-container"><div class="report-header"><h3 class="report-title">${reportData.title}</h3><div><button class="btn btn-outline-secondary btn-sm"><i class="bi bi-printer"></i> Export</button></div></div><div class="report-body"><div class="report-kpi-grid">${renderKpiCards(reportData.kpis)}</div><div class="row"><div class="col-lg-7 report-data-container">${renderReportData(reportData)}</div><div class="col-lg-5 report-chart-container"><canvas id="report-chart-canvas"></canvas></div></div></div></div>`;
    renderReportChart(reportData.chartData);
}
function renderKpiCards(kpis) { if (!kpis) return ''; const kpiMap = { completionRate: { title: "Completion Rate", icon: "bi-check2-all", color: "success" }, pendingTasks: { title: "Pending Tasks", icon: "bi-hourglass-split", color: "warning" }, overdueTasks: { title: "Overdue Tasks", icon: "bi-exclamation-triangle", color: "danger" }, avgTime: { title: "Avg. Completion", icon: "bi-alarm", color: "primary" } }; return Object.entries(kpis).map(([key, value]) => { const config = kpiMap[key]; if (!config) return ''; return `<div class="report-kpi-card"><div class="kpi-title">${config.title}</div><div class="kpi-value text-${config.color}">${value}</div><i class="bi ${config.icon} kpi-icon text-${config.color}"></i></div>`; }).join(''); }
function renderReportData(reportData) {
    if (reportData.type === 'branch_section_report') {
        const groupedBySection = reportData.table.reduce((acc, row) => { const section = row["Section Name"]; if (!acc[section]) acc[section] = []; acc[section].push(row); return acc; }, {});
        return Object.entries(groupedBySection).map(([sectionName, rows]) => { const headers = Object.keys(rows[0]).filter(h => h !== 'Section Name'); return `<div class="report-section-group"><h5>${sectionName}</h5><table class="table table-sm"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }).join('');
    } else {
        if (!reportData.table || reportData.table.length === 0) return '<p>No detailed data to display.</p>';
        const headers = Object.keys(reportData.table[0]);
        return `<div class="report-section-group"><h5>Details</h5><table class="table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${reportData.table.map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
}
function renderReportChart(chartData) {
    if (reportChart) reportChart.destroy();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: isDark ? '#f1f5f9' : '#1e293b' }}}, scales: (chartData.type === 'bar') ? { x: { ticks: { color: isDark ? '#94a3b8' : '#64748b' }, grid: { color: isDark ? '#334155' : '#e2e8f0' }, stacked: true },  y: { ticks: { color: isDark ? '#94a3b8' : '#64748b' }, grid: { color: isDark ? '#334155' : '#e2e8f0' }, beginAtZero: true, stacked: true } } : {} };
    reportChart = new Chart(document.getElementById("report-chart-canvas").getContext("2d"), { type: chartData.type, data: chartData, options: chartOptions });
}

// --- MANAGEMENT & OTHER HELPERS ---
function renderManagementLists() {
    const branchList = document.getElementById("branch-list");
    const sectionList = document.getElementById("section-list");
    if(!branchList || !sectionList) return;
    branchList.innerHTML = APP_DATA.branches.map(item => `<li class="list-group-item">${item.name}<span class="badge bg-${item.status === 'Active' ? 'success' : 'secondary'} float-end">${item.status}</span></li>`).join('');
    sectionList.innerHTML = APP_DATA.sections.map(item => `<li class="list-group-item">${item.name}<span class="badge bg-${item.status === 'Active' ? 'success' : 'secondary'} float-end">${item.status}</span></li>`).join('');
}
function handleManageEntity(e, type) { e.preventDefault(); const input = document.getElementById(`new-${type}-name`); const name = input.value.trim(); if (!name) return; apiCall("manageEntity", { type, name }, data => { showToast(data.message, "success"); input.value = ""; apiCall("getInitialData", {}, newData => { APP_DATA = newData; renderManagementView(); }); }); }
function handleCreateTask(e) { e.preventDefault(); const form = document.getElementById('create-task-form'); const btn = document.getElementById('create-task-btn'); btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...'; const selectedBranches = Array.from(form.querySelectorAll("#branch-checkboxes input:checked")).map(cb => cb.value); if(selectedBranches.length === 0) { showToast("Please assign to at least one branch.", "danger"); btn.disabled = false; btn.innerHTML = "Create Task"; return; } const taskData = { title: form.querySelector("#task-title").value, description: form.querySelector("#task-description").value, section: form.querySelector("#task-section").value, type: form.querySelector("#task-type").value, deadline: form.querySelector("#task-deadline").value, branches: selectedBranches }; apiCall("createTask", taskData, data => { showToast(data.message, "success"); createTaskModal.hide(); form.reset(); apiCall("getInitialData", {}, newData => { APP_DATA = newData; renderAllViews(); showView(document.querySelector('.view.active-view').id.replace('-view', '')); }); }); btn.disabled = false; btn.innerHTML = "Create Task"; }
function showToast(message, type="success"){ const toastContainer = document.querySelector(".toast-container"); const toastId = "toast-" + Date.now(); const bgClass = type === "danger" ? "bg-danger" : "bg-primary"; const toastHtml = `<div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true"><div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`; toastContainer.insertAdjacentHTML("beforeend", toastHtml); const toast = new bootstrap.Toast(document.getElementById(toastId), {delay: 5000}); toast.show(); document.getElementById(toastId).addEventListener("hidden.bs.toast", e => e.target.remove()); }
function showConfirmModal(bodyText, onConfirm){ document.getElementById("confirm-modal-body").textContent = bodyText; confirmCallback = onConfirm; confirmModal.show(); }
