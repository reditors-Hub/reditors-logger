'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');

// Built-in tags + extensible at runtime (staff can add via /tag add)
const TAGS = new Map([
    ['download', {
        title: '📥 Download REDitors Plugin',
        description: `Get the latest version of the REDitors Premiere Pro plugin:\n\n` +
                     `🪟 **Windows:** [Download v1.2.6 (.exe)](${config.urls.downloadWindows})\n` +
                     `🍎 **macOS:** [Download v1.2.6 (.pkg)](${config.urls.downloadMac})\n` +
                     `📦 **ZXP:** [Download .zxp](${config.urls.downloadZxp || 'https://reditors.com/Pages/plugin-download.html'})`,
        color: 'primary'
    }],
    ['pricing', {
        title: '💳 REDitors Pricing Plans',
        description: `Visit our pricing page for the latest plans:\n\n[🔗 View Pricing →](https://reditors.com/Pages/pricing.html)`,
        color: 'primary'
    }],
    ['premiere', {
        title: '🎬 Supported Premiere Pro Versions',
        description: `REDitors requires **Adobe Premiere Pro CC 2020+** (v14.2 or higher).\n\n` +
                     `✅ Windows 10/11\n✅ macOS (Intel + Apple Silicon M1–M4)\n❌ Premiere Rush / Elements not supported`,
        color: 'info'
    }],
    ['reinstall', {
        title: '🔄 How to Reinstall REDitors',
        description: `1. Fully close Adobe Premiere Pro\n2. Uninstall via Control Panel (Windows) or drag to Trash (Mac)\n` +
                     `3. Delete leftover files in \`/CEP/extensions/REDitors\`\n4. Download the latest installer and run as Administrator\n5. Relaunch Premiere Pro\n\n` +
                     `Still stuck? Open a ticket with \`/ticket\``,
        color: 'warning'
    }],
    ['invite', {
        title: '📨 Server Invite',
        description: `Share the REDitors Discord with other editors!\n\n[🔗 Join REDitors Community](${config.urls.invite})`,
        color: 'primary'
    }],
    ['rules', {
        title: '📜 Community Rules Summary',
        description: `1. Be respectful to all members\n2. No spam or self-promotion without permission\n3. Keep discussions in the right channels\n4. No piracy or crack sharing\n5. Listen to staff — their word is final\n\nFull rules: <#1497004974666678293>`,
        color: 'info'
    }]
]);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tag')
        .setDescription('📌 Post a saved quick-reply snippet')
        .addStringOption(o => o.setName('name').setDescription('Tag to post').setRequired(true)
            .addChoices(...[...TAGS.keys()].map(k => ({ name: k, value: k }))))
        .addUserOption(o => o.setName('mention').setDescription('Optionally mention a user with the tag').setRequired(false))
        .addChannelOption(o => o.setName('channel').setDescription('Post in a different channel (Staff)').addChannelTypes(ChannelType.GuildText).setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        const name    = interaction.options.getString('name');
        const mention = interaction.options.getUser('mention');
        const channel = interaction.options.getChannel('channel');

        const tag = TAGS.get(name);
        if (!tag) return interaction.editReply({ content: `❌ Tag \`${name}\` not found.` });

        // If posting to another channel, need ManageMessages
        if (channel && channel.id !== interaction.channelId) {
            const member = interaction.member;
            if (!member.permissions.has('ManageMessages')) {
                return interaction.editReply({ content: '❌ You need Manage Messages permission to post to another channel.' });
            }
            await channel.send({
                content: mention ? `<@${mention.id}>` : undefined,
                embeds: [{
                    title: tag.title,
                    description: tag.description,
                    color: config.colors[tag.color] || config.colors.primary,
                    thumbnail: { url: config.urls.logoUrl },
                    footer: { text: `REDitors • Tag: ${name}` },
                    timestamp: new Date().toISOString()
                }]
            });
            return interaction.editReply({ content: `✅ Tag posted in <#${channel.id}>.` });
        }

        await interaction.editReply({
            content: mention ? `<@${mention.id}>` : undefined,
            embeds: [{
                title: tag.title,
                description: tag.description,
                color: config.colors[tag.color] || config.colors.primary,
                thumbnail: { url: config.urls.logoUrl },
                footer: { text: `REDitors • Tag: ${name}` },
                timestamp: new Date().toISOString()
            }]
        });
    }
};
