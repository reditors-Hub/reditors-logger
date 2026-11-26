'use strict';
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config');

/**
 * Toggle a role on/off for the member and reply ephemerally.
 */
async function toggleRole(interaction, roleId, roleName, addMsg, removeMsg) {
    const { member } = interaction;
    const has = member.roles.cache.has(roleId);
    if (has) {
        await member.roles.remove(roleId);
        return interaction.reply({ content: `🗑️ Removed **${roleName}** role.`, ephemeral: true });
    } else {
        await member.roles.add(roleId);
        return interaction.reply({ content: addMsg || `✅ Added **${roleName}** role!`, ephemeral: true });
    }
}

/**
 * Handle button clicks for self-roles and account linking.
 */
async function handleRoleButton(interaction) {
    const { customId, member } = interaction;

    // ── Account Link Modal ──────────────────────────────────────────
    if (customId === 'btn_link_account') {
        const modal = new ModalBuilder()
            .setCustomId('modal_link_account')
            .setTitle('Link REDitors Account');

        const emailInput = new TextInputBuilder()
            .setCustomId('input_email')
            .setLabel('Your reditors.com Account Email')
            .setPlaceholder('name@domain.com')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(emailInput));
        return interaction.showModal(modal);
    }

    // ── Editor Type Roles ───────────────────────────────────────────
    if (customId === 'role_premiere') {
        return toggleRole(interaction, config.roles.premiereEditor, 'Premiere Editor',
            '🎞️ Added **Premiere Editor** role! Welcome to the Premiere Pro crew.');
    }

    if (customId === 'role_davinci') {
        return toggleRole(interaction, config.roles.davinciEditor, 'DaVinci Editor',
            '🎨 Added **DaVinci Editor** role! Welcome to the DaVinci Resolve crew.');
    }

    if (customId === 'role_capcut') {
        return toggleRole(interaction, config.roles.capcutEditor, 'CapCut Editor',
            '✂️ Added **CapCut Editor** role! Welcome to the CapCut crew.');
    }

    if (customId === 'role_pc_editor') {
        return toggleRole(interaction, config.roles.pcEditor, 'PC Editor',
            '🖥️ Added **PC Editor** role!');
    }

    if (customId === 'role_mobile_editor') {
        return toggleRole(interaction, config.roles.mobileEditor, 'Mobile Editor',
            '📱 Added **Mobile Editor** role!');
    }

    // ── Membership Roles ────────────────────────────────────────────
    if (customId === 'role_free_user') {
        const has = member.roles.cache.has(config.roles.freeUser);
        if (has) {
            await member.roles.remove(config.roles.freeUser);
            return interaction.reply({ content: '🗑️ Removed **Free User** role.', ephemeral: true });
        } else {
            await member.roles.add(config.roles.freeUser);
            await member.roles.add(config.roles.member).catch(() => null);
            return interaction.reply({ content: '🆓 Added **Free User** role!', ephemeral: true });
        }
    }

    if (customId === 'role_beta_tester') {
        const has = member.roles.cache.has(config.roles.betaTester);
        if (has) {
            await member.roles.remove(config.roles.betaTester);
            return interaction.reply({ content: '🗑️ Removed **Beta Tester** role.', ephemeral: true });
        } else {
            await member.roles.add(config.roles.betaTester);
            await member.roles.add(config.roles.member).catch(() => null);
            return interaction.reply({ content: '🔬 Added **Beta Tester** role! You now have access to `#beta-testing`.', ephemeral: true });
        }
    }

    if (customId === 'role_member') {
        return toggleRole(interaction, config.roles.member, 'Member', '✨ Added **Member** role!');
    }
}

module.exports = { handleRoleButton };
