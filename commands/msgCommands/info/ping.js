const { Message, EmbedBuilder } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');

module.exports = {
    name: 'ping',
    description: 'Devuelve información sobre mi latencia',
    aliases: ['latencia'],
    uso: '',
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces],

    /**
     * @param {Client} client
     * @param {Message} message
     */
    async execute(client, message, args, prefix, emojis, color) {
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`🏓 Pong!`)
                    .setDescription(`${emojis.dot}Mensajes: \`${Date.now() - message.createdTimestamp}\` ms\n${emojis.dot}API: \`${Math.round(client.ws.ping)}\` ms`)
                    .setColor(color)
            ],
            allowedMentions: { repliedUser: false }
        })
    }
}
