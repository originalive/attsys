// api/attendance.js
const fs = require('fs').promises;
const path = require('path');

// Vercel provides a temporary directory `/tmp` which is the only writable location.
const DATA_DIR = '/tmp';
const ATTENDANCE_FILE_PATH = path.join(DATA_DIR, 'attendance.json');

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

// --- Main API Handler for Attendance ---
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle pre-flight CORS requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    try {
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

        } else {
             return res.status(405).json({ success: false, message: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error('Attendance API Error:', error);
        return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    }
};
