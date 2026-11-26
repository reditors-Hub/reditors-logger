'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { linkDiscordAccount } = require('../supabaseClient');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Discord account to your REDitors web account to sync your subscription role')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('The email you use on reditors.com')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const email = interaction.options.getString('email');
        const member = interaction.member;

        const result = await linkDiscordAccount(email, interaction.user.id, interaction.user.tag);
        if (!result.success) {
            return await interaction.editReply({
                content: `❌ ${result.message}\nMake sure you have registered an account at **[reditors.com](${config.urls.website})** first!`
            });
        }

        const user = result.user;
        const plan = (user.plan_slug || 'free').toLowerCase();
        const isPaid = ['pro', 'studio', 'starter', 'affiliated_creator'].includes(plan);

        // Assign Discord roles
        let roleAssignedName = 'Free User';
        try {
            await member.roles.add(config.roles.member).catch(() => null);
            if (isPaid) {
                await member.roles.add(config.roles.subscriberPro).catch(() => null);
                await member.roles.remove(config.roles.freeUser).catch(() => null);
                roleAssignedName = 'Subscriber — Pro 💎';
            } else {
                await member.roles.add(config.roles.freeUser).catch(() => null);
                await member.roles.remove(config.roles.subscriberPro).catch(() => null);
                roleAssignedName = 'Free User';
            }
        } catch (e) {
            console.error('[Link] Error setting roles:', e.message);
        }

        const embed = {
            title: '🎉 Account Linked Successfully!',
            description: `Your Discord account has been bound to your REDitors account **${user.email}**.`,
            color: isPaid ? config.colors.primary : config.colors.info,
            thumbnail: { url: interaction.user.displayAvatarURL() },
            fields: [
                { name: 'Subscription Plan', value: `**${plan.toUpperCase()}**`, inline: true },
                { name: 'Assigned Role', value: `**${roleAssignedName}**`, inline: true },
                { name: 'Credits Remaining', value: `\`${user.credits || 0}\` credits`, inline: true },
                { name: 'Plugin Status', value: user.plugin_activated ? '✅ Activated' : '⚠️ Install plugin to activate', inline: false }
            ],
            footer: { text: 'REDitors Community Integration' },
            timestamp: new Date().toISOString()
        };

        await interaction.editReply({ embeds: [embed] });

        // Log to bot-logs
        const logsCh = interaction.guild.channels.cache.get(config.channels.botLogs);
        if (logsCh) {
            await logsCh.send({
                embeds: [{
                    title: '🔗 Member Linked Account',
                    description: `<@${interaction.user.id}> (${interaction.user.tag}) linked to **${user.email}**\n**Plan:** ${plan.toUpperCase()} · **Role:** ${roleAssignedName}`,
                    color: config.colors.success,
                    timestamp: new Date().toISOString()
                }]
            });
        }
    }
};
