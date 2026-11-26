'use strict';
const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    UserSelectMenuBuilder,
    PermissionFlagsBits,
    ChannelType 
} = require('discord.js');
const config = require('./config');

// In-memory store for active temp rooms
// Map<channelId, { ownerId: string, channelId: string, isLocked: boolean, limit: number, controlMsgId?: string }>
const tempRooms = new Map();

/**
 * Handle Voice State Update (Join to Create & Auto Cleanup)
 */
async function handleVoiceState(oldState, newState) {
    try {
        const triggerChannelId = config.channels.tapToCreateVoice || '1553285059883175999';
        const tempCategoryId = config.channels.tempVoiceCategory || '1553285752069165116';

        // DEBUG: log every voice state change so we can verify channel IDs
        if (newState.channelId) {
            console.log(`[VoiceManager DEBUG] Member joined channel: ${newState.channelId} | Trigger ID: ${triggerChannelId} | Match: ${newState.channelId === triggerChannelId}`);
        }

        // 1. Member Joined "Tap To Create"
        if (newState.channelId === triggerChannelId && oldState.channelId !== triggerChannelId) {
            const member = newState.member;
            if (!member || member.user.bot) return;

            const guild = newState.guild;

            // Create custom voice channel under dedicated Temp Voice Category
            const roomName = `🔊│${member.displayName} voice`;
            const voiceChannel = await guild.channels.create({
                name: roomName,
                type: ChannelType.GuildVoice,
                parent: tempCategoryId,
                position: 99, // Append at the bottom of the category
                bitrate: 256000, // 256kbps High Quality Audio
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.Speak,
                            PermissionFlagsBits.MuteMembers,
                            PermissionFlagsBits.DeafenMembers,
                            PermissionFlagsBits.MoveMembers,
                            PermissionFlagsBits.ManageChannels
                        ]
                    }
                ]
            });

            // Wait 1s for Discord to fully register the new channel before moving the member
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Move member to their newly created voice room
            await newState.setChannel(voiceChannel.id).catch(err => {
                console.error('[VoiceManager] Failed to move member to new room:', err.message);
            });

            // Track room metadata
            const roomData = {
                ownerId: member.id,
                channelId: voiceChannel.id,
                isLocked: false,
                limit: 0
            };
            tempRooms.set(voiceChannel.id, roomData);

            // Send premium Control Panel inside voice text chat
            await sendControlPanel(voiceChannel, member, roomData);
        }

        // 2. Member Joined Any Custom Temp Room (Cancel Pending Auto-Delete Timer)
        if (newState.channelId && newState.channelId !== triggerChannelId) {
            const roomData = tempRooms.get(newState.channelId);
            if (roomData && roomData.deleteTimer) {
                clearTimeout(roomData.deleteTimer);
                roomData.deleteTimer = null;
                console.log(`[VoiceManager] Member joined ${newState.channelId}, cancelled 8s auto-delete timer.`);
            }
        }

        // 3. Member Left a Custom Temp Room (8-Second Auto Cleanup)
        if (oldState.channelId && oldState.channelId !== triggerChannelId) {
            const roomData = tempRooms.get(oldState.channelId);
            if (roomData && oldState.channel) {
                // If room becomes empty, start 8-second countdown before deleting
                if (oldState.channel.members.size === 0) {
                    if (roomData.deleteTimer) {
                        clearTimeout(roomData.deleteTimer);
                    }

                    console.log(`[VoiceManager] Room ${oldState.channelId} is empty. Scheduling 4s auto-deletion...`);
                    roomData.deleteTimer = setTimeout(async () => {
                        try {
                            const guild = oldState.guild;
                            const channelObj = guild.channels.cache.get(oldState.channelId);
                            if (channelObj && channelObj.members.size === 0) {
                                tempRooms.delete(oldState.channelId);
                                await channelObj.delete('Temp voice room empty for 4 seconds').catch(err => {
                                    console.warn('[VoiceManager] Failed to delete empty temp room:', err.message);
                                });
                                console.log(`[VoiceManager] Successfully deleted empty temp room: ${oldState.channelId}`);
                            }
                        } catch (err) {
                            console.error('[VoiceManager] Auto-delete execution error:', err.message);
                        }
                    }, 4000); // 4 seconds countdown
                }
            }
        }
    } catch (err) {
        console.error('[VoiceManager] VoiceStateUpdate Error:', err.message);
    }
}

/**
 * Generate and send the interactive Control Panel embed in the voice channel
 */
