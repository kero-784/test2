// =================================================================
// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNqNxS8aKrFSERj3JNRTyIOwf4VQCRdMM5hyCUWvuiifJZkzWYvNsmT0P5RZsnbipKNg/exec";
// =================================================================

// --- GLOBAL STATE & DOM ELEMENTS ---
let APP_DATA = { branches: [], sections: [], tasks: [] };
let reportChart = null;

const LOADER = document.getElementById('loading-overlay');
const editTaskModal = new bootstrap.Modal(document.getElementById('edit-task-modal'));
const confirmModal = new bootstrap.Modal(document.getElementById('confirm-modal'));
let confirmCallback = () => {};

// --- API & INITIALIZATION ---

/**
 * Unified function to make JSONP calls to the Google Apps Script backend.
 * @param {string} action - The function to call on the backend.
 * @param {object} payload - The data to send with the request.
 * @param {function} callback - Function to execute on successful response.
 */
function apiCall(action, payload = {}, callback) {
    LOADER.style.display = 'flex';
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());

    window[callbackName] = function(response) {
        if (response.success) {
            if (callback) { callback(response.data); }
        } else {
            showToast(`Error: ${response.message}`, 'danger');
        }
        // Cleanup
        delete window[callbackName];
        if (document.body.contains(script)) {
            document.body.removeChild(script);
        }
        LOADER.style.display = 'none';
    };

    const script = document.createElement('script');
    const payloadString = encodeURIComponent(JSON.stringify(payload));
    script.src = `${SCRIPT_URL}?action=${action}&payload=${payloadString}&callback=${callbackName}`;
    script.onerror = function() {
        showToast('Network error: Could not communicate with the server.', 'danger');
        // Cleanup on error
        delete window[callbackName];
        if (document.body.contains(script)) {
            document.body.removeChild(script);
        }
        LOADER.style.display = 'none';
    };
    document.body.appendChild(script);
}

/**
 * Initializes the application on page load.
 */
document.addEventListener('DOMContentLoaded', () => {
    apiCall('getInitialData', {}, (data) => {
        APP_DATA = data;
        renderAllViews();
        addEventListeners();
        showView('dashboard'); // Start with the dashboard view
    });
});

/**
 * Adds all major event listeners for the application.
 */
function addEventListeners() {
    // Sidebar navigation
    document.querySelectorAll("#sidebar .nav-link").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            showView(e.currentTarget.dataset.view);
        });
    });
    
    // Sidebar toggle button
    document.getElementById("sidebar-toggle").addEventListener("click", () => {
        document.querySelector(".app-container").classList.toggle("sidebar-collapsed");
    });

    // Modals
    document.getElementById("confirm-modal-button").addEventListener("click", () => {
        if (typeof confirmCallback === "function") confirmCallback();
        confirmModal.hide();
    });
    document.getElementById("save-task-changes").addEventListener("click", handleSaveTask);
}


// --- VIEW MANAGEMENT ---

/**
 * Switches the visible view and updates navigation link states.
 * @param {string} viewId - The ID of the view to show (e.g., 'dashboard').
 */
function showView(viewId) {
    // Hide all views
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active-view"));
    // Show the target view
    const targetView = document.getElementById(`${viewId}-view`);
    if (targetView) targetView.classList.add("active-view");

    // Update active state on sidebar links
    document.querySelectorAll("#sidebar .nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.view === viewId);
    });

    // Update main header title
    const viewLink = document.querySelector(`#sidebar .nav-link[data-view="${viewId}"]`);
    const viewTitle = viewLink ? viewLink.querySelector('span').textContent : 'Dashboard';
    document.getElementById('view-title').textContent = viewTitle;
}

/**
 * Calls all rendering functions to populate the different views.
 */
function renderAllViews() {
    renderDashboardView();
    renderTasksView();
    renderManagementView();
    renderReportsView();
}


