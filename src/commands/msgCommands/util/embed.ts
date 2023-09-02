import { SlashCommandBuilder, ChatInputCommandInteraction, Client, EmbedBuilder, ColorResolvable, TextChannel } from 'discord.js';
import { embedModel, EmbedDataType } from '../../../models/gema-models';
import { variables } from '../../../botdata/Variables';
import { createEmbedPagination } from '../../../util/Pagination';
import { Permissions } from '../../../util/Permissions';
import { SlashCommand } from '../../../structures/Command';

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crea, edita o elimina embeds para este servidor')
        .addSubcommand(subcommad =>
            subcommad
                .setName('create')
                .setDescription('Crea un nuevo embed')
                .addStringOption(option => option.setName('name').setDescription('El nombre del embed').setRequired(true)))
        .addSubcommand(subcommad =>
            subcommad
                .setName('show')
                .setDescription('Muestra un embed existente')
                .addStringOption(option => option.setName('embed').setDescription('El nombre del embed').setRequired(true).setAutocomplete(true)))
        .addSubcommand(subcommad =>
            subcommad
                .setName('list')
                .setDescription('Lista los embeds existentes'))
        .addSubcommand(subcommad =>
            subcommad
                .setName('delete')
                .setDescription('Elimina un embed')
                .addStringOption(option => option.setName('name').setDescription('El nombre del embed').setRequired(true).setAutocomplete(true)))
        .addSubcommand(subcommad =>
            subcommad
                .setName('delete_all')
                .setDescription('Elimina todos los embeds para este servidor'))
        .addSubcommandGroup(scg =>
            scg
                .setName('edit')
                .setDescription('Edita campos específicos de un embed')
                .addSubcommand(subcommad =>
                    subcommad
                        .setName('author')
                        .setDescription('Edita el autor de un embed')
                        .addStringOption(option => option.setName('embed').setDescription('El nombre del embed').setRequired(true).setAutocomplete(true))
                        .addStringOption(option => option.setName('text').setDescription('El autor del embed'))
                        .addStringOption(option => option.setName('icon').setDescription('El ícono del autor')))
                .addSubcommand(subcommad =>
                    subcommad
                        .setName('title')
                        .setDescription('Edita el título de un embed')
                        .addStringOption(option => option.setName('embed').setDescription('El nombre del embed').setRequired(true).setAutocomplete(true))
                        .addStringOption(option => option.setName('title').setDescription('El título del embed')))
                .addSubcommand(subcommad =>
                    subcommad
                        .setName('description')
                        .setDescription('Edita la descripción de un embed')
                        .addStringOption(option => option.setName('embed').setDescription('El nombre del embed').setRequired(true).setAutocomplete(true))
                        .addStringOption(option => option.setName('description').setDescription('La descripción del embed (utiliza "\\n" para salto de línea)')))
                .addSubcommand(subcommad =>
                    subcommad
                        .setName('color')
                        .setDescription('Edita el color de un embed')
                        .addStringOption(option => option.setName('embed').setDescription('El nombre del embed').setRequired(true).setAutocomplete(true))
                        .addStringOption(option => option.setName('color').setDescription('El color del embed en formato hexadecimal')))
                .addSubcommand(subcommad =>
                    subcommad
                        .setName('thumbnail')
                        .setDescription('Edita la imagen miniatura de un embed')
                        .addStringOption(option => option.setName('embed').setDescription('El nombre del embed').setRequired(true).setAutocomplete(true))
                        .addStringOption(option => option.setName('link').setDescription('El enlace del thumbnail')))
                .addSubcommand(subcommad =>
                    subcommad
                        .setName('image')
                        .setDescription('Edita la imagen de un embed')
                        .addStringOption(option => option.setName('embed').setDescription('El nombre del embed').setRequired(true).setAutocomplete(true))
                        .addStringOption(option => option.setName('link').setDescription('El enlace de la imagen')))
                .addSubcommand(subcommad =>
                    subcommad
                        .setName('footer')
                        .setDescription('Edita el texto pie de un embed')
                        .addStringOption(option => option.setName('embed').setDescription('El nombre del embed').setRequired(true).setAutocomplete(true))
                        .addStringOption(option => option.setName('text').setDescription('El texto del footer'))
                        .addStringOption(option => option.setName('icon').setDescription('El ícono del footer')))
                .addSubcommand(subcommad =>
                    subcommad
                        .setName('timestamp')
                        .setDescription('Edita la marca de tiempo de un embed')
                        .addStringOption(option => option.setName('embed').setDescription('El nombre del embed').setRequired(true).setAutocomplete(true))
                        .addBooleanOption(option => option.setName('timestamp').setDescription('Añade una marca de tiempo')))),
    timeout: 0,
    memberperms: [Permissions.gestionarServidor],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces, Permissions.gestionarServidor],

    async autocomplete({ interaction, client, color, emojis }) {

        client.embeds = await embedModel.find({}, '-_id -__v').exec()
        let reduced = []
        const embedNames = client.embeds.filter(em => em.guildId === interaction.guild?.id).map(em => em.name);
        reduced = embedNames.slice(0, 25)

        try {
            const focusedValue = interaction.options.getFocused()
            if (!focusedValue) {
                await interaction.respond(reduced.map(choice => ({ name: choice, value: choice })))
            } else {
                const filtered = embedNames.filter(choice => choice.startsWith(focusedValue))
                await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })))
            }
        } catch (e) {
            console.log(`a: ${e}`)
        }
    },

    async run({ interaction, client, color, emojis }) {
        await interaction.deferReply()

        const subcommad = interaction.options.getSubcommand()
        const scg = interaction.options.getSubcommandGroup()
        const varis = variables(interaction).totalvars()

        client.embeds = await embedModel.find({}).exec()

        const embedName = interaction.options.getString('name') || interaction.options.getString('embed')
        const data = { guildId: interaction.guildId, name: embedName }
        const embedFound = await embedModel.findOne(data, '-_id -__v').exec()

        let embedData: EmbedDataType | undefined = undefined

        if (subcommad === 'create') {
            if (embedFound) {
                return interaction.editReply(`${emojis['hmph']} Ya existe un embed con ese nombre`)
            } else {
                await embedModel.create({ guildId: data.guildId, name: data.name, data: embedData })
                return await interaction.editReply(`${emojis['check']} El embed **${embedName}** fue creado correctamente`)
            }
        }
        if (subcommad === 'delete') {
            if (!embedFound) {
                return interaction.editReply(`${emojis.hmph} No existe un embed con ese nombre`)
            } else {
                await embedModel.deleteOne(data)
                return await interaction.editReply(`${emojis.check} El embed **${embedName}** fue eliminado correctamente`)
            }
        }
        if (subcommad === 'delete_all') {
            if (!client.embeds.filter((em) => em.guildId === interaction.guild?.id).length) {
                return interaction.editReply(`${emojis.error} Aún no hay embeds creados en este servidor ${emojis.sweat}`)
            } else {
                await embedModel.deleteMany({ guildId: interaction.guild?.id })
                return await interaction.editReply(`${emojis.check} Se han eliminado todos los embeds del servidor`)
            }
        }
        if (subcommad === 'list') {
            if (client.embeds.filter((em) => em.guildId === interaction.guild?.id).length) {
                let embedNames = client.embeds.filter((em) => em.guildId === interaction.guild?.id).map(function (em) {
                    return `${emojis['dot']} ${em.name}`
                })
                let embeds: EmbedBuilder[] = [], sliced = []

                for (let i = 0; i < embedNames.length; i += 10) {
                    sliced.push(embedNames.slice(i, i + 10))
                }

                sliced.forEach(embs => {
                    let emb = new EmbedBuilder()
                        .setColor(color)
                        .setAuthor({ name: interaction.guild?.name || '', iconURL: interaction.guild?.iconURL() || undefined })
                        .setTitle('Lista de embeds')
                        .setDescription(embs.join('\n'))
                    embeds.push(emb)
                })
                return createEmbedPagination(interaction as ChatInputCommandInteraction<"cached">, embeds)
            } else {
                return interaction.editReply(`${emojis.error} Aún no hay embeds creados en este servidor ${emojis.sweat}`)
            }
        }
        if (scg === 'edit' || subcommad === 'show') {
            if (!embedFound) {
                return interaction.editReply(`${client.emotes['hmph']} No existe un embed con ese nombre`)
            } else {
                embedData = embedFound.data
                const { replaceEmbedFields, replaceVars } = (await import('../../../util/functions'))?.default(client, interaction)
                let previewEmbed = embedData ? replaceEmbedFields(embedData) : new EmbedBuilder().setColor(client.color)

                if (subcommad === 'show') {
                    await (interaction.channel as TextChannel).send({
                        embeds: [previewEmbed],
                        allowedMentions: { repliedUser: false }
                    })
                }
                if (scg === 'edit') {
                    if (subcommad === 'author') {
                        const author = interaction.options.getString('text')
                        const icon = interaction.options.getString('icon')

                        const prevauthor = author ? replaceVars(author) : undefined
                        const previcon = icon ? replaceVars(icon) : undefined

                        if (icon && previcon) {
                            if (!icon.startsWith('https://') && !previcon.startsWith('https://')) {
                                return interaction.editReply(`${emojis.hmph} El ícono no es un link válido, utiliza {user_avatar} o {server_icon} en su lugar`)
                            }
                        }
                        previewEmbed.setAuthor({ name: prevauthor || author || '', iconURL: previcon || icon || undefined })
                        await embedModel.updateOne(data, { 'data.author': { name: author || '', icon_url: icon || '' } })
                        return await interaction.editReply({
                            content: (`${emojis.check}` + (author ? ` Autor actualizado` : ` Autor removido`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        }).catch(e => console.log(e))
                    }
                    if (subcommad === 'title') {
                        const title = interaction.options.getString('title') || undefined
                        const prevTitle = title ? replaceVars(title) : undefined

                        previewEmbed.data.title = prevTitle || title
                        await embedModel.updateOne(data, { 'data.title': title || '' })
                        return await interaction.editReply({
                            content: (`${emojis.check}` + (title ? ` Título actualizado` : ` Título removido`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (subcommad === 'description') {
                        let desc = interaction.options.getString('description') || undefined

                        if (desc) desc = desc.replace(/\\n/g, '\n')
                        const prevDesc = desc ? replaceVars(desc) : undefined

                        previewEmbed.data.description = prevDesc || desc
                        await embedModel.updateOne(data, { 'data.description': desc || '' })
                        return await interaction.editReply({
                            content: (`${emojis.check}` + (desc ? ` Descripción actualizada` : ` Descripción removida`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (subcommad === 'color') {
                        const color = interaction.options.getString('color')
                        const prevColor = color ? replaceVars(color) : client.color

                        if (color && prevColor) {
                            if (!/^#([0-9a-f]{6})/i.test(color) && !/^#([0-9a-f]{6})/i.test(prevColor as string)) {
                                return interaction.editReply(`${emojis.hmph} El color no es un código HEX válido. Prueba a utilizar {user_displaycolor} u otro color válido`)
                            }
                        }

                        previewEmbed.setColor(prevColor as ColorResolvable || color as ColorResolvable)
                        await embedModel.updateOne(data, { 'data.color': color || client.color })
                        return await interaction.editReply({
                            content: (`${emojis.check}` + (color ? ` Color actualizado` : ` Color removido`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (subcommad === 'thumbnail') {
                        const link = interaction.options.getString('link')
                        const prevThumb = link ? replaceVars(link) : null
                        console.log(link)

                        if (link && prevThumb) {
                            if (!prevThumb.startsWith('https://') && !link.startsWith('https://')) {
                                return interaction.editReply(`${emojis.hmph} El link para la miniatura no es un enlace válido, utiliza </variables:1059322453668663367> para ver la lista de variables disponibles`)
                            }
                        }

                        previewEmbed.setThumbnail(prevThumb || link)
                        await embedModel.updateOne(data, { 'data.thumbnail': link || '' })
                        return await interaction.editReply({
                            content: (`${emojis.check}` + (link ? ` Miniatura actualizada` : ` Miniatura removida`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (subcommad === 'image') {
                        const link = interaction.options.getString('link')
                        const prevImg = link ? replaceVars(link) : null

                        if (link && prevImg) {
                            if (!prevImg.startsWith('https://') && !link.startsWith('https://')) {
                                return interaction.editReply(`${emojis.hmph} El link para la imagen no es un enlace válido, utiliza </variables:1059322453668663367> para ver la lista de variables disponibles`)
                            }
                        }

                        previewEmbed.setImage(prevImg || link)
                        await embedModel.updateOne(data, { 'data.image': link || '' })

                        return await interaction.editReply({
                            content: (`${emojis.check}` + (link ? ` Imagen actualizada` : ` Imagen removida`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (subcommad === 'footer') {
                        const text = interaction.options.getString('text')
                        const icon = interaction.options.getString('icon')

                        let prevtext = text ? replaceVars(text) : undefined
                        let previcon = icon ? replaceVars(icon) : undefined

                        if (icon && previcon) {
                            if (!previcon.startsWith('https://') && !icon.startsWith('https://')) {
                                return interaction.editReply(`${emojis.hmph} El ícono no es un link válido, utiliza {user_avatar} o {server_icon} en su lugar`)
                            }
                        }
                        previewEmbed.setFooter({ text: prevtext || text || '', iconURL: previcon || icon || undefined })
                        await embedModel.updateOne(data, { 'data.footer': { text: text || '', icon_url: icon || '' } })
                        return await interaction.editReply({
                            content: (`${emojis.check}` + (text ? ` Texto de pie actualizado` : ` Texto de pie removido`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                    if (subcommad === 'timestamp') {
                        const timestamp = interaction.options.getBoolean('timestamp')

                        if (timestamp) try { previewEmbed.setTimestamp() } catch (e) { }

                        await embedModel.updateOne(data, { 'data.timestamp': timestamp || false })
                        return await interaction.editReply({
                            content: (`${emojis.check}` + (timestamp ? ` Marca de tiempo añadida` : ` Marca de tiempo removida`)),
                            embeds: [previewEmbed],
                            allowedMentions: { repliedUser: false }
                        })
                    }
                }
            }
        }
    }
})