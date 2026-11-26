'use strict';
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('./config');
const { checkServerHealth, buildServerStatsEmbed } = require('./serverMonitor');
const { getLiveDatabaseStats } = require('./supabaseClient');

/**
 * Clean existing bot messages or posts in a channel and publish a fresh embed.
 */
async function syncRulesChannel(channel) {
    // Clear old bot messages to send a fresh new post
    const msgs = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (msgs) {
        for (const m of msgs.values()) {
            if (m.author.id === channel.client.user.id) {
                await m.delete().catch(() => {});
            }
        }
    }

    const embed = {
        title: '📜 REDitors Community — Official Rules',
        description: `Welcome to **REDitors**! By joining and participating in this server, you agree to follow our official rules below to keep our community safe and professional.\n\n` +
                     `──────────────────────────────`,
        color: config.colors.primary,
        thumbnail: { url: config.urls.logoUrl },
        fields: [
            {
                name: '🤝 1. Respect & Conduct',
                value: '• Treat all members, creators, and staff with respect. Zero toxicity, hate speech, or harassment.\n' +
                       '• No religious, political, or controversial discussions that provoke drama.',
                inline: false
            },
            {
                name: '🚫 2. Advertising & Links',
                value: '• No self-promotion, server invite links, or unsolicited DM advertising.\n' +
                       '• No selling unapproved services, products, or poaching members.',
                inline: false
            },
            {
                name: '💬 3. Chat & Voice Behavior',
                value: '• Keep conversations in relevant channels. No spamming text, emojis, or mass mentions.\n' +
                       '• No loud noises, ear-rape, or soundboard abuse in voice channels.\n' +
                       '• Recording voice rooms without permission from all participants is strictly prohibited.',
                inline: false
            },
            {
                name: '🎮 4. Safety & Piracy',
                value: '• No cracked software, keygens, viruses, or illegal malware sharing.\n' +
                       '• Impersonating staff or using alt accounts to bypass bans will result in an instant permanent ban.',
                inline: false
            },
            {
                name: '🛡️ 5. Staff & Support Tickets',
                value: '• Respect staff decisions. If you have a dispute or issue, open a ticket in <#1553271133741121596>.\n' +
                       '• Staff will **never** ask for your passwords or payment credentials.',
                inline: false
            },
            {
                name: '⚠️ 6. Enforcement & Penalties',
                value: 'Violating rules will lead to: **Warning** ➔ **Mute** ➔ **Kick** ➔ **Temp Ban** ➔ **Permanent Ban**.',
                inline: false
            }
        ],
        footer: {
            text: 'REDitors Community Guidelines • Joining means accepting all rules 🔥'
        }
    };

    const sent = await channel.send({ embeds: [embed] });
    try { await sent.pin(); } catch (_) {}
}

async function syncStartHereChannel(channel) {
    // Delete old bot messages to post a fresh new message
    const msgs = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (msgs) {
        for (const m of msgs.values()) {
            if (m.author.id === channel.client.user.id) {
                await m.delete().catch(() => {});
            }
        }
    }

    const embed = {
        title: '📥 REDitors Plugin — Official Download',
        description: `Download the **REDitors AI Extension** for Adobe Premiere Pro CC (Windows & macOS).\n` +
                     `Get instant access to Auto Captions, Silence Remover, AI Speech Cut, and Title Animator!\n` +
                     `Click the button below to download the latest installer directly from our official portal.`,
        color: config.colors.primary,
        image: { url: 'https://pub-ed669ef1be614ef2ba5345b04f3a103c.r2.dev/Discord/Download.png' },
        footer: {
            text: 'REDitors Official Download Center'
        }
    };

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('📥 DOWNLOAD REDITORS PLUGIN NOW 📥')
            .setStyle(ButtonStyle.Link)
            .setURL('https://www.reditors.com/Pages/plugin-download')
    );

    await channel.send({ embeds: [embed], components: [row] });
}

