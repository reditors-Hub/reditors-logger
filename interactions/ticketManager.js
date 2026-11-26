'use strict';

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType,
    OverwriteType
} = require('discord.js');
const config = require('../config');

// Ticket categories configuration
const TICKET_TYPES = {
    help: {
        id: 'ticket_help',
        label: 'Help',
        emoji: '<:Help:1553466779102089366>',
        style: ButtonStyle.Secondary,
        prefix: 'help',
        title: '<:Help:1553466779102089366> General Help & Support Ticket',
        description: 'Thank you for reaching out! Please describe your issue or question in detail. A staff member will assist you shortly.'
    },
    report: {
        id: 'ticket_report',
        label: 'Report',
        emoji: '<:report:1553467840588152903>',
        style: ButtonStyle.Secondary,
        prefix: 'report',
        title: '<:report:1553467840588152903> Member Report Ticket',
        description: 'Please specify the user you are reporting, state the violation, and attach any relevant screenshot or proof.'
    },
    staff: {
        id: 'ticket_staff',
        label: 'Staff Apply',
        emoji: '<:bugreport:1553466744709054484>',
        style: ButtonStyle.Secondary,
        prefix: 'staff',
        title: '<:bugreport:1553466744709054484> Staff Team Application',
        description: 'Thank you for your interest in joining the REDitors Staff Team! Please state your age, experience, timezone, and why you wish to join.'
    }
};

/**
 * Handle ticket buttons (Create Ticket, Close Ticket)
 */
async function handleTicketButton(interaction) {
    const { customId, guild, member } = interaction;

    // Check if it's one of our ticket creation buttons
    const ticketTypeKey = Object.keys(TICKET_TYPES).find(key => TICKET_TYPES[key].id === customId);

    if (ticketTypeKey) {
        const typeConfig = TICKET_TYPES[ticketTypeKey];

        // Ensure roles are cached
        if (guild.roles.cache.size === 0) {
            await guild.roles.fetch().catch(() => {});
        }
        const everyoneRoleId = guild.roles.everyone?.id || guild.id;

        // Check if user already has an open ticket of this type or any open ticket
        const ticketCategory = guild.channels.cache.find(
            c => c.type === ChannelType.GuildCategory && (c.name.includes('ticket') || c.name.includes('TICKET'))
        );

        const existingTicket = guild.channels.cache.find(
            c => c.parentId === (ticketCategory ? ticketCategory.id : null) &&
                 c.topic && c.topic.includes(`Owner: ${member.id}`)
        );

        if (existingTicket) {
            const alreadyOpenMsg = `⚠️ You already have an open ticket in <#${existingTicket.id}>! Please resolve or close that one first.`;
            if (interaction.deferred) {
                await interaction.editReply({ content: alreadyOpenMsg }).catch(() => {});
            } else if (interaction.replied) {
                await interaction.followUp({ content: alreadyOpenMsg, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: alreadyOpenMsg, ephemeral: true }).catch(() => {});
            }
            return true;
        }

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
        }

        let ticketChannel = null;
        try {
            // Permission overwrites for ticket channel
            const permissionOverwrites = [
                {
                    id: everyoneRoleId,
                    type: OverwriteType.Role,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: member.id,
                    type: OverwriteType.Member,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks
                    ]
                }
            ];

            // Add verified High Staff, Staff Team & Founder permissions
            const allowedStaffRoles = [
                config.roles.founder,
                config.roles.coFounder,
                config.roles.highStaff,
                config.roles.staffTeam,
                '1561646567575003238', // Staff Team
                '1553234128969670686', // High Staff
                '1553201506671525938'  // Founder
            ];

            const addedRoleIds = new Set();
            for (const rId of allowedStaffRoles) {
                if (rId && typeof rId === 'string' && !addedRoleIds.has(rId) && guild.roles.cache.has(rId)) {
                    addedRoleIds.add(rId);
                    permissionOverwrites.push({
                        id: rId,
                        type: OverwriteType.Role,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks,
                            PermissionFlagsBits.ManageChannels
                        ]
                    });
                }
            }

            const sanitizedUsername = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
            const channelName = `🎟️・${typeConfig.prefix}-${sanitizedUsername || member.id.slice(-4)}`;

            ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: ticketCategory ? ticketCategory.id : null,
                topic: `Ticket Type: ${typeConfig.label} | Owner: ${member.id} | Created: ${new Date().toISOString()}`,
                permissionOverwrites
            });

            // Post Welcome Embed inside the new ticket channel
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(typeConfig.title)
                .setDescription(
                    `Welcome <@${member.id}>!\n\n` +
                    `${typeConfig.description}\n\n` +
                    `• **Ticket Type:** \`${typeConfig.label}\`\n` +
                    `• **Created By:** <@${member.id}>\n\n` +
                    `*Click the button below to close this ticket.*`
                )
                .setColor(config.colors.primary || '#22c55e')
                .setFooter({ text: 'REDitors Support Ticket System' })
                .setTimestamp();

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_close_ticket')
                    .setLabel('🔒 Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({
                content: `<@${member.id}> ${config.roles.highStaff ? `<@&${config.roles.highStaff}>` : ''}`,
                embeds: [welcomeEmbed],
                components: [closeRow]
            });

            const successMsg = typeConfig.id === 'ticket_staff'
                ? `✅ **Your Staff Application ticket has been successfully created:** <#${ticketChannel.id}>\n👉 Click the channel link above to submit your details!`
                : `✅ **Your ${typeConfig.label} ticket has been successfully created:** <#${ticketChannel.id}>`;

            if (interaction.deferred) {
                await interaction.editReply({ content: successMsg }).catch(() => {});
            } else if (interaction.replied) {
                await interaction.followUp({ content: successMsg, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: successMsg, ephemeral: true }).catch(() => {});
            }
            return true;
        } catch (err) {
            console.error('[Ticket Error] Failed to create ticket channel:', err);
            if (ticketChannel) {
                const successMsg = typeConfig.id === 'ticket_staff'
                    ? `✅ **Your Staff Application ticket has been successfully created:** <#${ticketChannel.id}>\n👉 Click the channel link above to submit your details!`
                    : `✅ **Your ${typeConfig.label} ticket has been successfully created:** <#${ticketChannel.id}>`;

                if (interaction.deferred) {
                    await interaction.editReply({ content: successMsg }).catch(() => {});
                } else if (interaction.replied) {
                    await interaction.followUp({ content: successMsg, ephemeral: true }).catch(() => {});
                } else {
                    await interaction.reply({ content: successMsg, ephemeral: true }).catch(() => {});
                }
                return true;
            }

            const errorMsg = `❌ Failed to create ticket channel: ${err.message}`;
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMsg }).catch(() => {});
            } else if (interaction.replied) {
                await interaction.followUp({ content: errorMsg, ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
            }
            return true;
        }
    }

    // Close ticket handler
    if (customId === 'btn_close_ticket') {
        const { channel } = interaction;
        if (!channel.name.includes('ticket') && !channel.topic?.includes('Owner:')) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '⚠️ This action can only be used in ticket channels.', ephemeral: true }).catch(() => {});
            }
            return true;
        }

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '🔒 Closing and deleting ticket in 5 seconds...' }).catch(() => {});
        } else {
            await interaction.followUp({ content: '🔒 Closing and deleting ticket in 5 seconds...' }).catch(() => {});
        }

        setTimeout(async () => {
            await channel.delete().catch(err => console.error('Error deleting ticket channel:', err));
        }, 5000);
        return true;
    }

    return false;
}

module.exports = { handleTicketButton, TICKET_TYPES };
