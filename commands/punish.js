// commands/punish.js — NOW WITH PUNISHED ROLE + AUTO REMOVAL
const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const PUNISHED_ROLE_ID = '1440654322068095017';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('punish')
    .setDescription('Punish a user with timeout + Punished role')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('1h, 30m, 7d').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('No Permission')] });

    const member = interaction.options.getMember('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason');

    let ms = 0;
    const m = durationStr.match(/(\d+)([mhd])/i);
    if (!m) return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF5555').setTitle('Invalid Format').setDescription('Use: 1h, 30m, 7d')] });
    const n = parseInt(m[1]);
    if (m[2] === 'm') ms = n * 60 * 1000;
    if (m[2] === 'h') ms = n * 3600 * 1000;
    if (m[2] === 'd') ms = n * 86400 * 1000;

    const until = Date.now() + ms;
    const endTime = Math.floor(until / 1000);

    await member.timeout(until, reason);
    await member.roles.add(PUNISHED_ROLE_ID).catch(() => {});

    // Auto-remove role when time ends
    setTimeout(async () => {
      const m = await interaction.guild.members.fetch(member.id).catch(() => null);
      if (m) {
        await m.roles.remove(PUNISHED_ROLE_ID).catch(() => {});
        await m.timeout(null).catch(() => {});
      }
    }, ms);

    const embed = new EmbedBuilder().setColor('#FF0000')
      .setTitle('User Punished')
      .setDescription(`${member.user} has been punished\n**Duration:** ${durationStr}\n**Ends:** <t:${endTime}:F>`);

    await interaction.editReply({ embeds: [embed] });
  }
};