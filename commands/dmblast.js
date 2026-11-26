'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm-blast')
        .setDescription('Send a DM announcement to all members of a selected role (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(opt =>
            opt.setName('role')
                .setDescription('The role whose members will receive the DM')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('title')
                .setDescription('Title of the announcement')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('message')
                .setDescription('The announcement message body (supports Discord markdown)')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('image')
                .setDescription('Optional image URL to include in the DM embed')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const role     = interaction.options.getRole('role');
        const title    = interaction.options.getString('title');
        const message  = interaction.options.getString('message');
        const imageUrl = interaction.options.getString('image') || null;
        const guild    = interaction.guild;

        // Ensure member cache is populated
        await guild.members.fetch();
        const targets = guild.members.cache.filter(m =>
            !m.user.bot && m.roles.cache.has(role.id)
        );

        if (targets.size === 0) {
            return interaction.editReply({ content: `❌ No members found with the role **${role.name}**.` });
        }

        await interaction.editReply({
            content: `⏳ Sending DMs to **${targets.size}** member(s) with role **${role.name}**... This may take a moment.`
        });

        // Build DM embed
        const dmEmbed = new EmbedBuilder()
            .setTitle(`📣 ${title}`)
            .setDescription(message)
            .setColor(config.colors.primary)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({
                text: `REDitors Official Announcement • ${guild.name}`,
                iconURL: guild.iconURL() || undefined
            })
            .setTimestamp();

        if (imageUrl) dmEmbed.setImage(imageUrl);

        // Send DMs with rate-limit protection (500ms between each)
        let sent = 0;
        let failed = 0;
        const failedUsers = [];

        for (const [, member] of targets) {
            try {
                await member.send({ embeds: [dmEmbed] });
                sent++;
            } catch (err) {
                failed++;
                failedUsers.push(`\`${member.user.tag}\``);
                console.warn(`[DM Blast] Could not DM ${member.user.tag}: ${err.message}`);
            }
            await new Promise(r => setTimeout(r, 500));
        }

        // Build delivery report
        const reportEmbed = new EmbedBuilder()
            .setTitle('📊 DM Blast — Delivery Report')
            .setColor(failed === 0 ? config.colors.success : config.colors.warning)
            .addFields(
                { name: '🎯 Target Role', value: `<@&${role.id}>`, inline: true },
                { name: '✅ Sent',        value: `\`${sent}\``,    inline: true },
                { name: '❌ Failed',      value: `\`${failed}\``,  inline: true },
                { name: '📝 Title',       value: title,            inline: false },
                {
                    name: '💬 Message Preview',
                    value: message.length > 200 ? message.slice(0, 200) + '...' : message,
                    inline: false
                }
            )
            .setTimestamp();

        if (failedUsers.length > 0) {
            const preview = failedUsers.slice(0, 10).join(', ');
            reportEmbed.addFields({
                name: '⚠️ Failed Users (first 10)',
                value: preview + (failedUsers.length > 10 ? ` + ${failedUsers.length - 10} more` : ''),
                inline: false
            });
        }

        // Log to #bot-logs
        try {
            const logsCh = guild.channels.cache.get(config.channels.botLogs)
                        || await guild.channels.fetch(config.channels.botLogs).catch(() => null);
            if (logsCh) {
                await logsCh.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('📣 DM Blast Executed')
                            .setColor(config.colors.info)
                            .addFields(
                                { name: '👤 By',      value: `<@${interaction.user.id}> (\`${interaction.user.tag}\`)`, inline: true },
                                { name: '🎯 Role',    value: `<@&${role.id}>`, inline: true },
                                { name: '✅ Sent',    value: `\`${sent}\``,    inline: true },
                                { name: '❌ Failed',  value: `\`${failed}\``,  inline: true },
                                { name: '📝 Title',   value: title,            inline: false }
                            )
                            .setTimestamp()
                    ]
                });
            }
        } catch (_) {}

        await interaction.editReply({ content: '', embeds: [reportEmbed] });
    }
};
