import { Client } from 'discord.js';
import { connect, set } from 'mongoose';
import { Event } from '../typing/Event';

export default new Event(
  { name: 'ready', once: true },
  async (client: Client) => {
    console.log(`${client.user?.username} is online!`);
    client.user?.setActivity(`/help | @${client.user.username}`)

    connect(process.env.mongourl).then(async () => {
      set('strictQuery', false)
      console.log(`☁ Conectado a la base de datos de MongoDB`)
    }).catch((err) => {
      console.log(`☁ Error al conectarse a la base de datos`);
      console.log(err)
    })
  }
);
