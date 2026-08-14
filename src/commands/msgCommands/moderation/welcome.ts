import { Permissions } from "../../../lib/Permissions";
import { Command } from "../../../structures/Command";
import { model as ServerConfig } from "../../../models/serverconfig-model";
import ExtendedMessage from "../../../typing/ExtendedMessage";
import { buildWelcomeMessage } from "../../../helpers/moderation/welcomer";
import { ErrorCodes } from "../../../lib/Errors";

export default new Command({
    name: "welcome",
    aliases: ["bienvenida", "welcome-message"],
    description: "Configura o muestra el mensaje de bienvenida del servidor",
    uso: "`gema welcome`",
    subcommands: [
        {
            name: "set",
            description: "Establece el mensaje de bienvenida del servidor, puedes hacer uso de variables </variables:1059322453668663367>",
            options: [
                {
                    name: "channel",
                    description: "El canal donde se enviará el mensaje de bienvenida",
                    uso: "`gema welcome set <canal>`",
                },
                {
                    name: "message",
                    description: "El mensaje de bienvenida que se enviará al canal especificado",
                    uso: "`gema welcome set <mensaje>`",
                }
            ]
        },
        {
            name: "show",
            description: "Muestra el mensaje de bienvenida actual del servidor",
            uso: "`gema welcome show`"
        }
    ],
    timeout: 0,
    memberperms: [Permissions.gestionarServidor],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ message, client, args, emojis }) {
        const subcommand = args[0]?.toLowerCase();
        const guildId = message.guildId;
        const option = args[1]?.toLowerCase();

        if (!guildId) {
            return message.reply(`${emojis.error} Este comando solo puede usarse dentro de un servidor.`);
        }

        const svSettings = await ServerConfig.findOne({ guildId: guildId }).exec();

        if (!subcommand || !["set", "show"].includes(subcommand)) {
            return message.reply(`${emojis.error} Debes especificar un subcomando válido. Usa \`gema help welcome\` para ver la lista de subcomandos disponibles.`);
        }

        if (subcommand === "show") {
            if (!svSettings || !svSettings.welcomerSettings) {
                return message.reply(`${emojis.error} No hay un mensaje de bienvenida configurado para este servidor.`);
            }
            if (!svSettings.welcomerSettings.channel) {
                return message.reply(`${emojis.error} No hay un canal de bienvenida configurado para este servidor.`);
            }

            const channelId = svSettings.welcomerSettings.channel;
            const channel = message.guild?.channels.cache.get(channelId);
            if (!channel) {
                return message.reply(`${emojis.error} No se pudo encontrar el canal de bienvenida configurado. Asegúrate de que el bot tenga acceso a ese canal.`);
            }

            try {
                client.functions.setInput(message as ExtendedMessage);
                const preview = await buildWelcomeMessage(client, svSettings, client.functions.varis ?? []);
                if (!preview) {
                    return message.reply(`${emojis.error} No se ha establecido un mensaje de bienvenida.`);
                }

                await message.reply(`${emojis.check} Vista previa del mensaje de bienvenida (se enviará a ${channel} cuando alguien se una):`);
                return message.reply(preview);
            } catch (error) {
                console.error(error);
                return message.reply(`${emojis.error} Ocurrió un error al generar la vista previa del mensaje de bienvenida.`);
            }
        }

        if (subcommand === "set") {
            if (!option) {
                return message.reply(`${emojis.error} Debes especificar una opción válida para el subcomando \`set\`. Usa \`gema help welcome set\` para más información.`);
            }

            if (option === "channel") {
                const channelMention = args[2];
                if (!channelMention) {
                    return message.reply(`${emojis.error} Debes mencionar un canal válido. Uso: \`gema welcome set channel <canal>\``);
                }

                const channelId = channelMention.replace(/<#|>/g, "");
                const channel = message.guild?.channels.cache.get(channelId);
                if (!channel) {
                    return message.reply(`${emojis.error} No se pudo encontrar el canal especificado. Asegúrate de que el bot tenga acceso a ese canal.`);
                }

                if (!svSettings) {
                    const newSettings = new ServerConfig({
                        guildId: guildId,
                        prefix: client.config.prefix,
                        welcomerSettings: {
                            channel: channelId
                        }
                    });
                    await newSettings.save();
                } else {
                    svSettings.welcomerSettings = { ...svSettings.welcomerSettings, channel: channelId };
                    svSettings.markModified("welcomerSettings");
                    await svSettings.save();
                }

                return message.reply(`${emojis.check} El canal de bienvenida ha sido establecido a ${channel}.`);
            }

            if (option === "message") {
                const welcomeMessage = args.slice(2).join(" ");
                if (!welcomeMessage) {
                    return message.reply(`${emojis.error} Debes especificar un mensaje de bienvenida. Uso: \`gema welcome set message <mensaje>\``);
                }

                let embed: { color?: string, name?: string } | null = null;
                const embedNameMatch = welcomeMessage.match(/{embed:\s*([^}]+)}/i);
                if (embedNameMatch && embedNameMatch[1]) {
                    let embedData = embedNameMatch[1].trim();
                    const embedFound = client.embeds.find(em => em.name === embedData);
                    if (!/^#([0-9a-f]{6})$/i.test(embedData) && !embedFound) {
                        return message.reply(`${emojis.error} El embed referenciado "${embedData}" no existe. Asegúrate de que el nombre del embed sea correcto o usa un color hexadecimal válido.`);
                    }
                    embed = embedFound ? { name: embedFound.name } : { color: embedData };
                }

                const cleanMessage = welcomeMessage.replace(/\s*{embed:\s*[^}]+}/gi, "").trim();

                if (!svSettings) {
                    const newSettings = new ServerConfig({
                        guildId: guildId,
                        prefix: client.config.prefix,
                        welcomerSettings: {
                            message: cleanMessage,
                            embed: embed || undefined
                        }
                    });
                    await newSettings.save();
                } else {
                    svSettings.welcomerSettings = { ...svSettings.welcomerSettings, message: cleanMessage, embed: embed || undefined };
                    svSettings.markModified("welcomerSettings");
                    await svSettings.save();
                }

                return message.reply(`${emojis.check} El mensaje de bienvenida ha sido establecido correctamente.`);
            }

            return message.reply(`${emojis.error} Opción no válida para \`set\`. Usa \`channel\` o \`message\`. Usa \`gema help welcome set\` para más información.`);
        }
    }
})