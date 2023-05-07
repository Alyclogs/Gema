const mongoose = require('mongoose')

const autoresponder = new mongoose.Schema({
  guildId: { type: String, required: true },
  arTrigger: {
    type: Object, required: true, default: {
      triggerkey: String, autodelete: Boolean, reactionemojis: [String]
    }
  },
  arReply: {
    type: Object, required: true, default: {
      replytype: { type: String, enum: ['message', 'embed'] }, replymessage: { type: String, required: true },
      wheretosend: { type: String, required: true }, embedcolor: String, choices: Array, choicevalues: Array,
      embeddata: String, replypreview: { type: String, required: true }, requireuserid: [String],
      requiredchannel: [String], denychannel: [String], requiredperm: [String], requiredrole: [String],
      denyrole: [String], addrole: Array, removerole: Array, reactionemojis: [String], ranges: Array,
      argsrequired: { type: Object, default: { num: Number, type: Object } },
      setnick: { type: Object, default: { nick: String, user: String } }, autodelete: {}, font: String,
      awaitanswers: { type: Object, default: { time: Number, answer: String, reply: String } }, buttons: Array,
      modifybal: {}, autodelete: { type: Object, default: { value: Boolean, time: { type: Number, max: 100 } } }
    }
  },
  matchmode: { type: String, enum: ['exactmatch', 'startswith', 'endswith', 'includes'] },
  cooldown: { type: Number, max: 100 }
})

const model = new mongoose.model('autoresponders', autoresponder)

module.exports = model;