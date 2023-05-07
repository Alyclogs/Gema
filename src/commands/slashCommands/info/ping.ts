import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../../lib/Command';
import { Permissions } from '../../../util/Permissions'

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Devuelve información sobre mi latencia (ms)'),
  timeout: 0,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

  async run({ interaction, client, color, emojis }) {
    await interaction.deferReply({
      fetchReply: true
    })

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🏓 Pong!`)
          .setDescription(`${emojis.dot}Mensajes: \`${Date.now() - interaction.createdTimestamp}\` ms\n${emojis.dot}API: \`${Math.round(client.ws.ping)}\` ms`)
          .setColor(color)
      ]
    })
  }
});
