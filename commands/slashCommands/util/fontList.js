const { Client, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js')
const { getFonts } = require('../../../utility/data/fonts')
const { createEmbedPagination } = require('../../../utility/structures/Pagination')
const { Permissions2 } = require('../../../utility/validation/Permissions')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('font-list')
    .setDescription('Muestra una lista de las fuentes disponibles'),
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, color, emojis) {
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
    /*
    for (let font of getAll("serif")) {
        embeds.push(new EmbedBuilder()
            .setColor(client.color)
            .setTitle(font.name)
            .setDescription(font.value))
    }
    */
    try {
      return createEmbedPagination(interaction, embeds)
    } catch (e) {
    }
  }
}

