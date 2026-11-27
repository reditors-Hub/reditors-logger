'use strict';
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');

// reminderId → { userId, channelId, message, timeout }
const reminders = new Map();
let reminderCounter = 0;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('⏰ Set a personal reminder — the bot will DM or ping you')
        .addStringOption(o => o.setName('time').setDescription('When? e.g. 10m, 2h, 1d, 30s').setRequired(true))
        .addStringOption(o => o.setName('message').setDescription('What to remind you about').setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const timeStr = interaction.options.getString('time').toLowerCase().trim();
        const message = interaction.options.getString('message');
        const user    = interaction.user;

        // Parse duration
        const match = timeStr.match(/^(\d+)\s*(s|m|h|d)$/);
        if (!match) {
            return interaction.editReply({ content: '❌ Invalid time format. Use `10s`, `5m`, `2h`, `1d`.' });
        }
        const val  = parseInt(match[1], 10);
        const unit = match[2];
        const ms   = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] * val;

        if (ms > 7 * 24 * 60 * 60 * 1000) {
            return interaction.editReply({ content: '❌ Max reminder time is **7 days**.' });
        }

        const fireAt  = Math.floor((Date.now() + ms) / 1000);
        const id      = ++reminderCounter;

        const timeout = setTimeout(async () => {
            reminders.delete(id);
            const dmEmbed = {
                title: '⏰ Reminder!',
                description: message,
                color: config.colors.info,
                fields: [{ name: '📍 Set in', value: `${interaction.guild.name}`, inline: true }],
                footer: { text: 'REDitors Reminder System' },
                timestamp: new Date().toISOString()
            };
            // Try DM first, then channel ping
            const sent = await user.send({ embeds: [dmEmbed] }).catch(() => null);
            if (!sent) {
                const ch = interaction.channel;
                if (ch) {
                    await ch.send({ content: `<@${user.id}> ⏰ **Reminder:** ${message}` }).catch(() => null);
                }
            }
        }, ms);

        reminders.set(id, { userId: user.id, message, timeout });

        await interaction.editReply({
            embeds: [{
                title: '✅ Reminder Set',
                description: `I'll remind you <t:${fireAt}:R>!\n> **${message}**`,
                color: config.colors.success,
                footer: { text: "You'll be notified via DM (or pinged here if DMs are off)" },
                timestamp: new Date().toISOString()
            }]
        });
    }
};
