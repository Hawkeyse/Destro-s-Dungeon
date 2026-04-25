const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolegive')
    .setDescription('Give a role to a specific user or to everyone in the server')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to give')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Specific user to give the role to (leave empty to give to everyone)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Permission check
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ You need **Manage Roles** permission to use this command.')
        ]
      });
    }

    const role = interaction.options.getRole('role');
    const targetUser = interaction.options.getUser('user');

    // Safety checks
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ I cannot give this role because it is higher than or equal to my highest role.')
        ]
      });
    }

    if (role.managed) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ This is a managed role (like booster or bot role) and cannot be manually assigned.')
        ]
      });
    }

    try {
      if (targetUser) {
        // Give to ONE user
        const member = await interaction.guild.members.fetch(targetUser.id);
        
        if (member.roles.cache.has(role.id)) {
          return interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor('#FFA500')
              .setDescription(`⚠️ ${targetUser} already has the **${role.name}** role.`)
            ]
          });
        }

        await member.roles.add(role.id, `Role given by ${interaction.user.tag}`);

        const successEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setDescription(`<:23646yes:1485713751897276659> Successfully gave **${role.name}** to ${targetUser}`);

        await interaction.editReply({ embeds: [successEmbed] });

      } else {
        // Give to EVERYONE
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor('#FFA500')
            .setDescription(`⏳ Giving **${role.name}** to all members... This may take a while.`)
          ]
        });

        let count = 0;
        const members = await interaction.guild.members.fetch();

        for (const member of members.values()) {
          if (!member.user.bot && !member.roles.cache.has(role.id)) {
            try {
              await member.roles.add(role.id, `Mass role give by ${interaction.user.tag}`);
              count++;
              // Small delay to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err) {
              // Skip members where we can't add the role
            }
          }
        }

        const finalEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setDescription(`<:23646yes:1485713751897276659> Successfully gave **${role.name}** to **${count}** members!`);

        await interaction.editReply({ embeds: [finalEmbed] });
      }

    } catch (error) {
      console.error(error);
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ An error occurred while giving the role.')
        ]
      });
    }
  }
};