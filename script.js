// =================================================================
// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const SCRIPT_URL = "PASTE_YOUR_DEPLOYMENT_URL_HERE";
// =================================================================

// --- GLOBAL STATE & ELEMENTS ---
let APP_DATA = {
    branches: [],
    sections: [],
    tasks: [],
};
let reportChart = null;
const LOADER = document.getElementById('loading-overlay');

// --- API COMMUNICATION ---
async function apiCall(action, payload = {}) {
    LOADER.style.display = 'flex';
    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });
        const response = await res.json();
        if (!response.success) {
            throw new Error(response.message || 'An unknown error occurred.');
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
    addEventListeners();
});

async function initializeApplication() {
    const data = await apiCall('getInitialData');
    if (data) {
        APP_DATA = data;
        renderDashboard();
        renderReportFilters();
    }
}

function addEventListeners() {
    document.getElementById('create-task-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('task-type').addEventListener('change', toggleDeadline);
    document.getElementById('report-type').addEventListener('change', toggleReportOptions);
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);
}

// --- RENDERING FUNCTIONS ---
function renderDashboard() {
    // Populate forms
    const sectionSelect = document.getElementById('task-section');
    sectionSelect.innerHTML = '<option value="" disabled selected>Select...</option>';
    APP_DATA.sections.forEach(s => {
        if(s.status === 'Active') sectionSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    const branchCheckboxes = document.getElementById('branch-checkboxes');
    branchCheckboxes.innerHTML = '';
    APP_DATA.branches.forEach(b => {
        if(b.status === 'Active') branchCheckboxes.innerHTML += `<div class="form-check"><input class="form-check-input" type="checkbox" value="${b.id}" id="branch-${b.id}"><label class="form-check-label" for="branch-${b.id}">${b.name}</label></div>`;
    });

    // Display tasks
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    document.getElementById('task-loader').style.display = 'none';
    
    if (APP_DATA.tasks.length === 0) {
        taskList.innerHTML = '<div class="alert alert-info">No active tasks found.</div>';
        return;
    }

    const branchMap = Object.fromEntries(APP_DATA.branches.map(b => [b.id, b.name]));
    APP_DATA.tasks.forEach(task => {
        const assignmentsHtml = task.assignments.map(a => `
            <tr>
                <td>${branchMap[a.branchId] || a.branchId}</td>
                <td><span class="badge ${a.status === 'Completed' ? 'bg-success' : 'bg-warning'}">${a.status}</span></td>
                <td>${a.completionTimestamp}</td>
                <td>${a.timeTaken}</td>
                <td>${a.status === 'Pending' ? `<button class="btn btn-sm btn-primary" onclick="markComplete('${a.assignmentId}')">Complete</button>` : ''}</td>
            </tr>
        `).join('');

        taskList.innerHTML += `
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between"><strong>${task.title}</strong><span class="badge bg-secondary">${task.taskType}</span></div>
                <div class="card-body">
                    <p>${task.description || 'No description.'}</p>
                    <table class="table table-sm table-bordered">
                        <thead class="table-light"><tr><th>Branch</th><th>Status</th><th>Completed On</th><th>Time Taken</th><th>Action</th></tr></thead>
                        <tbody class="task-assignments-body">${assignmentsHtml}</tbody>
                    </table>
                </div>
                <div class="card-footer text-muted">Deadline: ${task.deadline}</div>
            </div>`;
    });
}

function renderReportFilters() {
    const taskSelector = document.getElementById('report-task-selector');
    taskSelector.innerHTML = '<option value="" disabled selected>Select a task...</option>';
    APP_DATA.tasks.forEach(t => {
        taskSelector.innerHTML += `<option value="${t.id}">${t.title}</option>`;
    });
    // Set default dates for branch performance
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('report-end-date').value = today;
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    document.getElementById('report-start-date').value = lastMonth.toISOString().split('T')[0];
}

function renderReport(reportData) {
    const outputDiv = document.getElementById('report-output');
    if (!reportData || !reportData.table) {
        outputDiv.innerHTML = '<div class="alert alert-warning">No data found for the selected criteria.</div>';
        return;
    }

    // Build table
    const headers = Object.keys(reportData.table[0]).filter(h => h !== 'Time Taken (s)');
    const tableHtml = `
        <div class="card">
            <div class="card-header"><h4>${reportData.title}</h4></div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h5>Data Table</h5>
                        <table class="table table-striped table-bordered">
                            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                            <tbody>
                                ${reportData.table.map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h5>Chart</h5>
                        <canvas id="report-chart-canvas"></canvas>
                    </div>
                </div>
            </div>
        </div>`;
    outputDiv.innerHTML = tableHtml;

    // Build chart
    if (reportChart) {
        reportChart.destroy();
    }
    const ctx = document.getElementById('report-chart-canvas').getContext('2d');
    reportChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: reportData.chartData.labels,
            datasets: [{
                label: 'Performance',
                data: reportData.chartData.data,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}


// --- EVENT HANDLERS & ACTIONS ---
async function handleFormSubmit(e) {
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

async function markComplete(assignmentId) {
    if(!confirm('Are you sure you want to mark this task as complete?')) return;
    const result = await apiCall('markTaskAsComplete', { assignmentId });
    if (result) {
        alert(result.message);
        initializeApplication(); // Refresh all data
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

// --- UI HELPERS ---
function toggleDeadline() {
    const type = document.getElementById('task-type').value;
    const container = document.getElementById('deadline-container');
    container.style.display = type === 'Time-Limited' ? 'block' : 'none';
    document.getElementById('task-deadline').required = type === 'Time-Limited';
}

function toggleReportOptions() {
    const reportType = document.getElementById('report-type').value;
    const taskContainer = document.getElementById('report-task-selector-container');
    const branchContainer = document.getElementById('report-branch-options-container');
    const assessmentContainer = document.getElementById('report-assessment-container');

    taskContainer.style.display = reportType === 'task_detail' ? 'block' : 'none';
    branchContainer.style.display = reportType === 'branch_performance' ? 'flex' : 'none';
    assessmentContainer.style.display = reportType === 'branch_performance' ? 'block' : 'none';
}