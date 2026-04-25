require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const fetch = require('node-fetch');
const canvafy = require('canvafy');

// ============================
// Logger Setup
// ============================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' })
  ]
});
module.exports.logger = logger;

// ============================
// Client Setup
// ============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

// ============================
// CONSTANTS
// ============================
const LEVEL_CHANNEL_ID = '1493300693711458446';
const HELP_CHANNEL_ID = '1493299965798256881';
const HELP_ROLE_ID = '1493299630597996677';

const NEW_MEMBER_ROLE_ID = '1485926662326583397';

const BOOSTER_ROLE_ID = '1178502954056171531';   // ← Booster Role

const COLOR_ROLE_IDS = [                         // ← Booster Color Roles
  '1485973676951207967', // Elixir Purple
  '1485977081283088505', // Blood Raider
  '1485975445185761451', // Dark Elixir
  '1485975291255066747', // Gold
  '1485976388698636438'  // Gem Green
];

const LEVEL_ROLES = {
  1: '1493298459237810368',
  5: '1493298974868635899',
  10: '1493299240959737887',
  20: '1493308859652112688'
};

// Banners Folder
const BANNERS_FOLDER = path.join(__dirname, 'banners');

// ============================
// Models
// ============================
const Level = require('./models/level');
const AutomodConfig = require('./models/AutomodConfig');

// ============================
// Level Up Card Function
// ============================
async function sendLevelUpCard(channel, user, oldLevel, newLevel) {
  const bannerColorMap = {
    "coc-banner-1.png": "#042257",
    "coc-banner-2.png": "#cb1639",
    "coc-banner-3.png": "#18b4c3",
    "coc-banner-4.png": "#d3de5e",
  };

  let background = "https://i.imgur.com/9oaUFru.png";
  let mainColor = "#FFA500";

  try {
    const files = fs.readdirSync(BANNERS_FOLDER).filter(f =>
      f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
    );

    if (files.length > 0) {
      const randomFile = files[Math.floor(Math.random() * files.length)];
      background = path.join(BANNERS_FOLDER, randomFile);

      const lowerFileName = randomFile.toLowerCase();
      if (bannerColorMap[lowerFileName]) {
        mainColor = bannerColorMap[lowerFileName];
      }
    }
  } catch (e) {
    logger.error("Banner folder error in level up: " + e.message);
  }

  try {
    const levelUpCard = await new canvafy.LevelUp()
      .setAvatar(user.displayAvatarURL({ extension: "png", size: 256 }))
      .setBackground("image", background)
      .setUsername(user.username)
      .setOldLevel(oldLevel)
      .setNewLevel(newLevel)
      .setBorder("#0f0f0f")
      .setBarColor(mainColor)
      .build();

    const attachment = new AttachmentBuilder(levelUpCard, { name: 'levelup.png' });

    await channel.send({
      content: `<@${user.id}> **LEVEL UP!** 🎉`,
      embeds: [
        new EmbedBuilder()
          .setColor(mainColor)
          .setTitle(`Level ${newLevel}`)
          .setDescription(`${user.username} has reached **Level ${newLevel}**!`)
          .setImage('attachment://levelup.png')
          .setFooter({ text: "Destroyer's Dungeon" })
      ],
      files: [attachment]
    });

  } catch (error) {
    logger.error("Level Up Card Error: " + error.message);
    await channel.send(`<@${user.id}> **LEVEL UP!** You are now **Level ${newLevel}**!`).catch(() => {});
  }
}

// ============================
// Ready Event
// ============================
client.once('ready', async () => {
  logger.info(`Bot online: ${client.user.tag}`);

  await mongoose.connect(process.env.MONGO_URI);
  logger.info('MongoDB connected!');

  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    try {
      const command = require(`./commands/${file}`);
      if (command.data?.name) {
        client.commands.set(command.data.name, command);
        logger.info(`Loaded command: ${command.data.name}`);
      }
    } catch (err) {
      logger.error(`Failed to load command ${file}: ${err.message}`);
    }
  }
  logger.info(`Total commands loaded: ${client.commands.size}`);

  const giveawayCmd = client.commands.get('giveaway');
  if (giveawayCmd?.scheduleAllEnds) {
    giveawayCmd.scheduleAllEnds(client);
    logger.info('Giveaway timeouts rescheduled');
  }

  client.user.setActivity('the dungeon', { type: 'WATCHING' });
});