// --- DASHBOARD VIEW ---
function renderDashboardView() {
    const view = document.getElementById("dashboard-view");
    const allTasks = APP_DATA.tasks;
    const activeTasks = allTasks.filter(t => t.status === "Active").length;
    const allAssignments = allTasks.flatMap(t => t.assignments);
    const pendingAssignments = allAssignments.filter(a => a.status === "Pending").length;
    const branchMap = Object.fromEntries(APP_DATA.branches.map(b => [b.id, b.name]));
    const taskMap = Object.fromEntries(allTasks.map(t => [t.id, t.title]));

    const recentCompletions = allAssignments
        .filter(a => a.status === "Completed" && a.completionTimestamp !== "N/A")
        .sort((a, b) => new Date(b.completionTimestamp.split(" ")[0].split("/").reverse().join("-")) - new Date(a.completionTimestamp.split(" ")[0].split("/").reverse().join("-")))
        .slice(0, 5);

    view.innerHTML = `
        <div class="row g-4">
            <div class="col-md-6 col-xl-3"><div class="card stat-card"><div class="card-body"><div class="stat-icon bg-primary-subtle text-primary"><i class="bi bi-list-task"></i></div><div><h5>Active Tasks</h5><div class="stat-number">${activeTasks}</div></div></div></div></div>
            <div class="col-md-6 col-xl-3"><div class="card stat-card"><div class="card-body"><div class="stat-icon bg-warning-subtle text-warning"><i class="bi bi-hourglass-split"></i></div><div><h5>Pending Assignments</h5><div class="stat-number">${pendingAssignments}</div></div></div></div></div>
            <div class="col-md-6 col-xl-3"><div class="card stat-card"><div class="card-body"><div class="stat-icon bg-info-subtle text-info"><i class="bi bi-building"></i></div><div><h5>Active Branches</h5><div class="stat-number">${APP_DATA.branches.filter(b => b.status === "Active").length}</div></div></div></div></div>
            <div class="col-md-6 col-xl-3"><div class="card stat-card"><div class="card-body"><div class="stat-icon bg-secondary-subtle text-secondary"><i class="bi bi-diagram-3"></i></div><div><h5>Active Sections</h5><div class="stat-number">${APP_DATA.sections.filter(s => s.status === "Active").length}</div></div></div></div></div>
        </div>
        <div class="row g-4 mt-2">
            <div class="col-xl-7"><div class="card h-100"><div class="card-header"><h4><i class="bi bi-clock-history me-2"></i>Recent Activity</h4></div><div class="card-body"><ul class="list-group list-group-flush">${recentCompletions.length > 0 ? recentCompletions.map(a => `<li class="list-group-item">Branch <strong>${branchMap[a.branchId] || "Unknown"}</strong> completed task "<em>${taskMap[a.taskId] || "Unknown"}</em>" in ${a.timeTaken}.</li>`).join("") : '<li class="list-group-item">No recent completions.</li>'}</ul></div></div></div>
            <div class="col-xl-5"><div class="card h-100"><div class="card-header"><h4><i class="bi bi-plus-circle me-2"></i>Create New Task</h4></div><div class="card-body" id="create-task-form-container"></div></div></div>
        </div>`;
    renderCreateTaskForm();
}

