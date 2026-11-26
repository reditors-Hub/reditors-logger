'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { getUserByEmail, getUserByDiscordId } = require('../supabaseClient');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('credits')
        .setDescription('Check REDitors transcription credits balance')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('Optional: email to check (staff can check any email)')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const emailOpt = interaction.options.getString('email');

        let user = null;
        if (emailOpt) {
            user = await getUserByEmail(emailOpt);
        } else {
            user = await getUserByDiscordId(interaction.user.id);
        }

        if (!user) {
            return await interaction.editReply({
                content: emailOpt
                    ? `❌ No account found for email \`${emailOpt}\`.`
                    : `⚠️ Your Discord account is not yet linked to REDitors. Use \`/link <your_email>\` to link your account!`
            });
        }

        const embed = {
            title: '💳 Your REDitors Credit Balance',
            description: `Account: **${user.email}**`,
            color: config.colors.primary,
            fields: [
                { name: 'Credits Remaining', value: `\`${user.credits || 0}\` credits`, inline: true },
                { name: 'Current Plan', value: `**${(user.plan_slug || 'free').toUpperCase()}**`, inline: true },
                { name: 'Total Transcriptions', value: `\`${user.total_transcriptions || 0}\``, inline: true }
            ],
            footer: { text: 'Need more credits? Upgrade at reditors.com/pricing' }
        };

        await interaction.editReply({ embeds: [embed] });
    }
};
