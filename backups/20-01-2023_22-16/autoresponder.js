const { Client, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, PermissionsBitField } = require('discord.js')
const autoresponderModel = require('../../utility/models/autoresponder-model.js')
const { arstructure } = require('../../utility/structures/Autoresponder.js')
const { Perms } = require('../../utility/validation/Permissions.js')
const { ErrorCodes } = require('../../utility/Errors')
const getVars = require('../../utility/structures/getVars.js')
const { interactionVariables } = require('../../utility/structures/Variables.js')
const { createEmbedPagination } = require('../../utility/structures/Pagination')

function testArg(arg) {
  return /\[\$\d+\]/.test(arg) || /\[\$\d+\-\d+\]/.test(arg) || /\[\$\d+\+\]/.test(arg) || /\{(.*)\}/.test(arg)
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoresponder')
    .setDescription('autoresponder fase de desarrollo')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Crear un nuevo autoresponder')
        .addStringOption(option => option.setName('trigger').setDescription('el trigger para tu autoresponder').setRequired(true))
        .addStringOption(option => option.setName('reply').setDescription('La respuesta del autoresponder').setRequired(true))
        .addStringOption(option => option.setName('matchmode').setDescription('Especifica el modo de coincidencia del autoresponder').addChoices(
          { name: 'exacto', value: 'exactmatch' },
          { name: 'al comienzo', value: 'startswith' },
          { name: 'al final', value: 'endswith' },
          { name: 'incluye', value: 'includes' }
        ).setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edita un autoresponder')
        .addStringOption(option => option.setName('trigger').setDescription('el trigger para tu autoresponder').setRequired(true).setAutocomplete(true))
        .addStringOption(option => option.setName('reply').setDescription('La respuesta del autoresponder').setRequired(true))
        .addStringOption(option => option.setName('matchmode').setDescription('Especifica el modo de coincidencia del autoresponder').addChoices(
          { name: 'exacto', value: 'exactmatch' },
          { name: 'al comienzo', value: 'startswith' },
          { name: 'al final', value: 'endswith' },
          { name: 'incluye', value: 'includes' }
        ).setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Elimina un autoresponder')
        .addStringOption(option => option.setName('trigger').setDescription('el trigger del autoresponder a eliminar').setRequired(true).setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Lista los autoresponders existentes')),

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */

  async autocomplete(interaction, client, color, emojis) {

    client.autoresponders = []
    const ars = await autoresponderModel.find({}).exec()
    ars.forEach((ar) => {
      client.autoresponders.push(ar)
    })

    const artriggers = client.autoresponders.map(function (ar) {
      if (ar.guildId === interaction.guild.id) {
        return ar.arTrigger.triggerkey
      }
    })

    try {
      const focusedValue = interaction.options.getFocused()
      const filtered = artriggers.filter(choice => choice.startsWith(focusedValue))
      await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })))

    } catch (e) {
      console.log(`a: ${e}`)
    }
  },


  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, color, emojis) {
    await interaction.deferReply()

    const subcommand = interaction.options.getSubcommand()
    const trigger = interaction.options.getString('trigger')
    const reply = interaction.options.getString('reply')
    const matchmode = interaction.options.getString('matchmode')

    client.autoresponders = []
    const ars = await autoresponderModel.find({}).exec()
    ars.forEach((autr) => { client.autoresponders.push(autr) })
    let ErrorsArr = []

    const arTrigger = arstructure.arTrigger
    const arReply = arstructure.arReply
    arTrigger.triggerkey = trigger
    arReply.replymessage = reply
    arReply.rawreply = reply

    const embed = new EmbedBuilder()
      .setColor(color)
    var previewReply = ""

    if (subcommand === 'remove') {
      await autoresponderModel.deleteOne({ guildId: interaction.guild.id, 'arTrigger.triggerkey': trigger })
      return interaction.editReply(`${emojis['check']} | El autoresponder **${trigger}** fue eliminado correctamente`)
    }

    if (subcommand === 'list') {
      let artriggers = client.autoresponders.map(function(autr) {
        return `${emojis['dot']} ${autr.arTrigger.triggerkey}`
      })
      let embeds = [], sliced = []

      for (let i = 0; i < artriggers.length; i += 10) {
        sliced.push(artriggers.slice(i, i + 10))
      }

      sliced.forEach(autrs => {
        let emb = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTitle('Lista de autoresponders')
        .setDescription(autrs.join('\n'))
        embeds.push(emb)
      })
      return createEmbedPagination(interaction, embeds)
    }

    const varis = interactionVariables(interaction)
    const vars = reply.match(/\{(.*)\}/).concat(reply.match(/\{\w+\:(.*)\}/))

    if (reply.includes('requireuser')) {
      arReply.requireuserid = []
      const usersrequired = reply.match(/{requireuser:(.*)}/g)
      if (usersrequired) {
        for (let user of usersrequired) {
          user = user.replace(/[\\<>@#&!]/g, "").trim()
          if (!interaction.guild.members.cache.get(user) && !testArg(user)) {
            ErrorsArr.push(ErrorCodes.INVALID_USER_ERROR)
            break
          }
          arReply.requireuserid.push(user)
        }
      }
    }
    if (reply.includes('sendto')) {
      const wheretosend = reply.match(/{sendto:(.*)}/g)
      for (let channel of wheretosend) {
        channel = channel.replace(/[\\<>@#&!]/g, "").trim()
        if (!interaction.guild.channels.cache.get(channel) && !testArg(channel)) {
          ErrorsArr.push(ErrorCodes.INVALID_CHANNEL_ERROR)
          break
        } else {
          arReply.wheretosend = channel
        }
      }
    }
    if (reply.includes('requirechannel')) {
      arReply.requiredchannel = []
      const channelid = reply.match(/{requirechannel:(.*)}/g)
      for (let channel of channelid) {
        channel = channel.replace(/[\\<>@#&!]/g, "").trim()
        if (!interaction.guild.channels.cache.get(channel) && !testArg(channel)) {
          ErrorsArr.push(ErrorCodes.INVALID_CHANNEL_ERROR)
          break
        } else {
          arReply.requiredchannel.push(channel)
        }
      }
    }
    if (reply.includes('denychannel')) {
      arReply.denychannel = []
      const channelid = reply.match(/{denychannel:(.*)}/g)
      for (let channel of channelid) {
        channel = channel.replace(/[\\<>@#&!]/g, "").trim()
        if (!interaction.guild.channels.cache.get(channel) && !testArg(channel)) {
          ErrorsArr.push(ErrorCodes.INVALID_CHANNEL_ERROR)
          break
        } else {
          arReply.denychannel.push(channel)
        }
      }
    }
    if (reply.includes('requirerole')) {
      arReply.requiredrole = []
      const roleid = reply.match(/{requirerole:(.*)}/g)
      for (let role of roleid) {
        role = role.replace(/[\\<>@#&!]/g, "").trim()
        if (!interaction.guild.roles.cache.get(role) && !testArg(role)) {
          ErrorsArr.push(ErrorCodes.INVALID_ROLE_ERROR)
          break
        } else {
          arReply.requiredrole.push(role)
        }
      }
    }
    if (reply.includes('denyrole')) {
      arReply.denyrole = []
      const roleid = reply.match(/{denyrole:(.*)}/g)
      for (let role of roleid) {
        role = role.replace(/[\\<>@#&!]/g, "").trim()
        if (!interaction.guild.roles.cache.get(role) && !testArg(role)) {
          ErrorsArr.push(ErrorCodes.INVALID_ROLE_ERROR)
          break
        } else {
          arReply.denyrole.push(role)
        }
      }
    }
    if (reply.includes('embed')) {
      arReply.replytype = 'embed'
      const embedcolors = reply.match(/{embed:(.*)}/g)
      if (embedcolors) {
        for (let color of embedcolors) {
          color = color.trim()
          console.log(color)
          if (!/^#([0-9a-f]{6})/i.test(color) && !testArg(color)) {
            ErrorsArr.push(ErrorCodes.INVALID_EMBED_DATA_ERROR)
            break
          } else {
            arReply.embedcolor = color
          }
        }
      }
      if (reply.replace('{embed}', '').trim() === "" && arReply.embedcolor === "") ErrorsArr.push(ErrorCodes.INVALID_EMBED_DATA_ERROR)
    }
    if (reply.includes('react')) {
      arTrigger.reactionemojis = []
      const remojis = reply.match(/{react:(.*)}/g)
      for (let e of remojis) {
        arTrigger.reactionemojis.push(e)
      }
    }
    if (reply.includes('reactreply')) {
      arReply.reactionemojis = []
      const remojis = reply.match(/{reactreply:(.*)}/g)
      for (let e of remojis) {
        if (!client.emojis.cache.find((emoji) => emoji.toString() === e) && !testArg(e)) {
          ErrorsArr.push(ErrorCodes.REACTION_ERROR)
          break
        } else {
          arReply.reactionemojis.push(e)
        }
      }
    }
    if (reply.includes('delete_reply')) {
      arReply.autodelete.value = true
      const time = reply.match(/{delete_reply:(.*)}/g)[0]
      if (time) {
        arReply.autodelete.time = time * 1000
      }
    }

    for (let i = 0; i < vars.length; i++) {
      switch (vars[i]) {
        case 'delete': {
          arTrigger.autodelete = true
          break
        }
        case 'dm': {
          arReply.wheretosend = 'user_dm'
          break
        }
      }
    }
    previewReply = arReply.replymessage

    for (let i = 0; i < vars.length; i++) {
      const varf = varis.find(varb => varb.name === `{${vars[i]}}`)
      if (!varf) {
        arReply.replymessage = arReply.replymessage.replace(`{${vars[i]}}`, '')
        previewReply = arReply.replymessage.replace(`{${vars[i]}}`, '')
      } else {
        previewReply = previewReply.replace(varf.name, varf.value)
      }
    }
    arReply.replymessage = arReply.replymessage.trim()

    if (ErrorsArr.length == 0) {
      const ar = {
        guildId: interaction.guild.id,
        arTrigger: arTrigger,
        arReply: arReply,
        matchmode: matchmode
      }

      const requiredusers = arReply.requireuserid.length == 0 ? 'ninguno requerido' : arReply.requireuserid.map((rus) => `<@${rus}>`
      ).join('\n')

      const reqdenychannels = arReply.requiredchannel.length == 0 && arReply.denychannel.length == 0 ? 'ninguno requerido' :
        arReply.requiredchannel.map(function (rch, index) {
          if (index > 0) {
            return `ó <#${rch}>`
          } else {
            return `<#${rch}>`
          }
        }).join('\n') + arReply.denychannel.map(function (dch, index) {
          if (index == 0 && arReply.requiredchannel.length > 0) {
            return `\nNO <#${dch}>`
          }
          if (index == 0 && arReply.requiredchannel.length == 0) {
            return `NO <#${dch}>`
          }
          if (index > 0) {
            return `ó <#${dch}>`
          }
        }).join('\n')

      const requiredperms = arReply.requiredperm.length == 0 ? 'ninguno requerido' :
        arReply.requiredperm.map(function (rpe, index) {
          if (index > 0) {
            return `ó \`${rpe}\``
          } else {
            return `\`${rpe}\``
          }
        })

      const reqdenyroles = arReply.requiredrole.length == 0 && arReply.denyrole.length == 0 ?
        'ninguno requerido' : arReply.requiredrole.map(function (rrl, index) {
          if (index > 0) {
            return `ó <@&${rrl}>`
          } else {
            return `<@&${rrl}>`
          }
        }).join('\n') + arReply.denyrole.map(function (drl, index) {
          if (index == 0 && arReply.requiredchannel.length > 0) {
            return `\nNO <@&${drl}>`
          }
          if (index == 0 && arReply.requiredchannel.length == 0) {
            return `NO <@&${drl}>`
          }
          if (index > 0) {
            return `ó <@&${drl}>`
          }
        }).join('\n')

      if (arReply.rawreply === "") {
        return interaction.editReply(`${emojis['hmph']} | ${ErrorCodes.EMPTY_RESPONSE_ERROR}`)
      } else {
        if (subcommand === 'add') {
          const arf = client.autoresponders.find(autr => autr.guildId === interaction.guild.id && autr.arTrigger.triggerkey === arTrigger.triggerkey)
          if (arf) {
            return interaction.editReply({
              content: `${emojis['hmph']} | ${ErrorCodes.AUTORESPONDER_ALREADY_EXISTS}`,
            })
          } else {
            autoresponderModel.create(ar)
            client.autoresponders.push(ar)
            embed.setTitle(`${emojis['angel']} | Nuevo autoresponder`)
          }
        }
        if (subcommand === 'edit') {
          await autoresponderModel.replaceOne(({ guildId: interaction.guild.id, 'arTrigger.triggerkey': arTrigger.triggerkey }), ar)
          embed.setTitle(`${emojis['angel']} | Autoresponder editado`)
        }

        embed.setDescription('A continuación, se muestran los datos del autoresponder')
        embed.addFields(
          { name: 'Trigger', value: arTrigger.triggerkey, inline: true },
          { name: 'Match mode', value: ar.matchmode, inline: true },
          { name: 'Tipo de respuesta', value: arReply.replytype, inline: true },
          { name: 'Requiere usuarios específicos?', value: requiredusers, inline: true },
          { name: 'Requiere/Niega un canal específico?', value: reqdenychannels, inline: true },
          { name: 'Requiere/Niega algún rol?', value: reqdenyroles, inline: true },
          { name: 'Requiere algún permiso?', value: requiredperms, inline: true },
          { name: 'Es un mensaje directo?', value: arReply.wheretosend === 'user_dm' ? 'Sí' : 'No', inline: true },
          { name: 'Se auto-elimina?', value: `Trigger: ${ar.arTrigger.autodelete ? 'Sí' : 'No'}` + `\nReply: ${arReply.autodelete.value ? 'Sí' : 'No'}`, inline: true })

        if (previewReply) {
          embed.addFields({ name: 'Respuesta', value: previewReply })
        }
        embed.addFields({ name: 'Respuesta sin formato', value: `\`\`\`${arReply.rawreply}\`\`\`` })

        await interaction.editReply({ embeds: [embed] })
      }
    } else {
      await interaction.editReply({
        embeds: [embed.setTitle(`${emojis['error']}  Tienes algunos errores en tu autoresponder:`)
          .setDescription(`${ErrorsArr.map(er => er = emojis['dot'] + ' `' + er + '`').join('\n')}`)]
      })
    }
  }
}