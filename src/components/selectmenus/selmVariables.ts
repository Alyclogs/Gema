import { EmbedBuilder, StringSelectMenuComponent, StringSelectMenuInteraction } from 'discord.js'
import { GSelectMenu } from '../../models/gema-models'
import { variables as getVariables, functions as utilFunctions } from '../../lib/Variables'
import { createEmbedPagination } from '../../util/interactions/pagination'

const selmVariables = new GSelectMenu()
selmVariables.customId = 'variables_menu'

selmVariables.run = async ({ client, interaction, emojis }) => {
    const selectInteraction = interaction as StringSelectMenuInteraction

    const varsObj = getVariables(selectInteraction as any)
    const categoryMap = {
        user: { title: varsObj.user.title || 'Información del usuario', items: varsObj.user.vars || [] },
        server: { title: varsObj.server.title || 'Información del servidor', items: varsObj.server.vars || [] },
        functions: { title: 'Funciones', items: utilFunctions || [] }
    }

    /** Contextos donde funcionan la mayoría de las funciones (autoresponder, mensaje, botón, selectmenu); si una función no cubre todos, se marca aparte en la lista. */
    const DEFAULT_FUNCTION_CONTEXTS = ['Autoresponder', 'Mensaje', 'Botón', 'Selectmenu']

    const formatItemLabel = (item: any) => {
        if (!Array.isArray(item.usableIn)) return `${emojis.dot} ${item.name}`
        const isDefault = DEFAULT_FUNCTION_CONTEXTS.length === item.usableIn.length
            && DEFAULT_FUNCTION_CONTEXTS.every((ctx: string) => item.usableIn.includes(ctx))
        if (isDefault) return `${emojis.dot} ${item.name}`
        return `${emojis.dot} ${item.name} *(${item.usableIn.join(', ')})*`
    }

    const buildCategoryEmbeds = (category: 'user' | 'server' | 'functions') => {
        const selected = categoryMap[category]
        const items = (selected.items as any[]).map(formatItemLabel)

        if (!items.length) {
            return [new EmbedBuilder()
                .setTitle(`${emojis.star} ${selected.title}`)
                .setColor(client.color)
                .setDescription('No hay elementos para mostrar en esta categoría.')]
        }

        const description = category === 'functions'
            ? 'Usa `vars <nombre>` para ver información detallada. Salvo que se indique lo contrario entre paréntesis, funcionan en autoresponder, mensaje, botón y selectmenu (no en `/embed`).'
            : 'Usa `vars <nombre>` para ver información detallada de una variable o función.'

        const linesPerPage = 12
        const pages: EmbedBuilder[] = []
        for (let i = 0; i < items.length; i += linesPerPage) {
            const slice = items.slice(i, i + linesPerPage)
            const halfway = Math.ceil(slice.length / 2)
            const left = slice.slice(0, halfway).join('\n')
            const right = slice.slice(halfway).join('\n')

            const embed = new EmbedBuilder()
                .setTitle(`${emojis.star} ${selected.title}`)
                .setColor(client.color)
                .setDescription(description)
                .addFields({ name: selected.title, value: left, inline: true })

            if (right) {
                embed.addFields({ name: '​', value: right, inline: true })
            }

            pages.push(embed)
        }

        return pages
    }

    const selectedCategory = selectInteraction.values[0]
    const category = selectedCategory === 'vars_user' ? 'user' : selectedCategory === 'vars_server' ? 'server' : 'functions'
    const embeds = buildCategoryEmbeds(category)

    const firstRow = selectInteraction.message.components[0] as any
        ; (firstRow.components[0] as StringSelectMenuComponent).options?.forEach(o => {
            o.default = o.value === selectedCategory
        })

    if (embeds.length > 1) {
        await selectInteraction.deferUpdate()
        await createEmbedPagination(selectInteraction, embeds)
        return
    }

    await selectInteraction.update({ embeds: [embeds[0]], components: selectInteraction.message.components })
}

export default selmVariables
