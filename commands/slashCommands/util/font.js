const { Client, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, ComponentType, ActionRowBuilder, ButtonBuilder } = require('discord.js')
const { getFonts } = require('../../../utility/data/fonts')
const { Permissions2 } = require('../../../utility/validation/Permissions')

let fontChoices = getFonts("Ejemplo")
let fontChoicesReduced = fontChoices.map((font) => ({ name: font.value, value: font.name }))
  .slice(0, fontChoices.length - (fontChoices.length - 25))
var stilizedText = ""

module.exports = {
  data: new SlashCommandBuilder()
    .setName('font')
    .setDescription('Envía un mensaje con una fuente específica')
    .addStringOption(option =>
      option.setName('font-name')
        .setDescription('El nombre de la fuente')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('text')
        .setDescription('El texto a estilizar')
        .setRequired(true)),
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
  async autocomplete(interaction, client, color, emojis) {

    try {
      const focusedValue = interaction.options.getFocused()
      const filtered = fontChoices.filter(({ name }) => name.startsWith(focusedValue))
      if (focusedValue === "") {
        await interaction.respond(fontChoicesReduced)
      } else {
        await interaction.respond(filtered.map(font => ({ name: font.value, value: font.name })))
      }

    } catch (e) {
      console.log(`a: ${e}`)
    }
  },

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, color, emojis) {

    const selectedFont = interaction.options.getString('font-name')
    const inputText = interaction.options.getString('text')
    var encontrado = false

    try {
      let fonts = getFonts(inputText)
      fonts.map((font) => {
        if (selectedFont === font.name) {
          stilizedText = font.value
          encontrado = true
          return
        }
      })
      if (!encontrado) {
        return interaction.reply({ content: `${emojis['hmph']} | No se ha encontrado la fuente especificada`, ephemeral: true })
      }
    } catch (e) {
      console.log(`b: ${e}`)
    }
    /*
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emojis.angel} | Texto estilizado`)
      .setDescription(`Fuente: ${selectedFont}`)
      .addFields({ name: 'Resultado', value: `\`\`\`${stilizedText}\`\`\`` })

    const row = new ActionRowBuilder()
      .setComponents(
        new ButtonBuilder()
          .setCustomId('btnCopy')
          .setLabel('Copiar al portapapeles')
          .setStyle(2))

    let data = {
      embeds: [embed], components: [row]
    }
    const m = await interaction.reply(data)

    const filter = i => i.user.id === interaction.user.id && i.customId === 'btnCopy'

    const collector = m.createMessageComponentCollector({ filter, time: 15000 })

    collector.on('collect', async i => {
      await i.deferUpdate()
      i.editReply({ content: 'Copiado al portapapeles!', embeds: [], components: [] })
    })
    */
    await interaction.reply({ content: stilizedText })
  }
}
