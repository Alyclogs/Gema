import { Guild } from 'discord.js'
import { Event } from '../typing/Event'
import Bot from '../structures/Bot'
import { ensureServerConfig } from '../models/serverconfig-model'

export default new Event(
  { name: 'guildCreate', once: false },
  async (client: Bot, guild: Guild) => {
    try {
      await guild.members.fetch()
    } catch (error) {
      await client.functions.sendGemaError(error as Error, {
        origen: 'precarga de miembros al unirse a un nuevo servidor',
        servidor: guild.id
      })
    }

    try {
      await ensureServerConfig(guild.id, client.config.prefix)
    } catch (error) {
      await client.functions.sendGemaError(error as Error, {
        origen: 'creación de la configuración inicial del servidor',
        servidor: guild.id
      })
    }
  }
)
