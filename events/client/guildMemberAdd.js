const { GuildMember, Client } = require('discord.js')
const serverconfig = require('../../utility/models/serverconfig-model.js')
const embedModel = require('../../utility/models/embed-model.js')

module.exports = {
    name: 'guildMemberAdd',

    /**
     * 
     * @param {GuildMember} member 
     * @param {Client} client 
     */
    async execute(member, client) {
        const { replaceEmbedFields, replaceVars } = require('../../utility/functions/utils.js')(client, member)
        let serverData = await serverconfig.findOne({ guildId: member.guild.id }).exec()
        client.embeds = await embedModel.find({}).exec()
        let welcomerData = serverData?.welcomerSettings

        if (welcomerData) {
            if (!welcomerData.channel) return

            client.embeds = await embedModel.find({}).exec()
            const guildembs = client.embeds.filter(em => em.guildId === member.guild.id)
            let previewEmbed

            if (welcomerData.embed) {
                const embedData = guildembs.find(em => em.name.toLowerCase() === welcomerData.embed.name?.toLowerCase())?.data
                previewEmbed = embedData ? replaceEmbedFields(embedData) : undefined
            }
            if (welcomerData.message) {
                let message = replaceVars(welcomerData.message)

                if (previewEmbed) {
                    client.channels.fetch(welcomerData.channel).then(chnl => chnl.send({
                        content: message,
                        embeds: [previewEmbed]
                    })).catch(e => { })
                } else {
                    client.channels.fetch(welcomerData.channel).then(chnl => chnl.send({
                        content: message
                    })).catch(e => { })
                }
            } else if (previewEmbed) {
                client.channels.fetch(welcomerData.channel).then(chnl => chnl.send({
                    embeds: [previewEmbed]
                })).catch(e => { })
            }
        }
    }
}