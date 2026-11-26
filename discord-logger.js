// ==============================================================================
// REDitors — Comprehensive Discord Bot Real-Time Logger & User Intelligence
// Guild: 1497004973874085978
// Category: ┌─[ Plugin log ]─┐ (1575039347072303186)
// Channels:
//   🎙️・auto-captions:     1575041662328115313
//   ✂️・silence-remover:   1575041667289981010
//   ⚡・speech-cut:        1575041671790329957
//   ✨・title-animator:    1575041675737432064
//   🔥・viral-captions:    1575041679742869614
//   📱・plugin-sessions:   1575041683723255868
//   🔑・auth-logins:       1575041687917428789
//   💳・billing-credits:   1575041692799860776
//   🗄️・database-audit:    1575041697455280250
//   🌐・website-vercel:    1575041701440000071
//   🚨・server-errors:     1575041705139503106
//   📋・railway-live-logs:  1575041709417566374
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
    success: 0x10b981, // Emerald Green
    danger:  0xef4444, // Red
    warning: 0xf59e0b, // Amber Gold
    info:    0x3b82f6, // Blue
    purple:  0x8b5cf6, // Violet
    pink:    0xec4899, // Pink
    cyan:    0x06b6d4, // Cyan
    dark:    0x1e293b  // Slate
};

let _supabaseAdmin = null;

function setSupabaseAdmin(client) {
    if (client) _supabaseAdmin = client;
}

// ------------------------------------------------------------------------------
// Rate-Limited Message Dispatcher
// ------------------------------------------------------------------------------
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
                headers: {
                    'Authorization': `Bot ${BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                },
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

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                console.error(`[discord] Failed to send message to channel ${item.channelId} (HTTP ${res.status}):`, JSON.stringify(data));
            }

            await new Promise(r => setTimeout(r, 180));
        } catch (postErr) {
            console.error('[discord] Network error posting message:', postErr.message);
        }
    }

    _isProcessingQueue = false;
}

function queueMessage(channelId, payload) {
    if (!channelId || !BOT_TOKEN) return;
    if (_sendQueue.length > 100) {
        _sendQueue.shift();
    }
    _sendQueue.push({ channelId, payload });
    _processQueue();
}

function sendEmbed(channelId, embed) {
    if (!embed.timestamp) {
        embed.timestamp = new Date().toISOString();
    }
    if (!embed.footer) {
        embed.footer = { text: 'REDitors Cloud Telemetry • Railway Production' };
    }
    queueMessage(channelId, { embeds: [embed] });
}

function sendRawMessage(channelId, content) {
    queueMessage(channelId, { content });
}

// ------------------------------------------------------------------------------
// IP Intelligence & Geolocation Resolver (with in-memory cache)
// ------------------------------------------------------------------------------
const _ipCache = new Map();

async function resolveIpInfo(ip) {
    if (!ip || typeof ip !== 'string') return null;
    const cleanIp = ip.split(',')[0].trim().replace(/^::ffff:/, '');

    if (
        !cleanIp ||
        cleanIp === '127.0.0.1' ||
        cleanIp === '::1' ||
        cleanIp.startsWith('192.168.') ||
        cleanIp.startsWith('10.') ||
        cleanIp.startsWith('172.16.')
    ) {
        return {
            query: cleanIp || '127.0.0.1',
            isp: 'Localhost / Internal LAN',
            country: 'Localhost',
            countryCode: 'LAN',
            city: 'Development',
            as: 'Internal Network',
            flag: '🏠',
            formatted: `${cleanIp || '127.0.0.1'} , Localhost | LAN  🏠\nInternal Development Network`
        };
    }

    if (_ipCache.has(cleanIp)) {
        return _ipCache.get(cleanIp);
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city,isp,as,query`, {
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await res.json();
        if (data && data.status === 'success') {
            const cc = (data.countryCode || '').toLowerCase();
            const flag = cc ? `:flag_${cc}:` : '🌐';
            const formatted = `${data.query} , ${data.isp || 'Unknown ISP'} | ${cc}  ${flag}\n${data.city || ''} ${data.as || ''}, ${data.countryCode || ''}`.trim();
            const result = {
                query: data.query,
                isp: data.isp || 'Unknown ISP',
                country: data.country,
                countryCode: data.countryCode,
                region: data.regionName,
                city: data.city,
                as: data.as,
                flag,
                formatted
            };
            if (_ipCache.size > 100) {
                const firstKey = _ipCache.keys().next().value;
                if (firstKey) _ipCache.delete(firstKey);
            }
            _ipCache.set(cleanIp, result);
            return result;
        }
    } catch (_) {}

    const fallback = {
        query: cleanIp,
        isp: 'ISP Unresolved',
        country: 'Unknown',
        countryCode: 'XX',
        city: 'Unknown',
        as: '',
        flag: '🌐',
        formatted: `${cleanIp}`
    };
    if (_ipCache.size > 100) {
        const firstKey = _ipCache.keys().next().value;
        if (firstKey) _ipCache.delete(firstKey);
    }
    _ipCache.set(cleanIp, fallback);
    return fallback;
}

