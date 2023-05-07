const { EmbedBuilder } = require("discord.js")

const arstructure = {
  guildId: "",
  arTrigger: {
    triggerkey: "",
    autodelete: false,
    reactionemojis: []
  },
  arReply: {
    replytype: "message",
    replymessage: "",
    rawreply: "",
    wheretosend: "current_channel",
    embedcolor: "",
    embeddata: '',
    font: '',
    choices: [], //[{ ind: 0, options: [{ ind: 0, option: }] }],
    choicevalues: [], //[{ ind: 0, values: [] }],
    requireuserid: [],
    requiredchannel: [],
    denychannel: [],
    requiredperm: [],
    requiredrole: [],
    denyrole: [],
    addrole: [], //[{ role: '', user: '' }],
    removerole: [], //[{ role: '', user: '' }],
    reactionemojis: [],
    ranges: [], //[{ ind: 0, min: 0, max: 0 }],
    argsrequired: [], //[{ num: 0, type: '' }],
    setnick: { nick: '', user: '' },
    autodelete: { value: false, time: 0 },
    waitresponse: { time: 0, channel: '', answer: '', reply: '' },
    buttons: [], //[{ id: 0, type: '', label: '', reply/link: '' }]
    modifybal: [], //[{ user: '', cant: 0 }]
  },
  matchmode: "",
  cooldown: 0
}

class Autoresponder {
  data = {}
  arTrigger = ArTrigger
  arReply = ArReply
  matchmode = ''
  cooldown = 0

  /**
   * @param {{ arTrigger: String, arReply: String, matchmode: String, cooldown: Number}} data
   */
  setData(data) {
    this.arTrigger = data.arTrigger
    this.arReply = data.arReply
    this.matchmode = data.matchmode
    this.cooldown = data.cooldown
    return this
  }

  /**
   * @param {ArTrigger} arTrigger 
   */
  setArTrigger(arTrigger) {
    this.arTrigger = arTrigger
  }

  /**
   * @param {ArReply} arReply 
   */
  setArReply(arReply) {
    this.arReply = arReply
  }

  /**
   * @param {String} matchmode 
   */
  setMatchmode(matchmode) {
    this.matchmode = matchmode
  }
}

class ArTrigger {
  /*
  triggerkey = ""
  autodelete = false
  reactionemojis = []
  */
 data = {}

  /**
   * @param {String} emoji 
   */
  addReactionEmoji(emoji) {
    this.data.reactionemojis.push(emoji)
  }
}

class ArReply {
  /*
  replytype = "message"
  replymessage = ""
  rawreply = ""
  wheretosend = "current_channel"
  embedcolor = ""
  embeddata = ""
  font = ""
  choices = [] //[{ ind: 0, options: [{ ind: 0, option: }] }],
  choicevalues = [] //[{ ind: 0, values: [{ ind: 0, option: }] }],
  requireuserid = []
  requiredchannel = []
  denychannel = []
  requiredperm = []
  requiredrole = []
  denyrole = []
  addrole = [] //[{ role: '', user: '' }],
  removerole = [] //[{ role: '', user: '' }],
  reactionemojis = []
  ranges = [] //[{ ind: 0, min: 0, max: 0 }],
  argsrequired = [] //[{ num: 0, type: '' }],
  setnick = { nick: '', user: '' }
  autodelete = { value: false, time: 0 }
  waitresponse = { time: 0, channel: '', answer: '', reply: '' }
  buttons = [] //[{ id: 0, type: '', label: '', reply/link: '' }]
  modifybal = [] //[{ user: '', cant: 0 }]
  */
  data = {}

  /**
   * @param {{ role: String, user: String | undefined }} addRoleOptions 
   */
  pushAddRole(addRoleOptions) {
    this.data.addrole.push(addRoleOptions)
  }

  /**
   * @param {{ role: String, user: String | undefined }} removeRoleOptions 
   */
  pushRemoveRole(removeRoleOptions) {
    this.data.addrole.push(removeRoleOptions)
  }

  /**
   * @param {{ ind: Number | undefined, min: Number, max: Number }} rangeOptions 
   */
  pushRange(rangeOptions) {
    this.data.ranges.push(rangeOptions)
  }

  /**
   * @param {{ num: Number, type: String | undefined }} argOptions 
   */
  addArgRequired(argOptions) {
    this.data.argsrequired.push(argOptions)
  }

  /**
   * @param {{ id: String, type: String, label: String, reply/link: String }} buttonOptions 
   */
  addButton(buttonOptions) {
    this.data.buttons.push(buttonOptions)
  }

  /**
   * @param {{ user: String | undefined, cant: Number }} modifybalOptions 
   */
  pushModifybal(modifybalOptions) {
    this.data.modifybal.push(modifybalOptions)
  }

  /**
   * @param {{ ind: Number | undefined, options: { ind: Number, option: String }[]  }} choiceOptions 
   */
  addChoice(choiceOptions) {
    this.data.choices.push(choiceOptions)
  }

  /**
   * @param {{ ind: Number | undefined, options: { ind: Number, option: String }[] }} choicevalueOptions 
   */
  addChoiceValue(choicevalueOptions) {
    this.data.choicevalues.push(choicevalueOptions)
  }
}

module.exports = { arstructure }
