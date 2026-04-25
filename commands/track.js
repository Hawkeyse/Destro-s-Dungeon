const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { logger } = require('../index.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('track')
    .setDescription('Configure live tracking (YouTube + Discord stats)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('<a:9093settings:1485949457546743900> Live Tracking Settings')
      .setDescription(
        'Enable or disable automatic counters.\n\n' +
        '• YouTube Subscribers\n' +
        '• Discord Members\n' +
        '• Discord Channels\n\n' +
        '<:8649warning:1485949609904705586> **Note:** Updates every 10 minutes.'
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('track_yt_enable').setLabel('YouTube Subscribers').setEmoji('<:8373activ:1485946354067836979>').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('track_yt_disable').setLabel('YouTube Subscribers').setEmoji('<:6245disactiv:1485946351022899200>').setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('track_members_enable').setLabel('Discord Members').setEmoji('<:8373activ:1485946354067836979>').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('track_members_disable').setLabel('Discord Members').setEmoji('<:6245disactiv:1485946351022899200>').setStyle(ButtonStyle.Danger)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('track_channels_enable').setLabel('Discord Channels').setEmoji('<:8373activ:1485946354067836979>').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('track_channels_disable').setLabel('Discord Channels').setEmoji('<:6245disactiv:1485946351022899200>').setStyle(ButtonStyle.Danger)
    );

    await interaction.channel.send({ embeds: [embed], components: [row1, row2, row3] });

    await interaction.editReply({ content: '✅ Tracking settings panel posted successfully!' });
  },

  // This is what fixes "Interaction failed" for track buttons
  async onInteraction(interaction) {
    if (!interaction.isButton() || !interaction.customId.startsWith('track_')) return;

    await interaction.deferReply({ ephemeral: true });

    const [_, type, action] = interaction.customId.split('_');
    let displayName = '';
    if (type === 'yt') displayName = 'YouTube Subscribers';
    else if (type === 'members') displayName = 'Discord Members';
    else if (type === 'channels') displayName = 'Discord Channels';

    const status = action === 'enable' ? 'enabled' : 'disabled';
    const color = action === 'enable' ? '#00FF00' : '#FF5555';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`<:23646yes:1485713751897276659> **${displayName}** tracking has been **${status}**!`);

    await interaction.editReply({ embeds: [embed] });
    logger.info(`Tracking ${status} for ${type} by ${interaction.user.tag}`);

    // TODO: Add actual counter voice channel creation logic here later
    if (action === 'enable') {
      // We can create voice counters here in the future
      // For now just log it
      logger.info(`[TODO] Would create voice counter for ${type}`);
    }
  }
};