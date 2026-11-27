'use strict';
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusDot(val) {
    if (val === 'operational' || val === true || val === 'online') return '🟢';
    if (val === 'degraded') return '🟡';
    return '🔴';
}

async function fetchHealth(url) {
    const start = Date.now();
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
        const res  = await fetch(`${url}/api/health`, { signal: ctrl.signal });
        const data = await res.json();
        return { ok: res.ok, data, latency: Date.now() - start };
    } catch {
        return { ok: false, data: null, latency: Date.now() - start };
    } finally {
        clearTimeout(timer);
    }
}

function buildPerfEmbed(data, latency, refreshedAt) {
    const mem  = data?.memory   || {};
    const rq   = data?.render_queue || {};
    const svcs = data?.services || {};

    const heapUsed  = mem.heap_used_mb  ?? '?';
    const heapTotal = mem.heap_total_mb ?? '?';
    const rss       = mem.rss_mb        ?? '?';
    const qActive   = rq.active  ?? 0;
    const qQueued   = rq.queued  ?? 0;

    const queueEmoji = qActive === 0 && qQueued === 0 ? '✅' : qActive > 2 ? '🔴' : '🟡';
    const memPercent = heapTotal > 0 ? Math.round((heapUsed / heapTotal) * 100) : 0;
    const memBar     = buildBar(memPercent);

    const svcLines = Object.entries(svcs)
        .map(([name, state]) => `${statusDot(state)} **${name.toUpperCase()}** — \`${state}\``)
        .join('\n') || '`N/A`';

    return {
        title: `${data?.ok ? '🟢' : '🔴'} REDitors Server — Performance Dashboard`,
        description: `Real-time performance metrics for the REDitors Railway server.\n> 📡 **API Latency:** \`${latency}ms\` · 🕒 **Uptime:** \`${data?.uptime_human ?? 'N/A'}\` · 🔖 **v${data?.version ?? '?'}\``,
        color: data?.ok ? config.colors.primary : config.colors.danger,
        thumbnail: { url: config.urls.logoUrl },
        fields: [
            {
                name: '💾 Memory Usage',
                value: `\`\`\`\nHeap : ${heapUsed} MB / ${heapTotal} MB (${memPercent}%)\nRSS  : ${rss} MB\n${memBar}\n\`\`\``,
                inline: false
            },
            {
                name: '🎞️ Render Queue',
                value: `${queueEmoji} Active: \`${qActive}\` · Queued: \`${qQueued}\``,
                inline: true
            },
            {
                name: '⚙️ Core Services',
                value: svcLines,
                inline: true
            },
            {
                name: '🛠️ Infrastructure',
                value: `FFmpeg: ${data?.ffmpeg ? `\`${data.ffmpeg}\`` : '`N/A`'}\nR2 Bucket: ${data?.r2 ? '✅ Connected' : '❌ Offline'}`,
                inline: true
            }
        ],
        footer: { text: `REDitors Performance Monitor • Last refreshed: ${refreshedAt}` },
        timestamp: new Date().toISOString()
    };
}

function buildBar(pct, len = 20) {
    const filled = Math.round((pct / 100) * len);
    return '[' + '█'.repeat(filled) + '░'.repeat(len - filled) + '] ' + pct + '%';
}

function buildButtons(disabled = false) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_perf_refresh').setLabel('Refresh').setEmoji('🔄').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('btn_perf_queue').setLabel('Queue Details').setEmoji('📊').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('btn_perf_memory').setLabel('Memory').setEmoji('💾').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_perf_services').setLabel('Services').setEmoji('⚙️').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('btn_perf_ping').setLabel('Ping Endpoints').setEmoji('🌐').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('btn_perf_dbstats').setLabel('DB Stats').setEmoji('📈').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
    );
    return [row1, row2];
}

// ─── Exported button handler (called from bot.js) ────────────────────────────

async function handlePerformanceButton(interaction) {
    const id = interaction.customId;
    if (!id.startsWith('btn_perf_')) return false;

    const serverUrl = config.urls.localServer || config.urls.publicServer;

    try {
        // ── Refresh ──────────────────────────────────────────────────────────
        if (id === 'btn_perf_refresh') {
            await interaction.deferUpdate();
            const { data, latency, ok } = await fetchHealth(serverUrl);
            const refreshedAt = new Date().toLocaleTimeString('en-US', { hour12: false });

            if (!ok || !data) {
                await interaction.editReply({
                    embeds: [{
                        title: '🔴 Server Unreachable',
                        description: 'Could not reach the REDitors server. It may be offline or restarting.',
                        color: config.colors.danger,
                        timestamp: new Date().toISOString()
                    }],
                    components: buildButtons(false)
                });
                return true;
            }
            const embed = buildPerfEmbed(data, latency, refreshedAt);
            await interaction.editReply({ embeds: [embed], components: buildButtons(false) });
            return true;
        }

        // ── Queue Details ─────────────────────────────────────────────────────
        if (id === 'btn_perf_queue') {
            await interaction.deferReply({ ephemeral: true });
            const { data, latency } = await fetchHealth(serverUrl);
            const rq = data?.render_queue || {};
            await interaction.editReply({
                embeds: [{
                    title: '📊 Render Queue Details',
                    color: config.colors.primary,
                    fields: [
                        { name: 'Active Renders',    value: `\`${rq.active  ?? 0}\``, inline: true },
                        { name: 'Queued',            value: `\`${rq.queued  ?? 0}\``, inline: true },
                        { name: 'API Latency',       value: `\`${latency}ms\``,        inline: true }
                    ],
                    description: rq.active === 0 && rq.queued === 0
                        ? '✅ Queue is **empty** — server is idle.'
                        : `⚠️ **${rq.active}** render(s) in progress, **${rq.queued}** waiting.`,
                    timestamp: new Date().toISOString(),
                    footer: { text: 'REDitors Server Monitor' }
                }]
            });
            return true;
        }

        // ── Memory Details ────────────────────────────────────────────────────
        if (id === 'btn_perf_memory') {
            await interaction.deferReply({ ephemeral: true });
            const { data } = await fetchHealth(serverUrl);
            const mem = data?.memory || {};
            const pct = mem.heap_total_mb > 0 ? Math.round((mem.heap_used_mb / mem.heap_total_mb) * 100) : 0;
            await interaction.editReply({
                embeds: [{
                    title: '💾 Memory Breakdown',
                    color: pct > 80 ? config.colors.danger : pct > 60 ? config.colors.warning : config.colors.primary,
                    description: `\`\`\`\nHeap Used  : ${mem.heap_used_mb  ?? '?'} MB\nHeap Total : ${mem.heap_total_mb ?? '?'} MB (${pct}%)\nRSS (total): ${mem.rss_mb        ?? '?'} MB\n\n${buildBar(pct)}\n\`\`\``,
                    footer: { text: 'ℹ️  RSS = full process memory including buffers, heap = JS allocated' },
                    timestamp: new Date().toISOString()
                }]
            });
            return true;
        }

        // ── Services ──────────────────────────────────────────────────────────
        if (id === 'btn_perf_services') {
            await interaction.deferReply({ ephemeral: true });
            const { data } = await fetchHealth(serverUrl);
            const svcs = data?.services || {};
            const lines = Object.entries(svcs)
                .map(([name, state]) => `${statusDot(state)} **${name.toUpperCase()}** — \`${state}\``)
                .join('\n') || '`No services reported`';
            const allOk = Object.values(svcs).every(s => s === 'operational');
            await interaction.editReply({
                embeds: [{
                    title: '⚙️ Service Status',
                    color: allOk ? config.colors.primary : config.colors.warning,
                    description: lines,
                    footer: { text: 'REDitors Server Monitor' },
                    timestamp: new Date().toISOString()
                }]
            });
            return true;
        }

        // ── Ping Endpoints ────────────────────────────────────────────────────
        if (id === 'btn_perf_ping') {
            await interaction.deferReply({ ephemeral: true });
            const urls = {
                'Railway (Primary)': config.urls.localServer  || config.urls.publicServer,
                'Public Domain':     config.urls.publicServer || config.urls.localServer
            };
            const results = await Promise.all(
                Object.entries(urls).map(async ([label, url]) => {
                    const start = Date.now();
                    try {
                        const ctrl = new AbortController();
                        const t    = setTimeout(() => ctrl.abort(), 6000);
                        const r    = await fetch(`${url}/api/health`, { signal: ctrl.signal });
                        clearTimeout(t);
                        const ms = Date.now() - start;
                        return `${r.ok ? '🟢' : '🔴'} **${label}** — \`${ms}ms\` [\`${url}\`]`;
                    } catch {
                        return `🔴 **${label}** — \`timeout / unreachable\` [\`${url}\`]`;
                    }
                })
            );
            await interaction.editReply({
                embeds: [{
                    title: '🌐 Endpoint Ping Results',
                    color: config.colors.primary,
                    description: results.join('\n'),
                    timestamp: new Date().toISOString(),
                    footer: { text: 'Pinging /api/health on each endpoint' }
                }]
            });
            return true;
        }

        // ── DB Stats ──────────────────────────────────────────────────────────
        if (id === 'btn_perf_dbstats') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const { getLiveDatabaseStats } = require('../supabaseClient');
                const stats = await getLiveDatabaseStats();
                const lines = Object.entries(stats || {})
                    .map(([k, v]) => `• **${k}:** \`${v}\``)
                    .join('\n') || '`No stats available`';
                await interaction.editReply({
                    embeds: [{
                        title: '📈 Database Stats',
                        color: config.colors.primary,
                        description: lines,
                        timestamp: new Date().toISOString(),
                        footer: { text: 'REDitors Supabase Database' }
                    }]
                });
            } catch (err) {
                await interaction.editReply({
                    embeds: [{
                        title: '📈 Database Stats',
                        color: config.colors.warning,
                        description: `⚠️ Could not load DB stats: \`${err.message}\``,
                        timestamp: new Date().toISOString()
                    }]
                });
            }
            return true;
        }

    } catch (err) {
        console.error('[Performance Button] Error:', err.message);
        const payload = { content: `⚠️ Button error: \`${err.message}\``, ephemeral: true };
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(payload).catch(() => null);
        } else {
            await interaction.reply(payload).catch(() => null);
        }
        return true;
    }

    return false;
}

// ─── Slash Command ────────────────────────────────────────────────────────────

module.exports = {
    data: new SlashCommandBuilder()
        .setName('performance')
        .setDescription('📊 Real-time server performance dashboard with interactive controls'),

    handlePerformanceButton,

    async execute(interaction) {
        await interaction.deferReply();

        const serverUrl  = config.urls.localServer || config.urls.publicServer;
        const { data, latency, ok } = await fetchHealth(serverUrl);
        const refreshedAt = new Date().toLocaleTimeString('en-US', { hour12: false });

        if (!ok || !data) {
            await interaction.editReply({
                embeds: [{
                    title: '🔴 Server Unreachable',
                    description: `Could not connect to \`${serverUrl}\`. The server may be offline or restarting.`,
                    color: config.colors.danger,
                    thumbnail: { url: config.urls.logoUrl },
                    footer: { text: 'REDitors Performance Monitor' },
                    timestamp: new Date().toISOString()
                }],
                components: buildButtons(false)
            });
            return;
        }

        const embed = buildPerfEmbed(data, latency, refreshedAt);
        await interaction.editReply({ embeds: [embed], components: buildButtons(false) });
    }
};
