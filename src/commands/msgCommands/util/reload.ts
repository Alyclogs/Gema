import { CommandType } from '../../../typing/Command';

const command: CommandType = {
    owner: true,
    name: 'reload',
    description: 'Recarga un comando o un evento del bot (solo owner)',
    aliases: ['rl'],
    botperms: [],
    memberperms: [],
    async run({ client, message, args }) {
        if (message.author.id !== client.ownerIDS[0]) {
            return message.reply('Solo el owner puede usar este comando.')
        }

        const [type, target] = args

        if (!type || !target) {
            return message.reply('Uso: `reload <message|slash|event> <objetivo>`')
        }

        const normalizedTarget = target.replace(/^event:/i, '').trim()

        try {
            if (type === 'event') {
                const reloaded = await client.reloadEvent(normalizedTarget)
                return message.reply(`Evento recargado: ${reloaded}`)
            }

            const reloaded = await client.reloadCommand(normalizedTarget, type as 'message' | 'slash')
            return message.reply(`Recargado: ${reloaded.join(', ')}`)
        } catch (error) {
            return message.reply(`No se pudo recargar: ${(error as Error).message}`)
        }
    }
}

export default command
