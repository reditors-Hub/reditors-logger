'use strict';
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('📋 Display REDitors Discord server stats and overview'),

    async execute(interaction) {
        await interaction.deferReply();
        const guild = interaction.guild;
        await guild.fetch();

        const totalMembers  = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== 'offline' && m.presence?.status).size;
        const botCount      = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount    = totalMembers - botCount;
        const textChannels  = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const roleCount     = guild.roles.cache.size - 1;
        const emojiCount    = guild.emojis.cache.size;
        const boostCount    = guild.premiumSubscriptionCount || 0;
        const boostTier     = guild.premiumTier;
        const createdAt     = Math.floor(guild.createdTimestamp / 1000);
        const owner         = await guild.fetchOwner().catch(() => null);

        await interaction.editReply({
            embeds: [{
                title: `📋 ${guild.name}`,
                description: guild.description || '*No description set*',
                color: config.colors.primary,
                thumbnail: { url: guild.iconURL({ size: 256, dynamic: true }) || config.urls.logoUrl },
                image:     guild.bannerURL({ size: 1024 }) ? { url: guild.bannerURL({ size: 1024 }) } : undefined,
                fields: [
                    { name: '🆔 Server ID',      value: `\`${guild.id}\``,                              inline: true },
                    { name: '👑 Owner',           value: owner ? `<@${owner.id}>` : '`Unknown`',         inline: true },
                    { name: '📅 Created',         value: `<t:${createdAt}:F>`,                           inline: false },
                    { name: '👥 Members',         value: `Total: \`${totalMembers}\` · Humans: \`${humanCount}\` · Bots: \`${botCount}\``, inline: false },
                    { name: '📡 Channels',        value: `💬 Text: \`${textChannels}\` · 🎙️ Voice: \`${voiceChannels}\``, inline: true },
                    { name: '🎭 Roles',           value: `\`${roleCount}\``,                             inline: true },
                    { name: '😄 Emojis',          value: `\`${emojiCount}\``,                            inline: true },
                    { name: '🚀 Boost Level',     value: `Tier \`${boostTier}\` · \`${boostCount}\` boosts`, inline: true },
                    { name: '🔒 Verification',   value: `\`${guild.verificationLevel}\``,               inline: true }
                ],
                footer: { text: `REDitors Community • Requested by ${interaction.user.tag}` },
                timestamp: new Date().toISOString()
            }]
        });
    }
};