function renderCreateTaskForm() {
    const container = document.getElementById("create-task-form-container");
    const activeSections = APP_DATA.sections.filter(s => s.status === "Active");
    const activeBranches = APP_DATA.branches.filter(b => b.status === "Active");

    container.innerHTML = `
        <form id="create-task-form">
            <div class="mb-3"><label for="task-title" class="form-label">Task Title</label><input type="text" class="form-control" id="task-title" required></div>
            <div class="mb-3"><label for="task-description" class="form-label">Description</label><textarea class="form-control" id="task-description" rows="2"></textarea></div>
            <div class="row"><div class="col-md-6 mb-3"><label for="task-section" class="form-label">Section</label><select class="form-select" id="task-section" required><option value="" disabled selected>Select...</option>${activeSections.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}</select></div><div class="col-md-6 mb-3"><label for="task-type" class="form-label">Type</label><select class="form-select" id="task-type"><option value="Normal">Normal</option><option value="Time-Limited">Time-Limited</option></select></div></div>
            <div class="mb-3" id="deadline-container" style="display: none;"><label for="task-deadline" class="form-label">Deadline</label><input type="datetime-local" class="form-control" id="task-deadline"></div>
            <div class="mb-3"><label class="form-label">Assign to Branches</label><div id="branch-checkboxes" class="border p-2 rounded bg-light" style="max-height: 110px; overflow-y: auto;">${activeBranches.map(b => `<div class="form-check"><input class="form-check-input" type="checkbox" value="${b.id}" id="branch-${b.id}"><label class="form-check-label" for="branch-${b.id}">${b.name}</label></div>`).join("") || '<p class="text-muted small">No active branches found.</p>'}</div></div>
            <button type="submit" class="btn btn-primary w-100" id="create-task-btn"><i class="bi bi-send-plus-fill me-2"></i>Create Task</button>
        </form>`;

    document.getElementById("create-task-form").addEventListener("submit", handleCreateTask);
    document.getElementById("task-type").addEventListener("change", toggleDeadline);
}

// --- TASKS VIEW ---
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

    displayFilteredTasks(); // Initial render

    // Add listeners for filters
    document.getElementById("show-inactive-toggle").addEventListener("change", displayFilteredTasks);
    document.getElementById("task-search-input").addEventListener("input", displayFilteredTasks);
}

function displayFilteredTasks() {
    const showInactive = document.getElementById("show-inactive-toggle").checked;
    const searchTerm = document.getElementById("task-search-input").value.toLowerCase();

    let tasksToDisplay = APP_DATA.tasks;

    if (!showInactive) {
        tasksToDisplay = tasksToDisplay.filter(t => t.status === "Active");
    }
    if (searchTerm) {
        tasksToDisplay = tasksToDisplay.filter(t => t.title.toLowerCase().includes(searchTerm));
    }

    renderTaskCards(tasksToDisplay);
}

function renderTaskCards(tasks) {
    const taskListContainer = document.getElementById("task-list-container");
    if (tasks.length === 0) {
        taskListContainer.innerHTML = '<div class="alert alert-light text-center">No tasks match your criteria.</div>';
        return;
    }

    const branchMap = Object.fromEntries(APP_DATA.branches.map(b => [b.id, b.name]));

    taskListContainer.innerHTML = tasks.map(task => {
        const totalAssignments = task.assignments.length;
        const completedAssignments = task.assignments.filter(a => a.status === 'Completed').length;
        const progress = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

        const assignmentsHtml = task.assignments.map(a => `
            <tr>
                <td>${branchMap[a.branchId] || a.branchId}</td>
                <td><span class="badge ${a.status === "Completed" ? "bg-success" : "bg-warning"}">${a.status}</span></td>
                <td>${a.completionTimestamp}</td>
                <td>${a.timeTaken}</td>
                <td>${a.status === "Pending" ? `<button class="btn btn-sm btn-primary" onclick="markComplete('${a.assignmentId}')">Complete</button>` : ""}</td>
            </tr>`).join("");

        return `
            <div class="card mb-3 task-card ${task.status.toLowerCase()}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <strong class="fs-5">${task.title}</strong>
                        <span class="badge bg-secondary ms-2">${task.taskType}</span>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="openEditTaskModal('${task.id}')"><i class="bi bi-pencil-square me-2"></i> Edit</a></li>
                            <li><a class="dropdown-item" href="#" onclick="toggleTaskStatus('${task.id}', '${task.status === "Active" ? "Inactive" : "Active"}')"><i class="bi bi-power me-2"></i> ${task.status === "Active" ? "Disable" : "Enable"}</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteTask('${task.id}')"><i class="bi bi-trash me-2"></i> Delete</a></li>
                        </ul>
                    </div>
                </div>
                <div class="card-body">
                    <p class="mb-3">${task.description || "No description."}</p>
                    
                    <div class="progress-container mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="progress-info">Progress</span>
                            <span class="progress-info"><strong>${completedAssignments} / ${totalAssignments}</strong> Completed</span>
                        </div>
                        <div class="progress">
                           <div class="progress-bar" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                    
                    <table class="table table-sm table-bordered mt-3">
                        <thead class="table-light"><tr><th>Branch</th><th>Status</th><th>Completed On</th><th>Time Taken</th><th>Action</th></tr></thead>
                        <tbody class="task-assignments-body">${assignmentsHtml}</tbody>
                    </table>
                </div>
                <div class="card-footer text-muted">Deadline: ${task.deadline}</div>
            </div>`;
    }).join("");
}

