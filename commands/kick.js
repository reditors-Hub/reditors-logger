'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server (Staff only)')
        .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for the kick').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const mod    = interaction.user;

        if (!target) return interaction.editReply({ content: '❌ Member not found in this server.' });
        if (target.user.bot) return interaction.editReply({ content: '❌ Cannot kick bots.' });
        if (!target.kickable) return interaction.editReply({ content: '❌ I cannot kick this member (higher role or missing perms).' });

        // DM before kick
        await target.send({
            embeds: [{
                title: `👢 You have been kicked from ${interaction.guild.name}`,
                description: `**Reason:** ${reason}\n\nYou may rejoin using the server invite link.`,
                color: config.colors.danger,
                fields: [
                    { name: 'Moderator', value: mod.tag, inline: true },
                    { name: 'Rejoin', value: `[Click here](${config.urls.invite})`, inline: true }
                ],
                footer: { text: 'REDitors Moderation' },
                timestamp: new Date().toISOString()
            }]
        }).catch(() => null);

        await target.kick(`[${mod.tag}] ${reason}`);

        // Log
        const logCh = interaction.guild.channels.cache.get(config.channels.botLogs);
        if (logCh) {
            await logCh.send({
                embeds: [{
                    title: '👢 Member Kicked',
                    color: config.colors.danger,
                    fields: [
                        { name: 'User',      value: `\`${target.user.tag}\` (${target.id})`, inline: true },
                        { name: 'Moderator', value: `<@${mod.id}>`, inline: true },
                        { name: 'Reason',    value: reason, inline: false }
                    ],
                    thumbnail: { url: target.user.displayAvatarURL() },
                    timestamp: new Date().toISOString()
                }]
            }).catch(() => null);
        }

        await interaction.editReply({
            embeds: [{
                title: '✅ Member Kicked',
                color: config.colors.danger,
                description: `**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`,
                timestamp: new Date().toISOString()
            }]
        });
    }
};
