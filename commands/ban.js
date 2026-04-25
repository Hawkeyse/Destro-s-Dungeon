const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { ModLog } = require('../utils/modlog.js');

const LOGS_CHANNEL_ID = '1440387328106565673';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user')
    .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    .addBooleanOption(o => o.setName('delete-messages').setDescription('Delete messages?').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('Missing Permission').setDescription('You need **Ban Members** permission.')] });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const del = interaction.options.getBoolean('delete-messages') ?? true;

    await interaction.guild.members.ban(target.id, { deleteMessageSeconds: del ? 604800 : 0, reason });

    await new ModLog({ guildId: interaction.guild.id, userId: target.id, moderatorId: interaction.user.id, type: 'ban', reason }).save();

    // DM (no mod name)
    const dm = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('You Have Been Banned')
      .setDescription(`From **${interaction.guild.name}**`)
      .addFields({ name: 'Reason', value: reason });
    await target.send({ embeds: [dm] }).catch(() => {});

    // Log
    const logChannel = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('User Banned')
        .addFields(
          { name: 'User', value: `${target.tag} (${target.id})` },
          { name: 'Moderator', value: interaction.user.toString() },
          { name: 'Reason', value: reason },
          { name: 'Messages Deleted', value: del ? 'Last 7 days' : 'None' }
        );
      logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('User Banned')
      .setDescription(`${target} has been banned\n**Reason:** ${reason}`);

    await interaction.editReply({ embeds: [embed] });
  }
};