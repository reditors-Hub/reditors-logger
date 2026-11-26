// ==============================================================================
// REDitors — Comprehensive Discord Bot Real-Time Logger & User Intelligence
// ==============================================================================

'use strict';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

const CHANNELS = {
    autoCaptions:     '1575041662328115313',
    silenceRemover:   '1575041667289981010',
    speechCut:        '1575041671790329957',
    titleAnimator:    '1575041675737432064',
    viralCaptions:    '1575041679742869614',
    pluginSessions:   '1575041683723255868',
    authLogins:       '1575041687917428789',
    billingCredits:   '1575041692799860776',
    databaseAudit:    '1575041697455280250',
    websiteVercel:    '1575041701440000071',
    serverErrors:     '1575041705139503106',
    railwayLiveLogs:  '1575041709417566374'
};

const COLORS = {
    success: 0x10b981,
    danger:  0xef4444,
    warning: 0xf59e0b,
    info:    0x3b82f6,
    purple:  0x8b5cf6,
    pink:    0xec4899,
    cyan:    0x06b6d4,
    dark:    0x1e293b
};

let _supabaseAdmin = null;

function setSupabaseAdmin(client) {
    if (client) _supabaseAdmin = client;
}

// Rate-Limited Message Dispatcher
const _sendQueue = [];
let _isProcessingQueue = false;
let _rateLimitResetTime = 0;

async function _processQueue() {
    if (_isProcessingQueue) return;
    _isProcessingQueue = true;
    while (_sendQueue.length > 0) {
        const now = Date.now();
        if (now < _rateLimitResetTime) {
            await new Promise(r => setTimeout(r, _rateLimitResetTime - now));
        }
        const item = _sendQueue.shift();
        if (!item) continue;
        try {
            const res = await fetch(`https://discord.com/api/v10/channels/${item.channelId}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload)
            });
            if (res.status === 429) {
                const data = await res.json().catch(() => ({}));
                const retryAfter = Math.ceil((data.retry_after || 1) * 1000);
                _rateLimitResetTime = Date.now() + retryAfter;
                _sendQueue.unshift(item);
                await new Promise(r => setTimeout(r, retryAfter));
                continue;
            }
            await new Promise(r => setTimeout(r, 180));
        } catch (_) {}
    }
    _isProcessingQueue = false;
}

function queueMessage(channelId, payload) {
    if (!channelId || !BOT_TOKEN) return;
    if (_sendQueue.length > 100) _sendQueue.shift();
    _sendQueue.push({ channelId, payload });
    _processQueue();
}

function sendEmbed(channelId, embed) {
    if (!embed.timestamp) embed.timestamp = new Date().toISOString();
    if (!embed.footer) embed.footer = { text: 'REDitors Cloud Telemetry • Render.com Logger' };
    queueMessage(channelId, { embeds: [embed] });
}

function sendRawMessage(channelId, content) {
    queueMessage(channelId, { content });
}

// IP Intelligence
const _ipCache = new Map();

async function resolveIpInfo(ip) {
    if (!ip || typeof ip !== 'string') return null;
    const cleanIp = ip.split(',')[0].trim().replace(/^::ffff:/, '');
    if (!cleanIp || cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.16.')) {
        return { query: cleanIp || '127.0.0.1', isp: 'Localhost', country: 'Localhost', countryCode: 'LAN', city: 'Development', as: 'Internal', flag: '🏠', formatted: `${cleanIp} , Localhost | LAN 🏠` };
    }
    if (_ipCache.has(cleanIp)) return _ipCache.get(cleanIp);
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city,isp,as,query`, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        if (data && data.status === 'success') {
            const cc = (data.countryCode || '').toLowerCase();
            const flag = cc ? `:flag_${cc}:` : '🌐';
            const formatted = `${data.query} , ${data.isp || 'Unknown ISP'} | ${cc}  ${flag}\n${data.city || ''} ${data.as || ''}, ${data.countryCode || ''}`.trim();
            const result = { query: data.query, isp: data.isp || 'Unknown ISP', country: data.country, countryCode: data.countryCode, region: data.regionName, city: data.city, as: data.as, flag, formatted };
            if (_ipCache.size > 100) { const fk = _ipCache.keys().next().value; if (fk) _ipCache.delete(fk); }
            _ipCache.set(cleanIp, result);
            return result;
        }
    } catch (_) {}
    const fallback = { query: cleanIp, isp: 'ISP Unresolved', country: 'Unknown', countryCode: 'XX', city: 'Unknown', as: '', flag: '🌐', formatted: `${cleanIp}` };
    _ipCache.set(cleanIp, fallback);
    return fallback;
}

function parseDeviceType(userAgent, osName) {
    if (osName) {
        if (/windows/i.test(osName)) return 'Desktop 💻 (Windows)';
        if (/mac/i.test(osName)) return 'Desktop 💻 (macOS)';
        if (/linux/i.test(osName)) return 'Desktop 💻 (Linux)';
    }
    if (!userAgent) return 'Desktop 💻';
    const ua = String(userAgent).toLowerCase();
    let type = 'Desktop 💻';
    if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) type = 'Mobile 📱';
    else if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) type = 'Tablet 📲';
    let os = '';
    if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
    else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
    else if (ua.includes('iphone')) os = 'iOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('linux')) os = 'Linux';
    let browser = '';
    if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome/')) browser = 'Chrome';
    else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'Safari';
    else if (ua.includes('firefox/')) browser = 'Firefox';
    else if (ua.includes('reditors-plugin')) browser = 'Premiere Pro Plugin 🎬';
    const details = [os, browser].filter(Boolean).join(' • ');
    return details ? `${type} (${details})` : type;
}

