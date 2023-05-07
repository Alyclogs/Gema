const mongodb = process.env.mongourl
const mongoose = require('mongoose')

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    client.user.setActivity(`/help | @${client.user.username}`)
    console.log(`${client.user.tag} is online!`)

    mongoose.connect(mongodb, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then(async () => {
      mongoose.set('strictQuery', false)
      console.log(`☁ Conectado a la base de datos de MongoDB`)
    }).catch((err) => {
      console.log(`☁ Error al conectarse a la base de datos`);
      console.log(err)
    })
  }
}