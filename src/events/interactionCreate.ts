import { ActionRowBuilder, AutocompleteInteraction, ButtonBuilder, ButtonComponent, ButtonInteraction, ChatInputCommandInteraction, Client, ColorResolvable, CommandInteractionOptionResolver, ComponentEmojiResolvable, ComponentType, ModalActionRowComponentBuilder, ModalBuilder, PermissionResolvable, PermissionsBitField, SelectMenuComponentOptionData, StringSelectMenuBuilder, StringSelectMenuComponent, TextInputBuilder, TextInputStyle, parseEmoji, time } from 'discord.js';
import ExtendedInteraction from '../typing/ExtendedInteraction';
import { Event } from '../typing/Event';
import Bot from '../structures/Bot';
import { ArReplyType, Autoresponder, GButton, selectmenuModel } from '../models/gema-models';

export default new Event({
  name: "interactionCreate",
  once: false
},
  async (client: Bot, interaction: ExtendedInteraction) => {
    if (!interaction.guild) return
    const { emotes, timeouts } = client
    const { user } = interaction

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
      let button = client.buttons.get(interaction.customId)
      const { executeReply } = (await import('../util/functions'))?.default(client, interaction)

      if (button) {
        if (button.customId === 'btnEditSelmData' || button.customId === 'btnEditSelmOptions') {
          const selectmenu = interaction.message.components[0].components[0] as StringSelectMenuComponent

          if (button.customId === 'btnEditSelmData') {
            const modalEditData = new ModalBuilder()
              .setCustomId(`mdlEditSelmData_${selectmenu.customId}`)
              .setTitle('Datos del menú de selección')
              .setComponents([
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                  .setComponents([
                    new TextInputBuilder()
                      .setCustomId('txtSelmPlaceholder')
                      .setLabel('Texto del menú de selección')
                      .setStyle(TextInputStyle.Short)
                      .setMinLength(3)
                      .setRequired(false)
                      .setPlaceholder('Ejemplo: Seleccione una opción')
                  ]),
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                  .setComponents([
                    new TextInputBuilder()
                      .setCustomId('txtSelmMinValues')
                      .setLabel('Mínimo de opciones seleccionables')
                      .setPlaceholder('Ejemplo: 1')
                      .setMaxLength(2)
                      .setRequired(false)
                      .setStyle(TextInputStyle.Short)
                  ]),
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                  .setComponents([
                    new TextInputBuilder()
                      .setCustomId('txtSelmMaxValues')
                      .setLabel('Máximo de opciones seleccionables')
                      .setPlaceholder('Ejemplo: 1')
                      .setMaxLength(2)
                      .setRequired(false)
                      .setStyle(TextInputStyle.Short)
                  ]),
                new ActionRowBuilder<ModalActionRowComponentBuilder>()
                  .setComponents([
                    new TextInputBuilder()
                      .setCustomId('txtSelmReply')
                      .setLabel('Respuesta general del menú de selección')
                      .setPlaceholder('Ejemplo: Se te añadieron los roles seleccionados!')
                      .setRequired(false)
                      .setStyle(TextInputStyle.Paragraph)
                  ])
              ])

            await interaction.showModal(modalEditData)

          } else {
            const selmToEdit = new StringSelectMenuBuilder()
              .setCustomId(`editing_${selectmenu.customId}`)
              .setMinValues(selectmenu.data.min_values || 1)
              .setMaxValues(selectmenu.data.max_values || 1)
              .setPlaceholder(selectmenu.data.placeholder || "Seleccione una opción")
              .setOptions(selectmenu.data.options)

            await interaction.deferUpdate()
            await interaction.editReply({
              content: 'Selecciona la opción que deseas editar',
              components: [new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([selmToEdit])]
            })
          }

        } else {
          if (button.reply) {
            if (button.ephemeral) {
              await interaction.deferReply({ ephemeral: true })
              await executeReply(button.reply, interaction).catch(async (e) => await interaction.channel.send(`${client.emotes.error} ${e}`))
            } else {
              await interaction.deferReply()
              await executeReply(button.reply, interaction).catch(async (e) => await interaction.channel.send(`${client.emotes.error} ${e}`))
            }
          } else {
            await interaction.deferUpdate()
            //await interaction.reply({ content: `${emotes.error} Este botón aun no tiene asignada una respuesta. Asígnale una con /button edit reply ${button.name}`, ephemeral: true })
          }
        }
      }
    } else if (interaction.isStringSelectMenu()) {

      client.selectmenus = await selectmenuModel.find({}).exec()
      let selectmenu = client.selectmenus.find(s => s.customId = interaction.customId)
      const { executeReply } = (await import('../util/functions'))?.default(client, interaction)

      if (selectmenu) {
        if (selectmenu.customId.startsWith('editing_')) {

          const option = interaction.component.options.find(o => o.value === interaction.values[0])
          const modalEditOption = new ModalBuilder()
            .setCustomId(`mdlEditSelmOption_${selectmenu.customId}_${option?.value}`)
            .setTitle(`Datos de opción ${option?.label}`)
            .setComponents([
              new ActionRowBuilder<ModalActionRowComponentBuilder>()
                .setComponents([
                  new TextInputBuilder()
                    .setCustomId('txtSelmOptionEmoji')
                    .setLabel('Emoji de la opción')
                    .setPlaceholder(`:heart`)
                    .setRequired(false)
                    .setStyle(TextInputStyle.Short)
                ]),
              new ActionRowBuilder<ModalActionRowComponentBuilder>()
                .setComponents([
                  new TextInputBuilder()
                    .setCustomId('txtSelmOptionLabel')
                    .setLabel('Título de la opción')
                    .setPlaceholder(`Opción ${(selectmenu.data.options?.length || 0) + 1}`)
                    .setMinLength(3)
                    .setRequired(false)
                    .setStyle(TextInputStyle.Short)
                ]),
              new ActionRowBuilder<ModalActionRowComponentBuilder>()
                .setComponents([
                  new TextInputBuilder()
                    .setCustomId('txtSelmOptionDesc')
                    .setLabel('Descripción de la opción')
                    .setPlaceholder('Escribe tu descripción')
                    .setMinLength(3)
                    .setMaxLength(1000)
                    .setRequired(false)
                    .setStyle(TextInputStyle.Paragraph)]),
              new ActionRowBuilder<ModalActionRowComponentBuilder>()
                .setComponents([
                  new TextInputBuilder()
                    .setCustomId('txtSelmOptionReply')
                    .setLabel('Respuesta cuando se seleccione la opción')
                    .setPlaceholder(`Se te ha colocado el rol @cumpleaños {addrole:@cumpleaños}`)
                    .setRequired(false)
                    .setStyle(TextInputStyle.Paragraph)
                ])
            ])

          interaction.showModal(modalEditOption)
        }
        if (selectmenu.reply) {
          await executeReply(selectmenu.reply, interaction).catch(async (e) => await interaction.channel.send(`${client.emotes.error} ${e}`))

        } else if (selectmenu.data.options?.some(o => o.reply)) {
          for (let sel in interaction.values) {
            let opc = selectmenu.data.options?.find(o => o.value == sel)

            if (opc && opc.reply) {
              await executeReply(opc.reply, interaction).catch(async (e) => await interaction.channel.send(`${client.emotes.error} ${e}`))
            }
          }
        }
      }
    } else if (interaction.isModalSubmit()) {

      const { createAutoresponder } = (await import('../util/functions'))?.default(client, interaction)

      if (interaction.customId.startsWith("mdlEditSelmData_") || interaction.customId.startsWith("mdlEditSelmOption_")) {

        client.selectmenus = await selectmenuModel.find({}).exec()
        let ids = interaction.customId.split('_')
        let custom_id = ids[1]
        let selmData = { customId: custom_id, guildId: interaction.guildId }
        const selectmenu = client.selectmenus.find(s => s.customId === custom_id)

        if (interaction.customId.startsWith("mdlEditSelmData_")) {
          if (selectmenu) {
            const placeholder = interaction.fields.getTextInputValue('txtSelmPlaceholder')
            const minvalues = interaction.fields.getTextInputValue('txtSelmMinValues')
            const maxvalues = interaction.fields.getTextInputValue('txtSelmMaxValues')
            const reply = interaction.fields.getTextInputValue('txtSelmReply')

            interface SelectMenuData {
              data: {
                placeholder?: string
                minvalues?: number
                maxvalues?: number
                reply?: ArReplyType
              }
            }

            const dataToEdit: SelectMenuData = { data: {} }
            if (placeholder || minvalues || maxvalues) {
              if (placeholder) dataToEdit.data.placeholder = placeholder
              if (minvalues || maxvalues) {
                if (minvalues > maxvalues) return await interaction.message?.edit(`${emotes.error} El número mínimo de opciones seleccionables debe ser menor al número máximo`)
                if (minvalues && isNaN(Number(minvalues))) return await interaction.message?.edit(`${emotes.error} El número mínimo de opciones seleccionables no es un número válido`)
                if (maxvalues && isNaN(Number(maxvalues))) return await interaction.message?.edit(`${emotes.error} El número máximo de opciones seleccionables no es un número válido`)

                if (minvalues && !isNaN(Number(minvalues))) dataToEdit.data.minvalues = Number(minvalues)
                if (maxvalues && !isNaN(Number(maxvalues))) dataToEdit.data.maxvalues = Number(maxvalues)
              }
              if (reply) {
                let ar: Autoresponder | undefined = undefined

                try {
                  ar = await createAutoresponder(interaction as ExtendedInteraction, reply)
                } catch (e) { return interaction.editReply(`${e}`) }

                if (ar) selectmenu.reply = ar.arReply
              }

              await selectmenuModel.updateOne(selmData, dataToEdit)
            }

            let prevSelm = new StringSelectMenuBuilder()
              .setCustomId(selectmenu.customId)
            if (selectmenu.data.minValues) prevSelm.setMinValues(selectmenu.data.minValues)
            if (selectmenu.data.maxValues) prevSelm.setMaxValues(selectmenu.data.maxValues)
            if (selectmenu.data.placeholder) prevSelm.setPlaceholder(selectmenu.data.placeholder)
            if (selectmenu.data.options?.length) {
              prevSelm.setOptions(selectmenu.data.options)
            } else {
              prevSelm.addOptions([{ label: "Opción de ejemplo", value: "opcion1", description: "Descripción de ejemplo" }])
            }

            const gbtn1 = client.buttons.find(b => b.customId === 'btnEditSelmData') as GButton
            const gbtn2 = client.buttons.find(b => b.customId === 'btnEditSelmOptions') as GButton

            await interaction.deferUpdate()
            await interaction.message?.edit({
              content: `${emotes.check} Datos de menú de selección actualizados`,
              components: [
                new ActionRowBuilder<StringSelectMenuBuilder>()
                  .setComponents([prevSelm]),
                new ActionRowBuilder<ButtonBuilder>()
                  .setComponents([
                    new ButtonBuilder().setCustomId(gbtn1.customId).setStyle(gbtn1.data.style)
                      .setLabel(gbtn1.data.label).setEmoji(gbtn1.data.emoji as ComponentEmojiResolvable),
                    new ButtonBuilder().setCustomId(gbtn2.customId).setStyle(gbtn2.data.style)
                      .setLabel(gbtn2.data.label).setEmoji(gbtn2.data.emoji as ComponentEmojiResolvable)
                  ])
              ]
            })
          }
        } else {
          if (selectmenu && selectmenu.data.options && selectmenu.data.options.length) {
            let option = selectmenu.data.options?.find(o => o.value === ids[2])

            if (option) {
              const emoji = interaction.fields.getTextInputValue('txtSelmOptionEmoji')
              const label = interaction.fields.getTextInputValue('txtSelmOptionLabel')
              const desc = interaction.fields.getTextInputValue('txtSelmOptionDesc')
              const reply = interaction.fields.getTextInputValue('txtSelmOptionReply')

              if (emoji || label || desc || reply) {
                if (!emoji.match(/^:.*?:$|^<a?:.*?:\d+>$/)) return await interaction.message?.edit(`${emotes.error} El emoji ingresado no es válido. Intenta ingresar uno con los siguientes formatos: \`:emoji:\` \`<emoji:id>\`. Puedes hacerlo colocando un \`\\\` ántes del emoji.`)

                if (emoji) option.emoji = emoji
                if (label) {
                  option.label = label
                  option.value = label.toLowerCase().replace(/ /g, '_')
                }
                if (desc) option.description = desc
                if (reply) {
                  let ar: Autoresponder | undefined = undefined

                  try {
                    ar = await createAutoresponder(interaction as ExtendedInteraction, reply)
                  } catch (e) { return interaction.editReply(`${e}`) }

                  if (ar) option.reply = ar.arReply

                  for (let opt of selectmenu.data.options) {
                    if (opt.value === option.value) {
                      opt = option
                    }
                  }

                  await selectmenuModel.updateOne(selmData, { "data.options": selectmenu.data.options })
                }
              }
            }
          }
        }
      }
    }
  })