function formatDiscordTimestamp(dateInput) {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const unix = Math.floor(d.getTime() / 1000);
    return `<t:${unix}:f> (<t:${unix}:R>)`;
}

function formatDuration(sec) {
    if (!sec && sec !== 0) return '0s';
    const s = Number(sec);
    if (isNaN(s)) return String(sec);
    if (s < 60) return `${s.toFixed(0)}s`;
    const m = Math.floor(s / 60);
    const rem = (s % 60).toFixed(0);
    return `${m}m ${rem}s`;
}

function formatMs(ms) {
    if (!ms && ms !== 0) return 'N/A';
    const n = Number(ms);
    if (isNaN(n)) return String(ms);
    if (n < 1000) return `${n} ms`;
    return `${(n / 1000).toFixed(2)} s`;
}

async function fetchEnrichedUserProfile(userId, email) {
    if (!_supabaseAdmin) return null;
    try {
        let user = null;
        if (userId) { const { data } = await _supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle(); user = data; }
        if (!user && email) { const { data } = await _supabaseAdmin.from('users').select('*').eq('email', email).maybeSingle(); user = data; }
        let authUser = null;
        if (_supabaseAdmin.auth && _supabaseAdmin.auth.admin) {
            try {
                if (userId) { const { data: aData } = await _supabaseAdmin.auth.admin.getUserById(userId); authUser = aData?.user || null; }
                if (!authUser && email) { const { data: aList } = await _supabaseAdmin.auth.admin.listUsers(); authUser = (aList?.users || []).find(u => u.email === email) || null; }
            } catch (_) {}
        }
        return { user, authUser };
    } catch (_) { return null; }
}

