const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unpunish')
    .setDescription('Remove timeout from a user')
    .addUserOption(o => o.setName('user').setDescription('User to unpunish').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('Missing Permission').setDescription('You need **Moderate Members** permission.')] });
    }

    const member = interaction.options.getMember('user');
    if (!member.isCommunicationDisabled()) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF5555').setTitle('Not Timed Out').setDescription('This user is not currently timed out.')] });
    }

    await member.timeout(null);

    const dm = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Timeout Removed')
      .setDescription(`Your timeout in **${interaction.guild.name}** has been removed.`);
    await member.user.send({ embeds: [dm] }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Timeout Removed')
      .setDescription(`Timeout removed from ${member.user}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};