async function sendControlPanel(channel, owner, roomData) {
    try {
        // Embed: only the brand image — clean, no text clutter
        const embed = {
            color: 0x7c3aed, // Brand purple
            image: { url: 'https://pub-ed669ef1be614ef2ba5345b04f3a103c.r2.dev/Discord/ChatGPT%20Image%20Sep%2026%2C%202026%2C%2007_31_48%20AM.png' }
        };

        // Row 1 — Core room controls (all Secondary for clean transparent look)
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vctrl_lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vctrl_unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vctrl_trust').setEmoji('👥').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vctrl_block').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vctrl_rename').setEmoji('✏️').setStyle(ButtonStyle.Secondary)
        );

        // Row 2 — Advanced controls
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vctrl_limit').setEmoji('🔢').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vctrl_kick').setEmoji('👟').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vctrl_untrust').setEmoji('🚷').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vctrl_claim').setEmoji('🎖️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('vctrl_transfer').setEmoji('🎁').setStyle(ButtonStyle.Secondary)
        );

        // Row 3 — Unblock
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vctrl_unblock').setEmoji('🔕').setStyle(ButtonStyle.Secondary)
        );

        // Mention owner outside embed so they get a real notification ping
        const msg = await channel.send({
            content: `<@${owner.id}>`,
            embeds: [embed],
            components: [row1, row2, row3]
        });

        roomData.controlMsgId = msg.id;
    } catch (err) {
        console.error('[VoiceManager] Failed to send control panel:', err.message);
    }
}

/**
 * Handle Voice Control Button Interactions
 */
async function handleVoiceButton(interaction) {
    try {
        const { customId, channel, member, guild } = interaction;
        if (!customId.startsWith('vctrl_')) return false;

        let roomData = tempRooms.get(channel.id);
        if (!roomData) {
            // Auto-recover owner from channel permission overwrites
            const ownerOverwrite = channel.permissionOverwrites?.cache?.find(po => 
                po.type === 1 && (po.allow.has(PermissionFlagsBits.ManageChannels) || po.allow.has(PermissionFlagsBits.MoveMembers))
            );
            const detectedOwnerId = ownerOverwrite ? ownerOverwrite.id : member.id;
            roomData = { ownerId: detectedOwnerId, channelId: channel.id, isLocked: false, limit: 0 };
            tempRooms.set(channel.id, roomData);
        }

        const isOwner = roomData.ownerId === member.id;

        // Claim Leadership Button (anyone can click if owner left voice)
        if (customId === 'vctrl_claim') {
            const ownerInVoice = channel.members.has(roomData.ownerId);
            if (ownerInVoice && !isOwner) {
                await interaction.reply({ content: '❌ The current room owner is still active in the voice channel!', ephemeral: true });
                return true;
            }

            roomData.ownerId = member.id;
            await channel.permissionOverwrites.edit(member.id, {
                ViewChannel: true,
                Connect: true,
                Speak: true,
                MuteMembers: true,
                DeafenMembers: true,
                MoveMembers: true,
                ManageChannels: true
            });
            await interaction.reply({ content: `👑 <@${member.id}> is now the new manager of **${channel.name}**!`, ephemeral: false });
            return true;
        }

        // Rest of controls require room owner permissions
        if (!isOwner) {
            await interaction.reply({ content: '⛔ Only the room owner can modify this voice channel!', ephemeral: true });
            return true;
        }

        // Lock Room
        if (customId === 'vctrl_lock') {
            await channel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: false });
            roomData.isLocked = true;
            await interaction.reply({ content: '🔒 **Room Locked!** Only permitted members can connect now.', ephemeral: true });
            return true;
        }

        // Unlock Room
        if (customId === 'vctrl_unlock') {
            await channel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: true });
            roomData.isLocked = false;
            await interaction.reply({ content: '🔓 **Room Unlocked!** Anyone can now join.', ephemeral: true });
            return true;
        }

        // Rename Modal
        if (customId === 'vctrl_rename') {
            const modal = new ModalBuilder()
                .setCustomId('vctrl_modal_rename')
                .setTitle('✏️ Rename Voice Channel');

            const nameInput = new TextInputBuilder()
                .setCustomId('new_room_name')
                .setLabel('Enter New Room Name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(channel.name)
                .setMaxLength(32)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
            await interaction.showModal(modal);
            return true;
        }

        // Limit Modal
        if (customId === 'vctrl_limit') {
            const modal = new ModalBuilder()
                .setCustomId('vctrl_modal_limit')
                .setTitle('👥 Set Room Capacity Limit');

            const limitInput = new TextInputBuilder()
                .setCustomId('new_user_limit')
                .setLabel('Max Users (0 = Unlimited, max 99)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('0')
                .setMaxLength(2)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
            await interaction.showModal(modal);
            return true;
        }

        // Trust/Permit User Select
        if (customId === 'vctrl_trust') {
            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('vctrl_select_trust')
                    .setPlaceholder('🔍 Search or select a member to permit...')
                    .setMaxValues(1)
            );
            await interaction.reply({ content: '👤 **Search and select a member to grant voice permissions:**', components: [row], ephemeral: true });
            return true;
        }

        // Block User Select
        if (customId === 'vctrl_block') {
            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('vctrl_select_block')
                    .setPlaceholder('🔍 Search or select a member to block...')
                    .setMaxValues(1)
            );
            await interaction.reply({ content: '🚫 **Search and select a member to block & disconnect:**', components: [row], ephemeral: true });
            return true;
        }

        // Unpermit User Select
        if (customId === 'vctrl_untrust') {
            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('vctrl_select_untrust')
                    .setPlaceholder('🔍 Search or select a member to unpermit...')
                    .setMaxValues(1)
            );
            await interaction.reply({ content: '🚷 **Search and select a member to revoke their voice access:**', components: [row], ephemeral: true });
            return true;
        }

        // Unblock User Select
        if (customId === 'vctrl_unblock') {
            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('vctrl_select_unblock')
                    .setPlaceholder('🔍 Search or select a member to unblock...')
                    .setMaxValues(1)
            );
            await interaction.reply({ content: '🔕 **Search and select a member to unblock:**', components: [row], ephemeral: true });
            return true;
        }

        // Kick User Select
        if (customId === 'vctrl_kick') {
            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('vctrl_select_kick')
                    .setPlaceholder('🔍 Search or select a member to kick out...')
                    .setMaxValues(1)
            );
            await interaction.reply({ content: '🥾 **Search and select a member to disconnect from voice:**', components: [row], ephemeral: true });
            return true;
        }

        // Transfer Ownership Select
        if (customId === 'vctrl_transfer') {
            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('vctrl_select_transfer')
                    .setPlaceholder('🔍 Search or select the new room manager...')
                    .setMaxValues(1)
            );
            await interaction.reply({ content: '👑 **Search and select a member to transfer room ownership:**', components: [row], ephemeral: true });
            return true;
        }

        return false;
    } catch (err) {
        console.error('[VoiceManager] Button Interaction Error:', err.message);
        return false;
    }
}

