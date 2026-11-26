'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');

const TEMPLATES = {
    'promo': {
        name: 'Platform Overview',
        color: config.colors.primary,
        title: 'Level Up Your Editing Workflow',
        description: `Save **2–3 hours per project**. REDitors automates the most time-draining parts of editing so you can focus on the creative work.\n\n` +
                     `⚡ **AI Silence Remover** — Cuts all silence automatically. Unlimited use included.\n` +
                     `🎙️ **Auto Captions** — AI captions synced to your Premiere timeline in seconds.\n` +
                     `✂️ **AI Speech Cut** — Edit by transcript, not timecodes.\n` +
                     `✨ **Title Animator** — One-click animated titles. **FREE.**\n\n` +
                     `→ **[Try REDitors Free](https://reditors.com)**`,
        fieldName: '📥 Get Started Free',
        fieldValue: 'No card required · Installs in 60 seconds · Works with Premiere Pro CC+\n[Download Now →](https://reditors.com/Pages/plugin-download.html)'
    },
    'affiliate': {
        name: 'Affiliate Partner Invite',
        color: config.colors.primary,
        title: 'Earn with REDitors — Affiliate Program Open',
        description: `We're opening up our affiliate program and we want **creators like you** to be part of it.\n\n` +
                     `💰 **15–30% recurring commission** on every subscriber you refer, paid monthly\n` +
                     `🔑 **Free full plugin access** from day one — use it, love it, promote it\n` +
                     `🚀 **No follower minimums** — open to everyone\n` +
                     `⏱️ Applications reviewed within **24 hours**`,
        fieldName: '📋 Apply in 2 Minutes',
        fieldValue: 'No cost. No commitment. Just recurring income.\n[Apply as Affiliate Partner →](https://reditors.com/affiliate-register)'
    },
    'feature': {
        name: 'New Feature Drop',
        color: config.colors.secondary,
        title: '🚀 New Feature: Local Host Rendering is Live',
        description: `We just shipped something big — and you're hearing it first.\n\n` +
                     `**Local PC Hardware Accelerated Rendering** is now live across the platform.\n\n` +
                     `✅ **3x faster export speeds** for timeline captions\n` +
                     `✅ **Full emoji & trending fonts support**\n` +
                     `✅ **Zero Cloudflare bandwidth throttling**\n\n` +
                     `→ **[Update Your Plugin Now](https://reditors.com/Pages/plugin-download.html)**`,
        fieldName: '📢 Available Now',
        fieldValue: 'Update your plugin to v1.2.6 to get access immediately.'
    },
    'sale': {
        name: 'Limited Promo / Sale',
        color: config.colors.warning,
        title: '⚡ Limited Offer — Save 20% on Annual Plans',
        description: `Get 20% off any REDitors annual plan and unlock unlimited Silence Removal and 20+ hours of AI Captions every month.\n\n` +
                     `🎯 **Instant timeline automation in Premiere Pro**\n` +
                     `🔒 **Locked in for life** — your renewal rate never increases`,
        fieldName: '🛒 Claim Your Discount',
        fieldValue: 'Visit the pricing page below to get started.\n[Claim Offer →](https://reditors.com/Pages/pricing.html)'
    },
    'community': {
        name: 'Community Question',
        color: config.colors.info,
        title: 'Quick question for the editors here 👇',
        description: `We're always building based on your feedback — so here's a genuine question:\n\n` +
                     `**What's the most time-consuming part of your editing workflow right now?**\n\n` +
                     `Drop your answer below in **#general**. Every reply gets read by the team.\n\n` +
                     `*(We're actively building features based on your answers.)*`,
        fieldName: '',
        fieldValue: ''
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Publish an official announcement or promo template (Staff only)')
        .addStringOption(option =>
            option.setName('template')
                .setDescription('The promotional template to send')
                .setRequired(true)
                .addChoices(
                    { name: 'Platform Overview (Promo)', value: 'promo' },
                    { name: 'Affiliate Partner Invite', value: 'affiliate' },
                    { name: 'New Feature Drop', value: 'feature' },
                    { name: 'Limited Promo / Sale', value: 'sale' },
                    { name: 'Community Question', value: 'community' }
                ))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send announcement to (defaults to #announcements)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('mention')
                .setDescription('Optional ping: none, here, or everyone')
                .setRequired(false)
                .addChoices(
                    { name: 'None', value: 'none' },
                    { name: '@here', value: 'here' },
                    { name: '@everyone', value: 'everyone' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const tplKey = interaction.options.getString('template');
        const channel = interaction.options.getChannel('channel') ||
                        interaction.guild.channels.cache.get(config.channels.announcements);
        const mention = interaction.options.getString('mention') || 'none';

        const tpl = TEMPLATES[tplKey];
        if (!tpl) {
            return await interaction.editReply({ content: '❌ Invalid template selected.' });
        }

        const embed = {
            title: tpl.title,
            description: tpl.description,
            color: tpl.color,
            thumbnail: { url: config.urls.logoUrl },
            footer: { text: 'REDitors Team' },
            timestamp: new Date().toISOString()
        };

        if (tpl.fieldName && tpl.fieldValue) {
            embed.fields = [{ name: tpl.fieldName, value: tpl.fieldValue, inline: false }];
        }

        let content = '';
        if (mention === 'everyone') content = '@everyone';
        else if (mention === 'here') content = '@here';

        await channel.send({ content: content || undefined, embeds: [embed] });
        await interaction.editReply({ content: `✅ Announcement published to <#${channel.id}>!` });
    }
};
