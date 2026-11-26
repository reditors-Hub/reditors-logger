'use strict';

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const config = require('../config');

// Dedicated Support Voice Channels (Support 01, 02, 03)
const SUPPORT_VOICE_IDS = [
    '1553263120137457704', // 👑・Support ・01
    '1553263483334688912', // 👑・Support ・02
    '1553263536581509170'  // 👑・Support ・03
];

// Staff roles authorized to handle support calls
const ALLOWED_STAFF_ROLE_IDS = [
    config.roles.founder,
    config.roles.coFounder,
    config.roles.highStaff,
    config.roles.staffTeam,
    config.roles.trialStaff,
    '1561647145268940810', // Trial Staff
    '1561646567575003238', // Staff Team
    '1553234128969670686'  // High Staff
];

// In-memory tracker for active waiting support alerts: memberId -> { messageId, channelId, joinedAt, claimed: boolean }
const activeWaitingAlerts = new Map();

/**
 * Format duration in ms to human-readable timer (e.g. "45s", "2m 15s", "1h 4m")
 */
function formatDuration(ms) {
    if (!ms || ms < 1000) return 'a few seconds';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

/**
 * Send alert message when a member joins Waiting Admin voice channel
 */
async function sendWaitingAdminAlert(channel, member, targetVoiceId) {
    const joinedAtSeconds = Math.floor(Date.now() / 1000);
    const messageContent = [
        `🚨 **SUPPORT ALERT:** <@&1561647145268940810> <@&1561646567575003238> <@&1553234128969670686> — A member is waiting in Admin Support!`,
        `<@${member.id}> (${member.user.username}) joined <#${targetVoiceId}> and is waiting for assistance (<t:${joinedAtSeconds}:R>).`
    ].join('\n');

    const moveButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`btn_move_support_${member.id}`)
            .setLabel('Move to Support')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🟢')
    );

    const alertMsg = await channel.send({
        content: messageContent,
        components: [moveButton]
    });

    // Track active alert with timestamp
    activeWaitingAlerts.set(member.id, {
        messageId: alertMsg.id,
        channelId: channel.id,
        joinedAt: Date.now(),
        claimed: false
    });

    return alertMsg;
}

/**
 * Handle "Move to Support" button interaction
 */