async function syncLatestReleaseChannel(channel) {
    const embed = {
        title: `📦 Latest Release — REDitors ${config.versions.plugin}`,
        description: `The latest production release of **REDitors for Adobe Premiere Pro** is live and ready for download!`,
        color: config.colors.primary,
        thumbnail: { url: config.urls.logoUrl },
        fields: [
            {
                name: '🎉 What\'s New in v1.2.6',
                value: `• **Ultra-Fast Local Rendering Engine:** Integrated local PC backend rendering for instant caption baking.\n` +
                       `• **Expanded Emoji & Font Engine:** Added 100+ trending font weights and full color emoji support.\n` +
                       `• **Smart Silence Detection v3:** Improved threshold sensitivity for background noise.\n` +
                       `• **Cloudflare R2 Direct Uploads:** Zero-friction audio sync and lightning-quick transcription.\n` +
                       `• **Premiere Pro 2024 / 2025 Compatibility:** Full stability patch for latest Adobe versions.`,
                inline: false
            },
            {
                name: '📥 Official Download Links',
                value: `• **Windows Installer:** [REDitors-Setup-v1.0.11.exe](${config.urls.downloadWindows})\n` +
                       `• **macOS Package:** [REDitors-Setup-mac.pkg](${config.urls.downloadMac})\n` +
                       `• **Manual Package (.zxp):** [reditors-v1.2.6.zxp](${config.urls.downloadZxp})`,
                inline: false
            },
            {
                name: '💻 System Requirements',
                value: `• **Adobe Premiere Pro:** CC 2020 through CC 2025 (v14.2+)\n` +
                       `• **OS:** Windows 10/11 (64-bit) or macOS 11+ (Intel & Apple Silicon)\n` +
                       `• **Internet:** Required for AI speech transcription & license verification`,
                inline: false
            }
        ],
        footer: {
            text: 'Verified Official Release • REDitors Team'
        }
    };

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Download Windows')
            .setStyle(ButtonStyle.Link)
            .setURL(config.urls.downloadWindows),
        new ButtonBuilder()
            .setLabel('Download Mac')
            .setStyle(ButtonStyle.Link)
            .setURL(config.urls.downloadMac),
        new ButtonBuilder()
            .setLabel('Download .ZXP')
            .setStyle(ButtonStyle.Link)
            .setURL(config.urls.downloadZxp)
    );

    const msgs = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existing = msgs ? msgs.find(m => m.author.id === channel.client.user.id && m.embeds[0]?.title?.includes('Latest Release')) : null;
    if (existing) {
        await existing.edit({ embeds: [embed], components: [row] });
    } else {
        const sent = await channel.send({ embeds: [embed], components: [row] });
        try { await sent.pin(); } catch (_) {}
    }
}

async function syncFaqChannel(channel) {
    // Delete old bot messages for a clean repost
    const msgs = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (msgs) {
        for (const m of msgs.values()) {
            if (m.author.id === channel.client.user.id) {
                await m.delete().catch(() => {});
            }
        }
    }

    const embed = {
        title: '❓ REDitors — FAQ',
        description: 'Quick answers to everything you need to know about REDitors.',
        color: config.colors.primary,
        image: { url: 'https://pub-ed669ef1be614ef2ba5345b04f3a103c.r2.dev/Discord/FAQ.png' },
        fields: [
            {
                name: '🔌 What is REDitors?',
                value: 'An all-in-one AI extension for **Adobe Premiere Pro** — Auto Captions, Silence Remover, AI Speech Cut & Title Animator. Cuts your editing time by up to **70%**.',
                inline: false
            },
            {
                name: '🆓 Is REDitors free?',
                value: 'Yes! Free users get access to **Title Animator presets** and monthly transcription credits — no credit card needed.',
                inline: false
            },
            {
                name: '🔄 How do credits reset?',
                value: 'Transcription credits reset every **billing cycle**. Silence Remover daily limits reset at **midnight UTC**.',
                inline: false
            },
            {
                name: '🖥️ Plugin not showing in Premiere?',
                value: '**Restart Premiere Pro** after install, then go to **Window → Extensions → REDitors**. Still missing? Ask in <#1504240324405624902> or open a ticket.',
                inline: false
            },
            {
                name: '🌍 What languages are supported?',
                value: 'Auto Captions & Speech Cut support **99+ languages** with auto-detection — English, Spanish, French, Arabic, Japanese, Hindi, and more.',
                inline: false
            },
            {
                name: '💎 How do I get my Pro role in Discord?',
                value: 'Use `/link <your_email>` in any channel. The bot will verify your plan and assign your subscriber role instantly.',
                inline: false
            },
            {
                name: '🛠️ Where do I get help?',
                value: 'Post in <#1504240324405624902> for general questions, or open a **support ticket** for billing & license issues.',
                inline: false
            }
        ],
        footer: {
            text: 'REDitors FAQ • Still need help? Open a ticket!'
        }
    };

    const sent = await channel.send({ embeds: [embed] });
    try { await sent.pin(); } catch (_) {}
}

