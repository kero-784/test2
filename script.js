// =================================================================
// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNqNxS8aKrFSERj3JNRTyIOwf4VQCRdMM5hyCUWvuiifJZkzWYvNsmT0P5RZsnbipKNg/exec";
// =================================================================

// --- GLOBAL STATE & DOM ELEMENTS ---
let APP_DATA = { branches: [], sections: [], tasks: [] };
let reportChart = null;
let lastReportPayload = null;

const LOADER = document.getElementById('loading-overlay');
const createTaskModal = new bootstrap.Modal(document.getElementById('create-task-modal'));
// Note: Confirm modal logic can be added back if needed, but keeping it simple for now.

// --- API & INITIALIZATION ---
function apiCall(action, payload = {}, callback) {
    LOADER.style.display = 'flex';
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());

    window[callbackName] = function(response) {
        if (response.success) {
            if (callback) callback(response.data);
        } else {
            showToast(`Error: ${response.message}`, 'danger');
        }
        cleanup(script, callbackName);
    };

    const script = document.createElement('script');
    const payloadString = encodeURIComponent(JSON.stringify(payload));
    script.src = `${SCRIPT_URL}?action=${action}&payload=${payloadString}&callback=${callbackName}`;
    script.onerror = function() {
        showToast('Network error: Could not communicate with the server.', 'danger');
        cleanup(script, callbackName);
    };
    document.body.appendChild(script);

    function cleanup(scriptEl, cbName) {
        delete window[cbName];
        if (document.body.contains(scriptEl)) document.body.removeChild(scriptEl);
        LOADER.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    apiCall('getInitialData', {}, (data) => {
        APP_DATA = data;
        renderAllViews();
        addEventListeners();
        showView('dashboard');
    });
});

function addEventListeners() {
    document.querySelectorAll("#sidebar .nav-link").forEach(link => {
        link.addEventListener("click", e => { e.preventDefault(); showView(e.currentTarget.dataset.view); });
    });
    document.getElementById("sidebar-toggle").addEventListener("click", () => {
        document.querySelector(".app-container").classList.toggle("sidebar-collapsed");
    });
    document.getElementById("create-task-btn").addEventListener("click", handleCreateTask);
}

// --- VIEW MANAGEMENT ---
function showView(viewId) {
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active-view"));
    document.getElementById(`${viewId}-view`).classList.add("active-view");
    document.querySelectorAll("#sidebar .nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.view === viewId);
    });
    const viewLink = document.querySelector(`#sidebar .nav-link[data-view="${viewId}"]`);
    document.getElementById('view-title').textContent = viewLink ? viewLink.querySelector('span').textContent : 'Dashboard';
}

function renderAllViews() {
    renderDashboardView();
    renderTasksView();
    renderManagementView();
    renderReportsView();
    renderCreateTaskForm();
}

// --- VIEW RENDERERS ---

function renderDashboardView() {
    const view = document.getElementById("dashboard-view");
    const activeTasks = APP_DATA.tasks.filter(t => t.status === 'Active').length;
    const pendingAssignments = APP_DATA.tasks.flatMap(t => t.assignments).filter(a => a.status === 'Pending').length;
    const activeBranches = APP_DATA.branches.filter(b => b.status === 'Active').length;

    view.innerHTML = `
        <div class="row g-4">
            <div class="col-md-6 col-xl-4">
                <div class="card stat-card"><div class="card-body"><div class="stat-icon bg-primary-subtle text-primary"><i class="bi bi-list-task"></i></div><div><h5>Active Tasks</h5><div class="stat-number">${activeTasks}</div></div></div></div>
            </div>
            <div class="col-md-6 col-xl-4">
                <div class="card stat-card"><div class="card-body"><div class="stat-icon bg-warning-subtle text-warning"><i class="bi bi-hourglass-split"></i></div><div><h5>Pending Assignments</h5><div class="stat-number">${pendingAssignments}</div></div></div></div>
            </div>
            <div class="col-md-6 col-xl-4">
                <div class="card stat-card"><div class="card-body"><div class="stat-icon bg-info-subtle text-info"><i class="bi bi-building"></i></div><div><h5>Active Branches</h5><div class="stat-number">${activeBranches}</div></div></div></div>
            </div>
        </div>
        <div class="card mt-4">
            <div class="card-header">
                <h4><i class="bi bi-plus-circle me-2"></i>Create New Task</h4>
            </div>
            <div class="card-body">
                <p>Click the button below to open the task creation form.</p>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#create-task-modal">
                    Create a Task
                </button>
            </div>
        </div>
    `;
}

