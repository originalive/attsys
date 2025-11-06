// api/login.js
const fs = require('fs').promises;
const path = require('path');

// This function reads the user data from your project's `login.json` file.
// Since user data doesn't change, we don't need to copy it to /tmp.
async function getUsers() {
    const sourcePath = path.resolve('./login.json');
    const sourceData = await fs.readFile(sourcePath, 'utf8');
    return JSON.parse(sourceData);
}

// --- Main API Handler for Login ---
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle pre-flight CORS requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    // This endpoint only accepts POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
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

    } catch (error) {
        console.error('Login API Error:', error);
        return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    }
};
