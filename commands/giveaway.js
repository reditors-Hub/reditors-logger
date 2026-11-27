'use strict';
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const config = require('../config');

// Active giveaways: messageId → { prize, hostId, winnersCount, endTime, entries: Set<userId> }
const activeGiveaways = new Map();

async function handleGiveawayButton(interaction) {
    if (interaction.customId !== 'giveaway_enter') return false;

    const msgId    = interaction.message.id;
    const giveaway = activeGiveaways.get(msgId);

    if (!giveaway) {
        await interaction.reply({ content: '❌ This giveaway has expired.', ephemeral: true });
        return true;
    }
    if (Date.now() > giveaway.endTime) {
        await interaction.reply({ content: '⏰ This giveaway has already ended.', ephemeral: true });
        return true;
    }

    const userId = interaction.user.id;
    if (giveaway.entries.has(userId)) {
        giveaway.entries.delete(userId);
        await interaction.reply({ content: '✅ You have **left** the giveaway.', ephemeral: true });
    } else {
        giveaway.entries.add(userId);
        await interaction.reply({ content: `🎉 You have **entered** the giveaway! Good luck!\n> Total entries: **${giveaway.entries.size}**`, ephemeral: true });
    }

    // Update entry count on embed
    const updated = interaction.message.embeds[0];
    const fields  = updated.fields.map(f =>
        f.name === '👥 Entries' ? { ...f, value: `\`${giveaway.entries.size}\`` } : f
    );
    await interaction.message.edit({
        embeds: [{ ...updated.toJSON(), fields }]
    }).catch(() => null);

    return true;
}

async function endGiveaway(msg, giveaway) {
    const entries = [...giveaway.entries];
    const count   = Math.min(giveaway.winnersCount, entries.length);
    const winners = [];
    const pool    = [...entries];
    for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
    }

    const winnerMentions = winners.length > 0
        ? winners.map(id => `<@${id}>`).join(', ')
        : '`No valid entries`';

    const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('giveaway_ended')
            .setLabel('Giveaway Ended')
            .setEmoji('🎊')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );

    await msg.edit({
        embeds: [{
            title: `🎊 GIVEAWAY ENDED — ${giveaway.prize}`,
            description: `The giveaway has concluded!\n\n🏆 **Winner(s):** ${winnerMentions}`,
            color: config.colors.success,
            fields: [
                { name: '👥 Total Entries', value: `\`${entries.length}\``, inline: true },
                { name: '🎁 Prize',         value: giveaway.prize,          inline: true },
                { name: '🎲 Winners',       value: `\`${count}\``,          inline: true }
            ],
            footer: { text: `Hosted by: ${giveaway.hostTag} • REDitors Community` },
            timestamp: new Date().toISOString()
        }],
        components: [disabledRow]
    }).catch(() => null);

    if (winners.length > 0) {
        await msg.reply({
            content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`
        }).catch(() => null);
    }

    activeGiveaways.delete(msg.id);
}

module.exports = {
    handleGiveawayButton,

    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('🎉 Start a timed giveaway in this server')
        .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
        .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes').setMinValue(1).setMaxValue(10080).setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (default: 1)').setMinValue(1).setMaxValue(10).setRequired(false))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').addChannelTypes(ChannelType.GuildText).setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const prize       = interaction.options.getString('prize');
        const durationMin = interaction.options.getInteger('duration');
        const winnersCount = interaction.options.getInteger('winners') || 1;
        const channel     = interaction.options.getChannel('channel') || interaction.channel;
        const endTime     = Date.now() + durationMin * 60 * 1000;
        const endTs       = Math.floor(endTime / 1000);

        const enterBtn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_enter')
                .setLabel('Enter Giveaway')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Success)
        );

        const msg = await channel.send({
            content: '🎉 **GIVEAWAY** 🎉',
            embeds: [{
                title: `🎁 ${prize}`,
                description: `React with 🎉 to enter!\nEnds: <t:${endTs}:F> (<t:${endTs}:R>)`,
                color: config.colors.purple,
                fields: [
                    { name: '⏰ Ends',    value: `<t:${endTs}:R>`, inline: true },
                    { name: '🎲 Winners', value: `\`${winnersCount}\``,  inline: true },
                    { name: '👥 Entries', value: '`0`',              inline: true },
                    { name: '🎁 Prize',   value: prize,              inline: false }
                ],
                footer: { text: `Hosted by: ${interaction.user.tag} • REDitors Community` },
                thumbnail: { url: config.urls.logoUrl },
                timestamp: new Date().toISOString()
            }],
            components: [enterBtn]
        });

        activeGiveaways.set(msg.id, {
            prize,
            hostTag: interaction.user.tag,
            hostId: interaction.user.id,
            winnersCount,
            endTime,
            entries: new Set()
        });

        // Auto-end
        setTimeout(() => endGiveaway(msg, activeGiveaways.get(msg.id)).catch(() => null), durationMin * 60 * 1000);

        await interaction.editReply({ content: `✅ Giveaway started in <#${channel.id}>! Ends <t:${endTs}:R>.` });
    }
};