async function buildUserAuditEmbed(title, data, extra = {}) {
    const email = data.email || extra.email || 'N/A';
    const userId = data.userId || extra.userId || (data.user && data.user.id) || null;
    const profile = await fetchEnrichedUserProfile(userId, email);
    const user = profile?.user || {};
    const authUser = profile?.authUser || {};
    const resolvedEmail = user.email || email;
    const accountCreationDate = authUser.created_at || user.created_at;
    const joinedDate = user.created_at || authUser.created_at || user.first_login_at;
    const primaryIp = data.ip || extra.ip || user.ip_address || '127.0.0.1';
    const primaryIpInfo = await resolveIpInfo(primaryIp);
    const rawAllIps = data.allIps || extra.allIps || user.ip_addresses || user.ip_address || primaryIp;
    const allIpsList = (Array.isArray(rawAllIps) ? rawAllIps : String(rawAllIps).split(',')).map(i => i.trim()).filter(Boolean);
    const uniqueIps = [...new Set(allIpsList)];
    let ipFormatted = primaryIpInfo ? primaryIpInfo.formatted : primaryIp;
    if (uniqueIps.length > 1) {
        const otherIps = uniqueIps.filter(ip => ip !== primaryIp);
        if (otherIps.length > 0) ipFormatted += '\n\n**Historical Linked IPs:**\n' + otherIps.map(ip => `• \`${ip}\``).join(', ');
    }
    const deviceType = parseDeviceType(data.userAgent || extra.userAgent, data.os || extra.osName || user.plugin_platform);
    const planSlug = (user.plan_slug || data.plan || 'free').toUpperCase();
    const isPaid = planSlug !== 'FREE';
    const planDisplay = isPaid ? `👑 **${planSlug}** • Active 🟢` : `🆓 **FREE** • Standard`;
    const fields = [
        { name: 'Email', value: resolvedEmail, inline: true },
        { name: 'Plan', value: planDisplay, inline: true },
        { name: 'Device Type', value: deviceType, inline: true },
        { name: 'Account Creation', value: formatDiscordTimestamp(accountCreationDate), inline: false },
        { name: 'Joined', value: formatDiscordTimestamp(joinedDate), inline: false },
        { name: 'IPs Info', value: ipFormatted || 'N/A', inline: false }
    ];
    const balanceSec = user.credits !== undefined ? user.credits : 0;
    const usedSec = user.total_credits_used || 0;
    fields.push({ name: '💳 Credits & Usage Stats', value: [
        `• Pool Balance: **${balanceSec}s** remaining (${formatDuration(balanceSec)})`,
        `• Total Used: **${usedSec}s** (${formatDuration(usedSec)})`,
        `• Transcriptions: **${user.total_transcriptions || 0}** jobs (${formatDuration(user.total_seconds_transcribed || 0)})`,
        `• Captions & SRTs: **${user.total_captions_created || 0}** captions • **${user.total_srt_exports || 0}** SRTs`,
        `• Total Spent: **$${user.total_credits_purchased_usd || 0}**`
    ].join('\n'), inline: false });
    fields.push({ name: '📊 Account & Engagement', value: [
        `• Logins: **${user.login_count || 1}** sessions`,
        `• Last Seen: ${formatDiscordTimestamp(user.last_seen_at || user.last_login_at)}`,
        `• Affiliate: **${user.is_affiliate ? '⭐ Active (Code: ' + (user.affiliate_code || 'N/A') + ')' : 'No'}** • **${user.referral_count || 0}** referrals`,
        `• Source: **${user.signup_source || 'web'}** • Status: **${user.account_status || 'Active ✅'}**`,
        `• Admin: **${user.is_admin ? '🛡️ Administrator' : 'Standard User'}**`
    ].join('\n'), inline: false });
    fields.push({ name: '🆔 Security & Hardware Fingerprint', value: [
        `• User ID: \`${userId || user.id || 'N/A'}\``,
        `• Device Fingerprint: \`${user.device_fingerprint || data.deviceId || extra.deviceId || 'N/A'}\``,
        `• Plugin Version: \`v${user.plugin_version || extra.version || '1.2.7'}\` (${user.plugin_platform || 'Premiere Pro'})`
    ].join('\n'), inline: false });
    return { title: title || '👤 User Activity Profile', color: isPaid ? 0xa855f7 : 0x22c55e, fields, timestamp: new Date().toISOString(), footer: { text: 'REDitors Real-Time User Telemetry • Render.com Logger' } };
}

function logToolJob(tool, data, req = null) {
    try {
        const t = (tool || data.tool || '').toLowerCase();
        let targetChannel = CHANNELS.autoCaptions, toolName = 'Auto-Captions', icon = '🎙️';
        if (t.includes('silence')) { targetChannel = CHANNELS.silenceRemover; toolName = 'Silence Remover'; icon = '✂️'; }
        else if (t.includes('speech_cut') || t.includes('speech-cut')) { targetChannel = CHANNELS.speechCut; toolName = 'Speech Cut'; icon = '⚡'; }
        else if (t.includes('title_animator') || t.includes('title-animator') || t.includes('motionai')) { targetChannel = CHANNELS.titleAnimator; toolName = 'Title Animator'; icon = '✨'; }
        else if (t.includes('viral')) { targetChannel = CHANNELS.viralCaptions; toolName = 'Viral Captions'; icon = '🔥'; }
        const isSuccess = data.status !== 'error' && !data.error && !data.error_message;
        const color = isSuccess ? COLORS.success : COLORS.danger;
        const statusText = isSuccess ? '✅ Completed Successfully' : '❌ Failed with Error';
        const h = (req && req.headers) ? req.headers : {};
        const ip = data.ip || (req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'N/A') : 'N/A');
        resolveIpInfo(ip).then(ipInfo => {
            const fields = [
                { name: '👤 User & Identity', value: `**Email/ID:** \`${data.email || data.user_id || 'Anonymous'}\`\n**Device:** \`${(data.device_id || h['x-device-id'] || 'N/A').substring(0, 16)}...\``, inline: true },
                { name: '⚙️ Environment', value: `**Plugin:** \`v${data.plugin_version || h['x-plugin-version'] || '1.2.7'}\`\n**Premiere:** \`v${data.premiere_version || h['x-premiere-version'] || 'N/A'}\`\n**OS:** \`${data.os_name || h['x-os-name'] || 'N/A'}\``, inline: true },
                { name: '📊 Processing Stats', value: `**Duration:** \`${formatDuration(data.audio_duration_sec)}\`\n**Segments:** \`${data.segment_count || 'N/A'}\`\n**Words:** \`${data.word_count || 'N/A'}\``, inline: true },
                { name: '⚡ Performance & Billing', value: `**Latency:** \`${formatMs(data.response_ms)}\`\n**Credits Used:** \`${data.credits_used !== undefined ? data.credits_used + 's' : '0s'}\`\n**Language:** \`${data.language || 'auto'}\``, inline: true },
                { name: '🌐 IPs Info', value: ipInfo ? ipInfo.formatted : `\`${ip}\``, inline: false }
            ];
            if (data.caption_style) fields.push({ name: '🎨 Style / Preset', value: `\`${data.caption_style}\``, inline: true });
            if (!isSuccess && (data.error_message || data.error)) fields.push({ name: '⚠️ Error Details', value: `\`\`\`\n${(data.error_message || data.error || 'Unknown error').substring(0, 1000)}\n\`\`\``, inline: false });
            sendEmbed(targetChannel, { title: `${icon} ${toolName} Job: ${statusText}`, color, fields, timestamp: new Date().toISOString() });
        }).catch(() => {});
    } catch (_) {}
}