// ------------------------------------------------------------------------------
// Device & Client Classifier
// ------------------------------------------------------------------------------
function parseDeviceType(userAgent, osName) {
    if (osName) {
        if (/windows/i.test(osName)) return 'Desktop 💻 (Windows)';
        if (/mac/i.test(osName)) return 'Desktop 💻 (macOS)';
        if (/linux/i.test(osName)) return 'Desktop 💻 (Linux)';
    }
    if (!userAgent) return 'Desktop 💻';
    const ua = String(userAgent).toLowerCase();
    let type = 'Desktop 💻';
    if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) {
        type = 'Mobile 📱';
    } else if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
        type = 'Tablet 📲';
    }

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

// ------------------------------------------------------------------------------
// Formatting Helpers
// ------------------------------------------------------------------------------
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

// ------------------------------------------------------------------------------
// Database User Profile Fetcher
// ------------------------------------------------------------------------------
async function fetchEnrichedUserProfile(userId, email) {
    if (!_supabaseAdmin) return null;
    try {
        let user = null;
        if (userId) {
            const { data } = await _supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle();
            user = data;
        }
        if (!user && email) {
            const { data } = await _supabaseAdmin.from('users').select('*').eq('email', email).maybeSingle();
            user = data;
        }

        let authUser = null;
        if (_supabaseAdmin.auth && _supabaseAdmin.auth.admin) {
            try {
                if (userId) {
                    const { data: aData } = await _supabaseAdmin.auth.admin.getUserById(userId);
                    authUser = aData?.user || null;
                }
                if (!authUser && email) {
                    const { data: aList } = await _supabaseAdmin.auth.admin.listUsers();
                    authUser = (aList?.users || []).find(u => u.email === email) || null;
                }
            } catch (_) {}
        }

        return { user, authUser };
    } catch (_) {
        return null;
    }
}

