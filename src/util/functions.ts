import { ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, Message } from "discord.js";
import { matches, variables } from '../botdata/Variables';
import Bot from "../structures/Bot";
import { EmbedDataType } from "../models/embed-model";
import ExtendedInteraction from "../typing/ExtendedInteraction";
import { Autoresponder } from "../models/autoresponder-model";
import { ErrorCodes } from "../botdata/Errors";
import { Permissions2 } from "./Permissions";

export default (client: Bot, input: Message | ChatInputCommandInteraction) => {
    let varis = variables(input).totalvars()

    return {
        replaceEmbedFields: function (embedData: EmbedDataType) {
            let previewEmbed = new EmbedBuilder()

            if (embedData.author?.name || embedData.author?.icon_url) {
                let icon = embedData.author.icon_url.startsWith('https://') ? embedData.author.icon_url
                    : replaceVars(embedData.author.icon_url).startsWith('https://') ? replaceVars(embedData.author.icon_url) : undefined;
                previewEmbed.setAuthor({ name: replaceVars(embedData.author.name) || '', iconURL: icon })
            }
            if (embedData.title) previewEmbed.data.title = replaceVars(embedData.title) || '';
            if (embedData.description) {
                previewEmbed.data.description = replaceVars(embedData.description).replace(/\\n/g, '\n')
            }
            if (embedData.thumbnail) {
                if (embedData.thumbnail.startsWith('https://')) previewEmbed.setThumbnail(embedData.thumbnail)
                if (replaceVars(embedData.thumbnail).startsWith('https://')) previewEmbed.setThumbnail(replaceVars(embedData.thumbnail))
            }
            if (embedData.image) {
                if (embedData.image.startsWith('https://')) previewEmbed.setImage(embedData.image);
                if (replaceVars(embedData.image).startsWith('https://')) previewEmbed.setImage(replaceVars(embedData.image));
            }
            if (embedData.footer?.text || embedData.footer?.icon_url) {
                let icon = embedData.footer.icon_url.startsWith('https://') ? embedData.footer.icon_url
                    : replaceVars(embedData.footer.icon_url).startsWith('https://') ? replaceVars(embedData.footer.icon_url) : undefined;
                previewEmbed.setFooter({ text: replaceVars(embedData.footer.text) || '', iconURL: icon })
            }
            if (embedData.timestamp) previewEmbed.setTimestamp()

            if (!embedData.color) previewEmbed.setColor(client.color)
            if (replaceVars(embedData.color as string)) previewEmbed.setColor(replaceVars(embedData.color as string) as ColorResolvable || client.color)

            return previewEmbed
        },
        replaceVars: function (str: string) {
            return replaceVars(str)
        },
        createAutoresponder
    }

    function testArg(arg: string) {
        return (/\[\$\d +\] | \[\$\d +\-\d +\] | \[\$\d +\+\] | \{(.+)\} | \[range\] | \[range\d +\] | \[choice\] | \[choice\d +\] /).test(arg)
    }

    function replaceVars(str: string) {
        if (str) {
            const vars = str.match(/({\w+:?.*?(?:(?<=\{)\w*(?=\}).+?)*})/gi)
            if (vars) {
                let replaced = str
                for (let v of vars) {
                    const varf = varis.find(varb => varb.name === v)
                    if (varf) replaced = replaced.replace(v, varf.value)
                    else replaced = replaced.replace(v, '')
                }
                return replaced
            }
        }
        return str
    }

    async function createAutoresponder(input: ChatInputCommandInteraction | Message, ar: Autoresponder, reply: string) {

        const arTrigger = ar.arTrigger
        const arReply = ar.arReply
        arReply.replymessage = reply
        arReply.rawreply = reply
        let cooldown = ar.cooldown
        arReply.replytype = "message"

        const vars = reply.match(/({\w+:?.*?(?:(?<=\{)\w*(?=\}).+?)*})/gi)

        if (vars) {
            if (reply?.match(matches.requireuser)) {
                arReply.requireuserid = []
                const usersrequired = reply?.match(matches.requireuser)
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
            if (reply?.match(matches.sendto)) {
                const wheretosend = reply?.match(matches.sendto)
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
            if (reply?.match(matches.requirechannel)) {
                arReply.requiredchannel = []
                const channelid = reply?.match(matches.requirechannel)
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
            if (reply?.match(matches.denychannel)) {
                arReply.denychannel = []
                const channelid = reply?.match(matches.denychannel)
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
            if (reply?.match(matches.requirerole)) {
                arReply.requiredrole = []
                const roleid = reply?.match(matches.requirerole)
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
            if (reply?.match(matches.denyrole)) {
                arReply.denyrole = []
                const roleid = reply?.match(matches.denyrole)
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
            if (reply?.includes('{embed}') || reply?.match(matches.embed)) {
                arReply.replytype = 'embed'
                arReply.embedcolor = ''
                const embeddatas = reply?.match(matches.embed)
                if (embeddatas) {
                    for (let data of embeddatas) {
                        data = data.trim()
                        const dataf = client.embeds.find(em => em.name === data)
                        if (!/^#([0-9a-f]{6})/i.test(data) && !testArg(data) && !dataf) {
                            throw new Error(ErrorCodes.INVALID_EMBED_DATA_ERROR)
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
                        if (!input.guild?.roles.cache.get(role) && !testArg(role)) {
                            throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
                        }
                        let user = roleuser[1]?.replace(/[\\<>@#&!]/g, "")?.trim() || ''
                        if (!input.guild?.members.cache.get(user) && !testArg(user)) {
                            throw new Error(ErrorCodes.INVALID_ROLEUSER_ERROR)
                        }
                        arReply.addrole.push({ role: role, user: user })
                    }
                } else throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
            }
            if (reply?.match(matches.removerole)) {
                arReply.removerole = []
                const roles = reply?.match(matches.removerole)
                if (roles) {
                    for (let roledata of roles) {
                        let roleuser = roledata.trim().split('|')
                        let role = roleuser[0]?.replace(/[\\<>@#&!]/g, "")?.trim()
                        if (!input.guild?.roles.cache.get(role) && !testArg(role)) {
                            throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
                        }
                        let user = roleuser[1]?.replace(/[\\<>@#&!]/g, "")?.trim() || ''
                        if (!input.guild?.members.cache.get(user) && !testArg(user)) {
                            throw new Error(ErrorCodes.INVALID_ROLEUSER_ERROR)
                        }
                        arReply.removerole.push({ role: role, user: user })
                    }
                } else throw new Error(ErrorCodes.INVALID_ROLE_ERROR)
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
                } else throw new Error(ErrorCodes.REACTION_ERROR)
            }
            if (reply?.match(matches.reactreply)) {
                arReply.reactionemojis = []
                const remojis = reply?.match(matches.reactreply)
                if (remojis) {
                    for (let e of remojis) {
                        arReply.reactionemojis.push(e)
                    }
                } else throw new Error(ErrorCodes.REACTION_ERROR)
            }
            if (reply?.match(matches.deletereply)) {
                arReply.autodelete.value = true
                const time = Number(reply?.match(matches.deletereply)?.shift())
                if (time) {
                    if (/\d+/.test(`${time}`)) {
                        arReply.autodelete.time = time * 1000
                    } else {
                        throw new Error(ErrorCodes.INVALID_TIME_FORMAT)
                    }
                } else throw new Error(ErrorCodes.INVALID_TIME_FORMAT)
            }
            if (reply?.match(matches.requireperm)) {
                arReply.requiredperm = []
                const perms = reply?.match(matches.requireperm)
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
            if (reply?.match(matches.range)) {
                arReply.ranges = []
                const ranges = reply?.match(matches.range)
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
            if (reply?.match(matches.choose)) {
                arReply.choices = []
                const choices = reply?.match(matches.choose)
                if (choices) {
                    for (let choice of choices) {
                        const choicedata = choice.trim().split(':')
                        const ind = Number(choicedata[0]) || 0
                        if (ind && ind < 1) {
                            throw new Error(ErrorCodes.INVALID_CHOICES)
                        }
                        const choicesArr = ind ? choicedata[1].trim().split('|')?.map((c, i) => ({ ind: i, option: c.trim() }))
                            : choicedata[0].trim().split('|')?.map((c, i) => ({ ind: i, option: c.trim() }))
                        if (choicesArr && choicesArr.length >= 2) {
                            arReply.choices.push({ ind: ind, options: choicesArr })
                        } else {
                            throw new Error(ErrorCodes.INVALID_CHOICES)
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_CHOICES)
            }
            if (reply?.match(matches.setnick)) {
                const nick = reply?.match(matches.setnick)
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
            if (reply?.match(matches.requirearg)) {
                arReply.argsrequired = []
                const args = reply?.match(matches.requirearg)
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
            if (reply?.match(matches.choosevalues)) {
                arReply.choicevalues = []
                const values = reply?.match(matches.choosevalues)
                if (values) {
                    for (let value of values) {
                        const valuedata = value.trim().split(':')
                        const ind = Number(valuedata[0]) || 0
                        if (ind && ind < 1) {
                            throw new Error(ErrorCodes.INVALID_CHOICEVALUES)
                        }
                        const options = ind ? valuedata[1].trim().split('|')?.map((c, i) => ({ ind: i, option: c.trim() }))
                            : valuedata[0].trim().split('|')?.map((c, i) => ({ ind: i, option: c.trim() }))
                        if (options && options.length >= 2) {
                            arReply.choicevalues.push({ ind: ind, options: options })
                        } else {
                            throw new Error(ErrorCodes.INVALID_CHOICEVALUES)
                        }
                    }
                } else throw new Error(ErrorCodes.INVALID_CHOICEVALUES)
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
                    } else throw new Error(ErrorCodes.INVALID_WAITRESPONSE)
                } else throw new Error(ErrorCodes.INVALID_WAITRESPONSE)
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
                                throw new Error(ErrorCodes.INVALID_BUTTONDATA_ERROR)
                            }
                        }
                        cont++
                    }
                } else throw new Error(ErrorCodes.INVALID_BUTTON_ERROR)
            }
            if (reply?.match(matches.modifybal)) {
                arReply.modifybal = []
                const balances = reply.match(matches.modifybal)
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
            if (reply?.match(matches.cooldown)) {
                const time = Number(reply?.match(matches.cooldown)?.[0])
                if (isNaN(time)) throw new Error(ErrorCodes.INVALID_COOLDOWN)
                else cooldown = time
            }
        }
        return ar
    }
}