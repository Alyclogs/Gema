const { Client, Message, EmbedBuilder } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');
const usermodel = require('../../../utility/models/user-currency')

module.exports = {
    name: 'balance',
    description: 'Mira la cantidad de 🍞 en tu balance',
    aliases: ['bal'],
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

    /**
     * @param {Client} client
     * @param {Message} message
     */
    async execute(client, message, args, prefix, emojis, color) {
        let usuario = await usermodel.findOne({ userId: message.author.id }).exec()
        await message.reply({ content: `Balance: ${usuario.balance} 🍞` })
    }
}