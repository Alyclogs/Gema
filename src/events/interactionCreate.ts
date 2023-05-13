import { AutocompleteInteraction, ChatInputCommandInteraction, Client, ColorResolvable, CommandInteractionOptionResolver, PermissionResolvable, PermissionsBitField, time } from 'discord.js';
import ExtendedInteraction from '../typing/ExtendedInteraction';
import { Event } from '../typing/Event';
import Bot from '../structures/Bot';

export default new Event({
  name: "interactionCreate",
  once: false
},
  async (client: Bot, interaction: ExtendedInteraction) => {
    if (!interaction.guild) return
    const { emotes, timeouts } = client

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
    }
  })
