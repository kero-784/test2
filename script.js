// =================================================================
// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIfIhNEDbi-Kf463_To56itJHAe7IB5yGPPi7XVBl_u0JPgaIFsyl03QmLX3RonbI1rg/exec";
// =================================================================

// --- GLOBAL STATE & ELEMENTS ---
let APP_DATA = { branches: [], sections: [], tasks: [] };
let reportChart = null; // To hold the chart instance for destruction
const LOADER = document.getElementById('loading-overlay');
const editTaskModal = new bootstrap.Modal(document.getElementById('edit-task-modal'));

// --- API COMMUNICATION ---
async function apiCall(action, payload = {}) {
    LOADER.style.display = 'flex';
    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });
        const response = await res.json();
        if (!response.success) {
            throw new Error(response.message || 'An unknown API error occurred.');
        }
        return response.data;
    } catch (error) {
        console.error('API Call Failed:', error);
        alert(`Error: ${error.message}`);
        return null;
    } finally {
        LOADER.style.display = 'none';
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initializeApplication();
});

async function initializeApplication() {
    const data = await apiCall('getInitialData');
    if (data) {
        APP_DATA = data;
        renderAllComponents();
        addEventListeners(); // Add listeners after components are rendered
    }
}

function addEventListeners() {
    document.getElementById('create-task-form').addEventListener('submit', handleCreateTask);
    document.getElementById('show-inactive-toggle').addEventListener('change', () => renderTasks());
    document.getElementById('branch-form').addEventListener('submit', (e) => handleManageEntity(e, 'branch'));
    document.getElementById('section-form').addEventListener('submit', (e) => handleManageEntity(e, 'section'));
    document.getElementById('save-task-changes').addEventListener('click', handleSaveTask);
}

// --- RENDER FUNCTIONS ---
function renderAllComponents() {
    renderCreateTaskForm();
    renderTasks();
    renderManagementLists();
    renderReportFilters();
}

function renderCreateTaskForm() {
    const form = document.getElementById('create-task-form');
    const activeSections = APP_DATA.sections.filter(s => s.status === 'Active');
    const activeBranches = APP_DATA.branches.filter(b => b.status === 'Active');
    
    form.innerHTML = `
        <div class="mb-3"><label for="task-title" class="form-label">Task Title</label><input type="text" class="form-control" id="task-title" required></div>
        <div class="mb-3"><label for="task-description" class="form-label">Description</label><textarea class="form-control" id="task-description" rows="3"></textarea></div>
        <div class="row"><div class="col-md-6 mb-3"><label for="task-section" class="form-label">Assigning Section</label><select class="form-select" id="task-section" required><option value="" disabled selected>Select...</option>${activeSections.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div><div class="col-md-6 mb-3"><label for="task-type" class="form-label">Task Type</label><select class="form-select" id="task-type"><option value="Normal">Normal</option><option value="Time-Limited">Time-Limited</option></select></div></div>
        <div class="mb-3" id="deadline-container" style="display: none;"><label for="task-deadline" class="form-label">Deadline</label><input type="date" class="form-control" id="task-deadline"></div>
        <div class="mb-3"><label class="form-label">Assign to Branches</label><div id="branch-checkboxes" class="border p-2 rounded">${activeBranches.map(b => `<div class="form-check"><input class="form-check-input" type="checkbox" value="${b.id}" id="branch-${b.id}"><label class="form-check-label" for="branch-${b.id}">${b.name}</label></div>`).join('') || '<p class="text-muted">No active branches.</p>'}</div></div>
        <button type="submit" class="btn btn-success" id="create-task-btn">Create Task</button>
    `;
    document.getElementById('task-type').addEventListener('change', toggleDeadline);
}