/**
 * Handle Voice Modals & Select Menus
 */
async function handleVoiceInteraction(interaction) {
    try {
        const { customId, channel, guild, member } = interaction;
        if (!customId.startsWith('vctrl_')) return false;

        let roomData = tempRooms.get(channel.id);
        if (!roomData) {
            const ownerOverwrite = channel.permissionOverwrites?.cache?.find(po => 
                po.type === 1 && (po.allow.has(PermissionFlagsBits.ManageChannels) || po.allow.has(PermissionFlagsBits.MoveMembers))
            );
            const detectedOwnerId = ownerOverwrite ? ownerOverwrite.id : member.id;
            roomData = { ownerId: detectedOwnerId, channelId: channel.id, isLocked: false, limit: 0 };
            tempRooms.set(channel.id, roomData);
        }

        if (roomData.ownerId !== member.id) {
            await interaction.reply({ content: '⛔ Only the room owner can perform this action.', ephemeral: true });
            return true;
        }

        // Modal Rename Submission
        if (customId === 'vctrl_modal_rename') {
            const newName = interaction.fields.getTextInputValue('new_room_name');
            const formattedName = newName.startsWith('🔊│') ? newName : `🔊│${newName}`;
            await channel.setName(formattedName);
            await interaction.reply({ content: `✏️ Room successfully renamed to **${formattedName}**!`, ephemeral: true });
            return true;
        }

        // Modal Limit Submission
        if (customId === 'vctrl_modal_limit') {
            const limitVal = parseInt(interaction.fields.getTextInputValue('new_user_limit'), 10);
            if (isNaN(limitVal) || limitVal < 0 || limitVal > 99) {
                await interaction.reply({ content: '⚠️ Please enter a valid number between 0 and 99.', ephemeral: true });
                return true;
            }
            await channel.setUserLimit(limitVal);
            roomData.limit = limitVal;
            await interaction.reply({ content: `👥 Room user limit set to **${limitVal === 0 ? 'Unlimited' : limitVal + ' Members'}**!`, ephemeral: true });
            return true;
        }

        // Select Menu Trust User (Permit)
        if (customId === 'vctrl_select_trust') {
            const targetId = interaction.values[0];
            await channel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true });
            await interaction.reply({ content: `✅ Permitted <@${targetId}> to join your room!`, ephemeral: true });
            return true;
        }

        // Select Menu Block User
        if (customId === 'vctrl_select_block') {
            const targetId = interaction.values[0];
            await channel.permissionOverwrites.edit(targetId, { Connect: false });
            const targetMember = channel.members.get(targetId);
            if (targetMember) {
                await targetMember.voice.disconnect().catch(() => null);
            }
            await interaction.reply({ content: `🚫 Blocked <@${targetId}> from entering your room.`, ephemeral: true });
            return true;
        }

        // Select Menu Unpermit User
        if (customId === 'vctrl_select_untrust') {
            const targetId = interaction.values[0];
            // Remove the explicit allow overwrite — resets them back to default role permissions
            await channel.permissionOverwrites.delete(targetId).catch(() => null);
            const targetMember = channel.members.get(targetId);
            if (targetMember && roomData.isLocked) {
                // If room is locked, also disconnect them since they no longer have explicit access
                await targetMember.voice.disconnect().catch(() => null);
            }
            await interaction.reply({ content: `🚷 Removed <@${targetId}>'s voice access from your room.`, ephemeral: true });
            return true;
        }

        // Select Menu Unblock User
        if (customId === 'vctrl_select_unblock') {
            const targetId = interaction.values[0];
            // Remove the explicit Connect: false deny — restores default access
            const overwrite = channel.permissionOverwrites.cache.get(targetId);
            if (overwrite) {
                await channel.permissionOverwrites.delete(targetId).catch(() => null);
            }
            await interaction.reply({ content: `🔕 Unblocked <@${targetId}> — they can now join your room again.`, ephemeral: true });
            return true;
        }

        // Select Menu Kick User
        if (customId === 'vctrl_select_kick') {
            const targetId = interaction.values[0];
            const targetMember = channel.members.get(targetId);
            if (targetMember) {
                await targetMember.voice.disconnect().catch(() => null);
                await interaction.reply({ content: `🥾 Disconnected <@${targetId}> from voice chat.`, ephemeral: true });
            } else {
                await interaction.reply({ content: '⚠️ That user is not currently inside this voice room.', ephemeral: true });
            }
            return true;
        }

        // Select Menu Transfer Ownership
        if (customId === 'vctrl_select_transfer') {
            const targetId = interaction.values[0];
            roomData.ownerId = targetId;
            await channel.permissionOverwrites.edit(targetId, {
                ViewChannel: true,
                Connect: true,
                Speak: true,
                MuteMembers: true,
                DeafenMembers: true,
                MoveMembers: true,
                ManageChannels: true
            });
            await interaction.reply({ content: `👑 Room leadership transferred to <@${targetId}>!`, ephemeral: false });
            return true;
        }

        return false;
    } catch (err) {
        console.error('[VoiceManager] Interaction Error:', err.message);
        return false;
    }
}

