// models/Level.js
const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.models.Level || mongoose.model('Level', levelSchema);