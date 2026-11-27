'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
    return createClient(config.supabase.url, config.supabase.serviceKey);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a warning to a member (Staff only)')
        .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for the warning').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason');
        const mod    = interaction.user;

        if (!target) return interaction.editReply({ content: '❌ Member not found in this server.' });
        if (target.user.bot) return interaction.editReply({ content: '❌ Cannot warn bots.' });

        // Store warning in Supabase
        let warnCount = 1;
        try {
            const sb = getSupabase();
            const { data: existing } = await sb
                .from('discord_warnings')
                .select('id')
                .eq('user_id', target.id)
                .eq('guild_id', interaction.guildId);
            warnCount = (existing?.length || 0) + 1;
            await sb.from('discord_warnings').insert({
                user_id: target.id,
                guild_id: interaction.guildId,
                reason,
                moderator_id: mod.id,
                created_at: new Date().toISOString()
            });
        } catch (_) {}

        // DM the user
        const dmEmbed = {
            title: '⚠️ You have been warned',
            description: `You received a warning in **${interaction.guild.name}**.`,
            color: config.colors.warning,
            fields: [
                { name: 'Reason', value: reason, inline: false },
                { name: 'Total Warnings', value: `\`${warnCount}\``, inline: true },
                { name: 'Moderator', value: `${mod.tag}`, inline: true }
            ],
            footer: { text: 'REDitors Moderation • Further violations may result in a kick or ban.' },
            timestamp: new Date().toISOString()
        };
        await target.send({ embeds: [dmEmbed] }).catch(() => null);

        // Log to mod-log / bot-logs
        const logCh = interaction.guild.channels.cache.get(config.channels.botLogs);
        if (logCh) {
            await logCh.send({
                embeds: [{
                    title: '⚠️ Member Warned',
                    color: config.colors.warning,
                    fields: [
                        { name: 'User',      value: `<@${target.id}> (\`${target.user.tag}\`)`, inline: true },
                        { name: 'Moderator', value: `<@${mod.id}>`, inline: true },
                        { name: 'Warnings',  value: `\`${warnCount}\``, inline: true },
                        { name: 'Reason',    value: reason, inline: false }
                    ],
                    thumbnail: { url: target.user.displayAvatarURL() },
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => null);
        }

        await interaction.editReply({
            embeds: [{
                title: '✅ Warning Issued',
                color: config.colors.warning,
                description: `<@${target.id}> has been warned.\n**Reason:** ${reason}\n**Total warnings:** \`${warnCount}\``,
                timestamp: new Date().toISOString()
            }]
        });
    }
};