function renderTasks() {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    document.getElementById('task-loader').style.display = 'none';

    const showInactive = document.getElementById('show-inactive-toggle').checked;
    const tasksToDisplay = showInactive ? APP_DATA.tasks : APP_DATA.tasks.filter(t => t.status === 'Active');
    
    if (tasksToDisplay.length === 0) {
        taskList.innerHTML = '<div class="alert alert-info">No tasks to display.</div>';
        return;
    }

    const branchMap = Object.fromEntries(APP_DATA.branches.map(b => [b.id, b.name]));

    tasksToDisplay.forEach(task => {
        const assignmentsHtml = task.assignments.map(a => `
            <tr>
                <td>${branchMap[a.branchId] || a.branchId}</td>
                <td><span class="badge ${a.status === 'Completed' ? 'bg-success' : 'bg-warning'}">${a.status}</span></td>
                <td>${a.completionTimestamp}</td>
                <td>${a.timeTaken}</td>
                <td>${a.status === 'Pending' ? `<button class="btn btn-sm btn-primary" onclick="markComplete('${a.assignmentId}')">Complete</button>` : ''}</td>
            </tr>`).join('');

        const card = document.createElement('div');
        card.className = `card mb-3 task-card ${task.status.toLowerCase()}`;
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between">
                <div><strong>${task.title}</strong> <span class="badge bg-secondary">${task.taskType}</span></div>
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="openEditTaskModal('${task.id}')"><i class="bi bi-pencil-square"></i> Edit</a></li>
                        <li><a class="dropdown-item" href="#" onclick="toggleTaskStatus('${task.id}', '${task.status === 'Active' ? 'Inactive' : 'Active'}')"><i class="bi bi-power"></i> ${task.status === 'Active' ? 'Disable' : 'Enable'}</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="deleteTask('${task.id}')"><i class="bi bi-trash"></i> Delete</a></li>
                    </ul>
                </div>
            </div>
            <div class="card-body">
                <p>${task.description || 'No description.'}</p>
                <table class="table table-sm table-bordered"><thead class="table-light"><tr><th>Branch</th><th>Status</th><th>Completed On</th><th>Time Taken</th><th>Action</th></tr></thead><tbody class="task-assignments-body">${assignmentsHtml}</tbody></table>
            </div>
            <div class="card-footer text-muted">Deadline: ${task.deadline}</div>`;
        taskList.appendChild(card);
    });
}

function renderManagementLists() {
    const branchList = document.getElementById('branch-list');
    const sectionList = document.getElementById('section-list');
    branchList.innerHTML = '';
    sectionList.innerHTML = '';

    const createListItem = (item, type) => `
        <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${item.id}">
            <span class="item-name">${item.name}</span>
            <input type="text" class="form-control item-input" value="${item.name}" style="display:none;">
            <div>
                <span class="badge bg-${item.status === 'Active' ? 'success' : 'secondary'} me-2">${item.status}</span>
                <button class="btn btn-sm btn-outline-primary save-btn" onclick="saveEntity(this, '${type}')" style="display:none;"><i class="bi bi-check-lg"></i></button>
                <button class="btn btn-sm btn-outline-secondary cancel-btn" onclick="cancelEditEntity(this)" style="display:none;"><i class="bi bi-x-lg"></i></button>
                <button class="btn btn-sm btn-outline-primary edit-btn" onclick="toggleEditEntity(this)"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-secondary power-btn" onclick="toggleEntityStatus(this, '${type}')"><i class="bi bi-power"></i></button>
            </div>
        </li>`;
    
    APP_DATA.branches.forEach(item => branchList.innerHTML += createListItem(item, 'branch'));
    APP_DATA.sections.forEach(item => sectionList.innerHTML += createListItem(item, 'section'));
}

function renderReportFilters() {
    const reportPane = document.getElementById('reports-pane');
    reportPane.innerHTML = `
        <div class="card mt-3">
            <div class="card-header"><h3>Generate Reports</h3></div>
            <div class="card-body">
                <div class="row g-3 align-items-end">
                    <div class="col-md-3"><label for="report-type" class="form-label">Report Type</label><select id="report-type" class="form-select"><option value="task_detail">Task Detail Report</option><option value="branch_performance">Branch Performance</option></select></div>
                    <div class="col-md-4" id="report-task-selector-container"><label for="report-task-selector" class="form-label">Select Task</label><select id="report-task-selector" class="form-select"></select></div>
                    <div class="col-md-4" id="report-branch-options-container" style="display: none;"><div class="row"><div class="col-sm-6"><label for="report-start-date" class="form-label">Start Date</label><input type="date" id="report-start-date" class="form-control"></div><div class="col-sm-6"><label for="report-end-date" class="form-label">End Date</label><input type="date" id="report-end-date" class="form-control"></div></div></div>
                    <div class="col-md-3" id="report-assessment-container" style="display: none;"><label for="report-assessment-method" class="form-label">Assessment Method</label><select id="report-assessment-method" class="form-select"><option value="avg_time">Fastest (Average Time)</option><option value="rank_points">Most Consistent (Rank Points)</option></select></div>
                    <div class="col-md-2"><button class="btn btn-primary w-100" id="generate-report-btn">Generate</button></div>
                </div>
            </div>
        </div>
        <div id="report-output" class="mt-4"></div>`;
    
    document.getElementById('report-type').addEventListener('change', toggleReportOptions);
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);
    
    const taskSelector = document.getElementById('report-task-selector');
    taskSelector.innerHTML = '<option value="" disabled selected>Select a task...</option>';
    APP_DATA.tasks.forEach(t => taskSelector.innerHTML += `<option value="${t.id}">${t.title}</option>`);

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('report-end-date').value = today;
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    document.getElementById('report-start-date').value = lastMonth.toISOString().split('T')[0];
}

function renderReport(reportData) {
    const outputDiv = document.getElementById('report-output');
    if (!reportData || !reportData.table || reportData.table.length === 0) {
        outputDiv.innerHTML = '<div class="alert alert-warning">No data found for the selected criteria.</div>';
        return;
    }

    const headers = Object.keys(reportData.table[0]).filter(h => h !== 'Time Taken (s)');
    const tableHtml = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h4>${reportData.title}</h4>
                <div>
                    <button class="btn btn-success me-2" onclick='exportToExcel(${JSON.stringify(reportData)})'><i class="bi bi-file-earmark-excel"></i> Export Excel</button>
                    <button class="btn btn-info" onclick="exportChartToJpg()"><i class="bi bi-file-earmark-image"></i> Export Chart</button>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-7">
                        <h5>Data Table</h5>
                        <div class="table-responsive">
                            <table class="table table-striped table-bordered">
                                <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                                <tbody>${reportData.table.map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('')}</tbody>
                            </table>
                        </div>
                    </div>
                    <div class="col-md-5">
                        <h5>Chart</h5>
                        <canvas id="report-chart-canvas"></canvas>
                    </div>
                </div>
            </div>
        </div>`;
    outputDiv.innerHTML = tableHtml;

    if (reportChart) reportChart.destroy();
    reportChart = new Chart(document.getElementById('report-chart-canvas').getContext('2d'), {
        type: 'bar',
        data: {
            labels: reportData.chartData.labels,
            datasets: [{ label: 'Performance', data: reportData.chartData.data, backgroundColor: 'rgba(54, 162, 235, 0.6)' }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

// --- ACTION HANDLERS ---
async function handleCreateTask(e) {
    e.preventDefault();
    const btn = document.getElementById('create-task-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';

    const selectedBranches = Array.from(document.querySelectorAll('#branch-checkboxes input:checked')).map(cb => cb.value);
    if (selectedBranches.length === 0) {
        alert('Please assign the task to at least one branch.');
        btn.disabled = false; btn.innerHTML = 'Create Task';
        return;
    }

    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        section: document.getElementById('task-section').value,
        type: document.getElementById('task-type').value,
        deadline: document.getElementById('task-deadline').value,
        branches: selectedBranches
    };

    const result = await apiCall('createTask', taskData);
    if (result) {
        alert(result.message);
        document.getElementById('create-task-form').reset();
        toggleDeadline();
        initializeApplication(); // Refresh all data
    }
    btn.disabled = false; btn.innerHTML = 'Create Task';
}

async function handleManageEntity(e, type) {
    e.preventDefault();
    const input = document.getElementById(`new-${type}-name`);
    const name = input.value.trim();
    if (!name) return;
    const result = await apiCall('manageEntity', { type, name });
    if (result) {
        alert(result.message);
        input.value = '';
        initializeApplication();
    }
}

async function markComplete(assignmentId) {
    if (!confirm('Are you sure you want to mark this task as complete?')) return;
    const result = await apiCall('markTaskAsComplete', { assignmentId });
    if (result) {
        alert(result.message);
        initializeApplication();
    }
}

function openEditTaskModal(taskId) {
    const task = APP_DATA.tasks.find(t => t.id === taskId);
    if (task) {
        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-task-title').value = task.title;
        document.getElementById('edit-task-description').value = task.description;
        editTaskModal.show();
    }
}

async function handleSaveTask() {
    const payload = {
        taskId: document.getElementById('edit-task-id').value,
        title: document.getElementById('edit-task-title').value,
        description: document.getElementById('edit-task-description').value
    };
    const result = await apiCall('updateTask', payload);
    if (result) {
        alert(result.message);
        editTaskModal.hide();
        initializeApplication();
    }
}

async function toggleTaskStatus(taskId, newStatus) {
    if (!confirm(`Are you sure you want to ${newStatus === 'Active' ? 'enable' : 'disable'} this task?`)) return;
    const result = await apiCall('setTaskStatus', { taskId, status: newStatus });
    if (result) {
        alert(result.message);
        initializeApplication();
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to permanently delete this task? This action cannot be undone.')) return;
    const result = await apiCall('deleteTask', { taskId });
    if (result) {
        alert(result.message);
        initializeApplication();
    }
}

async function generateReport() {
    const reportType = document.getElementById('report-type').value;
    let payload = { reportType };
    
    if (reportType === 'task_detail') {
        payload.taskId = document.getElementById('report-task-selector').value;
        if (!payload.taskId) { alert('Please select a task.'); return; }
    } else {
        payload.startDate = document.getElementById('report-start-date').value;
        payload.endDate = document.getElementById('report-end-date').value;
        payload.assessmentMethod = document.getElementById('report-assessment-method').value;
        if (!payload.startDate || !payload.endDate) { alert('Please select a date range.'); return; }
    }
    
    const reportData = await apiCall('getReportsData', payload);
    renderReport(reportData);
}

async function exportToExcel(reportData) {
    alert("Preparing your Excel file. This may take a moment. The download will start automatically.");
    const result = await apiCall('generateExcelReport', reportData);
    if(result && result.downloadUrl) {
        // This opens the URL in a new tab, which browsers might block. A better UX is to redirect.
        window.location.href = result.downloadUrl;
    }
}

function exportChartToJpg() {
    if(!reportChart) { alert("No chart to export."); return; }
    const a = document.createElement('a');
    a.href = reportChart.toBase64Image('image/jpeg', 1); // Get chart as JPG
    a.download = 'chart-export.jpg';
    a.click();
}

// --- UI HELPERS ---
function toggleDeadline() {
    const type = document.getElementById('task-type').value;
    const container = document.getElementById('deadline-container');
    container.style.display = type === 'Time-Limited' ? 'block' : 'none';
    document.getElementById('task-deadline').required = type === 'Time-Limited';
}

function toggleReportOptions() {
    const reportType = document.getElementById('report-type').value;
    document.getElementById('report-task-selector-container').style.display = reportType === 'task_detail' ? 'block' : 'none';
    document.getElementById('report-branch-options-container').style.display = reportType === 'branch_performance' ? 'flex' : 'none';
    document.getElementById('report-assessment-container').style.display = reportType === 'branch_performance' ? 'block' : 'none';
}

// Management List Edit/Save/Cancel
function toggleEditEntity(btn) {
    const li = btn.closest('.list-group-item');
    li.classList.add('editing');
}

function cancelEditEntity(btn) {
    const li = btn.closest('.list-group-item');
    li.classList.remove('editing');
    // Reset input value to original name if needed, but not strictly necessary for cancel
}

async function saveEntity(btn, type) {
    const li = btn.closest('.list-group-item');
    const id = li.dataset.id;
    const name = li.querySelector('.item-input').value.trim();
    if (!name) { alert('Name cannot be empty.'); return; }
    const status = li.querySelector('.badge').textContent;

    const result = await apiCall('manageEntity', { type, id, name, status });
    if (result) {
        alert(result.message);
        li.classList.remove('editing');
        initializeApplication();
    }
}

async function toggleEntityStatus(btn, type) {
    const li = btn.closest('.list-group-item');
    const id = li.dataset.id;
    const name = li.querySelector('.item-name').textContent;
    const currentStatus = li.querySelector('.badge').textContent;
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    if (!confirm(`Are you sure you want to set "${name}" to ${newStatus}?`)) return;

    const result = await apiCall('manageEntity', { type, id, name, status: newStatus });
    if (result) {
        alert(result.message);
        initializeApplication();
    }
}
