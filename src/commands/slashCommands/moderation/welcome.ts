import { ChannelType, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../../structures/Command";
import { Permissions } from "../../../lib/Permissions";
import { model as ServerConfig } from "../../../models/serverconfig-model";
import { buildWelcomeMessage } from "../../../helpers/moderation/welcomer";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configura o muestra el mensaje de bienvenida del servidor')
        .addSubcommandGroup(group =>
            group
                .setName('set')
                .setDescription('Establece el mensaje de bienvenida del servidor')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('channel')
                        .setDescription('Establece el canal donde se enviará el mensaje de bienvenida')
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('El canal donde se enviará el mensaje de bienvenida')
                                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('message')
                        .setDescription('Establece el mensaje de bienvenida, puedes hacer uso de variables /variables')
                        .addStringOption(opt =>
                            opt.setName('message')
                                .setDescription('El mensaje de bienvenida que se enviará al canal especificado')
                                .setRequired(true))))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Muestra el mensaje de bienvenida actual del servidor')),
    timeout: 0,
    memberperms: [Permissions.gestionarServidor],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ interaction, client, args, emojis }) {
        await interaction.deferReply()

        const group = args.getSubcommandGroup(false)
        const subcommand = args.getSubcommand()
        const guildId = interaction.guildId

        if (!guildId) {
            return interaction.editReply(`${emojis.error} | Este comando solo puede usarse dentro de un servidor.`)
        }

        const svSettings = await ServerConfig.findOne({ guildId: guildId }).exec()

        if (group === 'set' && subcommand === 'channel') {
            const channel = args.getChannel('channel', true)

            if (!svSettings) {
                const newSettings = new ServerConfig({
                    guildId: guildId,
                    prefix: client.config.prefix,
                    welcomerSettings: {
                        channel: channel.id
                    }
                });
                await newSettings.save();
            } else {
                if (!svSettings.welcomerSettings) {
                    svSettings.welcomerSettings = { channel: channel.id };
                } else {
                    svSettings.welcomerSettings.channel = channel.id;
                }
                await svSettings.save();
            }

            return interaction.editReply(`${emojis.check} El canal de bienvenida ha sido establecido a <#${channel.id}>.`)
        }

        if (group === 'set' && subcommand === 'message') {
            const welcomeMessage = args.getString('message', true)

            if (!svSettings) {
                const newSettings = new ServerConfig({
                    guildId: guildId,
                    prefix: client.config.prefix,
                    welcomerSettings: {
                        message: welcomeMessage
                    }
                });
                await newSettings.save();
            } else {
                if (!svSettings.welcomerSettings) {
                    svSettings.welcomerSettings = { message: welcomeMessage };
                } else {
                    svSettings.welcomerSettings.message = welcomeMessage;
                }
                await svSettings.save();
            }

            return interaction.editReply(`${emojis.check} El mensaje de bienvenida ha sido establecido correctamente.`)
        }

        if (subcommand === 'show') {
            if (!svSettings || !svSettings.welcomerSettings) {
                return interaction.editReply(`${emojis.error} | No hay un mensaje de bienvenida configurado para este servidor.`)
            }
            if (!svSettings.welcomerSettings.channel) {
                return interaction.editReply(`${emojis.error} | No hay un canal de bienvenida configurado para este servidor.`)
            }

            const channelId = svSettings.welcomerSettings.channel
            const channel = interaction.guild?.channels.cache.get(channelId)
            if (!channel) {
                return interaction.editReply(`${emojis.error} | No se pudo encontrar el canal de bienvenida configurado. Asegúrate de que el bot tenga acceso a ese canal.`)
            }

            try {
                client.functions.setInput(interaction)
                const preview = await buildWelcomeMessage(client, svSettings, client.functions.varis ?? [])
                if (!preview) {
                    return interaction.editReply(`${emojis.error} | No se ha establecido un mensaje de bienvenida.`)
                }

                await interaction.editReply(`${emojis.check} | Vista previa del mensaje de bienvenida (se enviará a ${channel} cuando alguien se una):`)
                return interaction.followUp(preview)
            } catch (error) {
                console.error(error)
                return interaction.editReply(`${emojis.error} | Ocurrió un error al generar la vista previa del mensaje de bienvenida.`)
            }
        }
    }
})
