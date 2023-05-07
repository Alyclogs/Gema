const serverconfig = require('../../utility/models/serverconfig-model.js')
const armodel = require('../../utility/models/autoresponder-model.js')
const embedmodel = require('../../utility/models/embed-model.js')
const chatmodel = require('../../utility/models/chatbot-model.js')

module.exports = {
    name: 'guildCreate',

    async execute(guild, client) {
        let data = { guildId: guild.id }
        if (await serverconfig.findOne(data).exec()) await serverconfig.deleteOne(data)
        if (await armodel.findOne(data).exec()) await armodel.deleteMany(data)
        if (await embedmodel.findOne(data).exec()) await embedmodel.deleteMany(data)
        if (await chatmodel.findOne(data).exec()) await chatmodel.deleteOne(data)
    }
}