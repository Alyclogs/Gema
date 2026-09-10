import { ColorResolvable, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions'

export default new Command({
    name: 'ping',
    description: 'Devuelve información sobre mi latencia',
    aliases: ['latencia'],
    uso: '',
    cooldown: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ client, message, emojis, color }) {
        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`🏓 Pong!`)
                    .setDescription(`${emojis?.dot}Mensajes: \`${Date.now() - message.createdTimestamp}\` ms\n${emojis?.dot}API: \`${Math.round(client.ws.ping)}\` ms`)
                    .setColor(color as ColorResolvable)
            ],
            allowedMentions: { repliedUser: false }
        })
    }
});
