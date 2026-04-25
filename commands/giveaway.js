const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionsBitField,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');
const Giveaway = require('../models/Giveaway');
const { logger } = require('../index.js'); // We'll add logger later

// ——— CHANGE THESE FOR DESTRO ———
const WINNER_ROLE_ID = '1446803175767281694'; // ← CHANGE THIS
const SUPPORT_CHANNEL_ID = '1440673544890482840'; // or wherever tickets are made
const FOOTER_TEXT = "Destro's Dungeon";
const EMOJI_CONFIRMED = '<a:27184orangehappyemojiz:1440668332926701569>'; // or any emoji
const JOIN_EMOJI_ID = '1440668332926701569'; // change if you have custom confetti
// ————————————————

async function endGiveaway(giveaway, client) {
    try {
        const updatedGiveaway = await Giveaway.findById(giveaway._id);
        if (!updatedGiveaway || updatedGiveaway.status !== 'active') return;

        const guild = client.guilds.cache.get(updatedGiveaway.guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(updatedGiveaway.channelId);
        const message = await channel?.messages.fetch(updatedGiveaway.messageId).catch(() => null);

        if (updatedGiveaway.participants.length === 0) {
            updatedGiveaway.status = 'ended';
            await updatedGiveaway.save();

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`<:5091giveaway:1446816764779429958> GIVEAWAY ENDED <:5091giveaway:1446816764779429958>`)
                .addFields(
                    { name: 'Hosted in', value: "Destro’s Dungeon", inline: true },
                    { name: `<a:3899gift:1446816783024525455> Prize`, value: updatedGiveaway.title, inline: true },
                    { name: `<a:689495aec:1446818039096938629> Ends`, value: `<t:${Math.floor(updatedGiveaway.endTime.getTime() / 1000)}:R>`, inline: true },
                    { name: `<a:44092trophy:1446818434452029491> Winners`, value: `${updatedGiveaway.winners}`, inline: true },
                    { name: `<:7330member:1446820077566427287> Participants`, value: `${updatedGiveaway.participants.length}`, inline: true }
                )
                .setFooter({ text: FOOTER_TEXT });

            if (updatedGiveaway.image) embed.setImage(updatedGiveaway.image);

            if (message) await message.edit({ embeds: [embed], components: [] });
            return;
        }

        const shuffled = [...updatedGiveaway.participants].sort(() => 0.5 - Math.random());
        const winners = shuffled.slice(0, updatedGiveaway.winners);
        updatedGiveaway.winnerIds = winners;
        updatedGiveaway.status = 'ended';
        await updatedGiveaway.save();

        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

        // Assign winner role
        for (const id of winners) {
            const member = await guild.members.fetch(id).catch(() => null);
            if (member && !member.roles.cache.has(WINNER_ROLE_ID)) {
                await member.roles.add(WINNER_ROLE_ID).catch(() => {});
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`<:5091giveaway:1446816764779429958> GIVEAWAY ENDED <:5091giveaway:1446816764779429958>`)
            .addFields(
                { name: 'Hosted in', value: "Destro’s Dungeon", inline: true },
                { name: `<a:3899gift:1446816783024525455> Prize`, value: updatedGiveaway.title, inline: true },
                { name: `<a:689495aec:1446818039096938629> Ends`, value: `<t:${Math.floor(updatedGiveaway.endTime.getTime() / 1000)}:R>`, inline: true },
                { name: `<a:44092trophy:1446818434452029491> Winners`, value: `${winnerMentions}`, inline: true },
                { name: `<:7330member:1446820077566427287> Participants`, value: `${updatedGiveaway.participants.length}`, inline: true }
            )
            .setFooter({ text: FOOTER_TEXT });

        if (updatedGiveaway.image) embed.setImage(updatedGiveaway.image);

        if (message) {
            await message.edit({ embeds: [embed], components: [] });
            await message.reply({
                content: `${EMOJI_CONFIRMED} Congratulations ${winnerMentions}! You won **${updatedGiveaway.title}**!\nPlease open a ticket in <#${SUPPORT_CHANNEL_ID}> to claim your prize (within 6 hours or reroll).`
            });
        }
    } catch (err) {
        console.error('Error ending giveaway:', err);
    }
}

async function scheduleGiveawayEnd(giveaway, client) {
    const delay = giveaway.endTime - Date.now();
    if (delay <= 0) return;
    setTimeout(() => endGiveaway(giveaway, client), delay);
}

async function scheduleAllEnds(client) {
    const active = await Giveaway.find({ status: 'active' });
    for (const g of active) scheduleGiveawayEnd(g, client);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Create a giveaway')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('1h, 30m, 7d etc.').setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1))
        .addStringOption(o => o.setName('prize').setDescription('What are they winning?').setRequired(true))
        .addStringOption(o => o.setName('roleid').setDescription('Required role to enter').setRequired(false))
        .addStringOption(o => o.setName('image').setDescription('Image URL or attachment link').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel');
        const durationStr = interaction.options.getString('duration');
        const winners = interaction.options.getInteger('winners');
        const prize = interaction.options.getString('prize');
        const roleId = interaction.options.getString('roleid');
        const image = interaction.options.getString('image');

        // Parse duration (minimal validation)
        const timeMatch = durationStr.match(/^(\d+)([smhdw])$/i);
        if (!timeMatch) return interaction.editReply({ content: 'Invalid duration (e.g., 1h, 30m, 7d).' });
        const num = parseInt(timeMatch[1]);
        const unit = timeMatch[2].toLowerCase();
        let ms = 0;
        switch (unit) {
            case 's': ms = num * 1000; break;
            case 'm': ms = num * 60 * 1000; break;
            case 'h': ms = num * 3600 * 1000; break;
            case 'd': ms = num * 86400 * 1000; break;
            case 'w': ms = num * 7 * 86400 * 1000; break;
            default: return interaction.editReply({ content: 'Invalid unit (s/m/h/d/w).' });
        }
        const endTime = new Date(Date.now() + ms);
        const endTimestamp = Math.floor(endTime.getTime() / 1000);

        // Validate role
        let requiredRoleId = null;
        if (roleId) {
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) return interaction.editReply({ content: 'Invalid role ID.' });
            requiredRoleId = roleId;
        }

        try {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle(`<:5091giveaway:1446816764779429958> GIVEAWAY TIME! <:5091giveaway:1446816764779429958>`)
                .addFields(
                    { name: 'Hosted in', value: "Destro’s Dungeon", inline: true },
                    { name: `<a:3899gift:1446816783024525455> Prize`, value: prize, inline: true },
                    { name: `<a:689495aec:1446818039096938629> Ends`, value: `<t:${endTimestamp}:R>`, inline: true },
                    { name: `<a:44092trophy:1446818434452029491> Winners`, value: `${winners}`, inline: true },
                    { name: `<:7330member:1446820077566427287> Participants`, value: `0`, inline: true }
                )
                .setFooter({ text: FOOTER_TEXT });

            if (image) embed.setImage(image);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('giveaway_join').setLabel('Join!').setStyle(ButtonStyle.Primary).setEmoji('<:5091giveaway:1446816764779429958>'),
                new ButtonBuilder().setCustomId('giveaway_view').setLabel('View Entries').setStyle(ButtonStyle.Secondary).setEmoji('<:7330member:1446820077566427287>')
            );

            const msg = await channel.send({ embeds: [embed], components: [row] });

            const giveaway = new Giveaway({
                messageId: msg.id,
                channelId: channel.id,
                guildId: interaction.guild.id,
                title: prize,
                winners,
                endTime,
                roleId: requiredRoleId,
                image,
                participants: [],
                createdBy: interaction.user.id
            });
            await giveaway.save();

            scheduleGiveawayEnd(giveaway, interaction.client);

            await interaction.editReply({ content: `✅ Giveaway created in ${channel}! Ends <t:${endTimestamp}:R>.` });
        } catch (err) {
            logger?.error('Giveaway error:', err);
            await interaction.editReply({ content: '❌ Failed to create giveaway (check bot perms).' });
        }
    },

    async onInteraction(interaction, client) {
        if (!interaction.isButton()) return;

        await interaction.deferUpdate();

        // Find giveaway by message ID
        const giveaway = await Giveaway.findOne({ messageId: interaction.message.id, status: 'active' });
        if (!giveaway) {
            return interaction.followUp({ content: 'This giveaway is no longer active.', ephemeral: true });
        }

        if (interaction.customId === 'giveaway_join') {
            const userId = interaction.user.id;
            if (giveaway.participants.includes(userId)) {
                return interaction.followUp({ content: 'You already joined this giveaway!', ephemeral: true });
            }

            // Check required role
            if (giveaway.roleId) {
                const role = interaction.guild.roles.cache.get(giveaway.roleId);
                if (!role || !interaction.member.roles.cache.has(giveaway.roleId)) {
                    return interaction.followUp({ content: `You need the ${role?.name || 'required'} role to join.`, ephemeral: true });
                }
            }

            // Add participant
            giveaway.participants.push(userId);
            await giveaway.save();

            // Update participants field
            const fields = interaction.message.embeds[0].fields;
            const participantsField = fields.find(f => f.name === `<:7330member:1446820077566427287> Participants`);
            if (participantsField) {
                participantsField.value = `${giveaway.participants.length}`;
            }
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setFields(fields);
            await interaction.message.edit({ embeds: [updatedEmbed] });

            await interaction.followUp({ content: `✅ You've joined **${giveaway.title}**! Good luck!`, ephemeral: true });
        } else if (interaction.customId === 'giveaway_view') {
            if (giveaway.participants.length === 0) {
                return interaction.followUp({ content: 'No participants yet!', ephemeral: true });
            }

            const participantMentions = giveaway.participants.map(id => `<@${id}>`).join(', ');
            const viewEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle(`<:7330member:1446820077566427287> Participants (${giveaway.participants.length})`)
                .setDescription(participantMentions.length > 2000 ? participantMentions.substring(0, 2000) + '...' : participantMentions);

            await interaction.followUp({ embeds: [viewEmbed], ephemeral: true });
        } else if (interaction.customId === 'giveaway_remove' && interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            // Simple remove: Assume staff inputs user ID in a modal or reply—here, show list and ask for ID
            const participantMentions = giveaway.participants.map((id, i) => `${i + 1}. <@${id}>`).join('\n');
            const removeEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Remove Participant')
                .setDescription(`Select a user to remove:\n${participantMentions}`)
                .setFooter({ text: 'Reply with the user ID to remove.' });

            await interaction.followUp({ embeds: [removeEmbed], ephemeral: true });
            // Note: Full remove logic would need onMessage handler for staff replies—add if needed
        }
    },

    async onMessage(message, client) {
        // Handle .reroll, .edit, .cancel, or remove replies
    },

    scheduleAllEnds
};