// The base URL for all our API calls. This will work locally and on Vercel.
const API_BASE_URL = '/api';

// --- Global State ---
let currentUser = null;
let attendanceData = {};
let allUsers = {}; // We'll store the list of users for the admin dashboard here

// --- API Communication Functions ---

async function apiLogin(username, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return response.json();
}

async function fetchAttendance() {
    const response = await fetch(`${API_BASE_URL}/attendance`);
    const result = await response.json();
    if (result.success) {
        attendanceData = result.data || {};
    } else {
        showError('Failed to load attendance data.');
    }
}

async function updateAttendance(key, status) {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, status }),
    });
    return response.json();
}

// --- Main Application Logic ---

async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showError("Please enter both username and password.");
        return;
    }

    const result = await apiLogin(username, password);

    if (result.success) {
        currentUser = result.user;
        await fetchAttendance();
        
        document.getElementById('loginPage').classList.add('hidden');
        if (currentUser.role === 'admin') {
            // For simplicity, we hardcode the user list for the admin view.
            // In a real app, this might come from another API endpoint.
            allUsers = {
                "john": { "role": "user", "name": "John Doe" },
                "jane": { "role": "user", "name": "Jane Smith" },
                "bob": { "role": "user", "name": "Bob Johnson" },
                "alice": { "role": "user", "name": "Alice Williams" }
            };
            showAdminDashboard();
        } else {
            showUserDashboard();
        }
    } else {
        showError(result.message || "Login failed.");
    }
}

// --- UI Rendering and Event Handlers ---

function showUserDashboard() {
    document.getElementById('userDashboard').classList.remove('hidden');
    document.getElementById('welcomeMsg').textContent = `Welcome, ${currentUser.name}!`;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString();
    renderUserStatus();
}

function renderUserStatus() {
    const today = new Date().toISOString().split('T')[0];
    const key = `${currentUser.username}_${today}`;
    const status = attendanceData[key];
    
    const statusSpan = document.getElementById('attendanceStatus');
    const markButton = document.getElementById('markAttendanceBtn');

    if (status === 'present') {
        statusSpan.innerHTML = '<span class="present">✓ Present</span>';
        markButton.textContent = 'Attendance Marked';
        markButton.disabled = true;
    } else if (status === 'absent') {
        statusSpan.innerHTML = '<span class="absent">✗ Absent</span>';
        markButton.textContent = 'Marked Absent';
        markButton.disabled = true;
    } else {
        statusSpan.innerHTML = '<span class="not-marked">⚠ Not Marked</span>';
        markButton.textContent = '✓ Mark My Attendance';
        markButton.disabled = false;
    }
}

async function markAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const key = `${currentUser.username}_${today}`;
    
    const result = await updateAttendance(key, 'present');
    if (result.success) {
        attendanceData[key] = 'present';
        renderUserStatus();
        showUserMessage('✓ Attendance marked successfully!', 'success');
    } else {
        showUserMessage('Failed to mark attendance.', 'error');
    }
}

function showAdminDashboard() {
    document.getElementById('adminDashboard').classList.remove('hidden');
    populateEmployeeFilter();
    renderAdminTable();
}

function populateEmployeeFilter() {
    const select = document.getElementById('filterEmployee');
    select.innerHTML = '<option value="">All Employees</option>';
    for (const username in allUsers) {
        const option = document.createElement('option');
        option.value = username;
        option.textContent = allUsers[username].name;
        select.appendChild(option);
    }
}

