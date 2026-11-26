'use strict';
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot heartbeat, WebSocket ping, and server response time'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiPing = Math.round(interaction.client.ws.ping);

        await interaction.editReply({
            content: null,
            embeds: [{
                title: '🏓 Pong! Bot Latency & Heartbeat',
                color: config.colors.primary,
                fields: [
                    { name: 'Gateway Latency', value: `\`${latency}ms\``, inline: true },
                    { name: 'WebSocket Heartbeat', value: `\`${apiPing}ms\``, inline: true },
                    { name: 'Node.js Runtime', value: `\`${process.version}\``, inline: true }
                ],
                footer: { text: 'REDitors Discord Bot • Active' },
                timestamp: new Date().toISOString()
            }]
        });
    }
};
