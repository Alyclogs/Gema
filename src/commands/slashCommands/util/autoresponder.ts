import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { Autoresponder, autoresponderModel, embedModel } from '../../../models/gema-models'
import { Permissions, Permissions2 } from '../../../util/Permissions'
import { ErrorCodes } from '../../../botdata/Errors'
import { matches } from '../../../botdata/Variables.js'
import { createEmbedPagination } from '../../../util/Pagination'
import { SlashCommand } from '../../../structures/Command.js'
import ExtendedInteraction from '../../../typing/ExtendedInteraction.js'

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Crea y administra los autoresponders del servidor')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Crear un nuevo autoresponder')
                .addStringOption(option => option.setName('trigger').setDescription('El trigger para tu autoresponder').setRequired(true))
                .addStringOption(option => option.setName('reply').setDescription('La respuesta del autoresponder').setRequired(true))
                .addStringOption(option => option.setName('matchmode').setDescription('Especifica el modo de coincidencia del autoresponder').addChoices(
                    { name: 'exacto', value: 'exactmatch' },
                    { name: 'al comienzo', value: 'startswith' },
                    { name: 'al final', value: 'endswith' },
                    { name: 'incluye', value: 'includes' }
                ).setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edita un autoresponder')
                .addStringOption(option => option.setName('trigger').setDescription('El trigger del autoresponder').setRequired(true).setAutocomplete(true))
                .addStringOption(option => option.setName('reply').setDescription('La respuesta del autoresponder').setRequired(true))
                .addStringOption(option => option.setName('matchmode').setDescription('Especifica el modo de coincidencia del autoresponder').addChoices(
                    { name: 'exacto', value: 'exactmatch' },
                    { name: 'al comienzo', value: 'startswith' },
                    { name: 'al final', value: 'endswith' },
                    { name: 'incluye', value: 'includes' }
                ).setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Elimina un autoresponder')
                .addStringOption(option => option.setName('trigger').setDescription('El trigger del autoresponder a eliminar').setRequired(true).setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show_reply')
                .setDescription('Muestra la respuesta de un autoresponder')
                .addStringOption(option => option.setName('trigger').setDescription('El trigger del autoresponder').setRequired(true).setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista los autoresponders existentes'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove_all')
                .setDescription('Elimina todos los autoresponders para este servidor')),
    timeout: 0,
    memberperms: [Permissions.gestionarServidor],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces, Permissions.gestionarServidor],

    async autocomplete({ interaction, args, client }) {
        client.autoresponders = await autoresponderModel.find({}).exec()
        let reduced = []
        const artriggers = client.autoresponders.filter(ar => ar.guildId === interaction.guild?.id).map(ar => ar.arTrigger?.triggerkey)
        reduced = artriggers.slice(0, 25)

        try {
            const focusedValue = args.getFocused()
            if (!focusedValue) {
                await interaction.respond(reduced.map(choice => ({ name: choice, value: choice })))
            } else {
                const filtered = artriggers.filter(choice => choice.startsWith(focusedValue))
                await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })))
            }

        } catch (e) {
            console.log(`a: ${e}`)
        }
    },

    async run({ interaction, client, args, color, emojis }) {
        await interaction.deferReply()

        const subcommand = args.getSubcommand()
        const trigger = args.getString('trigger')
        const reply = args.getString('reply')
        const matchmode = args.getString('matchmode')

        client.autoresponders = await autoresponderModel.find({}).exec()
        client.embeds = await embedModel.find({}).exec()

        if (subcommand === 'list') {
            if (client.autoresponders.filter(ar => ar.guildId === interaction.guild?.id).length) {
                let artriggers = client.autoresponders.filter((autr) => autr.guildId === interaction.guild?.id).map(function (autr) {
                    return `${emojis['dot']} ${autr.arTrigger.triggerkey}`
                })
                let embeds: EmbedBuilder[] = [], sliced = []

                for (let i = 0; i < artriggers.length; i += 10) {
                    sliced.push(artriggers.slice(i, i + 10))
                }
                sliced.forEach(autrs => {
                    let emb = new EmbedBuilder()
                        .setColor(color)
                        .setAuthor({ name: interaction.guild?.name || '', iconURL: interaction.guild?.iconURL() || undefined })
                        .setTitle('Lista de autoresponders')
                        .setDescription(autrs.join('\n'))
                    embeds.push(emb)
                })
                return createEmbedPagination(interaction as ChatInputCommandInteraction<"cached">, embeds)
            } else {
                return interaction.editReply(`${emojis.error} Aún no hay autoresponders creados en este servidor`)
            }
        }

        if (trigger) {
            const arf = client.autoresponders.find(autr => autr.guildId === interaction.guild?.id
                && autr.arTrigger?.triggerkey === trigger)

            const embed = new EmbedBuilder()
                .setColor(color)
            let previewReply: string | undefined = ""

            if (subcommand === 'remove') {
                if (!arf) {
                    return interaction.editReply(`${emojis['hmph']} | ${ErrorCodes.AUTORESPONDER_DOESNT_EXIST}`)
                } else {
                    await autoresponderModel.deleteOne({ guildId: interaction.guild?.id, 'arTrigger.triggerkey': trigger })
                    return interaction.editReply(`${emojis['check']} | El autoresponder **${trigger}** fue eliminado correctamente`)
                }
            }

            if (subcommand === 'show_reply') {
                if (!arf) {
                    return interaction.editReply(`${emojis['hmph']} | ${ErrorCodes.AUTORESPONDER_DOESNT_EXIST}`)
                } else {
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(color)
                                .setTitle(`Respuesta del autoresponder ${arf.arTrigger.triggerkey}`)
                                .setDescription(`\`\`\`${arf.arReply.rawreply}\`\`\``)
                                .setFooter({ text: `Autoresponder de ${interaction.guild?.name}`, iconURL: interaction.guild?.iconURL() || undefined })
                        ]
                    })
                }
            }
            if (subcommand === 'remove_all') {
                if (!client.autoresponders.filter((autr) => autr.guildId === interaction.guild?.id).length) {
                    return interaction.editReply(`${emojis.error} Aún no hay autoresponders creados en este servidor ${emojis.sweat}`)
                } else {
                    await autoresponderModel.deleteMany({ guildId: interaction.guild?.id })
                    return await interaction.editReply(`${emojis.check} Se han eliminado todos los autoresponder del servidor`)
                }
            } else {

                if (reply && matchmode) {
                    const { replaceVars, createAutoresponder } = (await import('../../../util/functions.js'))?.default(client, interaction)
                    let autoresponder: Autoresponder | undefined = undefined

                    try {
                        autoresponder = (await createAutoresponder(interaction as any, reply)).setTrigger(trigger)
                    } catch (e) {
                        return interaction.editReply(`${emojis.error} ${e}`)
                    }

                    if (autoresponder) {
                        const arTrigger = autoresponder.arTrigger
                        const arReply = autoresponder.arReply
                        arTrigger.triggerkey = trigger
                        arReply.replymessage = reply
                        arReply.rawreply = reply
                        let cooldown = autoresponder.cooldown

                        previewReply = replaceVars(arReply.rawreply).replace(/\\n/g, '\n').trim()
                        arReply.replymessage = arReply.replymessage?.trim()
                        arReply.rawreply = arReply.rawreply.trim()
                        if (!previewReply?.replace(/\s/g, '').length) previewReply = ''

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
                            guildId: interaction.guild?.id,
                            arTrigger: arTrigger,
                            arReply: arReply,
                            matchmode: matchmode,
                            cooldown: cooldown
                        }

                        if (arReply.rawreply === "") {
                            return interaction.editReply(`${emojis['hmph']}  ${ErrorCodes.EMPTY_RESPONSE_ERROR}`)
                        } else {
                            if (subcommand === 'add') {
                                if (arf) {
                                    return interaction.editReply({
                                        content: `${emojis['hmph']}  ${ErrorCodes.AUTORESPONDER_ALREADY_EXISTS}`,
                                    })
                                } else {
                                    autoresponderModel.create(ar)
                                    embed.setTitle(`${emojis['yay']}  Nuevo autoresponder`)
                                }
                            }
                            if (subcommand === 'edit') {
                                if (!arf) {
                                    return interaction.editReply(`${emojis['hmph']} | ${ErrorCodes.AUTORESPONDER_DOESNT_EXIST}`)
                                } else {
                                    await autoresponderModel.updateOne(({ guildId: interaction.guild?.id, 'arTrigger.triggerkey': arTrigger.triggerkey }), ar)
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

                            return await interaction.editReply({ embeds: [embed] }).catch(e => console.log(e))
                        }
                    }
                }
            }
        }
    }
})