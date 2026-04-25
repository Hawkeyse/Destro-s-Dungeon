const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID')
    .addStringOption(o => o.setName('user-id').setDescription('User ID to unban').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('Missing Permission').setDescription('You need **Ban Members** permission.')] });
    }

    const userId = interaction.options.getString('user-id');
    if (!/^\d{17,19}$/.test(userId)) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF5555').setTitle('Invalid ID').setDescription('Please provide a valid user ID.')] });
    }

    await interaction.guild.bans.remove(userId).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('User Unbanned')
      .setDescription(`User ID \`${userId}\` has been unbanned.`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};