// The base URL for all our API calls. This will work locally and on Vercel.
const API_BASE_URL = '/api';

// --- Global State ---
// These variables will hold the application's state after login.
let currentUser = null;
let attendanceData = {};
let allUsers = {}; // We'll fetch this for the admin dashboard

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
            // For simplicity, we'll just hardcode the user list for the admin view
            // In a real app, you'd have an API endpoint like /api/users
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
        attendanceData[key] = 'present'; // Update local state
        renderUserStatus(); // Re-render the UI
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
    select.innerHTML = '<option value="">All Employees</option>'; // Reset
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

    // Create a list of all possible records for the last 30 days
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
    
    // Sort by date descending
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
        attendanceData[key] = status; // Update local state
        renderAdminTable(); // Re-render the table
    } else {
        alert('Failed to update status.');
    }
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

// --- Util
