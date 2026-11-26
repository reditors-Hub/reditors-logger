'use strict';
const os = require('os');
const config = require('./config');
const { getLiveDatabaseStats } = require('./supabaseClient');

let lastServerState = null;
let lastServerCheckTime = null;
let cachedHealth = null;
let statsMessageId = null;

/**
 * Perform a quick fetch with timeout.
 */
async function fetchWithTimeout(url, timeoutMs = 3500) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        const latency = Date.now() - start;
        let data = null;
        try {
            data = await res.json();
        } catch (_) {}
        return {
            ok: res.ok,
            status: res.status,
            latency,
            data
        };
    } catch (err) {
        clearTimeout(id);
        return {
            ok: false,
            status: 0,
            latency: Date.now() - start,
            error: err.message
        };
    }
}

/**
 * Check health of both Local PC Server and Public Cloudflare Tunnel.
 */
async function checkServerHealth() {
    const [localRes, publicRes, versionRes] = await Promise.all([
        fetchWithTimeout(`${config.urls.localServer}/api/health`, 3000),
        fetchWithTimeout(`${config.urls.publicServer}/api/health`, 5000),
        fetchWithTimeout(`${config.urls.localServer}/api/version`, 3000)
    ]);

    const isLocalOnline = localRes.ok && localRes.data && localRes.data.ok;
    const isPublicOnline = publicRes.ok && publicRes.data && publicRes.data.ok;
    const isOperational = isLocalOnline || isPublicOnline;

    const result = {
        operational: isOperational,
        timestamp: new Date().toISOString(),
        local: {
            online: isLocalOnline,
            latency: localRes.latency,
            data: localRes.data,
            error: localRes.error
        },
        public: {
            online: isPublicOnline,
            latency: publicRes.latency,
            url: config.urls.publicServer,
            error: publicRes.error
        },
        versionInfo: versionRes.data || null,
        system: {
            host: os.hostname(),
            platform: `${os.type()} ${os.arch()}`,
            freeMemMB: Math.round(os.freemem() / (1024 * 1024)),
            totalMemMB: Math.round(os.totalmem() / (1024 * 1024)),
            usedMemMB: Math.round((os.totalmem() - os.freemem()) / (1024 * 1024)),
            cpuCount: os.cpus().length,
            uptimeSeconds: Math.round(os.uptime())
        }
    };

    cachedHealth = result;
    lastServerCheckTime = Date.now();
    return result;
}

/**
 * Build rich Discord embed for Server Overview & Live Stats.
 */
async function buildServerStatsEmbed(healthData, dbStats, client) {
    const isOnline = healthData.operational;
    const statusEmoji = isOnline ? '🟢' : '🔴';
    const statusText = isOnline ? 'OPERATIONAL' : 'OFFLINE / RECONNECTING';
    const embedColor = isOnline ? config.colors.primary : config.colors.danger;

    const serverUptime = healthData.local.data?.uptime || healthData.public.data?.uptime || 'N/A';
    const serverMemory = healthData.local.data?.memory || `${healthData.system.usedMemMB}MB`;
    const pluginVersion = healthData.versionInfo?.version ? `v${healthData.versionInfo.version} Stable` : config.versions.plugin;
    const serverVersion = healthData.local.data?.version ? `v${healthData.local.data.version}` : config.versions.server;
    const ffmpegStatus = (healthData.local.data?.ffmpeg || healthData.public.data?.ffmpeg) ? '✅ Hardware Accelerated' : '⚠️ Bundled';

    const memberCount = client?.guilds?.cache?.get(config.guildId)?.memberCount || '10+';

    const embed = {
        title: '📊 REDitors — Real-Time Server & Platform Status',
        description: `Live performance telemetry from the **REDitors Local Host Server** and Cloudflare Edge Network.`,
        color: embedColor,
        thumbnail: { url: config.urls.logoUrl },
        fields: [
            {
                name: '🖥️ PC Host Server (Primary Engine)',
                value: `**Status:** ${statusEmoji} **${statusText}**\n` +
                       `**Local Endpoint:** \`${config.urls.localServer}\` (${healthData.local.latency}ms)\n` +
                       `**Public Tunnel:** [pc.reditors.com](${config.urls.publicServer}) (${healthData.public.latency}ms)\n` +
                       `**Server Engine:** \`${serverVersion}\`\n` +
                       `**Process Uptime:** \`${serverUptime}\` · **RAM:** \`${serverMemory}\``,
                inline: false
            },
            {
                name: '⚡ Processing & Hardware Acceleration',
                value: `**FFmpeg Core:** ${ffmpegStatus}\n` +
                       `**Host Machine:** \`${healthData.system.host}\` (${healthData.system.cpuCount} Cores)\n` +
                       `**System Memory:** \`${healthData.system.usedMemMB}MB / ${healthData.system.totalMemMB}MB\`\n` +
                       `**Cloudflare R2 Bucket:** \`reditors\` (Active · Fast CDN)`,
                inline: false
            },
            {
                name: '👥 Platform & Database Statistics',
                value: `**Registered Users:** \`${dbStats.totalUsers.toLocaleString()}\`\n` +
                       `**Activated Plugin Users:** \`${dbStats.activeUsers.toLocaleString()}\`\n` +
                       `**Pro & Paid Subscribers:** \`${dbStats.paidUsers.toLocaleString()}\`\n` +
                       `**AI Transcriptions Processed:** \`${dbStats.totalTranscriptions.toLocaleString()}\`\n` +
                       `**Discord Members:** \`${memberCount}\``,
                inline: true
            },
            {
                name: '📦 Plugin Distribution',
                value: `**Release:** \`${pluginVersion}\`\n` +
                       `**Target:** Adobe Premiere Pro CC+\n` +
                       `**Downloads:** [Windows EXE](${config.urls.downloadWindows}) · [Mac PKG](${config.urls.downloadMac}) · [ZXP](${config.urls.downloadZxp})`,
                inline: true
            },
            {
                name: '🎙️ AI Production Tools Active',
                value: `• **Auto Captions** (Multi-language Whisper + custom presets)\n` +
                       `• **Silence Remover** (Instant timeline silence detection)\n` +
                       `• **AI Speech Cut** (Edit video by transcript text)\n` +
                       `• **Title Animator** (One-click animated motion titles)`,
                inline: false
            }
        ],
        footer: {
            text: `REDitors Telemetry · Auto-updated every 3 minutes · Last refresh: ${new Date().toLocaleTimeString('en-US', { hour12: false })}`
        },
        timestamp: new Date().toISOString()
    };

    return embed;
}

