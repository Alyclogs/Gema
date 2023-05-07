const { Client, Message, EmbedBuilder } = require('discord.js')
const { getFonts } = require('../../../utility/data/fonts')
const { createEmbedPagination } = require('../../../utility/structures/Pagination')
const { Permissions2 } = require('../../../utility/validation/Permissions')

module.exports = {
  name: 'font',
  description: 'Envía un mensaje con una fuente específica',
  aliases: [],
  uso: `\`gema font <fuente>(opcional) <texto>\``,
  subcommands: [
    {
      name: 'list',
      description: 'Muestra una lista de las fuentes disponibles',
    }
  ],  
  timeout: 0,
  memberperms: [],
  botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

  /**
   * @param {Client} client
   * @param {Message} message
   */
  async execute(client, message, args, prefix, emojis, color) {

    if (args[0]) {
      if (args[0] === 'list') {
        let embeds = []
        let fontList = [], size = 10, splitedFonts = []
        fontList = getFonts("Texto de ejemplo")

        for (let i = 0; i < fontList.length; i += size) {
          splitedFonts.push(fontList.slice(i, i + size))
        }

        splitedFonts.forEach((fonts) => {
          const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('Lista de fuentes')
            .setDescription(`Para enviar un mensaje con una fuente utiliza\n\`/font <font-name> <your-text>\``)
          fonts.forEach(({ name, value }) => {
            embed.addFields({ name: name, value: value })
          })
          embeds.push(embed)
        })
        return createEmbedPagination(message, embeds)

      } else {
        let ffont = getFonts('zzz').find(f => f.name === args[0])
        let font = ffont?.name

        let fonts = getFonts(args.join(' '))
        let text = font ? getFonts(args.slice(1).join(' ')).find(f => f.name === font).value
          : fonts[Math.floor(Math.random() * fonts.length)].value

        return await message.reply({
          content: text,
          allowedMentions: { repliedUser: false }
        })
      }
    } else {
      return await message.reply({
        content: `${emojis.confused} Debes especificar el texto a estilizar.
        Utiliza la sintaxis \`${prefix}font <fuente>(opcional) <texto>\` ó Utiliza </font:1008901181667553373>.
        Para ver la lista de fuentes: </font-list:1008901181667553374>`,
        allowedMentions: { repliedUser: false }
      })
    }
  }
}

