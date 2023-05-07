const { readdirSync } = require('fs');
const { Message, Client, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');

module.exports = {
    name: "help",
    aliases: ["ayuda"],
    uso: `Para explorar una categoría \`help <categoría>\`
    Para obtener ayuda obre un comando \`help <comando>\``,
    description: "Muestra información sobre mis comandos",
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces],
    /**
     * @param {Client} client
     * @param {Message} message
     */
    async execute(client, message, args, prefix, emojis, color) {
        const categorias = readdirSync('./commands/msgCommands');

        const formatTime = cooldown => {
            if (cooldown > 59 && cooldown < 3600) {
                return `${cooldown / 60}m`
            } else if (cooldown > 3599) {
                return `${cooldown / 3600}h`
            } else {
                return `${cooldown}s`
            }
        }

        if (args[0]) {
            const comando = client.commands.get(args[0].toLowerCase()) || client.commands.find(c => c.aliases && c.aliases.includes(args[0].toLowerCase()));
            const categoria = categorias.find(categoria => categoria.toLowerCase() === args[0].toLowerCase());
            const subcomando = comando?.subcommands?.find(s => s.name === args[1]?.toLowerCase())
            const opcion = subcomando?.options?.find(o => o.name === args[2]?.toLowerCase())

            if (comando) {
                if (comando.owner) return;
                const embed = new EmbedBuilder()
                    .setTitle(`${emojis.star} Comando ${comando.name}`)
                    .setFooter({ text: `© alys#9411`, iconURL: client.users.cache.get(client.ownerIDS[0]).displayAvatarURL({ dynamic: true }) })
                    .setColor(color)
                if (subcomando) {
                    if (opcion) {
                        s
                        embed.setDescription(opcion.description)
                        if (opcion.uso) embed.addFields({ name: `Uso`, value: `${opcion.uso}` });
                        if (comando.timeout) embed.addFields({ name: `Cooldown`, value: formatTime(comando.timeout) });
                        embed.addFields({
                            name: `Permisos del usuario requeridos`,
                            value: comando.memberperms && comando.memberperms.length >= 1 ? `${comando.memberperms.map(permiso => `\`${permiso.perm}\``).join(", ")}` : `Ninguno`
                        });
                        embed.addFields({
                            name: `Permisos del bot requeridos`,
                            value: comando.botperms && comando.botperms.length >= 1 ? `${comando.botperms.map(permiso => `\`${permiso.perm}\``).join(", ")}` : `Ninguno`
                        });
                        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })

                    } else {
                        embed.setDescription(subcomando.description)
                        if (subcomando.uso) embed.addFields({ name: `Uso`, value: `${subcomando.uso}` });
                        if (subcomando.options && subcomando.options.length >= 1) embed.addFields({
                            name: `Opciones`,
                            value: `${subcomando.options.map(o => `${emojis.dot} \`${comando.name + ' ' + subcomando.name + ' ' + o.name}\``).join("\n")}`
                        });
                        if (comando.timeout) embed.addFields({ name: `Cooldown`, value: `${comando.timeout}` });
                        embed.addFields({
                            name: `Permisos del usuario requeridos`,
                            value: comando.memberperms && comando.memberperms.length >= 1 ? `${comando.memberperms.map(permiso => `\`${permiso.perm}\``).join(", ")}` : `Ninguno`
                        });
                        embed.addFields({
                            name: `Permisos del bot requeridos`,
                            value: comando.botperms && comando.botperms.length >= 1 ? `${comando.botperms.map(permiso => `\`${permiso.perm}\``).join(", ")}` : `Ninguno`
                        });
                        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
                    }
                } else {
                    embed.setDescription(comando.description)
                    if (comando.aliases && comando.aliases.length >= 1) embed.addFields({ name: `Aliases`, value: `${comando.aliases.map(alias => `\`${alias}\``).join(", ")}` },);
                    if (comando.subcommands?.length) embed.addFields({
                        name: `Subcomandos`,
                        value: `${comando.subcommands.map(s => `${emojis.dot} \`${comando.name + ' ' + s.name}\``).join("\n")}`
                    });
                    if (comando.uso) embed.addFields({ name: `Uso`, value: `${comando.uso}` });
                    if (comando.timeout) embed.addFields({ name: `Cooldown`, value: formatTime(comando.timeout) });
                    embed.addFields({
                        name: `Permisos del usuario requeridos`,
                        value: comando.memberperms && comando.memberperms.length >= 1 ? `${comando.memberperms?.map(permiso => `\`${permiso.perm}\``).join(", ")}` : `Ninguno`
                    });
                    embed.addFields({
                        name: `Permisos del bot requeridos`,
                        value: comando.botperms && comando.botperms.length >= 1 ? `${comando.botperms?.map(permiso => `\`${permiso.perm}\``).join(", ")}` : `Ninguno`
                    });
                    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
                }
            } else if (categoria) {
                const comandos_de_categoria = readdirSync(`./commands/msgCommands/${categoria}`).filter(archivo => archivo.endsWith('.js'));
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle(`${emojis.star} Categoría ${categoria}`)
                        .setDescription(`Para obtener ayuda sobre un comando: \`gema help comando\``)
                        .setColor(client.color)
                        .setThumbnail(client.user.displayAvatarURL())
                        .addFields({
                            name: 'Comandos', value: comandos_de_categoria.length >= 1 ? `>>> *${comandos_de_categoria.filter(c => c !== 'reload.js')
                                .map(c => `\`${c.replace(/.js/, "")}\``).join(" - ")}*` : `>>> *Todavía no hay comandos en esta categoría...*`
                        })
                        .setFooter({ text: `© alys#9411`, iconURL: client.users.cache.get(client.ownerIDS[0]).displayAvatarURL({ dynamic: true }) })
                    ],
                    allowedMentions: { repliedUser: false }
                })
            } else {
                return message.reply(`${emojis.error} **No se ha encontrado el comando especificado**\nUsa \`${prefix}help\` para ver los comandos y categorías!`)
            }
        } else {
            const ayuda_embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(emojis.star + ' Ayuda de Gema')
                .setDescription(`Selecciona una categoría ó\n${emojis.dot}\`gema help <categoría>\` para obtener ayuda sobre una categoría\n${emojis.dot}\`gema help <comando>\` para obtener ayuda sombre un comando`)
                .setFooter({ text: `© alys#9411`, iconURL: client.users.cache.get(client.ownerIDS[0]).displayAvatarURL({ dynamic: true }) })

            let options = categorias.map(categoria => {
                let objeto = {
                    label: categoria,
                    value: categoria,
                    description: `Mira los comandos de la categoría ${categoria}`,
                    emoji: '🤍',
                    default: false
                }
                return objeto;
            })

            const seleccion = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
                .setCustomId(`SelecciónMenuAyuda`)
                .setMaxValues(1)
                .setOptions(options)
            )

            await message.reply({ embeds: [ayuda_embed], components: [seleccion] });
        }
    }
}