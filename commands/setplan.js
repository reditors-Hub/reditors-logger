'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateUserPlan, getUserByEmail } = require('../supabaseClient');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setplan')
        .setDescription('Update user subscription plan in Supabase (Staff only)')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('The user email address')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('plan')
                .setDescription('The plan tier to assign')
                .setRequired(true)
                .addChoices(
                    { name: 'Free', value: 'free' },
                    { name: 'Starter ($12/mo)', value: 'starter' },
                    { name: 'Pro ($29/mo)', value: 'pro' },
                    { name: 'Studio ($79/mo)', value: 'studio' },
                    { name: 'Creator Partner', value: 'affiliated_creator' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const email = interaction.options.getString('email');
        const plan = interaction.options.getString('plan');

        const result = await updateUserPlan(email, plan);
        if (!result.success) {
            return await interaction.editReply({ content: `❌ Error: ${result.message}` });
        }

        // If user is linked to a Discord account in the guild, sync their Discord roles!
        let roleSyncMsg = '';
        if (result.user.metadata?.discord_id) {
            const member = await interaction.guild.members.fetch(result.user.metadata.discord_id).catch(() => null);
            if (member) {
                const isPaid = ['pro', 'studio', 'starter', 'affiliated_creator'].includes(plan);
                if (isPaid) {
                    await member.roles.add(config.roles.subscriberPro).catch(() => null);
                    await member.roles.remove(config.roles.freeUser).catch(() => null);
                    roleSyncMsg = `\n✅ Discord role updated to **Subscriber — Pro** for <@${member.id}>!`;
                } else {
                    await member.roles.remove(config.roles.subscriberPro).catch(() => null);
                    await member.roles.add(config.roles.freeUser).catch(() => null);
                    roleSyncMsg = `\n✅ Discord role updated to **Free User** for <@${member.id}>!`;
                }
            }
        }

        const embed = {
            title: '✅ Plan Updated Successfully',
            description: `Updated plan for **${email}** to **${plan.toUpperCase()}**${roleSyncMsg}`,
            color: config.colors.primary,
            fields: [
                { name: 'Account Email', value: email, inline: true },
                { name: 'New Plan', value: plan.toUpperCase(), inline: true },
                { name: 'Assigned By', value: interaction.user.tag, inline: true }
            ],
            footer: { text: 'REDitors Admin Plan Manager' },
            timestamp: new Date().toISOString()
        };

        await interaction.editReply({ embeds: [embed] });

        // Log to bot-logs
        const logsCh = interaction.guild.channels.cache.get(config.channels.botLogs);
        if (logsCh) {
            await logsCh.send({ embeds: [embed] });
        }
    }
};
