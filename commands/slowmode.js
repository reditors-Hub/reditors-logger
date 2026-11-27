'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set or disable slowmode in a channel (Staff only)')
        .addIntegerOption(o => o.setName('seconds').setDescription('Cooldown in seconds (0 = off, max 21600)').setMinValue(0).setMaxValue(21600).setRequired(true))
        .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const seconds = interaction.options.getInteger('seconds');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await channel.setRateLimitPerUser(seconds, `Slowmode set by ${interaction.user.tag}`);

            const label = seconds === 0 ? 'disabled' :
                          seconds < 60 ? `${seconds}s` :
                          seconds < 3600 ? `${Math.round(seconds/60)}m` : `${Math.round(seconds/3600)}h`;

            await interaction.editReply({
                embeds: [{
                    title: seconds === 0 ? '✅ Slowmode Disabled' : '🐌 Slowmode Set',
                    color: seconds === 0 ? config.colors.success : config.colors.warning,
                    description: seconds === 0
                        ? `Slowmode has been **disabled** in <#${channel.id}>.`
                        : `Slowmode set to **${label}** in <#${channel.id}>.`,
                    timestamp: new Date().toISOString()
                }]
            });
        } catch (err) {
            await interaction.editReply({ content: `❌ Failed: \`${err.message}\`` });
        }
    }
};
