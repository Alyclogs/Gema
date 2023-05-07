const mongoose = require('mongoose')

const embeds = new mongoose.Schema({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  data: {
    type: Object, default: {
      author: { type: Object, default: { name: String, icon_url: String } },
      title: String,
      description: String,
      color: String,
      thumbnail: String,
      image: String,
      footer: { type: Object, default: { text: String, icon_url: String } },
      timestamp: { type: Boolean, default: false }
    }
  }
})

const model = new mongoose.model('embeds', embeds)

module.exports = model