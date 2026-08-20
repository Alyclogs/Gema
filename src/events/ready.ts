import { Client } from 'discord.js';
import { connect, set } from 'mongoose';
import { Event } from '../typing/Event';

export default new Event(
  { name: 'ready', once: true },
  async (client: Client) => {
    console.log(`${client.user?.username} is online!`);
    client.user?.setActivity(`/help | @${client.user.username}`)

    try {
      set('strictQuery', false)
      await connect(process.env.mongourl || '', {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 20000
      })
      console.log(`☁ Conectado a la base de datos de MongoDB`)
    } catch (err) {
      console.log(`☁ Error al conectarse a la base de datos`);
      console.log(err)
    }

    // El intent GuildMembers solo permite recibir eventos de miembros; no precarga el caché.
    // Sin esto, guild.members.cache queda casi vacío y variables como {server_membercount_nobots}
    // o {server_botcount} devuelven casi siempre 0/1 en vez del conteo real.
    const guilds = client.guilds.cache
    await Promise.all(guilds.map((guild) =>
      guild.members.fetch().catch((err) =>
        console.log(`No se pudieron precargar los miembros de ${guild.name} (${guild.id}):`, err)
      )
    ))
    console.log(`👥 Miembros precargados para ${guilds.size} servidor(es)`)
  }
);
