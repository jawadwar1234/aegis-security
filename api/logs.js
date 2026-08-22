// Serverless API for Vercel / Netlify
// In-memory & client-sync persistent session handler

let inMemoryLogs = [];

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        const total = inMemoryLogs.length;
        const humans = inMemoryLogs.filter(l => l.classification === 'HUMAN_VERIFIED').length;
        const bots = inMemoryLogs.filter(l => l.classification === 'BOT_DETECTED').length;
        const wrong = inMemoryLogs.filter(l => l.classification === 'WRONG_ANSWER' || l.isCorrectSelection === false).length;
        const avgLatency = total > 0 ? Math.round(inMemoryLogs.reduce((acc, l) => acc + (Number(l.latencyMs) || 0), 0) / total) : 0;

        return res.status(200).json({
            totalSessions: total,
            humansVerified: humans,
            botsBlocked: bots,
            wrongSelections: wrong,
            avgLatencyMs: avgLatency,
            logs: inMemoryLogs
        });
    }

    if (req.method === 'POST') {
        const entry = req.body || {};
        entry.id = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        if (!entry.timestamp) entry.timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

        inMemoryLogs.push(entry);
        if (inMemoryLogs.length > 2000) inMemoryLogs = inMemoryLogs.slice(-2000);

        return res.status(201).json({ success: true, entry });
    }

    if (req.method === 'DELETE') {
        inMemoryLogs = [];
        return res.status(200).json({ success: true, message: 'Logs reset' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}
