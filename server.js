'use strict';
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const discord = require('./discord-logger');
const telegram = require('./telegram-logger');

const app = express();
const PORT = process.env.PORT || 3000;
const LOGGER_SECRET = process.env.LOGGER_SECRET || 'reditors_logger_secure_2026';

app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => res.json({ ok: true, status: 'operational', service: 'reditors-logger' }));
app.get('/health', (req, res) => res.json({ ok: true, status: 'operational', service: 'reditors-logger' }));

function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-logger-secret'] || req.query.secret);
    if (token !== LOGGER_SECRET) {
        return res.status(401).json({ ok: false, error: 'Unauthorized logger client' });
    }
    next();
}

app.post('/api/log/discord', requireAuth, (req, res) => {
    try {
        const { action, payload, args = [] } = req.body || {};
        if (!action) return res.status(400).json({ ok: false, error: 'Missing action' });
        if (typeof discord[action] === 'function') {
            if (Array.isArray(args) && args.length > 0) {
                discord[action](...args);
            } else if (payload !== undefined) {
                discord[action](payload);
            } else {
                discord[action]();
            }
            return res.json({ ok: true, forwarded: action });
        }
        res.status(400).json({ ok: false, error: `Unknown discord logger method: ${action}` });
    } catch (err) {
        console.error('[discord-logger-api] Error:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/log/telegram', requireAuth, (req, res) => {
    try {
        const { action, payload, args = [] } = req.body || {};
        if (!action) return res.status(400).json({ ok: false, error: 'Missing action' });
        if (typeof telegram[action] === 'function') {
            if (Array.isArray(args) && args.length > 0) {
                telegram[action](...args);
            } else if (payload !== undefined) {
                telegram[action](payload);
            } else {
                telegram[action]();
            }
            return res.json({ ok: true, forwarded: action });
        }
        res.status(400).json({ ok: false, error: `Unknown telegram logger method: ${action}` });
    } catch (err) {
        console.error('[telegram-logger-api] Error:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/telemetry/web', (req, res) => {
    try {
        const data = req.body || {};
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        if (typeof discord.logWebsiteVercel === 'function') {
            discord.logWebsiteVercel({ ...data, ip: data.ip || clientIp, userAgent: data.userAgent || userAgent });
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

const server = app.listen(PORT, () => {
    console.log(`[reditors-logger] Service running on port ${PORT}`);
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            const supabaseAdmin = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY,
                { auth: { autoRefreshToken: false, persistSession: false } }
            );
            if (typeof discord.initDatabaseListener === 'function') {
                discord.initDatabaseListener(supabaseAdmin);
                console.log('[reditors-logger] Supabase Realtime Database listener initialized');
            }
        } catch (e) {
            console.warn('[reditors-logger] Supabase Realtime init failed:', e.message);
        }
    }
});
