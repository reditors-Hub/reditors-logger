'use strict';
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

async function registerSlashCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.warn(`[WARN] Command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }

    const token = config.token || process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.warn('[Commands] No DISCORD_BOT_TOKEN found. Skipping registerSlashCommands.');
        return [];
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`[Commands] Registering ${commands.length} application (/) commands for guild ${config.guildId}...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands }
        );

        console.log(`[Commands] Successfully registered ${data.length} application (/) commands.`);
        return data;
    } catch (error) {
        console.error('[Commands] Error registering commands:', error);
        throw error;
    }
}

if (require.main === module) {
    registerSlashCommands().then(() => {
        setTimeout(() => process.exit(0), 250);
    }).catch(err => {
        console.error(err);
        setTimeout(() => process.exit(1), 250);
    });
}

module.exports = { registerSlashCommands };