function logPluginSession(sessionData) {
    try {
        const isEnd = sessionData.eventType === 'session_end';
        buildUserAuditEmbed(isEnd ? '🚪 Plugin Session Closed' : '📱 Plugin Session Started', sessionData, sessionData).then(embed => {
            if (isEnd) embed.color = COLORS.dark;
            if (sessionData.durationSec) embed.fields.push({ name: '⏱️ Session Duration', value: `\`${formatDuration(sessionData.durationSec)}\``, inline: true });
            sendEmbed(CHANNELS.pluginSessions, embed);
        }).catch(() => {});
    } catch (_) {}
}

function logAuthLogin(eventType, data) {
    try {
        let title = '🔑 User Login Successful';
        if (eventType === 'signup') title = '🎉 New User Registration';
        else if (eventType === 'new_ip_detected' || eventType === 'ip_change') title = '⚠️ New IP Detected for User';
        else if (eventType === 'failed_login' || eventType === 'unauthorized') title = '🚫 Failed Login Attempt';
        else if (eventType === 'password_reset') title = '🔒 Password Reset Requested';
        buildUserAuditEmbed(title, data, data).then(embed => {
            if (eventType === 'signup') embed.color = COLORS.success;
            else if (eventType === 'new_ip_detected') embed.color = COLORS.warning;
            else if (eventType.includes('failed') || eventType.includes('unauthorized')) embed.color = COLORS.danger;
            sendEmbed(CHANNELS.authLogins, embed);
        }).catch(() => {});
    } catch (_) {}
}

function logBilling(provider, eventType, data) {
    try {
        const prov = (provider || 'Billing').toUpperCase();
        let color = COLORS.warning;
        let title = `💳 [${prov}] ${eventType}`;
        if (eventType.includes('paid') || eventType.includes('active') || eventType.includes('completed')) color = COLORS.success;
        else if (eventType.includes('failed') || eventType.includes('canceled') || eventType.includes('deleted')) color = COLORS.danger;
        const fields = [
            { name: '👤 Customer', value: `**Email:** \`${data.email || 'N/A'}\`\n**User ID:** \`${data.userId || 'N/A'}\``, inline: true },
            { name: '📦 Product & Tier', value: `**Plan:** \`${(data.plan || 'N/A').toUpperCase()}\`\n**Interval:** \`${data.interval || 'monthly'}\``, inline: true },
            { name: '💰 Transaction', value: `**Amount:** \`$${data.amount || '0'}\`\n**Provider:** \`${prov}\``, inline: true }
        ];
        if (data.subscriptionId || data.orderId || data.checkoutId) fields.push({ name: '🆔 References', value: `**Sub ID:** \`${data.subscriptionId || 'N/A'}\`\n**Order ID:** \`${data.orderId || data.checkoutId || 'N/A'}\``, inline: false });
        if (data.reason) fields.push({ name: '⚠️ Reason / Note', value: `\`${data.reason}\``, inline: false });
        sendEmbed(CHANNELS.billingCredits, { title, color, fields, timestamp: new Date().toISOString() });
    } catch (_) {}
}

