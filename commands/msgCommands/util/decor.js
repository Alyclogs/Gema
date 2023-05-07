const { Message, Client, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, ComponentType, ActionRowBuilder, ButtonBuilder } = require('discord.js')
const { getFonts } = require('../../../utility/data/fonts')
const symbols = require('../../../utility/data/symbols.json')
const { Permissions2 } = require('../../../utility/validation/Permissions')

module.exports = {
  name: 'decor',
  description: 'Genera textos decorados de manera aleatoria',
  aliases: [],
  uso: `\`gema decor <texto>\``,
  timeout: 0,
  memberperms: [],
  botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

  /**
   * @param {Client} client
   * @param {Message} message
   */
  async execute(client, message, args, prefix, emojis, color) {
    var stilizedText = ""
    let text = '', cant = 0, font = ''

    let ffont = getFonts('sss').find(f => f.name === args[0] || f.name === args[1])
    font = ffont?.name || undefined
    cant = !isNaN(args[0] * 1) ? args[0] : !isNaN(args[1] * 1) ? args[1] : undefined
    text = cant && font ? args.slice(2).join(' ') : (!cant && font) || (cant && !font) ? args.slice(1).join(' ') : args.join(' ')

    if (text) {
      if (cant) {
        if (cant < 0) {
          return message.reply({ content: `${emojis['hmph']} La cantidad debe ser mayor a cero`, allowedMentions: { repliedUser: false } })
        }
        if (cant > 10) {
          return message.reply({ content: `${emojis['hmph']} La cantidad no debe ser mayor a 10`, allowedMentions: { repliedUser: false } })
        }
      }
      if (font) {
        if (cant > 1) {
          for (let i = 0; i < cant; i++) {
            stilizedText += `\n${getRandom2(text, font)}`
          }
        } else {
          stilizedText = `${getRandom2(text, font)}`
        }
      } else {
        if (cant > 1) {
          for (let i = 0; i < cant; i++) {
            stilizedText += `\n${getRandom1(text)}`
          }
        } else {
          stilizedText = `${getRandom1(text)}`

        }
      } await message.reply({ content: stilizedText, allowedMentions: { repliedUser: false } })
    } else return await message.reply({
      content: `${emojis.confused} Debes especificar el texto a decorar.
    Utiliza la sintaxis: \`${prefix}decor <fuente>(opcional) <cantidad>(opcional) <texto>\` o Utiliza </decor username:1085401665550700596>.
    Para ver la lista de fuentes: </font-list:1008901181667553374>`,
      allowedMentions: { repliedUser: false }
    })

    function getRandom1(name) {
      let first = symbols['first'][Math.floor(Math.random() * symbols['first'].length)]
      let emoji = symbols['emojis'][Math.floor(Math.random() * symbols['emojis'].length)]
      let spacer1 = symbols['spacer'][Math.floor(Math.random() * symbols['spacer'].length)]
      let spacer2 = symbols['spacer'][Math.floor(Math.random() * symbols['spacer'].length)]
      let any = symbols['any'][Math.floor(Math.random() * symbols['any'].length)]

      const fonts = getFonts(name)
      let stilizedName = fonts[Math.floor(Math.random() * fonts.length)].value
      return `${first}${emoji}${spacer1}${stilizedName}${spacer2}${any}`
    }

    function getRandom2(name, fontName) {
      let first = symbols['first'][Math.floor(Math.random() * symbols['first'].length)]
      let emoji = symbols['emojis'][Math.floor(Math.random() * symbols['emojis'].length)]
      let spacer1 = symbols['spacer'][Math.floor(Math.random() * symbols['spacer'].length)]
      let spacer2 = symbols['spacer'][Math.floor(Math.random() * symbols['spacer'].length)]
      let any = symbols['any'][Math.floor(Math.random() * symbols['any'].length)]

      const fonts = getFonts(name)
      var stilizedName = ""
      fonts.map(font => {
        if (font.name === fontName) {
          stilizedName = font.value
          return
        }
      })

      return `${first}${emoji}${spacer1}${stilizedName}${spacer2}${any}`
    }
  }
}