const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    messageId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
    guildId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    winners: { type: Number, required: true },
    endTime: { type: Date, required: true },
    roleId: { type: String, default: null },
    image: { type: String, default: null },
    participants: [{ type: String }],
    winnerIds: [{ type: String }],
    createdBy: { type: String, required: true },
    status: { type: String, enum: ['active', 'ended', 'cancelled'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Giveaway', giveawaySchema);