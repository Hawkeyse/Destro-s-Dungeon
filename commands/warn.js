const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { ModLog } = require('../utils/modlog.js');

const LOGS_CHANNEL_ID = '1440387328106565673';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('Missing Permission').setDescription('You need **Moderate Members** permission.')] });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF5555').setTitle('Not in Server').setDescription('This user is not in the server.')] });

    // Save to DB
    await new ModLog({ guildId: interaction.guild.id, userId: target.id, moderatorId: interaction.user.id, type: 'warn', reason }).save();

    // DM user (no moderator name)
    const dm = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('Warning Received')
      .setDescription(`You have been warned in **${interaction.guild.name}**`)
      .addFields({ name: 'Reason', value: reason });
    await target.send({ embeds: [dm] }).catch(() => {});

    // Send to logs
    const logChannel = interaction.guild.channels.cache.get(LOGS_CHANNEL_ID);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('User Warned')
        .addFields(
          { name: 'User', value: `${target.tag} (${target.id})` },
          { name: 'Moderator', value: interaction.user.toString() },
          { name: 'Reason', value: reason }
        );
      logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }

    // Response to staff
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('User Warned')
      .setDescription(`${target} has been warned\n**Reason:** ${reason}`);

    await interaction.editReply({ embeds: [embed] });
  }
};