const { Client, Message, EmbedBuilder } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');
const usermodel = require('../../../utility/models/user-currency')

module.exports = {
    name: 'work',
    description: 'Trabaja para ganar algo de 🍞',
    aliases: [],
    timeout: 120,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces],

    /**
     * @param {Client} client
     * @param {Message} message
     */
    async execute(client, message, args, prefix, emojis, color) {
        let usuario = await usermodel.findOne({ userId: message.author.id }).exec()
        let ganancia = Math.floor((Math.random() * 500) + 200)
        let embed = new EmbedBuilder()
        .setColor(color)
        .setDescription(`Has trabajado y has ganado +${ganancia} 🍞`)

        await usermodel.updateOne({ userId: message.author.id }, { balance: usuario.balance + ganancia })
        await message.reply({ embeds: [embed] })
    }
}