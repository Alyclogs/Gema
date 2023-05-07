const { Client, Message, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js')
const { variables, functions } = require('../../../utility/structures/Variables')
const { Permissions2 } = require('../../../utility/validation/Permissions')

module.exports = {
  name: 'variables',
  description: 'Muestra una lista de las variables utilizables',
  aliases: ['vars'],
  timeout: 0,
  memberperms: [],
  botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

  /**
   * @param {Client} client
   * @param {Message} message
   */
  async execute(client, message, args, prefix, emojis, color) {
    const vars = variables(message)

    try {
      embed = new EmbedBuilder()
        .setTitle(`${emojis['angel']} Variables de Gema`)
        .setDescription('Estas variables son válidas para comandos autoresponders, bienvenidas, despedidas y boosts')
        .setColor(color)
        .addFields({ name: vars.user.title, value: vars.user.vars.map(vr => `${emojis['dot']} \`${vr.name}\``).join('\n'), inline: true})
        .addFields({ name: vars.server.title, value: vars.server.vars.map(vr => `${emojis['dot']} \`${vr.name}\``).join('\n'), inline: true})
        .addFields({ name: 'Funciones', value: functions.map(func => `${emojis['dot']} \`${func.name}\``).join('\n'), inline: true})
        
      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
    } catch (e) {
      console.log(`${e}`)
    }
  }
}