async function handleSupportVoiceButton(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith('btn_move_support_')) return false;

    const targetMemberId = interaction.customId.replace('btn_move_support_', '');

    // 1. Verify caller has staff permissions
    const isStaff = ALLOWED_STAFF_ROLE_IDS.some(rId => rId && interaction.member.roles.cache.has(rId));
    if (!isStaff) {
        await interaction.reply({
            content: '❌ Only Staff members can claim support calls.',
            ephemeral: true
        });
        return true;
    }

    // 2. Verify staff is already connected to a Support voice channel (Support 01, 02, or 03)
    const staffVoiceId = interaction.member.voice?.channelId;
    if (!staffVoiceId || !SUPPORT_VOICE_IDS.includes(staffVoiceId)) {
        await interaction.reply({
            content: '⚠️ You must be connected to one of the Support Voice channels (<#1553263120137457704>, <#1553263483334688912>, or <#1553263536581509170>) first before clicking this button!',
            ephemeral: true
        });
        return true;
    }

    // 3. Fetch waiting member & verify they are still in Waiting Admin voice
    const waitingAdminId = config.channels.waitingAdminVoice || '1553256667049631744';
    const targetMember = await interaction.guild.members.fetch(targetMemberId).catch(() => null);

    const existingAlert = activeWaitingAlerts.get(targetMemberId);
    const joinedTimestamp = existingAlert?.joinedAt || interaction.message.createdTimestamp;

    if (!targetMember || targetMember.voice?.channelId !== waitingAdminId) {
        await interaction.reply({
            content: '⚠️ This member is no longer in the Waiting Admin channel.',
            ephemeral: true
        });
        // Directly delete the alert message and post "Handling by no one"
        const waitTime = formatDuration(Date.now() - joinedTimestamp);
        await interaction.message.delete().catch(() => {});
        await interaction.channel.send({
            content: `🔴 Handling by no one (Waited: ${waitTime})`
        }).catch(() => {});
        activeWaitingAlerts.delete(targetMemberId);
        return true;
    }

    // Mark as claimed so leave listener won't overwrite
    if (existingAlert) {
        existingAlert.claimed = true;
    }

    // 4. Move member into staff's support voice channel
    try {
        await targetMember.voice.setChannel(staffVoiceId, `Support claimed by ${interaction.user.tag}`);
    } catch (moveErr) {
        console.error('[Support Move Error]', moveErr);
        if (existingAlert) existingAlert.claimed = false;
        await interaction.reply({
            content: `❌ Failed to move member: ${moveErr.message}`,
            ephemeral: true
        });
        return true;
    }

    // 5. Update message to "🟢 Handling by @Staff (Waited: ...)"
    const waitTime = formatDuration(Date.now() - joinedTimestamp);
    try {
        await interaction.update({
            content: `🟢 Handling by <@${interaction.user.id}> (Waited: ${waitTime})`,
            embeds: [],
            components: []
        });
    } catch (updateErr) {
        console.error('[Support Alert Update Error]', updateErr);
    }

    // Clean up memory
    activeWaitingAlerts.delete(targetMemberId);

    // 6. Send ephemeral confirmation to staff member
    await interaction.followUp({
        content: `✅ Successfully moved <@${targetMember.id}> to your support channel (<#${staffVoiceId}>)!`,
        ephemeral: true
    }).catch(() => {});

    return true;
}

/**
 * Handle when a member leaves Waiting Admin voice channel without being handled
 */
async function handleWaitingAdminLeave(member, guild) {
    const alert = activeWaitingAlerts.get(member.id);
    if (alert && alert.claimed) return; // Already claimed by staff, do nothing

    if (alert) activeWaitingAlerts.delete(member.id);

    try {
        const notifChId = config.channels.supportNotification || '1553264156117827655';
        const notifCh = guild.channels.cache.get(notifChId) 
                     || await guild.channels.fetch(notifChId).catch(() => null);
        if (!notifCh) return;

        let targetMessage = null;
        if (alert?.messageId) {
            targetMessage = await notifCh.messages.fetch(alert.messageId).catch(() => null);
        }

        // Fallback: search recent messages for this member's Move button if not found in memory
        if (!targetMessage) {
            const recent = await notifCh.messages.fetch({ limit: 25 }).catch(() => null);
            if (recent) {
                targetMessage = recent.find(m => 
                    m.components?.some(row => 
                        row.components?.some(btn => btn.customId === `btn_move_support_${member.id}`)
                    )
                );
            }
        }

        // If message exists and still has components (not yet claimed), delete it and send "Handling by no one"
        if (targetMessage && targetMessage.components && targetMessage.components.length > 0) {
            const joinedTimestamp = alert?.joinedAt || targetMessage.createdTimestamp;
            const waitTime = formatDuration(Date.now() - joinedTimestamp);

            await targetMessage.delete().catch(() => {});
            console.log(`[Support Alert] Member ${member.user?.tag || member.id} left Waiting Admin unhandled. Alert deleted.`);

            await notifCh.send({
                content: `🔴 Handling by no one (Waited: ${waitTime})`
            }).catch(sendErr => {
                console.error('[Support Leave Send Error]', sendErr.message);
            });
            console.log(`[Support Alert] Sent "🔴 Handling by no one (Waited: ${waitTime})" to notification channel.`);
        }
    } catch (err) {
        console.error('[Support Leave Error]', err.message);
    }
}

module.exports = {
    sendWaitingAdminAlert,
    handleSupportVoiceButton,
    handleWaitingAdminLeave,
    SUPPORT_VOICE_IDS
};
