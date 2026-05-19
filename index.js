const express = require('express');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;

// Read user data from Render's cloud environment variable configuration dashboard
const getUsers = () => {
    try {
        const envUsers = process.env.USER_DATA;
        return envUsers ? JSON.parse(envUsers) : [];
    } catch (err) {
        console.error("Failed to parse USER_DATA environment variable:", err);
        return [];
    }
};

app.get('/get.php', (req, res) => {
    const { username, password } = req.query;

    if (!username || !password) {
        return res.status(400).send('Error: Missing credentials.');
    }

    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    // 1. Verify credentials
    if (!user) {
        return res.status(403).send('Error: Invalid username or password.');
    }

    // 2. Check current time against expiration date limits
    const now = new Date();
    const expiry = new Date(user.expiryDate);

    if (now > expiry) {
        return res.status(403).send('Error: This subscription has expired.');
    }

    // 3. Pipe and relay the remote M3U data seamlessly to the user
    const client = user.m3uUrl.startsWith('https') ? https : http;

    client.get(user.m3uUrl, (streamResponse) => {
        if (streamResponse.statusCode !== 200) {
            return res.status(500).send('Error: Failed to fetch the master stream playlist.');
        }

        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Content-Disposition', `attachment; filename="${username}_playlist.m3u"`);
        
        streamResponse.pipe(res);
    }).on('error', (err) => {
        console.error("Streaming connection error:", err);
        res.status(500).send('Error: Transmission failure.');
    });
});

app.listen(PORT, () => {
    console.log(`M3U Server running smoothly on port ${PORT}`);
});