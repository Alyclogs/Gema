import { ColorResolvable, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../../structures/Command";
import { Permissions } from "../../../lib/Permissions";
import { model as serverconfig } from "../../../models/serverconfig-model";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Muestra o cambia el prefijo actual del bot en este servidor')
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Muestra el prefijo actual del bot en este servidor')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Cambia el prefijo del bot en este servidor')
                .addStringOption(option =>
                    option
                        .setName('prefix')
                        .setDescription('El nuevo prefijo para el bot')
                        .setRequired(true)
                )
        ),
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ client, interaction, emojis, color }) {
        await interaction.deferReply();

        let serverData = await serverconfig.findOne({ guildId: interaction.guildId }).exec();
        if (!serverData) {
            serverData = await serverconfig.create({
                guildId: interaction.guildId,
                prefix: 'g.',
                welcomerSettings: {},
                farewellSettings: {},
                boostSettings: {}
            });
        }

        const prefix = serverData?.prefix || 'g.';

        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'show') {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${emojis?.star} Prefijo del bot`)
                        .setDescription(`El prefijo actual del bot en este servidor es: \`${prefix}\`\n${emojis.dot}También puedes usar el prefijo \`gema\` o mencionarme con \`@${client.user?.displayName}\`\n${emojis.dot}Puedes cambiar el prefijo con el comando \`setprefix\``)
                        .setColor(color as ColorResolvable)
                        .setFooter({ text: 'Puedes cambiar el prefijo con el comando `setprefix`' })
                ]
            })
        }
        if (subcommand === 'set') {
            const newPrefix = interaction.options.getString('prefix', true);
            serverData.prefix = newPrefix
            await serverData.save()

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${emojis?.star} Prefijo cambiado`)
                        .setDescription(`El prefijo del bot en este servidor ha sido cambiado a: \`${newPrefix}\``)
                        .setColor(color as ColorResolvable)
                ]
            })
        }
    }
})