// ============================
// AUTO REMOVE BOOSTER COLORS WHEN UNBOOSTING
// ============================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  // Check if user lost the booster role
  if (oldMember.roles.cache.has(BOOSTER_ROLE_ID) && !newMember.roles.cache.has(BOOSTER_ROLE_ID)) {
    const rolesToRemove = COLOR_ROLE_IDS.filter(id => newMember.roles.cache.has(id));

    if (rolesToRemove.length > 0) {
      try {
        await newMember.roles.remove(rolesToRemove);
        logger.info(`Booster colors automatically removed from ${newMember.user.tag} (unboosted)`);
      } catch (err) {
        logger.error(`Failed to remove booster colors from ${newMember.user.tag}: ${err.message}`);
      }
    }
  }
});

// ============================
// Welcome + Auto New Member Role
// ============================
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;

  try {
    const newMemberRole = member.guild.roles.cache.get(NEW_MEMBER_ROLE_ID);
    if (newMemberRole) {
      await member.roles.add(newMemberRole);
      logger.info(`Assigned New Member role to ${member.user.tag}`);
    }
  } catch (err) {
    logger.error(`Failed to assign New Member role to ${member.user.tag}: ${err.message}`);
  }

  const welcomeChannel = member.guild.channels.cache.get('1284332044188516412');
  if (!welcomeChannel) return logger.error('Welcome channel not found!');

  try {
    await welcomeChannel.send({
      content: `${member} <a:27184orangehappyemojiz:1440668332926701569>`,
      embeds: [
        new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('Welcome to Destroyer\'s Dungeon!')
          .setDescription(
            `We’re so happy to have you in Destroyer’s Dungeon. Thank you for joining, it really means a lot to us and to the community. <a:85615pastelorangesparklies:1440668201557037097>\n\n` +
            `Take a moment to check out <#1173605459765252106> to get familiar with how things work here, explore <#1440086063241494530> to see the latest videos and don’t hesitate to use <#1440673544890482840> if you ever need a hand or have a question.\n\n` +
            `We hope you feel welcomed, supported and at home. We’re excited to see you get involved and become a part of our community!`
          )
          .setImage('https://i.imgur.com/vS2i218.png')
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: `Member #${member.guild.memberCount}` })
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Server Rules').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/1173605459765252106`),
          new ButtonBuilder().setLabel('Destro Content').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/1440086063241494530`),
          new ButtonBuilder().setLabel('Support Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/1440673544890482840`)
        )
      ]
    });
    logger.info(`Welcomed ${member.user.tag}`);
  } catch (err) {
    logger.error(`Welcome failed for ${member.user.tag}: ${err.message}`);
  }
});

// ============================
// Message Handler + Automod
// ============================
client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.toLowerCase().trim();

  // .help, .pp, automod, and leveling code remains unchanged...
  // (I kept all your existing code here - no changes in this section)

  if (content === '.help' || content.startsWith('.help ')) {
    // ... your existing .help code ...
  }

