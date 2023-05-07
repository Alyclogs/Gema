const { Client, Message, EmbedBuilder } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');
const Booru = require('booru')

module.exports = {
    name: 'nsfw',
    description: 'Busca imágenes o gifs sobre categorías específicas en sitios booru o rule34',
    aliases: [],
    uso: `\`gema nsfw <tags>\``,
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces],

    /**
     * @param {Client} client
     * @param {Message} message
     */
    async execute(client, message, args, prefix, emojis, color) {
        if (!message.channel.nsfw) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(color)
                        .setTitle(`${emojis.sweat} Comando NSFW`)
                        .setDescription(`Para ejecutar este comando, el canal debe permitir contenido NSFW`)
                ],
                allowedMentions: { repliedUser: false }
            })
        }

        let tags = args
        if (!tags) return await message.reply(`${emojis.confused} Necesitas especificar al menos una categoría`)

        let sites = [
            'rule34', 'derpibooru',
            'konan', 'gelbooru',
            'hypno', 'xbooru',
        ]

        let results = await getResults(tags, get3b(sites), 0)
        let urls, urlss = get3(results)
        let seen = client.nsfwgifs.length >= 1 && urlss?.length >= 1 ? client.nsfwgifs.some(g => urlss.find(u => u.url === g.url)) : false
        let cont = 0

        if (!urlss.length) {
            return await message.reply({
                content: `${emojis.confused} No se han encontrado resultados para tu búsqueda, intenta con otras categorías`
            })
        }

        while (seen) {
            if (cont == 10) results = await getResults(tags, get3b(sites), 0)
            if (cont == 20) break
            urlss = get3(results)
            cont++
        }
        urls = urlss || []

        await message.reply({
            content: `**Búsqueda**: ${urls.map(u => `\`${u.site}\``).join(', ')}` + `\n` +
                `**Tags: ${tags.map(tag => `\`${tag}\``).join(', ')}**` + '\n' +
                `${urls.map((item, ind) => `**#${ind + 1}** - ${item.url}`).join('\n')}`
        })
        urls.forEach(url => client.nsfwgifs.push(url))

        async function getResults(tags, sites, i) {
            let results = []
            for (let site of sites) {
                try {
                    await Booru.search(site, tags, { limit: 100 })
                        .then(posts => {
                            if (posts.length !== 0) {
                                for (let post of posts) {
                                    if (results.length >= 250) break
                                    if (!results.find(r => r.url === post.fileUrl)) {
                                        results.push({ site: site, url: post.fileUrl })
                                    }
                                }
                            }
                        })
                } catch (e) {
                    await getResults(tags, sites, i)
                }
            }
            if (results.length < 10 && i < 3) await getResults(tags, sites, i + 1)
            return results
        }

        function get3(arr) {
            if (arr.length >= 1) {
                let reduced = []
                while (reduced.length < 3) {
                    let item = arr[Math.floor(Math.random() * arr.length)]
                    if (!reduced.find(u => u.url === item.url)) {
                        reduced.push(item)
                    }
                }
                return reduced
            } return []
        }

        function get3b(arr) {
            if (arr.length >= 1) {
                let reduced = []
                while (reduced.length < 3) {
                    let item = arr[Math.floor(Math.random() * arr.length)]
                    if (reduced.indexOf(item) == -1) {
                        reduced.push(item)
                    }
                }
                return reduced
            } return []
        }
    }
}