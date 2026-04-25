const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const BANNER_URL = 'https://imgur.com/JRC0Axu.png';

const ROLES = [
  {
    id: '1355360760376856817',
    name: 'YouTube Pings',
    emoji: '<:300997neonyoutubeplaybutton:1485936376649355355>',
    description: 'Get notified when new videos are uploaded'
  },
  {
    id: '1485944000782270606',
    name: 'Giveaway Pings',
    emoji: '<a:2738giveaway:1485936345217241099>',
    description: 'Never miss a giveaway'
  },
  {
    id: '1485944357021421670',
    name: 'X / Twitter Pings',
    emoji: '<:621846xlogo:1485936359779598347>',
    description: 'Get notified about tweets & announcements'
  },
  {
    id: '1493299630597996677',           // ← New role
    name: 'Tactical Support',
    emoji: '<a:85541cocfight:1493666216081096934>',
    description: 'Get notified for attack help & base reviews'
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Choose your notification roles'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('Choose Your Roles')
      .setDescription('Click the buttons below to **add** or **remove** notification roles:')
      .setImage(BANNER_URL)
      .setFooter({ text: "Destroyer's Dungeon • Reaction Roles" });

    const rows = [];
    let currentRow = new ActionRowBuilder();

    for (const role of ROLES) {
      const button = new ButtonBuilder()
        .setCustomId(`role_${role.id}`)
        .setLabel(role.name)
        .setEmoji(role.emoji)
        .setStyle(ButtonStyle.Secondary);

      currentRow.addComponents(button);

      // Max 5 buttons per row
      if (currentRow.components.length === 5) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
    }

    // Push the last row if it has buttons
    if (currentRow.components.length > 0) {
      rows.push(currentRow);
    }

    try {
      await interaction.channel.send({ embeds: [embed], components: rows });
      await interaction.editReply({ 
        content: '✅ Role selection panel has been posted successfully!' 
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ 
        content: '❌ Failed to post the role panel. Check bot permissions.' 
      });
    }
  }
};