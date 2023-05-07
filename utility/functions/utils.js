const { EmbedBuilder } = require("discord.js");
const { variables } = require('../../utility/structures/Variables')
const { ErrorCodes } = require('../../utility/data/Errors')

module.exports = (client, input) => {
    let varis = variables(input).totalvars()

    return {
        replaceEmbedFields: function (embedData) {
            let previewEmbed = new EmbedBuilder()

            if (embedData.author?.name || embedData.author?.icon_url) {
                let icon = embedData.author.icon_url.startsWith('https://') ? embedData.author.icon_url
                    : replaceVars(embedData.author.icon_url).startsWith('https://') ? replaceVars(embedData.author.icon_url) : undefined;
                previewEmbed.setAuthor({ name: replaceVars(embedData.author.name) || '', iconURL: icon })
            }
            if (embedData.title) previewEmbed.data.title = replaceVars(embedData.title) || '';
            if (embedData.description) {
                previewEmbed.data.description = replaceVars(embedData.description).replace(/\\n/g, '\n')
            }
            if (embedData.thumbnail) {
                if (embedData.thumbnail.startsWith('https://')) previewEmbed.setThumbnail(embedData.thumbnail)
                if (replaceVars(embedData.thumbnail).startsWith('https://')) previewEmbed.setThumbnail(replaceVars(embedData.thumbnail))
            }
            if (embedData.image) {
                if (embedData.image.startsWith('https://')) previewEmbed.setImage(embedData.image);
                if (replaceVars(embedData.image).startsWith('https://')) previewEmbed.setImage(replaceVars(embedData.image));
            }
            if (embedData.footer?.text || embedData.footer?.icon_url) {
                let icon = embedData.footer.icon_url.startsWith('https://') ? embedData.footer.icon_url
                    : replaceVars(embedData.footer.icon_url).startsWith('https://') ? replaceVars(embedData.footer.icon_url) : undefined;
                previewEmbed.setFooter({ text: replaceVars(embedData.footer.text) || '', iconURL: icon })
            }
            if (embedData.timestamp) previewEmbed.setTimestamp()

            if (!embedData.color) previewEmbed.setColor(client.color)
            if (replaceVars(embedData.color)) previewEmbed.setColor(replaceVars(embedData.color))

            return previewEmbed
        },
        replaceVars: function (str) {
            return replaceVars(str)
        }
    }

    function replaceVars(str) {
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
        }
        return str
    }
}