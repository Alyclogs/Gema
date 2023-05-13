import { PermissionResolvable } from 'discord.js';
import mongoose from 'mongoose';

class Autoresponder {
    guildId: string = ''
    arTrigger: ArTriggerType = {
        triggerkey: '',
        autodelete: false
    }
    arReply: ArReplyType = {
        replytype: ArResponseMessageType.message,
        replymessage: '',
        rawreply: '',
        wheretosend: ArSendingType.current_channel,
        autodelete: {
            time: 0,
            value: false
        }
    }
    matchmode: ArMatchMode | "exactmatch" = ArMatchMode.exacto
    cooldown?: number

    setTrigger(trigger: string) {
        this.arTrigger.triggerkey = trigger
        return this
    }
}

interface ArTriggerType {
    triggerkey: string
    autodelete: boolean
    reactionemojis?: string[]
}

interface ArReplyType {
    replytype: ArResponseMessageType | "message" | "embed"
    replymessage?: string
    rawreply: string
    wheretosend: ArSendingType | string
    embedcolor?: string
    embeddata?: string
    font?: string
    choices?: ArChoiceType[]
    choicevalues?: ArChoiceType[]
    replypreview?: string
    requireuserid?: string[]
    requiredchannel?: string[]
    denychannel?: string[]
    requiredperm?: string[]
    requiredrole?: string[]
    denyrole?: string[]
    addrole?: ArAddRemoveRoleType[]
    removerole?: ArAddRemoveRoleType[]
    reactionemojis?: string[]
    ranges?: ArRangeType[]
    argsrequired?: ArArgsType[]
    setnick?: ArSetNickOptions
    autodelete: ArAutodeleteOptions
    waitresponse?: ArWaitResponseOptions
    buttons?: ArButtonType[]
    modifybal?: ArModifyBalType[]
}

enum ArResponseMessageType {
    message = "message",
    embed = "embed"
}

enum ArSendingType {
    current_channel = "current_channel",
    user_dm = "user_dm"
}

type ArChoiceType = {
    ind: number,
    options: ArChoiceOptionsType[]
}

type ArChoiceOptionsType = {
    ind: number,
    option: string
}

type ArAddRemoveRoleType = {
    role: string,
    user: string
}

type ArRangeType = {
    ind: number,
    min: number | string,
    max: number | string
}

export type ArArgsType = {
    num: number,
    type?: ArgType | string
}

enum ArgType {
    channel = "channel",
    number = "number",
    color = "color",
    user = "user",
    role = "role"
}

type ArSetNickOptions = {
    nick: string
    user?: string
}

type ArAutodeleteOptions = {
    time: number | string
    value: boolean
}

type ArWaitResponseOptions = {
    time: number | string,
    channel: string,
    answer: string,
    reply: string
}

type ArButtonType = {
    id: string,
    type: string,
    label: string,
    replyorlink: string
}

type ArModifyBalType = {
    user: string,
    cant: string
}

enum ArMatchMode {
    exacto = "exactmatch",
    al_comienzo = "startswith",
    al_final = "endswith",
    incluye = "includes"
}

const autoresponder = new mongoose.Schema({
    guildId: { type: String, required: true },
    arTrigger: {
        type: Object, required: true, default: {
            triggerkey: String, autodelete: Boolean, reactionemojis: [String]
        }
    },
    arReply: {
        type: Object, required: true, default: {
            replytype: { type: String, enum: ['message', 'embed'] }, replymessage: { type: String, required: true },
            wheretosend: { type: String, required: true }, embedcolor: String, choices: Array, choicevalues: Array,
            embeddata: String, replypreview: { type: String, required: true }, requireuserid: [String],
            requiredchannel: [String], denychannel: [String], requiredperm: [String], requiredrole: [String],
            denyrole: [String], addrole: Array, removerole: Array, reactionemojis: [String], ranges: Array,
            argsrequired: { type: Object, default: { num: Number, type: Object } },
            setnick: { type: Object, default: { nick: String, user: String } }, font: String,
            awaitanswers: { type: Object, default: { time: Number, answer: String, reply: String } }, buttons: Array,
            modifybal: {}, autodelete: { type: Object, default: { value: Boolean, time: { type: Number, max: 100 } } }
        }
    },
    matchmode: { type: String, enum: ['exactmatch', 'startswith', 'endswith', 'includes'] },
    cooldown: { type: Number, max: 100 }
})

const model = mongoose.model<Autoresponder>('autoresponders', autoresponder)

export default model
export { Autoresponder, ArTriggerType, ArReplyType }