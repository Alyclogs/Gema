import { AutocompleteInteraction, ChatInputCommandInteraction, Collection, ColorResolvable, CommandInteractionOptionResolver, EmbedBuilder, PermissionResolvable, time } from 'discord.js';
import ExtendedInteraction from '../typing/ExtendedInteraction';
import { Event } from '../typing/Event';
import Bot from '../structures/Bot';
import { isNsfwChannel } from '../util/isNsfwChannel';
import { dispatchUserSelectMenu } from '../helpers/interactions/userSelectMenuDispatch';

export default new Event({
  name: "interactionCreate",
  once: false
},
  async (client: Bot, interaction: ExtendedInteraction) => {
    if (!interaction.guild) return
    const { emotes } = client
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

      if (!client.cooldowns.has(commandName)) {
        client.cooldowns.set(commandName, new Collection())
      }
      const now = Date.now()
      const commandCooldowns = client.cooldowns.get(commandName)!
      const cooldownAmount = (command.cooldown || 0) * 1000

      if (commandCooldowns.has(interaction.user.id)) {
        const expirationTime = commandCooldowns.get(interaction.user.id)! + cooldownAmount
        if (now < expirationTime) {
          return interaction.reply({
            content: `${emotes['hmph']} Estás yendo muy rápido! Podrás volver a ejecutar este comando ${time(Math.round(expirationTime / 1000), 'R')}`,
            allowedMentions: { repliedUser: false }
          })
        }
      }
      commandCooldowns.set(interaction.user.id, now)
      setTimeout(() => commandCooldowns.delete(interaction.user.id), cooldownAmount)

      try {
        await command.run({
          args: interaction.options as CommandInteractionOptionResolver,
          client: client,
          interaction: interaction as ChatInputCommandInteraction,
          color: client.color as ColorResolvable,
          emojis: client.emotes
        });
      } catch (e: any) {
        if (e?.code === 10062) {
          // Unknown interaction: el token ya expiró (p. ej. el bot se reinició a mitad de la interacción), no hay nada que responder.
          console.error(`Interacción expirada al ejecutar /${commandName}`);
          return;
        }
        console.error(`Error ejecutando /${commandName}:`, e);
        const errorPayload = { content: `${emotes.error} Ocurrió un error al ejecutar este comando.` };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(errorPayload).catch(() => { });
        } else {
          await interaction.reply({ ...errorPayload, ephemeral: true }).catch(() => { });
        }
      }
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

      const resolvedButton = client.resolveButton(interaction.customId)

      if (resolvedButton) {
        const { button, params } = resolvedButton

        if (button.run) {
          try {
            await button.run({
              client: client,
              interaction: interaction,
              color: client.color as ColorResolvable,
              emojis: client.emotes,
              params
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

      const resolvedSelectMenu = client.resolveSelectMenu(interaction.customId)

      if (resolvedSelectMenu) {
        const { selectmenu: globalSelectmenu, params } = resolvedSelectMenu

        if (globalSelectmenu.run) {
          try {
            await globalSelectmenu.run({
              client: client,
              interaction: interaction,
              color: client.color as ColorResolvable,
              emojis: client.emotes,
              params
            })
          } catch (e) {
            await interaction.channel.send(`${client.emotes.error} ${e}`)
          }
          return
        }
      }

      await dispatchUserSelectMenu(client, interaction)
    } else if (interaction.isModalSubmit()) {

      const resolvedModal = client.resolveModal(interaction.customId)

      if (resolvedModal) {
        const { modal, params } = resolvedModal

        if (modal.run) {
          try {
            await modal.run({
              client: client,
              interaction: interaction,
              color: client.color as ColorResolvable,
              emojis: client.emotes,
              params
            })
          } catch (e) {
            await interaction.channel.send(`${client.emotes.error} ${e}`)
          }
        }
      }
    }
  })
