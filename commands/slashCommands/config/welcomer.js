const { SlashCommandBuilder, ChatInputCommandInteraction, Client } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');
const serverconfig = require('../../../utility/models/serverconfig-model')
const embedModel = require('../../../utility/models/embed-model')
const { serverConfigStructure } = require('../../../utility/structures/serverConfigStructure');
const { ErrorCodes } = require('../../../utility/data/Errors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcomer')
        .setDescription('Configura el sistema de bienvenida para el servidor')
        .addSubcommand(subcommand =>
            subcommand.setName('set').setDescription('Configura el canal de bienvenida')
                .addChannelOption(option => option.setName('channel').setDescription('El canal para la bienvenida').setRequired(true))
                .addStringOption(option => option.setName('message').setDescription('El mensaje para la bienvenida').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('delete').setDescription('Elimina la configuración de bienvenida'))
        .addSubcommand(subcommand =>
            subcommand.setName('test').setDescription('Prueba el mensaje de bienvenida')),
    timeout: 0,
    memberperms: [Permissions2.gestionarServidor],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces, Permissions2.gestionarServidor],

    /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
    async execute(interaction, client, color, emojis) {
        await interaction.deferReply()
        client.embeds = await embedModel.find({}).exec()

        const subcommand = interaction.options.getSubcommand()
        const { replaceVars, replaceEmbedFields } = require('../../../utility/functions/utils')(client, interaction)

        const data = { guildId: interaction.guild.id }
        let newdata = serverConfigStructure.welcomerSettings

        if (subcommand === 'set') {
            let chnl = interaction.options.getChannel('channel')
            let msg = interaction.options.getString('message').trim()
            const vars = msg?.match(/\{(.+?)\}/g)

            if (vars) {
                if (vars.find(v => v.includes('embed'))) {
                    let embeddata = msg.match(/(?<=\{embed:).+?(?=\})/)
                    let data = embeddata[0].trim()
                    const dataf = client.embeds.find(em => em.name.toLowerCase() === data.toLowerCase())
                    if (!/^#([0-9a-f]{6})/i.test(data) && !dataf) {
                        return interaction.editReply(`${emojis.confused} ${ErrorCodes.INVALID_EMBED_DATA_ERROR}`)
                    } else {
                        if (dataf) newdata.embed.name = data.toLowerCase()
                        else newdata.embed.color = data
                    }
                }
            }
            newdata.channel = chnl.id
            newdata.message = msg

            await serverconfig.updateOne(data, { welcomerSettings: newdata })
            return await interaction.editReply({
                content: `${emojis.check} Se ha configurado el sistema de bienvenida. Para probar cómo se verá el mensaje utiliza </welcomer test:>`,
                allowedMentions: { repliedUser: false }
            })
        }
        if (subcommand === 'delete') {
            await serverconfig.updateOne(data, { welcomerSettings: newdata })
            return await interaction.editReply({
                content: `${emojis.check} Se ha eliminado el sistema de bienvenida`,
                allowedMentions: { repliedUser: false }
            })
        }
        if (subcommand === 'test') {
            let serverData = await serverconfig.findOne(data).exec()    
            let welcomerData = serverData?.welcomerSettings

            if (!welcomerData || !welcomerData?.channel) {
                return interaction.editReply({
                    content: `${emojis.confused} No existe una configuración de bienvenida para este servidor`,
                    allowedMentions: { repliedUser: false }
                })
            } else {
                let previewEmbed
                if (welcomerData.embed) {
                    let embedData = client.embeds.filter(em => em.guildId === interaction.guild.id).find(em => em.name.toLowerCase() === welcomerData.embed.name?.toLowerCase())?.data
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
                return await interaction.editReply({
                    content: `${emojis.check} Mensaje de bienvenida enviado. Si en caso no se puede visualizar revise los permisos del canal`,
                    allowedMentions: { repliedUser: false }
                })
            }
        }
    }
}