async function syncPickYourRoleChannel(channel) {
    const embed = {
        title: '🎭 Pick Your Role & Editing Specialty',
        description: `Select your primary focus to customize your Discord experience and unlock role-specific discussions:\n\n` +
                     `🎬 **Free User** — Community access & plugin updates\n` +
                     `🔬 **Beta Tester** — Access pre-release plugin builds and early feature tests\n` +
                     `✨ **Member** — General community member\n\n` +
                     `*(Paid Subscriber roles are synced automatically via \`/link <email>\`)*`,
        color: config.colors.purple,
        thumbnail: { url: config.urls.logoUrl },
        footer: {
            text: 'Click any button below to toggle your role on/off!'
        }
    };

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('role_free_user')
            .setLabel('🎬 Free User')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('role_beta_tester')
            .setLabel('🔬 Beta Tester')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('role_member')
            .setLabel('✨ Member')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('btn_link_account')
            .setLabel('💎 Sync Pro Subscription')
            .setStyle(ButtonStyle.Danger)
    );

    const msgs = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existing = msgs ? msgs.find(m => m.author.id === channel.client.user.id && m.embeds[0]?.title?.includes('Pick Your Role')) : null;
    if (existing) {
        await existing.edit({ embeds: [embed], components: [row] });
    } else {
        const sent = await channel.send({ embeds: [embed], components: [row] });
        try { await sent.pin(); } catch (_) {}
    }
}

/**
 * Main routine to synchronize all channels.
 */
async function syncAllChannels(client) {
    console.log('[Sync] Starting full Discord channel sync...');
    const guild = client.guilds.cache.get(config.guildId) || await client.guilds.fetch(config.guildId).catch(() => null);
    if (!guild) {
        console.error('[Sync] Guild not found:', config.guildId);
        return { success: false, error: 'Guild not found' };
    }

    const results = {};

    // 1. Rules
    try {
        const ch = guild.channels.cache.get(config.channels.rules) || await guild.channels.fetch(config.channels.rules).catch(() => null);
        if (ch) { await syncRulesChannel(ch); results.rules = true; }
    } catch (e) { results.rules = e.message; }

    // 2. Start Here
    try {
        const ch = guild.channels.cache.get(config.channels.startHere) || await guild.channels.fetch(config.channels.startHere).catch(() => null);
        if (ch) { await syncStartHereChannel(ch); results.startHere = true; }
    } catch (e) { results.startHere = e.message; }

    // 3. Latest Release
    try {
        const ch = guild.channels.cache.get(config.channels.latestRelease) || await guild.channels.fetch(config.channels.latestRelease).catch(() => null);
        if (ch) { await syncLatestReleaseChannel(ch); results.latestRelease = true; }
    } catch (e) { results.latestRelease = e.message; }

    // 4. FAQ
    try {
        const ch = guild.channels.cache.get(config.channels.faq) || await guild.channels.fetch(config.channels.faq).catch(() => null);
        if (ch) { await syncFaqChannel(ch); results.faq = true; }
    } catch (e) { results.faq = e.message; }

    // 5. Server Stats
    try {
        const ch = guild.channels.cache.get(config.channels.serverStats) || await guild.channels.fetch(config.channels.serverStats).catch(() => null);
        if (ch) {
            const [healthData, dbStats] = await Promise.all([checkServerHealth(), getLiveDatabaseStats()]);
            const embed = await buildServerStatsEmbed(healthData, dbStats, client);
            const msgs = await ch.messages.fetch({ limit: 10 }).catch(() => null);
            const existing = msgs ? msgs.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('Server')) : null;
            if (existing) {
                await existing.edit({ embeds: [embed] });
            } else {
                const sent = await ch.send({ embeds: [embed] });
                try { await sent.pin(); } catch (_) {}
            }
            results.serverStats = true;
        }
    } catch (e) { results.serverStats = e.message; }

    console.log('[Sync] Channel sync complete:', results);
    return { success: true, results };
}

module.exports = {
    syncAllChannels,
    syncRulesChannel,
    syncStartHereChannel,
    syncLatestReleaseChannel,
    syncFaqChannel
};
