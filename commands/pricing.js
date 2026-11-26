'use strict';
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pricing')
        .setDescription('View REDitors plans, limits, and pricing tiers'),
    async execute(interaction) {
        const embed = {
            title: '💳 REDitors — Pricing & Subscription Tiers',
            description: `Unlock high-speed AI tools in Premiere Pro. Every paid plan includes priority transcription and export features.`,
            color: config.colors.primary,
            fields: [
                {
                    name: '⚪ Free Plan ($0/mo)',
                    value: `• **Title Animator:** 100% Free & Unlimited presets\n` +
                           `• **Auto Captions:** 8 minutes/mo trial\n` +
                           `• **Silence Remover:** 30 minutes daily limit\n` +
                           `• **Speech Cut:** 8 minutes/mo trial`,
                    inline: false
                },
                {
                    name: '🔵 Starter Plan ($12/mo · $9.60/mo billed yearly)',
                    value: `• **Auto Captions:** 8 Hours / month (28,800 sec)\n` +
                           `• **Silence Remover:** 4 Hours daily limit\n` +
                           `• **Speech Cut:** 8 Hours / month\n` +
                           `• **Title Animator:** Unlimited Presets`,
                    inline: false
                },
                {
                    name: '🟢 Pro Plan ($29/mo · $23.20/mo billed yearly) — Most Popular',
                    value: `• **Auto Captions:** 20 Hours / month (72,000 sec)\n` +
                           `• **Silence Remover:** **Unlimited Daily Use**\n` +
                           `• **Speech Cut:** 20 Hours / month\n` +
                           `• **Priority GPU Processing** & Discord Pro Role`,
                    inline: false
                },
                {
                    name: '🟣 Studio Plan ($79/mo · $63/mo billed yearly)',
                    value: `• **Auto Captions:** 70 Hours / month (252,000 sec)\n` +
                           `• **Silence Remover:** **Unlimited**\n` +
                           `• **Speech Cut:** 70 Hours / month\n` +
                           `• **Team Seats:** 3 Editor Seats + Dedicated Queue`,
                    inline: false
                }
            ],
            footer: { text: 'Upgrade anytime at reditors.com/pricing' }
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('View Pricing & Plans')
                .setStyle(ButtonStyle.Link)
                .setURL(`${config.urls.website}/Pages/pricing.html`)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
