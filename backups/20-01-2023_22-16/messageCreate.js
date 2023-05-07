const { Client, Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, TextChannel } = require('discord.js')
const emojis = require('../../utility/emojis.json')
const autoresponderModel = require('../../utility/models/autoresponder-model.js')
const { ErrorCodes } = require('../../utility/Errors')
const { arstructure } = require('../../utility/structures/Autoresponder')
const getVars = require('../../utility/structures/getVars.js')
var { messageVariables } = require('../../utility/structures/Variables.js')

module.exports = {
  name: "messageCreate",

  /**
   * @param {Message} message
   * @param {Client} client
   */
  async execute(message, client) {
    const { author, guild, content, channel, partial, member } = message
    var { user, autoresponders } = client

    autoresponders = []
    const ars = await autoresponderModel.find({}).exec()
    ars.forEach((ar) => {
      autoresponders.push(ar)
    });
    const guildars = autoresponders.filter(ar => ar.guildId === message.guild.id)

    if (!guild || author.bot) return
    if (content.includes('@here') || content.includes('@everyone')) return
    if (channel.partial) await channel.fetch();
    if (partial) await message.fetch();

    if (content === `<@${user.id}>`)
      return message.reply({
        content: `Hola ¿Me llamaste? ${emojis['blush']}. Escribe \`/\` y selecciona mi logo para ver todos mis comandos :3`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setURL('https://discord.com/api/oauth2/authorize?client_id=1006741256023588966&permissions=8&scope=bot%20applications.commands')
              .setLabel('Invítame!')
          )]
      })

    var autoresponder = arstructure
    let ErrorsArr = []

    guildars.forEach((guildar) => {
      if (content.includes(guildar.arTrigger.triggerkey)) {
        autoresponder = guildar
        return
      }
    })

    if (guildars.find((autr) => content.includes(autr.arTrigger.triggerkey))) {
      const { arTrigger, arReply } = autoresponder
      var botresponse = arReply.rawreply
      let args = content.slice(arTrigger.triggerkey.length).trim().split(/ +/g)

      const embed = new EmbedBuilder()
        .setColor(client.color)

      var reactionemojis1 = replaceArgs(arTrigger.reactionemojis)
      var embedcolor = replaceArgs(arReply.embedcolor)
      var requireuserid = replaceArgs(arReply.requireuserid)
      var wheretosend = replaceArgs(arReply.wheretosend)
      var requiredchannel = replaceArgs(arReply.requiredchannel)
      var denychannel = replaceArgs(arReply.denychannel)
      var requiredperm = replaceArgs(arReply.requiredperm)
      var requiredrole = replaceArgs(arReply.requiredrole)
      var denyrole = replaceArgs(arReply.denyrole)
      var addrole = replaceArgs(arReply.addrole)
      var removerole = replaceArgs(arReply.removerole)
      var reactionemojis2 = replaceArgs(arReply.reactionemojis)
      var autodeletevalue = replaceArgs(arReply.autodelete.value)
      var autodeletetime = replaceArgs(arReply.autodelete.time)

      var varis = messageVariables(message)
      var vars = getVars.get(botresponse, '{', '}')
      console.log(vars)

      if (vars) {
        vars.forEach(variable => {
          var varf = varis.find(varb => varb.name === variable)
          if (varf) {
            botresponse = botresponse.replace(`{${variable}}`, varf.value)
          } else {
            botresponse = botresponse.replace(`{${variable}}`, '')
          }
        })
      }
      if (embedcolor) try {
        embed.setColor(embedcolor)
      } catch (e) {
      }

      var m
      const ruserok = requireuserid.length == 0 ? true : requireuserid.find((rus) => rus === author.id)
      const rchanelsok = requiredchannel.length == 0 ? true : requiredchannel.find((rch) => rch === channel.id)
      const dchanelsok = denychannel.length == 0 ? true : !denychannel.find((dch) => dch === channel.id)
      const rrolesok = requiredrole.length == 0 ? true : requiredrole.every(role => member.roles.cache.has(role))
      const drolesok = denyrole.length == 0 ? true : !denyrole.every(role => member.roles.cache.has(role))

      if (ruserok && rchanelsok && dchanelsok && rrolesok && drolesok) {
        if (autoresponder.matchmode === 'exactmatch') {
          if (content === arTrigger.triggerkey) {
            m = await enviarMensaje(arReply.replytype, wheretosend)
            reactMessage(message, m, reactionemojis1, reactionemojis2)
          }
        } else {
          let keys = botresponse.match(/\[\$\d+\]|\[\$\d+\-\d+\]|\[\$\d+\+\]/g)
          if (keys) {
            keys.forEach((key) => {
              var replaced = replaceKey(key)
              botresponse = botresponse.replace(key, replaced)
            })
          }
          botresponse = botresponse.replace(/\\n/g, '\n')
          
          if (autoresponder.matchmode === 'startswith') {
            if (content.startsWith(arTrigger.triggerkey)) {
              m = await enviarMensaje(arReply.replytype, wheretosend)
              reactMessage(message, m, reactionemojis1, reactionemojis2)
            }
          }
          if (autoresponder.matchmode === 'endswith') {
            if (content.endsWith(arTrigger.triggerkey)) {
              m = await enviarMensaje(arReply.replytype, wheretosend)
              reactMessage(message, m, reactionemojis1, reactionemojis2)
            }
          }
          if (autoresponder.matchmode === 'includes') {
            if (content.includes(arTrigger.triggerkey)) {
              m = await enviarMensaje(arReply.replytype, wheretosend)
              reactMessage(message, m, reactionemojis1, reactionemojis2)
            }
          }
        }
        if (arTrigger.autodelete) {
          message.delete()
        }
        if (m && autodeletevalue) {
          if (autodeletetime) {
            m.delete(autodeletetime)
          } else {
            m.delete()
          }
        }
      }

      function enviarMensaje(tipo, where) {
        if (botresponse && where) {
          where = where.replace(/[\\<>@#&!]/g, "")
          if (where === 'current_channel') {
            if (tipo === 'message')
              return channel.send({
                content: botresponse
              })
            else return channel.send({
              embeds: [embed.setDescription(botresponse)]
            })
          }
          if (where !== 'user_dm' && where !== 'current_channel') {
            if (tipo === 'message')
              return client.channels.fetch(where).then(chnl => chnl.send({
                content: botresponse
              }))
            else return client.channels.fetch(where).then(chnl => chnl.send({
              embeds: [embed.setDescription(botresponse)]
            }))
          }
          if (where === 'user_dm') {
            if (tipo === 'message')
              return author.send({
                content: `Autoresponder de **${guild.name}**\n\n${botresponse}`
              })
            else return author.send({
              content: `Autoresponder de ${guild.name}\n`,
              embeds: [embed.setDescription(botresponse)]
            })
          }
        }
      }

      function reactMessage(m1, m2, reactions1, reactions2) {
        if (reactions1) {
          reactions1.forEach((reaction) => {
            if (reaction) {
              try {
                m1.react(reaction)
              } catch (e) {
                return channel.send(`${emojis['hmph']} | ${ErrorCodes.REACTION_ERROR}`)
              }
            }
          })
        }
        if (reactions2) {
          reactions2.forEach((reaction) => {
            if (reaction) {
              try {
                m2.react(reaction)
              } catch (e) {
                return channel.send(`${emojis['hmph']} | ${ErrorCodes.REACTION_ERROR}`)
              }
            }
          })
        }
      }

      function testArg(arg) {
        const r1 = /\[\$\d+\]/
        const r2 = /\[\$\d+\-\d+\]/
        const r3 = /\[\$\d+\+\]/
        if (r1.test(arg)) return 1
        if (r2.test(arg)) return 2
        if (r3.test(arg)) return 3
        if (!r1.test(arg) && !r2.test(arg) && !r3.test(arg)) return 0
      }

      function replaceArgs(keys) {
        if (keys) {
          if (Array.isArray(keys)) {
            if (keys.length) {
              return keys.map(function (key) { if (testArg(key) != 0) return replaceKey(key) })
            }
          } else {
            if (testArg(keys) != 0) {
              return replaceKey(keys)
            }
          }
          return keys
        }
      }

      function replaceKey(key) {
        const n = key.replace(/\D/g, "").split('');
        var replaced = ''
        if (testArg(key) == 1) {
          if (args[n[0] - 1])
            replaced = args[n[0] - 1]
        }
        if (testArg(key) == 2) {
          for (let i = n[0] - 1; i < n[n.length - 1]; i++) {
            if (args[i])
              replaced = replaced + args[i] + ' '
          }
        }
        if (testArg(key) == 3) {
          for (let i = n[0] - 1; i < args.length; i++) {
            if (args[i])
              replaced = replaced + args[i] + ' '
          }
        }
        return replaced
      }
    }
  }
}