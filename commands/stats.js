'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getLiveDatabaseStats } = require('../supabaseClient');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View live platform statistics: total users, transcriptions, and plan breakdown'),
    async execute(interaction) {
        await interaction.deferReply();
        const stats = await getLiveDatabaseStats();
        const guild = interaction.guild;

        const embed = {
            title: '📊 REDitors — Live Platform & Community Statistics',
            description: `Real-time analytics pulled directly from the **REDitors Supabase Production Database**.`,
            color: config.colors.primary,
            thumbnail: { url: config.urls.logoUrl },
            fields: [
                {
                    name: '👥 User Accounts',
                    value: `**Total Registered Users:** \`${stats.totalUsers.toLocaleString()}\`\n` +
                           `**Plugin Activated Users:** \`${stats.activeUsers.toLocaleString()}\`\n` +
                           `**Paid / Pro Subscribers:** \`${stats.paidUsers.toLocaleString()}\`\n` +
                           `**Free Tier Users:** \`${stats.freeUsers.toLocaleString()}\``,
                    inline: true
                },
                {
                    name: '🎙️ Production Activity',
                    value: `**AI Transcriptions:** \`${stats.totalTranscriptions.toLocaleString()}\`\n` +
                           `**Discord Community:** \`${guild ? guild.memberCount : 'Active'}\` members\n` +
                           `**Active Server Plans:** \`${stats.plans.length}\` tiers\n` +
                           `**Supported Premiere Versions:** CC 2020-2025`,
                    inline: true
                },
                {
                    name: '📦 Active Production Tiers',
                    value: `• **Free Plan:** Free Title Animator + Monthly Trial Credits\n` +
                           `• **Starter Plan ($12/mo):** 8 hours/mo + 4 hours daily silence removal\n` +
                           `• **Pro Plan ($29/mo):** 20 hours/mo + unlimited silence removal\n` +
                           `• **Studio Plan ($79/mo):** 70 hours/mo + priority rendering queue\n` +
                           `• **Creator Partner:** Dedicated unlimited tier for brand creators`,
                    inline: false
                }
            ],
            footer: { text: `REDitors Supabase Database • Live Data • ${new Date().toLocaleDateString('en-US')}` },
            timestamp: new Date().toISOString()
        };

        await interaction.editReply({ embeds: [embed] });
    }
};
