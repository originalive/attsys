// api/login.js
const fs = require('fs').promises;
const path = require('path');

// Vercel provides a temporary directory `/tmp` which is the only writable location.
const DATA_DIR = '/tmp';
const USERS_FILE_PATH = path.join(DATA_DIR, 'users.json');
const ATTENDANCE_FILE_PATH = path.join(DATA_DIR, 'attendance.json');

// --- Helper Functions to manage data in /tmp ---

// This function reads the user data. If it doesn't exist in /tmp,
// it copies it from your project's `login.json` file.
async function getUsers() {
    try {
        // Check if the file already exists in the writable directory
        await fs.access(USERS_FILE_PATH);
    } catch {
        // If not, read the source file from your project...
        const sourcePath = path.resolve('./login.json');
        const sourceData = await fs.readFile(sourcePath, 'utf8');
        // ...and write it to the /tmp directory.
        await fs.writeFile(USERS_FILE_PATH, sourceData);
    }
    // Now, read and return the data from /tmp
    const data = await fs.readFile(USERS_FILE_PATH, 'utf8');
    return JSON.parse(data);
}

// This function manages the attendance data, creating an empty file if needed.
async function getAttendance() {
    try {
        await fs.access(ATTENDANCE_FILE_PATH);
    } catch {
        // If the attendance file doesn't exist, create it with an empty object.
        await fs.writeFile(ATTENDANCE_FILE_PATH, JSON.stringify({}));
    }
    const data = await fs.readFile(ATTENDANCE_FILE_PATH, 'utf8');
    return JSON.parse(data);
}

// This function saves the updated attendance data back to the /tmp file.
async function saveAttendance(data) {
    await fs.writeFile(ATTENDANCE_FILE_PATH, JSON.stringify(data, null, 2));
}


// --- Main API Handler ---

module.exports = async (req, res) => {
    // Set CORS headers to allow your frontend to call this API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle pre-flight CORS requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    try {
        // Route requests based on the URL path and HTTP method
        if (req.url.startsWith('/api/login') && req.method === 'POST') {
            // --- LOGIN LOGIC ---
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ success: false, message: 'Username and password are required.' });
            }

            const users = await getUsers();
            const user = users[username];

            if (user && user.password === password) {
                // Successful login
                return res.status(200).json({
                    success: true,
                    user: { username, role: user.role, name: user.name }
                });
            } else {
                // Failed login
                return res.status(401).json({ success: false, message: 'Invalid username or password.' });
            }
        } else if (req.url.startsWith('/api/attendance')) {
            // --- ATTENDANCE LOGIC ---
            if (req.method === 'GET') {
                // Get all attendance records
                const attendanceData = await getAttendance();
                return res.status(200).json({ success: true, data: attendanceData });
            } else if (req.method === 'POST') {
                // Update an attendance record
                const { key, status } = req.body;
                 if (!key || !status) {
                    return res.status(400).json({ success: false, message: 'Record key and status are required.' });
                }
                const attendanceData = await getAttendance();
                attendanceData[key] = status; // Add or update the record
                await saveAttendance(attendanceData);
                return res.status(200).json({ success: true, message: 'Attendance updated successfully.' });
            }
        }
        
        // If no route is matched, return a 404
        return res.status(404).json({ success: false, message: 'API endpoint not found.' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    }
};
