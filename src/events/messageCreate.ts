import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable, Message, PermissionResolvable, time } from "discord.js";
import Bot from "../structures/Bot";
import { Event } from "../typing/Event";
import { BoostSettings, FarewellSettings, model as serverconfig, ServerConfig, WelcomerSettings } from "../models/serverconfig-model"
import { model as usermodel } from "../models/user-currency"
import config from "../config.json"
import ExtendedMessage from "../typing/ExtendedMessage";
import { model as chatbotModel, Chatbot } from "../models/chatbot-model";
import { OpenAI } from "openai";
import { autoresponderModel, embedModel } from "../models/gema-models";

export default new Event({
    name: "messageCreate",
    once: false
},
    async (client: Bot, message: ExtendedMessage) => {
        const { author, guild, content, channel, partial, member } = message
        let { user, autoresponders, embeds, emotes } = client

        if (!guild || author.bot) return
        if (content.includes('@here') || content.includes('@everyone')) return
        if (channel.partial) await channel.fetch();
        if (partial) await message.fetch();

        let serverData = await serverconfig.findOne({ guildId: message.guildId }).exec()
        if (!serverData) {
            await serverconfig.create(new ServerConfig({
                guildId: guild.id,
                prefix: 'g.',
                welcomerSettings: new WelcomerSettings(),
                farewellSettings: new FarewellSettings(),
                boostSettings: new BoostSettings()
            }))
        }
        if (!await usermodel.findOne({ userId: author.id }).exec()) {
            if (author.id !== client?.user?.id)
                await usermodel.create({
                    userId: author.id,
                    balance: 0
                })
        }

        if (content === `<@${user?.id}>`) {
            return message.reply({
                content: `Hola ¿Me llamaste? ${emotes['blush']}. Escribe \`/help\` para ver todos mis comandos :3`,
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setURL(config.inviteLink)
                            .setLabel('Invítame!')
                    )]
            })
        }

        let prefix = serverData?.prefix ? content.toLowerCase().startsWith(serverData.prefix?.toLowerCase()) ? serverData.prefix : config.prefix : config.prefix
        if (content.toLowerCase().startsWith(prefix?.toLowerCase())) {
            const args = content.slice(prefix.length).trim().split(/ +/g)
            const cmd = args.shift()?.toLowerCase()
            const command = cmd ? client.commands.get(cmd) || client.commands.find(c => c.aliases && c.aliases.includes(cmd)) : undefined
            if (command) {
                if (command.owner && author.id !== client.ownerIDS[0]) return;
                let memberperms = command.memberperms || []
                let botperms = command.botperms || []

                if (memberperms?.length > 0 && !(memberperms.every(p => member.permissions.has(p.flag as PermissionResolvable)))) {
                    let permsFaltantes = memberperms.filter(dmp => !member.permissions.has(dmp.flag as PermissionResolvable)).map(dmp => `\`${dmp.perm}\``).join(', ')
                    return message.reply({
                        content: `${emotes['error']} No tienes suficientes permisos para ejecutar este comando\nPermisos faltantes: ${permsFaltantes}`,
                    })
                }
                if (botperms?.length > 0 && !(botperms.every(p => guild?.members?.me?.permissions.has(p.flag as PermissionResolvable)))) {
                    let permsFaltantes = botperms.filter(dmp => !guild?.members?.me?.permissions.has(dmp.flag as PermissionResolvable)).map(dmp => `\`${dmp.perm}\``).join(', ')
                    return message.reply({
                        content: `${emotes['error']} No tengo suficientes permisos para ejecutar este comando\nPermisos faltantes: ${permsFaltantes}`,
                    })
                }
                const cooldownData = `${author.id}_cmd:${cmd}`
                const timesc = Math.floor(Date.now() / 1000)
                const timeout = command.timeout || 0

                if (client.timeouts.has(cooldownData)) {
                    const expirationTime = (client.timeouts.get(cooldownData) || 0) + timeout
                    if (timesc < expirationTime) {
                        return message.reply({
                            content: `${emotes['hmph']} Estás yendo muy rápido! Podrás volver a ejecutar este comando ${time(expirationTime, 'R')}`,
                        })
                    }
                }
                client.timeouts.set(cooldownData, timesc)
                setTimeout(() => client.timeouts.delete(cooldownData), timeout * 1000)
                setTimeout(() => client.nsfwgifs = [], 180e3)

                if (command.run) command.run({
                    client: client as Bot,
                    message: message as Message,
                    args: args as string[],
                    color: client.color as ColorResolvable,
                    emojis: client.emotes
                })
            }
        }

        const chatbotData = await chatbotModel.findOne({ guildId: guild.id }).exec()
        if (chatbotData) {
            if (chatbotData.channelId) {
                if (channel.id === chatbotData.channelId) {
                    let cont = chatbotData.nPrompts || 0;
                    if (cont == 20) {
                        channel.send(`${emotes['error']} ¡Lo siento! has llegado al límite de mensajes para hablar conmigo ${emotes['sweat']}`)
                    } else {
                        await channel.sendTyping()
                        const openai = new OpenAI({
                            apiKey: process.env.OPENAI_API_KEY
                        })
                        let prompt = chatbotData.prompt;

                        prompt += `Human: ${content}\n`;
                        (async () => {
                            const gptResponse = await openai.completions.create({
                                model: 'text-davinci-003',
                                prompt: prompt,
                                max_tokens: 2000,
                                temperature: 0.3,
                                top_p: 1,
                                presence_penalty: 0,
                                frequency_penalty: 0.5
                            });
                            try {
                                channel.send(`${gptResponse.choices[0].text?.replace('Gema:', '')}`)
                                prompt += `${gptResponse.choices[0].text}\n`;
                                cont++;
                                await chatbotModel.findOneAndUpdate({ guildId: guild.id, channelId: channel.id }, { prompt: prompt, nPrompts: cont })
                            } catch (e) {
                            }
                        })();
                    }
                }
            }
        }
        client.autoresponders = await autoresponderModel.find({}).exec()
        const guildars = client.autoresponders.filter(ar => ar.guildId === guild.id)
        client.embeds = await embedModel.find({}).exec()

        let autoresponder = null

        if (guildars) {
            for (let autr of guildars) {
                if (autr.arTrigger && content.toLowerCase().includes(autr.arTrigger?.triggerkey.toLowerCase())) {
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
            const { executeAutoresponder } = (await import('../util/functions'))?.default(client, message)
            await executeAutoresponder(autoresponder, message)
        }
    })