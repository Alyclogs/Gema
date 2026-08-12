import { GModal, GSelectMenuOption, Autoresponder, selectmenuModel } from '../../models/gema-models'
import { updateSelectMenuPreview } from '../../helpers/interactions/selectMenuPreview'
import ExtendedInteraction from '../../typing/ExtendedInteraction'

const mdlEditSelmOption = new GModal({ customId: 'mdlEditSelmOption_', prefix: true })

mdlEditSelmOption.run = async ({ client, interaction, emojis }) => {
    client.selectmenus = await selectmenuModel.find({}).exec()

    const modalCustomId = interaction.customId.replace(/^mdlEditSelmOption_/, '')
    const [customIdValue, rawOptionValue] = modalCustomId.includes('::') ? modalCustomId.split('::') : [modalCustomId, undefined]
    const resolvedCustomId = customIdValue.startsWith('arselm#') ? customIdValue : `arselm#${customIdValue}`
    const selmData = { customId: resolvedCustomId, guildId: interaction.guildId }
    const selectmenu = client.selectmenus.filter(s => s.guildId === interaction.guildId).find(s => s.customId === resolvedCustomId)

    if (!selectmenu || !selectmenu.data.options || !selectmenu.data.options.length) return

    const encodedOptionValue = rawOptionValue ? decodeURIComponent(rawOptionValue) : undefined
    let opt = selectmenu.data.options?.find(o => o.value === encodedOptionValue)

    if (!opt) {
        console.log('mdlEditSelmOption.ts > opt has no data')
        return
    }

    let option: GSelectMenuOption = { index: opt.index, label: opt.label, value: opt.value }

    const emoji = interaction.fields.getTextInputValue('txtSelmOptionEmoji')
    const label = interaction.fields.getTextInputValue('txtSelmOptionLabel')
    const desc = interaction.fields.getTextInputValue('txtSelmOptionDesc')
    const reply = interaction.fields.getTextInputValue('txtSelmOptionReply')

    if (!(emoji || label || desc || reply)) return

    if (emoji && !emoji.match(/^:.*?:$|^<a?:.*?:\d+>$/) && !emoji.match(/[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/u))
        return await interaction.reply({
            content: `${emojis.error} El emoji ingresado no es válido. Intenta ingresar uno con los siguientes formatos: \`:emoji:\` \`<emoji:id>\` o un emoji unicode: \\🤍`,
            components: []
        })

    if (typeof emoji === 'string') {
        if (emoji.trim()) option.emoji = emoji.trim()
        else delete option.emoji
    }
    option.index = opt.index || 1
    if (typeof label === 'string') {
        if (label.trim()) {
            option.label = label.trim()
            option.value = `${label.trim()}_${opt.index || 1}`
        } else {
            option.label = opt.label
            option.value = opt.value
        }
    }
    if (typeof desc === 'string') {
        if (desc.trim()) option.description = desc.trim()
        else delete option.description
    }
    if (typeof reply === 'string') {
        if (reply.trim()) {
            let ar: Autoresponder | undefined = undefined

            try {
                ar = await client.functions.createAutoresponder(interaction as unknown as ExtendedInteraction, reply)
            } catch (e) { return interaction.reply(`${e}`) }

            if (ar) option.reply = ar.arReply
        } else {
            delete option.reply
        }
    }

    const optionIndex = selectmenu.data.options.findIndex(item => item.index === (opt?.index ?? 0) || item.value === (opt?.value ?? ''))

    if (optionIndex !== -1) {
        selectmenu.data.options[optionIndex] = option
    } else {
        selectmenu.data.options.push(option)
    }
    await selectmenuModel.updateOne(selmData, { $set: { 'data.options': selectmenu.data.options } })

    const selectmenuf = await selectmenuModel.findOne(selmData)

    if (selectmenuf) {
        await updateSelectMenuPreview(client, interaction, `${emojis.check} Opción actualizada`, selectmenuf)
    }
}

export default mdlEditSelmOption
