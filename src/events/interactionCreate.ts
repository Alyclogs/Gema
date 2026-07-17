import { ActionRowBuilder, AutocompleteInteraction, ButtonBuilder, ChatInputCommandInteraction, ColorResolvable, CommandInteractionOptionResolver, ComponentEmojiResolvable, EmbedBuilder, Message, ModalActionRowComponentBuilder, ModalBuilder, PermissionResolvable, StringSelectMenuBuilder, StringSelectMenuComponent, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle, time } from 'discord.js';
import ExtendedInteraction from '../typing/ExtendedInteraction';
import { Event } from '../typing/Event';
import Bot from '../structures/Bot';
import { ArReplyType, Autoresponder, GButton, GSelectMenuOption, selectmenuModel } from '../models/gema-models';
import { variables as getVariables, functions as utilFunctions } from '../util/Variables';
import { createEmbedPagination } from '../util/Pagination';
import { readdirSync } from 'fs';
import { isNsfwChannel } from '../util/isNsfwChannel';

export default new Event({
  name: "interactionCreate",
  once: false
},
  async (client: Bot, interaction: ExtendedInteraction) => {
    if (!interaction.guild) return
    const { emotes, timeouts } = client
    if (!interaction.channel) return
    client.functions.setInput(interaction)

    const buildSelectMenuInfoEmbed = (selectmenu: any, mode: 'general' | 'option', option?: any) => {
      const baseEmbed = new EmbedBuilder()
        .setColor(client.color)
        .setAuthor({ name: interaction.guild?.name || '', iconURL: interaction.guild?.iconURL() || undefined })

      if (mode === 'option' && option) {
        return baseEmbed
          .setTitle(`Opción de ${selectmenu.name}`)
          .setDescription(`**Etiqueta:** ${option.label}\n**Valor:** ${option.value}\n**Descripción:** ${option.description || 'Sin descripción'}\n**Emoji:** ${option.emoji || 'Sin emoji'}`)
      }

      return baseEmbed
        .setTitle(`Información de ${selectmenu.name}`)
        .setDescription(`**ID:** ${selectmenu.customId}\n**Nombre:** ${selectmenu.name}\n**Opciones:** ${selectmenu.data?.options?.length || 0}\n**Mínimo:** ${selectmenu.data?.minValues || 1}\n**Máximo:** ${selectmenu.data?.maxValues || 1}\n**Placeholder:** ${selectmenu.data?.placeholder || 'Ninguno'}\n**Ephemeral:** ${selectmenu.ephemeral ? 'Sí' : 'No'}`)
    }

    const buildVariableCategoryEmbeds = (category: 'user' | 'server' | 'functions') => {
      const varsObj = getVariables(interaction as any)
      const categoryMap = {
        user: { title: varsObj.user.title || 'Información del usuario', items: varsObj.user.vars || [] },
        server: { title: varsObj.server.title || 'Información del servidor', items: varsObj.server.vars || [] },
        functions: { title: 'Funciones', items: utilFunctions || [] }
      }
      const selected = categoryMap[category]
      const items = (selected.items as any[]).map(item => `${emotes.dot} ${item.name}`)

      if (!items.length) {
        return [new EmbedBuilder()
          .setTitle(`${emotes.star} ${selected.title}`)
          .setColor(client.color)
          .setDescription('No hay elementos para mostrar en esta categoría.')]
      }

      const linesPerPage = 12
      const pages: EmbedBuilder[] = []
      for (let i = 0; i < items.length; i += linesPerPage) {
        const slice = items.slice(i, i + linesPerPage)
        const halfway = Math.ceil(slice.length / 2)
        const left = slice.slice(0, halfway).join('\n')
        const right = slice.slice(halfway).join('\n')

        const embed = new EmbedBuilder()
          .setTitle(`${emotes.star} ${selected.title}`)
          .setColor(client.color)
          .setDescription('Usa `vars <nombre>` para ver información detallada de una variable o función.')
          .addFields({ name: selected.title, value: left, inline: true })

        if (right) {
          embed.addFields({ name: '\u200b', value: right, inline: true })
        }

        pages.push(embed)
      }

      return pages
    }

    const updateSelectMenuPreview = async (content: string, selectmenuData: any) => {
      const previewSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(selectmenuData.customId)

      if (selectmenuData.data?.minValues) previewSelectMenu.setMinValues(selectmenuData.data.minValues)
      if (selectmenuData.data?.maxValues) previewSelectMenu.setMaxValues(selectmenuData.data.maxValues)
      if (selectmenuData.data?.placeholder) previewSelectMenu.setPlaceholder(selectmenuData.data.placeholder)

      if (selectmenuData.data?.options?.length) {
        previewSelectMenu.setOptions((selectmenuData.data.options ?? []).map((option: any) => ({
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

    if (interaction.isChatInputCommand()) {
      const { member, guild, commandName } = interaction
      let command = client.slashCommands.get(interaction.commandName)
      if (!command) return

      const memberperms = command.memberperms || []
      const botperms = command.botperms || []

      if (memberperms?.length > 0 && !(memberperms.every(p => member?.permissions.has(p.flag as PermissionResolvable)))) {
        let permsFaltantes = memberperms.filter(dmp => !member.permissions.has(dmp.flag as PermissionResolvable)).map(dmp => `\`${dmp.perm}\``).join(', ')
        return interaction.reply({
          content: `${emotes['error']} No tienes suficientes permisos para ejecutar este comando\nPermisos faltantes: ${permsFaltantes}`,
          ephemeral: true
        })
      }
      if (botperms?.length > 0 && !(botperms.every(p => guild?.members.me?.permissions.has(p.flag as PermissionResolvable)))) {
        let permsFaltantes = botperms.filter(dmp => !guild?.members?.me?.permissions.has(dmp.flag as PermissionResolvable)).map(dmp => `\`${dmp.perm}\``).join(', ')
        return interaction.reply({
          content: `${emotes['error']} No tengo suficientes permisos para ejecutar este comando\nPermisos faltantes: ${permsFaltantes}`,
          ephemeral: true
        })
      }

      if (command.nsfw && !isNsfwChannel(interaction.channel)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(client.color)
              .setTitle(`${emotes.sweat} Comando NSFW`)
              .setDescription('Para ejecutar este comando, el canal debe permitir contenido NSFW')
          ],
          ephemeral: true
        })
      }

      const cooldownData = `${interaction.user.id}_cmd:${commandName}`
      const timesc = Math.floor(Date.now() / 1000)
      const timeout = command.timeout || 0

      if (timeouts.has(cooldownData)) {
        const expirationTime = (client?.timeouts?.get(cooldownData) || 0) + timeout
        if (timesc < expirationTime) {
          return interaction.reply({
            content: `${emotes['hmph']} Estás yendo muy rápido! Podrás volver a ejecutar este comando ${time(expirationTime, 'R')}`,
            allowedMentions: { repliedUser: false }
          })
        }
      }
      client.timeouts.set(cooldownData, timesc)
      setTimeout(() => client.timeouts.delete(cooldownData), timeout * 1000)

      await command.run({
        args: interaction.options as CommandInteractionOptionResolver,
        client: client,
        interaction: interaction as ChatInputCommandInteraction,
        color: client.color as ColorResolvable,
        emojis: client.emotes
      });
    } else if (interaction.isAutocomplete()) {

      let command = client.slashCommands.get(interaction.commandName)
      if (!command) return

      if (command.autocomplete) {
        await command.autocomplete({
          client: client,
          interaction: interaction as AutocompleteInteraction,
          args: interaction.options as CommandInteractionOptionResolver,
          color: client.color as ColorResolvable,
          emojis: client.emotes
        });
      }
    } else if (interaction.isButton()) {

      await client.syncButtons()

      if (interaction.customId.startsWith('showInfo|')) {
        const [, selectMenuCustomId] = interaction.customId.split('|')
        const selectmenu = client.selectmenus.find(s => s.guildId === interaction.guildId && s.customId === selectMenuCustomId)

        if (selectmenu) {
          await interaction.deferUpdate()
          await interaction.message.edit({
            embeds: [buildSelectMenuInfoEmbed(selectmenu, 'general')],
            components: interaction.message.components
          })
        }
        return
      }

      let button = client.buttons.get(interaction.customId)

      if (button) {
        if (button.run) {
          try {
            await button.run({
              client: client,
              interaction: interaction,
              color: client.color as ColorResolvable,
              emojis: client.emotes
            })
          } catch (e) {
            await interaction.channel.send(`${client.emotes.error} ${e}`)
          }
        } else if (button.reply) {
          if (button.ephemeral) {
            await interaction.deferReply({ ephemeral: true })
            await client.functions.executeReply(button.reply, interaction).catch(async (e: Error) => await interaction.channel.send(`${client.emotes.error} ${e}`))
          } else {
            await interaction.deferReply()
            await client.functions.executeReply(button.reply, interaction).catch(async (e: Error) => await interaction.channel.send(`${client.emotes.error} ${e}`))
          }
        } else {
          await interaction.deferUpdate()
          //await interaction.reply({ content: `${emotes.error} Este botón aun no tiene asignada una respuesta. Asígnale una con /button edit reply ${button.name}`, ephemeral: true })
        }
      }
    } else if (interaction.isStringSelectMenu()) {

      client.selectmenus = await selectmenuModel.find({}).exec()
      const selectMenuTargetId = interaction.customId.startsWith('editing_')
        ? interaction.customId.replace(/^editing_/, '')
        : interaction.customId.startsWith('info_')
          ? interaction.customId.replace(/^info_/, '')
          : interaction.customId
      let selectmenu = client.selectmenus.find(s => s.guildId === interaction.guildId && s.customId === selectMenuTargetId)

      if (interaction.customId === 'variables_menu') {
        const selectedCategory = interaction.values[0]
        const category = selectedCategory === 'vars_user' ? 'user' : selectedCategory === 'vars_server' ? 'server' : 'functions'
        const embeds = buildVariableCategoryEmbeds(category as 'user' | 'server' | 'functions')

        const firstRow = interaction.message.components[0] as any
          ; (firstRow.components[0] as StringSelectMenuComponent).options?.forEach(o => {
            o.default = o.value === selectedCategory
          })

        if (embeds.length > 1) {
          await interaction.deferUpdate()
          return createEmbedPagination(interaction as StringSelectMenuInteraction, embeds)
        }

        await interaction.update({ embeds: [embeds[0]], components: interaction.message.components })
        return
      }

      if (interaction.customId.startsWith('info_')) {
        const selectedOption = selectmenu?.data?.options?.find(o => o.value === interaction.values[0])

        if (selectmenu) {
          await interaction.deferUpdate()
          await interaction.message.edit({
            embeds: [buildSelectMenuInfoEmbed(selectmenu, 'option', selectedOption)],
            components: interaction.message.components
          })
        }
        return
      }

      if (selectmenu) {
        if (interaction.customId.startsWith('editing_')) {

          const option = interaction.component.options.find(o => o.value === interaction.values[0])
          const goption = selectmenu.data.options?.find(o => o.value === option?.value)

          if (option && goption) {
            const txtEmoji = new TextInputBuilder()
              .setCustomId('txtSelmOptionEmoji')
              .setLabel('Emoji de la opción')
              .setPlaceholder(`:heart:`)
              .setRequired(false)
              .setStyle(TextInputStyle.Short)
            if (option.emoji) txtEmoji.setValue(`${option.emoji.name}`)

            const txtLabel = new TextInputBuilder()
              .setCustomId('txtSelmOptionLabel')
              .setLabel('Título de la opción')
              .setPlaceholder(`Opción ${(selectmenu.data.options?.length || 0) + 1}`)
              .setMinLength(3)
              .setValue(`${option.label}`)
              .setRequired(false)
              .setStyle(TextInputStyle.Short)

            const txtDesc = new TextInputBuilder()
              .setCustomId('txtSelmOptionDesc')
              .setLabel('Descripción de la opción')
              .setPlaceholder('Escribe tu descripción')
              .setMinLength(3)
              .setMaxLength(1000)
              .setRequired(false)
              .setStyle(TextInputStyle.Paragraph)
            if (option.description) txtDesc.setValue(option.description)

            const txtReply = new TextInputBuilder()
              .setCustomId('txtSelmOptionReply')
              .setLabel('Respuesta cuando se seleccione la opción')
              .setPlaceholder(`Se te ha colocado el rol @cumpleaños {addrole:@cumpleaños}`)
              .setRequired(false)
              .setStyle(TextInputStyle.Paragraph)
            if (goption.reply) txtReply.setValue(goption.reply.rawreply)

            const modalEditOption = new ModalBuilder()
              .setCustomId(`mdlEditSelmOption_${selectmenu.customId}::${encodeURIComponent(option.value)}`)
              .setTitle(`Datos de opción ${option?.label}`)
              .setComponents([
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                  .setComponents(txtEmoji),
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                  .setComponents(txtLabel),
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                  .setComponents(txtDesc),
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                  .setComponents(txtReply)
              ])

            interaction.showModal(modalEditOption)
          }
        } else {
          const selectedValues = interaction.values ?? []
          const options = selectmenu?.data?.options ?? []

          // Prioritize the general selectmenu reply over option-specific replies
          if (selectmenu.reply) {
            if (selectmenu.ephemeral) {
              await interaction.deferReply({ ephemeral: true })
              await client.functions.executeReply(selectmenu.reply, interaction).catch(async (e: Error) => await interaction.channel.send(`${client.emotes.error} ${e}`))
            } else {
              await interaction.deferReply()
              await client.functions.executeReply(selectmenu.reply, interaction).catch(async (e: Error) => await interaction.channel.send(`${client.emotes.error} ${e}`))
            }
          } else {
            const optionReplies = selectedValues
              .map((value) => options.find((option) => option.value === value && option.reply))
              .filter((option): option is NonNullable<typeof option> => Boolean(option))

            if (optionReplies.length > 0) {
              for (const option of optionReplies) {
                if (option.reply) {
                  await interaction.deferReply()
                  await client.functions.executeReply(option.reply, interaction).catch(async (e: Error) => await interaction.channel.send(`${client.emotes.error} ${e}`))
                }
              }
            } else {
              await interaction.deferUpdate()
            }
          }
        }
      } else if (interaction.customId === 'SelecciónMenuAyuda') {
        await interaction.deferUpdate()
        let seleccionado = interaction.values[0]
        const comandos_de_categoria = readdirSync(`./src/commands/msgCommands/${seleccionado}`).filter(archivo => archivo.endsWith('.js')
          || archivo.endsWith('.ts'));

        let embed = new EmbedBuilder()
          .setTitle(`${emotes.star} Categoría ${seleccionado}`)
          .setDescription(`Para obtener ayuda sobre un comando: \`gema help comando\``)
          .setColor(client.color)
          .addFields({
            name: 'Comandos', value: comandos_de_categoria.length >= 1 ? `>>> *${comandos_de_categoria.filter(c => c !== 'reload.ts')
              .map(c => `\`${c.replace(/.js/, "")}\``).join(" - ")}*`
              : `>>> *Todavía no hay comandos en esta categoría...*`
          })
          .setFooter({ text: `@alyduhh`, iconURL: client.users.cache.get(client.ownerIDS[0])?.displayAvatarURL() });

        const firstRow = interaction.message.components[0] as any
          ; (firstRow.components[0] as StringSelectMenuComponent).options?.forEach(o => {
            if (o.value === interaction.values[0]) o.default = true
            else o.default = false
          })
        await interaction.editReply({ embeds: [embed], components: interaction.message.components })
      }
    } else if (interaction.isModalSubmit()) {

      if (interaction.customId.startsWith("mdlEditSelmData_") || interaction.customId.startsWith("mdlEditSelmOption_")) {

        client.selectmenus = await selectmenuModel.find({}).exec()
        const modalCustomId = interaction.customId.replace(/^mdlEditSelmData_/, '').replace(/^mdlEditSelmOption_/, '')
        const [customIdValue, rawOptionValue] = modalCustomId.includes('::') ? modalCustomId.split('::') : [modalCustomId, undefined]
        const resolvedCustomId = customIdValue.startsWith('arselm#') ? customIdValue : `arselm#${customIdValue}`
        let selmData = { customId: resolvedCustomId, guildId: interaction.guildId }
        const selectmenu = client.selectmenus.filter(s => s.guildId === interaction.guildId).find(s => s.customId === resolvedCustomId)

        if (interaction.customId.startsWith("mdlEditSelmData_")) {

          if (selectmenu) {
            const placeholder = interaction.fields.getTextInputValue('txtSelmPlaceholder')
            const minvalues = interaction.fields.getTextInputValue('txtSelmMinValues')
            const maxvalues = interaction.fields.getTextInputValue('txtSelmMaxValues')
            const reply = interaction.fields.getTextInputValue('txtSelmReply')
            const ephemeral = interaction.fields.getTextInputValue('txtEphemeral')

            interface SelectMenuData {
              data?: {
                placeholder?: string
                minValues?: number
                maxValues?: number
              }
              reply?: ArReplyType
              ephemeral?: boolean
            }

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
                return await interaction.message?.edit(`${emotes.error} El campo para especificar si la respuesta será privada sólo acepta valores \`true\` o \`false\``)
              }
            }

            if (typeof minvalues === 'string' || typeof maxvalues === 'string') {
              const parsedMin = minvalues?.trim() ? Number(minvalues) : undefined
              const parsedMax = maxvalues?.trim() ? Number(maxvalues) : undefined

              if (minvalues && maxvalues && parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
                return await interaction.message?.edit(`${emotes.error} El número mínimo de opciones seleccionables debe ser menor al número máximo`)
              }
              if (minvalues && minvalues.trim() && isNaN(Number(minvalues))) {
                return await interaction.message?.edit(`${emotes.error} El número mínimo de opciones seleccionables no es un número válido`)
              }
              if (maxvalues && maxvalues.trim() && isNaN(Number(maxvalues))) {
                return await interaction.message?.edit(`${emotes.error} El número máximo de opciones seleccionables no es un número válido`)
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
                  ar = await client.functions.createAutoresponder(interaction as ExtendedInteraction, reply)
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
              await updateSelectMenuPreview(`${emotes.check} Datos de menú de selección actualizados`, selectmenuf)
            }
          }
        } else {
          if (selectmenu && selectmenu.data.options && selectmenu.data.options.length) {
            const encodedOptionValue = rawOptionValue ? decodeURIComponent(rawOptionValue) : undefined
            let opt = selectmenu.data.options?.find(o => o.value === encodedOptionValue)

            if (opt) {
              let option: GSelectMenuOption = { index: opt.index, label: opt.label, value: opt.value }

              const emoji = interaction.fields.getTextInputValue('txtSelmOptionEmoji')
              const label = interaction.fields.getTextInputValue('txtSelmOptionLabel')
              const desc = interaction.fields.getTextInputValue('txtSelmOptionDesc')
              const reply = interaction.fields.getTextInputValue('txtSelmOptionReply')

              if (emoji || label || desc || reply) {
                if (emoji && !emoji.match(/^:.*?:$|^<a?:.*?:\d+>$/) && !emoji.match(/[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/u))
                  return await interaction.reply({
                    content: `${emotes.error} El emoji ingresado no es válido. Intenta ingresar uno con los siguientes formatos: \`:emoji:\` \`<emoji:id>\` o un emoji unicode: \\🤍`,
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
                      ar = await client.functions.createAutoresponder(interaction as ExtendedInteraction, reply)
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
                  await updateSelectMenuPreview(`${emotes.check} Opción actualizada`, selectmenuf)
                }
              }
            } else console.log('interactionCreate.ts > mdlEditSelmOption > opt has no data')
          }
        }
      }
    }
  })
