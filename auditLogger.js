'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const config = require('./config');

const LOG_CHANNELS = {
    joinedVoice: '1561619423071182918',
    leftVoice: '1561619427412148306',
    moveMembers: '1561619430788825131',
    disconnect: '1561619435243044904',
    roleCreated: '1561619441341431889',
    roleGiven: '1561619455371382806',
    roleRemoved: '1561619467136401468',
    timeout: '1561619462808145932',
    channelCreated: '1561619470630264952',
    channelDeleted: '1561619474015199253',
    messageEdited: '1561619477316116592',
    messageDeleted: '1561619482722439310',
    automod: '1561619489123078184',
    nicknameChanged: '1561619494567280650',
    joinLeave: '1561619498572709930'
};

async function sendEmbed(client, channelId, embed) {
    try {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) return;
        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (channel) {
            await channel.send({ embeds: [embed] }).catch(() => null);
        }
    } catch (_) {}
}

function initAuditLogger(client) {
    console.log('[AuditLogger] Initializing native event logging for granular channels...');

    // 1. Message Deleted
    client.on(Events.MessageDelete, async message => {
        try {
            if (!message.guild || message.author?.bot) return;
            const embed = new EmbedBuilder()
                .setTitle('🗑️ Message Deleted')
                .setColor(config.colors.danger || 0xef4444)
                .addFields(
                    { name: '👤 Author', value: `<@${message.author.id}> (\`${message.author.tag}\`)`, inline: true },
                    { name: '📍 Channel', value: `<#${message.channelId}>`, inline: true },
                    { name: '💬 Content', value: message.content ? (message.content.length > 1000 ? message.content.slice(0, 1000) + '...' : message.content) : '*No text content (or media)*' }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();
            await sendEmbed(client, LOG_CHANNELS.messageDeleted, embed);
        } catch (_) {}
    });

    // 2. Message Edited
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
        try {
            if (!newMessage.guild || newMessage.author?.bot) return;
            if (oldMessage.content === newMessage.content) return;
            const embed = new EmbedBuilder()
                .setTitle('✏️ Message Edited')
                .setColor(config.colors.warning || 0xfbbf24)
                .addFields(
                    { name: '👤 Author', value: `<@${newMessage.author.id}> (\`${newMessage.author.tag}\`)`, inline: true },
                    { name: '📍 Channel', value: `<#${newMessage.channelId}>`, inline: true },
                    { name: '🔗 Jump', value: `[Go to message](${newMessage.url})`, inline: true },
                    { name: '⏮️ Before', value: oldMessage.content ? (oldMessage.content.length > 500 ? oldMessage.content.slice(0, 500) + '...' : oldMessage.content) : '*Unknown*' },
                    { name: '⏭️ After', value: newMessage.content ? (newMessage.content.length > 500 ? newMessage.content.slice(0, 500) + '...' : newMessage.content) : '*Empty*' }
                )
                .setThumbnail(newMessage.author.displayAvatarURL())
                .setTimestamp();
            await sendEmbed(client, LOG_CHANNELS.messageEdited, embed);
        } catch (_) {}
    });

    // 3. Voice States (Joined, Left, Moved, Disconnected)
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        try {
            const member = newState.member || oldState.member;
            if (!member || member.user.bot) return;

            // Joined Voice
            if (!oldState.channelId && newState.channelId) {
                const embed = new EmbedBuilder()
                    .setTitle('🔊 Member Joined Voice')
                    .setColor(config.colors.success || 0x10b981)
                    .setDescription(`<@${member.id}> joined **<#${newState.channelId}>**`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();
                await sendEmbed(client, LOG_CHANNELS.joinedVoice, embed);
            }
            // Left Voice
            else if (oldState.channelId && !newState.channelId) {
                const embed = new EmbedBuilder()
                    .setTitle('🔇 Member Left Voice')
                    .setColor(config.colors.danger || 0xef4444)
                    .setDescription(`<@${member.id}> left **<#${oldState.channelId}>**`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();
                await sendEmbed(client, LOG_CHANNELS.leftVoice, embed);
            }
            // Moved Voice
            else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                const embed = new EmbedBuilder()
                    .setTitle('🔄 Member Moved Voice Channel')
                    .setColor(config.colors.info || 0x3b82f6)
                    .setDescription(`<@${member.id}> switched voice room:\n**From:** <#${oldState.channelId}>\n**To:** <#${newState.channelId}>`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();
                await sendEmbed(client, LOG_CHANNELS.moveMembers, embed);
            }
        } catch (_) {}
    });

    // 4. Guild Member Update (Nicknames, Roles Given/Removed, Timeouts)
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        try {
            if (newMember.user.bot) return;

            // Nickname change
            if (oldMember.nickname !== newMember.nickname) {
                const embed = new EmbedBuilder()
                    .setTitle('🏷️ Nickname Changed')
                    .setColor(config.colors.info || 0x3b82f6)
                    .setDescription(`<@${newMember.id}> changed nickname`)
                    .addFields(
                        { name: 'Old Nickname', value: oldMember.nickname || oldMember.user.username, inline: true },
                        { name: 'New Nickname', value: newMember.nickname || newMember.user.username, inline: true }
                    )
                    .setThumbnail(newMember.user.displayAvatarURL())
                    .setTimestamp();
                await sendEmbed(client, LOG_CHANNELS.nicknameChanged, embed);
            }

            // Role given
            const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
            if (addedRoles.size > 0) {
                for (const [, role] of addedRoles) {
                    const embed = new EmbedBuilder()
                        .setTitle('🛡️ Role Assigned')
                        .setColor(role.color || config.colors.primary)
                        .setDescription(`<@${newMember.id}> was given the role **<@&${role.id}>**`)
                        .setThumbnail(newMember.user.displayAvatarURL())
                        .setTimestamp();
                    await sendEmbed(client, LOG_CHANNELS.roleGiven, embed);
                }
            }

            // Role removed
            const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
            if (removedRoles.size > 0) {
                for (const [, role] of removedRoles) {
                    const embed = new EmbedBuilder()
                        .setTitle('⚠️ Role Removed')
                        .setColor(config.colors.warning || 0xfbbf24)
                        .setDescription(`Role **<@&${role.id}>** was removed from <@${newMember.id}>`)
                        .setThumbnail(newMember.user.displayAvatarURL())
                        .setTimestamp();
                    await sendEmbed(client, LOG_CHANNELS.roleRemoved, embed);
                }
            }

            // Timeout added / removed
            if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
                if (newMember.isCommunicationDisabled()) {
                    const until = Math.floor(newMember.communicationDisabledUntilTimestamp / 1000);
                    const embed = new EmbedBuilder()
                        .setTitle('⏳ Member Timed Out')
                        .setColor(config.colors.danger || 0xef4444)
                        .setDescription(`<@${newMember.id}> was placed on timeout until <t:${until}:F> (<t:${until}:R>)`)
                        .setThumbnail(newMember.user.displayAvatarURL())
                        .setTimestamp();
                    await sendEmbed(client, LOG_CHANNELS.timeout, embed);
                } else if (oldMember.isCommunicationDisabled()) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Member Timeout Removed')
                        .setColor(config.colors.success || 0x10b981)
                        .setDescription(`<@${newMember.id}>'s timeout was removed`)
                        .setThumbnail(newMember.user.displayAvatarURL())
                        .setTimestamp();
                    await sendEmbed(client, LOG_CHANNELS.timeout, embed);
                }
            }
        } catch (_) {}
    });

    // 5. Channel Create & Delete
    client.on(Events.ChannelCreate, async channel => {
        try {
            if (!channel.guild || channel.guild.id !== config.guildId) return;
            const embed = new EmbedBuilder()
                .setTitle('📁 Channel Created')
                .setColor(config.colors.success || 0x10b981)
                .setDescription(`Channel **#${channel.name}** was created in category ${channel.parent ? channel.parent.name : '*None*'}`)
                .setTimestamp();
            await sendEmbed(client, LOG_CHANNELS.channelCreated, embed);
        } catch (_) {}
    });

    client.on(Events.ChannelDelete, async channel => {
        try {
            if (!channel.guild || channel.guild.id !== config.guildId) return;
            const embed = new EmbedBuilder()
                .setTitle('🗑️ Channel Deleted')
                .setColor(config.colors.danger || 0xef4444)
                .setDescription(`Channel **#${channel.name}** was deleted`)
                .setTimestamp();
            await sendEmbed(client, LOG_CHANNELS.channelDeleted, embed);
        } catch (_) {}
    });

    // 6. Role Create
    client.on(Events.GuildRoleCreate, async role => {
        try {
            if (!role.guild || role.guild.id !== config.guildId) return;
            const embed = new EmbedBuilder()
                .setTitle('✨ Role Created')
                .setColor(role.color || config.colors.primary)
                .setDescription(`New role **<@&${role.id}>** was created`)
                .setTimestamp();
            await sendEmbed(client, LOG_CHANNELS.roleCreated, embed);
        } catch (_) {}
    });

    // 7. Join / Leave Log
    client.on(Events.GuildMemberAdd, async member => {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🚪 Member Joined')
                .setColor(config.colors.success || 0x10b981)
                .setDescription(`<@${member.id}> (\`${member.user.tag}\`) joined the server`)
                .addFields(
                    { name: 'Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Member Count', value: `\`#${member.guild.memberCount}\``, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();
            await sendEmbed(client, LOG_CHANNELS.joinLeave, embed);
        } catch (_) {}
    });

    client.on(Events.GuildMemberRemove, async member => {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🚪 Member Left')
                .setColor(config.colors.danger || 0xef4444)
                .setDescription(`**${member.user.tag}** left the server`)
                .addFields(
                    { name: 'Joined', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                    { name: 'Remaining Members', value: `\`${member.guild.memberCount}\``, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();
            await sendEmbed(client, LOG_CHANNELS.joinLeave, embed);
        } catch (_) {}
    });

    console.log('[AuditLogger] Native logging listeners registered successfully.');
}

module.exports = { initAuditLogger, LOG_CHANNELS };