// --- MANAGEMENT VIEW ---
function renderManagementView() {
    const view = document.getElementById("management-view");
    view.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-6">
                <div class="card h-100"><div class="card-header"><h4>Manage Branches</h4></div><div class="card-body">
                    <form id="branch-form" class="mb-3"><div class="input-group"><input type="text" id="new-branch-name" class="form-control" placeholder="New Branch Name" required><button class="btn btn-primary" type="submit">Add Branch</button></div></form>
                    <ul id="branch-list" class="list-group"></ul>
                </div></div>
            </div>
            <div class="col-lg-6">
                <div class="card h-100"><div class="card-header"><h4>Manage Sections</h4></div><div class="card-body">
                    <form id="section-form" class="mb-3"><div class="input-group"><input type="text" id="new-section-name" class="form-control" placeholder="New Section Name" required><button class="btn btn-primary" type="submit">Add Section</button></div></form>
                    <ul id="section-list" class="list-group"></ul>
                </div></div>
            </div>
        </div>`;
    renderManagementLists();
    document.getElementById("branch-form").addEventListener("submit", e => handleManageEntity(e, "branch"));
    document.getElementById("section-form").addEventListener("submit", e => handleManageEntity(e, "section"));
}

function renderManagementLists() {
    const branchList = document.getElementById("branch-list");
    const sectionList = document.getElementById("section-list");
    branchList.innerHTML = "";
    sectionList.innerHTML = "";

    const createListItem = (item, type) => `
        <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${item.id}">
            <span class="item-name">${item.name}</span>
            <input type="text" class="form-control item-input" value="${item.name}" style="display:none;">
            <div>
                <span class="badge bg-${item.status === "Active" ? "success" : "secondary"} me-2">${item.status}</span>
                <button class="btn btn-sm btn-outline-primary save-btn" onclick="saveEntity(this, '${type}')" style="display:none;"><i class="bi bi-check-lg"></i></button>
                <button class="btn btn-sm btn-outline-secondary cancel-btn" onclick="cancelEditEntity(this)" style="display:none;"><i class="bi bi-x-lg"></i></button>
                <button class="btn btn-sm btn-outline-primary edit-btn" onclick="toggleEditEntity(this)"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-secondary power-btn" onclick="toggleEntityStatus(this, '${type}')"><i class="bi bi-power"></i></button>
            </div>
        </li>`;

    APP_DATA.branches.forEach(item => branchList.innerHTML += createListItem(item, "branch"));
    APP_DATA.sections.forEach(item => sectionList.innerHTML += createListItem(item, "section"));
}


// --- REPORTS VIEW ---
function renderReportsView() {
    const view = document.getElementById("reports-view");
    view.innerHTML = `
        <div class="card"><div class="card-body"><div class="row g-3 align-items-end">
            <div class="col-md-3"><label for="report-type" class="form-label fw-bold">Report Type</label><select id="report-type" class="form-select"><option value="task_detail">Task Detail Report</option><option value="branch_performance">Branch Performance</option></select></div>
            <div class="col-md-4" id="report-task-selector-container"><label for="report-task-selector" class="form-label fw-bold">Select Task</label><select id="report-task-selector" class="form-select"></select></div>
            <div class="col-md-4" id="report-branch-options-container" style="display: none;"><div class="row"><div class="col-sm-6"><label for="report-start-date" class="form-label fw-bold">Start Date</label><input type="date" id="report-start-date" class="form-control"></div><div class="col-sm-6"><label for="report-end-date" class="form-label fw-bold">End Date</label><input type="date" id="report-end-date" class="form-control"></div></div></div>
            <div class="col-md-3" id="report-assessment-container" style="display: none;"><label for="report-assessment-method" class="form-label fw-bold">Assessment Method</label><select id="report-assessment-method" class="form-select"><option value="avg_time">Fastest (Average Time)</option><option value="rank_points">Most Consistent (Rank Points)</option></select></div>
            <div class="col-md-2"><button class="btn btn-primary w-100" id="generate-report-btn">Generate</button></div>
        </div></div></div>
        <div id="report-output" class="mt-4" style="display: none;"></div>`;

    renderReportFilters();
    document.getElementById("report-type").addEventListener("change", toggleReportOptions);
    document.getElementById("generate-report-btn").addEventListener("click", generateReport);
}

function renderReportFilters() {
    const taskSelector = document.getElementById("report-task-selector");
    taskSelector.innerHTML = '<option value="" disabled selected>Select a task...</option>';
    APP_DATA.tasks.forEach(t => taskSelector.innerHTML += `<option value="${t.id}">${t.title}</option>`);
    const today = (new Date()).toISOString().split("T")[0];
    document.getElementById("report-end-date").value = today;
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    document.getElementById("report-start-date").value = lastMonth.toISOString().split("T")[0];
}

function renderReport(reportData) {
    const outputDiv = document.getElementById("report-output");
    outputDiv.style.display = 'block';

    if (!reportData || !reportData.table || reportData.table.length === 0) {
        outputDiv.innerHTML = '<div class="alert alert-light border text-center p-5"><h4>No Data Found</h4><p>There is no data available for the selected criteria.</p></div>';
        return;
    }

    const headers = Object.keys(reportData.table[0]).filter(h => h !== "Time Taken (s)");
    outputDiv.innerHTML = `
        <div id="report-card-export">
            <div id="report-header">
                <h4>${reportData.title}</h4>
                <div id="report-buttons">
                    <button class="btn btn-outline-success me-2" onclick='exportToExcel(${JSON.stringify(reportData)})'><i class="bi bi-file-earmark-excel"></i> Excel</button>
                    <button class="btn btn-outline-primary" onclick="exportReportToJpg()"><i class="bi bi-file-earmark-image"></i> JPG</button>
                </div>
            </div>
            <div class="row mt-4">
                <div class="col-lg-7">
                    <h5>Data Table</h5>
                    <div class="table-responsive">
                    <table class="table">
                        <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
                        <tbody>${reportData.table.map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join("")}</tr>`).join("")}</tbody>
                    </table>
                    </div>
                </div>
                <div class="col-lg-5">
                    <h5>Chart</h5>
                    <div style="position: relative; height: 350px;">
                        <canvas id="report-chart-canvas"></canvas>
                    </div>
                </div>
            </div>
        </div>`;

    if (reportChart) reportChart.destroy();

    const chartColors = {
        pie: ["#10b981", "#f59e0b", "#ef4444"], // Completed, Pending, Overdue
        bar: "rgba(79, 70, 229, 0.7)"
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: reportData.chartData.type === "pie" ? "bottom" : "top",
                labels: { boxWidth: 12, padding: 20, font: { size: 14 } }
            },
        },
    };

    if (reportData.chartData.type === 'bar') {
        chartOptions.scales = { y: { beginAtZero: true } };
    }
    
    const chartConfig = {
        type: reportData.chartData.type,
        data: {
            labels: reportData.chartData.labels,
            datasets: [{
                label: reportData.chartData.label || "Performance",
                data: reportData.chartData.data,
                backgroundColor: reportData.chartData.type === "pie" ? chartColors.pie : chartColors.bar,
                borderColor: "#fff",
                borderWidth: reportData.chartData.type === "pie" ? 2 : 0
            }]
        },
        options: chartOptions
    };

    reportChart = new Chart(document.getElementById("report-chart-canvas").getContext("2d"), chartConfig);
}

