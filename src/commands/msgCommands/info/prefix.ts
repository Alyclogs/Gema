import { ColorResolvable, EmbedBuilder } from "discord.js";
import { Command } from "../../../structures/Command";
import { Permissions } from "../../../util/Permissions";

export default new Command({
    name: 'prefix',
    description: 'Muestra el prefijo actual del bot en este servidor',
    aliases: ['prefijo'],
    uso: '',
    timeout: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ client, message, emojis, color, prefix }) {
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${emojis?.star} Prefijo del bot`)
                    .setDescription(`El prefijo actual del bot en este servidor es: \`${prefix}\`\n${emojis.dot}También puedes usar el prefijo \`gema\` o mencionarme con \`@${client.user?.displayName}\`\n${emojis.dot}Puedes cambiar el prefijo con el comando \`setprefix\``)
                    .setColor(color as ColorResolvable)
            ]
        })
    }
})