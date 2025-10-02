import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../../structures/Command";
import { Permissions } from "../../../util/Permissions";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Envia un mensaje con la bot')
        .addStringOption((option) =>
            option.setName('mensaje').setDescription('El mensaje a enviar').setRequired(true)),
    timeout: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes],

    async run({ interaction, args, client, color, emojis }) {
        interaction.reply({ content: 'Mensaje enviado!', ephemeral: true, fetchReply: true })
        const msg = args.getString('mensaje')
        if (msg) interaction.channel?.send(msg)
    }
})