'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { syncAllChannels } = require('../syncChannels');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-channels')
        .setDescription('Synchronize and update all Discord info channels with live data (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply({ content: '⏳ Starting full channel synchronization across the server...' });

        const result = await syncAllChannels(interaction.client);
        if (result.success) {
            await interaction.editReply({
                content: `✅ Channel synchronization completed successfully!\n\`\`\`json\n${JSON.stringify(result.results, null, 2)}\n\`\`\``
            });
        } else {
            await interaction.editReply({ content: `❌ Error during sync: ${result.error}` });
        }
    }
};
