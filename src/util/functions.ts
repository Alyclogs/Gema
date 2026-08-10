import { ActionRowBuilder, BaseInteraction, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, CollectorFilter, ColorResolvable, DMChannel, EmbedBuilder, Guild, GuildMember, Message, MessageComponentInteraction, MessageCreateOptions, PartialGroupDMChannel, PermissionResolvable, StringSelectMenuBuilder, TextChannel, time } from "discord.js";
import { variables, getVars, VariableType, testArg } from '../lib/Variables';
import Bot from "../structures/Bot";
import { EmbedDataType, ArReplyType, Autoresponder, ArChoicedOptionType, ArChoiceOptionsType, buttonModel } from "../models/gema-models";
import { ErrorCodes } from "../lib/Errors";
import { Permissions, Permissions2 } from "../lib/Permissions";
import ExtendedMessage from "../typing/ExtendedMessage";
import { CommandPerms } from "../typing/Command";
import { applyUnicodeFont, FontKey, getRandomFontKey } from "./presentation/fonts";
import fontsData from '../lib/fonts.json';
import { UserCurrency, model as usermodel } from "../models/user-currency";
import ExtendedInteraction from "../typing/ExtendedInteraction";
import { ErrorContext, reportError } from "./errors/errorReporter";

type InputChannel = ExtendedMessage["channel"] | ExtendedInteraction["channel"];
type SendableChannel = Exclude<NonNullable<InputChannel>, PartialGroupDMChannel>;

export default class Functions {
    client: Bot
    input?: ChatInputCommandInteraction | ExtendedMessage | BaseInteraction
    varis?: VariableType[] = []

    constructor(client: Bot, input?: ChatInputCommandInteraction | ExtendedMessage | BaseInteraction) {
        this.client = client;
        if (input) this.setInput(input);
        void this.client.syncButtons();
    }

    public setInput(input: ChatInputCommandInteraction | ExtendedMessage | BaseInteraction) {
        this.input = input;
        this.varis = variables(input).totalvars();
    }

    public replaceEmbedFields(embedData: EmbedDataType, variables?: VariableType[] | undefined) {
        let previewEmbed = new EmbedBuilder()

        if (embedData.author?.name || embedData.author?.icon_url) {
            const authorIcon = embedData.author?.icon_url;
            const replacedIcon = authorIcon ? this.replaceVars(authorIcon, variables) : '';
            let icon = authorIcon?.startsWith('https://') ? authorIcon
                : replacedIcon.startsWith('https://') ? replacedIcon : undefined;
            previewEmbed.setAuthor({ name: this.replaceVars(embedData.author?.name || '', variables) || '', iconURL: icon })
        }
        if (embedData.title) previewEmbed.setTitle(this.replaceVars(embedData.title, variables) || '');
        if (embedData.description) {
            previewEmbed.setDescription(this.replaceVars(embedData.description, variables).replace(/\\n/g, '\n'))
        }
        if (embedData.thumbnail) {
            const replacedThumbnail = this.replaceVars(embedData.thumbnail, variables)
            if (embedData.thumbnail.startsWith('https://')) previewEmbed.setThumbnail(embedData.thumbnail)
            if (replacedThumbnail.startsWith('https://')) previewEmbed.setThumbnail(replacedThumbnail)
        }
        if (embedData.image) {
            const replacedImage = this.replaceVars(embedData.image, variables)
            if (embedData.image.startsWith('https://')) previewEmbed.setImage(embedData.image);
            if (replacedImage.startsWith('https://')) previewEmbed.setImage(replacedImage);
        }
        if (embedData.footer?.text || embedData.footer?.icon_url) {
            const footerIcon = embedData.footer?.icon_url;
            const replacedIcon = footerIcon ? this.replaceVars(footerIcon, variables) : '';
            let icon = footerIcon?.startsWith('https://') ? footerIcon
                : replacedIcon.startsWith('https://') ? replacedIcon : undefined;
            previewEmbed.setFooter({ text: this.replaceVars(embedData.footer?.text || '', variables) || '', iconURL: icon })
        }
        if (embedData.timestamp) previewEmbed.setTimestamp()

        if (!embedData.color) previewEmbed.setColor(this.client.color)
        if (this.replaceVars(embedData.color as string, variables))
            previewEmbed.setColor(this.replaceVars(embedData.color as string, variables) as ColorResolvable || this.client.color)

        return previewEmbed
    }

    public replaceVars(str: string, variables?: VariableType[] | undefined) {
        if (!this.varis && !variables) throw new Error('La instancia de funciones del bot no tiene asignadas variables o no es un array válido');

        if (str) {
            const vars = getVars(str, '{', '}', true)
            if (vars) {
                let replaced = str;
                variables = variables ?? this.varis;
                // Actualmente se compara la variable por su nombre, pero el nombre de la variable puede contener una mencion de usuario.
                // Buscado: {user_avatar:@usuario}, encontrado: {user_avatar}
                // Considerar buscar usuario y reemplazar la variable con el usuario ingresado. Ej. {user_avatar:@usuario} => {user_avatar:<link>}
                for (let v of vars) {
                    const baseVarMatch = v.match(/^\{([^}:]+)/)
                    const baseVarName = baseVarMatch ? `{${baseVarMatch[1]}}` : v
                    const varf = variables
                        ? variables.find((varb) => varb.name === v || varb.name === baseVarName)
                        : undefined;
                    if (varf) {
                        replaced = replaced.replace(v, varf.value as string);
                    } else replaced = replaced.replace(v, '');
                }
                return replaced;
            }
        } return str
    }

    private isSendableChannel(channel: InputChannel | null | undefined): channel is SendableChannel {
        return !!channel && 'send' in channel && typeof channel.send === 'function';
    }

