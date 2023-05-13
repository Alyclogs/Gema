import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import autoresponderModel, { Autoresponder } from '../../../models/autoresponder-model.js'
import { model as embedModel } from '../../../models/embed-model.js'
import { Permissions, Permissions2 } from '../../../util/Permissions.js'
import { ErrorCodes } from '../../../botdata/Errors.js'
import { matches } from '../../../botdata/Variables.js'
import { createEmbedPagination } from '../../../util/Pagination.js'
import { SlashCommand } from '../../../structures/Command.js'

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
        let ErrorsArr: string[] = []

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
                    const autoresponder = new Autoresponder()

                    const arTrigger = autoresponder.arTrigger
                    const arReply = autoresponder.arReply
                    arTrigger.triggerkey = trigger
                    arReply.replymessage = reply
                    arReply.rawreply = reply
                    let cooldown = autoresponder.cooldown
                    const { replaceVars } = (await import('../../../util/functions.js'))?.default(client, interaction)
                    const vars = reply?.match(/({\w+:?.*?(?:(?<=\{)\w*(?=\}).+?)*})/gi)

                    if (vars) {
                        arReply.replytype = "message"

                        if (reply?.match(matches.requireuser)) {
                            arReply.requireuserid = []
                            const usersrequired = reply?.match(matches.requireuser)
                            if (usersrequired) {
                                for (let user of usersrequired) {
                                    user = user.replace(/[\\<>@#&!]/g, "").trim()
                                    if (!interaction.guild?.members.cache.get(user) && !testArg(user)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_USER_ERROR)
                                        break
                                    }
                                    arReply.requireuserid.push(user)
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_USER_ERROR)
                        }
                        if (reply?.match(matches.sendto)) {
                            const wheretosend = reply?.match(matches.sendto)
                            if (wheretosend) {
                                for (let channel of wheretosend) {
                                    channel = channel.replace(/[\\<>@#&!]/g, "").trim()
                                    if (!interaction.guild?.channels.cache.get(channel) && !testArg(channel)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_CHANNEL_ERROR)
                                        break
                                    } else {
                                        arReply.wheretosend = channel
                                    }
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_CHANNEL_ERROR)
                        }
                        if (reply?.match(matches.requirechannel)) {
                            arReply.requiredchannel = []
                            const channelid = reply?.match(matches.requirechannel)
                            if (channelid) {
                                for (let channel of channelid) {
                                    channel = channel.replace(/[\\<>@#&!]/g, "").trim()
                                    if (!interaction.guild?.channels.cache.get(channel) && !testArg(channel)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_CHANNEL_ERROR)
                                        break
                                    } else {
                                        arReply.requiredchannel.push(channel)
                                    }
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_CHANNEL_ERROR)
                        }
                        if (reply?.match(matches.denychannel)) {
                            arReply.denychannel = []
                            const channelid = reply?.match(matches.denychannel)
                            if (channelid) {
                                for (let channel of channelid) {
                                    channel = channel.replace(/[\\<>@#&!]/g, "").trim()
                                    if (!interaction.guild?.channels.cache.get(channel) && !testArg(channel)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_CHANNEL_ERROR)
                                        break
                                    } else {
                                        arReply.denychannel.push(channel)
                                    }
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_CHANNEL_ERROR)
                        }
                        if (reply?.match(matches.requirerole)) {
                            arReply.requiredrole = []
                            const roleid = reply?.match(matches.requirerole)
                            if (roleid) {
                                for (let role of roleid) {
                                    role = role.replace(/[\\<>@#&!]/g, "").trim()
                                    if (!interaction.guild?.roles.cache.get(role) && !testArg(role)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_ROLE_ERROR)
                                        break
                                    } else {
                                        arReply.requiredrole.push(role)
                                    }
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_ROLE_ERROR)
                        }
                        if (reply?.match(matches.denyrole)) {
                            arReply.denyrole = []
                            const roleid = reply?.match(matches.denyrole)
                            if (roleid) {
                                for (let role of roleid) {
                                    role = role.replace(/[\\<>@#&!]/g, "")?.trim()
                                    if (!interaction.guild?.roles.cache.get(role) && !testArg(role)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_ROLE_ERROR)
                                        break
                                    } else {
                                        arReply.denyrole.push(role)
                                    }
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_ROLE_ERROR)
                        }
                        if (reply?.includes('{embed}') || reply?.match(matches.embed)) {
                            arReply.replytype = 'embed'
                            arReply.embedcolor = ''
                            const embeddatas = reply?.match(matches.embed)
                            if (embeddatas) {
                                for (let data of embeddatas) {
                                    data = data.trim()
                                    const dataf = client.embeds.find(em => em.name === data)
                                    if (!/^#([0-9a-f]{6})/i.test(data) && !testArg(data) && !dataf) {
                                        ErrorsArr.push(ErrorCodes.INVALID_EMBED_DATA_ERROR)
                                        break
                                    } else {
                                        if (dataf) arReply.embeddata = data
                                        else arReply.embedcolor = data
                                        break
                                    }
                                }
                            }
                        }
                        if (reply?.match(matches.addrole)) {
                            arReply.addrole = []
                            const roles = reply?.match(matches.addrole)
                            if (roles) {
                                for (let roledata of roles) {
                                    let roleuser = roledata.trim().split('|')
                                    let role = roleuser[0]?.replace(/[\\<>@#&!]/g, "")?.trim()
                                    if (!interaction.guild?.roles.cache.get(role) && !testArg(role)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_ROLE_ERROR)
                                        break
                                    }
                                    let user = roleuser[1]?.replace(/[\\<>@#&!]/g, "")?.trim() || ''
                                    if (!interaction.guild?.members.cache.get(user) && !testArg(user)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_ROLEUSER_ERROR)
                                        break
                                    }
                                    arReply.addrole.push({ role: role, user: user })
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_ROLE_ERROR)
                        }
                        if (reply?.match(matches.removerole)) {
                            arReply.removerole = []
                            const roles = reply?.match(matches.removerole)
                            if (roles) {
                                for (let roledata of roles) {
                                    let roleuser = roledata.trim().split('|')
                                    let role = roleuser[0]?.replace(/[\\<>@#&!]/g, "")?.trim()
                                    if (!interaction.guild?.roles.cache.get(role) && !testArg(role)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_ROLE_ERROR)
                                        break
                                    }
                                    let user = roleuser[1]?.replace(/[\\<>@#&!]/g, "")?.trim() || ''
                                    if (!interaction.guild?.members.cache.get(user) && !testArg(user)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_ROLEUSER_ERROR)
                                        break
                                    }
                                    arReply.removerole.push({ role: role, user: user })
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_ROLE_ERROR)
                        }
                        if (reply?.includes('{font}') || reply?.match(matches.font)) {
                            arReply.font = ''
                            const font = reply?.match(matches.font)
                            if (font) {
                                arReply.font = font[0].trim()
                            } else arReply.font = 'random'
                        }
                        if (reply?.match(matches.react)) {
                            arTrigger.reactionemojis = []
                            const remojis = reply?.match(matches.react)
                            if (remojis) {
                                for (let e of remojis) {
                                    arTrigger.reactionemojis.push(e)
                                }
                            } else ErrorsArr.push(ErrorCodes.REACTION_ERROR)
                        }
                        if (reply?.match(matches.reactreply)) {
                            arReply.reactionemojis = []
                            const remojis = reply?.match(matches.reactreply)
                            if (remojis) {
                                for (let e of remojis) {
                                    arReply.reactionemojis.push(e)
                                }
                            } else ErrorsArr.push(ErrorCodes.REACTION_ERROR)
                        }
                        if (reply?.match(matches.deletereply)) {
                            arReply.autodelete.value = true
                            const time = Number(reply?.match(matches.deletereply)?.shift())
                            if (time) {
                                if (/\d+/.test(`${time}`)) {
                                    arReply.autodelete.time = time * 1000
                                } else {
                                    ErrorsArr.push(ErrorCodes.INVALID_TIME_FORMAT)
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_TIME_FORMAT)
                        }
                        if (reply?.match(matches.requireperm)) {
                            arReply.requiredperm = []
                            const perms = reply?.match(matches.requireperm)
                            if (perms) {
                                for (let perm of perms) {
                                    perm = perm.trim()
                                    if (!Permissions2.find(p => p.perm === perm) && !testArg(perm)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_PERM_ERROR)
                                        break
                                    } else {
                                        arReply.requiredperm.push(perm)
                                    }
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_PERM_ERROR)
                        }
                        if (reply?.match(matches.range)) {
                            arReply.ranges = []
                            const ranges = reply?.match(matches.range)
                            if (ranges) {
                                for (let range of ranges) {
                                    const rangedata = range.trim().split(':')
                                    if (!rangedata) {
                                        ErrorsArr.push(ErrorCodes.INVALID_RANGE)
                                        break
                                    }
                                    const ind = Number(rangedata[0]) || 0
                                    const numbers = rangedata[1].trim().split('-')
                                    if (!(numbers.length == 2)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_RANGE)
                                    } else {
                                        arReply.ranges.push({ ind: ind, min: Number(numbers[0]), max: Number(numbers[1]) })
                                    }
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_RANGE)
                        }
                        if (reply?.match(matches.choose)) {
                            arReply.choices = []
                            const choices = reply?.match(matches.choose)
                            if (choices) {
                                for (let choice of choices) {
                                    const choicedata = choice.trim().split(':')
                                    const ind = Number(choicedata[0]) || 0
                                    if (ind && ind < 1) {
                                        ErrorsArr.push(ErrorCodes.INVALID_CHOICES)
                                        break
                                    }
                                    const choicesArr = ind ? choicedata[1].trim().split('|')?.map((c, i) => ({ ind: i, option: c.trim() }))
                                        : choicedata[0].trim().split('|')?.map((c, i) => ({ ind: i, option: c.trim() }))
                                    if (choicesArr && choicesArr.length >= 2) {
                                        arReply.choices.push({ ind: ind, options: choicesArr })
                                    } else {
                                        ErrorsArr.push(ErrorCodes.INVALID_CHOICES)
                                        break
                                    }
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_CHOICES)
                        }
                        if (reply?.match(matches.setnick)) {
                            const nick = reply?.match(matches.setnick)
                            if (nick) {
                                const nickdata = nick[0].trim().split('|')
                                const name = nickdata[0] || ''
                                const user = nickdata[1] || ''
                                if (!name) ErrorsArr.push(ErrorCodes.INVALID_NICK)
                                else {
                                    arReply.setnick = { nick: name, user: user }
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_NICK)
                        }
                        if (reply?.match(matches.requirearg)) {
                            arReply.argsrequired = []
                            const args = reply?.match(matches.requirearg)
                            if (args) {
                                for (let arg of args) {
                                    const num = Number(arg.split('|') ? arg.split('|')[0] : arg)
                                    const type = arg.split('|') && num ? arg.split('|')[1] : ''
                                    if (!num || isNaN(num)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_ARGS_ERROR)
                                        break
                                    }
                                    if (type && !type.match(/user|channel|color|role|number/)) {
                                        ErrorsArr.push(ErrorCodes.INVALID_ARGS_ERROR)
                                        break
                                    }
                                    arReply.argsrequired.push({ num: num, type: type })
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_ARGS_ERROR)
                        }
                        if (reply?.match(matches.choosevalues)) {
                            arReply.choicevalues = []
                            const values = reply?.match(matches.choosevalues)
                            if (values) {
                                for (let value of values) {
                                    const valuedata = value.trim().split(':')
                                    const ind = Number(valuedata[0]) || 0
                                    if (ind && ind < 1) {
                                        ErrorsArr.push(ErrorCodes.INVALID_CHOICEVALUES)
                                        break
                                    }
                                    const options = ind ? valuedata[1].trim().split('|')?.map((c, i) => ({ ind: i, option: c.trim() }))
                                        : valuedata[0].trim().split('|')?.map((c, i) => ({ ind: i, option: c.trim() }))
                                    if (options && options.length >= 2) {
                                        arReply.choicevalues.push({ ind: ind, options: options })
                                    } else {
                                        ErrorsArr.push(ErrorCodes.INVALID_CHOICEVALUES)
                                        break
                                    }
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_CHOICEVALUES)
                        }
                        if (reply?.match(matches.waitresponse)) {
                            const values = reply?.match(matches.waitresponse)
                            if (values) {
                                let data = values[0]?.split('|')
                                let time = Number(data[0]?.trim())
                                let channel = data[1]?.trim()?.replace(/[\\<>@#&!]/g, "")
                                let answer = data[2]?.trim()
                                let response = data[3]?.trim()
                                if (!isNaN(time) && answer && channel && response) {
                                    arReply.waitresponse = { time: time, channel: channel, answer: answer, reply: response }
                                } else ErrorsArr.push(ErrorCodes.INVALID_WAITRESPONSE)
                            } else ErrorsArr.push(ErrorCodes.INVALID_WAITRESPONSE)
                        }
                        if (reply?.match(matches.button)) {
                            arReply.buttons = []
                            const buttons = reply.match(matches.button)
                            if (buttons) {
                                let cont = 1
                                for (let button of buttons) {
                                    let buttondata = button.split('|')
                                    let type = buttondata[0].trim()
                                    let label = buttondata[1].trim()
                                    let replyorlink = buttondata[2].trim()
                                    if (type && replyorlink && label) {
                                        let btnid = `arbtn_${cont}`
                                        if (type === '5' && replyorlink.startsWith('https://')) {
                                            arReply.buttons.push({ id: btnid, type: '5', label: label, replyorlink: replyorlink })
                                        } else if (['1', '2', '3', '4'].includes(type)) {
                                            arReply.buttons.push({ id: btnid, type: type, label: label, replyorlink: replyorlink })
                                        } else {
                                            ErrorsArr.push(ErrorCodes.INVALID_BUTTONDATA_ERROR)
                                            break
                                        }
                                    }
                                    cont++
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_BUTTON_ERROR)
                        }
                        if (reply?.match(matches.modifybal)) {
                            arReply.modifybal = []
                            const balances = reply.match(matches.modifybal)
                            if (balances) {
                                for (let bal of balances) {
                                    let baldata = bal.trim().split('|')
                                    if (baldata.length > 2 || baldata.length < 1) {
                                        ErrorsArr.push(ErrorCodes.INVALID_MODIFYBALL)
                                        break
                                    }
                                    let cant = baldata.length == 2 ? baldata[1].trim() : baldata[0].trim()
                                    let usuario = baldata.length == 2 ? baldata[0].trim().replace(/[\\<>@#&!]/g, "") : ''
                                    if (!cant) {
                                        ErrorsArr.push(ErrorCodes.INVALID_MODIFYBALL)
                                        break
                                    }
                                    arReply.modifybal.push({ user: usuario || '', cant: cant || '' })
                                }
                            } else ErrorsArr.push(ErrorCodes.INVALID_MODIFYBALL)
                        }
                        if (reply?.includes('{delete}')) {
                            arTrigger.autodelete = true
                        }
                        if (reply?.includes('{dm}')) {
                            arReply.wheretosend = 'user_dm'
                        }
                        if (reply?.match(matches.cooldown)) {
                            const time = Number(reply?.match(matches.cooldown)?.[0])
                            if (isNaN(time)) ErrorsArr.push(ErrorCodes.INVALID_COOLDOWN)
                            else cooldown = time
                        }
                        previewReply = arReply.replymessage?.trim()
                        let schoosed

                        if (arReply.choices && arReply.choices?.length >= 1) {
                            for (let choice of arReply.choices) {
                                let choosed = choice.options[Math.floor(Math.random() * choice.options.length)]
                                schoosed = { ind: choice.ind, optionind: choosed.ind }
                                previewReply = choice.ind > 0 ? previewReply?.replace(`[choice${choice.ind}]`, replaceVars(choosed.option).replace(/\\n/g, '\n').trim())
                                    : previewReply?.replace(`[choice]`, replaceVars(choosed.option).replace(/\\n/g, '\n').trim())
                            }
                        }

                        if (arReply.choicevalues && arReply.choicevalues?.length >= 1) {
                            let choicevalues = reply?.match(/(\[choicevalue\]|\[choicevalue\d+\])/)
                            if (choicevalues) {
                                for (let choice of choicevalues) {
                                    const n = choice.replace(/\D/g, "").split('').map(nn => Number(nn))
                                    let choicevalue = n[0] ? arReply.choicevalues.find(c => c.ind == n[0]) : arReply.choicevalues.find(c => !c.ind)
                                    let choosedvalue = schoosed?.optionind ? choicevalue?.options[schoosed.optionind].option : undefined
                                    if (choicevalue && choosedvalue)
                                        previewReply = choicevalue.ind > 0 ?
                                            previewReply?.replace(`[choice${choicevalue.ind}]`, choosedvalue.replace(/\\n/g, '\n').trim())
                                            : previewReply?.replace(`[choicevalue]`, choosedvalue.replace(/\\n/g, '\n').trim())
                                }
                            }
                        }

                        if (arReply.ranges?.length) {
                            for (let range of arReply.ranges) {
                                if (!isNaN(Number(range.min)) && !isNaN(Number(range.max))) {
                                    let number = Math.floor((Math.random() * (range.max as number)) + (range.min as number))
                                    previewReply = range.ind > 0 ? previewReply?.replace(`[range${range.ind}]`, `${number}`) : previewReply?.replace(`[range]`, `${number}`)
                                } else previewReply = range.ind > 0 ? previewReply?.replace(`[range${range.ind}]`, 'RANGO_AÚN_NO_CALCULADO') : previewReply?.replace(`[range]`, 'RANGO_AÚN_NO_CALCULADO')
                            }
                        }

                        previewReply = replaceVars(previewReply).replace(/\\n/g, '\n').trim()
                    }
                    arReply.replymessage = arReply.replymessage?.trim()
                    if (!arReply.replymessage?.replace(/\s/g, '').length) arReply.replymessage = ''

                    if (ErrorsArr.length == 0) {
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
                                if (index == 0 && arReply.requiredchannel?.length) {
                                    return `\nNO <#${dch}>`
                                }
                                if (index == 0 && arReply.requiredchannel?.length == 0) {
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
                                if (index == 0 && arReply.requiredchannel?.length) {
                                    return `\nNO <@&${drl}>`
                                }
                                if (index == 0 && arReply.requiredchannel?.length) {
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
                                    if (index == 0 && arReply.addrole?.length) {
                                        if (drl.role) return `\n<@&${drl.role}>`
                                    }
                                    if (index == 0 && arReply.addrole?.length == 0) {
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
                } else {
                    return await interaction.editReply({
                        embeds: [embed.setTitle(`${emojis['error']}  Tienes algunos errores en tu autoresponder:`)
                            .setDescription(`${ErrorsArr.map(er => er = emojis['dot'] + ' ' + er).join('\n')}`)]
                    })
                }
            }
        }

        function testArg(arg: string) {
            return (/\[\$\d+\] | \[\$\d+\-\d+\] | \[\$\d+\+\] | \{(.+)\} | \[range\] | \[range\d+\] | \[choice\] | \[choice\d+\]/).test(arg)
        }
    }
})