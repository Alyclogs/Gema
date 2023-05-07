const mongoose = require('mongoose')

const chatbot = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  prompt: { type: String, required: true },
  nPrompts: { type: Number, max: 20 }
})

const model = new mongoose.model('chatbot-config', chatbot)

module.exports = model