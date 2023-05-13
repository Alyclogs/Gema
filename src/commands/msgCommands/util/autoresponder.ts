import { EmbedBuilder } from 'discord.js'
import autoresponderModel, { ArReplyType, ArTriggerType, Autoresponder } from '../../../models/autoresponder-model.js'
import { model as embedModel } from '../../../models/embed-model.js'
import { Permissions, Permissions2 } from '../../../util/Permissions.js'
import { ErrorCodes } from '../../../botdata/Errors.js'
import { matches } from '../../../botdata/Variables.js'
import { createEmbedPagination } from '../../../util/Pagination.js'
import { Command } from '../../../structures/Command.js'

export default new Command({
    name: 'autoresponder',
    description: 'Crea y administra los autoresponders del servidor',
    aliases: ['ar'],
    uso: '`gema ar <subcomando>` \n`gema help ar <subcomando>` para obtener más ayuda',
    timeout: 0,
    subcomands: [
        {
            name: 'add',
            description: 'Crea un nuevo autoresponder'
                + '\n`gema help ar <subcomando>` para obtener más ayuda'
                + '\nPuedes hacer uso de las variables de autoresponder para la respuesta: </variables:>'
                + '\nMatchmodes disponibles: \`--1\` exacto, \`--2\` al principio, \`--3\` al final, \`--4\` incluye'
                + '\nSi no se especifica el matchmode, se creará un autoresponder con modo de coincidencia exacto',
            uso: '`gema ar add <matchmode> <trigger> | <reply>`',
            options: [
                {
                    name: '--1',
                    description: 'Crea un nuevo autoresponder con modo de coincidencia del trigger exacto'
                        + '\nEs decir, el bot responderá cada vez que un usuario escriba un mensaje exactamente igual al trigger',
                    uso: '`gema ar add --1 <trigger> | <reply>`',
                },
                {
                    name: '--2',
                    description: 'Crea un nuevo autoresponder con modo de coincidencia del trigger al principio'
                        + '\nEs decir, el bot responderá cada vez que un usuario escriba el trigger al principio del mensaje',
                    uso: '`gema ar add --2 <trigger> | <reply>`',
                },
                {
                    name: '--3',
                    description: 'Crea un nuevo autoresponder con modo de coincidencia del trigger al final.'
                        + '\nEs decir, el bot responderá cada vez que un usuario escriba el trigger al final del mensaje',
                    uso: '`gema ar add --3 <trigger> | <reply>`',
                },
                {
                    name: '--4',
                    description: 'Crea un nuevo autoresponder con modo de coincidencia que incluya al trigger'
                        + '\nEs decir, el bot responderá cada vez que un usuario escriba el trigger en cualquier parte del mensaje',
                    uso: '`gema ar add --4 <trigger> | <reply>`',
                }
            ]
        },
        {
            name: 'edit-reply',
            description: 'Edita la respuesta de un autoresponder',
            uso: '`gema ar edit-reply <trigger> | <reply>`'
        },
        {
            name: 'edit-matchmode',
            description: 'Edita el modo de coincidencia de un autoresponder',
            uso: '`gema ar edit-matchmode <trigger> <matchmode>\nMatchmodes disponibles: \`--1\` exacto, \`--2\` al principio, \`--3\` al final, \`--4\` incluye'
                + '\nEjemplos: gema ar edit-matchmode !request --1 (matchmode exacto)'
        },
        {
            name: 'remove',
            description: 'Crea un nuevo autoresponder',
            uso: '`gema ar remove <trigger>`'
        },
        {
            name: 'show_reply',
            description: 'Muestra la respuesta de un autoresponder',
            uso: `\`gema ar show_reply <trigger>\``
        },
        {
            name: 'list',
            description: 'Lista los autoresponders existentes',
            uso: `\`gema ar list\``
        },
        {
            name: 'remove_all',
            description: 'Elimina todos los autoresponders para este servidor',
            uso: `\`gema ar remove_all\``
        }
    ],
    memberperms: [Permissions.gestionarServidor],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces, Permissions.gestionarServidor],

    async run({ message, client, args, color, emojis }) {

        let subcommand = args[0]
        let trigger: string
        let reply: string
        let matchmode: string | undefined = undefined
        let arTrigger: ArTriggerType | undefined = undefined
        let arReply: ArReplyType | undefined = undefined
        let cooldown: number | undefined = 0
        let autoresponder: Autoresponder | undefined = undefined

        const matchmodes = [{ name: "--1", value: "exactmatch" }, { name: "--2", value: "startswith" }, { name: "--3", value: "endswith" }, { name: "--4", value: "includes" }]

        client.autoresponders = await autoresponderModel.find({}).exec()
        client.embeds = await embedModel.find({}).exec()

        const embed = new EmbedBuilder()
            .setColor(color)
        let previewReply: string | undefined = ""

        if (subcommand === 'list') {
            if (client.autoresponders.filter(ar => ar.guildId === message.guild?.id).length) {
                let artriggers = client.autoresponders.filter((autr) => autr.guildId === message.guild?.id).map(function (autr) {
                    return `${emojis['dot']} ${autr.arTrigger.triggerkey}`
                })
                let embeds: EmbedBuilder[] = [], sliced = []

                for (let i = 0; i < artriggers.length; i += 10) {
                    sliced.push(artriggers.slice(i, i + 10))
                }
                sliced.forEach(autrs => {
                    let emb = new EmbedBuilder()
                        .setColor(color)
                        .setAuthor({ name: message.guild?.name || '', iconURL: message.guild?.iconURL() || undefined })
                        .setTitle('Lista de autoresponders')
                        .setDescription(autrs.join('\n'))
                    embeds.push(emb)
                })
                return createEmbedPagination(message, embeds)
            } else {
                return message.reply(`${emojis.error} Aún no hay autoresponders creados en este servidor`)
            }
        }
        if (subcommand === 'remove_all') {
            if (!client.autoresponders.filter((autr) => autr.guildId === message.guild?.id).length) {
                return message.reply(`${emojis.error} Aún no hay autoresponders creados en este servidor ${emojis.sweat}`)
            } else {
                await autoresponderModel.deleteMany({ guildId: message.guild?.id })
                return await message.reply(`${emojis.check} Se han eliminado todos los autoresponder del servidor`)
            }
        }

        const { replaceVars, createAutoresponder } = (await import('../../../util/functions.js'))?.default(client, message)
        const matchtype = matchmodes.find(m => m.name === args.slice(1).join(' ').match(/--\d/)?.[0])

        const inputdata = matchtype ? args.slice(1).join(' ').substring(0, args.slice(1).join(' ').indexOf(matchtype?.name)).trim().split('|') : args.slice(1).join(' ').trim().split('|')
        trigger = inputdata[0].trim()
        if (!trigger) return message.reply(`${emojis.confused} Debes especificar el trigger del autoresponder. \n\`gema help ar\` para obtener ayuda. O utiliza </autoresponder :1104985984191451317>`)

        const ardata = { guildId: message.guild?.id, 'arTrigger.triggerkey': trigger }
        const arf = client.autoresponders.find(autr => autr.guildId === message.guild?.id
            && autr.arTrigger?.triggerkey === trigger)

        if (['remove', 'show_reply', 'remove_all'].includes(subcommand)) {
            if (!arf) {
                return message.reply(`${emojis['hmph']} | ${ErrorCodes.AUTORESPONDER_DOESNT_EXIST}`)
            }

            if (subcommand === 'remove') {
                await autoresponderModel.deleteOne({ guildId: message.guild?.id, 'arTrigger.triggerkey': trigger })
                return message.reply(`${emojis['check']} | El autoresponder **${trigger}** fue eliminado correctamente`)
            }
            if (subcommand === 'show_reply') {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(color)
                            .setTitle(`Respuesta del autoresponder ${arf.arTrigger.triggerkey}`)
                            .setDescription(`\`\`\`${arf.arReply.rawreply}\`\`\``)
                            .setFooter({ text: `Autoresponder de ${message.guild?.name}`, iconURL: message.guild?.iconURL() || undefined })
                    ]
                })
            }
        } else {
            if (subcommand === 'edit_matchmode') {
                if (!arf) {
                    return message.reply(`${emojis['hmph']} | ${ErrorCodes.AUTORESPONDER_DOESNT_EXIST}`)
                }
                if (!matchtype) return message.reply(`${emojis.confused} El modo de coincidencia es inválido. \n\`gema help ar edit_matchmode\` para obtener ayuda. O utiliza </autoresponder edit:1104985984191451317>`)

                autoresponder = arf
                matchmode = matchtype.value
            }
            if (subcommand === 'edit_reply' || subcommand === 'add') {
                reply = inputdata[1].trim()
                if (!reply) return message.reply(`${emojis.confused} Debes especificar una respuesta para el autoresponder. \n\`gema help ar edit_reply\` para obtener ayuda. O utiliza </autoresponder edit:1104985984191451317>`)

                if (subcommand === 'edit_reply') {
                    if (!arf) {
                        return message.reply(`${emojis['hmph']} ${ErrorCodes.AUTORESPONDER_DOESNT_EXIST}`)
                    }
                    matchmode = arf.matchmode
                } else {
                    if (!matchtype) matchmode = "exactmatch"
                    else matchmode = matchtype.value
                }

                try {
                    autoresponder = await createAutoresponder(message, new Autoresponder().setTrigger(trigger), reply)
                } catch (e) {
                    return message.reply(`${emojis.error} ${e}`)
                }
            }

            if (autoresponder) {
                arReply = autoresponder.arReply
                arTrigger = autoresponder.arTrigger

                previewReply = replaceVars(previewReply).replace(/\\n/g, '\n').trim()
                arReply.replymessage = arReply.replymessage?.trim()
                arReply.rawreply = arReply.rawreply.trim()
                if (!previewReply?.replace(/\s/g, '').length) previewReply = ''

                if (arReply && arTrigger && matchmode) {
                    const requiredusers = !arReply.requireuserid || !arReply.requireuserid?.length ? 'ninguno requerido'
                        : arReply.requireuserid?.map(rus => `<@${rus}>`).join('\n')

                    const reqdenychannels = !arReply.requiredchannel
                        && !arReply.denychannel ? 'ninguno requerido' :
                        arReply.requiredchannel?.length ? arReply.requiredchannel?.map(function (rch, index, arr) {
                            if (index > 0) {
                                if (arr.length > 1)
                                    return `ó <#${rch}>`
                            } else {
                                return `<#${rch}>`
                            }
                        }).join('\n') : '' + arReply.denychannel?.map(function (dch, index, arr) {
                            if (index == 0 && arReply?.requiredchannel?.length) {
                                return `\nNO <#${dch}>`
                            }
                            if (index == 0 && arReply?.requiredchannel?.length == 0) {
                                return `NO <#${dch}>`
                            }
                            if (index > 0) {
                                if (arr.length > 1)
                                    return `ó <#${dch}>`
                            }
                        }).join('\n') || ''

                    const requiredperms = !arReply.requiredperm ? 'ninguno requerido' :
                        arReply.requiredperm?.map(function (rpe, index, arr) {
                            if (index > 0) {
                                if (arr.length > 1)
                                    return `ó \`${rpe}\``
                            } else {
                                return `\`${rpe}\``
                            }
                        }).join('\n')

                    const reqdenyroles = !arReply.requiredrole && !arReply.denyrole ?
                        'ninguno requerido' : arReply.requiredrole?.length ? arReply.requiredrole?.map(function (rrl, index, arr) {
                            if (index > 0) {
                                if (arr.length > 1)
                                    return `ó <@&${rrl}>`
                            } else {
                                return `<@&${rrl}>`
                            }
                        }).join('\n') : '' + arReply.denyrole?.map(function (drl, index, arr) {
                            if (index == 0 && arReply?.requiredchannel?.length) {
                                return `\nNO <@&${drl}>`
                            }
                            if (index == 0 && arReply?.requiredchannel?.length) {
                                return `NO <@&${drl}>`
                            }
                            if (index > 0) {
                                if (arr.length > 1)
                                    return `ó <@&${drl}>`
                            }
                        }).join('\n') || ''

                    const addremoveroles = `Añadir: ` + (!arReply.addrole ?
                        `\`ninguno\`` : arReply.addrole?.length ? arReply.addrole?.map(function (rrl, index, arr) {
                            if (index > 0) {
                                if (arr.length > 1)
                                    if (rrl.role) return `ó <@&${rrl.role}>`
                            } else {
                                if (rrl.role) return `<@&${rrl.role}>`
                            }
                        }).join('\n') : '') + `\nRemover: ` + (!arReply.removerole ?
                            `\`ninguno\`` : arReply.removerole?.map(function (drl, index, arr) {
                                if (index == 0 && arReply?.addrole?.length) {
                                    if (drl.role) return `\n<@&${drl.role}>`
                                }
                                if (index == 0 && arReply?.addrole?.length == 0) {
                                    if (drl.role) return `<@&${drl.role}>`
                                }
                                if (index > 0) {
                                    if (arr.length > 1)
                                        if (drl.role) return `ó <@&${drl.role}>`
                                }
                            }).join('\n'))

                    const reactionemojis = !arReply.reactionemojis && !arTrigger.reactionemojis ?
                        'ninguno' : 'Trigger: ' + (arTrigger.reactionemojis?.join(', ') || `\`ninguno\``)
                        + '\nReply:' + (arReply.denyrole?.join(', ') || `\`ninguno\``)

                    const ar = {
                        guildId: message.guild?.id,
                        arTrigger: arTrigger,
                        arReply: arReply,
                        matchmode: matchmode,
                        cooldown: autoresponder.cooldown
                    }

                    if (arReply.rawreply === "") {
                        return message.reply(`${emojis['hmph']}  ${ErrorCodes.EMPTY_RESPONSE_ERROR}`)
                    } else {
                        if (subcommand === 'add') {
                            if (arf) {
                                return message.reply({
                                    content: `${emojis['hmph']}  ${ErrorCodes.AUTORESPONDER_ALREADY_EXISTS}`,
                                })
                            } else {
                                autoresponderModel.create(ar)
                                embed.setTitle(`${emojis['yay']}  Nuevo autoresponder`)
                            }
                        }
                        if (subcommand === 'edit_reply') {
                            if (!arf) {
                                return message.reply(`${emojis['hmph']} | ${ErrorCodes.AUTORESPONDER_DOESNT_EXIST}`)
                            } else {
                                await autoresponderModel.updateOne(ardata, ar)
                                embed.setTitle(`${emojis['yay']}  Autoresponder editado`)
                            }
                        }

                        embed.setDescription('A continuación, se muestran los datos del autoresponder')
                        embed.addFields(
                            { name: 'Trigger', value: arTrigger.triggerkey, inline: true },
                            { name: 'Match mode', value: ar.matchmode, inline: true },
                            { name: 'Tipo de respuesta', value: arReply.replytype, inline: true },
                            { name: 'Requiere usuarios específicos?', value: requiredusers, inline: true },
                            { name: 'Requiere/Niega un canal específico?', value: reqdenychannels, inline: true },
                            { name: 'Requiere/Niega algún rol?', value: reqdenyroles, inline: true },
                            { name: 'Requiere algún permiso?', value: requiredperms, inline: true },
                            { name: 'Es un mensaje directo?', value: arReply.wheretosend === 'user_dm' ? 'Sí' : 'No', inline: true },
                            { name: 'Se auto-elimina?', value: `Trigger: ${ar.arTrigger.autodelete ? 'Sí' : 'No'}` + `\nReply: ${arReply.autodelete.value ? 'Sí' : 'No'}`, inline: true },
                            { name: '¿Reacciona con emojis?', value: reactionemojis, inline: true },
                            { name: '¿Añade/Remueve roles?', value: addremoveroles, inline: true },
                            { name: '¿Tiene cooldown?', value: cooldown && cooldown > 0 ? `Sí: ${ar.cooldown}s` : 'No', inline: true })

                        if (previewReply) embed.addFields({ name: 'Respuesta', value: previewReply })
                        embed.addFields({ name: 'Respuesta sin formato', value: `\`\`\`${arReply.rawreply}\`\`\`` })

                        return await message.reply({ embeds: [embed] }).catch(e => console.log(e))
                    }
                }
            }
        }
    }
})