'use strict';
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('download')
        .setDescription('Get official download links for REDitors Adobe Premiere Pro plugin'),
    async execute(interaction) {
        const embed = {
            title: `📥 Download REDitors ${config.versions.plugin}`,
            description: `Official, virus-scanned installation files for **Adobe Premiere Pro CC (2020 - 2025)**.`,
            color: config.colors.primary,
            fields: [
                {
                    name: '🪟 Windows Setup (EXE)',
                    value: `[Download REDitors-Setup-v1.0.11.exe](${config.urls.downloadWindows})\nAuto-installs CEP extension and configures Premiere Pro.`,
                    inline: false
                },
                {
                    name: '🍎 macOS Package (PKG)',
                    value: `[Download REDitors-Setup-mac.pkg](${config.urls.downloadMac})\nSupports Apple Silicon (M1/M2/M3/M4) & Intel Macs.`,
                    inline: false
                },
                {
                    name: '📦 Manual Extension (.ZXP)',
                    value: `[Download reditors-v1.2.6.zxp](${config.urls.downloadZxp})\nInstall via Anastasiy\'s Extension Manager or ZXP Installer.`,
                    inline: false
                }
            ],
            footer: { text: 'REDitors • Work Faster. Create More.' }
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Windows EXE').setStyle(ButtonStyle.Link).setURL(config.urls.downloadWindows),
            new ButtonBuilder().setLabel('macOS PKG').setStyle(ButtonStyle.Link).setURL(config.urls.downloadMac),
            new ButtonBuilder().setLabel('Manual .ZXP').setStyle(ButtonStyle.Link).setURL(config.urls.downloadZxp)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
