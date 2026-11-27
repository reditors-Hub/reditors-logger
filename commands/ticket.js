'use strict';
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config');

// Active tickets: userId → ticketChannelId
const activeTickets = new Map();

async function handleTicketModal(interaction) {
    if (interaction.customId !== 'ticket_modal') return false;

    const subject = interaction.fields.getTextInputValue('ticket_subject');
    const details = interaction.fields.getTextInputValue('ticket_details');
    const user    = interaction.user;
    const guild   = interaction.guild;

    if (activeTickets.has(user.id)) {
        const existing = guild.channels.cache.get(activeTickets.get(user.id));
        if (existing) {
            await interaction.reply({
                content: `❌ You already have an open ticket: <#${existing.id}>`,
                ephemeral: true
            });
            return true;
        }
        activeTickets.delete(user.id);
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const staffRole  = config.roles.staffTeam || config.roles.highStaff;
        const category   = guild.channels.cache.find(c => c.name?.toLowerCase().includes('ticket') && c.type === 4);

        const channel = await guild.channels.create({
            name: `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            type: 0, // GuildText
            parent: category?.id,
            topic: `Support ticket by ${user.tag} — ${subject}`,
            permissionOverwrites: [
                { id: guild.id, deny: ['ViewChannel'] },
                { id: user.id,  allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                ...(staffRole ? [{ id: staffRole, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'] }] : [])
            ]
        });

        activeTickets.set(user.id, channel.id);

        const closeBtn = new ActionRowBuilder().addComponents(
            require('discord.js').ButtonBuilder
                ? new (require('discord.js').ButtonBuilder)()
                    .setCustomId(`ticket_close_${user.id}`)
                    .setLabel('Close Ticket')
                    .setEmoji('🔒')
                    .setStyle(require('discord.js').ButtonStyle.Danger)
                : null
        );

        await channel.send({
            content: `<@${user.id}>${staffRole ? ` <@&${staffRole}>` : ''}`,
            embeds: [{
                title: `🎫 New Support Ticket — ${subject}`,
                description: `> ${details}`,
                color: config.colors.info,
                fields: [
                    { name: '👤 Opened By', value: `<@${user.id}> (\`${user.tag}\`)`, inline: true },
                    { name: '📅 Opened',    value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                ],
                footer: { text: 'REDitors Support • Staff will respond shortly' },
                thumbnail: { url: user.displayAvatarURL() },
                timestamp: new Date().toISOString()
            }],
            components: closeBtn.components[0] ? [closeBtn] : []
        });

        await interaction.editReply({ content: `✅ Ticket created: <#${channel.id}>\nA staff member will be with you shortly!` });
    } catch (err) {
        await interaction.editReply({ content: `❌ Failed to create ticket: \`${err.message}\`` });
    }
    return true;
}

async function handleTicketClose(interaction) {
    const id = interaction.customId;
    if (!id.startsWith('ticket_close_')) return false;

    const ownerId = id.replace('ticket_close_', '');
    const channel = interaction.channel;

    await interaction.reply({ content: '🔒 Closing ticket in 5 seconds…', ephemeral: false });
    setTimeout(async () => {
        activeTickets.delete(ownerId);
        await channel.delete('Ticket closed').catch(() => null);
    }, 5000);
    return true;
}

module.exports = {
    handleTicketModal,
    handleTicketClose,

    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('🎫 Open a private support ticket with the REDitors team'),

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('ticket_modal')
            .setTitle('Open a Support Ticket');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('ticket_subject')
                    .setLabel('Subject / Issue Title')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g. Plugin not loading, billing issue…')
                    .setRequired(true)
                    .setMaxLength(100)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('ticket_details')
                    .setLabel('Describe your issue in detail')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Please include your OS, Premiere version, what you tried, any errors…')
                    .setRequired(true)
                    .setMinLength(20)
                    .setMaxLength(1000)
            )
        );

        await interaction.showModal(modal);
    }
};
