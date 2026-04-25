const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');
const fetch = require('node-fetch');
const { logger } = require('../index.js');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trackyt')
    .setDescription('Set YouTube channel for subscriber tracking')
    .addStringOption(option =>
      option.setName('input')
        .setDescription('YouTube Channel ID (starts with UC...) or @username')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let input = interaction.options.getString('input').trim();
    let channelId = input;

    if (input.startsWith('@')) {
      try {
        const username = input.slice(1);
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(username)}&key=${YOUTUBE_API_KEY}`;
        const res = await fetch(searchUrl).then(r => r.json());

        if (res.items && res.items.length > 0) {
          channelId = res.items[0].snippet.channelId;
        } else {
          return interaction.editReply({
            embeds: [new EmbedBuilder().setColor('#FF5555').setDescription(`<:874346wrong:1440682352614576129> Could not find YouTube channel for **${input}**.`)]
          });
        }
      } catch (e) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF5555').setDescription(`<:874346wrong:1440682352614576129> Error while searching for the channel.`)] });
      }
    }

    try {
      const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(statsUrl).then(r => r.json());

      if (!res.items || res.items.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('#FF5555').setDescription(`<:874346wrong:1440682352614576129> Invalid YouTube Channel ID or username.`)]
        });
      }

      const subs = parseInt(res.items[0].statistics.subscriberCount || 0);
      global.youtubeChannelId = channelId;

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setDescription(`<:23646yes:1485713751897276659> **YouTube tracking enabled!**\nChannel: \`${channelId}\`\nCurrent subscribers: **${subs.toLocaleString()}**`);

      await interaction.editReply({ embeds: [embed] });
      logger.info(`YouTube tracking set to ${channelId} by ${interaction.user.tag}`);

    } catch (err) {
      console.error(err);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor('#FF5555').setDescription(`<:874346wrong:1440682352614576129> Failed to fetch YouTube data. Check API key.`)]
      });
    }
  }
};