const { SlashCommandBuilder, Message, Client } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');
const serverconfig = require('../../../utility/models/serverconfig-model')
const embedModel = require('../../../utility/models/embed-model')
const { serverConfigStructure } = require('../../../utility/structures/serverConfigStructure');
const { ErrorCodes } = require('../../../utility/data/Errors');

module.exports = {
    name: 'welcomer',
    description: 'Configura el sistema de bienvenida para el servidor'
        + '\nPara obtener más ayuda sobre este comando: `gema help welcomer <subcomando>`',
    aliases: [],
    uso: `\`gema welcomer <subcomando>\``,
    subcommands: [
        {
            name: 'set',
            description: 'Configura el canal de bienvenida.'
                + '\nPuedes hacer uso de las variables para embeds en el mensaje de bienvenida'
                + '\nPara ver la lista de variables: </variables:>',
            uso: `\`gema welcomer set <canal> <mensaje>\``
        },
        {
            name: 'test',
            description: 'Prueba el mensaje de bienvenida',
            uso: `\`gema welcomer test\``
        },
        {
            name: 'delete',
            description: 'Elimina la configuración de bienvenida',
            uso: `\`gema welcomer delete\``
        }
    ],
    timeout: 0,
    memberperms: [Permissions2.gestionarServidor],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces, Permissions2.gestionarServidor],

    /**
   * @param {Client} client
   * @param {Message} message
   */
    async execute(client, message, args, prefix, emojis, color) {
        client.embeds = await embedModel.find({}).exec()

        const { replaceVars, replaceEmbedFields } = require('../../../utility/functions/utils')(client, message)

        const data = { guildId: message.guild.id }
        let newdata = serverConfigStructure.welcomerSettings

        if (!args[0]) return
        if (args[0] === 'set') {
            if (!args.length > 2) return message.reply({
                content: `${emojis.confused} Debes especificar el canal y el mensaje para la bienvenida.`
                + `Uso correcto: ${this.subcommands[0].uso}. o Utiliza </welcomer:>`,
                allowedMentions: { repliedUser: false }
            })
            let chnl = args[1].trim()
            let msg = args.slice(2).join(' ').trim()
            const vars = msg?.match(/\{(.+?)\}/g)

            if (vars) {
                if (vars.find(v => v.includes('embed'))) {
                    let embeddata = msg.match(/(?<=\{embed:).+?(?=\})/)
                    let data = embeddata[0].trim()
                    const dataf = client.embeds.find(em => em.name.toLowerCase() === data.toLowerCase())
                    if (!/^#([0-9a-f]{6})/i.test(data) && !dataf) {
                        return message.reply(`${emojis.confused} ${ErrorCodes.INVALID_EMBED_DATA_ERROR}`)
                    } else {
                        if (dataf) newdata.embed.name = data.toLowerCase()
                        else newdata.embed.color = data
                    }
                }
            }
            newdata.channel = message.guild.channels.cache.get(chnl.replace(/[\\<>@#&!]/g, "").trim())
            if (!newdata.channel) return message.reply({
                content: `${emojis.confused} El canal que has especificado no  es válido. Asegúrate de mencionarlo correctamente o especifica su id`,
                allowedMentions: { repliedUser: false }
            })
            newdata.message = msg

            await serverconfig.updateOne(data, { welcomerSettings: newdata })
            return await message.reply({
                content: `${emojis.check} Se ha configurado el sistema de bienvenida. Para probar cómo se verá el mensaje utiliza </welcomer test:>`,
                allowedMentions: { repliedUser: false }
            })
        }
        if (args[0] === 'delete') {
            await serverconfig.updateOne(data, { welcomerSettings: newdata })
            return await message.reply({
                content: `${emojis.check} Se ha eliminado el sistema de bienvenida`,
                allowedMentions: { repliedUser: false }
            })
        }
        if (args[0] === 'test') {
            let serverData = await serverconfig.findOne(data).exec()
            let welcomerData = serverData?.welcomerSettings

            if (!welcomerData || !welcomerData?.channel) {
                return message.reply({
                    content: `${emojis.confused} No existe una configuración de bienvenida para este servidor`,
                    allowedMentions: { repliedUser: false }
                })
            } else {
                let previewEmbed
                if (welcomerData.embed) {
                    let embedData = client.embeds.filter(em => em.guildId === message.guild.id).find(em => em.name.toLowerCase() === welcomerData.embed.name?.toLowerCase())?.data
                    previewEmbed = embedData ? replaceEmbedFields(embedData) : undefined
                }
                if (welcomerData.message) {
                    let message = replaceVars(welcomerData.message)

                    if (previewEmbed) {
                        client.channels.fetch(welcomerData.channel).then(chnl => chnl.send({
                            content: message,
                            embeds: [previewEmbed]
                        })).catch(e => { })
                    } else {
                        client.channels.fetch(welcomerData.channel).then(chnl => chnl.send({
                            content: message
                        })).catch(e => { })
                    }
                } else if (previewEmbed) {
                    client.channels.fetch(welcomerData.channel).then(chnl => chnl.send({
                        embeds: [previewEmbed]
                    })).catch(e => { })
                }
                return await message.reply({
                    content: `${emojis.check} Mensaje de bienvenida enviado. Si en caso no se puede visualizar revise los permisos del canal`,
                    allowedMentions: { repliedUser: false }
                })
            }
        }
    }
}