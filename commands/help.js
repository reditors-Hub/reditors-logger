'use strict';
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📖 Show all REDitors bot commands and what they do'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const categories = [
            {
                name: '📊 Server & Performance',
                value: '`/performance` — Full performance dashboard with live buttons\n`/server-status` — Quick server health check\n`/ping` — Bot latency'
            },
            {
                name: '👤 Community',
                value: '`/userinfo` — View detailed info about any member\n`/serverinfo` — Discord server stats & overview\n`/leaderboard` — Top members by credits\n`/poll` — Create a yes/no or multi-choice poll\n`/giveaway` — Launch a timed giveaway'
            },
            {
                name: '🎫 Support & Utility',
                value: '`/ticket` — Open a private support ticket\n`/feedback` — Send feedback to the team\n`/remind` — Set a personal reminder\n`/tag` — Post a saved quick-reply snippet'
            },
            {
                name: '💰 Credits & Plans',
                value: '`/credits` — Check your REDitors credit balance\n`/addcredits` — Add credits to a user (Staff)\n`/setplan` — Set a user\'s subscription plan (Staff)\n`/lookup` — Look up a user\'s account (Staff)'
            },
            {
                name: '📢 Publishing',
                value: '`/announce` — Publish a branded announcement (Staff)\n`/embed` — Build a custom embed and post it (Staff)\n`/dm-blast` — DM all users with a plan (Staff)'
            },
            {
                name: '🛡️ Moderation',
                value: '`/warn` — Issue a warning (Staff)\n`/kick` — Kick a member (Staff)\n`/ban` — Ban a member (Staff)\n`/purge` — Bulk delete messages (Staff)\n`/slowmode` — Set channel slowmode (Staff)'
            },
            {
                name: '🔗 Info',
                value: '`/download` — Download links for the REDitors plugin\n`/pricing` — View subscription plans & pricing\n`/faq` — Frequently asked questions\n`/link` — Link your Discord to REDitors account\n`/stats` — Your usage statistics'
            }
        ];

        const rows = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Website').setURL('https://reditors.com').setStyle(ButtonStyle.Link),
                new ButtonBuilder().setLabel('Join Discord').setURL(config.urls.invite).setStyle(ButtonStyle.Link),
                new ButtonBuilder().setLabel('Download Plugin').setURL(config.urls.downloadWindows).setStyle(ButtonStyle.Link)
            )
        ];

        await interaction.editReply({
            embeds: [{
                title: '📖 REDitors Bot — Command Reference',
                description: `All **${25}** available slash commands. Use \`/\` to auto-complete any command in Discord.`,
                color: config.colors.primary,
                thumbnail: { url: config.urls.logoUrl },
                fields: categories,
                footer: { text: 'REDitors Bot • Commands marked (Staff) require Manage Members permission' },
                timestamp: new Date().toISOString()
            }],
            components: rows
        });
    }
};