    public async createAutoresponder(input: ExtendedInteraction | Message, reply: string) {
        const ar = new Autoresponder()
        const { arTrigger, arReply } = ar
        arReply.replymessage = reply
        arReply.rawreply = reply
        arReply.replytype = "message"

        const vars = getVars(reply, '{', '}', true)

        if (vars) {
            if (vars.find(v => v.startsWith('{requireuser:'))) {
                arReply.requireuserid = []
                const usersrequired = getVars(reply, '{requireuser:', '}')
                if (usersrequired) {
                    for (let user of usersrequired) {
                        user = user.replace(/[\\<>@#&!]/g, "").trim()
                        if (!input.guild?.members.cache.get(user) && !testArg(user)) {
                            throw new Error(ErrorCodes.INVALID_USER_ERROR)
                        }
                        arReply.requireuserid.push(user)
                    }
                } else throw new Error(ErrorCodes.INVALID_USER_ERROR)
            }
            if (vars.find(v => v.startsWith('{sendto:'))) {
                const wheretosend = getVars(reply, '{sendto:', '}')
                if (wheretosend) {
                    for (let channel of wheretosend) {
                        channel = channel.replace(/[\\<>@#&!]/g, "").trim()
                        if (!input.guild?.channels.cache.get(channel) && !testArg(channel)) {
                            throw new Error(ErrorCodes.INVALID_CHANNEL_ERROR)
                        } else {
                            arReply.wheretosend = channel
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_CHANNEL_ERROR)
            }
            if (vars.find(v => v.startsWith('{requirechannel:'))) {
                arReply.requiredchannel = []
                const channelid = getVars(reply, '{requirechannel:', '}')
                if (channelid) {
                    for (let channel of channelid) {
                        channel = channel.replace(/[\\<>@#&!]/g, "").trim()
                        if (!input.guild?.channels.cache.get(channel) && !testArg(channel)) {
                            throw new Error(ErrorCodes.INVALID_CHANNEL_ERROR)
                        } else {
                            arReply.requiredchannel.push(channel)
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_CHANNEL_ERROR)
            }
            if (vars.find(v => v.startsWith('{denychannel:'))) {
                arReply.denychannel = []
                const channelid = getVars(reply, '{denychannel:', '}')
                if (channelid) {
                    for (let channel of channelid) {
                        channel = channel.replace(/[\\<>@#&!]/g, "").trim()
                        if (!input.guild?.channels.cache.get(channel) && !testArg(channel)) {
                            throw new Error(ErrorCodes.INVALID_CHANNEL_ERROR)
                        } else {
                            arReply.denychannel.push(channel)
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_CHANNEL_ERROR)
            }
            if (vars.find(v => v.startsWith('{requirerole:'))) {
                arReply.requiredrole = []
                const roleid = getVars(reply, '{requirerole:', '}')
                if (roleid) {
                    for (let role of roleid) {
                        role = role.replace(/[\\<>@#&!]/g, "").trim()
                        if (!input.guild?.roles.cache.get(role) && !testArg(role)) {
                            throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
                        } else {
                            arReply.requiredrole.push(role)
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
            }
            if (vars.find(v => v.startsWith('{denyrole:'))) {
                arReply.denyrole = []
                const roleid = getVars(reply, '{denyrole:', '}')
                if (roleid) {
                    for (let role of roleid) {
                        role = role.replace(/[\\<>@#&!]/g, "")?.trim()
                        if (!input.guild?.roles.cache.get(role) && !testArg(role)) {
                            throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
                        } else {
                            arReply.denyrole.push(role)
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
            }
            if (vars.find(v => v.startsWith('{embed'))) {
                arReply.replytype = 'embed'
                arReply.embedcolor = ''
                const embeddatas = getVars(reply, '{embed:', '}')
                if (embeddatas) {
                    for (let data of embeddatas) {
                        data = data.trim()
                        const dataf = this.client.embeds.find(em => em.guildId === input.guild?.id && em.name === data)
                        if (!/^#([0-9a-f]{6})/i.test(data) && !testArg(data) && !dataf) {
                            throw new Error(ErrorCodes.INVALID_EMBED_DATA_ERROR)
                        } else {
                            if (dataf) {
                                arReply.embeddata = data
                                arReply.rawreply = arReply.rawreply.replace(`{embed:${data}}`, '').trim()
                                arReply.replymessage = arReply.replymessage?.replace(`{embed:${data}}`, '').trim()
                            }
                            else arReply.embedcolor = data
                            break
                        }
                    }
                }
            }
            if (vars.find(v => v.startsWith('{addrole:'))) {
                arReply.addrole = []
                const roles = getVars(reply, '{addrole:', '}')
                if (roles) {
                    for (let roledata of roles) {
                        let roleuser = roledata.trim().split('|')
                        let role = roleuser[0]?.replace(/[\\<>@#&!]/g, "")?.trim()
                        if (!input.guild?.roles.cache.get(role) && !testArg(role)) {
                            throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
                        }
                        let user = roleuser[1]?.replace(/[\\<>@#&!]/g, "")?.trim()
                        if (user && !input.guild?.members.cache.get(user) && !testArg(user)) {
                            throw new Error(ErrorCodes.INVALID_ROLEUSER_ERROR)
                        }
                        arReply.addrole.push({ role: role, user: user })
                    }
                } else throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
            }
            if (vars.find(v => v.startsWith('{removerole:'))) {
                arReply.removerole = []
                const roles = getVars(reply, '{removerole:', '}')
                if (roles) {
                    for (let roledata of roles) {
                        let roleuser = roledata.trim().split('|')
                        let role = roleuser[0]?.replace(/[\\<>@#&!]/g, "")?.trim()
                        if (!input.guild?.roles.cache.get(role) && !testArg(role)) {
                            throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
                        }
                        let user = roleuser[1]?.replace(/[\\<>@#&!]/g, "")?.trim()
                        if (user && !input.guild?.members.cache.get(user) && !testArg(user)) {
                            throw new Error(ErrorCodes.INVALID_ROLEUSER_ERROR)
                        }
                        arReply.removerole.push({ role: role, user: user })
                    }
                } else throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
            }
            if (vars.find(v => v.startsWith('{font'))) {
                arReply.font = ''
                const font = getVars(reply, '{font:', '}')
                if (font) {
                    arReply.font = font[0].trim()
                } else arReply.font = 'random'
            }
            if (vars.find(v => v.startsWith('{react:'))) {
                arTrigger.reactionemojis = []
                const remojis = getVars(reply, '{react:', '}')
                if (remojis) {
                    for (let e of remojis) {
                        const emoji = e.trim()
                        if (!emoji) throw new Error(ErrorCodes.REACTION_ERROR)
                        arTrigger.reactionemojis.push(emoji)
                    }
                } else throw new Error(ErrorCodes.REACTION_ERROR)
            }
            if (vars.find(v => v.startsWith('{reactreply:'))) {
                arReply.reactionemojis = []
                const remojis = getVars(reply, '{reactreply:', '}')
                if (remojis) {
                    for (let e of remojis) {
                        const emoji = e.trim()
                        if (!emoji) throw new Error(ErrorCodes.REACTION_ERROR)
                        arReply.reactionemojis.push(emoji)
                    }
                } else throw new Error(ErrorCodes.REACTION_ERROR)
            }
            if (vars.find(v => v.startsWith('{deletereply:'))) {
                arReply.autodelete.value = true
                const time = Number(getVars(reply, '{deletereply:', '}')?.shift())
                console.log(time)
                if (!isNaN(time)) {
                    if (/\d+/.test(`${time}`)) {
                        arReply.autodelete.time = `${time * 1000}`
                    } else {
                        throw new Error(ErrorCodes.INVALID_TIME_FORMAT)
                    }
                } else throw new Error(ErrorCodes.INVALID_TIME_FORMAT)
            }
            if (vars.find(v => v.startsWith('{requireperm:'))) {
                arReply.requiredperm = []
                const perms = getVars(reply, '{requireperm:', '}')
                if (perms) {
                    for (let perm of perms) {
                        perm = perm.trim()
                        if (!Permissions2.find(p => p.perm === perm) && !testArg(perm)) {
                            throw new Error(ErrorCodes.INVALID_PERM_ERROR)
                        } else {
                            arReply.requiredperm.push(perm)
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_PERM_ERROR)
            }
            if (vars.find(v => v.startsWith('{range'))) {
                arReply.ranges = []
                const ranges = getVars(reply, '{range', '}')
                if (ranges) {
                    for (let range of ranges) {
                        const rangedata = range.trim().split(':')
                        if (!rangedata) {
                            throw new Error(ErrorCodes.INVALID_RANGE)
                        }
                        const ind = Number(rangedata[0]) || 0
                        const numbers = rangedata[1].trim().split('-')
                        if (!(numbers.length == 2)) {
                            throw new Error(ErrorCodes.INVALID_RANGE)
                        } else {
                            arReply.ranges.push({ ind: ind, min: Number(numbers[0]), max: Number(numbers[1]) })
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_RANGE)
            }
            if (vars.find(v => v.startsWith('{choose'))) {
                arReply.choices = []
                const choices = getVars(reply, '{choose', '}')
                if (choices) {
                    for (let choice of choices) {
                        const choicedata = choice.trim().split(':')
                        if (!choicedata[0].startsWith('values')) {
                            const ind = Number(choicedata[0]) || 0
                            if (ind && (ind < 1 || isNaN(ind))) {
                                throw new Error(ErrorCodes.INVALID_CHOICES)
                            }
                            const choicesArr = choicedata[1]?.trim().split('|')?.map((c, i) => ({ ind: i, option: c.trim() }))
                            if (choicesArr && choicesArr.length >= 2) {
                                arReply.choices.push({ ind: ind, options: choicesArr })
                            } else {
                                throw new Error(ErrorCodes.INVALID_CHOICES)
                            }
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_CHOICES)
            }
            if (vars.find(v => v.startsWith('{setnick'))) {
                const nick = getVars(reply, '{setnick:', '}')
                if (nick) {
                    const nickdata = nick[0].trim().split('|')
                    const name = nickdata[0] || ''
                    const user = nickdata[1] || ''
                    if (!name) throw new Error(ErrorCodes.INVALID_NICK)
                    else {
                        arReply.setnick = { nick: name, user: user }
                    }
                } else throw new Error(ErrorCodes.INVALID_NICK)
            }
            if (vars.find(v => v.startsWith('{requirearg'))) {
                arReply.argsrequired = []
                const args = getVars(reply, '{requirearg:', '}')
                if (args) {
                    for (let arg of args) {
                        const num = Number(arg.split('|') ? arg.split('|')[0] : arg)
                        const type = arg.split('|') && num ? arg.split('|')[1] : ''
                        if (!num || isNaN(num)) {
                            throw new Error(ErrorCodes.INVALID_ARGS_ERROR)
                        }
                        if (type && !type.match(/user|channel|color|role|number/)) {
                            throw new Error(ErrorCodes.INVALID_ARGS_ERROR)
                        }
                        arReply.argsrequired.push({ num: num, type: type })
                    }
                } else throw new Error(ErrorCodes.INVALID_ARGS_ERROR)
            }
            if (vars.find(v => v.startsWith('{choosevalues'))) {
                arReply.choicevalues = []
                const values = getVars(reply, '{choosevalues', '}')
                if (values) {
                    for (let value of values) {
                        const valuedata = value.trim().split(':')
                        const ind = Number(valuedata[0]) || 0
                        if (ind && ind < 1) {
                            throw new Error(ErrorCodes.INVALID_CHOICEVALUES)
                        }
                        const options = valuedata[1]?.trim().split('|')?.map((c, i) => ({ ind: i, option: c.trim() }))
                        if (options && options.length >= 2) {
                            arReply.choicevalues.push({ ind: ind, options: options })
                        } else {
                            throw new Error(ErrorCodes.INVALID_CHOICEVALUES)
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_CHOICEVALUES)
            }
            if (vars.find(v => v.startsWith('{waitresponse:'))) {
                const values = getVars(reply, '{waitresponse:', '}')
                if (values) {
                    let data = values[0]?.split('|')
                    let time = data[0]?.trim()
                    let channel = data[1]?.replace(/[\\<>@#&!]/g, "")?.trim()
                    let answer = data[2]?.trim()
                    let response = data.slice(3).join('|').trim()
                    if (time && answer && channel && response) {
                        arReply.waitresponse = { time: time, channel: channel, answer: answer, reply: response }
                    } else throw new Error(ErrorCodes.INVALID_WAITRESPONSE)
                } else throw new Error(ErrorCodes.INVALID_WAITRESPONSE)
            }
            if (vars.find(v => v.startsWith('{button:'))) {
                arReply.buttons = []
                const buttons = getVars(reply, '{button:', '}')
                if (buttons) {
                    for (let button of buttons) {
                        if (this.client.buttons.get(`arbtn_${button}`)) {
                            arReply.buttons.push(button)
                            arReply.rawreply = arReply.rawreply.replace(`{button:${button}}`, '')
                            arReply.replymessage = arReply.replymessage?.replace(`{button:${button}}`, '')
                        }
                        else throw new Error(ErrorCodes.INVALID_BUTTON_ERROR)
                    }
                } else throw new Error(ErrorCodes.INVALID_BUTTON_ERROR)
            }
            if (vars.find(v => v.startsWith('{selectmenu:'))) {
                arReply.selectmenus = []
                const selectmenus = getVars(reply, '{selectmenu:', '}')
                if (selectmenus) {
                    for (let sel of selectmenus) {
                        if (this.client.selectmenus.find(sm => sm.customId === `arselm#${sel}`)) {
                            arReply.selectmenus.push(sel)
                            arReply.rawreply = arReply.rawreply.replace(`{selectmenu:${sel}}`, '')
                            arReply.replymessage = arReply.replymessage?.replace(`{selectmenu:${sel}}`, '')
                        }
                        else throw new Error(ErrorCodes.INVALID_BUTTON_ERROR)
                    }
                } else throw new Error(ErrorCodes.INVALID_BUTTON_ERROR)
            }
            if (vars.find(v => v.startsWith('{modifybal:'))) {
                arReply.modifybal = []
                const balances = getVars(reply, '{modifybal:', '}')
                if (balances) {
                    for (let bal of balances) {
                        let baldata = bal.trim().split('|')
                        if (baldata.length > 2 || baldata.length < 1) {
                            throw new Error(ErrorCodes.INVALID_MODIFYBALL)
                        }
                        let cant = baldata.length == 2 ? baldata[1].trim() : baldata[0].trim()
                        let usuario = baldata.length == 2 ? baldata[0].trim().replace(/[\\<>@#&!]/g, "") : ''
                        if (!cant) {
                            throw new Error(ErrorCodes.INVALID_MODIFYBALL)
                        }
                        arReply.modifybal.push({ user: usuario || '', cant: cant || '' })
                    }
                } else throw new Error(ErrorCodes.INVALID_MODIFYBALL)
            }
            if (reply?.includes('{delete}')) {
                arTrigger.autodelete = true
            }
            if (reply?.includes('{dm}')) {
                arReply.wheretosend = 'user_dm'
            }
            if (vars.find(v => v.includes('cooldown'))) {
                const time = Number(getVars(reply, '{cooldown:', '}')?.[0])
                if (isNaN(time)) throw new Error(ErrorCodes.INVALID_COOLDOWN)
                else ar.cooldown = time
            }
        }
        return ar
    }

    async executeAutoresponder(autoresponder: Autoresponder, message: ExtendedMessage) {
        const { arTrigger, arReply } = autoresponder
        const { content, guild, author, member } = message
        const channel = this.client.channels.cache.get(message.channel.id) as TextChannel | DMChannel

        const enviarMensaje = (tipo: string, where: string) => {
            where = where.replace(/[\\<>@#&!]/g, "")
            let dataToSend: MessageCreateOptions = { content: '', embeds: [], components: row ? [row] : [] }

            if (where === 'current_channel') {
                if (tipo === 'message') {
                    if (botresponse) dataToSend.content = botresponse
                    if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds?.length) return channel.send(dataToSend)
                } else if (tipo === 'embed') {
                    if (arReply.embeddata) {
                        if (botresponse) dataToSend.content = botresponse
                        dataToSend.embeds = [previewEmbed]
                        if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds.length) return channel.send(dataToSend)
                    } else {
                        if (botresponse) dataToSend.embeds = [embed.setDescription(botresponse)]
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
                        dataToSend.embeds = [previewEmbed]
                        if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds.length) return author.send(dataToSend)
                    } else {
                        if (botresponse) dataToSend.content = `Autoresponder de ${guild.name}\n`
                        if (botresponse) dataToSend.embeds = [embed.setDescription(botresponse)]
                        if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds?.length) return author.send(dataToSend)
                    }
                }
            } else {
                if (tipo === 'message') {
                    dataToSend.content = botresponse
                    if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds?.length) return this.client.channels.fetch(where).then((chnl: any) => chnl.send(dataToSend))

                } else if (tipo === 'embed') {
                    if (arReply.embeddata) {
                        if (botresponse) dataToSend.content = botresponse
                        dataToSend.embeds = [previewEmbed]
                        if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds.length) return this.client.channels.fetch(where).then((chnl: any) => chnl.send(dataToSend))

                    } else {
                        if (botresponse) dataToSend.embeds = [embed.setDescription(botresponse)]
                        if (dataToSend.content || dataToSend.components?.length || dataToSend.embeds?.length) return this.client.channels.fetch(where).then((chnl: any) => chnl.send(dataToSend))
                    }
                }
            }
        }

        const reactMessage = async (m1: Message, m2?: Message | undefined, reactions1?: string[], reactions2?: string[]) => {
            if (reactions1 && reactions1?.length > 0) {
                for (let reaction of reactions1) {
                    await m1.react(reaction).catch(async () => await channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.REACTION_ERROR}`))
                }
            }
            if (m2 && reactions2 && reactions2?.length > 0) {
                for (let reaction of reactions2) {
                    await m2.react(reaction).catch(async () => await channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.REACTION_ERROR}`))
                }
            }
        }

        const getPlaceholderNumbers = (value: string): number[] => {
            return value.match(/\d+/g)?.map(Number) || []
        }

        const replaceKey = (key: string): string => {
            const numbers = getPlaceholderNumbers(key)
            const firstIndex = numbers[0]
            const lastIndex = numbers[numbers.length - 1]
            let replaced = ''
            if (/\[\$\d+\]/i.test(key)) {
                if (firstIndex && args[firstIndex - 1])
                    return args[firstIndex - 1].trim()
                else return ''
            }
            if (/\[\$\d+\-\d+\]/i.test(key)) {
                if (!firstIndex || !lastIndex) return ''
                for (let i = firstIndex - 1; i < lastIndex; i++) {
                    if (args[i]) replaced = replaced + args[i] + ' '
                }
                return replaced?.trim()
            }
            if (/\[\$\d+\+\]/i.test(key)) {
                if (!firstIndex) return ''
                for (let i = firstIndex - 1; i < args.length; i++) {
                    if (args[i]) replaced = replaced + args[i] + ' '
                }
                return replaced?.trim()
            }
            if (/\[range\]/i.test(key) || /\[range\d+\]/i.test(key)) {
                if (arReply.ranges && arReply.ranges?.length >= 1) {
                    let range = firstIndex ? arReply.ranges.find(r => r.ind == firstIndex) : arReply.ranges.find(r => !r.ind || r.ind == 0)
                    let rangemin = Number(replaceArgs(range?.min as string) || range?.min)
                    let rangemax = Number(replaceArgs(range?.max as string) || range?.max)
                    if (!isNaN(rangemin) && !isNaN(rangemax)) {
                        if (rangemin <= rangemax) {
                            let number = Math.floor((Math.random() * (rangemax - rangemin + 1)) + rangemin)
                            if (!isNaN(number)) return `${number}`
                            else return 'RANGO_INSUFICIENTE'
                        } else return 'RANGO_NO_CALCULADO'
                    }
                }
            }
            if (/\[choice\]/i.test(key) || /\[choice\d+\]/i.test(key)) {
                if (arReply.choices && arReply.choices?.length >= 1) {
                    let choice = firstIndex ? arReply.choices.find(c => c.ind == firstIndex) : arReply.choices.find(ch => !ch.ind || ch.ind == 0)
                    let choosed = choice?.options[Math.floor(Math.random() * choice?.options?.length)]
                    if (choice && choosed) {
                        let schoice: ArChoicedOptionType = { ind: choice.ind || 0, option: { ind: choosed.ind, option: choosed.option } }
                        schoices.push(schoice)
                        return formatStr(varis, schoice.option?.option as string)?.replace(/\\n/g, '\n').trim()
                    }
                    throw new Error('La opción de la variable {choose} está mal configurada, revisa tu autoresponder con \`gema ar show_reply <triger>\`')
                }
            }
            if (/\[choicevalue\]/i.test(key) || /\[choicevalue\d+\]/i.test(key)) {
                if (arReply.choices && arReply.choices?.length >= 1 && arReply.choicevalues && arReply.choicevalues.length >= 1) {
                    let choicevalue = firstIndex ? arReply.choicevalues.find(c => c.ind == firstIndex) : arReply.choicevalues.find(c => !c.ind || c.ind == 0)
                    let matchedchoice = arReply.choices.find(c => c.ind == choicevalue?.ind)
                    if (choicevalue && matchedchoice) {
                        let matchedoption = schoices.find(c => c.ind == matchedchoice?.ind)?.option
                        if (matchedoption) {
                            let choosedvalue = choicevalue.options.find(c => c.ind == matchedoption?.ind)?.option
                            if (choosedvalue) {
                                let schoicevalue = { ind: choicevalue?.ind || 0, option: choosedvalue }
                                schoicevalues.push(schoicevalue)
                                if (schoicevalue.option) return formatStr(varis, schoicevalue.option)?.replace(/\\n/g, '\n').trim()
                            }
                        }
                    }
                    throw new Error('La opción de la variable {choosevalue} está mal configurada, revisa tu autoresponder con \`gema ar show_reply <triger>\`')
                }
            }
            if (/\[choices\d+\]/i.test(key) || /\[choices\]/i.test(key)) {
                if (arReply.choices && arReply.choices?.length >= 1) {
                    let choice = firstIndex ? arReply.choices.find(c => c.ind == firstIndex) : arReply.choices.find(ch => !ch.ind || ch.ind == 0)
                    if (choice) return formatStr(varis, choice.options.map(o => o.option).join('\n')).trim()
                }
            }
            return key
        }

        const replaceArgs = (keys?: string[] | string): string[] | string | undefined => {
            if (Array.isArray(keys)) {
                return keys.map((key) => replaceKey(key))
            }
            if (typeof keys === 'string') {
                return replaceKey(keys)
            }
            return keys
        }

        const formatStr = (varis: any[], str: string) => {
            if (str) {
                let newstr = str
                let keys = newstr
                    .match(/\[\$\d+\]|\[\$\d+\-\d+\]|\[\$\d+\+\]|\[range\d+\]|\[choice\d+\]|\[range\]|\[choice\]|\[choicevalue\d+\]|\[choicevalue\]|\[choices\]|\[choices\d+\]/gi)
                if (keys) {
                    keys.forEach((key) => {
                        var replaced = replaceKey(key)
                        newstr = newstr.replace(key, replaced).trim()
                        var memberf = message.guild.members.cache.get(replaced.replace(/[<@!>]/g, '')?.trim());
                        if (memberf) {
                            varis = variables(memberf).totalvars()
                        }
                    })
                }
                newstr = this.replaceVars(newstr, varis).replace(/\\n/g, '\n')
                return newstr || str
            } return str
        }

        const args = content.toLowerCase().slice(arTrigger.triggerkey.length).trim().split(/ +/g)
        const varis = variables(message).totalvars()
        let previewEmbed: EmbedBuilder, row: ActionRowBuilder<ButtonBuilder> | null = null,
            schoices: ArChoicedOptionType[] = [], schoicevalues: ArChoiceOptionsType[] = []

        const embed = new EmbedBuilder()
            .setColor(this.client.color)

        let botresponse = formatStr(varis, arReply.rawreply.trim()).trim()
        let reactionemojis1 = arTrigger.reactionemojis ? replaceArgs(arTrigger.reactionemojis) as string[] : undefined
        let embedcolor = arReply.embedcolor ? replaceKey(arReply.embedcolor) : undefined
        let requireuserid = arReply.requireuserid ? replaceArgs(arReply.requireuserid) as string[] : undefined
        let wheretosend = replaceKey(arReply.wheretosend)
        let requiredchannel = arReply.requiredchannel ? replaceArgs(arReply.requiredchannel) as string[] : undefined
        let denychannel = arReply.denychannel ? replaceArgs(arReply.denychannel) as string[] : undefined
        let requiredrole = arReply.requiredrole ? replaceArgs(arReply.requiredrole) as string[] : undefined
        let denyrole = arReply.denyrole ? replaceArgs(arReply.denyrole) as string[] : undefined
        let reactionemojis2 = arReply.reactionemojis ? replaceArgs(arReply.reactionemojis) as string[] : undefined
        let autodeletetime = arReply.autodelete?.time ? Number(replaceKey(arReply.autodelete?.time)) : Number(arReply.autodelete?.time)
        let answer = arReply.waitresponse?.answer ? formatStr(varis, arReply.waitresponse.answer) : undefined
        let canal = arReply.waitresponse?.channel ? replaceKey(arReply.waitresponse.channel) : undefined
        let wtime = arReply.waitresponse?.time ? Number(replaceKey(arReply.waitresponse?.time)) : undefined

        const referencedEmbedData = arReply.embeddata
            ? this.client.embeds.find(embedData =>
                embedData.guildId === message.guild.id && embedData.name === arReply.embeddata
            )?.data
            : undefined

        if (arReply.embeddata && !referencedEmbedData) {
            throw new Error(
                `El autoresponder "${arTrigger.triggerkey}" usa el embed "${arReply.embeddata}", pero ese embed ya no existe en este servidor. Vuelve a crearlo o edita la respuesta del autoresponder.`
            )
        }

        botresponse = botresponse
            .replace(/\s*{embed:[^}]+}/gi, '')
            .replace(/\\n/g, '\n')
            .trim()

        if (embedcolor) {
            try {
                embed.setColor(embedcolor as ColorResolvable)
            } catch (e) {
            }
        }

        if (arReply.argsrequired && arReply.argsrequired.length >= 1) {
            if (!args.length || args.length < 1 || args[0] === '')
                return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.REQUIRED_ARGS_ERROR(arTrigger.triggerkey, arReply.argsrequired)}`)
            for (let arg of arReply.argsrequired) {
                if (!arg.num && !arg.type) break
                let uso = ErrorCodes.CORRECT_ARGS_USE(arTrigger.triggerkey, arReply.argsrequired)
                if (arg.type === 'user' && !guild?.members.cache.find(m => m.id === args[arg.num - 1].replace(/[\\<>@#&!]/g, "")))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('usuario')} ${uso}`)
                if (arg.type === 'color' && !/^#([0-9a-f]{6})/i.test(args[arg.num - 1]))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('color')} ${uso}`)
                if (arg.type === 'channel' && !guild?.channels.cache.find(ch => ch.id === args[arg.num - 1].replace(/[\\<>@#&!]/g, "")))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('canal')} ${uso}`)
                if (arg.type === 'rol' && !guild?.roles.cache.find(r => r.id === args[arg.num - 1].replace(/[\\<>@#&!]/g, "")))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('rol')} ${uso}`)
                if (arg.type === 'number' && isNaN(Number(args[arg.num - 1])))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('número')} ${uso}`)
            }
        }

        if (referencedEmbedData) {
            const embedData = referencedEmbedData
            if (embedData) {
                previewEmbed = new EmbedBuilder()
                if (embedData.author?.name || embedData.author?.icon_url) {
                    let icon = embedData.author.icon_url.startsWith('https://') ? embedData.author.icon_url
                        : (formatStr(varis, embedData.author.icon_url)).startsWith('https://') ? formatStr(varis, embedData.author.icon_url) : undefined;
                    previewEmbed.setAuthor({ name: formatStr(varis, embedData.author.name) || '', iconURL: icon as string | undefined })
                }
                if (embedData.title) previewEmbed.data.title = formatStr(varis, embedData.title) || '';
                if (embedData.description) {
                    previewEmbed.data.description = formatStr(varis, embedData.description)
                }
                if (embedData.thumbnail) {
                    if (embedData.thumbnail.startsWith('https://')) previewEmbed.setThumbnail(embedData.thumbnail)
                    if ((this.replaceVars(embedData.thumbnail)).startsWith('https://')) previewEmbed.setThumbnail(this.replaceVars(embedData.thumbnail))
                }
                if (embedData.image) {
                    if (embedData.image.startsWith('https://')) previewEmbed.setImage(embedData.image);
                    if ((this.replaceVars(embedData.image)).startsWith('https://')) previewEmbed.setImage(this.replaceVars(embedData.image));
                }
                if (embedData.footer?.text || embedData.footer?.icon_url) {
                    let icon = embedData.footer.icon_url.startsWith('https://') ? embedData.footer.icon_url
                        : (this.replaceVars(embedData.footer.icon_url)).startsWith('https://') ? this.replaceVars(embedData.footer.icon_url) : undefined;
                    previewEmbed.setFooter({ text: formatStr(varis, embedData.footer.text) || '', iconURL: icon as string | undefined })
                }
                if (embedData.timestamp) previewEmbed.setTimestamp()

                if (!embedData.color) previewEmbed.setColor(this.client.color)
                if (this.replaceVars(embedData.color as string)) previewEmbed.setColor((this.replaceVars(embedData.color as string) as ColorResolvable) || this.client.color)
            }
        }
        let requiredperm: PermissionResolvable[] = []
        if (arReply.requiredperm?.length) {
            requiredperm = arReply.requiredperm
                .map((perm) => Permissions2.find(p => p.perm === perm)?.flag)
                .filter((perm): perm is PermissionResolvable => perm !== undefined)
        }

        let m: Message | undefined = undefined
        const ruserok = !requireuserid || requireuserid.length == 0 ? true : requireuserid.find((rus) => rus === author.id)
        const rchanelsok = !requiredchannel || requiredchannel.length == 0 ? true : requiredchannel.find((rch) => rch === channel.id)
        const dchanelsok = !denychannel || denychannel.length == 0 ? true : !denychannel.find((dch) => dch === channel.id)
        const rrolesok = !requiredrole || requiredrole.length == 0 ? true : requiredrole.every(role => member?.roles.cache.has(role))
        const drolesok = !denyrole || denyrole.length == 0 ? true : !denyrole.every(role => member?.roles.cache.has(role))
        const permsok = !requiredperm || requiredperm.length == 0 ? true : requiredperm.every(perm => member?.permissions.has(perm))
        let defaultPerms: CommandPerms[] = [Permissions.enviarMensajes, Permissions.insertarEnlaces]

        if (ruserok && rchanelsok && dchanelsok && rrolesok && drolesok && permsok) {
            if (!defaultPerms.every(p => guild?.members.me?.permissions.has(p.flag as PermissionResolvable)))
                return channel.send(`${this.client.emotes.sweat} ${ErrorCodes.NOT_ENOUGH_PERMS(defaultPerms.filter(p => !member?.permissions.has(p.flag as PermissionResolvable)).map(p => p.perm))}`)

            if (autoresponder.cooldown) {
                const cooldownData = `${author.id}_ar:${arTrigger.triggerkey}`
                const timesc = Math.floor(Date.now() / 1000)

                if (this.client.timeouts.has(cooldownData)) {
                    const expirationTime = (this.client.timeouts.get(cooldownData) || 0) + autoresponder.cooldown
                    if (timesc < expirationTime) {
                        return message.reply({
                            content: `⏳ Podrás volver a ejecutar este autoresponder ${time(expirationTime, 'R')}`,
                        })
                    }
                }
                this.client.timeouts.set(cooldownData, timesc)
                setTimeout(() => this.client.timeouts.delete(cooldownData), autoresponder.cooldown * 1000)
            }
            if (arTrigger.autodelete) {
                if (!guild?.members.me?.permissions.has(Permissions.gestionarMensajes.flag))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarMensajes.perm])}`)
                message.delete().catch(async () => await channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.DELETE_MESSAGE_ERROR}`))
            }
            if (arReply.addrole?.length) {
                if (!guild?.members.me?.permissions.has(Permissions.gestionarRoles.flag))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarRoles?.perm])}`)
                for (let roledata of arReply.addrole) {
                    let role = guild?.roles.cache.get((replaceArgs(roledata.role) as string).replace(/[\\<>@#&!]/g, "").trim())
                    if (!role) return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_ROLE_ERROR}`)
                    if (role.position > guild?.members.me.roles.highest.position)
                        return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR}`)
                    if (roledata.user) {
                        let $user = guild.members.cache.get((replaceArgs(roledata.user) as string).replace(/[\\<>@#&!]/g, "").trim())
                        if ($user) {
                            if ($user.permissions.has(Permissions.administrador.flag))
                                return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                            $user.roles.add(role).catch(async () => await channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
                        }
                    } else {
                        if (member?.permissions.has(Permissions.administrador.flag))
                            return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                        member?.roles.add(role).catch(async () => await channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
                    }
                }
            }
            if (arReply.removerole?.length) {
                if (!guild?.members.me?.permissions.has(Permissions.gestionarRoles.flag))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarRoles.perm])}`)
                for (let roledata of arReply.removerole) {
                    let role = guild.roles.cache.get((replaceArgs(roledata.role) as string).replace(/[\\<>@#&!]/g, "").trim())
                    if (!role) return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_ROLE_ERROR}`)
                    if (role.position > guild.members.me.roles.highest.position)
                        return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR}`)
                    if (roledata.user) {
                        let $user = guild.members.cache.get((replaceArgs(roledata.user) as string).replace(/[\\<>@#&!]/g, "").trim())
                        if ($user) {
                            if ($user.permissions.has(Permissions.administrador.flag))
                                return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                            $user.roles.remove(role).catch(async () => await channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
                        }
                    } else {
                        if (member?.permissions.has(Permissions.administrador.flag))
                            return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                        member?.roles.remove(role).catch(async () => await channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
                    }
                }
            }
            if (arReply.setnick?.nick) {
                const nickname = replaceKey(arReply.setnick.nick)
                const nickuser = arReply.setnick.user ? replaceKey(arReply.setnick.user) : undefined
                if (!guild?.members.me?.permissions.has(Permissions.gestionarApodos.flag))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarApodos.perm])}`)
                if (member?.roles.highest.position > guild.members.me.roles.highest.position)
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR2}`)
                const user = nickuser ? guild.members.cache.get(nickuser.replace(/[\\<>@#&!]/g, "")) : member
                if (user?.permissions.has(Permissions.administrador.flag))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR2}`)
                user?.setNickname(nickname).catch(async () => await channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.SET_NICK_ERROR}`))
            }

            if (arReply.font) {
                const font = replaceKey(arReply.font)
                const fontKey = font === 'random' ? getRandomFontKey() : (font in fontsData ? font as FontKey : undefined)
                if (fontKey) botresponse = applyUnicodeFont(botresponse, fontKey)
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
                    if (!sym || !cant || !user) return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_MODIFYBALL}`)
                    let newcant = sym === '+' ? (user.balance || 0) + cant : (user.balance || 0) - cant
                    if (newcant < 0) return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MODIFYBAL_ERROR}`)
                    await usermodel.updateOne({ userId: user.userId }, { balance: newcant })
                }
            }
            /*
            if (arReply.buttons && arReply.buttons?.length >= 1) {
                row = new ActionRowBuilder<ButtonBuilder>()
                let buttons = []
                for (let buttondata of arReply.buttons) {
                    let button = new ButtonBuilder()
                    if (buttondata.type != '5') button.setCustomId(buttondata.id)
                    button.setLabel(formatStr(varis, buttondata.label))
                        .setStyle(Number(buttondata.type))
                    if (buttondata.type == '5') button.setURL(formatStr(varis, buttondata.replyorlink))
                    buttons.push(button)
                }
                row.setComponents(buttons)
            }
            */
            if (arReply.waitresponse) {
                if (answer && canal && wtime) {
                    if (!this.client.channels.cache.get(canal) && canal !== 'current') {
                        return await channel.send(`${this.client.emotes.error} \`ERROR\`: El canal para la función \`waitresponse\` es inválido`)
                    }
                    if (isNaN(wtime)) return await channel.send(`${this.client.emotes.error} \`ERROR\`: El tiempo para la función \`waitresponse\` es inválido`)
                }
            }
            if (autoresponder.matchmode === 'exactmatch') {
                if (content.toLowerCase() === arTrigger.triggerkey.toLowerCase()) {
                    m = await enviarMensaje(arReply.replytype, wheretosend)
                    if (reactionemojis1 || reactionemojis2) await reactMessage(message, m, reactionemojis1, reactionemojis2)
                }
            } else {
                if (autoresponder.matchmode === 'startswith') {
                    if (content.toLowerCase().startsWith(arTrigger.triggerkey.toLowerCase())) {
                        m = await enviarMensaje(arReply.replytype, wheretosend)
                        if (reactionemojis1 || reactionemojis2) await reactMessage(message, m, reactionemojis1, reactionemojis2)
                    }
                }
                if (autoresponder.matchmode === 'endswith') {
                    if (content.toLowerCase().toLowerCase().endsWith(arTrigger.triggerkey.toLowerCase())) {
                        m = await enviarMensaje(arReply.replytype, wheretosend)
                        if (reactionemojis1 || reactionemojis2) await reactMessage(message, m, reactionemojis1, reactionemojis2)
                    }
                }
                if (autoresponder.matchmode === 'includes') {
                    if (content.toLowerCase().includes(arTrigger.triggerkey.toLowerCase())) {
                        m = await enviarMensaje(arReply.replytype, wheretosend)
                        if (reactionemojis1 || reactionemojis2) await reactMessage(message, m, reactionemojis1, reactionemojis2)
                    }
                }
            }
            if (m && arReply.waitresponse) {
                if (canal && answer && wtime) {
                    const filter: CollectorFilter<[Message]> = (m: Message) => m.content.toLowerCase() === answer?.toLowerCase()

                    if (answer && canal && !isNaN(wtime)) {
                        if (this.client.channels.cache.get(canal)) {
                            const chnl = this.client.channels.cache.get(canal) as DMChannel | TextChannel
                            const msgcollector = chnl?.createMessageCollector({ filter: filter, time: wtime })

                            msgcollector.on('collect', async (m: Message) => {
                                let ar: Autoresponder | undefined = undefined
                                try { ar = await this.createAutoresponder(m, arReply.waitresponse?.reply as string) } catch (e) { await channel.send(`${e}`) }
                                if (ar) await this.executeReply(ar.arReply, m as ExtendedMessage).catch(e => console.log(e))
                                msgcollector.stop()
                            })
                        } else if (canal === 'current') {
                            const msgcollector = channel.createMessageCollector({ filter: filter, time: Number(replaceArgs(arReply.waitresponse.time as string)) })

                            msgcollector.on('collect', async m => {
                                let ar: Autoresponder | undefined = undefined
                                try { ar = await this.createAutoresponder(m, arReply.waitresponse?.reply as string) } catch (e) { await channel.send(`${e}`) }
                                if (ar) await this.executeReply(ar.arReply, m as ExtendedMessage).catch(e => console.log(e))
                                msgcollector.stop()
                            })
                        }
                    }
                }
            }
            /*
            if (row && m) {
                const filter = (i: MessageComponentInteraction) => i.isButton() && i.user.id === message.author.id
                const btncollector = m.createMessageComponentCollector({ filter, time: 15000 })
     
                btncollector?.on('collect', async i => {
                    if (i.user.id !== message.author.id) {
                        await i.reply({ content: `${this.client.emotes.hmph} El autoresponder no está dirigido a ti`, ephemeral: true })
                    }
                    let btn = arReply.buttons?.find(b => b.id == i.customId)
                    if (btn?.type !== '5') {
                        if (btn?.replyorlink) {
                            console.log(btn.replyorlink)
                            await i.deferReply({ ephemeral: true })
                            let ar: Autoresponder | undefined = undefined
                            try { ar = await createAutoresponder(i as ExtendedInteraction, btn.replyorlink) } catch (e) { await i.editReply(`${e}`) }
                            if (ar) await executeReply(ar.arReply, i as ExtendedInteraction).catch(async (e) => await i.editReply(e))
                        }
                        //if (btn?.replyorlink) await i.reply({ content: this.replaceVars(btn?.replyorlink) }).catch(e => console.log(e))
                    }
                })
                btncollector?.on('end', async () => {
                    row?.components.forEach(c => c.setDisabled(true))
                    await m?.edit({ components: [row as ActionRowBuilder<ButtonBuilder>] }).catch(e => console.log(e))
                })
            }
            */
            if (m && arReply.autodelete?.value) {
                if (!guild.members.me?.permissions.has(Permissions.gestionarMensajes.flag))
                    return channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarMensajes.perm])}`)
                if (autodeletetime) { try { setTimeout(() => m?.delete(), autodeletetime) } catch (e) { console.log(e) } }
                else m.delete().catch(async () => await channel.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.DELETE_MESSAGE_ERROR}`))

            }
        }
    }

    public async executeReply(arReply: ArReplyType, message: ExtendedMessage | ExtendedInteraction) {
        const { channel, guild, member } = message
        if (!channel) return

        const sendChannel = this.isSendableChannel(channel) ? channel : undefined

        const replaceKey = (key: string) => {
            if (!this.varis) throw new Error('La instancia de funciones no tiene asignada variables')

            const numbers = key.match(/\d+/g)?.map(Number) || [];
            const firstIndex = numbers[0];
            if (/({\w+:?.*?(?:(?<=\{)\w*(?=\}).+?)*})/i.test(key)) {
                const varf = this.varis.find(varb => varb.name === key)
                if (varf) return varf.value as string
            }
            if (/\[range\]/i.test(key) || /\[range\d+\]/i.test(key)) {
                if (arReply.ranges && arReply.ranges?.length >= 1) {
                    let range = firstIndex ? arReply.ranges.find(r => r.ind == firstIndex) : arReply.ranges.find(r => !r.ind || r.ind == 0)
                    let rangemin = Number(replaceKey(range?.min as string) || range?.min)
                    let rangemax = Number(replaceKey(range?.max as string) || range?.max)
                    if (!isNaN(rangemin) && !isNaN(rangemax)) {
                        if (rangemin <= rangemax) {
                            let number = Math.floor((Math.random() * (rangemax - rangemin + 1)) + rangemin)
                            if (!isNaN(number)) return `${number}`
                            else return 'RANGO_INSUFICIENTE'
                        } else return 'RANGO_NO_CALCULADO'
                    }
                }
            }
            if (/\[choice\]/i.test(key) || /\[choice\d+\]/i.test(key)) {
                if (arReply.choices && arReply.choices?.length >= 1) {
                    let choice = firstIndex ? arReply.choices.find(c => c.ind == firstIndex) : arReply.choices.find(ch => !ch.ind || ch.ind == 0)
                    let choosed = choice?.options[Math.floor(Math.random() * choice?.options?.length)]
                    if (choosed) {
                        schoice = { ind: choice?.ind || 0, option: { ind: choosed?.ind, opt: choosed?.option } }
                        return this.replaceVars(schoice.option?.opt as string, variss)?.replace(/\\n/g, '\n').trim()
                    }
                }
            }
            if (/\[choicevalue\]/i.test(key) || /\[choicevalue\d+\]/i.test(key)) {
                if (arReply.choices && arReply.choices?.length >= 1 && arReply.choicevalues && arReply.choicevalues.length >= 1) {
                    let choicevalue = firstIndex ? arReply.choicevalues.find(c => c.ind == firstIndex) : arReply.choicevalues.find(c => !c.ind || c.ind == 0)
                    let choosedvalue = schoice?.option ? choicevalue?.options[schoice.option.ind]?.option : undefined
                    schoicevalue = { ind: choicevalue?.ind || 0, option: choosedvalue }
                    if (choicevalue && schoicevalue.option) return this.replaceVars(schoicevalue.option, variss)?.replace(/\\n/g, '\n').trim()
                }
            }
            if (/\[choices\d+\]/i.test(key) || /\[choices\]/i.test(key)) {
                if (arReply.choices && arReply.choices?.length >= 1) {
                    let choice = firstIndex ? arReply.choices.find(c => c.ind == firstIndex) : arReply.choices.find(ch => !ch.ind || ch.ind == 0)
                    if (choice) return this.replaceVars(choice.options.map(o => o.option).join('\n'), variss).trim()
                }
            }
            return key
        }

        const variss = variables(message).totalvars()
        let botresponse = this.replaceVars(arReply.rawreply, variss).replace(/\\n/g, '\n')
        let wheretosend = replaceKey(arReply.wheretosend)
        let schoice: { ind: number, option?: { ind: number, opt: string } }, schoicevalue: { ind: number, option?: string }
        let embed: EmbedBuilder | undefined = undefined
        let reactionemojis: string[] = []
        let autodeletetime = Number(replaceKey(arReply.autodelete?.time)) || Number(arReply.autodelete?.time)
        let row1: ActionRowBuilder<ButtonBuilder> | undefined = undefined
        let row2: ActionRowBuilder<StringSelectMenuBuilder> | undefined = undefined
        let responseMessage: Message | undefined = undefined

        if (arReply.embeddata) {
            const embedData = this.client.embeds.filter(em => em.guildId === message.guild?.id).find(em => em.name === arReply.embeddata)?.data
            if (embedData) embed = this.replaceEmbedFields(embedData)
        }
        if (arReply.embedcolor) {
            embed = new EmbedBuilder().setColor(arReply.embedcolor as ColorResolvable || this.client.color).setDescription(botresponse || '`descripción no válida`')
        }
        if (arReply.reactionemojis && arReply.reactionemojis.length) {
            reactionemojis = arReply.reactionemojis.map(function (r) { return replaceKey(r) })
        }
        if (arReply.addrole?.length) {
            if (!guild?.members.me?.permissions.has(Permissions.gestionarRoles.flag))
                return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarRoles?.perm])}`)
            for (let roledata of arReply.addrole) {
                let role = guild.roles.cache.get((replaceKey(roledata.role) as string).replace(/[\\<>@#&!]/g, "").trim())
                if (!role) return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_ROLE_ERROR}`)
                if (role.position > guild.members.me.roles.highest.position)
                    return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR}`)
                if (roledata.user) {
                    let $user = guild.members.cache.get((replaceKey(roledata.user) as string).replace(/[\\<>@#&!]/g, "").trim())
                    if ($user) {
                        if ($user.permissions.has(Permissions.administrador.flag))
                            return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                        if ($user.roles.cache.has(role.id))
                            return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: El miembro ya tiene asignado ese rol`)
                        $user.roles.add(role).catch(async () => await sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
                    }
                } else {
                    if (member.permissions.has(Permissions.administrador.flag))
                        return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                    if (member.roles.cache.has(role.id))
                        return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: El miembro ya tiene asignado ese rol`)
                    member.roles.add(role).catch(async () => await sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
                }
            }
        }
        if (arReply.removerole?.length) {
            if (!guild.members.me?.permissions.has(Permissions.gestionarRoles.flag))
                return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarRoles.perm])}`)
            for (let roledata of arReply.removerole) {
                let role = guild.roles.cache.get((replaceKey(roledata.role) as string).replace(/[\\<>@#&!]/g, "").trim())
                if (!role) return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_ROLE_ERROR}`)
                if (role.position > guild.members.me.roles.highest.position)
                    return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR}`)
                if (roledata.user) {
                    let $user = guild.members.cache.get((replaceKey(roledata.user) as string).replace(/[\\<>@#&!]/g, "").trim())
                    if ($user) {
                        if ($user.permissions.has(Permissions.administrador.flag))
                            return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                        $user.roles.remove(role).catch(async () => await sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
                    }
                } else {
                    if (member.permissions.has(Permissions.administrador.flag))
                        return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                    member.roles.remove(role).catch(async () => await sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
                }
            }
        }
        if (arReply.setnick?.nick) {
            const nickname = replaceKey(arReply.setnick.nick)
            const nickuser = arReply.setnick.user ? replaceKey(arReply.setnick.user) : undefined
            if (!guild.members.me?.permissions.has(Permissions.gestionarApodos.flag))
                return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarApodos.perm])}`)
            if (member.roles.highest.position > guild.members.me.roles.highest.position)
                return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR2}`)
            const user = nickuser ? guild.members.cache.get(nickuser.replace(/[\\<>@#&!]/g, "")) : member
            if (user?.permissions.has(Permissions.administrador.flag))
                return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR2}`)
            user?.setNickname(nickname).catch(async () => await sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.SET_NICK_ERROR}`))
        }

        if (arReply.font) {
            const font = replaceKey(arReply.font)
            const fontKey = font === 'random' ? getRandomFontKey() : (font in fontsData ? font as FontKey : undefined)
            if (fontKey) botresponse = applyUnicodeFont(botresponse, fontKey)
        }
        if (arReply.modifybal && arReply.modifybal.length >= 1) {
            for (let bal of arReply.modifybal) {
                if (!bal.user && !bal.cant) break
                let user: string | UserCurrency = (replaceKey(bal.user) as string).replace(/[\\<>@#&!]/g, "")
                if (user) {
                    user = await usermodel.findOne({ userId: user }).exec() as UserCurrency
                } else user = await usermodel.findOne({ userId: message instanceof Message ? message.author.id : message.user.id }).exec() as UserCurrency
                let sym = bal.cant.match(/(\+|\-)/)?.[0]
                let cant = Number(replaceKey(bal.cant.replace(/[\+\-]/, ""))) || 0
                if (!sym || !cant || !user) return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.INVALID_MODIFYBALL}`)
                let newcant = sym === '+' ? (user.balance || 0) + cant : (user.balance || 0) - cant
                if (newcant < 0) return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.MODIFYBAL_ERROR}`)
                await usermodel.updateOne({ userId: user.userId }, { balance: newcant })
            }
        }
        if (!(message instanceof ButtonInteraction && message instanceof MessageComponentInteraction) && arReply.buttons?.length) {

            let allbtns: ButtonBuilder[] = []

            for (let button of arReply.buttons) {
                const btn = await buttonModel.findOne({
                    guildId: guild.id,
                    customId: `arbtn_${button}`
                }).exec()
                if (btn) {
                    try {
                        const storedStyle = Number(btn.data.style)
                        const style = [
                            ButtonStyle.Primary,
                            ButtonStyle.Secondary,
                            ButtonStyle.Success,
                            ButtonStyle.Danger
                        ].includes(storedStyle) ? storedStyle : ButtonStyle.Primary
                        const buttonBuilder = new ButtonBuilder()
                            .setCustomId(btn.customId)
                            .setStyle(style)
                        if (btn.data.label) buttonBuilder.setLabel(btn.data.label)
                        if (btn.data.emoji) buttonBuilder.setEmoji(btn.data.emoji)
                        buttonBuilder.toJSON()
                        allbtns.push(buttonBuilder)
                    } catch (error) {
                        console.error(`[⚠️] El botón ${button} tiene datos inválidos y fue omitido:`, error)
                    }
                }
            }
            if (allbtns.length) row1 = new ActionRowBuilder<ButtonBuilder>().setComponents(allbtns)
        }

        if (!(message instanceof ButtonInteraction && message instanceof MessageComponentInteraction) && arReply.selectmenus?.length) {

            let allselms: StringSelectMenuBuilder[] = []

            for (let selm of arReply.selectmenus) {
                let slm = this.client.selectmenus.find(s => s.guildId === guild.id && s.customId === `arselm#${selm}`)
                if (slm) {
                    let select = new StringSelectMenuBuilder()
                        .setCustomId(slm.customId)
                        .setOptions((slm.data.options?.length ? slm.data.options : [{
                            label: 'Opción de ejemplo',
                            value: 'ejemplo',
                            description: 'Este menú aún no tiene opciones'
                        }]).map(option => ({
                            label: option.label,
                            value: option.value,
                            description: option.description,
                            emoji: option.emoji as any
                        })))
                    const optionCount = Math.max(slm.data.options?.length ?? 0, 1)
                    const maxValues = Math.min(slm.data.maxValues ?? 1, optionCount)
                    const minValues = Math.min(slm.data.minValues ?? 1, maxValues)
                    select.setMinValues(minValues).setMaxValues(maxValues)
                    if (slm.data.placeholder) select.setPlaceholder(slm.data.placeholder)
                    allselms.push(select)
                }
            }
            if (allselms.length) row2 = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(allselms)
        }
        if (botresponse || embed?.data || row1 || row2) {
            switch (wheretosend) {
                case "current_channel": {
                    if (arReply.replytype === "message") {
                        if (message instanceof MessageComponentInteraction) responseMessage = await message.editReply({ content: botresponse, components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) }) as Message
                        else responseMessage = await sendChannel?.send({ content: botresponse, components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                    } else if (arReply.replytype === "embed") {
                        if (embed?.data) {
                            if (message instanceof MessageComponentInteraction) responseMessage = await message.editReply({ embeds: [embed], components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) }) as Message
                            else responseMessage = await sendChannel?.send({ embeds: [embed], components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                        } else {
                            if (message instanceof MessageComponentInteraction) responseMessage = await message.editReply({ embeds: [new EmbedBuilder().setColor(this.client.color).setDescription(botresponse)], components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) }) as Message
                            else responseMessage = await sendChannel?.send({ embeds: [new EmbedBuilder().setColor(this.client.color).setDescription(botresponse)], components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                        }
                    }
                    break
                }
                case "user_dm": {
                    if (arReply.replytype === "message") {
                        if (message instanceof Message) responseMessage = await message.author.send({ content: `Autoresponder de **${guild.name}**\n\n${botresponse}`, components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                        else responseMessage = await message.user.send({ content: `Autoresponder de **${guild.name}**\n\n${botresponse}`, components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                    } else if (arReply.replytype === "embed") {
                        if (embed?.data) {
                            if (message instanceof Message) responseMessage = await message.author.send({ content: `Autoresponder de **${guild.name}**\n\n`, embeds: [embed], components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                            else responseMessage = await member.user.send({ content: `Autoresponder de **${guild.name}**\n\n`, embeds: [embed], components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                        } else {
                            if (message instanceof MessageComponentInteraction) responseMessage = await message.editReply({ embeds: [new EmbedBuilder().setColor(this.client.color).setDescription(botresponse)], components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) }) as Message
                            else responseMessage = await sendChannel?.send({ embeds: [new EmbedBuilder().setColor(this.client.color).setDescription(botresponse)], components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                        }
                    }
                    break
                }
                default: {
                    const chnl = this.client.channels.cache.get(wheretosend) as TextChannel | DMChannel
                    if (chnl) {
                        if (arReply.replytype === "message") {
                            responseMessage = await chnl.send({ content: botresponse, components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                        } else if (arReply.replytype === "embed") {
                            if (embed?.data) responseMessage = await chnl.send({ embeds: [embed], components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                            else responseMessage = await sendChannel?.send({ embeds: [new EmbedBuilder().setColor(this.client.color).setDescription(botresponse)], components: ([] as any[]).concat(row1, row2).filter(row => row !== undefined) })
                        }
                    }
                    break
                }
            }
            if (responseMessage && reactionemojis.length) {
                for (let reaction of reactionemojis) {
                    await responseMessage.react(reaction).catch(async () => await sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.REACTION_ERROR}`))
                }
            }
            if (arReply.autodelete?.value) {
                if (!guild.members.me?.permissions.has(Permissions.gestionarMensajes.flag))
                    return sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions.gestionarMensajes.perm])}`)
                if (autodeletetime) {
                    try {
                        setTimeout(() => {
                            if (message instanceof Message) message.delete()
                            else if (message.isMessageComponent()) message.deleteReply()
                        }, autodeletetime)
                    } catch (e) { console.log(e) }
                }
                else {
                    if (message instanceof Message) message.delete().catch(async () => await sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.DELETE_MESSAGE_ERROR}`))
                    else if (message.isMessageComponent()) message.deleteReply().catch(async () => await sendChannel?.send(`${this.client.emotes.error} \`ERROR\`: ${ErrorCodes.DELETE_MESSAGE_ERROR}`))
                }
            }
        }
    }

    public async sendGemaError(error: unknown, context: ErrorContext = {}) {
        await reportError(this.client, error, context)
    }
}
