'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk-delete messages in this channel (Staff only)')
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1–100)').setMinValue(1).setMaxValue(100).setRequired(true))
        .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const amount = interaction.options.getInteger('amount');
        const filterUser = interaction.options.getUser('user');

        try {
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            let toDelete = [...messages.values()].filter(m => {
                const ageMs = Date.now() - m.createdTimestamp;
                return ageMs < 14 * 24 * 60 * 60 * 1000; // Discord 14-day limit
            });
            if (filterUser) toDelete = toDelete.filter(m => m.author.id === filterUser.id);
            toDelete = toDelete.slice(0, amount);

            const deleted = await interaction.channel.bulkDelete(toDelete, true);

            const logCh = interaction.guild.channels.cache.get(config.channels.botLogs);
            if (logCh) {
                await logCh.send({
                    embeds: [{
                        title: '🗑️ Messages Purged',
                        color: config.colors.warning,
                        fields: [
                            { name: 'Channel',   value: `<#${interaction.channelId}>`, inline: true },
                            { name: 'Deleted',   value: `\`${deleted.size}\` messages`, inline: true },
                            { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
                            ...(filterUser ? [{ name: 'Filter', value: `<@${filterUser.id}>`, inline: true }] : [])
                        ],
                        timestamp: new Date().toISOString()
                    }]
                }).catch(() => null);
            }

            await interaction.editReply({
                embeds: [{
                    title: '✅ Messages Deleted',
                    color: config.colors.success,
                    description: `Deleted **${deleted.size}** message(s) in <#${interaction.channelId}>${filterUser ? ` from **${filterUser.tag}**` : ''}.`,
                    timestamp: new Date().toISOString()
                }]
            });
        } catch (err) {
            await interaction.editReply({ content: `❌ Failed to purge: \`${err.message}\`` });
        }
    }
};
