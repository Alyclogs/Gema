import mongoose, { mongo } from 'mongoose';
import { bot } from '..'
import { ButtonBuilder, ColorResolvable, ComponentType, Message, SelectMenuComponentOptionData, StringSelectMenuComponentData } from 'discord.js'
import { ButtonRunOptions } from '../typing/Command'

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
            time: '0',
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

class GEmbed {
    guildId: string = ''
    name: string = ''
    data?: EmbedDataType = {
        author: {
            name: '',
            icon_url: ''
        },
        title: '',
        description: '',
        color: bot.color,
        thumbnail: '',
        image: '',
        footer: {
            text: '',
            icon_url: ''
        },
        timestamp: false
    }
}

class GButton {
    private contador: number = 1
    constructor() {
        this.contador++;
    }
    guildId: string = ''
    customId: string = 'GButton' + this.contador
    name: string = ''
    data: ButtonData = {
        style: 1,
        label: 'NewButton'
    }
    ephemeral?: boolean
    reply?: ArReplyType
    run?: ((options: ButtonRunOptions) => any) | Message

    setData(guildId: string, data: { customId: string, style: number, label: string, name?: string, emoji?: string }): this {
        this.guildId = guildId
        this.customId = data.customId || 'GButton' + (this.contador + 1)
        this.data.style = data.style || 1
        this.data.label = data.label || "NewButton"
        this.name = data.name || this.customId
        if (data.emoji) this.data.emoji = data.emoji

        return this
    }
}

class GSelectMenu {
    guildId: string = ''
    customId: string = ''
    name: string = ''
    data: GStringSelectMenuData = {
        customId: this.customId,
        type: ComponentType.StringSelect
    }
    ephemeral?: boolean
    reply?: ArReplyType
    run?: ((options: ButtonRunOptions) => any) | Message
}

class GMessage {
    guildId: string = ''
    name: string = ''
    reply?: ArReplyType
}

type ButtonData = {
    style: number,
    label: string,
    emoji?: string
}

export interface EmbedDataType {
    author: EmbedAuthorType
    title: string
    description: string
    color: ColorResolvable
    thumbnail: string
    image: string
    footer: EmbedFooterType
    timestamp: boolean
}

type EmbedAuthorType = {
    name: string,
    icon_url: string
}

type EmbedFooterType = {
    text: string,
    icon_url: string
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
    buttons?: string[]
    selectmenus?: string[]
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
    user?: string
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
    time: string
    value: boolean
}

type ArWaitResponseOptions = {
    time: string,
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

type GStringSelectMenuData =
    Omit<StringSelectMenuComponentData, "options"> &
    {
        options?: (SelectMenuComponentOptionData & {
            reply?: ArReplyType,
            run?: ((options: ButtonRunOptions) => any) | Message
        })[]
    };

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

const embeds = new mongoose.Schema<GEmbed>({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    data: {
        type: Object, default: {
            author: { type: Object, default: { name: String, icon_url: String } },
            title: String,
            description: String,
            color: String,
            thumbnail: String,
            image: String,
            footer: { type: Object, default: { text: String, icon_url: String } },
            timestamp: Boolean
        }
    }
})

const buttons = new mongoose.Schema<GButton>({
    guildId: { type: String, required: true },
    customId: { type: String, required: true },
    name: { type: String, required: true },
    data: {
        style: Number,
        label: String,
        emoji: String
    },
    ephemeral: Boolean,
    reply: {}
})

const messagemodel = new mongoose.Schema<GMessage>({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    reply: Object
})

const selectmenus = new mongoose.Schema<GSelectMenu>({
    guildId: { type: String, required: true },
    customId: { type: String, required: true },
    name: { type: String, required: true },
    data: {},
    ephemeral: Boolean
})

const messageModel = mongoose.model<GMessage>('messages', messagemodel)
const buttonModel = mongoose.model<GButton>('buttons', buttons)
const selectmenuModel = mongoose.model<GSelectMenu>('selectmenus', selectmenus)
const embedModel = mongoose.model<GEmbed>('embeds', embeds)
const autoresponderModel = mongoose.model<Autoresponder>('autoresponders', autoresponder)

export { Autoresponder, ArReplyType, ArTriggerType, GButton, GMessage, GEmbed, GSelectMenu, buttonModel, messageModel, embedModel, autoresponderModel, selectmenuModel }