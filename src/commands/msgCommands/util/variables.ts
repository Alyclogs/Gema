import { CommandType } from '../../../typing/Command';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { variables as getVariables, functions as utilFunctions } from '../../../lib/Variables';
import emojis from '../../../lib/emojis.json';

const command: CommandType = {
    name: 'variables',
    aliases: ['vars'],
    description: 'Muestra las variables y funciones disponibles (usa vars <nombre> para ver detalles)',
    async run({ client, message, args }) {
        const arg = args[0]
        const varsObj = getVariables(message as any)

        // Helper to normalize lookup key
        const normalize = (s?: string) => {
            if (!s) return ''
            return s.trim().replace(/^\{?/, '{').replace(/\}?$/, '}')
        }

        if (arg) {
            const lookup = arg.trim()
            // Try match functions first (they have names like '{requireuser:}')
            const func = utilFunctions.find((f: any) => f.name.toLowerCase() === lookup.toLowerCase() || f.name.toLowerCase() === normalize(lookup).toLowerCase())
            if (func) {
                const embed = new EmbedBuilder()
                    .setTitle(`${emojis['star']} Función: ${func.name}`)
                    .setColor(client.color as any)
                    .addFields(
                        { name: 'Descripción', value: func.description || 'Sin descripción' },
                        { name: 'Dónde se puede usar', value: func.usableIn?.length ? func.usableIn.join(', ') : 'Sin especificar' },
                        { name: 'Uso', value: func.uso || 'Sin uso especificado' }
                    )
                if (func.ejemplo) embed.addFields({ name: 'Ejemplo', value: func.ejemplo })
                return message.reply({ embeds: [embed] })
            }

            // Search variables in all groups
            const allVars = (varsObj.server.vars as any[]).concat(varsObj.user.vars as any[])
            const normalizedArg = normalize(lookup)
            const v = allVars.find((vv: any) => vv.name.toLowerCase() === lookup.toLowerCase() || vv.name.toLowerCase() === normalizedArg.toLowerCase())
            if (v) {
                const embed = new EmbedBuilder()
                    .setTitle(`${emojis['dot']} Variable: ${v.name}`)
                    .setColor(client.color as any)
                    .addFields(
                        { name: 'Valor de ejemplo', value: v.value ? `${v.value}` : 'Sin valor' },
                        { name: 'Descripción', value: v.description || 'Sin descripción' },
                        { name: 'Dónde se puede usar', value: v.usableIn?.length ? v.usableIn.join(', ') : 'Sin especificar' }
                    )
                return message.reply({ embeds: [embed] })
            }

            return message.reply(`${emojis['error']} No encontré la variable o función \`${arg}\`. Revisa la lista con \`vars\``)
        }

        // No arg: show category selection menu
        const categories = [
            {
                label: 'Información del usuario',
                value: 'vars_user',
                description: 'Muestra las variables del usuario',
                emoji: '👤'
            },
            {
                label: 'Información del servidor',
                value: 'vars_server',
                description: 'Muestra las variables del servidor',
                emoji: '🏠'
            },
            {
                label: 'Funciones',
                value: 'vars_functions',
                description: 'Muestra las funciones disponibles',
                emoji: '⚙️'
            }
        ]

        const menu = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
            new StringSelectMenuBuilder()
                .setCustomId('variables_menu')
                .setPlaceholder('Selecciona una categoría')
                .setMaxValues(1)
                .addOptions(categories)
        )

        const embed = new EmbedBuilder()
            .setTitle(`${emojis.star} Variables y funciones`)
            .setColor(client.color as any)
            .setDescription('Selecciona una categoría en el menú para ver sus variables y funciones.')
            .addFields({ name: 'Consejo', value: 'También puedes usar `vars <nombre>` para ver información específica.' })

        return message.reply({ embeds: [embed], components: [menu] })
    }
}

export default command
