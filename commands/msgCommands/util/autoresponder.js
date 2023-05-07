const { Client, Message, EmbedBuilder } = require('discord.js')
const { getFonts } = require('../../../utility/data/fonts')
const { createEmbedPagination } = require('../../../utility/structures/Pagination')
const { Permissions2 } = require('../../../utility/validation/Permissions')

module.exports = {
    name: 'autoresponder',
    description: 'Crea y administra los autoresponders del servidor',
    aliases: ['ar'],
    uso: `</autoresponder:1060706665630023772>`,
    subcommands: [
        {
            name: 'add',
            description: 'Crea un nuevo autoresponder',
            uso: `</autoresponder add:1060706665630023772>`
        },
        {
            name: 'edit',
            description: 'Edita un autoresponder',
            uso: `</autoresponder edit:1060706665630023772>`
        },
        {
            name: 'remove',
            description: 'Elimina un autoresponder',
            uso: `</autoresponder remove:1060706665630023772>`
        },
        {
            name: 'show_reply',
            description: 'Muestra la respuesta de un autoresponder',
            uso: `</autoresponder show_reply:1060706665630023772>`
        },
        {
            name: 'list',
            description: 'Lista los autoresponders existentes',
            uso: `</autoresponder list:1060706665630023772>`
        },
        {
            name: 'remove_all',
            description: 'Elimina todos los autoresponders para este servidor',
            uso: `</autoresponder remove_all:1060706665630023772>`
        }
    ],
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

    /**
     * @param {Client} client
     * @param {Message} message
     */
    async execute(client, message, args, prefix, emojis, color) {
        return message.reply({
            content: `¡Lo siento! Este comando aún se encuentra en periodo de pruebas.\nPuedes ir probando su versión como comando de barra baja con </autoresponder:1060706665630023772>`,
            allowedMentions: { repliedUser: false }
        })
    }
}