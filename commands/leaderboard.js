'use strict';
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
    return createClient(config.supabase.url, config.supabase.serviceKey);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('📊 Top 10 members by REDitors credit balance'),

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const sb = getSupabase();
            const { data, error } = await sb
                .from('users')
                .select('discord_id, username, credits')
                .order('credits', { ascending: false })
                .limit(10);

            if (error) throw new Error(error.message);
            if (!data || data.length === 0) {
                return interaction.editReply({ content: '📊 No credit data found yet.' });
            }

            const medals = ['🥇', '🥈', '🥉'];
            const rows = data.map((user, i) => {
                const medal = medals[i] || `**${i + 1}.**`;
                const name  = user.username || (user.discord_id ? `<@${user.discord_id}>` : 'Unknown');
                return `${medal} ${name} — \`${user.credits ?? 0} credits\``;
            });

            await interaction.editReply({
                embeds: [{
                    title: '📊 REDitors Credit Leaderboard',
                    description: rows.join('\n'),
                    color: config.colors.primary,
                    thumbnail: { url: config.urls.logoUrl },
                    footer: { text: `REDitors Community • Top ${data.length} users by credits` },
                    timestamp: new Date().toISOString()
                }]
            });
        } catch (err) {
            await interaction.editReply({
                embeds: [{
                    title: '❌ Leaderboard Unavailable',
                    description: `Could not load leaderboard: \`${err.message}\``,
                    color: config.colors.danger,
                    timestamp: new Date().toISOString()
                }]
            });
        }
    }
};
