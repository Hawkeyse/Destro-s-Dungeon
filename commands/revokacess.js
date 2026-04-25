// Fixed: commands/revokeaccess.js
// Changes: Replaced deferUpdate() with reply({ content: '\u200b', flags: MessageFlags.Ephemeral }) for silent acknowledgment.
// Added import for MessageFlags. Moved no-overwrite check after reply; use followUp for error.
// Updated ephemeral to flags for deprecation fix.

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('revokeaccess')
    .setDescription('Revoke access from a channel for a user, role, or @everyone.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to modify.')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement)
        .setRequired(true))
    .addStringOption(option =>
      option.setName('permission')
        .setDescription('The permission to revoke (e.g., ViewChannel, SendMessages).')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to revoke access from (optional; omit for @everyone).')
        .setRequired(false))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to revoke access from (optional; omit for @everyone).')
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

    let targetId, targetName;

    if (user) {
      targetId = user.id;
      targetName = user.tag;
    } else if (role) {
      targetId = role.id;
      targetName = role.name;
    } else {
      targetId = interaction.guild.id;
      targetName = '@everyone';
    }

    try {
      // Silent ephemeral reply to acknowledge interaction
      await interaction.reply({ content: '\u200b', flags: MessageFlags.Ephemeral });

      // Check if overwrite exists (always true for @everyone)
      const existingOverwrite = channel.permissionOverwrites.cache.find(ow => ow.id === targetId);
      if (!existingOverwrite && targetId !== interaction.guild.id) {
        await interaction.followUp({ content: `❌ No existing overwrite found for **${targetName}** in ${channel}.`, flags: MessageFlags.Ephemeral });
        return;
      }

      // Revoke by setting to false
      await channel.permissionOverwrites.edit(targetId, {
        [permission]: false
      }, { reason: `Revoke access via /revokeaccess by ${interaction.user.tag}` });

      // Success Embed (standalone message, no 'Action By')
      const successEmbed = new EmbedBuilder()
        .setColor('#FF0000') // Red for revoke
        .setTitle('❌ Access Revoked')
        .setDescription(`**${permission}** permission has been revoked.`)
        .addFields(
          { name: 'Target', value: targetName, inline: true },
          { name: 'Channel', value: channel.toString(), inline: true }
        );

      await interaction.channel.send({ embeds: [successEmbed] }); // Standalone post
    } catch (error) {
      console.error('Revoke access error:', error);
      await interaction.followUp({ content: '❌ Failed to revoke access. Check bot permissions.', flags: MessageFlags.Ephemeral });
    }
  },
};
