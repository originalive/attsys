// API Base URL - Update this with your Vercel deployment URL
const API_BASE_URL = 'https://your-app.vercel.app/api';

// Master JSON with users (for reference only, authentication happens on server)
const users = {
    "admin": { role: "admin", name: "Admin User" },
    "john": { role: "user", name: "John Doe" },
    "jane": { role: "user", name: "Jane Smith" },
    "bob": { role: "user", name: "Bob Johnson" },
    "alice": { role: "user", name: "Alice Williams" }
};

let currentUser = null;
let attendanceData = {};

// Initialize attendance data from server
async function initAttendanceData() {
    try {
        const response = await fetch(`${API_BASE_URL}/attendance`);
        const result = await response.json();
        if (result.success) {
            attendanceData = result.data;
        }
    } catch (error) {
        console.error('Error loading attendance data:', error);
        showError('Failed to load attendance data');
    }
}

// Save attendance data to server
async function saveAttendanceData(key, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key, status })
        });
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message);
        }
        return true;
    } catch (error) {
        console.error('Error saving attendance:', error);
        showError('Failed to save attendance');
        return false;
    }
}

// API to authenticate user
async function authenticateUser(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Authentication error:', error);
        return { success: false, message: "Connection error. Please try again." };
    }
}

// Login function
async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showError("Please enter both username and password");
        return;
    }

    const response = await authenticateUser(username, password);
    
    if (response.success) {
        currentUser = response.user;
        await initAttendanceData(); // Load attendance data after login
        
        document.getElementById('loginPage').classList.add('hidden');
        
        if (currentUser.role === 'admin') {
            showAdminDashboard();
        } else {
            showUserDashboard();
        }
    } else {
        showError(response.message);
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 3000);
}

// Show user dashboard
function showUserDashboard() {
    document.getElementById('userDashboard').classList.remove('hidden');
    document.getElementById('welcomeMsg').textContent = `Welcome, ${currentUser.name}!`;
    
    const today = new Date().toLocaleDateString();
    document.getElementById('currentDate').textContent = today;
    
    updateAttendanceStatus();
}

// Update attendance status for user and handle button state
function updateAttendanceStatus() {
    const today = new Date().toISOString().split('T')[0];
    const key = `${currentUser.username}_${today}`;
    const status = attendanceData[key];
    
    const statusSpan = document.getElementById('attendanceStatus');
    const markButton = document.getElementById('markAttendanceBtn');

    if (status === 'present') {
        statusSpan.innerHTML = '<span class="present">✓ Present</span>';
        markButton.textContent = '✓ Attendance Marked';
        markButton.disabled = true;
    } else if (status === 'absent') {
        statusSpan.innerHTML = '<span class="absent">✗ Absent</span>';
        markButton.disabled = true;
        markButton.textContent = 'Marked Absent by Admin';
    } else {
        statusSpan.innerHTML = '<span class="not-marked">⚠ Not Marked</span>';
        markButton.textContent = '✓ Mark My Attendance';
        markButton.disabled = false;
    }
}

// Mark attendance
async function markAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const key = `${currentUser.username}_${today}`;
    
    if(attendanceData[key] === 'present') {
        return;
    }
    
    const success = await saveAttendanceData(key, 'present');
    
    if (success) {
        attendanceData[key] = 'present';
        
        const msgDiv = document.getElementById('userMessage');
        msgDiv.className = 'success-msg';
        msgDiv.textContent = '✓ Attendance marked successfully!';
        msgDiv.classList.remove('hidden');
        
        updateAttendanceStatus();
        
        setTimeout(() => msgDiv.classList.add('hidden'), 3000);
    }
}

// Show admin dashboard
function showAdminDashboard() {
    document.getElementById('adminDashboard').classList.remove('hidden');
    populateEmployeeFilter();
    displayAttendanceTable();
}

// Populate employee filter
function populateEmployeeFilter() {
    const select = document.getElementById('filterEmployee');
    select.innerHTML = '<option value="">All Employees</option>';
    
    for (let username in users) {
        if (users[username].role === 'user') {
            const option = document.createElement('option');
            option.value = username;
            option.textContent = users[username].name;
            select.appendChild(option);
        }
    }
}

// Display attendance table
function displayAttendanceTable() {
    const filterEmployee = document.getElementById('filterEmployee').value;
    const filterDate = document.getElementById('filterDate').value;
    
    let html = '<h3>Last 30 Days Records</h3><table><thead><tr><th>Employee</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    
    const records = [];
    for (let username in users) {
        if (users[username].role === 'user') {
            if (filterEmployee && filterEmployee !== username) continue;
            
            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                if (filterDate && filterDate !== dateStr) continue;
                
                const key = `${username}_${dateStr}`;
                const status = attendanceData[key] || 'absent';
                
                records.push({
                    username: username,
                    name: users[username].name,
                    date: dateStr,
                    status: status,
                    key: key
                });
            }
        }
    }
    
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    records.forEach(record => {
        const statusClass = record.status === 'present' ? 'present' : 'absent';
        const statusText = record.status === 'present' ? '✓ Present' : '✗ Absent';
        
        html += `
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
    
    html += '</tbody></table>';
    document.getElementById('attendanceTable').innerHTML = html;
}

// Filter attendance
function filterAttendance() {
    displayAttendanceTable();
}

// Change attendance status (Admin power)
async function changeStatus(key, status) {
    const success = await saveAttendanceData(key, status);
    if (success) {
        attendanceData[key] = status;
        displayAttendanceTable();
    }
}

// Display Monthly Report in the overlay
function displayMonthlyReport() {
    const monthInput = document.getElementById('exportMonth').value;
    
    if (!monthInput) {
        alert('Please select a month to view the report');
        return;
    }
    
    const [year, month] = monthInput.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let html = `<div class="table-container"><h2>Monthly Report for ${year}-${month}</h2>`;
    html += '<table><thead><tr><th>Employee</th>';
    for (let day = 1; day <= daysInMonth; day++) {
        html += `<th>${day}</th>`;
    }
    html += '<th>Present</th><th>Absent</th></tr></thead><tbody>';
    
    for (let username in users) {
        if (users[username].role === 'user') {
            let presentCount = 0;
            html += `<tr><td>${users[username].name}</td>`;
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const key = `${username}_${dateStr}`;
                const status = attendanceData[key];
                
                if (status === 'present') {
                    html += '<td class="present">P</td>';
                    presentCount++;
                } else {
                    html += '<td class="absent">A</td>';
                }
            }
            const absentCount = daysInMonth - presentCount;
            html += `<td class="present">${presentCount}</td><td class="absent">${absentCount}</td></tr>`;
        }
    }
    
    html += '</tbody></table></div>';
    document.getElementById('reportDisplayArea').innerHTML = html;
    document.getElementById('reportOverlay').classList.remove('hidden');
}

// Function to close the report overlay
function closeReportView() {
    const overlay = document.getElementById('reportOverlay');
    overlay.classList.add('hidden');
    document.getElementById('reportDisplayArea').innerHTML = '';
}

// Export monthly CSV
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
    
    for (let username in users) {
        if (users[username].role === 'user') {
            let row = users[username].name + ',';
            let presentCount = 0;
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const key = `${username}_${dateStr}`;
                const status = attendanceData[key];
                
                if (status === 'present') {
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
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${year}-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Logout function
function logout() {
    currentUser = null;
    attendanceData = {};
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('userDashboard').classList.add('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('reportOverlay').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // No auto-load, wait for login
});