// ------------------------------------------------------------------------------
// Rich User Profile Builder (Matches exact user specification)
// ------------------------------------------------------------------------------
async function buildUserAuditEmbed(title, data, extra = {}) {
    const email = data.email || extra.email || 'N/A';
    const userId = data.userId || extra.userId || (data.user && data.user.id) || null;

    const profile = await fetchEnrichedUserProfile(userId, email);
    const user = profile?.user || {};
    const authUser = profile?.authUser || {};

    const resolvedEmail = user.email || email;
    const accountCreationDate = authUser.created_at || user.created_at;
    const joinedDate = user.created_at || authUser.created_at || user.first_login_at;

    // Resolve IP info
    const primaryIp = data.ip || extra.ip || user.ip_address || '127.0.0.1';
    const primaryIpInfo = await resolveIpInfo(primaryIp);

    // Resolve historical IPs
    const rawAllIps = data.allIps || extra.allIps || user.ip_addresses || user.ip_address || primaryIp;
    const allIpsList = (Array.isArray(rawAllIps) ? rawAllIps : String(rawAllIps).split(','))
        .map(i => i.trim())
        .filter(Boolean);
    const uniqueIps = [...new Set(allIpsList)];

    let ipFormatted = primaryIpInfo ? primaryIpInfo.formatted : primaryIp;
    if (uniqueIps.length > 1) {
        const otherIps = uniqueIps.filter(ip => ip !== primaryIp);
        if (otherIps.length > 0) {
            ipFormatted += '\n\n**Historical Linked IPs:**\n' + otherIps.map(ip => `• \`${ip}\``).join(', ');
        }
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

    // Database Collected Metrics & Usage
    const balanceSec = user.credits !== undefined ? user.credits : 0;
    const usedSec = user.total_credits_used || 0;
    const statsLines = [
        `• Pool Balance: **${balanceSec}s** remaining (${formatDuration(balanceSec)})`,
        `• Total Used: **${usedSec}s** (${formatDuration(usedSec)})`,
        `• Transcriptions: **${user.total_transcriptions || 0}** jobs (${formatDuration(user.total_seconds_transcribed || 0)})`,
        `• Captions & SRTs: **${user.total_captions_created || 0}** captions • **${user.total_srt_exports || 0}** SRTs`,
        `• Total Spent: **$${user.total_credits_purchased_usd || 0}**`
    ];
    fields.push({
        name: '💳 Credits & Usage Stats',
        value: statsLines.join('\n'),
        inline: false
    });

    // Account & Engagement Details
    const engagementLines = [
        `• Logins: **${user.login_count || 1}** sessions`,
        `• Last Seen: ${formatDiscordTimestamp(user.last_seen_at || user.last_login_at)}`,
        `• Affiliate: **${user.is_affiliate ? '⭐ Active (Code: ' + (user.affiliate_code || 'N/A') + ')' : 'No'}** • **${user.referral_count || 0}** referrals`,
        `• Source: **${user.signup_source || 'web'}** • Status: **${user.account_status || 'Active ✅'}**`,
        `• Admin: **${user.is_admin ? '🛡️ Administrator' : 'Standard User'}**`
    ];
    fields.push({
        name: '📊 Account & Engagement',
        value: engagementLines.join('\n'),
        inline: false
    });

    // Hardware & Security Fingerprint
    const securityLines = [
        `• User ID: \`${userId || user.id || 'N/A'}\``,
        `• Device Fingerprint: \`${user.device_fingerprint || data.deviceId || extra.deviceId || 'N/A'}\``,
        `• Plugin Version: \`v${user.plugin_version || extra.version || '1.2.7'}\` (${user.plugin_platform || 'Premiere Pro'})`
    ];
    fields.push({
        name: '🆔 Security & Hardware Fingerprint',
        value: securityLines.join('\n'),
        inline: false
    });

    return {
        title: title || '👤 User Activity Profile',
        color: isPaid ? 0xa855f7 : 0x22c55e,
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: 'REDitors Real-Time User Telemetry • Railway Production' }
    };
}

