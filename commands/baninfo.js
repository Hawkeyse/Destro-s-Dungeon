const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { ModLog } = require('../utils/modlog.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('baninfo')
    .setDescription('View ban history of a user')
    .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('Missing Permission').setDescription('You need **Ban Members** permission.')] });
    }

    const user = interaction.options.getUser('user');
    const logs = await ModLog.find({ guildId: interaction.guild.id, userId: user.id, type: 'ban' }).sort({ timestamp: -1 }).limit(5);

    if (logs.length === 0) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('No Ban History').setDescription('This user has never been banned.')] });
    }

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(`Ban History • ${user.tag}`)
      .setThumbnail(user.displayAvatarURL());

    logs.forEach((log, i) => {
      embed.addFields({
        name: `Ban #${i + 1}`,
        value: `**Reason:** ${log.reason}\n**By:** <@${log.moderatorId}>\n**Date:** <t:${Math.floor(log.timestamp / 1000)}:F>`,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
};