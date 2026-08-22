import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// Persistent Database Path
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

// Initialize database if it doesn't exist
function initDatabase() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            totalSessions: 0,
            humansVerified: 0,
            botsBlocked: 0,
            wrongSelections: 0,
            avgLatencyMs: 0,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            logs: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    }
}

initDatabase();

function readDatabase() {
    try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        console.error('Error reading database:', err);
        return { totalSessions: 0, humansVerified: 0, botsBlocked: 0, wrongSelections: 0, avgLatencyMs: 0, logs: [] };
    }
}

function writeDatabase(data) {
    try {
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing database:', err);
        return false;
    }
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const [urlPath] = req.url.split('?');

    // ==========================================
    // DATABASE API ENDPOINTS
    // ==========================================
    if (urlPath === '/api/logs' || urlPath === '/api/stats') {
        if (req.method === 'GET') {
            const db = readDatabase();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(db));
            return;
        }

        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const entry = JSON.parse(body);
                    const db = readDatabase();

                    entry.id = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                    if (!entry.timestamp) entry.timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

                    db.logs.push(entry);
                    if (db.logs.length > 2000) db.logs = db.logs.slice(-2000); // keep up to 2000 entries

                    // Recalculate all-time statistics
                    db.totalSessions = db.logs.length;
                    db.humansVerified = db.logs.filter(l => l.classification === 'HUMAN_VERIFIED').length;
                    db.botsBlocked = db.logs.filter(l => l.classification === 'BOT_DETECTED').length;
                    db.wrongSelections = db.logs.filter(l => l.classification === 'WRONG_ANSWER' || l.isCorrectSelection === false).length;
                    
                    const totalLatency = db.logs.reduce((acc, l) => acc + (Number(l.latencyMs) || 0), 0);
                    db.avgLatencyMs = db.totalSessions > 0 ? Math.round(totalLatency / db.totalSessions) : 0;

                    writeDatabase(db);

                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, entry, stats: db }));
                } catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
                }
            });
            return;
        }

        if (req.method === 'DELETE') {
            const freshDb = {
                totalSessions: 0,
                humansVerified: 0,
                botsBlocked: 0,
                wrongSelections: 0,
                avgLatencyMs: 0,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                logs: []
            };
            writeDatabase(freshDb);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Database reset successfully' }));
            return;
        }
    }

    // ==========================================
    // STATIC FILE HANDLER
    // ==========================================
    let reqUrl = urlPath;
    if (reqUrl === '/') reqUrl = '/index.html';

    const filePath = path.join(__dirname, decodeURIComponent(reqUrl));

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType
        });

        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`AEGIS Security Server with Persistent Database running at http://localhost:${PORT}`);
});
