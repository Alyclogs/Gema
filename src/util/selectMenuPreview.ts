import { ActionRowBuilder, ButtonBuilder, ComponentEmojiResolvable, ModalSubmitInteraction, StringSelectMenuBuilder } from 'discord.js'
import Bot from '../structures/Bot'
import { GButton, GSelectMenu } from '../models/gema-models'

export async function updateSelectMenuPreview(client: Bot, interaction: ModalSubmitInteraction, content: string, selectmenuData: GSelectMenu) {
    const previewSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(selectmenuData.customId)

    if (selectmenuData.data?.minValues) previewSelectMenu.setMinValues(selectmenuData.data.minValues)
    if (selectmenuData.data?.maxValues) previewSelectMenu.setMaxValues(selectmenuData.data.maxValues)
    if (selectmenuData.data?.placeholder) previewSelectMenu.setPlaceholder(selectmenuData.data.placeholder)

    if (selectmenuData.data?.options?.length) {
        previewSelectMenu.setOptions((selectmenuData.data.options ?? []).map((option) => ({
            label: option.label,
            value: option.value,
            description: option.description,
            emoji: option.emoji as ComponentEmojiResolvable | undefined
        })))
    } else {
        previewSelectMenu.addOptions([{ label: 'Opción de ejemplo', value: 'opcion1', description: 'Descripción de ejemplo' }])
    }

    const components = [
        new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([previewSelectMenu]),
        new ActionRowBuilder<ButtonBuilder>().setComponents([
            (client.buttons.get('btnEditSelmData') as GButton).getButton(),
            (client.buttons.get('btnEditSelmOptions') as GButton).getButton()
        ])
    ]

    const anyInteraction = interaction as any

    if (anyInteraction.message) {
        await anyInteraction.deferUpdate()
        await anyInteraction.message.edit({ content, components })
        return
    }

    if (anyInteraction.replied || anyInteraction.deferred) {
        await anyInteraction.editReply({ content, components })
        return
    }

    await anyInteraction.reply({ content, components, ephemeral: true })
}
