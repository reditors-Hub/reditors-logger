'use strict';
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const config = require('../config');

// Active polls: messageId → { question, options, votes: { optionIndex: Set<userId> }, endTime }
const activePolls = new Map();

async function handlePollButton(interaction) {
    const id = interaction.customId;
    if (!id.startsWith('poll_vote_')) return false;

    const [, , messageId, optionIndex] = id.split('_');
    const idx  = parseInt(optionIndex, 10);
    const poll = activePolls.get(messageId || interaction.message.id);

    if (!poll) {
        await interaction.reply({ content: '❌ This poll has expired or is no longer tracked.', ephemeral: true });
        return true;
    }
    if (Date.now() > poll.endTime) {
        await interaction.reply({ content: '⏰ This poll has already ended.', ephemeral: true });
        return true;
    }

    const userId = interaction.user.id;
    // Remove from all options first (allow vote change)
    poll.votes.forEach(set => set.delete(userId));
    poll.votes[idx].add(userId);

    const totalVotes = poll.votes.reduce((acc, s) => acc + s.size, 0);
    const bars = poll.options.map((opt, i) => {
        const count = poll.votes[i].size;
        const pct   = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const bar   = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
        return `**${i + 1}. ${opt}**\n\`${bar}\` ${pct}% (${count} vote${count !== 1 ? 's' : ''})`;
    }).join('\n\n');

    const embed = {
        title: `📊 Poll: ${poll.question}`,
        description: bars,
        color: config.colors.info,
        footer: { text: `Total votes: ${totalVotes} • Ends <t:${Math.floor(poll.endTime / 1000)}:R>` }
    };

    await interaction.update({ embeds: [embed], components: interaction.message.components });
    return true;
}

module.exports = {
    handlePollButton,

    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('📊 Create an interactive poll with up to 4 options')
        .addStringOption(o => o.setName('question').setDescription('The poll question').setRequired(true))
        .addStringOption(o => o.setName('option1').setDescription('Choice 1').setRequired(true))
        .addStringOption(o => o.setName('option2').setDescription('Choice 2').setRequired(true))
        .addStringOption(o => o.setName('option3').setDescription('Choice 3 (optional)').setRequired(false))
        .addStringOption(o => o.setName('option4').setDescription('Choice 4 (optional)').setRequired(false))
        .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes (default: 60)').setMinValue(1).setMaxValue(10080).setRequired(false))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (default: current)').addChannelTypes(ChannelType.GuildText).setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const question  = interaction.options.getString('question');
        const opts      = [
            interaction.options.getString('option1'),
            interaction.options.getString('option2'),
            interaction.options.getString('option3'),
            interaction.options.getString('option4')
        ].filter(Boolean);
        const durationMin = interaction.options.getInteger('duration') || 60;
        const channel   = interaction.options.getChannel('channel') || interaction.channel;
        const endTime   = Date.now() + durationMin * 60 * 1000;
        const endTs     = Math.floor(endTime / 1000);

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
        const description = opts.map((o, i) => `${emojis[i]} **${o}**\n\`░░░░░░░░░░░░░░░░░░░░\` 0% (0 votes)`).join('\n\n');

        const buttons = new ActionRowBuilder().addComponents(
            opts.map((o, i) =>
                new ButtonBuilder()
                    .setCustomId(`poll_vote__${i}`) // messageId filled after send
                    .setLabel(o.substring(0, 80))
                    .setEmoji(emojis[i])
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        const msg = await channel.send({
            embeds: [{
                title: `📊 Poll: ${question}`,
                description,
                color: config.colors.info,
                footer: { text: `0 votes total • Ends <t:${endTs}:R> • Started by ${interaction.user.tag}` },
                timestamp: new Date().toISOString()
            }],
            components: [buttons]
        });

        // Re-create buttons with real messageId baked in
        const realButtons = new ActionRowBuilder().addComponents(
            opts.map((o, i) =>
                new ButtonBuilder()
                    .setCustomId(`poll_vote_${msg.id}_${i}`)
                    .setLabel(o.substring(0, 80))
                    .setEmoji(emojis[i])
                    .setStyle(ButtonStyle.Secondary)
            )
        );
        await msg.edit({ components: [realButtons] });

        activePolls.set(msg.id, {
            question,
            options: opts,
            votes: opts.map(() => new Set()),
            endTime
        });

        // Auto-close poll
        setTimeout(async () => {
            const poll = activePolls.get(msg.id);
            if (!poll) return;
            const totalVotes = poll.votes.reduce((acc, s) => acc + s.size, 0);
            const winner     = poll.votes.reduce((best, s, i) => s.size > poll.votes[best].size ? i : best, 0);
            const bars = poll.options.map((opt, i) => {
                const count = poll.votes[i].size;
                const pct   = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const bar   = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
                return `${i === winner && totalVotes > 0 ? '🏆' : '▪️'} **${opt}**\n\`${bar}\` ${pct}% (${count} vote${count !== 1 ? 's' : ''})`;
            }).join('\n\n');

            const disabledRow = new ActionRowBuilder().addComponents(
                opts.map((o, i) =>
                    new ButtonBuilder()
                        .setCustomId(`poll_ended_${i}`)
                        .setLabel(o.substring(0, 80))
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                )
            );
            await msg.edit({
                embeds: [{
                    title: `📊 Poll Ended: ${question}`,
                    description: bars,
                    color: config.colors.success,
                    footer: { text: `Poll ended • ${totalVotes} total vote(s)` },
                    timestamp: new Date().toISOString()
                }],
                components: [disabledRow]
            }).catch(() => null);
            activePolls.delete(msg.id);
        }, durationMin * 60 * 1000);

        await interaction.editReply({ content: `✅ Poll posted in <#${channel.id}>! Ends <t:${endTs}:R>.` });
    }
};