function renderTasksView() {
    const view = document.getElementById("tasks-view");
    view.innerHTML = `
        <div class="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4">
            <div class="input-group" style="max-width: 400px;">
                 <span class="input-group-text"><i class="bi bi-search"></i></span>
                 <input type="search" class="form-control" id="task-search-input" placeholder="Search tasks by title...">
            </div>
            <div class="form-check form-switch fs-5">
                <input class="form-check-input" type="checkbox" role="switch" id="show-inactive-toggle">
                <label class="form-check-label" for="show-inactive-toggle">Show Inactive Tasks</label>
            </div>
        </div>
        <div id="task-list-container"></div>`;

    displayFilteredTasks();
    document.getElementById("show-inactive-toggle").addEventListener("change", displayFilteredTasks);
    document.getElementById("task-search-input").addEventListener("input", displayFilteredTasks);
}

function displayFilteredTasks() {
    const showInactive = document.getElementById("show-inactive-toggle").checked;
    const searchTerm = document.getElementById("task-search-input").value.toLowerCase();
    let tasksToDisplay = showInactive ? APP_DATA.tasks : APP_DATA.tasks.filter(t => t.status === "Active");
    if (searchTerm) tasksToDisplay = tasksToDisplay.filter(t => t.title.toLowerCase().includes(searchTerm));
    renderTaskCards(tasksToDisplay);
}

function renderTaskCards(tasks) {
    const container = document.getElementById("task-list-container");
    if (tasks.length === 0) {
        container.innerHTML = '<div class="alert alert-light text-center">No tasks match your criteria.</div>';
        return;
    }
    const branchMap = Object.fromEntries(APP_DATA.branches.map(b => [b.id, b.name]));
    container.innerHTML = tasks.map(task => {
        const total = task.assignments.length;
        const completed = task.assignments.filter(a => a.status === 'Completed').length;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        const creationDate = new Date(task.creationTimestamp).toLocaleDateString();

        return `
            <div class="card mb-3 task-card">
                <div class="card-header d-flex justify-content-between"><strong>${task.title}</strong><span class="badge bg-secondary">${task.taskType}</span></div>
                <div class="card-body">
                    <p>${task.description || "No description."}</p>
                    <div class="progress-container mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1"><span class="progress-info">Progress</span><span class="progress-info"><strong>${completed}/${total}</strong></span></div>
                        <div class="progress"><div class="progress-bar" style="width: ${progress}%"></div></div>
                    </div>
                    <table class="table table-sm table-bordered mt-3">
                        <thead class="table-light"><tr><th>Branch</th><th>Status</th><th>Completed On</th><th>Action</th></tr></thead>
                        <tbody>
                            ${task.assignments.map(a => `<tr><td>${branchMap[a.branchId]||a.branchId}</td><td><span class="badge bg-${a.status==="Completed"?"success":"warning"}">${a.status}</span></td><td>${a.completionTimestamp}</td><td>${a.status==="Pending"?`<button class="btn btn-sm btn-primary" onclick="markComplete('${a.assignmentId}')">Complete</button>`:""}</td></tr>`).join("")}
                        </tbody>
                    </table>
                </div>
                <div class="card-footer text-muted">Created: ${creationDate}</div>
            </div>`;
    }).join("");
}

