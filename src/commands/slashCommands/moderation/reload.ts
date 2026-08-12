import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import type { SlashCommandRunOptions, SlashCommandType } from '../../../typing/Command';

const command: SlashCommandType = {
    owner: true,
    data: (() => {
        const builder = new SlashCommandBuilder()
            .setName('reload')
            .setDescription('Recarga un comando o un evento del bot (solo owner)')
            .addStringOption(option =>
                option.setName('tipo')
                    .setDescription('Qué quieres recargar')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Comando mensaje', value: 'message' },
                        { name: 'Comando slash', value: 'slash' },
                        { name: 'Evento', value: 'event' }
                    ))
            .addStringOption(option =>
                option.setName('objetivo')
                    .setDescription('Nombre del comando o del evento a recargar')
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        return builder as unknown as SlashCommandBuilder
    })(),
    botperms: [],
    memberperms: [],
    async run({ client, interaction }: SlashCommandRunOptions) {
        const type = interaction.options.getString('tipo', true)
        const target = interaction.options.getString('objetivo', true).replace(/^event:/i, '').trim()

        if (interaction.user.id !== client.ownerIDS[0]) {
            return interaction.reply({ content: 'Solo el owner puede usar este comando.', ephemeral: true })
        }

        try {
            if (type === 'event') {
                const reloaded = await client.reloadEvent(target)
                await interaction.reply({ content: `Evento recargado: ${reloaded}`, ephemeral: true })
            } else {
                const reloaded = await client.reloadCommand(target, type as 'message' | 'slash')
                await interaction.reply({ content: `Recargado: ${reloaded.join(', ')}`, ephemeral: true })
            }
        } catch (error) {
            await interaction.reply({ content: `No se pudo recargar: ${(error as Error).message}`, ephemeral: true })
        }
    }
}

export default command
