const { Client, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, ComponentType, ActionRowBuilder, ButtonBuilder } = require('discord.js')
const { getFonts } = require('../../../utility/data/fonts')
const symbols = require('../../../utility/data/symbols.json')
const { Permissions2 } = require('../../../utility/validation/Permissions')

let fontChoices = getFonts("Ejemplo")
let fontChoicesReduced = fontChoices.map((font) => ({ name: font.value, value: font.name }))
  .slice(0, fontChoices.length - (fontChoices.length - 25))

function getRandom1(name) {
  let first = symbols['first'][Math.floor(Math.random() * symbols['first'].length)]
  let emoji = symbols['emojis'][Math.floor(Math.random() * symbols['emojis'].length)]
  let spacer1 = symbols['spacer'][Math.floor(Math.random() * symbols['spacer'].length)]
  let spacer2 = symbols['spacer'][Math.floor(Math.random() * symbols['spacer'].length)]
  let any = symbols['any'][Math.floor(Math.random() * symbols['any'].length)]

  const fonts = getFonts(name)
  /*
  let fontValues = []
  var stilizedName = ""
  fonts.map(font => fontValues.push(font.value))
  stilizedName = fontValues[Math.floor(Math.random() * fontValues.length)]
  */
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decor')
    .setDescription('Genera textos decorados de manera aleatoria')
    .addSubcommand(subcommand =>
      subcommand
        .setName('username')
        .setDescription('Decora tu nombre de usuario con fuentes y símbolos')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('El texto a estilizar')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('font-name')
            .setDescription('Especifica una fuente')
            .setRequired(false)
            .setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option.setName('cantidad')
            .setDescription('Cantidad de textos a generar')
            .setRequired(false)
        )),
        timeout: 0,
        memberperms: [],
        botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

  /**
   @param {Client} client
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
    const inputText = interaction.options.getString('text')
    const selectedFont = interaction.options.getString('font-name')
    const inputCant = interaction.options.getInteger('cantidad')
    var stilizedText = ""

    if (inputCant > 0) {
      if (inputCant < 10) {
        if (selectedFont) {
          if (inputCant > 1) {
            for (let i = 0; i < inputCant; i++) {
              stilizedText += `\n${getRandom2(inputText, selectedFont)}`
            }
          } else {
            stilizedText = `${getRandom2(inputText, selectedFont)}`
          }
        } else {
          if (inputCant > 1) {
            for (let i = 0; i < inputCant; i++) {
              stilizedText += `\n${getRandom1(inputText)}`
            }
          } else {
            stilizedText = `${getRandom1(inputText)}`

          }
        }
        await interaction.reply({ content: stilizedText })
      } else {
        await interaction.reply({ content: `${emojis['hmph']} | La cantidad no debe ser mayor a 10`, ephemeral: true })
      }
    } else {
      await interaction.reply({ content: `${emojis['hmph']} | La cantidad debe ser mayor a cero`, ephemeral: true })
    }
  }
}