function renderManagementView() {
    const view = document.getElementById("management-view");
    view.innerHTML = `
        <div class="row">
            <div class="col-md-6"><div class="card"><div class="card-header"><h4>Manage Branches</h4></div><div class="card-body"><form id="branch-form" class="mb-3"><div class="input-group"><input type="text" id="new-branch-name" class="form-control" placeholder="New Branch Name" required><button class="btn btn-primary" type="submit">Add Branch</button></div></form><ul id="branch-list" class="list-group"></ul></div></div></div>
            <div class="col-md-6"><div class="card"><div class="card-header"><h4>Manage Sections</h4></div><div class="card-body"><form id="section-form" class="mb-3"><div class="input-group"><input type="text" id="new-section-name" class="form-control" placeholder="New Section Name" required><button class="btn btn-primary" type="submit">Add Section</button></div></form><ul id="section-list" class="list-group"></ul></div></div></div>
        </div>`;
    renderManagementLists();
    document.getElementById("branch-form").addEventListener("submit", e => handleManageEntity(e, "branch"));
    document.getElementById("section-form").addEventListener("submit", e => handleManageEntity(e, "section"));
}

function renderReportsView() {
    const view = document.getElementById("reports-view");
    view.innerHTML = `<div class="card mb-4"><div class="card-body"><div id="report-filters-form" class="row g-3 align-items-end"></div></div></div><div id="report-output" style="display: none;"></div>`;
    renderReportFilters();
}

function renderCreateTaskForm() {
    const container = document.getElementById("create-task-form");
    const activeSections = APP_DATA.sections.filter(s => s.status === "Active");
    const activeBranches = APP_DATA.branches.filter(b => b.status === "Active");
    container.innerHTML = `<div class="mb-3"><label for="task-title" class="form-label">Task Title</label><input type="text" class="form-control" id="task-title" required></div><div class="mb-3"><label for="task-description" class="form-label">Description</label><textarea class="form-control" id="task-description" rows="2"></textarea></div><div class="row"><div class="col-md-6 mb-3"><label for="task-section" class="form-label">Section</label><select class="form-select" id="task-section" required><option value="" disabled selected>Select...</option>${activeSections.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}</select></div><div class="col-md-6 mb-3"><label for="task-type" class="form-label">Type</label><select class="form-select" id="task-type"><option value="Normal">Normal</option><option value="Time-Limited">Time-Limited</option></select></div></div><div class="mb-3" id="deadline-container" style="display: none;"><label for="task-deadline" class="form-label">Deadline</label><input type="datetime-local" class="form-control" id="task-deadline"></div><div class="mb-3"><label class="form-label">Assign to Branches</label><div id="branch-checkboxes" class="border p-2 rounded bg-light" style="max-height: 150px; overflow-y: auto;">${activeBranches.map(b => `<div class="form-check"><input class="form-check-input" type="checkbox" value="${b.id}" id="branch-${b.id}"><label class="form-check-label" for="branch-${b.id}">${b.name}</label></div>`).join("") || '<p class="text-muted small p-2">No active branches found.</p>'}</div></div>`;
    const taskTypeSelect = container.querySelector("#task-type");
    taskTypeSelect.addEventListener("change", () => {
        container.querySelector("#deadline-container").style.display = taskTypeSelect.value === "Time-Limited" ? "block" : "none";
        container.querySelector("#task-deadline").required = taskTypeSelect.value === "Time-Limited";
    });
}

