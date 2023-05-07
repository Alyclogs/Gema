const { Client, Message, ChatInputCommandInteraction, EmbedBuilder } = require('discord.js');
const embedModel = require('../../../utility/models/embed-model');
const { variables } = require('../../../utility/structures/Variables')
const { createEmbedPagination } = require('../../../utility/structures/Pagination');
const { Permissions2 } = require('../../../utility/validation/Permissions');

module.exports = {
    name: 'embed',
    description: 'Crea, edita o elimina embeds para este servidor',
    aliases: [],
    subcommands: [
        {
            name: 'create',
            description: 'Crea un nuevo embed',
            uso: 'gema embed create <nombre del embed>'
        },
        {
            name: 'edit',
            description: `Edita un campo específico de un embed.
            Para obtener más ayuda, utiliza \`gema help embed edit <campo>\``,
            uso: 'gema embed edit <campo>',
            options: [
                {
                    name: 'author',
                    description: 'Edita el autor de un embed',
                    uso: `Para editarlo:`
                        + `\n\`gema embed edit <nombre del embed> author <texto> | <url del icon>\``
                        + `\nPara removerlo:`
                        + `\n\`gema embed edit <nombre del embed> author\``,
                },
                {
                    name: 'title',
                    description: 'Edita el título de un embed',
                    uso: `Para editarlo:`
                        + `\n\`gema embed edit <nombre del embed> title <texto>\``
                        + `\nPara removerlo:`
                        + `\n\`gema embed edit <nombre del embed> title\``
                },
                {
                    name: 'description',
                    description: 'Edita la descripción de un embed',
                    uso: `Para editarlo:`
                        + `\n\`gema embed edit <nombre del embed> description <texto>\``
                        + `\nPara removerlo:`
                        + `\n\`gema embed edit <nombre del embed> description\``
                },
                {
                    name: 'color',
                    description: 'Edita el color de un embed',
                    uso: `Para editarlo:`
                        + `\n\`gema embed edit <nombre del embed> color <código HEX del color>\``
                        + `\nPara removerlo:`
                        + `\n\`gema embed edit <nombre del embed> color\``
                },
                {
                    name: 'thumbnail',
                    description: 'Edita la miniatura de un embed',
                    uso: `Para editarlo:`
                        + `\n\`gema embed edit <nombre del embed> thumbnail <url de la miniatura>\``
                        + `\nPara removerlo:`
                        + `\n\`gema embed edit <nombre del embed> thumbnail\``
                },
                {
                    name: 'image',
                    description: 'Edita la imagen de un embed',
                    uso: `Para editarlo:`
                        + `\n\`gema embed edit <nombre del embed> image <url de la imagen>\``
                        + `\nPara removerlo:`
                        + `\n\`gema embed edit <nombre del embed> image\``
                },
                {
                    name: 'footer',
                    description: 'Edita el texto inferior de un embed',
                    uso: `Para editarlo:`
                        + `\n\`gema embed edit <nombre del embed> footer <texto> | <url del icon>\``
                        + `\nPara removerlo:`
                        + `\n\`gema embed edit <nombre del embed> footer\``
                },
                {
                    name: 'timestamp',
                    description: 'Edita la marca de tiempo de un embed',
                    uso: `Para editarlo:`
                        + `\n\`gema embed edit <nombre del embed> timestamp <true|false>\``
                        + `\nPara removerlo:`
                        + `\n\`gema embed edit <nombre del embed> timestamp\``
                }
            ]
        },
        {
            name: 'delete',
            description: 'Elimina un embed',
            uso: `\`gema embed delete <nombre del embed>\``
        },
        {
            name: 'show',
            description: 'Muestra un embed existente',
            uso: `\`gema embed show <nombre del embed>\``
        },
        {
            name: 'list',
            description: 'Lista los embeds existentes',
            uso: `\`gema embed list\``
        },
        {
            name: 'delete-all',
            description: 'Elimina todos los embeds para este servidor',
            uso: `\`gema embed delete-all\``
        },
    ],
    timeout: 0,
    memberperms: [Permissions2.gestionarServidor],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces, Permissions2.gestionarServidor],

    /**
   * @param {Client} client
   * @param {Message} message
   */
    async execute(client, message, args, prefix, emojis, color) {
        const subcommad = args[0]

        client.embeds = []
        const embs = await embedModel.find({}).exec()
        embs.forEach((em) => {
            client.embeds.push(em)
        })

        let embedData = {
            author: {
                name: "",
                icon_url: ""
            },
            title: "",
            description: "",
            color: "",
            thumbnail: "",
            image: "",
            footer: {
                text: "",
                icon_url: ""
            },
            timestamp: false
        }

        if (subcommad === 'create' || subcommad === 'delete' || subcommad === 'list' || subcommad === 'delete-all') {
            const embedName = args.slice(1).join(' ').trim().toLowerCase()
            const data = { guildId: message.guildId, name: embedName }
            const embedFound = await embedModel.findOne(data, '-_id -__v').exec()

            if (subcommad === 'create') {
                if (embedFound) {
                    return message.reply(`${emojis['hmph']} Ya existe un embed con ese nombre`)
                } else {
                    await embedModel.create({ guildId: data.guildId, name: data.name, data: embedData })
                    return await message.reply(`${emojis['check']} El embed **${embedName}** fue creado correctamente`)
                }
            }
            if (subcommad === 'delete') {
                if (!embedFound) {
                    return message.reply(`${emojis.hmph} No existe un embed con ese nombre`)
                } else {
                    await embedModel.deleteOne(data)
                    return await message.reply(`${emojis.check} El embed **${embedName}** fue eliminado correctamente`)
                }
            }
            if (subcommad === 'delete-all') {
                if (!client.embeds.filter((em) => em.guildId === message.guild.id).length) {
                    return message.reply(`${emojis.error} Aún no hay embeds creados en este servidor ${emojis.sweat}`)
                } else {
                    await embedModel.deleteMany({ guildId: message.guild.id })
                    return await message.reply(`${emojis.check} Se han eliminado todos los embeds del servidor`)
                }
            }
            if (subcommad === 'list') {
                if (client.embeds.filter((em) => em.guildId === message.guild.id).length) {
                    let embedNames = client.embeds.filter((em) => em.guildId === message.guild.id).map(function (em) {
                        return `${emojis['dot']} ${em.name}`
                    })
                    let embeds = [], sliced = []

                    for (let i = 0; i < embedNames.length; i += 10) {
                        sliced.push(embedNames.slice(i, i + 10))
                    }

                    sliced.forEach(embs => {
                        let emb = new EmbedBuilder()
                            .setColor(color)
                            .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
                            .setTitle('Lista de embeds')
                            .setDescription(embs.join('\n'))
                        embeds.push(emb)
                    })
                    return createEmbedPagination(message, embeds)
                } else {
                    return message.reply(`${emojis.error} Aún no hay embeds creados en este servidor ${emojis.sweat}`)
                }
            }
        } else if (subcommad === 'edit' || subcommad === 'show') {
            const option = args.join(' ').match(/author|title|description|thumbnail|image|footer|color|timestamp/)?.shift()
            const embedName = option ? args.slice(1).join(' ').trim().substring(0, args.slice(1).join(' ').indexOf(option)).trim().toLowerCase()
                : args.slice(1).join(' ').trim().toLowerCase()
            const data = { guildId: message.guildId, name: embedName }
            const embedFound = await embedModel.findOne(data, '-_id -__v').exec()

            if (!embedFound) {
                return message.reply(`${emojis.confused} No existe un embed con ese nombre`)
            } else {
                embedData = embedFound.data
                const { replaceEmbedFields, replaceVars } = require('../../../utility/functions/utils')(client, message)
                let previewEmbed = replaceEmbedFields(embedData) || new EmbedBuilder().setColor(client.color)

                if (subcommad === 'show') {
                    if (!embedName) return message.reply({
                        content: `${emojis.confused} Debes especificar el nombre del embed que quieres mostrar.
                    Utiliza \`gema help embed edit <campo>\` o Utiliza </embed edit:1085401665550700597>`, allowedMentions: { repliedUser: false }
                    })
                    await message.reply({
                        embeds: [previewEmbed],
                        allowedMentions: { repliedUser: false }
                    })
                }
                if (subcommad === 'edit') {
                    if (!option) return message.reply({
                        content: `${emojis.confused} Debes especificar el campo que quieres editar.
                    Utiliza \`gema help embed edit <campo>\` o Utiliza </embed edit:1085401665550700597>`, allowedMentions: { repliedUser: false }
                    })
                    if (!embedName) return message.reply({
                        content: `${emojis.confused} Debes especificar el nombre del embed que quieres editar.
                    Utiliza \`gema help embed edit <campo>\` o Utiliza </embed edit:1085401665550700597>`, allowedMentions: { repliedUser: false }
                    })

                    let input = args.slice(3).join(' ').trim()

                    if (!input) return message.reply({
                        content: `${emojis.confused} Debes especificar los datos del campo que quieres editar.
                    Utiliza \`gema help embed edit <campo>\` o Utiliza </embed edit:1085401665550700597>`, allowedMentions: { repliedUser: false }
                    })

                    if (option === 'author') {
                        const author = input.split('|')[0].trim() || input
                        const icon = author ? input.split('|')[1]?.trim() : input

                        const prevauthor = replaceVars(author)
                        const previcon = replaceVars(icon)

                        if (icon && previcon) {
                            if (!icon.startsWith('https://') && !previcon.startsWith('https://')) {
                                return message.reply(`${emojis.hmph} El ícono no es un link válido, utiliza {user_avatar} o {server_icon} en su lugar`)
                            }
                        }
                        previewEmbed.setAuthor({ name: prevauthor || author, iconURL: previcon || icon })
                        await embedModel.updateOne(data, { 'data.author': { name: author || '', icon_url: icon || '' } })
                        return await message.reply({
                            content: (`${emojis.check}` + (author ? ` Autor actualizado` : ` Autor removido`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        }).catch(e => console.log(e))
                    }
                    if (option === 'title') {
                        const title = input
                        const prevTitle = replaceVars(title)

                        previewEmbed.data.title = prevTitle || title
                        await embedModel.updateOne(data, { 'data.title': title || '' })
                        return await message.reply({
                            content: (`${emojis.check}` + (title ? ` Título actualizado` : ` Título removido`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (option === 'description') {
                        let desc = input

                        desc = desc.replace(/\\n/g, '\n')
                        const prevDesc = replaceVars(desc)

                        previewEmbed.data.description = prevDesc || desc
                        await embedModel.updateOne(data, { 'data.description': desc || '' })
                        return await message.reply({
                            content: (`${emojis.check}` + (desc ? ` Descripción actualizada` : ` Descripción removida`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (option === 'color') {
                        const color = input
                        const prevColor = (replaceVars(color) || client.color)

                        if (color && prevColor) {
                            if (!/^#([0-9a-f]{6})/i.test(color) && !/^#([0-9a-f]{6})/i.test(prevColor)) {
                                return message.reply(`${emojis.hmph} El color no es un código HEX válido. Prueba a utilizar {user_displaycolor} u otro color válido`)
                            }
                        }

                        previewEmbed.setColor(prevColor || color)
                        await embedModel.updateOne(data, { 'data.color': color || client.color })
                        return await message.reply({
                            content: (`${emojis.check}` + (color ? ` Color actualizado` : ` Color removido`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (option === 'thumbnail') {
                        const link = input
                        const prevThumb = replaceVars(link)

                        if (link && prevThumb) {
                            if (!prevThumb.startsWith('https://') && !link.startsWith('https://')) {
                                return message.reply(`${emojis.hmph} El link para la miniatura no es un enlace válido, utiliza </variables:1059322453668663367> para ver la lista de variables disponibles`)
                            }
                        }

                        previewEmbed.setThumbnail(prevThumb || link)
                        await embedModel.updateOne(data, { 'data.thumbnail': link || '' })
                        return await message.reply({
                            content: (`${emojis.check}` + (link ? ` Miniatura actualizada` : ` Miniatura removida`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (option === 'image') {
                        const link = input
                        const prevImg = replaceVars(link)

                        if (link && prevImg) {
                            if (!prevImg.startsWith('https://') && !link.startsWith('https://')) {
                                return message.reply(`${emojis.hmph} El link para la imagen no es un enlace válido, utiliza </variables:1059322453668663367> para ver la lista de variables disponibles`)
                            }
                        }

                        previewEmbed.setImage(prevImg || link)
                        await embedModel.updateOne(data, { 'data.image': link || '' })

                        return await message.reply({
                            content: (`${emojis.check}` + (link ? ` Imagen actualizada` : ` Imagen removida`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (option === 'footer') {
                        const text = input.split('|')[0].trim() || input
                        const icon = text ? input.split('|')[1]?.trim() : input

                        let prevtext = replaceVars(text)
                        let previcon = replaceVars(icon)

                        if (icon && previcon) {
                            if (!previcon.startsWith('https://') && !icon.startsWith('https://')) {
                                return message.reply(`${emojis.hmph} El ícono no es un link válido, utiliza {user_avatar} o {server_icon} en su lugar`)
                            }
                        }
                        previewEmbed.setFooter({ text: prevtext || text, iconURL: previcon || icon })
                        await embedModel.updateOne(data, { 'data.footer': { text: text || '', icon_url: icon || '' } })
                        return await message.reply({
                            content: (`${emojis.check}` + (text ? ` Texto de pie actualizado` : ` Texto de pie removido`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (option === 'timestamp') {
                        const timestamp = input

                        if (timestamp) try { previewEmbed.setTimestamp() } catch (e) { }

                        await embedModel.updateOne(data, { 'data.timestamp': timestamp || false })
                        return await message.reply({
                            content: (`${emojis.check}` + (timestamp ? ` Marca de tiempo añadida` : ` Marca de tiempo removida`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                }
            }
        }
    }
}