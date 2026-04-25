const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createvc')
    .setDescription('Create a temporary voice channel that auto-deletes after a set duration (staff only)')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Base name of the voice channel')
        .setRequired(true)
        .setMaxLength(80))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration until deletion (e.g. 2d:4h, 12h, 30m, 7d)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Optional: category ID or name')
        .setRequired(false)),

  async execute(interaction) {
    // Bot permission check
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('I need **Manage Channels** permission!')],
        ephemeral: true
      });
    }

    // Only these roles can create the VC → and only they can join it
    const staffRoleIds = [
      '1353061892804837409',
      '1440085346699186208'
    ];

    const isStaff = staffRoleIds.some(id => interaction.member.roles.cache.has(id));

    if (!isStaff) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF5555')
            .setTitle('<:874346wrong:1440682352614576129> You don’t have permission')
            .setDescription(
              'You don’t have permission to use this command.\n' +
              `Only <@&${staffRoleIds[0]}> and <@&${staffRoleIds[1]}> can run it.`
            )
            .setTimestamp()
        ],
        ephemeral: true
      });
    }

    const baseName = interaction.options.getString('name').trim();
    let durationStr = interaction.options.getString('duration').trim().toLowerCase();
    const categoryInput = interaction.options.getString('category')?.trim();

    // Normalize & parse duration
    durationStr = durationStr.replace(/:/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ');
    let ms = 0;
    const parts = durationStr.match(/(\d+)([dhmsw])/g) || [];

    if (parts.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('#FF5555').setDescription('Invalid duration. Examples: 2d 4h, 12h, 30m, 7d')],
        ephemeral: true
      });
    }

    for (const part of parts) {
      const num = parseInt(part.slice(0, -1), 10);
      const unit = part.slice(-1);
      if (unit === 's') ms += num * 1000;
      else if (unit === 'm') ms += num * 60 * 1000;
      else if (unit === 'h') ms += num * 3600 * 1000;
      else if (unit === 'd') ms += num * 86400 * 1000;
      else if (unit === 'w') ms += num * 7 * 86400 * 1000;
    }

    if (ms < 60000 || ms > 30 * 24 * 60 * 60 * 1000) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('#FF5555').setDescription('Duration must be between 1 minute and 30 days.')],
        ephemeral: true
      });
    }

    // Human-readable duration for name
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    let timeLabel = '';
    if (days) timeLabel += `${days}d `;
    if (hours) timeLabel += `${hours}h `;
    if (minutes && days === 0) timeLabel += `${minutes}m`;
    timeLabel = timeLabel.trim() || 'soon';

    const channelName = `${baseName} - ${timeLabel}`;

    // Find category
    let parent = null;
    if (categoryInput) {
      parent = interaction.guild.channels.cache.find(
        ch => ch.type === ChannelType.GuildCategory &&
              (ch.id === categoryInput || ch.name.toLowerCase() === categoryInput.toLowerCase())
      );
    }

    try {
      const overwrites = [
        // Everyone: cannot see or join
        {
          id: interaction.guild.id, // @everyone
          deny: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect
          ]
        },
        // Bot: full access (important!)
        {
          id: interaction.client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.ManageChannels
          ]
        }
      ];

      // Add each staff role → allow view & connect
      staffRoleIds.forEach(roleId => {
        overwrites.push({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,        // optional but usually wanted
            PermissionsBitField.Flags.UseVAD,
            PermissionsBitField.Flags.Stream
          ]
        });
      });

      const voiceChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: parent?.id || undefined,
        permissionOverwrites: overwrites,
        reason: `Staff-only temp VC by ${interaction.user.tag} — ${timeLabel}`
      });

      // Success message visible to everyone
      await interaction.reply({
        content:
          `<:23646yes:1485713751897276659> The voice channel **${voiceChannel}** has been successfully created!\n` +
          `It will be deleted in **${timeLabel}** <:609011clock:1440752125964582954>\n\n` +
          `**Note:** Only staff can join this channel.`,
        allowedMentions: { parse: [] }
      });

      // Auto-delete after time
      setTimeout(async () => {
        try {
          const ch = await interaction.guild.channels.fetch(voiceChannel.id).catch(() => null);
          if (ch) await ch.delete('Temporary staff channel expired');
        } catch (e) {
          console.error('Failed to delete staff VC:', e);
        }
      }, ms);

    } catch (error) {
      console.error('Failed to create staff VC:', error);
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to create the channel. Check permissions / name length.')],
        ephemeral: true
      });
    }
  }
};