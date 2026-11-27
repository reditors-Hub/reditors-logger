'use strict';
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config');

async function handleFeedbackModal(interaction) {
    if (interaction.customId !== 'feedback_modal') return false;

    await interaction.deferReply({ ephemeral: true });
    const type    = interaction.fields.getTextInputValue('feedback_type');
    const message = interaction.fields.getTextInputValue('feedback_message');
    const user    = interaction.user;

    // Post to staff channel or bot-logs
    const staffCh = interaction.guild.channels.cache.get(config.channels.staffChat)
                 || interaction.guild.channels.cache.get(config.channels.botLogs);

    if (staffCh) {
        await staffCh.send({
            embeds: [{
                title: `📬 New Feedback — ${type}`,
                description: message,
                color: config.colors.info,
                fields: [
                    { name: '👤 From',    value: `<@${user.id}> (\`${user.tag}\`)`, inline: true },
                    { name: '📋 Type',    value: `\`${type}\``,                      inline: true }
                ],
                thumbnail: { url: user.displayAvatarURL() },
                footer: { text: 'REDitors Feedback System' },
                timestamp: new Date().toISOString()
            }]
        }).catch(() => null);
    }

    await interaction.editReply({
        embeds: [{
            title: '✅ Feedback Sent!',
            description: `Thank you, **${user.username}**! Your feedback has been received by the REDitors team. We read every submission. 💚`,
            color: config.colors.success,
            footer: { text: 'REDitors Team • We appreciate your input' },
            timestamp: new Date().toISOString()
        }]
    });
    return true;
}

module.exports = {
    handleFeedbackModal,

    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('📬 Send feedback or a feature request to the REDitors team'),

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('feedback_modal')
            .setTitle('Send Feedback to REDitors');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('feedback_type')
                    .setLabel('Type of feedback')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Bug Report / Feature Request / General Feedback')
                    .setRequired(true)
                    .setMaxLength(50)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('feedback_message')
                    .setLabel('Your feedback')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Describe your feedback in detail…')
                    .setRequired(true)
                    .setMinLength(10)
                    .setMaxLength(1500)
            )
        );

        await interaction.showModal(modal);
    }
};
