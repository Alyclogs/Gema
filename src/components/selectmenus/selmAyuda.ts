import { EmbedBuilder, StringSelectMenuComponent, StringSelectMenuInteraction } from 'discord.js'
import { GSelectMenu } from '../../models/gema-models'
import { readdirSync } from 'fs'

const selmAyuda = new GSelectMenu()
selmAyuda.customId = 'SelecciónMenuAyuda'

selmAyuda.run = async ({ client, interaction, emojis }) => {
    const selectInteraction = interaction as StringSelectMenuInteraction

    await selectInteraction.deferUpdate()
    const seleccionado = selectInteraction.values[0]
    const comandos_de_categoria = readdirSync(`./src/commands/msgCommands/${seleccionado}`)
        .filter(archivo => archivo.endsWith('.js') || archivo.endsWith('.ts'))

    const embed = new EmbedBuilder()
        .setTitle(`${emojis.star} Categoría ${seleccionado}`)
        .setDescription(`Para obtener ayuda sobre un comando: \`gema help comando\``)
        .setColor(client.color)
        .addFields({
            name: 'Comandos', value: comandos_de_categoria.length >= 1 ? `>>> *${comandos_de_categoria
                .map(c => {
                    let comando = client.commands.get(c.replace(/.js/, "").replace(/.ts/, ""))
                    if (!comando || comando?.owner) return null
                    return `\`${comando?.name}\``
                })
                .filter((v): v is string => !!v)
                .join(" - ")}*`
                : `>>> *Todavía no hay comandos en esta categoría...*`
        })
        .setFooter({ text: `@alyduhh`, iconURL: client.users.cache.get(client.ownerIDS[0])?.displayAvatarURL() })

    const firstRow = selectInteraction.message.components[0] as any
        ; (firstRow.components[0] as StringSelectMenuComponent).options?.forEach(o => {
            o.default = o.value === seleccionado
        })

    await selectInteraction.editReply({ embeds: [embed], components: selectInteraction.message.components })
}

export default selmAyuda
