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
  }
);