// --- EVENT HANDLERS & ACTIONS ---

function handleCreateTask(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';

    const selectedBranches = Array.from(document.querySelectorAll("#branch-checkboxes input:checked")).map(cb => cb.value);
    if (selectedBranches.length === 0) {
        showToast("Please assign the task to at least one branch.", "danger");
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send-plus-fill me-2"></i>Create Task';
        return;
    }
    const taskData = {
        title: document.getElementById("task-title").value,
        description: document.getElementById("task-description").value,
        section: document.getElementById("task-section").value,
        type: document.getElementById("task-type").value,
        deadline: document.getElementById("task-deadline").value,
        branches: selectedBranches
    };
    apiCall("createTask", taskData, data => {
        showToast(data.message, "success");
        e.target.reset();
        toggleDeadline();
        apiCall("getInitialData", {}, newData => {
            APP_DATA = newData;
            renderAllViews();
            showView('dashboard');
        });
    });
    // Re-enable button after API call is made (UI will be blocked by loader anyway)
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send-plus-fill me-2"></i>Create Task';
}

function handleManageEntity(e, type) {
    e.preventDefault();
    const input = document.getElementById(`new-${type}-name`);
    const name = input.value.trim();
    if (!name) return;
    apiCall("manageEntity", { type, name }, data => {
        showToast(data.message, "success");
        input.value = "";
        apiCall("getInitialData", {}, newData => {
            APP_DATA = newData;
            renderManagementLists(); // Only need to re-render the lists
        });
    });
}

