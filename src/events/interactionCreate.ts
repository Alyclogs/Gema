import { ActionRowBuilder, AutocompleteInteraction, ButtonBuilder, ChatInputCommandInteraction, ColorResolvable, CommandInteractionOptionResolver, ComponentEmojiResolvable, EmbedBuilder, ModalActionRowComponentBuilder, ModalBuilder, PermissionResolvable, StringSelectMenuBuilder, StringSelectMenuComponent, TextInputBuilder, TextInputStyle, time } from 'discord.js';
import ExtendedInteraction from '../typing/ExtendedInteraction';
import { Event } from '../typing/Event';
import Bot from '../structures/Bot';
import { ArReplyType, Autoresponder, GButton, GSelectMenuOption, selectmenuModel } from '../models/gema-models';
import { readdirSync } from 'fs';

export default new Event({
  name: "interactionCreate",
  once: false
},
  async (client: Bot, interaction: ExtendedInteraction) => {
    if (!interaction.guild) return
    const { emotes, timeouts } = client
    if (!interaction.channel) return
    client.functions.setInput(interaction)

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
      const { executeReply } = client.functions

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
            await executeReply(button.reply, interaction).catch(async (e: Error) => await interaction.channel.send(`${client.emotes.error} ${e}`))
          } else {
            await interaction.deferReply()
            await executeReply(button.reply, interaction).catch(async (e: Error) => await interaction.channel.send(`${client.emotes.error} ${e}`))
          }
        } else {
          await interaction.deferUpdate()
          //await interaction.reply({ content: `${emotes.error} Este botón aun no tiene asignada una respuesta. Asígnale una con /button edit reply ${button.name}`, ephemeral: true })
        }
      }
    } else if (interaction.isStringSelectMenu()) {

      client.selectmenus = await selectmenuModel.find({}).exec()
      let selectmenu = client.selectmenus.find(s => s.customId === interaction.customId)
      const { executeReply } = client.functions

      if (selectmenu) {
        if (selectmenu.customId.startsWith('editing_')) {

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
              .setCustomId(`mdlEditSelmOption_${selectmenu.customId}_${option?.value}`)
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
          if (selectmenu.reply) {
            if (selectmenu.ephemeral) {
              await interaction.deferReply({ ephemeral: true })
              await executeReply(selectmenu.reply, interaction).catch(async (e: Error) => await interaction.channel.send(`${client.emotes.error} ${e}`))
            } else {
              await interaction.deferReply()
              await executeReply(selectmenu.reply, interaction).catch(async (e: Error) => await interaction.channel.send(`${client.emotes.error} ${e}`))
            }
          } else if (selectmenu.data.options?.some(o => o.reply)) {
            for (let sel in interaction.values) {
              let opc = selectmenu.data.options?.find(o => o.value == sel)

              if (opc && opc.reply) {
                await interaction.deferReply()
                await executeReply(opc.reply, interaction).catch(async (e: Error) => await interaction.channel.send(`${client.emotes.error} ${e}`))
              } else {
                await interaction.deferUpdate()
              }
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

        (interaction.message.components[0].components[0] as StringSelectMenuComponent).options?.forEach(o => {
          if (o.value === interaction.values[0]) o.default = true
          else o.default = false
        })
        await interaction.editReply({ embeds: [embed], components: interaction.message.components })
      }
    } else if (interaction.isModalSubmit()) {

      const { createAutoresponder } = client.functions
      if (interaction.customId.startsWith("mdlEditSelmData_") || interaction.customId.startsWith("mdlEditSelmOption_")) {

        client.selectmenus = await selectmenuModel.find({}).exec()
        let ids = interaction.customId.split('_')
        let custom_id = ids[1].trim()
        let selmData = { customId: `arselm#${custom_id}`, guildId: interaction.guildId }
        const selectmenu = client.selectmenus.filter(s => s.guildId === interaction.guildId).find(s => s.customId === `arselm#${custom_id}`)

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
                minvalues?: number
                maxvalues?: number
              }
              reply?: ArReplyType
              ephemeral?: boolean
            }

            const dataToEdit: SelectMenuData = {}
            if (placeholder || minvalues || maxvalues || reply) {
              dataToEdit.data = {}

              if (placeholder) {
                dataToEdit.data.placeholder = placeholder
              }
              if (ephemeral && !(ephemeral === 'true' || ephemeral === 'false')) return await interaction.message?.edit(`${emotes.error} El campo para especificar si la respuesta será privada sólo acepta valores \`true\` o \`false\``)
              if (ephemeral === 'true') dataToEdit.ephemeral = true
              if (minvalues || maxvalues) {
                if (minvalues > maxvalues) return await interaction.message?.edit(`${emotes.error} El número mínimo de opciones seleccionables debe ser menor al número máximo`)
                if (minvalues && isNaN(Number(minvalues))) return await interaction.message?.edit(`${emotes.error} El número mínimo de opciones seleccionables no es un número válido`)
                if (maxvalues && isNaN(Number(maxvalues))) return await interaction.message?.edit(`${emotes.error} El número máximo de opciones seleccionables no es un número válido`)

                if (minvalues && !isNaN(Number(minvalues))) {
                  dataToEdit.data.minvalues = Number(minvalues)
                }
                if (maxvalues && !isNaN(Number(maxvalues))) {
                  dataToEdit.data.maxvalues = Number(maxvalues)
                }
              }
              if (reply) {
                let ar: Autoresponder | undefined = undefined

                try {
                  ar = await createAutoresponder(interaction as ExtendedInteraction, reply)
                } catch (e) { return interaction.editReply(`${e}`) }

                if (ar) dataToEdit.reply = ar.arReply
              }
              console.log(dataToEdit)
              await selectmenuModel.updateOne(selmData, dataToEdit)
            }

            const selectmenuf = await selectmenuModel.findOne(selmData)

            if (selectmenuf) {
              let prevSelm = new StringSelectMenuBuilder()
                .setCustomId(selectmenuf.customId)
              if (selectmenuf.data.minValues) prevSelm.setMinValues(selectmenuf.data.minValues)
              if (selectmenuf.data.maxValues) prevSelm.setMaxValues(selectmenuf.data.maxValues)
              if (selectmenuf.data.placeholder) prevSelm.setPlaceholder(selectmenuf.data.placeholder)
              if (selectmenuf.data.options?.length) {
                prevSelm.setOptions(selectmenuf.data.options)
              } else {
                prevSelm.addOptions([{ label: "Opción de ejemplo", value: "opcion1", description: "Descripción de ejemplo" }])
              }

              await interaction.deferUpdate()
              await interaction.message?.edit({
                content: `${emotes.check} Datos de menú de selección actualizados`,
                components: [
                  new ActionRowBuilder<StringSelectMenuBuilder>()
                    .setComponents([prevSelm]),
                  new ActionRowBuilder<ButtonBuilder>()
                    .setComponents([
                      (client.buttons.get('btnEditSelmData') as GButton).getButton(),
                      (client.buttons.get('btnEditSelmOptions') as GButton).getButton()
                    ])
                ]
              })
            }
          }
        } else {
          if (selectmenu && selectmenu.data.options && selectmenu.data.options.length) {
            let opt = selectmenu.data.options?.find(o => o.value === `${ids[3]}_${ids[4]}`)

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

                if (emoji) option.emoji = emoji
                option.index = opt.index || 1
                if (label) {
                  option.label = label
                  option.value = `${label}_${opt.index || 1}`
                }
                if (desc) option.description = desc
                if (reply) {
                  let ar: Autoresponder | undefined = undefined

                  try {
                    ar = await createAutoresponder(interaction as ExtendedInteraction, reply)
                  } catch (e) { return interaction.reply(`${e}`) }

                  if (ar) option.reply = ar.arReply
                }

                const optionIndex = selectmenu.data.options.findIndex(opt => opt.value === option.value);

                if (optionIndex !== -1) {
                  selectmenu.data.options[optionIndex] = option;
                }
                await selectmenuModel.updateOne(selmData, { "data.options": selectmenu.data.options })

                const selectmenuf = await selectmenuModel.findOne(selmData)

                if (selectmenuf) {
                  let prevSelm = new StringSelectMenuBuilder()
                    .setCustomId(selectmenuf.customId)
                  if (selectmenuf.data.minValues) prevSelm.setMinValues(selectmenuf.data.minValues)
                  if (selectmenuf.data.maxValues) prevSelm.setMaxValues(selectmenuf.data.maxValues)
                  if (selectmenuf.data.placeholder) prevSelm.setPlaceholder(selectmenuf.data.placeholder)
                  if (selectmenuf.data.options?.length) {
                    prevSelm.setOptions(selectmenuf.data.options)
                  } else {
                    prevSelm.addOptions([{ label: "Opción de ejemplo", value: "opcion1", description: "Descripción de ejemplo" }])
                  }

                  await interaction.deferUpdate()
                  await interaction.message?.edit({
                    content: `${emotes.check} Datos de menú de selección actualizados`,
                    components: [
                      new ActionRowBuilder<StringSelectMenuBuilder>()
                        .setComponents([prevSelm]),
                      new ActionRowBuilder<ButtonBuilder>()
                        .setComponents([
                          (client.buttons.get('btnEditSelmData') as GButton).getButton(),
                          (client.buttons.get('btnEditSelmOptions') as GButton).getButton()
                        ])
                    ]
                  })
                }
              }
            } else console.log('interactionCreate.ts > mdlEditSelmOption > opt has no data')
          }
        }
      }
    }
  })
