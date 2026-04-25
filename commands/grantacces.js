// Fixed: commands/grantaccess.js
// Changes: Replaced deferUpdate() with reply({ content: '\u200b', flags: MessageFlags.Ephemeral }) for silent acknowledgment.
// This avoids "Processing..." and InteractionNotReplied errors. Added import for MessageFlags.
// Errors now use followUp after the initial reply.

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('grantaccess')
    .setDescription('Grant access to a channel for a user, role, or @everyone.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to modify.')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement)
        .setRequired(true))
    .addStringOption(option =>
      option.setName('permission')
        .setDescription('The permission to grant (e.g., ViewChannel, SendMessages).')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to grant access to (optional; omit for @everyone).')
        .setRequired(false))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to grant access to (optional; omit for @everyone).')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'You need Manage Channels permission to use this command.', flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const channel = interaction.options.getChannel('channel');
    const permission = interaction.options.getString('permission');

    // Mutual exclusivity
    if (user && role) {
      return interaction.reply({ content: 'Cannot specify both a user and a role. Use one or neither (for @everyone).', flags: MessageFlags.Ephemeral });
    }

    // Validate permission name
    const validPermissions = Object.keys(PermissionFlagsBits);
    if (!validPermissions.includes(permission)) {
      return interaction.reply({ content: `Invalid permission: ${permission}. Valid options: ${validPermissions.slice(0, 10).join(', ')}...`, flags: MessageFlags.Ephemeral });
    }

    let targetId, targetName, targetType;

    if (user) {
      targetId = user.id;
      targetName = user.tag;
      targetType = 1; // Member
    } else if (role) {
      targetId = role.id;
      targetName = role.name;
      targetType = 0; // Role
    } else {
      targetId = interaction.guild.id;
      targetName = '@everyone';
      targetType = 0; // Role
    }

    try {
      // Silent ephemeral reply to acknowledge interaction
      await interaction.reply({ content: '\u200b', flags: MessageFlags.Ephemeral });

      // Fetch current overwrites
      const overwrites = channel.permissionOverwrites.cache;

      // If overwrite exists, update it
      const existingOverwrite = overwrites.find(ow => ow.id === targetId);
      if (existingOverwrite) {
        await channel.permissionOverwrites.edit(targetId, {
          [permission]: true
        }, { reason: `Grant access via /grantaccess by ${interaction.user.tag}` });
      } else {
        // Create new overwrite
        await channel.permissionOverwrites.create(targetId, {
          [permission]: true,
          type: targetType
        }, { reason: `Grant access via /grantaccess by ${interaction.user.tag}` });
      }

      // Success Embed (standalone message, no 'Action By')
      const successEmbed = new EmbedBuilder()
        .setColor('#00FF00') // Green for success
        .setTitle('✅ Access Granted')
        .setDescription(`**${permission}** permission has been granted.`)
        .addFields(
          { name: 'Target', value: targetName, inline: true },
          { name: 'Channel', value: channel.toString(), inline: true }
        );

      await interaction.channel.send({ embeds: [successEmbed] }); // Standalone post
    } catch (error) {
      console.error('Grant access error:', error);
      await interaction.followUp({ content: '❌ Failed to grant access. Check bot permissions.', flags: MessageFlags.Ephemeral });
    }
  },
};