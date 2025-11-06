// api/index.js - Vercel Serverless Function
const fs = require('fs').promises;
const path = require('path');

// Path to data files
const DATA_DIR = '/tmp';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');

// Default users data
const defaultUsers = {
    "admin": { password: "admin123", role: "admin", name: "Admin User" },
    "john": { password: "john123", role: "user", name: "John Doe" },
    "jane": { password: "jane123", role: "user", name: "Jane Smith" },
    "bob": { password: "bob123", role: "user", name: "Bob Johnson" },
    "alice": { password: "alice123", role: "user", name: "Alice Williams" }
};

// Initialize data files
async function initializeData() {
    try {
        await fs.access(USERS_FILE);
    } catch {
        await fs.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    }
    
    try {
        await fs.access(ATTENDANCE_FILE);
    } catch {
        await fs.writeFile(ATTENDANCE_FILE, JSON.stringify({}, null, 2));
    }
}

// Read users
async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return defaultUsers;
    }
}

// Read attendance
async function readAttendance() {
    try {
        const data = await fs.readFile(ATTENDANCE_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// Write attendance
async function writeAttendance(data) {
    await fs.writeFile(ATTENDANCE_FILE, JSON.stringify(data, null, 2));
}

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Main handler
module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(200).json({ message: 'OK' });
        return;
    }

    // Set CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    await initializeData();

    const { method, url } = req;
    const urlPath = url.split('?')[0];

    try {
        // Login endpoint
        if (method === 'POST' && urlPath === '/api/login') {
            const { username, password } = req.body;
            const users = await readUsers();
            
            if (users[username] && users[username].password === password) {
                return res.status(200).json({
                    success: true,
                    user: {
                        username,
                        role: users[username].role,
                        name: users[username].name
                    }
                });
            }
            
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        // Get all attendance records
        if (method === 'GET' && urlPath === '/api/attendance') {
            const attendance = await readAttendance();
            return res.status(200).json({ success: true, data: attendance });
        }

        // Mark attendance (user or admin)
        if (method === 'POST' && urlPath === '/api/attendance') {
            const { key, status } = req.body;
            
            if (!key || !status) {
                return res.status(400).json({
                    success: false,
                    message: "Missing key or status"
                });
            }
            
            const attendance = await readAttendance();
            attendance[key] = status;
            await writeAttendance(attendance);
            
            return res.status(200).json({
                success: true,
                message: "Attendance updated successfully"
            });
        }

        // Update attendance status (admin only)
        if (method === 'PUT' && urlPath === '/api/attendance') {
            const { key, status } = req.body;
            
            if (!key || !status) {
                return res.status(400).json({
                    success: false,
                    message: "Missing key or status"
                });
            }
            
            const attendance = await readAttendance();
            attendance[key] = status;
            await writeAttendance(attendance);
            
            return res.status(200).json({
                success: true,
                message: "Attendance status changed successfully"
            });
        }

        // Get all users (for admin)
        if (method === 'GET' && urlPath === '/api/users') {
            const users = await readUsers();
            // Remove passwords from response
            const sanitizedUsers = {};
            for (let username in users) {
                sanitizedUsers[username] = {
                    role: users[username].role,
                    name: users[username].name
                };
            }
            return res.status(200).json({ success: true, users: sanitizedUsers });
        }

        // Default 404
        return res.status(404).json({
            success: false,
            message: "Endpoint not found"
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
