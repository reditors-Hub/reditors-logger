'use strict';
require('dotenv').config();

const { Client, Collection, GatewayIntentBits, Partials, ActivityType, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { startMonitoring } = require('./serverMonitor');
const { handleRoleButton } = require('./interactions/roleButtons');
const { handleLinkModal } = require('./interactions/linkModal');
const { handleVoiceState, handleVoiceButton, handleVoiceInteraction, sweepEmptyVoiceChannels } = require('./voiceManager');
const { REACTION_ROLE_MAP } = require('./reactionRoles');
const { handleTicketButton } = require('./interactions/ticketManager');
const { initAuditLogger } = require('./auditLogger');
const { handleAboutYouSelect } = require('./interactions/aboutYouMenu');
const { handleSupportVoiceButton, sendWaitingAdminAlert, handleWaitingAdminLeave } = require('./interactions/supportVoiceAlert');
const { registerSlashCommands } = require('./registerCommands');

let clientInstance = null;

function startDiscordBot() {
    const token = config.token || process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.warn('[Bot] ⚠️ No DISCORD_BOT_TOKEN found in environment. Interactive bot engine not started.');
        return null;
    }

    if (clientInstance) {
        return clientInstance;
    }

    // Create Discord Client with full intent gateway support
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessageReactions
        ],
        partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.Reaction]
    });

    // Load Commands dynamically
    client.commands = new Collection();
    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`[Bot] Loaded command: /${command.data.name}`);
                }
            } catch (cmdErr) {
                console.error(`[Bot] Failed loading command ${file}:`, cmdErr.message);
            }
        }
    }

    // Ready Event
    client.once(Events.ClientReady, async () => {
        console.log(`=======================================================`);
        console.log(`🤖 REDitors Interactive Bot logged in as: ${client.user.tag}`);
        console.log(`📡 Connected to Guild: ${config.guildId}`);
        console.log(`🖥️ Server Backend: ${config.urls.localServer}`);
        console.log(`📦 Slash Commands: ${client.commands.size} active`);
        console.log(`=======================================================`);

        // Register slash commands with Discord API in background
        registerSlashCommands().then(() => {
            console.log('[Bot] Slash commands verified & synced with Discord Gateway.');
        }).catch(err => {
            console.warn('[Bot] Slash commands sync warning:', err.message);
        });

        // Pre-cache all guild roles
        try {
            const guild = client.guilds.cache.get(config.guildId) || await client.guilds.fetch(config.guildId);
            if (guild) {
                await guild.roles.fetch();
                console.log(`[Bot] Pre-cached ${guild.roles.cache.size} guild roles.`);
            }
        } catch (err) {
            console.warn(`[Bot] Failed to pre-fetch guild roles: ${err.message}`);
        }

        // Set Dynamic Activity Presence
        client.user.setPresence({
            activities: [{
                name: '5 AI tools edit your videos ✨',
                type: ActivityType.Watching
            }],
            status: 'online'
        });

        // Start background watchdog for Server & Live Channel Telemetry (every 3 minutes)
        try {
            startMonitoring(client, 180000);
        } catch (monErr) {
            console.error('[Bot] startMonitoring error:', monErr.message);
        }

        // Start background Voice Channel Sweeper Watchdog (Checks for 4s empty rooms)
        try {
            sweepEmptyVoiceChannels(client);
            setInterval(() => sweepEmptyVoiceChannels(client), 4000);
        } catch (vcErr) {
            console.error('[Bot] Voice sweeper error:', vcErr.message);
        }

        // Initialize native audit log monitoring for all granular channels
        try {
            initAuditLogger(client);
        } catch (auditErr) {
            console.error('[Bot] Audit logger error:', auditErr.message);
        }

        // Post startup log in bot-logs channel
        try {
            const guild = client.guilds.cache.get(config.guildId);
            if (guild) {
                const botLogs = guild.channels.cache.get(config.channels.botLogs);
                if (botLogs) {
                    await botLogs.send({
                        embeds: [{
                            title: '🟢 REDitors Bot Online & Synchronized (Render Cloud 24/7)',
                            description: `Bot core initialized successfully on Render Cloud Microservice.\n` +
                                         `• **Backend URL:** \`${config.urls.localServer}\`\n` +
                                         `• **Website:** [reditors.com](${config.urls.website})\n` +
                                         `• **Database:** Supabase Connected\n` +
                                         `• **Slash Commands:** \`${client.commands.size}\` active\n` +
                                         `• **Hosting:** Render Cloud 24/7 (Always Active)`,
                            color: config.colors.primary,
                            timestamp: new Date().toISOString()
                        }]
                    });
                }
            }
        } catch (err) {
            console.error('[Bot] Error sending startup log to Discord channel:', err.message);
        }
    });

    // Interaction Event (Slash Commands, Buttons, Modals, Select Menus)
    client.on(Events.InteractionCreate, async interaction => {
        try {
            // 1. Slash Commands
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) {
                    console.warn(`[Bot] Unknown command: ${interaction.commandName}`);
                    return;
                }
                await command.execute(interaction);
                return;
            }

            // 2. Buttons (Performance, Poll, Giveaway, Ticket, Support Voice, Temp Voice, Roles)
            if (interaction.isButton()) {
                // Performance dashboard buttons
                if (interaction.customId.startsWith('btn_perf_')) {
                    const { handlePerformanceButton } = require('./commands/performance');
                    await handlePerformanceButton(interaction);
                    return;
                }
                // Poll vote buttons
                if (interaction.customId.startsWith('poll_vote_')) {
                    const { handlePollButton } = require('./commands/poll');
                    await handlePollButton(interaction);
                    return;
                }
                // Giveaway entry button
                if (interaction.customId === 'giveaway_enter') {
                    const { handleGiveawayButton } = require('./commands/giveaway');
                    await handleGiveawayButton(interaction);
                    return;
                }
                // Ticket close button
                if (interaction.customId.startsWith('ticket_close_')) {
                    const { handleTicketClose } = require('./commands/ticket');
                    await handleTicketClose(interaction);
                    return;
                }
                let handled = await handleSupportVoiceButton(interaction);
                if (!handled) {
                    handled = await handleVoiceButton(interaction);
                }
                if (!handled) {
                    handled = await handleTicketButton(interaction);
                }
                if (!handled) {
                    await handleRoleButton(interaction);
                }
                return;
            }

            // 3. Modal Submissions
            if (interaction.isModalSubmit()) {
                // Ticket modal
                if (interaction.customId === 'ticket_modal') {
                    const { handleTicketModal } = require('./commands/ticket');
                    await handleTicketModal(interaction);
                    return;
                }
                // Feedback modal
                if (interaction.customId === 'feedback_modal') {
                    const { handleFeedbackModal } = require('./commands/feedback');
                    await handleFeedbackModal(interaction);
                    return;
                }
                const handled = await handleVoiceInteraction(interaction);
                if (!handled) {
                    await handleLinkModal(interaction);
                }
                return;
            }

            // 4. Select Menus (Voice Control & About You Roles)
            if (interaction.isStringSelectMenu()) {
                const handled = await handleAboutYouSelect(interaction);
                if (handled) return;
            }

            if (interaction.isUserSelectMenu()) {
                await handleVoiceInteraction(interaction);
                return;
            }
        } catch (error) {
            console.error('[Bot] Interaction handling error:', error);
            const replyPayload = {
                content: '⚠️ An unexpected error occurred while executing this action.',
                ephemeral: true
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(replyPayload).catch(() => null);
            } else {
                await interaction.reply(replyPayload).catch(() => null);
            }
        }
    });

    // Member Join Event (Auto-role & Greeting)
    client.on(Events.GuildMemberAdd, async member => {
        try {
            console.log(`[Member] New member joined: ${member.user.tag} (${member.id})`);

            // Automatically assign Member role immediately
            if (config.roles.member && !member.user.bot) {
                await member.roles.add(config.roles.member).then(() => {
                    console.log(`[AutoRole] Successfully assigned Member role to ${member.user.tag}`);
                }).catch(async err => {
                    console.warn(`[AutoRole] Initial role add: ${err.message}. Retrying in 2 seconds...`);
                    await new Promise(r => setTimeout(r, 2000));
                    await member.roles.add(config.roles.member).catch(() => {});
                });
            }

            // Post to join/left channel
            const joinLeftCh = member.guild.channels.cache.get(config.channels.joinLeft);
            if (joinLeftCh) {
                const avatarUrl = member.user.displayAvatarURL({ dynamic: true, size: 512 });
                const guildIcon = member.guild.iconURL();
                const highStaffMention = config.roles.highStaff ? `<@&${config.roles.highStaff}>` : '';

                await joinLeftCh.send({
                    content: `<@${member.id}> joined the server ${highStaffMention}`,
                    embeds: [{
                        title: `🎉 Welcome to REDitors, ${member.user.username}!`,
                        description: `📊 **Member Stats:**\n` +
                                     `• **Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
                                     `• **Member Count:** \`#${member.guild.memberCount}\``,
                        color: config.colors.primary,
                        thumbnail: { url: avatarUrl },
                        footer: { text: 'REDitors Community • Staff Log', icon_url: guildIcon || undefined },
                        timestamp: new Date().toISOString()
                    }]
                }).catch(() => null);
            }

            // Log to bot-logs channel
            const logsCh = member.guild.channels.cache.get(config.channels.botLogs);
            if (logsCh) {
                await logsCh.send({
                    embeds: [{
                        title: '🟢 Member Joined',
                        description: `<@${member.id}> (\`${member.user.tag}\`) joined the server.\nDefault **Member** role assigned.`,
                        color: config.colors.success,
                        thumbnail: { url: member.user.displayAvatarURL() },
                        timestamp: new Date().toISOString()
                    }]
                }).catch(() => null);
            }
        } catch (err) {
            console.error('[Member] Error handling new member join:', err.message);
        }
    });

    // Member Leave Event
    client.on(Events.GuildMemberRemove, async member => {
        try {
            console.log(`[Member] Member left: ${member.user.tag} (${member.id})`);

            const joinLeftCh = member.guild.channels.cache.get(config.channels.joinLeft);
            if (joinLeftCh) {
                const avatarUrl = member.user.displayAvatarURL({ dynamic: true, size: 512 });
                const guildIcon = member.guild.iconURL();
                const highStaffMention = config.roles.highStaff ? `<@&${config.roles.highStaff}>` : '';

                await joinLeftCh.send({
                    content: `**${member.user.username}** left the server ${highStaffMention}`,
                    embeds: [{
                        title: `👋 Member Departed`,
                        description: `📊 **Member Stats:**\n` +
                                     `• **Joined Server:** ${member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown'}\n` +
                                     `• **Remaining Members:** \`${member.guild.memberCount}\``,
                        color: config.colors.danger,
                        thumbnail: { url: avatarUrl },
                        footer: { text: 'REDitors Community • Staff Log', icon_url: guildIcon || undefined },
                        timestamp: new Date().toISOString()
                    }]
                }).catch(() => null);
            }
        } catch (err) {
            console.error('[Member] Error handling member leave:', err.message);
        }
    });

    // Member Screening / Onboarding Completion
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        try {
            if (!newMember.user.bot && config.roles.member) {
                if (oldMember.pending && !newMember.pending && !newMember.roles.cache.has(config.roles.member)) {
                    await newMember.roles.add(config.roles.member).catch(() => {});
                    console.log(`[AutoRole] Assigned Member role to ${newMember.user.tag} after completing screening.`);
                }
            }
        } catch (_) {}
    });

    // Voice State Update Event
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        try {
            await handleVoiceState(oldState, newState);
        } catch (err) {
            console.error('[Voice State] handleVoiceState error:', err.message);
        }

        const targetVoiceId = config.channels.waitingAdminVoice || '1553256667049631744';

        if (newState.channelId === targetVoiceId && oldState.channelId !== targetVoiceId) {
            try {
                const member = newState.member;
                if (member && !member.user.bot) {
                    console.log(`[Voice Alert] ${member.user.tag} joined Waiting Admin Voice channel.`);
                    const notifChId = config.channels.supportNotification || '1553264156117827655';
                    const notifCh = newState.guild.channels.cache.get(notifChId)
                                 || await newState.guild.channels.fetch(notifChId).catch(() => null);

                    if (notifCh) {
                        await sendWaitingAdminAlert(notifCh, member, targetVoiceId);
                    }
                }
            } catch (err) {
                console.error('[Voice Alert] Error sending support notification:', err.message);
            }
        }

        if (oldState.channelId === targetVoiceId && newState.channelId !== targetVoiceId) {
            try {
                let member = oldState.member;
                if (!member && oldState.id) {
                    member = await oldState.guild.members.fetch(oldState.id).catch(() => null);
                }
                if (member && !member.user.bot) {
                    await handleWaitingAdminLeave(member, oldState.guild);
                }
            } catch (err) {
                console.error('[Voice State] Error handling Waiting Admin leave:', err.message);
            }
        }
    });

    // Reaction Role Handlers
    client.on(Events.MessageReactionAdd, async (reaction, user) => {
        if (user.bot) return;
        if (reaction.partial) {
            try { await reaction.fetch(); } catch (_) { return; }
        }
        const emojiId = reaction.emoji.id;
        const roleId = REACTION_ROLE_MAP[emojiId];
        if (!roleId) return;

        try {
            const guild = reaction.message.guild;
            if (!guild) return;
            const member = await guild.members.fetch(user.id);
            const role = guild.roles.cache.get(roleId);
            if (member && role) {
                await member.roles.add(role);
            }
        } catch (_) {}
    });

    client.on(Events.MessageReactionRemove, async (reaction, user) => {
        if (user.bot) return;
        if (reaction.partial) {
            try { await reaction.fetch(); } catch (_) { return; }
        }
        const emojiId = reaction.emoji.id;
        const roleId = REACTION_ROLE_MAP[emojiId];
        if (!roleId) return;

        try {
            const guild = reaction.message.guild;
            if (!guild) return;
            const member = await guild.members.fetch(user.id);
            const role = guild.roles.cache.get(roleId);
            if (member && role) {
                await member.roles.remove(role);
            }
        } catch (_) {}
    });

    // Login to Discord
    client.login(token).catch(err => {
        console.error('[Bot] CRITICAL: Failed to login to Discord:', err.message);
    });

    clientInstance = client;
    return clientInstance;
}

module.exports = {
    startDiscordBot,
    getClient: () => clientInstance
};