function markComplete(assignmentId) {
    showConfirmModal("Are you sure you want to mark this task as complete?", () => {
        apiCall("markTaskAsComplete", { assignmentId }, data => {
            showToast(data.message, "success");
            apiCall("getInitialData", {}, newData => {
                APP_DATA = newData;
                renderAllViews();
            });
        });
    });
}

function openEditTaskModal(taskId) {
    const task = APP_DATA.tasks.find(t => t.id === taskId);
    if (task) {
        document.getElementById("edit-task-id").value = task.id;
        document.getElementById("edit-task-title").value = task.title;
        document.getElementById("edit-task-description").value = task.description;
        editTaskModal.show();
    }
}

function handleSaveTask() {
    const payload = {
        taskId: document.getElementById("edit-task-id").value,
        title: document.getElementById("edit-task-title").value,
        description: document.getElementById("edit-task-description").value
    };
    apiCall("updateTask", payload, data => {
        showToast(data.message, "success");
        editTaskModal.hide();
        apiCall("getInitialData", {}, newData => {
            APP_DATA = newData;
            renderAllViews();
        });
    });
}

function toggleTaskStatus(taskId, newStatus) {
    const action = newStatus === "Active" ? "enable" : "disable";
    showConfirmModal(`Are you sure you want to ${action} this task?`, () => {
        apiCall("setTaskStatus", { taskId, status: newStatus }, data => {
            showToast(data.message, "success");
            apiCall("getInitialData", {}, newData => {
                APP_DATA = newData;
                renderAllViews();
            });
        });
    });
}

function deleteTask(taskId) {
    showConfirmModal("Are you sure you want to permanently delete this task? This cannot be undone.", () => {
        apiCall("deleteTask", { taskId }, data => {
            showToast(data.message, "success");
            apiCall("getInitialData", {}, newData => {
                APP_DATA = newData;
                renderAllViews();
            });
        });
    });
}

function generateReport() {
    const reportType = document.getElementById("report-type").value;
    let payload = { reportType };

    if (reportType === "task_detail") {
        payload.taskId = document.getElementById("report-task-selector").value;
        if (!payload.taskId) {
            showToast("Please select a task.", "danger");
            return;
        }
    } else {
        payload.startDate = document.getElementById("report-start-date").value;
        payload.endDate = document.getElementById("report-end-date").value;
        payload.assessmentMethod = document.getElementById("report-assessment-method").value;
        if (!payload.startDate || !payload.endDate) {
            showToast("Please select a date range.", "danger");
            return;
        }
    }
    apiCall("getReportsData", payload, data => {
        renderReport(data);
    });
}

