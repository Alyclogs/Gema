const mongoose = require('mongoose')

const serverconfig = new mongoose.Schema({
  guildId: { type: String, required: true }, prefix: String,
  welcomerSettings: { type: Object, default: { channel: String, message: String, embed: { name: String, color: String } } },
  farewellSettings: { type: Object, default: { channel: String, message: String, embed: String } },
  boostSettings: { type: Object, default: { channel: String, message: String, embed: String } }
})

const model = new mongoose.model('config-servers', serverconfig)

module.exports = model