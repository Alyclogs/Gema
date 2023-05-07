const { Client, Message, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, time } = require('discord.js')
const config = require('../../config.json')
const emojis = require('../../utility/data/emojis.json')
const autoresponderModel = require('../../utility/models/autoresponder-model.js')
const chatbotModel = require('../../utility/models/chatbot-model')
const embedModel = require('../../utility/models/embed-model')
const serverconfig = require('../../utility/models/serverconfig-model')
const usermodel = require('../../utility/models/user-currency')
const { serverConfigStructure } = require('../../utility/structures/serverConfigStructure')
const { ErrorCodes } = require('../../utility/data/Errors')
const { arstructure } = require('../../utility/structures/Autoresponder')
const { variables } = require('../../utility/structures/Variables.js')
const { Permissions2, Permissions3 } = require('../../utility/validation/Permissions')
const { getFonts } = require('../../utility/data/fonts')
const Chat = require("clever-chat")
const { chatbot } = require('../../utility/data/chatbot')
const { Configuration, OpenAIApi } = require('openai')

module.exports = {
  name: "messageCreate",

  /**
   * @param {Message} message
   * @param {Client} client
   */
  async execute(message, client) {
    const { author, guild, content, channel, partial, member } = message
    let { user, autoresponders, embeds } = client

    let serverData = await serverconfig.findOne({ guildId: message.guildId }).exec()
    if (!serverData) {
      await serverconfig.create({
        guildId: guild.id,
        prefix: 'g.',
        welcomerSettings: serverConfigStructure.welcomerSettings,
        farewellSettings: serverConfigStructure.farewellSettings,
        boostSettings: serverConfigStructure.boostSettings
      })
    }
    if (!await usermodel.findOne({ userId: author.id }).exec()) {
      if (author.id !== client.user.id)
        await usermodel.create({
          userId: author.id,
          balance: 0
        })
    }

    autoresponders = await autoresponderModel.find({}).exec()
    const guildars = autoresponders.filter(ar => ar.guildId === guild.id)
    embeds = await embedModel.find({}).exec()
    const guildembs = embeds.filter(em => em.guildId === guild.id)

    if (!guild || author.bot) return
    if (content.includes('@here') || content.includes('@everyone')) return
    if (channel.partial) await channel.fetch();
    if (partial) await message.fetch();

    if (content === `<@${user.id}>`) {
      return message.reply({
        content: `Hola ¿Me llamaste? ${emojis['blush']}. Escribe \`/help\` para ver todos mis comandos :3`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setURL(config.inviteLink)
              .setLabel('Invítame!')
          )]
      })
    }

    let prefix = content.toLowerCase().startsWith(serverData?.prefix?.toLowerCase()) ? serverData.prefix : config.prefix
    if (content.toLowerCase().startsWith(prefix?.toLowerCase())) {
      const args = content.slice(prefix.length).trim().split(/ +/g)
      const cmd = args.shift()?.toLowerCase()
      const command = client.commands.get(cmd) || client.commands.find(c => c.aliases && c.aliases.includes(cmd)) || ''
      if (command) {
        if (command.owner && author.id !== client.ownerIDS[0]) return;
        if (command.memberperms?.length > 0 && !(command.memberperms.every(p => member.permissions.has(p.flag)))) {
          let permsFaltantes = command.memberperms.filter(dmp => !member.permissions.has(dmp.flag)).map(dmp => `\`${dmp.perm}\``).join(', ')
          return message.reply({
            content: `${emojis['error']} No tienes suficientes permisos para ejecutar este comando\nPermisos faltantes: ${permsFaltantes}`,
          })
        }
        if (command.botperms?.length > 0 && !(command.botperms.every(p => guild.members.me.permissions.has(p.flag)))) {
          let permsFaltantes = command.botperms.filter(dmp => !guild.members.me.permissions.has(dmp.flag)).map(dmp => `\`${dmp.perm}\``).join(', ')
          return message.reply({
            content: `${emojis['error']} No tengo suficientes permisos para ejecutar este comando\nPermisos faltantes: ${permsFaltantes}`,
          })
        }
        const cooldownData = `${author.id}_cmd:${cmd}`
        const timesc = Math.floor(Date.now() / 1000)
        const timeout = command.timeout || 0

        if (client.timeouts.has(cooldownData)) {
          const expirationTime = client.timeouts.get(cooldownData) + timeout
          if (timesc < expirationTime) {
            return message.reply({
              content: `${emojis['hmph']} Estás yendo muy rápido! Podrás volver a ejecutar este comando ${time(expirationTime, 'R')}`,
            })
          }
        }
        client.timeouts.set(cooldownData, timesc)
        setTimeout(() => client.timeouts.delete(cooldownData), timeout * 1000)
        setTimeout(() => client.nsfwgifs = [], 180e3)

        command.execute(client, message, args, prefix, emojis, config.color)
      }
    }

    /*
    if (channel.name.includes('chatbot')) {
      const chat = new Chat(chatbot)

      chat.chat(content).then(reply => {
        channel.send(reply)
      }).catch(err => console.log(err))
      channel.sendTyping()
    }
    */

    const chatbotData = await chatbotModel.findOne({ guildId: guild.id }).exec()
    if (chatbotData) {
      if (chatbotData.channelId) {
        if (channel.id === chatbotData.channelId) {
          let cont = chatbotData.nPrompts;
          if (cont == 20) {
            channel.send(`${emojis['error']} ¡Lo siento! has llegado al límite de mensajes para hablar conmigo ${emojis['sweat']}`)
          } else {
            await channel.sendTyping()
            const configuration = new Configuration({
              apiKey: process.env.OPENAI_API_KEY
            })
            const openai = new OpenAIApi(configuration);
            let prompt = chatbotData.prompt;

            prompt += `Human: ${content}\n`;
            (async () => {
              const gptResponse = await openai.createCompletion({
                model: 'text-davinci-003',
                prompt: prompt,
                max_tokens: 2000,
                temperature: 0.3,
                top_p: 1,
                presence_penalty: 0,
                frequency_penalty: 0.5
              });
              try {
                channel.send(`${gptResponse.data?.choices[0].text?.replace('Gema:', '')}`)
                prompt += `${gptResponse.data?.choices[0].text}\n`;
                cont++;
                await chatbotModel.findOneAndUpdate({ guildId: guild.id, channelId: channel.id }, { prompt: prompt, nPrompts: cont })
              } catch (e) {
              }
            })();
          }
        }
      }
    }
    let autoresponder = arstructure
    autoresponder = null

    if (guildars) {
      for (let autr of guildars) {
        if (content.toLowerCase().includes(autr.arTrigger.triggerkey.toLowerCase())) {
          if (autr.matchmode === 'startswith' && content.toLowerCase().startsWith(autr.arTrigger.triggerkey.toLowerCase())) {
            autoresponder = autr
            break
          } else if (autr.matchmode === 'exactmatch' && content.toLowerCase() === autr.arTrigger.triggerkey.toLowerCase()) {
            autoresponder = autr
            break
          } else if (autr.matchmode === 'endswith' && content.toLowerCase().endsWith(autr.arTrigger.triggerkey.toLowerCase())) {
            autoresponder = autr
            break
          } else if (autr.matchmode === 'includes' && content.toLowerCase().includes(autr.arTrigger.triggerkey.toLowerCase())) {
            autoresponder = autr
            break
          }
        }
      }
    }

    if (guildars && autoresponder) {
      const { arTrigger, arReply } = autoresponder

      const args = content.toLowerCase().slice(arTrigger.triggerkey.length).trim().split(/ +/g)
      const varis = variables(message).totalvars()
      let previewEmbed, row, schoice = { ind: 0, option: { ind: 0, opt: '' } }, schoicevalue = { ind: 0, option: '' }
      schoice = schoicevalue = null

      const embed = new EmbedBuilder()
        .setColor(client.color)

      let botresponse = formatStr(varis, arReply.rawreply.trim()).trim()
      let reactionemojis1 = replaceArgs(arTrigger.reactionemojis)
      let embedcolor = replaceArgs(arReply.embedcolor)
      let requireuserid = replaceArgs(arReply.requireuserid)
      let wheretosend = replaceArgs(arReply.wheretosend)
      let requiredchannel = replaceArgs(arReply.requiredchannel)
      let denychannel = replaceArgs(arReply.denychannel)
      let requiredperm = replaceArgs(arReply.requiredperm)
      let requiredrole = replaceArgs(arReply.requiredrole)
      let denyrole = replaceArgs(arReply.denyrole)
      let nickname = replaceArgs(arReply.setnick?.nick)
      let nickuser = replaceArgs(arReply.setnick?.user)
      let reactionemojis2 = replaceArgs(arReply.reactionemojis)
      let autodeletetime = replaceArgs(arReply.autodelete?.time) || arReply.autodelete?.time
      let font = replaceArgs(arReply.font)

      botresponse = botresponse.replace(/\\n/g, '\n')

      if (embedcolor) try {
        embed.setColor(embedcolor)
      } catch (e) {
      }

      if (arReply.embeddata) {
        const embedData = guildembs.find(em => em.name === arReply.embeddata)?.data

        if (embedData) {
          previewEmbed = new EmbedBuilder()
          if (embedData.author?.name || embedData.author?.icon_url) {
            let icon = embedData.author.icon_url.startsWith('https://') ? embedData.author.icon_url
              : replaceArgs(embedData.author.icon_url).startsWith('https://') ? replaceArgs(embedData.author.icon_url) : undefined;
            previewEmbed.setAuthor({ name: replaceArgs(embedData.author.name) || '', iconURL: icon })
          }
          if (embedData.title) previewEmbed.data.title = replaceArgs(embedData.title) || '';
          if (embedData.description) {
            previewEmbed.data.description = formatStr(varis, embedData.description)
          }
          if (embedData.thumbnail) {
            if (embedData.thumbnail.startsWith('https://')) previewEmbed.setThumbnail(embedData.thumbnail)
            if (replaceArgs(embedData.thumbnail).startsWith('https://')) previewEmbed.setThumbnail(replaceArgs(embedData.thumbnail))
          }
          if (embedData.image) {
            if (embedData.image.startsWith('https://')) previewEmbed.setImage(embedData.image);
            if (replaceArgs(embedData.image).startsWith('https://')) previewEmbed.setImage(replaceArgs(embedData.image));
          }
          if (embedData.footer?.text || embedData.footer?.icon_url) {
            let icon = embedData.footer.icon_url.startsWith('https://') ? embedData.footer.icon_url
              : replaceArgs(embedData.footer.icon_url).startsWith('https://') ? replaceArgs(embedData.footer.icon_url) : undefined;
            previewEmbed.setFooter({ text: replaceArgs(embedData.footer.text) || '', iconURL: icon })
          }
          if (embedData.timestamp) previewEmbed.setTimestamp()

          if (!embedData.color) previewEmbed.setColor(client.color)
          if (replaceArgs(embedData.color)) previewEmbed.setColor(replaceArgs(embedData.color))
        }
      }
      if (requiredperm.length) {
        requiredperm = requiredperm.map(function (perm) {
          return Permissions3.find(p => p.perm === perm).flag
        })
      }

      let m
      const ruserok = requireuserid.length == 0 ? true : requireuserid.find((rus) => rus === author.id)
      const rchanelsok = requiredchannel.length == 0 ? true : requiredchannel.find((rch) => rch === channel.id)
      const dchanelsok = denychannel.length == 0 ? true : !denychannel.find((dch) => dch === channel.id)
      const rrolesok = requiredrole.length == 0 ? true : requiredrole.every(role => member.roles.cache.has(role))
      const drolesok = denyrole.length == 0 ? true : !denyrole.every(role => member.roles.cache.has(role))
      const permsok = requiredperm.length == 0 ? true : requiredperm.every(perm => member.permissions.has(perm))
      let defaultPerms = [Permissions2.enviarMensajes.flag, Permissions2.insertarEnlaces.flag]

      if (ruserok && rchanelsok && dchanelsok && rrolesok && drolesok && permsok) {
        if (!defaultPerms.every(p => guild.members.me.permissions.has(p)))
          return channel.send(`${emojis.sweat} ${ErrorCodes.NOT_ENOUGH_PERMS(defaultPerms.filter(p => !member.permissions.has(p)))}`)

        if (autoresponder.cooldown) {
          const cooldownData = `${author.id}_ar:${arTrigger.triggerkey}`
          const timesc = Math.floor(Date.now() / 1000)

          if (client.timeouts.has(cooldownData)) {
            const expirationTime = client.timeouts.get(cooldownData) + autoresponder.cooldown
            if (timesc < expirationTime) {
              return message.reply({
                content: `⏳ Podrás volver a ejecutar este autoresponder ${time(expirationTime, 'R')}`,
              })
            }
          }
          client.timeouts.set(cooldownData, timesc)
          setTimeout(() => client.timeouts.delete(cooldownData), autoresponder.cooldown * 1000)
        }
        if (autoresponder.matchmode !== 'exactmatch') {
          if (arReply.argsrequired && arReply.argsrequired.length >= 1) {
            if (!args.length || args.length < 1 || args[0] === '')
              return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.REQUIRED_ARGS_ERROR(arTrigger.triggerkey, arReply.argsrequired)}`)
            for (let arg of arReply.argsrequired) {
              if (!arg.num && !arg.type) break
              let uso = ErrorCodes.CORRECT_ARGS_USE(arTrigger.triggerkey, arReply.argsrequired)
              if (arg.type === 'user' && !guild.members.cache.find(m => m.id === args[arg.num - 1].replace(/[\\<>@#&!]/g, "")))
                return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('usuario')} ${uso}`)
              if (arg.type === 'color' && !/^#([0-9a-f]{6})/i.test(args[arg.num - 1]))
                return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('color')} ${uso}`)
              if (arg.type === 'channel' && !guild.channels.cache.find(ch => ch.id === args[arg.num - 1].replace(/[\\<>@#&!]/g, "")))
                return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('canal')} ${uso}`)
              if (arg.type === 'rol' && !guild.roles.cache.find(r => r.id === args[arg.num - 1].replace(/[\\<>@#&!]/g, "")))
                return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('rol')} ${uso}`)
              if (arg.type === 'number' && isNaN(args[arg.num - 1]))
                return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.INVALID_TYPEOF_ARG('número')} ${uso}`)
            }
          }
        }
        if (arReply.addrole.length > 0) {
          if (!guild.members.me.permissions.has(Permissions2.gestionarRoles.flag))
            return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions2.gestionarRoles.perm])}`)
          for (let roledata of arReply.addrole) {
            let role = guild.roles.cache.get(replaceArgs(roledata.role).replace(/[\\<>@#&!]/g, "").trim())
            if (!role) return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.INVALID_ROLE_ERROR}`)
            if (role.position > guild.members.me.roles.highest.position)
              return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR}`)
            if (roledata.user) {
              let $user = guild.members.cache.get(replaceArgs(roledata.user).replace(/[\\<>@#&!]/g, "").trim())
              if ($user) {
                if ($user.permissions.has(Permissions2.administrador.flag))
                  return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                $user.roles.add(role).catch(() => channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
              }
            } else {
              if (member.permissions.has(Permissions2.administrador.flag))
                return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
              member.roles.add(role).catch(() => channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
            }
          }
        }
        if (arReply.removerole.length > 0) {
          if (!guild.members.me.permissions.has(Permissions2.gestionarRoles.flag))
            return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions2.gestionarRoles.perm])}`)
          for (let roledata of arReply.removerole) {
            let role = guild.roles.cache.get(replaceArgs(roledata.role).replace(/[\\<>@#&!]/g, "").trim())
            if (!role) return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.INVALID_ROLE_ERROR}`)
            if (role.position > guild.members.me.roles.highest.position)
              return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR}`)
            if (roledata.user) {
              let $user = guild.members.cache.get(replaceArgs(roledata.user).replace(/[\\<>@#&!]/g, "").trim())
              if ($user) {
                if ($user.permissions.has(Permissions2.administrador.flag))
                  return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
                $user.roles.remove(role).catch(() => channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
              }
            } else {
              if (member.permissions.has(Permissions2.administrador.flag))
                return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR}`)
              member.roles.remove(role).catch(() => channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.ADD_REMOVE_ROLE_ERROR}`))
            }
          }
        }
        if (nickname) {
          if (!guild.members.me.permissions.has(Permissions2.gestionarApodos.flag))
            return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions2.gestionarApodos.perm])}`)
          if (member.roles.highest.position > guild.members.me.roles.highest.position)
            return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.ROLE_POSITION_ERROR2}`)
          const user = nickuser ? guild.members.cache.get(nickuser.replace(/[\\<>@#&!]/g, "")) : member
          if (user?.permissions.has(Permissions2.administrador))
            return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.MEMBER_ISADMINISTRATOR2}`)
          user.setNickname(nickname).catch(() => channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.SET_NICK_ERROR}`))
        }
        if (arReply.buttons?.length >= 1) {
          row = new ActionRowBuilder()
          let buttons = []
          for (let buttondata of arReply.buttons) {
            let button = new ButtonBuilder()
            if (buttondata.type != '5') button.setCustomId(buttondata.id)
            button.setLabel(formatStr(varis, buttondata.label))
              .setStyle(buttondata.type * 1)
            if (buttondata.type == '5') button.setURL(replaceArgs(buttondata.link))
            buttons.push(button)
          }
          row.setComponents(buttons)
        }
        if (font) {
          let fonts = getFonts(botresponse)
          let stilizedText = font === 'random' ? fonts[Math.floor(Math.random() * fonts.length)].value : fonts.find(f => f.name === font)?.value
          if (stilizedText) botresponse = stilizedText
        }
        if (arReply.modifybal && arReply.modifybal.length >= 1) {
          for (let bal of arReply.modifybal) {
            if (!bal.user && !bal.cant) break
            let user = replaceArgs(bal.user).replace(/[\\<>@#&!]/g, "")
            if (user) {
              user = await usermodel.findOne({ userId: user }).exec()
            } else user = await usermodel.findOne({ userId: author.id }).exec()
            let sym = bal.cant.match(/(\+|\-)/)[0]
            let cant = replaceArgs(bal.cant.replace(/[\+\-]/, ""))
            if (!sym || !cant || !user) return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.INVALID_MODIFYBALL}`)
            let newcant = sym === '+' ? user.balance * 1 + cant * 1 : user.balance * 1 - cant * 1
            if (newcant < 0) return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.MODIFYBAL_ERROR}`)
            await usermodel.updateOne({ userId: user.userId }, { balance: newcant })
          }
        }
        if (autoresponder.matchmode === 'exactmatch') {
          if (content.toLowerCase() === arTrigger.triggerkey) {
            m = await enviarMensaje(arReply.replytype, wheretosend)
            await reactMessage(message, m, reactionemojis1, reactionemojis2)
          }
        } else {
          if (autoresponder.matchmode === 'startswith') {
            if (content.toLowerCase().startsWith(arTrigger.triggerkey)) {
              m = await enviarMensaje(arReply.replytype, wheretosend)
              await reactMessage(message, m, reactionemojis1, reactionemojis2)
            }
          }
          if (autoresponder.matchmode === 'endswith') {
            if (content.toLowerCase().toLowerCase().endsWith(arTrigger.triggerkey)) {
              m = await enviarMensaje(arReply.replytype, wheretosend)
              await reactMessage(message, m, reactionemojis1, reactionemojis2)
            }
          }
          if (autoresponder.matchmode === 'includes') {
            if (content.toLowerCase().includes(arTrigger.triggerkey)) {
              m = await enviarMensaje(arReply.replytype, wheretosend)
              reactMessage(message, m, reactionemojis1, reactionemojis2)
            }
          }
        }
        if (arReply.waitresponse) {
          if (arReply.waitresponse.answer && arReply.waitresponse.channel && arReply.waitresponse.reply && arReply.waitresponse.time) {
            const answer = formatStr(varis, arReply.waitresponse.answer)
            const channel = replaceArgs(arReply.waitresponse.channel)
            const filter = m => m.content.toLowerCase() === answer.toLowerCase()
            if (client.channels.cache.get(channel)) {
              await client.channels.fetch(channel)
                .then(chnl => {
                  const msgcollector = chnl.createMessageCollector({ filter: filter, time: replaceArgs(arReply.waitresponse.time) })

                  msgcollector.on('collect', async m => {
                    const vars = variables(m).totalvars()
                    await chnl.send(formatStr(vars, arReply.waitresponse.reply))
                    msgcollector.stop()
                  })
                })
            } else if (channel === 'current') {
              const msgcollector = message.channel.createMessageCollector({ filter: filter, time: replaceArgs(arReply.waitresponse.time) })

              msgcollector.on('collect', async m => {
                const vars = variables(m).totalvars()
                await message.channel.send(formatStr(vars, arReply.waitresponse.reply))
                msgcollector.stop()
              })
            }
          }
        }
        if (row) {
          const filter = i => i.isButton() && i.user.id === message.author.id
          const btncollector = m.createMessageComponentCollector({ filter, time: 15000 })

          btncollector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
              await i.reply({ content: `${emojis.hmph} El autoresponder no está dirigido a ti`, ephemeral: true })
            }
            let btn = arReply.buttons.find(b => b.id == i.customId)
            if (btn.type != 5) {
              await i.reply({ content: `${btn.reply}` }).catch(e => console.log(e))
            }
          })
          btncollector.on('end', async () => {
            row.components.forEach(c => c.setDisabled(true))
            await m.edit({ content: m.content, embeds: m.embeds || [], components: [row] }).catch(e => console.log(e))
          })
        }
        if (arTrigger.autodelete) {
          if (!guild.members.me.permissions.has(Permissions2.gestionarMensajes.flag))
            return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions2.gestionarMensajes.perm])}`)
          message.delete().catch(() => channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.DELETE_MESSAGE_ERROR}`))
        }
        if (m && arReply.autodelete?.value) {
          if (!guild.members.me.permissions.has(Permissions2.gestionarMensajes.flag))
            return channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.NOT_ENOUGH_PERMS([Permissions2.gestionarMensajes.perm])}`)
          if (autodeletetime) { try { setTimeout(() => m.delete(), autodeletetime) } catch (e) { err = true } }
          else m.delete().catch(() => channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.DELETE_MESSAGE_ERROR}`))

        }
      }

      function enviarMensaje(tipo, where) {
        where = where.replace(/[\\<>@#&!]/g, "")
        let dataToSend = { content: undefined, embeds: [], components: row ? [row] : [] }

        if (where === 'current_channel') {
          if (tipo === 'message') {
            if (botresponse) dataToSend.content = botresponse
            if (dataToSend.content || dataToSend.components.length || dataToSend.embeds.length) return channel.send(dataToSend)
          } else if (tipo === 'embed') {
            if (arReply.embeddata) {
              if (botresponse) dataToSend.content = botresponse
              dataToSend.embeds = [previewEmbed] || []
              if (dataToSend.content || dataToSend.components.length || dataToSend.embeds.length) return channel.send(dataToSend)
            } else {
              if (botresponse) dataToSend.embeds = [embed.setDescription(botresponse)] || []
              if (dataToSend.content || dataToSend.components.length || dataToSend.embeds.length) return channel.send(dataToSend)
            }
          }
        } else if (where === 'user_dm') {
          if (tipo === 'message') {
            if (botresponse) dataToSend.content = `Autoresponder de **${guild.name}**\n\n${botresponse}`
            if (dataToSend.content || dataToSend.components.length || dataToSend.embeds.length) return author.send(dataToSend)
          } else if (tipo === 'embed') {
            if (arReply.embeddata) {
              if (botresponse) dataToSend.content = `Autoresponder de ${guild.name}\n\n${botresponse}`
              dataToSend.embeds = [previewEmbed] || []
              if (dataToSend.content || dataToSend.components.length || dataToSend.embeds.length) return author.send(dataToSend)
            } else {
              if (botresponse) dataToSend.content = `Autoresponder de ${guild.name}\n`
              if (botresponse) dataToSend.embeds = [embed.setDescription(botresponse)] || []
              if (dataToSend.content || dataToSend.components.length || dataToSend.embeds.length) return author.send(dataToSend)
            }
          }
        } else {
          if (tipo === 'message') {
            dataToSend.content = botresponse
            if (dataToSend.content || dataToSend.components.length || dataToSend.embeds.length) return client.channels.fetch(where).then(chnl => chnl.send(dataToSend))

          } else if (tipo === 'embed') {
            if (arReply.embeddata) {
              if (botresponse) dataToSend.content = botresponse
              dataToSend.embeds = [previewEmbed] || []
              if (dataToSend.content || dataToSend.components.length || dataToSend.embeds.length) return client.channels.fetch(where).then(chnl => chnl.send(dataToSend))

            } else {
              if (botresponse) dataToSend.embeds = [embed.setDescription(botresponse)] || []
              if (dataToSend.content || dataToSend.components.length || dataToSend.embeds.length) return client.channels.fetch(where).then(chnl => chnl.send(dataToSend))

            }
          }
        }
      }

      async function reactMessage(m1, m2, reactions1, reactions2) {
        if (reactions1?.length > 0) {
          for (let reaction of reactions1) {
            m1.react(reaction).catch(() => channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.REACTION_ERROR}`))
          }
        }
        if (reactions2?.length > 0) {
          for (let reaction of reactions2) {
            m2.react(reaction).catch(() => channel.send(`${emojis.error} \`ERROR\`: ${ErrorCodes.REACTION_ERROR}`))
          }
        }
      }

      function replaceKey(key) {
        const n = key.replace(/\D/g, "").split('');
        var replaced = ''
        if (/\[\$\d+\]/i.test(key)) {
          if (args[n[0] - 1]) return args[n[0] - 1].trim()
        }
        if (/\[\$\d+\-\d+\]/i.test(key)) {
          for (let i = n[0] - 1; i < n[n.length - 1]; i++) {
            if (args[i]) replaced = replaced + args[i] + ' '
          }
          return replaced.trim()
        }
        if (/\[\$\d+\+\]/i.test(key)) {
          for (let i = n[0] - 1; i < args.length; i++) {
            if (args[i]) replaced = replaced + args[i] + ' '
          }
          return replaced.trim()
        }
        if (/({\w+:?.*?(?:(?<=\{)\w*(?=\}).+?)*})/i.test(key)) {
          const varf = varis.find(varb => varb.name === key)
          if (varf) return varf.value
        }
        if (/\[range\]/i.test(key) || /\[range\d+\]/i.test(key)) {
          if (arReply.ranges && arReply.ranges?.length >= 1) {
            let range = n[0] ? arReply.ranges.find(r => r.ind == n[0]) : arReply.ranges.find(r => !r.ind)
            let rangemin = replaceArgs(range.min)
            let rangemax = replaceArgs(range.max)
            if (rangemin && rangemax) {
              if (!isNaN(rangemin * 1) && !isNaN(rangemax * 1)) {
                let number = Math.floor((Math.random() * rangemax) + rangemin)
                if (!isNaN(number)) return number
                else return 'RANGO_INSUFICIENTE'
              } else return 'RANGO_NO_CALCULADO'
            }
          }
        }
        if (/\[choice\]/i.test(key) || /\[choice\d+\]/i.test(key)) {
          if (arReply.choices && arReply.choices?.length >= 1) {
            let choice = n[0] ? arReply.choices.find(c => c.ind == n[0]) : arReply.choices.find(ch => !ch.ind)
            let choosed = choice?.options[Math.floor(Math.random() * choice?.options?.length)]
            if (choosed?.option) {
              schoice = { ind: choice.ind || 0, option: { ind: choosed.ind, opt: choosed.option } }
              return formatStr(varis, schoice.option.opt)?.replace(/\\n/g, '\n').trim()
            }
          }
        }
        if (/\[choicevalue\]/i.test(key) || /\[choicevalue\d+\]/i.test(key)) {
          if (arReply.choices && arReply.choices?.length >= 1 && arReply.choicevalues && arReply.choicevalues.length >= 1) {
            let choicevalue = n[0] ? arReply.choicevalues.find(c => c.ind == n[0]) : arReply.choicevalues.find(c => !c.ind)
            let choosedvalue = choicevalue?.options[schoice.option.ind].option
            schoicevalue = { ind: choicevalue.ind || 0, option: choosedvalue }
            if (choicevalue) return formatStr(varis, schoicevalue.option)?.replace(/\\n/g, '\n').trim()
          }
        }
        if (/\[choices\d+\]/i.test(key) || /\[choices\]/i.test(key)) {
          if (arReply.choices && arReply.choices?.length >= 1) {
            let choice = n[0] ? arReply.choices.find(c => c.ind == n[0]) : arReply.choices.find(ch => !ch.ind)
            if (choice) return formatStr(varis, choice.options.map(o => o.option).join('\n')).trim()
          }
        }
        return key
      }

      function replaceArgs(keys) {
        if (keys) {
          if (Array.isArray(keys)) {
            if (keys.length) {
              return keys.map(function (key) {
                return replaceKey(key)
              })
            }
          } else if (typeof keys === 'string') {
            return replaceKey(keys)
          } return keys
        } return keys
      }

      function formatStr(varis, str) {
        if (str) {
          let newstr = str
          let keys = newstr
            .match(/\[\$\d+\]|\[\$\d+\-\d+\]|\[\$\d+\+\]|\[range\d+\]|\[choice\d+\]|\[range\]|\[choice\]|\[choicevalue\d+\]|\[choicevalue\]|\[choices\]|\[choices\d+\]/gi)
          if (keys) {
            keys.forEach((key) => {
              var replaced = replaceKey(key)
              newstr = newstr.replace(key, replaced).trim()
            })
          }
          newstr = replaceVars(varis, newstr).replace(/\\n/g, '\n')
          return newstr
        } return str
      }

      function replaceVars(varis, str) {
        if (str) {
          const vars = str.match(/({\w+:?.*?(?:(?<=\{)\w*(?=\}).+?)*})/gi)
          if (vars) {
            let replaced = str
            for (let v of vars) {
              const varf = varis.find(varb => varb.name === v)
              if (varf) replaced = replaced.replace(v, varf.value)
              else replaced = replaced.replace(v, '')
            }
            return replaced
          }
        } return str
      }
    }
  }
}