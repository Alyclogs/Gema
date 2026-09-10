import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../../structures/Command";
import { SlashCommandType } from "../../../typing/Command";
import { Permissions } from "../../../lib/Permissions";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Envia un mensaje con la bot')
        .addStringOption((option) =>
            option.setName('mensaje').setDescription('El mensaje a enviar').setRequired(true)) as unknown as SlashCommandType["data"],
    cooldown: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes],

    async run({ interaction, args, client, color, emojis }) {
        await interaction.reply({ content: 'Mensaje enviado!', ephemeral: true, fetchReply: true })
        const msg = args.getString('mensaje')
        if (msg && interaction.channel && 'send' in interaction.channel && typeof interaction.channel.send === 'function') {
            await interaction.channel.send(msg)
        }
    }
})
