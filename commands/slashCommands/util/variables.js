const { Client, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } = require('discord.js')
const { variables, functions } = require('../../../utility/structures/Variables')
const { Permissions2 } = require('../../../utility/validation/Permissions')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('variables')
    .setDescription('Muestra la lista de variables utilizables'),
  timeout: 0,
  memberperms: [],
  botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, color, emojis) {
    const vars = variables(interaction)

    try {
      embed = new EmbedBuilder()
        .setTitle(`${emojis['angel']} Variables de Gema`)
        .setDescription('Estas variables son válidas para comandos autoresponders, bienvenidas, despedidas y boosts')
        .setColor(color)
        .addFields({ name: vars.user.title, value: vars.user.vars.map(vr => `${emojis['dot']} \`${vr.name}\``).join('\n'), inline: true})
        .addFields({ name: vars.server.title, value: vars.server.vars.map(vr => `${emojis['dot']} \`${vr.name}\``).join('\n'), inline: true})
        .addFields({ name: 'Funciones', value: functions.map(func => `${emojis['dot']} \`${func.name}\``).join('\n'), inline: true})
        
      await interaction.reply({ embeds: [embed] })
    } catch (e) {
      console.log(`${e}`)
    }
  }
}