// ------------------------------------------------------------------------------
// 1. Tool Jobs Logger (Dedicated Channel per Job)
// ------------------------------------------------------------------------------
function logToolJob(tool, data, req = null) {
    try {
        const t = (tool || data.tool || '').toLowerCase();
        let targetChannel = CHANNELS.autoCaptions;
        let toolName = 'Auto-Captions';
        let icon = '🎙️';

        if (t.includes('silence')) {
            targetChannel = CHANNELS.silenceRemover;
            toolName = 'Silence Remover';
            icon = '✂️';
        } else if (t.includes('speech_cut') || t.includes('speech-cut')) {
            targetChannel = CHANNELS.speechCut;
            toolName = 'Speech Cut';
            icon = '⚡';
        } else if (t.includes('title_animator') || t.includes('title-animator') || t.includes('motionai')) {
            targetChannel = CHANNELS.titleAnimator;
            toolName = 'Title Animator';
            icon = '✨';
        } else if (t.includes('viral')) {
            targetChannel = CHANNELS.viralCaptions;
            toolName = 'Viral Captions';
            icon = '🔥';
        } else {
            targetChannel = CHANNELS.autoCaptions;
            toolName = 'Auto-Captions';
            icon = '🎙️';
        }

        const isSuccess = data.status !== 'error' && !data.error && !data.error_message;
        const color = isSuccess ? COLORS.success : COLORS.danger;
        const statusText = isSuccess ? '✅ Completed Successfully' : '❌ Failed with Error';

        const h = (req && req.headers) ? req.headers : {};
        const pluginVersion = data.plugin_version || h['x-plugin-version'] || '1.2.7';
        const premiereVersion = data.premiere_version || h['x-premiere-version'] || 'N/A';
        const osName = data.os_name || h['x-os-name'] || 'N/A';
        const rawDeviceId = data.device_id || h['x-device-id'] || '';
        const ip = data.ip || (req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'N/A') : 'N/A');

        // Resolve user profile & IP info in parallel
        Promise.all([
            fetchEnrichedUserProfile(data.user_id, data.email),
            resolveIpInfo(ip)
        ]).then(([profile, ipInfo]) => {
            const user = profile?.user || {};
            const resolvedEmail = user.email || data.email || null;
            const resolvedPlan = (user.plan_slug || data.plan || '').toUpperCase();
            const planBadge = resolvedPlan ? ` [${resolvedPlan}]` : '';
            const deviceId = rawDeviceId || user.device_fingerprint || 'N/A';
            const deviceDisplay = (deviceId && deviceId !== 'N/A') ? (deviceId.length > 20 ? deviceId.substring(0, 16) + '...' : deviceId) : 'N/A';
            const userIdentifier = resolvedEmail ? `\`${resolvedEmail}\`${planBadge}` : (data.user_id ? `\`${data.user_id}\`${planBadge}` : '`Anonymous`');

            const fields = [
                {
                    name: '👤 User & Identity',
                    value: `**Email/ID:** ${userIdentifier}\n**Device:** \`${deviceDisplay}\``,
                    inline: true
                },
                {
                    name: '⚙️ Environment',
                    value: `**Plugin:** \`v${pluginVersion}\`\n**Premiere:** \`v${premiereVersion}\`\n**OS:** \`${osName}\``,
                    inline: true
                },
                {
                    name: '📊 Processing Stats',
                    value: `**Duration:** \`${formatDuration(data.audio_duration_sec)}\`\n**Segments:** \`${data.segment_count || 'N/A'}\`\n**Words:** \`${data.word_count || 'N/A'}\``,
                    inline: true
                },
                {
                    name: '⚡ Performance & Billing',
                    value: `**Latency:** \`${formatMs(data.response_ms)}\`\n**Credits Used:** \`${data.credits_used !== undefined ? data.credits_used + 's' : '0s'}\`\n**Language:** \`${data.language || 'auto'}\``,
                    inline: true
                },
                {
                    name: '🌐 IPs Info',
                    value: ipInfo ? ipInfo.formatted : `\`${ip}\``,
                    inline: false
                }
            ];

            if (data.caption_style) {
                fields.push({
                    name: '🎨 Style / Preset',
                    value: `\`${data.caption_style}\``,
                    inline: true
                });
            }

            if (!isSuccess && (data.error_message || data.error)) {
                fields.push({
                    name: '⚠️ Error Details',
                    value: `\`\`\`\n${(data.error_message || data.error || 'Unknown error').substring(0, 1000)}\n\`\`\``,
                    inline: false
                });
            }

            const embed = {
                title: `${icon} ${toolName} Job: ${statusText}`,
                color: color,
                fields: fields,
                timestamp: new Date().toISOString()
            };

            sendEmbed(targetChannel, embed);
        }).catch(err => {
            console.error('[discord-logger] logToolJob error:', err.message);
        });
    } catch (_) {}
}

