'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addCredits } = require('../supabaseClient');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcredits')
        .setDescription('Add or adjust user credits in Supabase (Staff only)')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('The user email address')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of credits to add (e.g. 50, 100, -20)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const email = interaction.options.getString('email');
        const amount = interaction.options.getInteger('amount');

        const result = await addCredits(email, amount);
        if (!result.success) {
            return await interaction.editReply({ content: `❌ Error: ${result.message}` });
        }

        const embed = {
            title: '✅ Credits Updated Successfully',
            description: `Adjusted credits for **${email}**`,
            color: config.colors.success,
            fields: [
                { name: 'Previous Balance', value: `\`${result.prev}\` credits`, inline: true },
                { name: 'Change', value: `\`${amount >= 0 ? '+' + amount : amount}\``, inline: true },
                { name: 'New Balance', value: `\`${result.current}\` credits`, inline: true }
            ],
            footer: { text: `Updated by ${interaction.user.tag}` },
            timestamp: new Date().toISOString()
        };

        await interaction.editReply({ embeds: [embed] });

        // Log to bot-logs
        const logsCh = interaction.guild.channels.cache.get(config.channels.botLogs);
        if (logsCh) {
            await logsCh.send({ embeds: [embed] });
        }
    }
};
