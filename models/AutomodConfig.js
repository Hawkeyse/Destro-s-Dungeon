// models/AutomodConfig.js
const mongoose = require('mongoose');

const automodSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  badWords: { type: [String], default: [] },
  badWordsEnabled: { type: Boolean, default: false },
  spamEnabled: { type: Boolean, default: true },
  spamThreshold: { type: Number, default: 5 },
  spamWindow: { type: Number, default: 10 },
  linkEnabled: { type: Boolean, default: true },
  linkWhitelist: { type: [String], default: ['discord.com', 'youtube.com', 'imgur.com', 'twitch.tv'] },
  massMentionEnabled: { type: Boolean, default: true },   // ← New field
});

module.exports = mongoose.models.AutomodConfig || mongoose.model('AutomodConfig', automodSchema);