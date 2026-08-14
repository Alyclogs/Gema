import { GuildMember } from 'discord.js'
import { Event } from '../typing/Event'
import Bot from '../structures/Bot'
import { ensureUser } from '../models/user'
import { model as ServerConfig } from '../models/serverconfig-model'
import { variables } from '../lib/Variables'
import { buildWelcomeMessage } from '../helpers/moderation/welcomer'

export default new Event({
  name: 'guildMemberAdd',
  once: false
},
  async (client: Bot, member: GuildMember) => {
    try {
      if (!member.user.bot) await ensureUser(member.id)

      const svSettings = await ServerConfig.findOne({ guildId: member.guild.id }).exec()
      if (!svSettings) {
        const newSettings = new ServerConfig({ guildId: member.guild.id, prefix: client.config.prefix })
        await newSettings.save()
        return
      }

      const channelId = svSettings.welcomerSettings?.channel
      if (!channelId) return

      const channel = member.guild.channels.cache.get(channelId)
      if (!channel || !('send' in channel) || typeof channel.send !== 'function') return

      const vars = variables(member).totalvars();
      const welcomeContent = await buildWelcomeMessage(client, svSettings, vars);
      if (!welcomeContent) return;

      await channel.send(welcomeContent);

    } catch (error) {
      await client.functions.sendGemaError(error, {
        origen: 'registro de usuario al unirse',
        servidor: member.guild.id,
        usuario: member.id
      })
    }
  }
)
