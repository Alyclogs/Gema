const { Client, Message } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');
const serverconfig = require('../../../utility/models/serverconfig-model')

module.exports = {
    name: 'setprefix',
    description: 'Cambia el prefijo de la bot',
    aliases: [],
    uso: `\`gema setprefix <prefijo>\``,
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

    /**
     * @param {Client} client
     * @param {Message} message
     */
    async execute(client, message, args, prefix, emojis, color) {
        const data = { guildId: message.guild.id }
        const serverdata = await serverconfig.findOne(data).exec()

        if (args[0]) {
            if (!serverdata) await serverconfig.create(data)
            await serverconfig.updateOne(data, { prefix: args[0] })

            await message.reply({
                content: `${emojis.check} Ahora el prefijo de Gema es \`${args[0]}\``,
                allowedMentions: { repliedUser: false }
            })
        } else {
            await message.reply({
                content: `${emojis.error} Debes especificar un prefijo`,
                allowedMentions: { repliedUser: false }
            })
        }
    }
}