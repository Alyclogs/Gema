const { readdirSync } = require('fs')
const { Client, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChatInputCommandInteraction } = require('discord.js')
const { Permissions2 } = require('../../../utility/validation/Permissions')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra información sobre mis comandos')
        .addStringOption((option) =>
            option.setName('comando').setDescription('Muestra información sobre un comando')),
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],
    /**
     * @param {Client} client
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute(interaction, client, color, emojis) {
        await interaction.deferReply()
        const categorias = readdirSync('./commands/msgCommands');
        const cmd = interaction.options.getString('comando')

        const formatTime = cooldown => {
            if (cooldown > 59 && cooldown < 3600) {
                return `${cooldown / 60}m`
            } else if (cooldown > 3599) {
                return `${cooldown / 3600}h`
            } else {
                return `${cooldown}s`
            }
        }

        if (cmd) {
            const commandName = cmd.toLowerCase().split(' ')
            const comando = client.commands.get(commandName[0]) || client.commands.find(c => c.aliases && c.aliases.includes(commandName[0]));
            const subcomando = comando?.subcommands?.find(s => s.name.toLowerCase() === commandName[1])
            const opcion = subcomando?.options?.find(o => o.name.toLowerCase() === commandName[2])

            if (comando) {
                if (comando.owner) return;
                const embed = new EmbedBuilder()
                    .setTitle(`${emojis.star} Comando ${comando.name}`)
                    .setFooter({ text: `© alys#9411`, iconURL: client.users.cache.get(client.ownerIDS[0]).displayAvatarURL({ dynamic: true }) })
                    .setColor(color)
                if (subcomando) {
                    if (opcion) {
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
                        return interaction.editReply({ embeds: [embed] })

                    } else {
                        embed.setDescription(subcomando.description)
                        if (subcomando.uso) embed.addFields({ name: `Uso`, value: `${subcomando.uso}` });
                        if (subcomando.options && subcomando.options.length >= 1) embed.addFields({
                            name: `Opciones`,
                            value: `${subcomando.options.map(o => `${emojis.dot} \`${comando.name + ' ' + subcomando.name + ' ' + o.name}\``).join("\n")}`
                        });
                        if (comando.timeout) embed.addFields({ name: `Cooldown`, value: formatTime(comando.timeout) });
                        embed.addFields({
                            name: `Permisos del usuario requeridos`,
                            value: comando.memberperms && comando.memberperms.length >= 1 ? `${comando.memberperms.map(permiso => `\`${permiso.perm}\``).join(", ")}` : `Ninguno`
                        });
                        embed.addFields({
                            name: `Permisos del bot requeridos`,
                            value: comando.botperms && comando.botperms.length >= 1 ? `${comando.botperms.map(permiso => `\`${permiso.perm}\``).join(", ")}` : `Ninguno`
                        });
                        return interaction.editReply({ embeds: [embed] })
                    }
                } else {
                    embed.setDescription(comando.description)
                    if (comando.aliases && comando.aliases.length >= 1) embed.addFields({ name: `Aliases`, value: `${comando.aliases.map(alias => `\`${alias}\``).join(", ")}` },);
                    if (comando.subcommands?.length) embed.addFields({
                        name: `Subcomandos`,
                        value: `${comando.subcommands?.map(s => `${emojis.dot} \`${comando.name + ' ' + s.name}\``).join("\n")}`
                    });
                    if (comando.uso) embed.addFields({ name: `Uso`, value: `\`${comando.uso}\`` });
                    if (comando.timeout) embed.addFields({ name: `Cooldown`, value: formatTime(comando.timeout) });
                    embed.addFields({
                        name: `Permisos del usuario requeridos`,
                        value: comando.memberperms && comando.memberperms.length >= 1 ? `${comando.memberperms?.map(permiso => `\`${permiso.perm}\``).join(", ")}` : `Ninguno`
                    });
                    embed.addFields({
                        name: `Permisos del bot requeridos`,
                        value: comando.botperms && comando.botperms.length >= 1 ? `${comando.botperms?.map(permiso => `\`${permiso.perm}\``).join(", ")}` : `Ninguno`
                    });
                    return interaction.editReply({ embeds: [embed] })
                }
            }
        } else {
            const ayuda_embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(emojis.star + ' Ayuda de Gema')
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(`Selecciona una categoría ó\n${emojis.dot}\`gema help <categoría>\` para obtener ayuda sobre una categoría\n${emojis.dot}\`gema help <comando>\` para ver la ayuda sombre un comando`)
                .setFooter({ text: `© alys#9411`, iconURL: client.users.cache.get(client.ownerIDS[0]).displayAvatarURL({ dynamic: true }) })

            const seleccion = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
                .setCustomId(`SelecciónMenuAyuda`)
                .setMaxValues(1)
                .addOptions(categorias.map(categoria => {
                    let objeto = {
                        label: categoria,
                        value: categoria,
                        description: `Mira los comandos de la categoría ${categoria}`,
                        emoji: '🤍',
                    }
                    return objeto;
                }))
            )

            let mensaje_ayuda = await interaction.editReply({ embeds: [ayuda_embed], components: [seleccion] });
        }
    }
}