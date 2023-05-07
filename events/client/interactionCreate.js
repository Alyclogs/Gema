const { color } = require('../../config.json');
const { InteractionType, ChatInputCommandInteraction, Client, time, EmbedBuilder } = require('discord.js');
const emojis = require('../../utility/data/emojis.json')
const { readdirSync } = require('fs');

module.exports = {
  name: 'interactionCreate',
  /**
   * 
   * @param {ChatInputCommandInteraction} interaction 
   * @param {Client} client 
   */
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const { slashCommands } = client;
      const { commandName, member, guild } = interaction;
      const command = slashCommands.get(commandName);
      if (!command) return;

      if (command.memberperms?.length > 0 && !(command.memberperms.every(p => member.permissions.has(p.flag)))) {
        let permsFaltantes = command.memberperms.filter(dmp => !member.permissions.has(dmp.flag)).map(dmp => `\`${dmp.perm}\``).join(', ')
        return interaction.reply({
          content: `${emojis['error']} No tienes suficientes permisos para ejecutar este comando\nPermisos faltantes: ${permsFaltantes}`,
          ephemeral: true
        })
      }
      if (command.botperms?.length > 0 && !(command.botperms.every(p => guild.members.me.permissions.has(p.flag)))) {
        let permsFaltantes = command.botperms.filter(dmp => !guild.members.me.permissions.has(dmp.flag)).map(dmp => `\`${dmp.perm}\``).join(', ')
        return interaction.reply({
          content: `${emojis['error']} No tengo suficientes permisos para ejecutar este comando\nPermisos faltantes: ${permsFaltantes}`,
          ephemeral: true
        })
      }

      const cooldownData = `${interaction.user.id}_cmd:${commandName}`
      const timesc = Math.floor(Date.now() / 1000)
      const timeout = command.timeout || 0

      if (client.timeouts.has(cooldownData)) {
        const expirationTime = client.timeouts.get(cooldownData) + timeout
        if (timesc < expirationTime) {
          return interaction.reply({
            content: `${emojis['hmph']} Estás yendo muy rápido! Podrás volver a ejecutar este comando ${time(expirationTime, 'R')}`,
            allowedMentions: { repliedUser: false }
          })
        }
      }
      client.timeouts.set(cooldownData, timesc)
      setTimeout(() => client.timeouts.delete(cooldownData), timeout * 1000)

      try {
        await command.execute(interaction, client, color, emojis)
      } catch (e) {
        /*
        await interaction.reply({
          content: `${emojis['sweat']} | Oops! No se ha podido ejecutar el comando`,
          ephemeral: true
        })
        */
        console.log(e)
      }
    } else if (interaction.type == InteractionType.ApplicationCommandAutocomplete) {
      const { slashCommands } = client;
      const { commandName } = interaction;
      const command = slashCommands.get(commandName);
      if (!command) return;

      try {
        await command.autocomplete(interaction, client, color, emojis)
      } catch (e) {
        console.log(e)
      }
    } else if (interaction.type == InteractionType.ModalSubmit) {
      const { slashCommands } = client;
      const { commandName } = interaction;
      const command = slashCommands.get(commandName);
      if (!command) return;

      try {
        await command.submit(interaction, client, color, emojis)
      } catch (e) {
        console.log(e)
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === `SelecciónMenuAyuda`) {
        await interaction.deferUpdate()
        let seleccionado = interaction.values[0]
        const comandos_de_categoria = readdirSync(`./commands/msgCommands/${seleccionado}`).filter(archivo => archivo.endsWith('.js'));

        let embed = new EmbedBuilder()
          .setTitle(`${emojis.star} Categoría ${seleccionado}`)
          .setDescription(`Para obtener ayuda sobre un comando: \`gema help comando\``)
          .setColor(client.color)
          .addFields({
            name: 'Comandos', value: comandos_de_categoria.length >= 1 ? `>>> *${comandos_de_categoria.filter(c => c !== 'reload.js')
              .map(c => `\`${c.replace(/.js/, "")}\``).join(" - ")}*`
              : `>>> *Todavía no hay comandos en esta categoría...*`
          })
          .setFooter({ text: `© alys#9411`, iconURL: client.users.cache.get(client.ownerIDS[0]).displayAvatarURL({ dynamic: true }) });

        interaction.message.components[0].components[0].options.forEach(o => {
          if (o.value === interaction.values[0]) o.default = true
          else o.default = false
        })
        await interaction.editReply({ embeds: [embed], components: interaction.message.components })
      }
    }
  }
}