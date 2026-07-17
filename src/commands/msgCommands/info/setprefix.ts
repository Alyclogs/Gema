import { Command } from "../../../structures/Command";
import { Permissions } from "../../../util/Permissions";
import { ColorResolvable, EmbedBuilder } from "discord.js";
import { model as serverconfig } from "../../../models/serverconfig-model";

export default new Command({
    name: 'setprefix',
    description: 'Cambia el prefijo del bot en este servidor',
    aliases: ['changeprefix'],
    uso: `\`gema setprefix <prefijo>\``,
    timeout: 0,
    memberperms: [Permissions.administrador],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ client, message, emojis, color, prefix }) {
        let newPrefix = message.content.slice(prefix.length).trim().split(' ').slice(1).join(' ')
        if (!newPrefix) return message.reply({ content: `${emojis.hmph} Debes especificar un nuevo prefijo` })
        if (newPrefix.length > 5) return message.reply({ content: `${emojis.hmph} El prefijo no puede tener más de 5 caracteres` })

        const serverData = await serverconfig.findOne({ guildId: message.guildId }).exec() || new serverconfig({ guildId: message.guildId, prefix: newPrefix })
        serverData.prefix = newPrefix
        await serverData.save()

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${emojis?.star} Prefijo cambiado`)
                    .setDescription(`El prefijo del bot en este servidor ha sido cambiado a: \`${newPrefix}\``)
                    .setColor(color as ColorResolvable)
            ]
        })
    }
})