// --- ACTION HANDLERS ---
function handleCreateTask(e) {
    e.preventDefault();
    const btn = e.target;
    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';
    const form = document.getElementById('create-task-form');
    const selectedBranches = Array.from(form.querySelectorAll("#branch-checkboxes input:checked")).map(cb => cb.value);
    if (selectedBranches.length === 0) {
        showToast("Please assign the task to at least one branch.", "danger");
        btn.disabled = false; btn.innerHTML = "Create Task"; return;
    }
    const taskData = { title: form.querySelector("#task-title").value, description: form.querySelector("#task-description").value, section: form.querySelector("#task-section").value, type: form.querySelector("#task-type").value, deadline: form.querySelector("#task-deadline").value, branches: selectedBranches };
    apiCall("createTask", taskData, data => {
        showToast(data.message, "success");
        createTaskModal.hide();
        form.reset();
        apiCall("getInitialData", {}, newData => { APP_DATA = newData; renderAllViews(); });
    });
    btn.disabled = false; btn.innerHTML = "Create Task";
}
function markComplete(assignmentId) {
    apiCall("markTaskAsComplete", { assignmentId }, data => {
        showToast(data.message, "success");
        apiCall("getInitialData", {}, newData => { APP_DATA = newData; displayFilteredTasks(); });
    });
}
function handleManageEntity(e, type) {
    e.preventDefault();
    const input = document.getElementById(`new-${type}-name`);
    const name = input.value.trim();
    if (!name) return;
    apiCall("manageEntity", { type, name }, data => {
        showToast(data.message, "success");
        input.value = "";
        apiCall("getInitialData", {}, newData => { APP_DATA = newData; renderManagementLists(); });
    });
}
function renderManagementLists() {
    document.getElementById("branch-list").innerHTML = APP_DATA.branches.map(item => `<li class="list-group-item">${item.name} <span class="badge bg-${item.status === 'Active' ? 'success' : 'secondary'} float-end">${item.status}</span></li>`).join('');
    document.getElementById("section-list").innerHTML = APP_DATA.sections.map(item => `<li class="list-group-item">${item.name} <span class="badge bg-${item.status === 'Active' ? 'success' : 'secondary'} float-end">${item.status}</span></li>`).join('');
}

// --- REPORTING LOGIC ---
function renderReportFilters() {
    const container = document.getElementById('report-filters-form');
    container.innerHTML = `<div class="col-md-3"><label for="report-type" class="form-label fw-bold">Report Type</label><select id="report-type" class="form-select"><option value="task_detail">Task Detail</option><option value="branch_section_report">Single Branch Report</option><option value="section_performance_report">Section Performance Report</option></select></div><div class="col-md-3 report-filter-group" id="report-task-selector-container"><label for="report-task-selector" class="form-label fw-bold">Select Task</label><select id="report-task-selector" class="form-select">${APP_DATA.tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('')}</select></div><div class="col-md-3 report-filter-group" id="report-branch-selector-container" style="display: none;"><label for="report-branch-selector" class="form-label fw-bold">Select Branch</label><select id="report-branch-selector" class="form-select">${APP_DATA.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}</select></div><div class="col-md-3 report-filter-group" id="report-section-selector-container" style="display: none;"><label for="report-section-selector" class="form-label fw-bold">Select Section</label><select id="report-section-selector" class="form-select">${APP_DATA.sections.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div><div class="col-md-2"><button class="btn btn-primary w-100" id="generate-report-btn">Generate</button></div>`;
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
    outputDiv.style.display = 'block';
    if (!reportData || !reportData.table || reportData.table.length === 0) {
        outputDiv.innerHTML = '<div class="alert alert-light border">No data found for the selected criteria.</div>';
        return;
    }
    const headers = Object.keys(reportData.table[0]);
    outputDiv.innerHTML = `<div class="row"><div class="col-md-7"><h5>${reportData.title}</h5><table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${reportData.table.map(row=>`<tr>${headers.map(h=>`<td>${row[h]}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="col-md-5"><h5>Chart</h5><div class="report-chart-container"><canvas id="report-chart-canvas"></canvas></div></div></div>`;
    renderReportChart(reportData.chartData);
}
function renderReportChart(chartData) {
    if (reportChart) reportChart.destroy();
    if (!chartData || !chartData.datasets) return;
    const chartOptions = { responsive: true, maintainAspectRatio: false, scales: (chartData.type === 'bar') ? { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } : {} };
    reportChart = new Chart(document.getElementById("report-chart-canvas").getContext("2d"), { type: chartData.type, data: chartData, options: chartOptions });
}

// --- UTILITIES ---
function showToast(message, type = "success") {
    const container = document.querySelector(".toast-container");
    const toastId = "toast-" + Date.now();
    const bgClass = type === "danger" ? "bg-danger" : "bg-success";
    const toastHtml = `<div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true"><div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`;
    container.insertAdjacentHTML("beforeend", toastHtml);
    const toast = new bootstrap.Toast(document.getElementById(toastId), { delay: 5000 });
    toast.show();
    document.getElementById(toastId).addEventListener("hidden.bs.toast", e => e.target.remove());
}