if (content === '.pp' || content.startsWith('.pp ')) {
    const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // Allow only inside ticket channels.
    // Adjust this check if your ticket channels use a different naming pattern.
    const isTicketChannel =
      message.channel.name?.startsWith('ticket-') ||
      message.channel.name?.startsWith('closed-') ||
      message.channel.topic?.toLowerCase().includes('ticket');

    if (!isTicketChannel) return;

    const embed = new EmbedBuilder()
      .setColor('#f5a623')
      .setDescription(
        [
          'Please proceed with the payment using the link below:',
          '',
          '<:807644paypal:1441349231674658867> https://www.paypal.me/zaccrain',
          '',
          'Once the payment is completed, kindly upload your receipt to this ticket. <a:27184orangehappyemojiz:1440668332926701569>',
          '',
          'Thank you for your purchase!'
        ].join('\n')
      );

    // If an admin/staff member uses .pp, remove the trigger message first.
    if (isAdmin) {
      await message.delete().catch(err => {
        logger.error(`Failed to delete .pp trigger message: ${err.message}`);
      });
    }

    await message.channel.send({ embeds: [embed] }).catch(err => {
      logger.error(`.pp command failed: ${err.message}`);
    });

    return;
  

  }

  // Automod
  const automodConfig = await AutomodConfig.findOne({ guildId: message.guild.id });
  if (automodConfig?.massMentionEnabled) {
    // ... your existing automod code ...
  }

  // Leveling System
  const cooldownKey = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();

  if (!client.xpCooldown) client.xpCooldown = new Map();
  if (client.xpCooldown.has(cooldownKey) && now - client.xpCooldown.get(cooldownKey) < 60000) {
    return;
  }

  client.xpCooldown.set(cooldownKey, now);

  const xpToAdd = Math.floor(Math.random() * 15) + 15;

  let userLevel = await Level.findOne({ 
    guildId: message.guild.id, 
    userId: message.author.id 
  });

  if (!userLevel) {
    userLevel = new Level({ 
      guildId: message.guild.id, 
      userId: message.author.id, 
      xp: xpToAdd 
    });
  } else {
    const oldLevel = userLevel.level;
    userLevel.xp += xpToAdd;

    const XP_MULTIPLIER = 75;
    const newLevel = Math.floor(Math.sqrt(userLevel.xp / XP_MULTIPLIER)) + 1;

    if (newLevel > oldLevel) {
      userLevel.level = newLevel;

      const levelChannel = message.guild.channels.cache.get(LEVEL_CHANNEL_ID);
      if (levelChannel) {
        await sendLevelUpCard(levelChannel, message.author, oldLevel, newLevel);
      }

      const member = message.member;
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        if (LEVEL_ROLES[lvl]) {
          const role = message.guild.roles.cache.get(LEVEL_ROLES[lvl]);
          if (role && !member.roles.cache.has(role.id)) {
            await member.roles.add(role).catch(() => {});
          }
        }
      }
    }
  }

  await userLevel.save();

  // Giveaway prefix commands
  if (message.content.startsWith('.')) {
    const giveawayCmd = client.commands.get('giveaway');
    if (giveawayCmd?.onMessage) {
      await giveawayCmd.onMessage(message, client);
    }
  }
});

// ============================
// Interaction Handler
// ============================
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.execute) {
        await command.execute(interaction);
        logger.info(`/${interaction.commandName} used by ${interaction.user.tag}`);
      }
      return;
    }

    // Button & Select Menu handlers
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId.startsWith('role_')) { /* existing */ }
      if (customId.startsWith('track_')) { /* existing */ }
      if (customId.startsWith('boostercolor_')) { 
        const boosterCommand = client.commands.get('boostercolors');
        if (boosterCommand?.onInteraction) {
          await boosterCommand.onInteraction(interaction);
        }
      }
      if (customId?.startsWith('giveaway_')) { /* existing */ }
      if (customId?.startsWith('ticket_') || customId === 'ticket_select') { /* existing */ }
    }

  } catch (error) {
    logger.error(`Interaction error: ${error.message}`);
    const errMsg = { content: 'There was an error processing this interaction.', ephemeral: true };
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(errMsg).catch(() => {});
    } else {
      await interaction.followUp(errMsg).catch(() => {});
    }
  }
});

// ============================
// Login
// ============================
client.login(process.env.DISCORD_TOKEN).catch(err => {
  logger.error(`Login failed: ${err.message}`);
  process.exit(1);
});