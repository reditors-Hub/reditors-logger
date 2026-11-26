'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder 
} = require('discord.js');
const config = require('./config');

const ROLES_SPEC = {
    skills: [
        { key: 'programmer', name: 'Programmer', color: 0x4F46E5, emoji: '💻', description: 'Developers, software & web engineers' },
        { key: 'designer', name: 'Designer', color: 0xEC4899, emoji: '🎨', description: 'UI/UX, thumbnails & graphic designers' },
        { key: 'artist', name: 'Artist', color: 0xF43F5E, emoji: '🖌️', description: 'Digital illustrators & 2D/3D artists' },
        { key: 'photographer', name: 'Photographer', color: 0x06B6D4, emoji: '📸', description: 'Photo editing, photography & colorists' },
        { key: 'video_editor', name: 'Video Editor', color: 0x3B82F6, emoji: '🎬', description: 'Video creators & timeline editors' },
        { key: 'tech_lover', name: 'Tech Lover', color: 0x10B981, emoji: '🌐', description: 'Hardware, AI & technology fans' },
        { key: 'student', name: 'Student', color: 0xF59E0B, emoji: '🎓', description: 'School, college & university students' }
    ],
    hobbies: [
        { key: 'gamer', name: 'Gamer', color: 0x8B5CF6, emoji: '🎮', description: 'PC & console gaming community' },
        { key: 'football', name: 'Football', color: 0x22C55E, emoji: '⚽', description: 'Football & sports fans' },
        { key: 'book_lover', name: 'Book Lover', color: 0xD97706, emoji: '📚', description: 'Reading & self-development books' },
        { key: 'music_lover', name: 'Music Lover', color: 0xA855F7, emoji: '🎵', description: 'Producers, listeners & musicians' },
        { key: 'anime_lover', name: 'Anime Lover', color: 0xE11D48, emoji: '🍿', description: 'Anime, manga & movie fans' },
        { key: 'fitness_gym', name: 'Fitness & Gym', color: 0x6366F1, emoji: '🏋️', description: 'Workouts, fitness & healthy lifestyle' }
    ],
    languages: [
        { key: 'english', name: 'English', color: 0x3B82F6, emoji: '🇬🇧', description: 'Fluent in English' },
        { key: 'french', name: 'French', color: 0x60A5FA, emoji: '🇫🇷', description: 'Parle Français' },
        { key: 'arabic', name: 'Arabic', color: 0x10B981, emoji: '🇩🇿', description: 'يتحدث العربية' },
        { key: 'spanish', name: 'Spanish', color: 0xF59E0B, emoji: '🇪🇸', description: 'Habla Español' },
        { key: 'german', name: 'German', color: 0xF97316, emoji: '🇩🇪', description: 'Spricht Deutsch' },
        { key: 'italian', name: 'Italian', color: 0x14B8A6, emoji: '🇮🇹', description: 'Parla Italiano' },
        { key: 'turkish', name: 'Turkish', color: 0xE11D48, emoji: '🇹🇷', description: 'Türkçe konuşuyor' }
    ]
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function api(endpoint, method = 'GET', body = null) {
    const opts = {
        method,
        headers: {
            Authorization: `Bot ${config.token}`,
            'Content-Type': 'application/json'
        }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`https://discord.com/api/v10${endpoint}`, opts);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Discord API ${method} ${endpoint} returned ${res.status}: ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function deployAboutYou() {
    console.log('===============================================================');
    console.log('🚀 Deploying About You Roles & Multi-Select Interactive Panel');
    console.log('===============================================================');

    // 1. Fetch current roles
    const existingRoles = await api(`/guilds/${config.guildId}/roles`);
    console.log(`Fetched ${existingRoles.length} existing roles.`);

    const roleMap = {};

    // Helper to ensure role exists
    async function ensureRole(item) {
        let role = existingRoles.find(r => r.name.toLowerCase() === item.name.toLowerCase());
        if (role) {
            console.log(`  Existing role found: "${role.name}" (${role.id})`);
            roleMap[item.key] = role.id;
            return role;
        } else {
            console.log(`  Creating new role: "${item.name}"...`);
            const created = await api(`/guilds/${config.guildId}/roles`, 'POST', {
                name: item.name,
                color: item.color,
                hoist: false,
                mentionable: false
            });
            roleMap[item.key] = created.id;
            await sleep(400);
            return created;
        }
    }

    console.log('\n[1/3] Ensuring Skills, Hobbies & Language Roles...');
    for (const cat of Object.keys(ROLES_SPEC)) {
        for (const item of ROLES_SPEC[cat]) {
            await ensureRole(item);
        }
    }

    // Save mapping to data/aboutYouRoles.json
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'aboutYouRoles.json'), JSON.stringify(roleMap, null, 2));
    console.log('\n✅ Role mapping saved to data/aboutYouRoles.json');

    // 2. Post Interactive Panel to #🧩・about・you
    console.log('\n[2/3] Posting Interactive Dropdown Panel to #🧩・about・you...');
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
    await client.login(config.token);

    const channelId = config.channels.aboutYou || '1561619405002113024';
    const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId);

    if (!channel) {
        throw new Error(`Target channel ${channelId} not found!`);
    }

    // Clean old bot messages
    const msgs = await channel.messages.fetch({ limit: 20 });
    for (const m of msgs.values()) {
        if (m.author.id === client.user.id) {
            await m.delete().catch(() => {});
        }
    }

    // Build the 3 Select Menus
    // A) Skills Menu
    const skillsSelect = new StringSelectMenuBuilder()
        .setCustomId('menu_about_skills')
        .setPlaceholder('💼 Select your Skills & Profession...')
        .setMinValues(0)
        .setMaxValues(ROLES_SPEC.skills.length)
        .addOptions(
            ROLES_SPEC.skills.map(s => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(s.name)
                    .setValue(roleMap[s.key])
                    .setDescription(s.description)
                    .setEmoji(s.emoji)
            )
        );

    // B) Hobbies Menu
    const hobbiesSelect = new StringSelectMenuBuilder()
        .setCustomId('menu_about_hobbies')
        .setPlaceholder('🎯 Select your Hobbies & Passions...')
        .setMinValues(0)
        .setMaxValues(ROLES_SPEC.hobbies.length)
        .addOptions(
            ROLES_SPEC.hobbies.map(h => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(h.name)
                    .setValue(roleMap[h.key])
                    .setDescription(h.description)
                    .setEmoji(h.emoji)
            )
        );

    // C) Languages Menu
    const languagesSelect = new StringSelectMenuBuilder()
        .setCustomId('menu_about_languages')
        .setPlaceholder('🌍 Select your Spoken Languages...')
        .setMinValues(0)
        .setMaxValues(ROLES_SPEC.languages.length)
        .addOptions(
            ROLES_SPEC.languages.map(l => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(l.name)
                    .setValue(roleMap[l.key])
                    .setDescription(l.description)
                    .setEmoji(l.emoji)
            )
        );

    const rowSkills = new ActionRowBuilder().addComponents(skillsSelect);
    const rowHobbies = new ActionRowBuilder().addComponents(hobbiesSelect);
    const rowLanguages = new ActionRowBuilder().addComponents(languagesSelect);

    const embed = new EmbedBuilder()
        .setTitle('🧩  REDitors — About You Profile Roles')
        .setDescription(
            '### 💼 Skills & Profession\n' +
            '💻 Programmer • 🎨 Designer • 🖌️ Artist • 📸 Photographer\n' +
            '🎬 Video Editor • 🌐 Tech Lover • 🎓 Student\n\n' +
            '### 🎯 Hobbies & Lifestyle\n' +
            '🎮 Gamer • ⚽ Football • 📚 Book Lover • 🎵 Music Lover\n' +
            '🍿 Anime Lover • 🏋️ Fitness & Gym\n\n' +
            '### 🌍 Spoken Languages\n' +
            '🇬🇧 English • 🇫🇷 French • 🇩🇿 Arabic • 🇪🇸 Spanish\n' +
            '🇩🇪 German • 🇮🇹 Italian • 🇹🇷 Turkish'
        )
        .setColor(0x22c55e);

    await channel.send({
        embeds: [embed],
        components: [rowSkills, rowHobbies, rowLanguages]
    });

    console.log('✅ Panel successfully published in #🧩・about・you!');
    client.destroy();

    console.log('\n===============================================================');
    console.log('🎉 About You Roles & Panel Deployment COMPLETE!');
    console.log('===============================================================');
}

if (require.main === module) {
    deployAboutYou().then(() => {
        setTimeout(() => process.exit(0), 500);
    }).catch(err => {
        console.error('Fatal deployment error:', err);
        process.exit(1);
    });
}

module.exports = { deployAboutYou, ROLES_SPEC };
