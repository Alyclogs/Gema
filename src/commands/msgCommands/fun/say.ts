import { Command } from "../../../structures/Command";
import { Permissions } from "../../../lib/Permissions";

export default new Command({
    name: 'say',
    description: 'Envía un mensaje con la bot',
    uso: `\`gema say <mensaje>\``,
    timeout: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes],

    async run({ message, prefix, emojis }) {
        await message.delete()
        let saymessage = message.content.slice(prefix.length).trim().split(' ').slice(1).join(' ')
        if (!saymessage) return message.reply({ content: `${emojis.hmph} No tengo nada que decir` })
        if ('send' in message.channel && typeof message.channel.send === 'function') {
            await message.channel.send(saymessage)
        }
    }
})
