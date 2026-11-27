'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server (Staff only)')
        .addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
        .addIntegerOption(o => o.setName('delete_days').setDescription('Delete messages from last N days (0–7)').setMinValue(0).setMaxValue(7).setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const target     = interaction.options.getMember('user');
        const targetUser = interaction.options.getUser('user');
        const reason     = interaction.options.getString('reason') || 'No reason provided';
        const days       = interaction.options.getInteger('delete_days') ?? 0;
        const mod        = interaction.user;

        if (!target && !targetUser) return interaction.editReply({ content: '❌ User not found.' });
        if (target && !target.bannable) return interaction.editReply({ content: '❌ I cannot ban this member (higher role or missing perms).' });

        // DM before ban (if still in server)
        if (target) {
            await target.send({
                embeds: [{
                    title: `🔨 You have been banned from ${interaction.guild.name}`,
                    description: `**Reason:** ${reason}`,
                    color: config.colors.danger,
                    fields: [{ name: 'Moderator', value: mod.tag, inline: true }],
                    footer: { text: 'REDitors Moderation' },
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => null);
        }

        await interaction.guild.members.ban(targetUser || target, {
            reason: `[${mod.tag}] ${reason}`,
            deleteMessageDays: days
        });

        const logCh = interaction.guild.channels.cache.get(config.channels.botLogs);
        if (logCh) {
            await logCh.send({
                embeds: [{
                    title: '🔨 Member Banned',
                    color: config.colors.danger,
                    fields: [
                        { name: 'User',       value: `\`${targetUser?.tag || target?.user.tag}\``, inline: true },
                        { name: 'Moderator',  value: `<@${mod.id}>`, inline: true },
                        { name: 'Msg Deleted',value: `\`${days} days\``, inline: true },
                        { name: 'Reason',     value: reason, inline: false }
                    ],
                    thumbnail: { url: targetUser?.displayAvatarURL() || target?.user.displayAvatarURL() },
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => null);
        }

        await interaction.editReply({
            embeds: [{
                title: '✅ Member Banned',
                color: config.colors.danger,
                description: `**${targetUser?.tag || target?.user.tag}** has been banned.\n**Reason:** ${reason}`,
                timestamp: new Date().toISOString()
            }]
        });
    }
};
