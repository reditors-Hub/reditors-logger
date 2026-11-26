'use strict';
const fs = require('fs');
const path = require('path');
const { ROLES_SPEC } = require('../deployAboutYouRoles');

async function handleAboutYouSelect(interaction) {
    const { customId, member, values, guild } = interaction;

    let categoryKey = null;
    let categoryName = null;

    if (customId === 'menu_about_skills') {
        categoryKey = 'skills';
        categoryName = 'Skills & Profession';
    } else if (customId === 'menu_about_hobbies') {
        categoryKey = 'hobbies';
        categoryName = 'Hobbies & Passions';
    } else if (customId === 'menu_about_languages') {
        categoryKey = 'languages';
        categoryName = 'Spoken Languages';
    } else {
        return false;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const specList = ROLES_SPEC[categoryKey];
        if (!specList) return false;

        // Load role mapping
        const dataPath = path.join(__dirname, '..', 'data', 'aboutYouRoles.json');
        let roleMap = {};
        if (fs.existsSync(dataPath)) {
            roleMap = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        }

        // Get all role IDs belonging to this category
        const categoryRoleIds = specList.map(item => roleMap[item.key]).filter(Boolean);

        const rolesToAdd = [];
        const rolesToRemove = [];

        for (const roleId of categoryRoleIds) {
            const isSelected = values.includes(roleId);
            const hasRole = member.roles.cache.has(roleId);

            if (isSelected && !hasRole) {
                rolesToAdd.push(roleId);
            } else if (!isSelected && hasRole) {
                rolesToRemove.push(roleId);
            }
        }

        if (rolesToAdd.length > 0) {
            await member.roles.add(rolesToAdd).catch(() => {});
        }
        if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove).catch(() => {});
        }

        const activeRoles = member.roles.cache.filter(r => categoryRoleIds.includes(r.id));
        const activeMentions = activeRoles.size > 0 
            ? activeRoles.map(r => `<@&${r.id}>`).join(' • ')
            : '*None selected*';

        await interaction.editReply({
            content: `✅ Successfully updated your **${categoryName}** roles!\n\n**Current Active Roles:**\n> ${activeMentions}`
        });

        return true;
    } catch (err) {
        console.error('[About You Menu Error]', err);
        await interaction.editReply({
            content: '⚠️ Failed to update roles. Please check with an administrator.'
        }).catch(() => {});
        return true;
    }
}

module.exports = { handleAboutYouSelect };
