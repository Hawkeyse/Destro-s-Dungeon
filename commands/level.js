// commands/level.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');

const canvafy = require('canvafy');
const fs = require('fs');
const path = require('path');
const Level = require('../models/level');

const BANNERS_FOLDER = path.join(__dirname, '../banners');

// Exact banner name → Color mapping
const bannerColorMap = {
  "coc-banner-1.png": "#042257",
  "coc-banner-2.png": "#cb1639",
  "coc-banner-3.png": "#18b4c3",
  "coc-banner-4.png": "#d3de5e",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Show your level / rank card'),

  async execute(interaction) {
    await interaction.deferReply();

    let userData = await Level.findOne({
      guildId: interaction.guild.id,
      userId: interaction.user.id
    }) || { xp: 0, level: 1 };

    const XP_MULTIPLIER = 75;
    const currentLevel = Math.floor(Math.sqrt(userData.xp / XP_MULTIPLIER)) + 1;
    const levelStartXP = (currentLevel - 1) ** 2 * XP_MULTIPLIER;
    const nextLevelXP = currentLevel ** 2 * XP_MULTIPLIER;
    const xpProgress = Math.max(0, userData.xp - levelStartXP);
    const xpRequired = nextLevelXP - levelStartXP;

    // === Random Banner + Matching Color ===
    let background = "https://i.imgur.com/9oaUFru.png";
    let mainColor = "#FFA500"; // fallback

    try {
      const files = fs.readdirSync(BANNERS_FOLDER).filter(f =>
        f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
      );

      if (files.length > 0) {
        const randomFile = files[Math.floor(Math.random() * files.length)];
        background = path.join(BANNERS_FOLDER, randomFile);

        // Match color if banner exists in map
        if (bannerColorMap[randomFile.toLowerCase()]) {
          mainColor = bannerColorMap[randomFile.toLowerCase()];
        }
      }
    } catch (e) {
      console.log("Banner folder error");
    }

    try {
      const rankCard = await new canvafy.Rank()
        .setAvatar(interaction.user.displayAvatarURL({ extension: "png", size: 256 }))
        .setBackground("image", background)
        .setUsername(interaction.user.username)
        .setBorder("#0f0f0f")
        .setBarColor(mainColor)
        .setLevel(currentLevel)
        .setRank(1)
        .setCurrentXp(xpProgress)
        .setRequiredXp(xpRequired)
        .build();

      const attachment = new AttachmentBuilder(rankCard, { name: 'rank.png' });

      const embed = new EmbedBuilder()
        .setColor(mainColor)
        .setTitle(`${interaction.user.username}'s Rank`)
        .setDescription(`**Level ${currentLevel}** • **${xpProgress.toLocaleString()} / ${xpRequired.toLocaleString()} XP**`)
        .setImage('attachment://rank.png')
        .setFooter({ text: "Destroyer's Dungeon" });

      await interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (error) {
      console.error("Rank card error:", error);
      await interaction.editReply({
        content: "❌ Failed to generate rank card.",
        ephemeral: true
      });
    }
  }
};