/**
 * Update the live embed in 📊│server-stats channel.
 */
async function updateStatsChannel(client) {
    try {
        const guild = client.guilds.cache.get(config.guildId) || await client.guilds.fetch(config.guildId).catch(() => null);
        if (!guild) return;

        const channel = guild.channels.cache.get(config.channels.serverStats) || await guild.channels.fetch(config.channels.serverStats).catch(() => null);
        if (!channel) return;

        const [healthData, dbStats] = await Promise.all([
            checkServerHealth(),
            getLiveDatabaseStats()
        ]);

        const embed = await buildServerStatsEmbed(healthData, dbStats, client);

        // Fetch recent messages to locate existing bot embed or statsMessageId
        let existingMsg = null;
        if (statsMessageId) {
            existingMsg = await channel.messages.fetch(statsMessageId).catch(() => null);
        }

        if (!existingMsg) {
            const recent = await channel.messages.fetch({ limit: 10 }).catch(() => null);
            if (recent) {
                existingMsg = recent.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title?.includes('Server'));
            }
        }

        if (existingMsg) {
            await existingMsg.edit({ embeds: [embed] });
            statsMessageId = existingMsg.id;
        } else {
            const newMsg = await channel.send({ embeds: [embed] });
            statsMessageId = newMsg.id;
            try { await newMsg.pin(); } catch (_) {}
        }

        // Check if server transitioned state and alert bot-logs
        if (lastServerState !== null && lastServerState !== healthData.operational) {
            const logsChannel = guild.channels.cache.get(config.channels.botLogs);
            if (logsChannel) {
                if (healthData.operational) {
                    await logsChannel.send({
                        embeds: [{
                            title: '🟢 Server Restored — PC Host Operational',
                            description: `The PC Host Server is responding normally at \`${config.urls.localServer}\` and tunnel \`${config.urls.publicServer}\`.`,
                            color: config.colors.success,
                            timestamp: new Date().toISOString()
                        }]
                    });
                } else {
                    await logsChannel.send({
                        embeds: [{
                            title: '🚨 Server Alert — PC Host Server Unreachable',
                            description: `Warning: Unable to reach \`${config.urls.localServer}\`. Render requests and AI transcription queue may be delayed.`,
                            color: config.colors.danger,
                            timestamp: new Date().toISOString()
                        }]
                    });
                }
            }
        }
        lastServerState = healthData.operational;
    } catch (err) {
        console.error('[serverMonitor] Error updating stats channel:', err.message);
    }
}

/**
 * Start the background watchdog loop.
 */
function startMonitoring(client, intervalMs = 180000) {
    // Initial run after 5 seconds
    setTimeout(() => {
        updateStatsChannel(client).catch(console.error);
    }, 5000);

    // Periodic updates every 3 minutes
    return setInterval(() => {
        updateStatsChannel(client).catch(console.error);
    }, intervalMs);
}

module.exports = {
    checkServerHealth,
    updateStatsChannel,
    startMonitoring,
    buildServerStatsEmbed,
    getCachedHealth: () => cachedHealth
};
