'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getUserByEmail } = require('../supabaseClient');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lookup')
        .setDescription('Look up a REDitors user account in Supabase (Staff only)')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('The user email address to look up')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const email = interaction.options.getString('email');

        try {
            const user = await getUserByEmail(email);
            if (!user) {
                return await interaction.editReply({
                    content: `❌ No user found with email \`${email}\`.`
                });
            }

            const planSlug = user.plan_slug || 'free';
            const isPaid = ['pro', 'studio', 'starter', 'affiliated_creator'].includes(planSlug);
            const badge = isPaid ? '💎 Paid' : '⚪ Free';

            const embed = {
                title: `👤 User Profile: ${user.display_name || user.full_name || 'Anonymous'}`,
                description: `Account details for **${user.email}**`,
                color: isPaid ? config.colors.primary : config.colors.info,
                fields: [
                    { name: 'User ID / Number', value: `#${user.user_number || 'N/A'}\n\`${user.id}\``, inline: true },
                    { name: 'Plan & Tier', value: `**${planSlug.toUpperCase()}** (${badge})`, inline: true },
                    { name: 'Credits Remaining', value: `\`${user.credits || 0}\` credits`, inline: true },
                    { name: 'Plugin Installed', value: user.plugin_installed ? '✅ Yes' : '❌ No', inline: true },
                    { name: 'Plugin Activated', value: user.plugin_activated ? '✅ Activated' : '⚠️ Pending', inline: true },
                    { name: 'Account Status', value: `\`${user.account_status || 'active'}\``, inline: true },
                    { name: 'Country / Location', value: `${user.country || 'Unknown'} (${user.city || 'N/A'})`, inline: true },
                    { name: 'Signup Date', value: user.created_at ? `<t:${Math.floor(new Date(user.created_at).getTime() / 1000)}:R>` : 'Unknown', inline: true },
                    { name: 'Total Transcriptions', value: `\`${user.total_transcriptions || 0}\``, inline: true }
                ],
                footer: { text: `REDitors Supabase Admin Lookup` },
                timestamp: new Date().toISOString()
            };

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply({ content: `❌ Error querying database: ${err.message}` });
        }
    }
};
