'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { checkServerHealth } = require('../serverMonitor');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-status')
        .setDescription('Check real-time status of the REDitors PC Host Server and Cloudflare Tunnel'),
    async execute(interaction) {
        await interaction.deferReply();
        const health = await checkServerHealth();

        const isOnline = health.operational;
        const color = isOnline ? config.colors.primary : config.colors.danger;

        const embed = {
            title: isOnline ? '🟢 REDitors Server: OPERATIONAL' : '🔴 REDitors Server: OFFLINE / RECONNECTING',
            description: `Real-time health report for the local PC host server and public edge tunnel.`,
            color,
            fields: [
                {
                    name: 'Local PC Host Server',
                    value: `**Status:** ${health.local.online ? '🟢 Online' : '🔴 Offline'}\n` +
                           `**Endpoint:** \`${config.urls.localServer}\`\n` +
                           `**Latency:** \`${health.local.latency}ms\`\n` +
                           `**Memory:** \`${health.local.data?.memory || 'N/A'}\`\n` +
                           `**Uptime:** \`${health.local.data?.uptime || 'N/A'}\``,
                    inline: true
                },
                {
                    name: 'Public Cloudflare Tunnel',
                    value: `**Status:** ${health.public.online ? '🟢 Online' : '🔴 Offline'}\n` +
                           `**URL:** [pc.reditors.com](${config.urls.publicServer})\n` +
                           `**Latency:** \`${health.public.latency}ms\`\n` +
                           `**R2 Bucket:** ${health.local.data?.r2 ? '✅ Connected' : '⚠️ Offline'}`,
                    inline: true
                },
                {
                    name: 'Host Hardware & Environment',
                    value: `**Machine:** \`${health.system.host}\` (${health.system.platform})\n` +
                           `**CPU Cores:** \`${health.system.cpuCount}\`\n` +
                           `**System RAM:** \`${health.system.usedMemMB}MB used / ${health.system.totalMemMB}MB total\`\n` +
                           `**FFmpeg Core:** \`${health.local.data?.ffmpeg ? 'Hardware Accelerated' : 'Standard'}\``,
                    inline: false
                }
            ],
            footer: { text: `REDitors Server Monitor • Checked at ${new Date().toLocaleTimeString('en-US')}` },
            timestamp: new Date().toISOString()
        };

        await interaction.editReply({ embeds: [embed] });
    }
};