// --- UTILITY & HELPER FUNCTIONS ---

function exportToExcel(reportData) {
    showToast("Preparing your Excel file...", "success");
    apiCall("generateExcelReport", reportData, data => {
        if (data && data.data) {
            const byteCharacters = atob(data.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: data.mimeType });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = data.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
}

function exportReportToJpg() {
    const reportCard = document.getElementById("report-card-export");
    if (!reportCard) {
        showToast("No report to export.", "danger");
        return;
    }
    showToast("Generating JPG, please wait...", "success");
    reportCard.classList.add("print-view");
    html2canvas(reportCard, { scale: 2 }).then(canvas => {
        reportCard.classList.remove("print-view");
        const image = canvas.toDataURL("image/jpeg", 0.9);
        const link = document.createElement("a");
        link.href = image;
        link.download = "Task-Report.jpg";
        link.click();
    }).catch(err => {
        reportCard.classList.remove("print-view");
        showToast("Failed to generate JPG.", "danger");
        console.error(err);
    });
}

function toggleDeadline() {
    const type = document.getElementById("task-type").value;
    const container = document.getElementById("deadline-container");
    container.style.display = type === "Time-Limited" ? "block" : "none";
    document.getElementById("task-deadline").required = type === "Time-Limited";
}

function toggleReportOptions() {
    const reportType = document.getElementById("report-type").value;
    document.getElementById("report-task-selector-container").style.display = reportType === "task_detail" ? "block" : "none";
    document.getElementById("report-branch-options-container").style.display = reportType === "branch_performance" ? "flex" : "none";
    document.getElementById("report-assessment-container").style.display = reportType === "branch_performance" ? "block" : "none";
}

function toggleEditEntity(btn) {
    const li = btn.closest(".list-group-item");
    li.classList.add("editing");
    li.querySelector(".item-input").focus();
}

function cancelEditEntity(btn) {
    const li = btn.closest(".list-group-item");
    li.classList.remove("editing");
}

function saveEntity(btn, type) {
    const li = btn.closest(".list-group-item");
    const id = li.dataset.id;
    const name = li.querySelector(".item-input").value.trim();
    if (!name) {
        showToast("Name cannot be empty.", "danger");
        return;
    }
    const status = li.querySelector(".badge").textContent;
    apiCall("manageEntity", { type, id, name, status }, data => {
        showToast(data.message, "success");
        li.classList.remove("editing");
        apiCall("getInitialData", {}, newData => {
            APP_DATA = newData;
            renderManagementLists();
        });
    });
}

function toggleEntityStatus(btn, type) {
    const li = btn.closest(".list-group-item");
    const id = li.dataset.id;
    const name = li.querySelector(".item-name").textContent;
    const currentStatus = li.querySelector(".badge").textContent;
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    showConfirmModal(`Are you sure you want to set "${name}" to ${newStatus}?`, () => {
        apiCall("manageEntity", { type, id, name, status: newStatus }, data => {
            showToast(data.message, "success");
            apiCall("getInitialData", {}, newData => {
                APP_DATA = newData;
                renderManagementLists();
            });
        });
    });
}

function showToast(message, type = "success") {
    const toastContainer = document.querySelector(".toast-container");
    const toastId = "toast-" + Date.now();
    const bgClass = type === "danger" ? "bg-danger" : "bg-success";
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>`;
    toastContainer.insertAdjacentHTML("beforeend", toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    toastElement.addEventListener("hidden.bs.toast", () => toastElement.remove());
}

function showConfirmModal(bodyText, onConfirm) {
    document.getElementById("confirm-modal-body").textContent = bodyText;
    confirmCallback = onConfirm;
    confirmModal.show();
}
