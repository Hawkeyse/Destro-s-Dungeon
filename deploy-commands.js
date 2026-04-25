require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Grab from .env
const { DISCORD_TOKEN, CLIENT_ID } = process.env;
const guildId = process.env.GUILD_ID;

// Commands folder path
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Build commands array
const commands = [];
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  // Validate: Must have 'data' export
  if ('data' in command && command.data !== null) {
    commands.push(command.data.toJSON());
    console.log(`📝 Loaded: ${command.data.name}`);
  } else {
    console.log(`⚠️ Skipping invalid: ${file}`);
  }
}

// Create REST client
const rest = new REST().setToken(DISCORD_TOKEN);

// Deployment mode: 'global' or 'guild'
const deployType = process.argv[2] || 'global'; // e.g., node deploy-commands.js guild

(async () => {
  try {
    console.log(`🚀 Starting ${deployType} deployment of ${commands.length} commands...`);

    if (deployType === 'global') {
      // Global deploy (slow propagation)
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Global commands deployed!');
    } else if (deployType === 'guild' && guildId) {
      // Guild-specific (fast for testing)
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, guildId),
        { body: commands }
      );
      console.log(`✅ Guild commands deployed to ${guildId}!`);
    } else {
      console.error('❌ For guild deploy, add GUILD_ID to .env and run: node deploy-commands.js guild');
      process.exit(1);
    }
  } catch (error) {
    console.error('Deployment failed:', error);
  }
})();