// ------------------------------------------------------------------------------
// 2. Plugin Sessions Logger
// ------------------------------------------------------------------------------
function logPluginSession(sessionData) {
    try {
        const isEnd = sessionData.eventType === 'session_end';
        const title = isEnd ? '🚪 Plugin Session Closed' : '📱 Plugin Session Started';

        buildUserAuditEmbed(title, sessionData, sessionData).then(embed => {
            if (isEnd) embed.color = COLORS.dark;
            if (sessionData.durationSec) {
                embed.fields.push({
                    name: '⏱️ Session Duration',
                    value: `\`${formatDuration(sessionData.durationSec)}\``,
                    inline: true
                });
            }
            sendEmbed(CHANNELS.pluginSessions, embed);
        }).catch(() => {});
    } catch (_) {}
}

// ------------------------------------------------------------------------------
// 3. Auth & Login Logger
// ------------------------------------------------------------------------------
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

// ------------------------------------------------------------------------------
// 4. Billing & Credits Logger
// ------------------------------------------------------------------------------
function logBilling(provider, eventType, data) {
    try {
        const prov = (provider || 'Billing').toUpperCase();
        let color = COLORS.warning;
        let title = `💳 [${prov}] ${eventType}`;

        if (eventType.includes('paid') || eventType.includes('active') || eventType.includes('completed')) {
            color = COLORS.success;
        } else if (eventType.includes('failed') || eventType.includes('canceled') || eventType.includes('deleted')) {
            color = COLORS.danger;
        }

        const fields = [
            {
                name: '👤 Customer',
                value: `**Email:** \`${data.email || 'N/A'}\`\n**User ID:** \`${data.userId || 'N/A'}\``,
                inline: true
            },
            {
                name: '📦 Product & Tier',
                value: `**Plan:** \`${(data.plan || 'N/A').toUpperCase()}\`\n**Interval:** \`${data.interval || 'monthly'}\``,
                inline: true
            },
            {
                name: '💰 Transaction',
                value: `**Amount:** \`$${data.amount || '0'}\`\n**Provider:** \`${prov}\``,
                inline: true
            }
        ];

        if (data.subscriptionId || data.orderId || data.checkoutId) {
            fields.push({
                name: '🆔 References',
                value: `**Sub ID:** \`${data.subscriptionId || 'N/A'}\`\n**Order ID:** \`${data.orderId || data.checkoutId || 'N/A'}\``,
                inline: false
            });
        }

        if (data.reason) {
            fields.push({
                name: '⚠️ Reason / Note',
                value: `\`${data.reason}\``,
                inline: false
            });
        }

        const embed = {
            title,
            color,
            fields,
            timestamp: new Date().toISOString()
        };

        sendEmbed(CHANNELS.billingCredits, embed);
    } catch (_) {}
}

// ------------------------------------------------------------------------------
// 5. Database Realtime Audit Logger
// ------------------------------------------------------------------------------
function logDatabaseAudit(action, table, record, oldRecord = null) {
    try {
        if (table === 'tool_events' && action === 'INSERT') return;

        let color = COLORS.purple;
        if (action === 'DELETE') color = COLORS.danger;
        if (action === 'INSERT') color = COLORS.success;
        if (action === 'UPDATE') color = COLORS.warning;

        const title = `🗄️ Supabase Audit: ${action} on [${table}]`;

        const id = (record && (record.id || record.user_id)) || (oldRecord && (oldRecord.id || oldRecord.user_id)) || 'N/A';
        const fields = [
            {
                name: '📌 Table & Entity',
                value: `**Table:** \`${table}\`\n**Action:** \`${action}\`\n**Record ID:** \`${id}\``,
                inline: true
            }
        ];

        if (action === 'UPDATE' && oldRecord && record) {
            const changedKeys = [];
            for (const key of Object.keys(record)) {
                if (key === 'updated_at' || key === 'last_seen') continue;
                if (JSON.stringify(record[key]) !== JSON.stringify(oldRecord[key])) {
                    const oldVal = String(oldRecord[key]).substring(0, 50);
                    const newVal = String(record[key]).substring(0, 50);
                    changedKeys.push(`• **${key}:** \`${oldVal}\` ➔ \`${newVal}\``);
                }
            }
            if (changedKeys.length > 0) {
                fields.push({
                    name: '🔄 Changed Fields',
                    value: changedKeys.slice(0, 10).join('\n'),
                    inline: false
                });
            }
        } else if (record) {
            const summary = Object.entries(record)
                .slice(0, 8)
                .map(([k, v]) => `• **${k}:** \`${String(v).substring(0, 60)}\``)
                .join('\n');
            fields.push({
                name: '📄 Record Data',
                value: summary || '*Empty*',
                inline: false
            });
        }

        const embed = {
            title,
            color,
            fields,
            timestamp: new Date().toISOString()
        };

        sendEmbed(CHANNELS.databaseAudit, embed);
    } catch (_) {}
}

