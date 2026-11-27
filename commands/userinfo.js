'use strict';
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('View detailed info about a server member')
        .addUserOption(o => o.setName('user').setDescription('Member to look up (defaults to you)').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const member = interaction.options.getMember('user') || interaction.member;
        const user   = member.user;

        const joinedAt   = Math.floor(member.joinedTimestamp / 1000);
        const createdAt  = Math.floor(user.createdTimestamp / 1000);
        const roles      = member.roles.cache
            .filter(r => r.id !== interaction.guildId)
            .sort((a, b) => b.position - a.position)
            .map(r => `<@&${r.id}>`)
            .slice(0, 10)
            .join(' ') || '`None`';

        const topRole    = member.roles.highest?.id !== interaction.guildId
            ? `<@&${member.roles.highest.id}>`
            : '`None`';

        const flags = user.flags?.toArray() || [];
        const badges = flags.length ? flags.map(f => `\`${f}\``).join(', ') : '`None`';

        await interaction.editReply({
            embeds: [{
                title: `👤 ${user.username}`,
                color: member.displayColor || config.colors.primary,
                thumbnail: { url: user.displayAvatarURL({ size: 256, dynamic: true }) },
                fields: [
                    { name: '🆔 User ID',       value: `\`${user.id}\``,                             inline: true },
                    { name: '🤖 Bot',            value: user.bot ? '`Yes`' : '`No`',                  inline: true },
                    { name: '🏷️ Tag',            value: `\`${user.tag}\``,                             inline: true },
                    { name: '📅 Account Created', value: `<t:${createdAt}:F> (<t:${createdAt}:R>)`,   inline: false },
                    { name: '📥 Joined Server',   value: `<t:${joinedAt}:F> (<t:${joinedAt}:R>)`,     inline: false },
                    { name: '🎖️ Top Role',        value: topRole,                                      inline: true },
                    { name: '📊 Role Count',      value: `\`${member.roles.cache.size - 1}\``,          inline: true },
                    { name: '🏅 Badges',          value: badges,                                       inline: false },
                    { name: '📋 Roles',           value: roles,                                        inline: false }
                ],
                footer: { text: `REDitors Community • Requested by ${interaction.user.tag}` },
                timestamp: new Date().toISOString()
            }]
        });
    }
};
