import { GModal, Autoresponder, selectmenuModel } from '../../models/gema-models'
import { updateSelectMenuPreview } from '../../util/selectMenuPreview'
import ExtendedInteraction from '../../typing/ExtendedInteraction'

const mdlEditSelmData = new GModal({ customId: 'mdlEditSelmData_', prefix: true })

mdlEditSelmData.run = async ({ client, interaction, emojis }) => {
    client.selectmenus = await selectmenuModel.find({}).exec()

    const customIdValue = interaction.customId.replace(/^mdlEditSelmData_/, '')
    const resolvedCustomId = customIdValue.startsWith('arselm#') ? customIdValue : `arselm#${customIdValue}`
    const selmData = { customId: resolvedCustomId, guildId: interaction.guildId }
    const selectmenu = client.selectmenus.filter(s => s.guildId === interaction.guildId).find(s => s.customId === resolvedCustomId)

    if (!selectmenu) return

    const placeholder = interaction.fields.getTextInputValue('txtSelmPlaceholder')
    const minvalues = interaction.fields.getTextInputValue('txtSelmMinValues')
    const maxvalues = interaction.fields.getTextInputValue('txtSelmMaxValues')
    const reply = interaction.fields.getTextInputValue('txtSelmReply')
    const ephemeral = interaction.fields.getTextInputValue('txtEphemeral')

    const dataToEdit: Record<string, any> = { $set: {}, $unset: {} }
    const nextData = { ...(selectmenu?.data ?? {}) } as Record<string, any>

    if (typeof placeholder === 'string') {
        if (placeholder.trim()) {
            nextData.placeholder = placeholder.trim()
        } else {
            delete nextData.placeholder
        }
    }

    if (typeof ephemeral === 'string') {
        if (ephemeral === 'true') {
            dataToEdit.$set.ephemeral = true
        } else if (ephemeral === 'false') {
            dataToEdit.$set.ephemeral = false
        } else {
            return await interaction.message?.edit(`${emojis.error} El campo para especificar si la respuesta será privada sólo acepta valores \`true\` o \`false\``)
        }
    }

    if (typeof minvalues === 'string' || typeof maxvalues === 'string') {
        const parsedMin = minvalues?.trim() ? Number(minvalues) : undefined
        const parsedMax = maxvalues?.trim() ? Number(maxvalues) : undefined

        if (minvalues && maxvalues && parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
            return await interaction.message?.edit(`${emojis.error} El número mínimo de opciones seleccionables debe ser menor al número máximo`)
        }
        if (minvalues && minvalues.trim() && isNaN(Number(minvalues))) {
            return await interaction.message?.edit(`${emojis.error} El número mínimo de opciones seleccionables no es un número válido`)
        }
        if (maxvalues && maxvalues.trim() && isNaN(Number(maxvalues))) {
            return await interaction.message?.edit(`${emojis.error} El número máximo de opciones seleccionables no es un número válido`)
        }

        if (minvalues?.trim()) {
            nextData.minValues = Number(minvalues)
        } else if (typeof minvalues === 'string') {
            delete nextData.minValues
        }

        if (maxvalues?.trim()) {
            nextData.maxValues = Number(maxvalues)
        } else if (typeof maxvalues === 'string') {
            delete nextData.maxValues
        }
    }

    if (typeof reply === 'string') {
        if (reply.trim()) {
            let ar: Autoresponder | undefined = undefined

            try {
                ar = await client.functions.createAutoresponder(interaction as unknown as ExtendedInteraction, reply)
            } catch (e) { return interaction.editReply(`${e}`) }

            if (ar) dataToEdit.$set.reply = ar.arReply
        } else {
            dataToEdit.$unset.reply = ''
        }
    }

    dataToEdit.$set.data = nextData
    await selectmenuModel.updateOne(selmData, dataToEdit)

    const selectmenuf = await selectmenuModel.findOne(selmData)

    if (selectmenuf) {
        await updateSelectMenuPreview(client, interaction, `${emojis.check} Datos de menú de selección actualizados`, selectmenuf)
    }
}

export default mdlEditSelmData