// ------------------------------------------------------------------------------
// 6. Website / Vercel Activity Logger (Enriched with User & IP Profile)
// ------------------------------------------------------------------------------
function logWebsiteVercel(data) {
    try {
        const title = `🌐 Website Activity: ${data.event || data.path || 'Page Event'}`;

        buildUserAuditEmbed(title, data, data).then(embed => {
            embed.color = COLORS.cyan;

            if (data.path || data.url) {
                embed.fields.unshift({
                    name: '📄 Web Page / URL',
                    value: `\`${data.path || data.url || '/'}\` (${data.method || 'GET'})`,
                    inline: false
                });
            }

            if (data.referrer) {
                embed.fields.push({
                    name: '🔗 Referrer',
                    value: `\`${data.referrer}\``,
                    inline: false
                });
            }

            if (data.details || data.action) {
                embed.fields.push({
                    name: '📋 Event Details',
                    value: `\`\`\`json\n${JSON.stringify(data.details || data.action || {}, null, 2).substring(0, 500)}\n\`\`\``,
                    inline: false
                });
            }

            sendEmbed(CHANNELS.websiteVercel, embed);
        }).catch(() => {});
    } catch (_) {}
}

// ------------------------------------------------------------------------------
// 7. Server Errors & Critical Exceptions
// ------------------------------------------------------------------------------
function logServerError(title, err, req = null) {
    try {
        const fields = [
            {
                name: '⚠️ Error Message',
                value: `\`\`\`\n${(err && (err.message || String(err)) || 'Unknown Error').substring(0, 900)}\n\`\`\``,
                inline: false
            }
        ];

        if (req) {
            const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'N/A';
            fields.push({
                name: '📍 Context',
                value: `**Route:** \`${req.method} ${req.originalUrl || req.url}\`\n**User:** \`${(req.user && (req.user.email || req.user.id)) || 'Guest'}\`\n**IP:** \`${ip}\``,
                inline: false
            });
        }

        if (err && err.stack) {
            fields.push({
                name: '📋 Stack Trace',
                value: `\`\`\`\n${err.stack.substring(0, 900)}\n\`\`\``,
                inline: false
            });
        }

        const embed = {
            title: `🚨 Server Exception: ${title}`,
            color: COLORS.danger,
            fields,
            timestamp: new Date().toISOString()
        };

        sendEmbed(CHANNELS.serverErrors, embed);
    } catch (_) {}
}

// ------------------------------------------------------------------------------
// 8. Railway Live Console Log Streamer
// ------------------------------------------------------------------------------
let _liveLogBuffer = [];
let _liveLogFlushTimer = null;

function _flushLiveLogs() {
    _liveLogFlushTimer = null;
    if (_liveLogBuffer.length === 0) return;

    const batch = [];
    let currentLen = 0;

    while (_liveLogBuffer.length > 0) {
        const line = _liveLogBuffer[0];
        if (currentLen + line.length > 1800) break;
        batch.push(_liveLogBuffer.shift());
        currentLen += line.length + 1;
    }

    if (batch.length > 0) {
        const text = '```ansi\n' + batch.join('\n') + '\n```';
        sendRawMessage(CHANNELS.railwayLiveLogs, text);
    }

    if (_liveLogBuffer.length > 0) {
        _liveLogFlushTimer = setTimeout(_flushLiveLogs, 2500);
    }
}