function renderAdminTable() {
    const filterEmployee = document.getElementById('filterEmployee').value;
    const filterDate = document.getElementById('filterDate').value;
    
    let rowsHtml = '';
    const records = [];

    for (const username in allUsers) {
        if (filterEmployee && filterEmployee !== username) continue;

        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            if (filterDate && filterDate !== dateStr) continue;

            const key = `${username}_${dateStr}`;
            records.push({
                key,
                name: allUsers[username].name,
                date: dateStr,
                status: attendanceData[key] || 'absent',
            });
        }
    }
    
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    records.forEach(record => {
        const statusClass = record.status === 'present' ? 'present' : 'absent';
        const statusText = record.status === 'present' ? '✓ Present' : '✗ Absent';
        rowsHtml += `
            <tr>
                <td>${record.name}</td>
                <td>${record.date}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>
                    <button class="status-btn" onclick="changeStatus('${record.key}', 'present')">Mark Present</button>
                    <button class="status-btn logout-btn" onclick="changeStatus('${record.key}', 'absent')">Mark Absent</button>
                </td>
            </tr>
        `;
    });
    
    const tableHtml = `
        <h3>Last 30 Days Records</h3>
        <table>
            <thead><tr><th>Employee</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>`;
    document.getElementById('attendanceTable').innerHTML = tableHtml;
}

async function changeStatus(key, status) {
    const result = await updateAttendance(key, status);
    if (result.success) {
        attendanceData[key] = status;
        renderAdminTable();
    } else {
        alert('Failed to update status.');
    }
}

// --- Restored Report and Export Functions ---

function displayMonthlyReport() {
    const monthInput = document.getElementById('exportMonth').value;
    if (!monthInput) {
        alert('Please select a month to view the report');
        return;
    }
    const [year, month] = monthInput.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    let html = `<div class="table-container"><h2>Monthly Report for ${year}-${month}</h2><table><thead><tr><th>Employee</th>`;
    for (let day = 1; day <= daysInMonth; day++) {
        html += `<th>${day}</th>`;
    }
    html += '<th>Present</th><th>Absent</th></tr></thead><tbody>';
    for (let username in allUsers) {
        let presentCount = 0;
        html += `<tr><td>${allUsers[username].name}</td>`;
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const key = `${username}_${dateStr}`;
            if (attendanceData[key] === 'present') {
                html += '<td class="present">P</td>';
                presentCount++;
            } else {
                html += '<td class="absent">A</td>';
            }
        }
        const absentCount = daysInMonth - presentCount;
        html += `<td class="present">${presentCount}</td><td class="absent">${absentCount}</td></tr>`;
    }
    html += '</tbody></table></div>';
    document.getElementById('reportDisplayArea').innerHTML = html;
    document.getElementById('reportOverlay').classList.remove('hidden');
}

function closeReportView() {
    document.getElementById('reportOverlay').classList.add('hidden');
    document.getElementById('reportDisplayArea').innerHTML = '';
}

function exportMonthlyCSV() {
    const monthInput = document.getElementById('exportMonth').value;
    if (!monthInput) {
        alert('Please select a month to export');
        return;
    }
    const [year, month] = monthInput.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    let csv = 'Employee,';
    for (let day = 1; day <= daysInMonth; day++) {
        csv += `${day},`;
    }
    csv += 'Total Present,Total Absent\n';
    for (let username in allUsers) {
        let row = allUsers[username].name + ',';
        let presentCount = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const key = `${username}_${dateStr}`;
            if (attendanceData[key] === 'present') {
                row += 'P,';
                presentCount++;
            } else {
                row += 'A,';
            }
        }
        const absentCount = daysInMonth - presentCount;
        row += `${presentCount},${absentCount}\n`;
        csv += row;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${year}-${month}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function logout() {
    currentUser = null;
    attendanceData = {};
    allUsers = {};
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('userDashboard').classList.add('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// --- Utility Functions ---

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 3000);
}

function showUserMessage(message, type) {
    const msgDiv = document.getElementById('userMessage');
    msgDiv.className = type === 'success' ? 'success-msg' : 'error-msg';
    msgDiv.textContent = message;
    msgDiv.classList.remove('hidden');
    setTimeout(() => msgDiv.classList.add('hidden'), 3000);
}

// --- Make functions globally accessible from the HTML ---
window.login = login;
window.logout = logout;
window.markAttendance = markAttendance;
window.filterAttendance = renderAdminTable;
window.changeStatus = changeStatus;
window.displayMonthlyReport = displayMonthlyReport;
window.exportMonthlyCSV = exportMonthlyCSV;
window.closeReportView = closeReportView;
