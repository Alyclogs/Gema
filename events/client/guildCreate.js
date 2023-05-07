const serverconfig = require('../../utility/models/serverconfig-model.js')
const { serverConfigStructure } = require('../../utility/structures/serverConfigStructure.js')

module.exports = {
    name: 'guildCreate',

    async execute(guild, client) {
        let serverData = await serverconfig.findOne({ guildId: guild.id }).exec()

        if (!serverData) {
            serverconfig.create({
                guildId: guild.id,
                welcomerSettings: serverConfigStructure.welcomerSettings,
                farewellSettings: serverConfigStructure.farewellSettings,
                boostSettings: serverConfigStructure.boostSettings
            })
        }
    }
}