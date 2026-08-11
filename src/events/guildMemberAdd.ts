import { GuildMember } from 'discord.js'
import { Event } from '../typing/Event'
import Bot from '../structures/Bot'
import { ensureUser } from '../models/user'

export default new Event({
  name: 'guildMemberAdd',
  once: false
},
  async (client: Bot, member: GuildMember) => {
    if (member.user.bot) return

    try {
      await ensureUser(member.id)
    } catch (error) {
      await client.functions.sendGemaError(error, {
        origen: 'registro de usuario al unirse',
        servidor: member.guild.id,
        usuario: member.id
      })
    }
  }
)