function logDatabaseAudit(action, table, record, oldRecord = null) {
    try {
        if (table === 'tool_events' && action === 'INSERT') return;
        let color = COLORS.purple;
        if (action === 'DELETE') color = COLORS.danger;
        if (action === 'INSERT') color = COLORS.success;
        if (action === 'UPDATE') color = COLORS.warning;
        const id = (record && (record.id || record.user_id)) || (oldRecord && (oldRecord.id || oldRecord.user_id)) || 'N/A';
        const fields = [{ name: '📌 Table & Entity', value: `**Table:** \`${table}\`\n**Action:** \`${action}\`\n**Record ID:** \`${id}\``, inline: true }];
        if (action === 'UPDATE' && oldRecord && record) {
            const changedKeys = [];
            for (const key of Object.keys(record)) {
                if (key === 'updated_at' || key === 'last_seen') continue;
                if (JSON.stringify(record[key]) !== JSON.stringify(oldRecord[key])) changedKeys.push(`• **${key}:** \`${String(oldRecord[key]).substring(0, 50)}\` ➔ \`${String(record[key]).substring(0, 50)}\``);
            }
            if (changedKeys.length > 0) fields.push({ name: '🔄 Changed Fields', value: changedKeys.slice(0, 10).join('\n'), inline: false });
        } else if (record) {
            const summary = Object.entries(record).slice(0, 8).map(([k, v]) => `• **${k}:** \`${String(v).substring(0, 60)}\``).join('\n');
            fields.push({ name: '📄 Record Data', value: summary || '*Empty*', inline: false });
        }
        sendEmbed(CHANNELS.databaseAudit, { title: `🗄️ Supabase Audit: ${action} on [${table}]`, color, fields, timestamp: new Date().toISOString() });
    } catch (_) {}
}

function logWebsiteVercel(data) {
    try {
        buildUserAuditEmbed(`🌐 Website Activity: ${data.event || data.path || 'Page Event'}`, data, data).then(embed => {
            embed.color = COLORS.cyan;
            if (data.path || data.url) embed.fields.unshift({ name: '📄 Web Page / URL', value: `\`${data.path || data.url || '/'}\` (${data.method || 'GET'})`, inline: false });
            if (data.referrer) embed.fields.push({ name: '🔗 Referrer', value: `\`${data.referrer}\``, inline: false });
            sendEmbed(CHANNELS.websiteVercel, embed);
        }).catch(() => {});
    } catch (_) {}
}

function logServerError(title, err, req = null) {
    try {
        const fields = [{ name: '⚠️ Error Message', value: `\`\`\`\n${(err && (err.message || String(err)) || 'Unknown Error').substring(0, 900)}\n\`\`\``, inline: false }];
        if (req) {
            const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'N/A';
            fields.push({ name: '📍 Context', value: `**Route:** \`${req.method} ${req.originalUrl || req.url}\`\n**User:** \`${(req.user && (req.user.email || req.user.id)) || 'Guest'}\`\n**IP:** \`${ip}\``, inline: false });
        }
        if (err && err.stack) fields.push({ name: '📋 Stack Trace', value: `\`\`\`\n${err.stack.substring(0, 900)}\n\`\`\``, inline: false });
        sendEmbed(CHANNELS.serverErrors, { title: `🚨 Server Exception: ${title}`, color: COLORS.danger, fields, timestamp: new Date().toISOString() });
    } catch (_) {}
}

function initDatabaseListener(supabaseAdmin) {
    if (supabaseAdmin) setSupabaseAdmin(supabaseAdmin);
    if (!supabaseAdmin || typeof supabaseAdmin.channel !== 'function') {
        console.warn('[discord-logger] supabaseAdmin client does not support Realtime channels.');
        return;
    }
    try {
        const realtimeChannel = supabaseAdmin.channel('discord-db-audit')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                const { eventType, table, new: newRec, old: oldRec } = payload;
                logDatabaseAudit(eventType, table, newRec, oldRec);
            })
            .subscribe((status, err) => {
                if (err) console.warn('[discord-logger] Realtime subscription status error:', err.message);
                else if (status === 'SUBSCRIBED') {
                    console.log('[discord-logger] ✅ Supabase Realtime active.');
                    sendEmbed(CHANNELS.databaseAudit, { title: '🗄️ Supabase Realtime Database Audit Connected', description: 'All INSERT, UPDATE, DELETE queries on public schema are monitored.', color: COLORS.purple, timestamp: new Date().toISOString() });
                }
            });
        return realtimeChannel;
    } catch (err) {
        console.warn('[discord-logger] Failed to initialize database listener:', err.message);
    }
}

module.exports = { CHANNELS, COLORS, setSupabaseAdmin, resolveIpInfo, parseDeviceType, formatDiscordTimestamp, buildUserAuditEmbed, sendEmbed, sendRawMessage, logToolJob, logPluginSession, logAuthLogin, logBilling, logDatabaseAudit, logWebsiteVercel, logServerError, initDatabaseListener };