function initRailwayLiveLogger() {
    console.log('[discord-logger] 🚀 Initializing live console log streamer to #railway-live-logs...');

    const origStdout = process.stdout.write.bind(process.stdout);
    const origStderr = process.stderr.write.bind(process.stderr);

    function capture(chunk, encoding, cb) {
        try {
            const str = typeof chunk === 'string' ? chunk : chunk.toString(encoding || 'utf8');
            if (
                !str.includes('discord.com/api/v10') &&
                !str.includes('ip-api.com') &&
                !str.includes('[discord-logger]') &&
                str.trim().length > 0
            ) {
                const clean = str.replace(/\r?\n$/, '');
                if (clean.length > 0) {
                    _liveLogBuffer.push(clean.substring(0, 300));
                    if (_liveLogBuffer.length > 50) _liveLogBuffer.shift();

                    if (!_liveLogFlushTimer) {
                        _liveLogFlushTimer = setTimeout(_flushLiveLogs, 2500);
                    }
                }
            }
        } catch (_) {}
    }

    process.stdout.write = function (chunk, encoding, cb) {
        origStdout(chunk, encoding, cb);
        capture(chunk, encoding, cb);
        return true;
    };

    process.stderr.write = function (chunk, encoding, cb) {
        origStderr(chunk, encoding, cb);
        capture(chunk, encoding, cb);
        return true;
    };

    sendEmbed(CHANNELS.railwayLiveLogs, {
        title: '📋 Railway Live Console Stream Connected',
        description: `**Service:** \`reditors-server\`\n**Time:** \`${new Date().toUTCString()}\`\n**Status:** 🟢 Live streaming active for all console logs.`,
        color: COLORS.success,
        timestamp: new Date().toISOString()
    });
}

// ------------------------------------------------------------------------------
// 9. Supabase Realtime Database Listener
// ------------------------------------------------------------------------------
function initDatabaseListener(supabaseAdmin) {
    if (supabaseAdmin) setSupabaseAdmin(supabaseAdmin);

    if (!supabaseAdmin || typeof supabaseAdmin.channel !== 'function') {
        console.warn('[discord-logger] supabaseAdmin client does not support Realtime channels.');
        return;
    }

    try {
        console.log('[discord-logger] 🔌 Subscribing to Supabase Realtime postgres_changes on schema public...');

        const realtimeChannel = supabaseAdmin.channel('discord-db-audit')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                const { eventType, table, new: newRec, old: oldRec } = payload;
                logDatabaseAudit(eventType, table, newRec, oldRec);
            })
            .subscribe((status, err) => {
                if (err) {
                    console.warn('[discord-logger] Realtime subscription status error:', err.message);
                } else if (status === 'SUBSCRIBED') {
                    console.log('[discord-logger] ✅ Supabase Realtime active: Auditing all database operations.');
                    sendEmbed(CHANNELS.databaseAudit, {
                        title: '🗄️ Supabase Realtime Database Audit Connected',
                        description: 'Connected to Supabase Realtime. All `INSERT`, `UPDATE`, and `DELETE` queries on public schema are actively monitored.',
                        color: COLORS.purple,
                        timestamp: new Date().toISOString()
                    });
                }
            });

        return realtimeChannel;
    } catch (err) {
        console.warn('[discord-logger] Failed to initialize database listener:', err.message);
    }
}

module.exports = {
    CHANNELS,
    COLORS,
    setSupabaseAdmin,
    resolveIpInfo,
    parseDeviceType,
    formatDiscordTimestamp,
    buildUserAuditEmbed,
    sendEmbed,
    sendRawMessage,
    logToolJob,
    logPluginSession,
    logAuthLogin,
    logBilling,
    logDatabaseAudit,
    logWebsiteVercel,
    logServerError,
    initRailwayLiveLogger,
    initDatabaseListener
};

