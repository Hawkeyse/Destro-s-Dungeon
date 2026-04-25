const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const BOOSTER_ROLE_ID = '1178502954056171531';
const ADMIN_ROLE_IDS = [
  '1353061892804837409',   // Current admin
  '1135997148119449612'    // New added admin
];

const COLOR_ROLES = [
  {
    id: '1485973676951207967',
    name: 'Elixir Purple',
    emoji: '<:91000elixir:1485980812586254346>'
  },
  {
    id: '1485977081283088505',
    name: 'Blood Raider',
    emoji: '<:21789elixirred:1485980794496483468>'
  },
  {
    id: '1485975445185761451',
    name: 'Dark Elixir',
    emoji: '<:90110darkelixir:1485980822250065931>'
  },
  {
    id: '1485975291255066747',
    name: 'Gold',
    emoji: '<:88655gold:1485980826012356770>'
  },
  {
    id: '1485976388698636438',
    name: 'Gem Green',
    emoji: '<:7147gems:1485980832047956010>'
  }
];

const WRONG_EMOJI = '<:874346wrong:1440682352614576129>';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boostercolors')
    .setDescription('Booster exclusive color roles (Admins + Boosters)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const isAllowed = member.roles.cache.has(BOOSTER_ROLE_ID) || 
                      ADMIN_ROLE_IDS.some(id => member.roles.cache.has(id));

    if (!isAllowed) {
      return interaction.editReply({
        content: `${WRONG_EMOJI} **Access declined!** Only server boosters can use these colors.\nAdmins can also manage them.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('Booster Colors')
      .setDescription('Click the buttons below to **add** or **remove** your color.\nOnly boosters (and admins) can use these roles.')
      .setFooter({ text: "Destroyer's Dungeon • Booster Perks" });

    const rows = [];
    let row = new ActionRowBuilder();

    COLOR_ROLES.forEach(role => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`boostercolor_${role.id}`)
          .setLabel(role.name)
          .setEmoji(role.emoji)
          .setStyle(ButtonStyle.Secondary)
      );

      if (row.components.length === 5) {
        rows.push(row);
        row = new ActionRowBuilder();
      }
    });

    // Remove All button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('boostercolor_removeall')
        .setLabel('Remove All Colors')
        .setEmoji(WRONG_EMOJI)
        .setStyle(ButtonStyle.Danger)
    );
    rows.push(row);

    await interaction.channel.send({ embeds: [embed], components: rows });
    await interaction.editReply({ content: '✅ Booster color panel posted!' });
  },

  // Button handler
  async onInteraction(interaction) {
    if (!interaction.isButton() || !interaction.customId.startsWith('boostercolor_')) return;

    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const isAllowed = member.roles.cache.has(BOOSTER_ROLE_ID) || 
                      ADMIN_ROLE_IDS.some(id => member.roles.cache.has(id));

    if (!isAllowed) {
      return interaction.editReply({
        content: `${WRONG_EMOJI} **Access declined!** Only server boosters can use these colors.\nAdmins can also manage them.`,
        ephemeral: true
      });
    }

    const customId = interaction.customId;

    // Remove All Colors
    if (customId === 'boostercolor_removeall') {
      let count = 0;
      for (const r of COLOR_ROLES) {
        if (member.roles.cache.has(r.id)) {
          await member.roles.remove(r.id).catch(() => {});
          count++;
        }
      }
      return interaction.editReply({ 
        content: count > 0 ? '✅ All booster colors have been removed.' : 'You had no booster colors to remove.' 
      });
    }

    // Toggle single color
    const roleId = customId.split('_')[1];
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return interaction.editReply({ content: '❌ Role not found.' });

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await interaction.editReply({ content: `🗑️ **${role.name}** has been removed.` });
    } else {
      await member.roles.add(roleId);
      await interaction.editReply({ content: `🎨 **${role.name}** has been assigned!` });
    }
  }
};