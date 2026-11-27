'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('🖊️ Build and post a custom embed (Staff only)')
        .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
        .addStringOption(o => o.setName('description').setDescription('Embed description (supports markdown)').setRequired(true))
        .addStringOption(o => o.setName('color').setDescription('Color theme').setRequired(false)
            .addChoices(
                { name: 'Green (Primary)', value: 'primary' },
                { name: 'Blue (Info)', value: 'info' },
                { name: 'Amber (Warning)', value: 'warning' },
                { name: 'Red (Danger)', value: 'danger' },
                { name: 'Purple', value: 'purple' },
                { name: 'Blurple (Discord)', value: 'secondary' }
            ))
        .addStringOption(o => o.setName('image_url').setDescription('Full image URL to embed').setRequired(false))
        .addStringOption(o => o.setName('footer').setDescription('Footer text').setRequired(false))
        .addBooleanOption(o => o.setName('thumbnail').setDescription('Show REDitors logo as thumbnail').setRequired(false))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (default: current)').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const title    = interaction.options.getString('title');
        const desc     = interaction.options.getString('description');
        const colorKey = interaction.options.getString('color') || 'primary';
        const imageUrl = interaction.options.getString('image_url');
        const footer   = interaction.options.getString('footer') || 'REDitors Community';
        const thumb    = interaction.options.getBoolean('thumbnail') ?? true;
        const channel  = interaction.options.getChannel('channel') || interaction.channel;

        const embed = {
            title,
            description: desc.replace(/\\n/g, '\n'),
            color: config.colors[colorKey] || config.colors.primary,
            footer: { text: footer },
            timestamp: new Date().toISOString()
        };
        if (thumb) embed.thumbnail = { url: config.urls.logoUrl };
        if (imageUrl) embed.image = { url: imageUrl };

        try {
            await channel.send({ embeds: [embed] });
            await interaction.editReply({ content: `✅ Embed posted in <#${channel.id}>.` });
        } catch (err) {
            await interaction.editReply({ content: `❌ Failed to post embed: \`${err.message}\`` });
        }
    }
};
