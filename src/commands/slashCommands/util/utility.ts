import { SlashCommand } from "../../../structures/Command";
import { ActionRowBuilder, ButtonBuilder, ColorResolvable, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Permissions } from "../../../lib/Permissions";
import { GButton } from "../../../models/gema-models";
import { applyUnicodeFont, FontKey, getRandomFontKey } from "../../../util/presentation/fonts";
import fontsData from '../../../lib/fonts.json';
import emojisData from '../../../lib/styles.json';
import { createProfileBanner } from "../../../util/presentation/banner";
import { generateColor, generateGradient, generatePalette, TONES, ToneKey } from "../../../util/presentation/colors";
import { renderColorSwatch, renderGradient, renderPalette } from "../../../util/presentation/colorImages";
import { generateDecoration, StyleCategory } from "../../../util/presentation/decor";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('utility')
        .setDescription('Comandos de utilidad')
        .addSubcommand(subcommand => subcommand
            .setName('banner')
            .setDescription('Crea un banner con tu nombre y tu avatar')
            .addAttachmentOption(option => option
                .setName('background')
                .setDescription('Imagen que quieres usar como fondo del banner')
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('decor')
            .setDescription('Crea un texto decorativo')
            .addStringOption(option => option
                .setName('text')
                .setDescription('Texto que quieres decorar')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('font')
                .setDescription('Fuente que quieres usar')
                .setRequired(false)
                .setAutocomplete(true)
            )
            .addStringOption(option => option
                .setName('style')
                .setDescription('Estilo que quieres usar')
                .setRequired(false)
                .setChoices((Object.keys(emojisData) as StyleCategory[]).map(style => ({ name: style, value: style })))
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('color')
            .setDescription('Genera un color aleatorio')
            .addStringOption(option => option
                .setName('tone')
                .setDescription('Tono de color que quieres generar')
                .setRequired(false)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('gradient')
            .setDescription('Genera un degradado de colores')
            .addStringOption(option => option
                .setName('tone')
                .setDescription('Tono de color que quieres generar')
                .setRequired(false)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('palette')
            .setDescription('Genera una paleta de colores')
            .addStringOption(option => option
                .setName('tone')
                .setDescription('Tono de color que quieres generar')
                .setRequired(false)
                .setAutocomplete(true)
            )
        ),
    timeout: 0,
    memberperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async autocomplete({ interaction, color, emojis, client }) {
        const subcommand = interaction.options.getSubcommand();
        const focusedOption = interaction.options.getFocused(true);
        const value = focusedOption.value;

        try {
            if (subcommand === 'decor') {
                if (focusedOption.name === 'font') {
                    const fonts = fontsData ? Object.keys(fontsData) as FontKey[] : [];
                    if (!value) {
                        const choices = fonts.map(font => ({
                            name: `${font} - ${applyUnicodeFont('Sample', font as FontKey)}`,
                            value: font
                        }));
                        await interaction.respond(choices.slice(0, 25));
                        return;
                    }
                    const filteredFonts = fonts.filter(font => font.toLowerCase().includes(value.toLowerCase()));
                    const choices = filteredFonts.map(font => ({
                        name: `${font} - ${applyUnicodeFont(value, font as FontKey)}`,
                        value: font
                    }));
                    await interaction.respond(choices.slice(0, 25));
                }
            }

            if (['color', 'gradient', 'palette'].includes(subcommand) && focusedOption.name === 'tone') {
                const toneKeys = Object.keys(TONES) as ToneKey[];
                const filteredTones = value
                    ? toneKeys.filter(key => key.toLowerCase().includes(value.toLowerCase()) || TONES[key].label.toLowerCase().includes(value.toLowerCase()))
                    : toneKeys;
                const choices = filteredTones.map(key => ({
                    name: `${TONES[key].label} (${key})`,
                    value: key
                }));
                await interaction.respond(choices.slice(0, 25));
            }
        } catch (error) {
            console.error('Error occurred while fetching fonts:', error);
            await interaction.respond([]);
        }
    },

    async run({ interaction, color, emojis, client }) {
        await interaction.deferReply({ ephemeral: false });

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "banner") {
            const backgroundAttachment = interaction.options.getAttachment('background', false);
            const backgroundUrl = backgroundAttachment?.url;

            const isValidImageAttachment = !backgroundAttachment || (
                backgroundAttachment.contentType?.startsWith('image/')
                ?? /\.(jpe?g|png|gif|webp)$/i.test(backgroundAttachment.name)
            );

            if (!isValidImageAttachment) {
                await interaction.editReply({ content: `${emojis.error} La imagen de fondo debe ser un archivo válido (jpg, jpeg, png, gif).` });
                return;
            }

            const username = interaction.user.displayName || interaction.user.username;
            const avatarUrl = interaction.user.displayAvatarURL({ size: 512, extension: 'png' });
            const tagline = interaction.user.username ? `@${interaction.user.username}` : 'Online';

            try {
                const bannerBuffer = await createProfileBanner({
                    username,
                    tagline,
                    avatarUrl,
                    backgroundUrl
                });
                await interaction.editReply({ files: [{ attachment: bannerBuffer, name: 'profile_banner.png' }] });
            } catch (error) {
                console.error('Error creating profile banner:', error);
                await interaction.editReply({ content: `${emojis.error} Ocurrió un error al crear el banner.` });
            }
        }

        if (subcommand === 'decor') {
            const text = interaction.options.getString('text', true);
            const rawFont = interaction.options.getString('font', false);
            const chosenFont = (rawFont && rawFont in fontsData ? rawFont : null) as FontKey | null;
            const style = interaction.options.getString('style', false) as StyleCategory | null;

            const buildDecoration = () => style
                ? generateDecoration(text, style, chosenFont ?? undefined)
                : applyUnicodeFont(text, chosenFont ?? getRandomFontKey());

            const buildEmbed = () => new EmbedBuilder()
                .setColor(color)
                .setTitle(emojis.star + 'Texto Decorativo')
                .setDescription(`\`\`\`\n${buildDecoration()}\n\`\`\``)

            // customId único por interacción: así el handler global no choca con el de otra ejecución de este mismo comando
            const regenerateButtonId = `btnRegenerateDecor_${interaction.id}`;
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(regenerateButtonId)
                    .setLabel('Regenerar')
                    .setEmoji('🎨')
                    .setStyle(1) // Primary style
            );
            await interaction.editReply({ embeds: [buildEmbed()], components: [actionRow] });

            const regenerateTtl = 5 * 60_000;
            client.registerButton(new GButton({
                customId: regenerateButtonId,
                run: async ({ interaction: btnInteraction }) => {
                    if (btnInteraction.user.id !== interaction.user.id) {
                        return btnInteraction.reply({ content: `${emojis.error} Sólo quien ejecutó el comando puede regenerar el texto`, ephemeral: true });
                    }
                    await btnInteraction.deferUpdate();
                    await btnInteraction.editReply({ embeds: [buildEmbed()], components: [actionRow] });
                }
            }), { ttl: regenerateTtl });

            setTimeout(async () => {
                const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    ButtonBuilder.from(actionRow.components[0]).setDisabled(true)
                );
                await interaction.editReply({ components: [disabledRow] }).catch(() => { });
            }, regenerateTtl);
        }

        if (subcommand === 'color') {
            const rawTone = interaction.options.getString('tone', false);
            const tone = (rawTone && rawTone in TONES ? rawTone : undefined) as ToneKey | undefined;

            const buildEmbed = (generated: ReturnType<typeof generateColor>) => new EmbedBuilder()
                .setColor(generated.hex as ColorResolvable)
                .setTitle(`${emojis.star}Color Generado`)
                .setDescription(`**HEX:** \`${generated.hex}\`\n**HSL:** \`${generated.hsl.h}, ${generated.hsl.s}%, ${generated.hsl.l}%\``)
                .setImage('attachment://color.png');

            let generated = generateColor(tone);
            const regenerateButtonId = `btnRegenerateColor_${interaction.id}`;
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(regenerateButtonId)
                    .setLabel('Regenerar')
                    .setEmoji('🎨')
                    .setStyle(1)
            );

            await interaction.editReply({
                embeds: [buildEmbed(generated)],
                files: [{ attachment: renderColorSwatch(generated.hex), name: 'color.png' }],
                components: [actionRow]
            });

            const regenerateTtl = 5 * 60_000;
            client.registerButton(new GButton({
                customId: regenerateButtonId,
                run: async ({ interaction: btnInteraction }) => {
                    if (btnInteraction.user.id !== interaction.user.id) {
                        return btnInteraction.reply({ content: `${emojis.error} Sólo quien ejecutó el comando puede regenerar el color`, ephemeral: true });
                    }
                    generated = generateColor(tone);
                    await btnInteraction.deferUpdate();
                    await btnInteraction.editReply({
                        embeds: [buildEmbed(generated)],
                        files: [{ attachment: renderColorSwatch(generated.hex), name: 'color.png' }],
                        components: [actionRow]
                    });
                }
            }), { ttl: regenerateTtl });

            setTimeout(async () => {
                const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    ButtonBuilder.from(actionRow.components[0]).setDisabled(true)
                );
                await interaction.editReply({ components: [disabledRow] }).catch(() => { });
            }, regenerateTtl);
        }

        if (subcommand === 'gradient') {
            const rawTone = interaction.options.getString('tone', false);
            const tone = (rawTone && rawTone in TONES ? rawTone : undefined) as ToneKey | undefined;

            const buildEmbed = (generated: ReturnType<typeof generateGradient>) => new EmbedBuilder()
                .setColor(generated[0].hex as ColorResolvable)
                .setTitle(`${emojis.star}Degradado de Colores`)
                .setDescription(generated.map(c => `\`${c.hex}\``).join(' → '))
                .setImage('attachment://gradient.png');

            let generated = generateGradient(tone);
            const regenerateButtonId = `btnRegenerateGradient_${interaction.id}`;
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(regenerateButtonId)
                    .setLabel('Regenerar')
                    .setEmoji('🎨')
                    .setStyle(1)
            );

            await interaction.editReply({
                embeds: [buildEmbed(generated)],
                files: [{ attachment: renderGradient(generated.map(c => c.hex)), name: 'gradient.png' }],
                components: [actionRow]
            });

            const regenerateTtl = 5 * 60_000;
            client.registerButton(new GButton({
                customId: regenerateButtonId,
                run: async ({ interaction: btnInteraction }) => {
                    if (btnInteraction.user.id !== interaction.user.id) {
                        return btnInteraction.reply({ content: `${emojis.error} Sólo quien ejecutó el comando puede regenerar el degradado`, ephemeral: true });
                    }
                    generated = generateGradient(tone);
                    await btnInteraction.deferUpdate();
                    await btnInteraction.editReply({
                        embeds: [buildEmbed(generated)],
                        files: [{ attachment: renderGradient(generated.map(c => c.hex)), name: 'gradient.png' }],
                        components: [actionRow]
                    });
                }
            }), { ttl: regenerateTtl });

            setTimeout(async () => {
                const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    ButtonBuilder.from(actionRow.components[0]).setDisabled(true)
                );
                await interaction.editReply({ components: [disabledRow] }).catch(() => { });
            }, regenerateTtl);
        }

        if (subcommand === 'palette') {
            const rawTone = interaction.options.getString('tone', false);
            const tone = (rawTone && rawTone in TONES ? rawTone : undefined) as ToneKey | undefined;

            const buildEmbed = (generated: ReturnType<typeof generatePalette>) => new EmbedBuilder()
                .setColor(generated[0].hex as ColorResolvable)
                .setTitle(`${emojis.star}Paleta de Colores`)
                .setDescription(generated.map(c => `\`${c.hex}\``).join('\n'))
                .setImage('attachment://palette.png');

            let generated = generatePalette(tone);
            const regenerateButtonId = `btnRegeneratePalette_${interaction.id}`;
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(regenerateButtonId)
                    .setLabel('Regenerar')
                    .setEmoji('🎨')
                    .setStyle(1)
            );

            await interaction.editReply({
                embeds: [buildEmbed(generated)],
                files: [{ attachment: renderPalette(generated.map(c => c.hex)), name: 'palette.png' }],
                components: [actionRow]
            });

            const regenerateTtl = 5 * 60_000;
            client.registerButton(new GButton({
                customId: regenerateButtonId,
                run: async ({ interaction: btnInteraction }) => {
                    if (btnInteraction.user.id !== interaction.user.id) {
                        return btnInteraction.reply({ content: `${emojis.error} Sólo quien ejecutó el comando puede regenerar la paleta`, ephemeral: true });
                    }
                    generated = generatePalette(tone);
                    await btnInteraction.deferUpdate();
                    await btnInteraction.editReply({
                        embeds: [buildEmbed(generated)],
                        files: [{ attachment: renderPalette(generated.map(c => c.hex)), name: 'palette.png' }],
                        components: [actionRow]
                    });
                }
            }), { ttl: regenerateTtl });

            setTimeout(async () => {
                const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    ButtonBuilder.from(actionRow.components[0]).setDisabled(true)
                );
                await interaction.editReply({ components: [disabledRow] }).catch(() => { });
            }, regenerateTtl);
        }
    }
})
