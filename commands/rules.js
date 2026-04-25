const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Hardcoded rules (your exact list)
const RULES = [
  {
    name: '<:Dotorrange:1440378859114467510> No Advertising',
    value: '<:BF9:1440378996108824640> Promotion of external content is not permitted. This includes Discord server invites, social media accounts, and solicitations for staff or followers. Asking others to contact you privately for links also counts as advertising. Violations may result in a permanent ban.'
  },
  {
    name: '<:Dotorrange:1440378859114467510> No NSFW or Inappropriate Content',
    value: '<:BF9:1440378996108824640> Sexually explicit or suggestive content is strictly prohibited. This includes innuendos and graphic descriptions. If a moderator asks you to refrain from certain behaviour, you are expected to comply without argument.'
  },
  {
    name: '<:Dotorrange:1440378859114467510> No Harassment or Targeted Behaviour',
    value: '<:BF9:1440378996108824640> Respect the personal boundaries of others. If someone asks you to stop a particular interaction, you must do so. Continued unwanted behaviour will not be tolerated.'
  },
  {
    name: '<:Dotorrange:1440378859114467510> Maintain Respectful Communication',
    value: '<:BF9:1440378996108824640> Treat all members with basic courtesy. While formal language is not required, disrespectful or inflammatory behaviour will result in moderation.'
  },
  {
    name: '<:Dotorrange:1440378859114467510> No Evasion of Disciplinary Actions',
    value: '<:BF9:1440378996108824640> Attempting to bypass punishments—such as by using alternate accounts or asking others to speak on your behalf—will result in escalated consequences, including permanent removal.'
  },
  {
    name: '<:Dotorrange:1440378859114467510> Avoid Public Drama',
    value: '<:BF9:1440378996108824640> Personal disputes should be handled privately. If someone violates a rule, contact a moderator rather than addressing it in public channels.'
  },
  {
    name: '<:Dotorrange:1440378859114467510> Use Channels Appropriately',
    value: '<:BF9:1440378996108824640> Post in the correct channels according to their intended purpose. For example, help requests should not be posted in general chat.'
  },
  {
    name: '<:Dotorrange:1440378859114467510> Do Not Challenge Moderation Publicly',
    value: '<:BF9:1440378996108824640> If you have concerns about a moderator’s actions, reach out to them directly and respectfully. If necessary, escalate the issue to senior staff. Public outbursts or arguments about moderation are not acceptable.'
  },
  {
    name: '<:Dotorrange:1440378859114467510> Use Common Sense',
    value: '<:BF9:1440378996108824640> Not all rules can be explicitly stated. If you’re unsure whether something is appropriate, ask a moderator. If you are told to stop a behaviour, you are expected to stop.'
  },
  {
    name: '<:Dotorrange:1440378859114467510> Follow All Terms of Service',
    value: '<:BF9:1440378996108824640> You must comply with Discord’s Terms of Service, as well as any specific terms established by this community.'
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('View the server rules—obey or face the dungeon\'s wrath!'),

  async execute(interaction) {
    // Defer ephemerally (hidden ack, no visible reply)
    await interaction.deferReply({ ephemeral: true });

    try {
      const { channel } = interaction;

      // Banner: Simple orange embed with image
      const bannerEmbed = new EmbedBuilder()
        .setColor('#FFA500') // Orange
        .setImage('https://i.imgur.com/ZqUzvYp.png'); // Your Imgur direct link

      await channel.send({ embeds: [bannerEmbed] });

      // Rules: Orange embed with fields, no timestamp/footer
      const rulesEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📜 Server Rules')
        .addFields(RULES);

      await channel.send({ embeds: [rulesEmbed] });

      // Optional: Ephemeral success message to user
      await interaction.editReply({ content: '✅ Rules posted in the channel!' });
    } catch (error) {
      console.error('Rules command error:', error);
      await interaction.editReply({ content: '❌ Failed to post rules—check console!' });
    }
  },
};