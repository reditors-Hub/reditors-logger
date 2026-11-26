'use strict';
const { linkDiscordAccount } = require('../supabaseClient');
const config = require('../config');

/**
 * Handle submission of the account linking modal.
 */
async function handleLinkModal(interaction) {
    if (interaction.customId !== 'modal_link_account') return;

    await interaction.deferReply({ ephemeral: true });
    const email = interaction.fields.getTextInputValue('input_email');
    const member = interaction.member;

    const result = await linkDiscordAccount(email, interaction.user.id, interaction.user.tag);
    if (!result.success) {
        return await interaction.editReply({
            content: `❌ ${result.message}\nPlease make sure you are registered at **[reditors.com](${config.urls.website})**.`
        });
    }

    const user = result.user;
    const plan = (user.plan_slug || 'free').toLowerCase();
    const isPaid = ['pro', 'studio', 'starter', 'affiliated_creator'].includes(plan);

    let assignedRoleName = 'Free User';
    try {
        await member.roles.add(config.roles.member).catch(() => null);
        if (isPaid) {
            await member.roles.add(config.roles.subscriberPro).catch(() => null);
            await member.roles.remove(config.roles.freeUser).catch(() => null);
            assignedRoleName = 'Subscriber — Pro 💎';
        } else {
            await member.roles.add(config.roles.freeUser).catch(() => null);
            await member.roles.remove(config.roles.subscriberPro).catch(() => null);
            assignedRoleName = 'Free User';
        }
    } catch (e) {
        console.error('[Modal] Error updating member roles:', e.message);
    }

    const embed = {
        title: '🎉 Account Successfully Linked!',
        description: `Your Discord account has been verified and linked to **${user.email}**.`,
        color: isPaid ? config.colors.primary : config.colors.info,
        thumbnail: { url: interaction.user.displayAvatarURL() },
        fields: [
            { name: 'Plan Tier', value: `**${plan.toUpperCase()}**`, inline: true },
            { name: 'Discord Role', value: `**${assignedRoleName}**`, inline: true },
            { name: 'Credits Remaining', value: `\`${user.credits || 0}\` credits`, inline: true }
        ],
        footer: { text: 'REDitors Community Integration' },
        timestamp: new Date().toISOString()
    };

    await interaction.editReply({ embeds: [embed] });

    // Notify bot logs
    const logsCh = interaction.guild.channels.cache.get(config.channels.botLogs);
    if (logsCh) {
        await logsCh.send({
            embeds: [{
                title: '🔗 Account Linked via Modal',
                description: `<@${interaction.user.id}> linked to **${user.email}** (${plan.toUpperCase()})`,
                color: config.colors.success,
                timestamp: new Date().toISOString()
            }]
        });
    }
}

module.exports = { handleLinkModal };