/**
 * Active Sweeper Watchdog: Automatically clean up any empty voice channels in temp category after 4 seconds
 */
async function sweepEmptyVoiceChannels(client) {
    try {
        const triggerChannelId = config.channels.tapToCreateVoice || '1553285059883175999';
        const tempCategoryId = config.channels.tempVoiceCategory || '1553285752069165116';

        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) return;

        // Find all voice channels inside Temp Voice category
        const voiceChannels = guild.channels.cache.filter(c => 
            c.type === ChannelType.GuildVoice &&
            c.parentId === tempCategoryId &&
            c.id !== triggerChannelId
        );

        for (const [id, ch] of voiceChannels) {
            if (ch.members.size === 0) {
                let roomData = tempRooms.get(id);
                if (!roomData) {
                    roomData = { channelId: id, ownerId: '', isLocked: false, limit: 0 };
                    tempRooms.set(id, roomData);
                }

                if (!roomData.deleteTimer) {
                    console.log(`[VoiceManager] Sweeper: Channel ${ch.name} (${id}) is empty. Starting 4s countdown...`);
                    roomData.deleteTimer = setTimeout(async () => {
                        try {
                            const currentCh = guild.channels.cache.get(id);
                            if (currentCh && currentCh.members.size === 0) {
                                tempRooms.delete(id);
                                await currentCh.delete('Empty temp voice channel auto-cleanup').catch(() => null);
                                console.log(`[VoiceManager] Sweeper: Successfully deleted empty room ${ch.name} (${id})`);
                            }
                        } catch (err) {
                            console.error('[VoiceManager] Sweeper delete error:', err.message);
                        }
                    }, 4000); // 4 seconds countdown
                }
            } else {
                // Member present -> clear timer if active
                const roomData = tempRooms.get(id);
                if (roomData && roomData.deleteTimer) {
                    clearTimeout(roomData.deleteTimer);
                    roomData.deleteTimer = null;
                }
            }
        }
    } catch (err) {
        console.error('[VoiceManager] Sweeper Watchdog Error:', err.message);
    }
}

module.exports = {
    handleVoiceState,
    handleVoiceButton,
    handleVoiceInteraction,
    sweepEmptyVoiceChannels
};
