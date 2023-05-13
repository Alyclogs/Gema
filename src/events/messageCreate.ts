import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CategoryChannel, Channel, Client, ColorResolvable, DMChannel, EmbedBuilder, Message, MessageComponentInteraction, MessageCreateOptions, PartialDMChannel, PermissionResolvable, PrivateThreadChannel, TextChannel, time } from "discord.js";
import Bot from "../structures/Bot";
import { Event } from "../typing/Event";
import { BoostSettings, FarewellSettings, model as serverconfig, ServerConfig, WelcomerSettings } from "../models/serverconfig-model"
import { UserCurrency, model as usermodel } from "../models/user-currency"
import config from "../config.json"
import ExtendedMessage from "../typing/ExtendedMessage";
import { ErrorCodes } from "../botdata/Errors";
import { model as chatbotModel, Chatbot } from "../models/chatbot-model";
import { Configuration, OpenAIApi } from "openai";
import autoresponderModel, { Autoresponder } from "../models/autoresponder-model";
import { model as embedModel } from "../models/embed-model"
import { variables } from "../botdata/Variables";
import { Permissions, Permissions2 } from "../util/Permissions";
import { CommandPerms } from "../typing/Command";
import { getFonts } from "../util/getFonts";

export default new Event({
    name: "messageCreate",
    once: false
},
    async (client: Bot, message: ExtendedMessage) => {
        const { author, guild, content, channel, partial, member } = message
        let { user, autoresponders, embeds, emotes } = client

        if (!guild || author.bot) return
        if (content.includes('@here') || content.includes('@everyone')) return
        if (channel.partial) await channel.fetch();
        if (partial) await message.fetch();

        let serverData = await serverconfig.findOne({ guildId: message.guildId }).exec()
        if (!serverData) {
            await serverconfig.create(new ServerConfig({
                guildId: guild.id,
                prefix: 'g.',
                welcomerSettings: new WelcomerSettings(),
                farewellSettings: new FarewellSettings(),
                boostSettings: new BoostSettings()
            }))
        }
        if (!await usermodel.findOne({ userId: author.id }).exec()) {
            if (author.id !== client?.user?.id)
                await usermodel.create({
                    userId: author.id,
                    balance: 0
                })
        }

        if (content === `<@${user?.id}>`) {
            return message.reply({
                content: `Hola ¿Me llamaste? ${emotes['blush']}. Escribe \`/help\` para ver todos mis comandos :3`,
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setURL(config.inviteLink)
                            .setLabel('Invítame!')
                    )]
            })
        }

        let prefix = serverData?.prefix ? content.toLowerCase().startsWith(serverData.prefix?.toLowerCase()) ? serverData.prefix : config.prefix : config.prefix
        if (content.toLowerCase().startsWith(prefix?.toLowerCase())) {
            const args = content.slice(prefix.length).trim().split(/ +/g)
            const cmd = args.shift()?.toLowerCase()
            const command = cmd ? client.commands.get(cmd) || client.commands.find(c => c.aliases && c.aliases.includes(cmd)) : undefined
            if (command) {
                if (command.owner && author.id !== client.ownerIDS[0]) return;
                let memberperms = command.memberperms || []
                let botperms = command.botperms || []

                if (memberperms?.length > 0 && !(memberperms.every(p => member.permissions.has(p.flag as PermissionResolvable)))) {
                    let permsFaltantes = memberperms.filter(dmp => !member.permissions.has(dmp.flag as PermissionResolvable)).map(dmp => `\`${dmp.perm}\``).join(', ')
                    return message.reply({
                        content: `${emotes['error']} No tienes suficientes permisos para ejecutar este comando\nPermisos faltantes: ${permsFaltantes}`,
                    })
                }
                if (botperms?.length > 0 && !(botperms.every(p => guild?.members?.me?.permissions.has(p.flag as PermissionResolvable)))) {
                    let permsFaltantes = botperms.filter(dmp => !guild?.members?.me?.permissions.has(dmp.flag as PermissionResolvable)).map(dmp => `\`${dmp.perm}\``).join(', ')
                    return message.reply({
                        content: `${emotes['error']} No tengo suficientes permisos para ejecutar este comando\nPermisos faltantes: ${permsFaltantes}`,
                    })
                }
                const cooldownData = `${author.id}_cmd:${cmd}`
                const timesc = Math.floor(Date.now() / 1000)
                const timeout = command.timeout || 0

                if (client.timeouts.has(cooldownData)) {
                    const expirationTime = (client.timeouts.get(cooldownData) || 0) + timeout
                    if (timesc < expirationTime) {
                        return message.reply({
                            content: `${emotes['hmph']} Estás yendo muy rápido! Podrás volver a ejecutar este comando ${time(expirationTime, 'R')}`,
                        })
                    }
                }
                client.timeouts.set(cooldownData, timesc)
                setTimeout(() => client.timeouts.delete(cooldownData), timeout * 1000)
                setTimeout(() => client.nsfwgifs = [], 180e3)

                if (command.run) command.run({
                    client: client as Bot,
                    message: message as Message,
                    args: args as string[],
                    color: client.color as ColorResolvable,
                    emojis: client.emotes
                })
            }
        }

        const chatbotData = await chatbotModel.findOne({ guildId: guild.id }).exec()
        if (chatbotData) {
            if (chatbotData.channelId) {
                if (channel.id === chatbotData.channelId) {
                    let cont = chatbotData.nPrompts || 0;
                    if (cont == 20) {
                        channel.send(`${emotes['error']} ¡Lo siento! has llegado al límite de mensajes para hablar conmigo ${emotes['sweat']}`)
                    } else {
                        await channel.sendTyping()
                        const configuration = new Configuration({
                            apiKey: process.env.OPENAI_API_KEY
                        })
                        const openai = new OpenAIApi(configuration);
                        let prompt = chatbotData.prompt;

                        prompt += `Human: ${content}\n`;
                        (async () => {
                            const gptResponse = await openai.createCompletion({
                                model: 'text-davinci-003',
                                prompt: prompt,
                                max_tokens: 2000,
                                temperature: 0.3,
                                top_p: 1,
                                presence_penalty: 0,
                                frequency_penalty: 0.5
                            });
                            try {
                                channel.send(`${gptResponse.data?.choices[0].text?.replace('Gema:', '')}`)
                                prompt += `${gptResponse.data?.choices[0].text}\n`;
                                cont++;
                                await chatbotModel.findOneAndUpdate({ guildId: guild.id, channelId: channel.id }, { prompt: prompt, nPrompts: cont })
                            } catch (e) {
                            }
                        })();
                    }
                }
            }
        }
        autoresponders = await autoresponderModel.find({}).exec()
        const guildars = autoresponders.filter(ar => ar.guildId === guild.id)
        embeds = await embedModel.find({}).exec()
        const guildembs = embeds.filter(em => em.guildId === guild.id)

        let autoresponder = null

        if (guildars) {
            for (let autr of guildars) {
                if (content.toLowerCase().includes(autr.arTrigger.triggerkey.toLowerCase())) {
                    if (autr.matchmode === 'startswith' && content.toLowerCase().startsWith(autr.arTrigger.triggerkey.toLowerCase())) {
                        autoresponder = autr
                        break
                    } else if (autr.matchmode === 'exactmatch' && content.toLowerCase() === autr.arTrigger.triggerkey.toLowerCase()) {
                        autoresponder = autr
                        break
                    } else if (autr.matchmode === 'endswith' && content.toLowerCase().endsWith(autr.arTrigger.triggerkey.toLowerCase())) {
                        autoresponder = autr
                        break
                    } else if (autr.matchmode === 'includes' && content.toLowerCase().includes(autr.arTrigger.triggerkey.toLowerCase())) {
                        autoresponder = autr
                        break
                    }
                }
            }
        }

        if (guildars && autoresponder) {
            const { arTrigger, arReply } = autoresponder

            const args = content.toLowerCase().slice(arTrigger.triggerkey.length).trim().split(/ +/g)
            const varis = variables(message).totalvars()
            let previewEmbed: EmbedBuilder, row: ActionRowBuilder<ButtonBuilder> | null = null,
                schoice: { ind: number, option?: { ind: number, opt: string } }, schoicevalue: { ind: number, option?: string }

            const embed = new EmbedBuilder()
                .setColor(client.color)

            let botresponse = formatStr(varis, arReply.rawreply.trim()).trim()
            let reactionemojis1 = arTrigger.reactionemojis ? replaceArgs(arTrigger.reactionemojis) as string[] : undefined
            let embedcolor = arReply.embedcolor ? replaceArgs(arReply.embedcolor) as string : undefined
            let requireuserid = arReply.requireuserid ? replaceArgs(arReply.requireuserid) as string[] : undefined
            let wheretosend = replaceArgs(arReply.wheretosend) as string
            let requiredchannel = arReply.requiredchannel ? replaceArgs(arReply.requiredchannel) as string[] : undefined
            let denychannel = arReply.denychannel ? replaceArgs(arReply.denychannel) as string[] : undefined
            let requiredrole = arReply.requiredrole ? replaceArgs(arReply.requiredrole) as string[] : undefined
            let denyrole = arReply.denyrole ? replaceArgs(arReply.denyrole) as string[] : undefined
            let nickname = arReply.setnick?.nick ? replaceArgs(arReply.setnick?.nick) as string : undefined
            let nickuser = arReply.setnick?.user ? replaceArgs(arReply.setnick?.user) as string : undefined
            let reactionemojis2 = arReply.reactionemojis ? replaceArgs(arReply.reactionemojis) as string[] : undefined
            let autodeletetime = arReply.autodelete?.time ? Number(replaceArgs(arReply.autodelete?.time as string)) : arReply.autodelete?.time as number
            let font = arReply.font ? replaceArgs(arReply.font) : undefined

            botresponse = botresponse.replace(/\\n/g, '\n')

            if (embedcolor) try {
                embed.setColor(embedcolor as ColorResolvable)
            } catch (e) {
            }

            if (arReply.embeddata) {
                const embedData = guildembs.find(em => em.name === arReply.embeddata)?.data

                if (embedData) {
                    previewEmbed = new EmbedBuilder()
                    if (embedData.author?.name || embedData.author?.icon_url) {
                        let icon = embedData.author.icon_url.startsWith('https://') ? embedData.author.icon_url
                            : (replaceArgs(embedData.author.icon_url) as string).startsWith('https://') ? replaceArgs(embedData.author.icon_url) : undefined;
                        previewEmbed.setAuthor({ name: replaceArgs(embedData.author.name) as string || '', iconURL: icon as string | undefined })
                    }
                    if (embedData.title) previewEmbed.data.title = replaceArgs(embedData.title) as string || '';
                    if (embedData.description) {
                        previewEmbed.data.description = formatStr(varis, embedData.description)
                    }
                    if (embedData.thumbnail) {
                        if (embedData.thumbnail.startsWith('https://')) previewEmbed.setThumbnail(embedData.thumbnail)
                        if ((replaceArgs(embedData.thumbnail) as string).startsWith('https://')) previewEmbed.setThumbnail(replaceArgs(embedData.thumbnail) as string)
                    }
                    if (embedData.image) {
                        if (embedData.image.startsWith('https://')) previewEmbed.setImage(embedData.image);
                        if ((replaceArgs(embedData.image) as string).startsWith('https://')) previewEmbed.setImage(replaceArgs(embedData.image) as string);
                    }
                    if (embedData.footer?.text || embedData.footer?.icon_url) {
                        let icon = embedData.footer.icon_url.startsWith('https://') ? embedData.footer.icon_url
                            : (replaceArgs(embedData.footer.icon_url) as string).startsWith('https://') ? replaceArgs(embedData.footer.icon_url) : undefined;
                        previewEmbed.setFooter({ text: replaceArgs(embedData.footer.text) as string || '', iconURL: icon as string | undefined })
                    }
                    if (embedData.timestamp) previewEmbed.setTimestamp()

                    if (!embedData.color) previewEmbed.setColor(client.color)
                    if (replaceArgs(embedData.color as string)) previewEmbed.setColor((replaceArgs(embedData.color as string) as ColorResolvable) || client.color)
                }
            }
            let requiredperm: PermissionResolvable[] = []
            if (arReply.requiredperm?.length) {
                requiredperm = requiredperm.map(function (perm) {
                    return Permissions2.find(p => p.perm === perm)?.flag
                }) as PermissionResolvable[]
            }

            let m: Message | null = null
            const ruserok = !requireuserid || requireuserid.length == 0 ? true : requireuserid.find((rus) => rus === author.id)
            const rchanelsok = !requiredchannel || requiredchannel.length == 0 ? true : requiredchannel.find((rch) => rch === channel.id)
            const dchanelsok = !denychannel || denychannel.length == 0 ? true : !denychannel.find((dch) => dch === channel.id)
            const rrolesok = !requiredrole || requiredrole.length == 0 ? true : requiredrole.every(role => member.roles.cache.has(role))
            const drolesok = !denyrole || denyrole.length == 0 ? true : !denyrole.every(role => member.roles.cache.has(role))
            const permsok = !requiredperm || requiredperm.length == 0 ? true : requiredperm.every(perm => member.permissions.has(perm))
            let defaultPerms: CommandPerms[] = [Permissions.enviarMensajes, Permissions.insertarEnlaces]

            if (ruserok && rchanelsok && dchanelsok && rrolesok && drolesok && permsok) {
                if (!defaultPerms.every(p => guild.members.me?.permissions.has(p.flag as PermissionResolvable)))
                    return channel.send(`${emotes.sweat} ${ErrorCodes.NOT_ENOUGH_PERMS(defaultPerms.filter(p => !member.permissions.has(p.flag as PermissionResolvable)).map(p => p.perm))}`)

                if (autoresponder.cooldown) {
                    const cooldownData = `${author.id}_ar:${arTrigger.triggerkey}`
                    const timesc = Math.floor(Date.now() / 1000)

                    if (client.timeouts.has(cooldownData)) {
                        const expirationTime = (client.timeouts.get(cooldownData) || 0) + autoresponder.cooldown
                        if (timesc < expirationTime) {
                            return message.reply({
                                content: `⏳ Podrás volver a ejecutar este autoresponder ${time(expirationTime, 'R')}`,
                            })
                        }
                    }
                    client.timeouts.set(cooldownData, timesc)
                    setTimeout(() => client.timeouts.delete(cooldownData), autoresponder.cooldown * 1000)
                }
                if (autoresponder.matchmode !== 'exactmatch') {
                    if (arReply.argsrequired && arReply.argsrequired.length >= 1) {
                        if (!args.length || args.length < 1 || args[0] === '')
                            return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.REQUIRED_ARGS_ERROR(arTrigger.triggerkey, arReply.argsrequired)}`)
                        for (let arg of arReply.argsrequired) {
                            if (!arg.num && !arg.type) break
                            let uso = ErrorCodes.CORRECT_ARGS_USE(arTrigger.triggerkey, arReply.argsrequired)
                            if (arg.type === 'user' && !guild.members.cache.find(m => m.id === args[arg.num - 1].replace(/[\\<>@#&!]/g, "")))
                                return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('usuario')} ${uso}`)
                            if (arg.type === 'color' && !/^#([0-9a-f]{6})/i.test(args[arg.num - 1]))
                                return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('color')} ${uso}`)
                            if (arg.type === 'channel' && !guild.channels.cache.find(ch => ch.id === args[arg.num - 1].replace(/[\\<>@#&!]/g, "")))
                                return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('canal')} ${uso}`)
                            if (arg.type === 'rol' && !guild.roles.cache.find(r => r.id === args[arg.num - 1].replace(/[\\<>@#&!]/g, "")))
                                return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('rol')} ${uso}`)
                            if (arg.type === 'number' && isNaN(Number(args[arg.num - 1])))
                                return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('número')} ${uso}`)
                        }
                    }
                }
                if (arReply.addrole?.length) {
                    if (!guild.members.me?.permissions.has(Permissions.gestionarRoles.flag))
                        return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarRoles?.perm])}`)
                    for (let roledata of arReply.addrole) {
                        let role = guild.roles.cache.get((replaceArgs(roledata.role) as string).replace(/[\\<>@#&!]/g, "").trim())
                        if (!role) return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_ROLE_ERROR}`)
                        if (role.position > guild.members.me.roles.highest.position)
                            return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR}`)
                        if (roledata.user) {
                            let $user = guild.members.cache.get((replaceArgs(roledata.user) as string).replace(/[\\<>@#&!]/g, "").trim())
                            if ($user) {
                                if ($user.permissions.has(Permissions.administrador.flag))
                                    return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                                $user.roles.add(role).catch(() => channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`) as Promise<Message<false>>)
                            }
                        } else {
                            if (member.permissions.has(Permissions.administrador.flag))
                                return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                            member.roles.add(role).catch(() => channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`) as Promise<Message<false>>)
                        }
                    }
                }
                if (arReply.removerole?.length) {
                    if (!guild.members.me?.permissions.has(Permissions.gestionarRoles.flag))
                        return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarRoles.perm])}`)
                    for (let roledata of arReply.removerole) {
                        let role = guild.roles.cache.get((replaceArgs(roledata.role) as string).replace(/[\\<>@#&!]/g, "").trim())
                        if (!role) return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_ROLE_ERROR}`)
                        if (role.position > guild.members.me.roles.highest.position)
                            return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR}`)
                        if (roledata.user) {
                            let $user = guild.members.cache.get((replaceArgs(roledata.user) as string).replace(/[\\<>@#&!]/g, "").trim())
                            if ($user) {
                                if ($user.permissions.has(Permissions.administrador.flag))
                                    return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                                $user.roles.remove(role).catch(() => channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`) as Promise<Message<false>>)
                            }
                        } else {
                            if (member.permissions.has(Permissions.administrador.flag))
                                return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                            member.roles.remove(role).catch(() => channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`) as Promise<Message<false>>)
                        }
                    }
                }
                if (nickname) {
                    if (!guild.members.me?.permissions.has(Permissions.gestionarApodos.flag))
                        return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarApodos.perm])}`)
                    if (member.roles.highest.position > guild.members.me.roles.highest.position)
                        return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR2}`)
                    const user = nickuser ? guild.members.cache.get(nickuser.replace(/[\\<>@#&!]/g, "")) : member
                    if (user?.permissions.has(Permissions.administrador.flag))
                        return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR2}`)
                    user?.setNickname(nickname).catch(() => channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.SET_NICK_ERROR}`) as Promise<Message<false>>)
                }
                if (arReply.buttons && arReply.buttons?.length >= 1) {
                    row = new ActionRowBuilder<ButtonBuilder>()
                    let buttons = []
                    for (let buttondata of arReply.buttons) {
                        let button = new ButtonBuilder()
                        if (buttondata.type != '5') button.setCustomId(buttondata.id)
                        button.setLabel(formatStr(varis, buttondata.label))
                            .setStyle(Number(buttondata.type))
                        if (buttondata.type == '5') button.setURL(replaceArgs(buttondata.replyorlink) as string)
                        buttons.push(button)
                    }
                    row.setComponents(buttons)
                }
                if (font) {
                    let fonts = getFonts(botresponse)
                    let stilizedText = font === 'random' ? fonts[Math.floor(Math.random() * fonts.length)].value : fonts.find(f => f.name === font)?.value
                    if (stilizedText) botresponse = stilizedText
                }
                if (arReply.modifybal && arReply.modifybal.length >= 1) {
                    for (let bal of arReply.modifybal) {
                        if (!bal.user && !bal.cant) break
                        let user: string | UserCurrency = (replaceArgs(bal.user) as string).replace(/[\\<>@#&!]/g, "")
                        if (user) {
                            user = await usermodel.findOne({ userId: user }).exec() as UserCurrency
                        } else user = await usermodel.findOne({ userId: author.id }).exec() as UserCurrency
                        let sym = bal.cant.match(/(\+|\-)/)?.[0]
                        let cant = Number(replaceArgs(bal.cant.replace(/[\+\-]/, ""))) || 0
                        if (!sym || !cant || !user) return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_MODIFYBALL}`)
                        let newcant = sym === '+' ? (user.balance || 0) + cant : (user.balance || 0) - cant
                        if (newcant < 0) return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.MODIFYBAL_ERROR}`)
                        await usermodel.updateOne({ userId: user.userId }, { balance: newcant })
                    }
                }
                if (autoresponder.matchmode === 'exactmatch') {
                    if (content.toLowerCase() === arTrigger.triggerkey) {
                        m = await enviarMensaje(arReply.replytype, wheretosend)
                        if (m && reactionemojis1 && reactionemojis2) await reactMessage(message, m, reactionemojis1, reactionemojis2)
                    }
                } else {
                    if (autoresponder.matchmode === 'startswith') {
                        if (content.toLowerCase().startsWith(arTrigger.triggerkey)) {
                            m = await enviarMensaje(arReply.replytype, wheretosend)
                            if (m && reactionemojis1 && reactionemojis2) await reactMessage(message, m, reactionemojis1, reactionemojis2)
                        }
                    }
                    if (autoresponder.matchmode === 'endswith') {
                        if (content.toLowerCase().toLowerCase().endsWith(arTrigger.triggerkey)) {
                            m = await enviarMensaje(arReply.replytype, wheretosend)
                            if (m && reactionemojis1 && reactionemojis2) await reactMessage(message, m, reactionemojis1, reactionemojis2)
                        }
                    }
                    if (autoresponder.matchmode === 'includes') {
                        if (content.toLowerCase().includes(arTrigger.triggerkey)) {
                            m = await enviarMensaje(arReply.replytype, wheretosend)
                            if (m && reactionemojis1 && reactionemojis2) reactMessage(message, m, reactionemojis1, reactionemojis2)
                        }
                    }
                }
                if (arReply.waitresponse) {
                    if (arReply.waitresponse.answer && arReply.waitresponse.channel && arReply.waitresponse.reply && arReply.waitresponse.time) {
                        const answer = formatStr(varis, arReply.waitresponse.answer) as string
                        const channel = replaceArgs(arReply.waitresponse.channel) as string
                        const filter = (m: Message) => m.content.toLowerCase() === answer.toLowerCase()
                        if (answer && channel && arReply.waitresponse.time && arReply.waitresponse.reply) {
                            if (client.channels.cache.get(channel)) {
                                const chnl = client.channels.cache.get(channel) as DMChannel | TextChannel
                                const msgcollector = chnl?.createMessageCollector({ filter: filter, time: Number(replaceArgs(arReply.waitresponse?.time as string)) })

                                msgcollector.on('collect', async (m: Message) => {
                                    const vars = variables(m).totalvars()
                                    await chnl.send(formatStr(vars, arReply.waitresponse?.reply as string))
                                    msgcollector.stop()
                                })
                            } else if (channel === 'current') {
                                const msgcollector = message.channel.createMessageCollector({ filter: filter, time: Number(replaceArgs(arReply.waitresponse.time as string)) })

                                msgcollector.on('collect', async m => {
                                    const vars = variables(m).totalvars()
                                    await message.channel.send(formatStr(vars, arReply.waitresponse?.reply as string))
                                    msgcollector.stop()
                                })
                            }
                        }
                    }
                }
                if (row && m) {
                    const filter = (i: MessageComponentInteraction) => i.isButton() && i.user.id === message.author.id
                    const btncollector = m.createMessageComponentCollector({ filter, time: 15000 })

                    btncollector?.on('collect', async i => {
                        if (i.user.id !== message.author.id) {
                            await i.reply({ content: `${emotes.hmph} El autoresponder no está dirigido a ti`, ephemeral: true })
                        }
                        let btn = arReply.buttons?.find(b => b.id == i.customId)
                        if (btn?.type !== '5') {
                            await i.reply({ content: `${btn?.replyorlink}` }).catch(e => console.log(e))
                        }
                    })
                    btncollector?.on('end', async () => {
                        row?.components.forEach(c => c.setDisabled(true))
                        await m?.edit({ components: [row as ActionRowBuilder<ButtonBuilder>] }).catch(e => console.log(e))
                    })
                }
                if (arTrigger.autodelete) {
                    if (!guild.members.me?.permissions.has(Permissions.gestionarMensajes.flag))
                        return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarMensajes.perm])}`)
                    message.delete().catch(() => channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.DELETE_MESSAGE_ERROR}`) as Promise<Message<false>>)
                }
                if (m && arReply.autodelete?.value) {
                    if (!guild.members.me?.permissions.has(Permissions.gestionarMensajes.flag))
                        return channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarMensajes.perm])}`)
                    if (autodeletetime) { try { setTimeout(() => m?.delete(), autodeletetime) } catch (e) { console.log(e) } }
                    else m.delete().catch(() => channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.DELETE_MESSAGE_ERROR}`) as Promise<Message<false>>)

                }
            }

            function enviarMensaje(tipo: string, where: string) {
                where = where.replace(/[\\<>@#&!]/g, "")
                let dataToSend: MessageCreateOptions
                    = { content: '', embeds: [], components: [] }

                if (where === 'current_channel') {
                    if (tipo === 'message') {
                        if (botresponse) dataToSend.content = botresponse
                        if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds?.length) return channel.send(dataToSend)
                    } else if (tipo === 'embed') {
                        if (arReply.embeddata) {
                            if (botresponse) dataToSend.content = botresponse
                            dataToSend.embeds = [previewEmbed] || []
                            if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds.length) return channel.send(dataToSend)
                        } else {
                            if (botresponse) dataToSend.embeds = [embed.setDescription(botresponse)] || []
                            if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds?.length) return channel.send(dataToSend)
                        }
                    }
                } else if (where === 'user_dm') {
                    if (tipo === 'message') {
                        if (botresponse) dataToSend.content = `Autoresponder de **${guild.name}**\n\n${botresponse}`
                        if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds?.length) return author.send(dataToSend)
                    } else if (tipo === 'embed') {
                        if (arReply.embeddata) {
                            if (botresponse) dataToSend.content = `Autoresponder de ${guild.name}\n\n${botresponse}`
                            dataToSend.embeds = [previewEmbed] || []
                            if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds.length) return author.send(dataToSend)
                        } else {
                            if (botresponse) dataToSend.content = `Autoresponder de ${guild.name}\n`
                            if (botresponse) dataToSend.embeds = [embed.setDescription(botresponse)] || []
                            if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds?.length) return author.send(dataToSend)
                        }
                    }
                } else {
                    if (tipo === 'message') {
                        dataToSend.content = botresponse
                        if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds?.length) return client.channels.fetch(where).then((chnl: any) => chnl.send(dataToSend))

                    } else if (tipo === 'embed') {
                        if (arReply.embeddata) {
                            if (botresponse) dataToSend.content = botresponse
                            dataToSend.embeds = [previewEmbed] || []
                            if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds.length) return client.channels.fetch(where).then((chnl: any) => chnl.send(dataToSend))

                        } else {
                            if (botresponse) dataToSend.embeds = [embed.setDescription(botresponse)] || []
                            if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds?.length) return client.channels.fetch(where).then((chnl: any) => chnl.send(dataToSend))

                        }
                    }
                }
            }

            async function reactMessage(m1: Message, m2: Message, reactions1: string[], reactions2: string[]) {
                if (reactions1?.length > 0) {
                    for (let reaction of reactions1) {
                        m1.react(reaction).catch(() => channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.REACTION_ERROR}`) as Promise<Message<false>>)
                    }
                }
                if (reactions2?.length > 0) {
                    for (let reaction of reactions2) {
                        m2.react(reaction).catch(() => channel.send(`${emotes.error} \`ERROR\`: ${ErrorCodes.REACTION_ERROR}`) as Promise<Message<false>>)
                    }
                }
            }

            function replaceKey(key: string) {
                const n = key.replace(/\D/g, "").split('').map(nn => Number(nn));
                var replaced = ''
                if (/\[\$\d+\]/i.test(key)) {
                    if (args[n[0] - 1]) return args[n[0] - 1].trim()
                }
                if (/\[\$\d+\-\d+\]/i.test(key)) {
                    for (let i = n[0] - 1; i < n[n.length - 1]; i++) {
                        if (args[i]) replaced = replaced + args[i] + ' '
                    }
                    return replaced.trim()
                }
                if (/\[\$\d+\+\]/i.test(key)) {
                    for (let i = n[0] - 1; i < args.length; i++) {
                        if (args[i]) replaced = replaced + args[i] + ' '
                    }
                    return replaced.trim()
                }
                if (/({\w+:?.*?(?:(?<=\{)\w*(?=\}).+?)*})/i.test(key)) {
                    const varf = varis.find(varb => varb.name === key)
                    if (varf) return varf.value
                }
                if (/\[range\]/i.test(key) || /\[range\d+\]/i.test(key)) {
                    if (arReply.ranges && arReply.ranges?.length >= 1) {
                        let range = n[0] ? arReply.ranges.find(r => r.ind == n[0]) : arReply.ranges.find(r => !r.ind)
                        let rangemin = Number(replaceArgs(range?.min as string) || range?.min)
                        let rangemax = Number(replaceArgs(range?.max as string) || range?.max)
                        if (rangemin && rangemax) {
                            if (!isNaN(rangemin) && !isNaN(rangemax)) {
                                let number = Math.floor((Math.random() * rangemax) + rangemin)
                                if (!isNaN(number)) return `${number}`
                                else return 'RANGO_INSUFICIENTE'
                            } else return 'RANGO_NO_CALCULADO'
                        }
                    }
                }
                if (/\[choice\]/i.test(key) || /\[choice\d+\]/i.test(key)) {
                    if (arReply.choices && arReply.choices?.length >= 1) {
                        let choice = n[0] ? arReply.choices.find(c => c.ind == n[0]) : arReply.choices.find(ch => !ch.ind)
                        let choosed = choice?.options[Math.floor(Math.random() * choice?.options?.length)]
                        if (choosed?.option && schoice.option?.opt) {
                            schoice = { ind: choice?.ind || 0, option: { ind: choosed.ind, opt: choosed.option } }
                            return formatStr(varis, schoice.option?.opt as string)?.replace(/\\n/g, '\n').trim()
                        }
                    }
                }
                if (/\[choicevalue\]/i.test(key) || /\[choicevalue\d+\]/i.test(key)) {
                    if (arReply.choices && arReply.choices?.length >= 1 && arReply.choicevalues && arReply.choicevalues.length >= 1) {
                        let choicevalue = n[0] ? arReply.choicevalues.find(c => c.ind == n[0]) : arReply.choicevalues.find(c => !c.ind)
                        let choosedvalue = schoice.option?.ind ? choicevalue?.options[schoice.option.ind].option : undefined
                        schoicevalue = { ind: choicevalue?.ind || 0, option: choosedvalue }
                        if (choicevalue && schoicevalue.option) return formatStr(varis, schoicevalue.option)?.replace(/\\n/g, '\n').trim()
                    }
                }
                if (/\[choices\d+\]/i.test(key) || /\[choices\]/i.test(key)) {
                    if (arReply.choices && arReply.choices?.length >= 1) {
                        let choice = n[0] ? arReply.choices.find(c => c.ind == n[0]) : arReply.choices.find(ch => !ch.ind)
                        if (choice) return formatStr(varis, choice.options.map(o => o.option).join('\n')).trim()
                    }
                }
                return key
            }

            function replaceArgs(keys: string[] | string) {
                if (keys) {
                    if (Array.isArray(keys)) {
                        if (keys.length) {
                            return keys.map(function (key) {
                                return replaceKey(key)
                            })
                        }
                    } else if (typeof keys === 'string') {
                        return replaceKey(keys)
                    } return keys
                } return keys
            }

            function formatStr(varis: any[], str: string) {
                if (str) {
                    let newstr = str
                    let keys = newstr
                        .match(/\[\$\d+\]|\[\$\d+\-\d+\]|\[\$\d+\+\]|\[range\d+\]|\[choice\d+\]|\[range\]|\[choice\]|\[choicevalue\d+\]|\[choicevalue\]|\[choices\]|\[choices\d+\]/gi)
                    if (keys) {
                        keys.forEach((key) => {
                            var replaced = replaceKey(key)
                            newstr = newstr.replace(key, replaced).trim()
                        })
                    }
                    newstr = replaceVars(varis, newstr).replace(/\\n/g, '\n')
                    return newstr
                } return str
            }

            function replaceVars(variables: typeof varis, str: string) {
                if (str) {
                    const vars = str.match(/({\w+:?.*?(?:(?<=\{)\w*(?=\}).+?)*})/gi)
                    if (vars) {
                        let replaced = str
                        for (let v of vars) {
                            const varf = variables.find(varb => varb.name === v)
                            if (varf) replaced = replaced.replace(v, varf.value as string)
                            else replaced = replaced.replace(v, '')
                        }
                        return replaced
                    }
                } return str
            }
        }
    })