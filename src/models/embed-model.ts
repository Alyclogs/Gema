import { ColorResolvable } from 'discord.js'
import mongoose from 'mongoose'
import { bot } from '..'

export class EmbedModel {
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

const embeds = new mongoose.Schema<EmbedModel>({
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

export const model = mongoose.model<EmbedModel>('embeds', embeds)