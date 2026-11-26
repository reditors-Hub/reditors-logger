'use strict';
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Frequently Asked Questions about REDitors, plugins, and setup'),
    async execute(interaction) {
        const embed = {
            title: '❓ REDitors — Quick Help & FAQ',
            description: `Quick answers to the most common questions:`,
            color: config.colors.secondary,
            fields: [
                {
                    name: 'How do I open REDitors in Premiere Pro?',
                    value: 'Restart Premiere Pro after installation. Open **Window ➔ Extensions ➔ REDitors** from the top bar.',
                    inline: false
                },
                {
                    name: 'What Premiere versions are supported?',
                    value: 'Premiere Pro CC 2020 through CC 2025 (v14.2+) on Windows 10/11 and macOS (Intel & Apple Silicon).',
                    inline: false
                },
                {
                    name: 'How do I sync my Pro Discord role?',
                    value: 'Run `/link <email>` here in Discord using the same email you signed up with on reditors.com.',
                    inline: false
                },
                {
                    name: 'Where can I get support?',
                    value: 'Ask in **#general-help**, or open a support ticket in **#license-issues** or **#billing-help**.',
                    inline: false
                }
            ],
            footer: { text: 'REDitors Knowledge Base' }
        };

        await interaction.reply({ embeds: [embed] });
    }
};
