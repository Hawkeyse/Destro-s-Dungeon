const mongoose = require('mongoose');

const modLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  type: { type: String, required: true }, // 'warn', 'punish', 'ban', etc.
  reason: { type: String, default: 'No reason provided' },
  duration: { type: String }, // For punish
  timestamp: { type: Date, default: Date.now },
  expiresAt: { type: Date } // For punish/ban
});

const ModLog = mongoose.models.ModLog || mongoose.model('ModLog', modLogSchema);

module.exports = { ModLog };