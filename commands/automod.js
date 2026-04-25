// commands/automod.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require('discord.js');

const AutomodConfig = require('../models/AutomodConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Manage automod features')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand(sub => sub
      .setName('badwords-toggle')
      .setDescription('Enable or disable the bad words filter')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Turn bad words filter on or off').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('spam-toggle')
      .setDescription('Enable or disable spam detection')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Turn spam detection on or off').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('link-toggle')
      .setDescription('Enable or disable link blocking')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Turn link blocking on or off').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('massmention-toggle')
      .setDescription('Enable or disable anti @everyone/@here & discord.gg protection')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Turn mass mention protection on or off').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('set-spam-threshold')
      .setDescription('Set how many messages in 10 seconds count as spam')
      .addIntegerOption(opt => opt.setName('threshold').setDescription('Number of messages (1–20)').setRequired(true).setMinValue(1).setMaxValue(20)))
    .addSubcommand(sub => sub
      .setName('add-badword')
      .setDescription('Add a word to the bad words list')
      .addStringOption(opt => opt.setName('word').setDescription('The word to block').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove-badword')
      .setDescription('Remove a word from the bad words list')
      .addStringOption(opt => opt.setName('word').setDescription('The exact word to remove').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('add-whitelist')
      .setDescription('Allow a domain (e.g. youtube.com)')
      .addStringOption(opt => opt.setName('domain').setDescription('Domain like youtube.com').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('remove-whitelist')
      .setDescription('Remove a domain from the whitelist')
      .addStringOption(opt => opt.setName('domain').setDescription('Exact domain to remove').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('View current automod configuration')),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ 
        embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('Permission Denied').setDescription('You need **Manage Server** permission.')], 
        ephemeral: true 
      });
    }

    let config = await AutomodConfig.findOne({ guildId: interaction.guild.id });
    if (!config) {
      config = new AutomodConfig({ guildId: interaction.guild.id });
      await config.save();
    }

    const embed = new EmbedBuilder().setColor('#FFA500').setTimestamp();

    switch (interaction.options.getSubcommand()) {

      case 'badwords-toggle':
        config.badWordsEnabled = interaction.options.getBoolean('enabled');
        await config.save();
        embed.setTitle('Bad Words Filter Updated')
          .setDescription(`Bad words filter is now **${config.badWordsEnabled ? 'Enabled' : 'Disabled'}** ${config.badWordsEnabled ? '<:8373activ:1485946354067836979>' : '<:6245disactiv:1485946351022899200>'}`);
        break;

      case 'spam-toggle':
        config.spamEnabled = interaction.options.getBoolean('enabled');
        await config.save();
        embed.setTitle('Spam Detection Updated')
          .setDescription(`Spam detection is now **${config.spamEnabled ? 'Enabled' : 'Disabled'}** ${config.spamEnabled ? '<:8373activ:1485946354067836979>' : '<:6245disactiv:1485946351022899200>'}`);
        break;

      case 'link-toggle':
        config.linkEnabled = interaction.options.getBoolean('enabled');
        await config.save();
        embed.setTitle('Link Blocking Updated')
          .setDescription(`Link blocking is now **${config.linkEnabled ? 'Enabled' : 'Disabled'}** ${config.linkEnabled ? '<:8373activ:1485946354067836979>' : '<:6245disactiv:1485946351022899200>'}`);
        break;

      case 'massmention-toggle':
        config.massMentionEnabled = interaction.options.getBoolean('enabled');
        await config.save();
        embed.setTitle('Mass Mention Protection Updated')
          .setDescription(`Anti @everyone / @here / discord.gg protection is now **${config.massMentionEnabled ? 'Enabled' : 'Disabled'}** ${config.massMentionEnabled ? '<:8373activ:1485946354067836979>' : '<:6245disactiv:1485946351022899200>'}`);
        break;

      case 'set-spam-threshold':
        const threshold = interaction.options.getInteger('threshold');
        config.spamThreshold = threshold;
        await config.save();
        embed.setTitle('Spam Threshold Updated')
          .setDescription(`Users can now send **${threshold} messages** in ${config.spamWindow} seconds before being detected as spam.`);
        break;

      case 'add-badword':
        const word = interaction.options.getString('word').toLowerCase().trim();
        if (config.badWords.includes(word)) {
          embed.setColor('#FF5555').setTitle('Already Exists').setDescription(`"${word}" is already in the bad words list.`);
        } else {
          config.badWords.push(word);
          await config.save();
          embed.setTitle('Bad Word Added').setDescription(`**${word}** has been added to the filter.`);
        }
        break;

      case 'remove-badword':
        const rmWord = interaction.options.getString('word').toLowerCase().trim();
        if (!config.badWords.includes(rmWord)) {
          embed.setColor('#FF5555').setTitle('Not Found').setDescription(`"${rmWord}" is not in the bad words list.`);
        } else {
          config.badWords = config.badWords.filter(w => w !== rmWord);
          await config.save();
          embed.setTitle('Bad Word Removed').setDescription(`**${rmWord}** has been removed from the filter.`);
        }
        break;

      case 'add-whitelist':
        const domain = interaction.options.getString('domain').toLowerCase().trim();
        if (config.linkWhitelist.includes(domain)) {
          embed.setColor('#FF5555').setTitle('Already Whitelisted').setDescription(`**${domain}** is already allowed.`);
        } else {
          config.linkWhitelist.push(domain);
          await config.save();
          embed.setTitle('Domain Whitelisted').setDescription(`**${domain}** is now allowed in messages.`);
        }
        break;

      case 'remove-whitelist':
        const rmDomain = interaction.options.getString('domain').toLowerCase().trim();
        if (!config.linkWhitelist.includes(rmDomain)) {
          embed.setColor('#FF5555').setTitle('Not Whitelisted').setDescription(`**${rmDomain}** is not in the whitelist.`);
        } else {
          config.linkWhitelist = config.linkWhitelist.filter(d => d !== rmDomain);
          await config.save();
          embed.setTitle('Domain Removed').setDescription(`**${rmDomain}** is no longer whitelisted.`);
        }
        break;

      case 'list':
        embed.setTitle('Current Automod Configuration')
          .addFields(
            { name: 'Bad Words Filter', value: `${config.badWordsEnabled ? 'Enabled' : 'Disabled'} ${config.badWordsEnabled ? '<:8373activ:1485946354067836979>' : '<:6245disactiv:1485946351022899200>'}`, inline: true },
            { name: 'Spam Detection', value: `${config.spamEnabled ? 'Enabled' : 'Disabled'} ${config.spamEnabled ? '<:8373activ:1485946354067836979>' : '<:6245disactiv:1485946351022899200>'}`, inline: true },
            { name: 'Link Blocking', value: `${config.linkEnabled ? 'Enabled' : 'Disabled'} ${config.linkEnabled ? '<:8373activ:1485946354067836979>' : '<:6245disactiv:1485946351022899200>'}`, inline: true },
            { name: 'Mass Mention Protection', value: `${config.massMentionEnabled ? 'Enabled' : 'Disabled'} ${config.massMentionEnabled ? '<:8373activ:1485946354067836979>' : '<:6245disactiv:1485946351022899200>'}`, inline: true },
            { name: 'Spam Threshold', value: `${config.spamThreshold} msgs / ${config.spamWindow}s`, inline: true },
            { name: 'Whitelisted Domains', value: config.linkWhitelist.length ? config.linkWhitelist.slice(0, 15).join(', ') : 'None', inline: false }
          )
          .setFooter({ text: 'Destroyer\'s Dungeon • Automod System' });
        break;
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};