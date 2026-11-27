'use strict';
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');

// Latest changelog entries — update these when you ship new features
const CHANGELOG = [
    {
        version: 'v1.2.6',
        date: '2026-11-01',
        type: '🚀 Release',
        changes: [
            'Local PC Hardware-Accelerated Rendering now live',
            'Caption render engine upgraded — 3× faster',
            'Full emoji support in animated captions',
            'Memory spike fix on Railway server (971 MB → 96 MB)',
            'Discord bot now 24/7 on Render cloud',
            'New `/performance` dashboard command with live buttons'
        ]
    },
    {
        version: 'v1.2.5',
        date: '2026-10-14',
        type: '🔧 Patch',
        changes: [
            'Fixed AI Speech Cut crash on long timelines',
            'Improved silence detection accuracy',
            'R2 bucket connection stability improvements'
        ]
    },
    {
        version: 'v1.2.4',
        date: '2026-09-28',
        type: '✨ Feature',
        changes: [
            'Title Animator — 1-click animated titles (FREE)',
            'Faster caption sync algorithm',
            'macOS Apple Silicon (M3/M4) full support'
        ]
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('📋 View the latest REDitors plugin & server changelogs'),

    async execute(interaction) {
        await interaction.deferReply();

        const fields = CHANGELOG.map(entry => ({
            name: `${entry.type} ${entry.version} — ${entry.date}`,
            value: entry.changes.map(c => `• ${c}`).join('\n'),
            inline: false
        }));

        await interaction.editReply({
            embeds: [{
                title: '📋 REDitors Changelog',
                description: 'Latest plugin and server release notes. Full history at [reditors.com](https://reditors.com).',
                color: config.colors.primary,
                thumbnail: { url: config.urls.logoUrl },
                fields,
                footer: { text: `REDitors • Current stable: ${config.versions?.plugin || 'v1.2.6'}` },
                timestamp: new Date().toISOString()
            }]
        });
    }
};
