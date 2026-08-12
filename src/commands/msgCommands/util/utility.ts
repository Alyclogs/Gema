import { Command } from "../../../structures/Command";
import { ActionRowBuilder, ButtonBuilder, ColorResolvable, EmbedBuilder, Message } from "discord.js";
import { Permissions } from "../../../lib/Permissions";
import { GButton } from "../../../models/gema-models";
import { applyUnicodeFont, FontKey, getRandomFontKey } from "../../../helpers/decoration/fonts";
import fontsData from '../../../lib/fonts.json';
import emojisData from '../../../lib/styles.json';
import { createProfileBanner } from "../../../helpers/decoration/banner";
import { generateColor, generateGradient, generatePalette, TONES, ToneKey } from "../../../helpers/decoration/colors";
import { renderColorSwatch, renderGradient, renderPalette } from "../../../helpers/decoration/colorImages";
import { generateDecoration, StyleCategory } from "../../../helpers/decoration/decor";

const toneNames = Object.keys(TONES).join(', ');
const fontNames = Object.keys(fontsData).join(', ');
const styleNames = Object.keys(emojisData).join(', ');

export default new Command({
    name: 'utility',
    aliases: ['util'],
    description: 'Comandos de utilidad: banner de perfil, texto decorativo y generación de colores',
    uso: '`gema utility <subcomando>`\n`gema help utility <subcomando>` para obtener más ayuda',
    timeout: 0,
    subcommands: [
        {
            name: 'banner',
            description: 'Crea un banner con tu nombre y tu avatar. Adjunta una imagen al mensaje para usarla como fondo',
            uso: '`gema utility banner` (adjunta opcionalmente una imagen de fondo al mensaje)'
        },
        {
            name: 'decor',
            description: 'Crea un texto decorativo',
            uso: '`gema utility decor <texto> | [fuente] | [estilo]`',
            options: [
                {
                    name: 'fuente',
                    description: `Fuentes disponibles: ${fontNames}`
                },
                {
                    name: 'estilo',
                    description: `Estilos disponibles: ${styleNames}`
                }
            ]
        },
        {
            name: 'color',
            description: 'Genera un color aleatorio',
            uso: `\`gema utility color [tono]\`\nTonos disponibles: ${toneNames}`
        },
        {
            name: 'gradient',
            description: 'Genera un degradado de colores',
            uso: `\`gema utility gradient [tono]\`\nTonos disponibles: ${toneNames}`
        },
        {
            name: 'palette',
            description: 'Genera una paleta de colores',
            uso: `\`gema utility palette [tono]\`\nTonos disponibles: ${toneNames}`
        }
    ],
    memberperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ message, client, args, color, emojis, prefix }) {
        const subcommand = args[0]?.toLowerCase();
        if (!subcommand) return message.reply(`${emojis.confused} Debes especificar un subcomando. Usa \`${prefix}help utility\`.`);

        const regenerateTtl = 5 * 60_000;
        const disableButton = async (sentMessage: Message, actionRow: ActionRowBuilder<ButtonBuilder>) => {
            setTimeout(async () => {
                const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    ButtonBuilder.from(actionRow.components[0]).setDisabled(true)
                );
                await sentMessage.edit({ components: [disabledRow] }).catch(() => { });
            }, regenerateTtl);
        };

        if (subcommand === 'banner') {
            const attachment = message.attachments.first();
            const backgroundUrl = attachment?.url;

            const isValidImageAttachment = !attachment || (
                attachment.contentType?.startsWith('image/')
                ?? /\.(jpe?g|png|gif|webp)$/i.test(attachment.name || '')
            );

            if (!isValidImageAttachment) {
                return message.reply(`${emojis.error} La imagen de fondo debe ser un archivo válido (jpg, jpeg, png, gif).`);
            }

            const username = message.author.displayName || message.author.username;
            const avatarUrl = message.author.displayAvatarURL({ size: 512, extension: 'png' });
            const tagline = `@${message.author.username}`;

            try {
                const bannerBuffer = await createProfileBanner({ username, tagline, avatarUrl, backgroundUrl });
                return message.reply({ files: [{ attachment: bannerBuffer, name: 'profile_banner.png' }] });
            } catch (error) {
                console.error('Error creating profile banner:', error);
                return message.reply(`${emojis.error} Ocurrió un error al crear el banner.`);
            }
        }

        if (subcommand === 'decor') {
            const parts = args.slice(1).join(' ').split('|').map(p => p.trim());
            const text = parts[0];
            if (!text) return message.reply(`${emojis.confused} Debes especificar un texto para decorar. Usa \`${prefix}help utility decor\`.`);

            const rawFont = parts[1]?.toLowerCase();
            if (rawFont && !(rawFont in fontsData)) return message.reply(`${emojis.hmph} La fuente especificada no es válida. Fuentes disponibles: ${fontNames}`);
            const chosenFont = (rawFont as FontKey) || null;

            const rawStyle = parts[2]?.toLowerCase();
            if (rawStyle && !(rawStyle in emojisData)) return message.reply(`${emojis.hmph} El estilo especificado no es válido. Estilos disponibles: ${styleNames}`);
            const style = (rawStyle as StyleCategory) || null;

            const buildDecoration = () => style
                ? generateDecoration(text, style, chosenFont ?? undefined)
                : applyUnicodeFont(text, chosenFont ?? getRandomFontKey());

            const buildEmbed = () => new EmbedBuilder()
                .setColor(color)
                .setTitle(emojis.star + 'Texto Decorativo')
                .setDescription(`\`\`\`\n${buildDecoration()}\n\`\`\``);

            const regenerateButtonId = `btnRegenerateDecor_${message.id}`;
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(regenerateButtonId)
                    .setLabel('Regenerar')
                    .setEmoji('🎨')
                    .setStyle(1)
            );

            const sentMessage = await message.reply({ embeds: [buildEmbed()], components: [actionRow] });

            client.registerButton(new GButton({
                customId: regenerateButtonId,
                run: async ({ interaction: btnInteraction }) => {
                    if (btnInteraction.user.id !== message.author.id) {
                        return btnInteraction.reply({ content: `${emojis.error} Sólo quien ejecutó el comando puede regenerar el texto`, ephemeral: true });
                    }
                    await btnInteraction.deferUpdate();
                    await btnInteraction.editReply({ embeds: [buildEmbed()], components: [actionRow] });
                }
            }), { ttl: regenerateTtl });

            return disableButton(sentMessage, actionRow);
        }

        if (subcommand === 'color') {
            const rawTone = args[1]?.toLowerCase();
            if (rawTone && !(rawTone in TONES)) return message.reply(`${emojis.hmph} El tono especificado no es válido. Tonos disponibles: ${toneNames}`);
            const tone = (rawTone as ToneKey) || undefined;

            const buildEmbed = (generated: ReturnType<typeof generateColor>) => new EmbedBuilder()
                .setColor(generated.hex as ColorResolvable)
                .setTitle(`${emojis.star}Color Generado`)
                .setDescription(`**HEX:** \`${generated.hex}\`\n**HSL:** \`${generated.hsl.h}, ${generated.hsl.s}%, ${generated.hsl.l}%\``)
                .setImage('attachment://color.png');

            let generated = generateColor(tone);
            const regenerateButtonId = `btnRegenerateColor_${message.id}`;
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(regenerateButtonId)
                    .setLabel('Regenerar')
                    .setEmoji('🎨')
                    .setStyle(1)
            );

            const sentMessage = await message.reply({
                embeds: [buildEmbed(generated)],
                files: [{ attachment: renderColorSwatch(generated.hex), name: 'color.png' }],
                components: [actionRow]
            });

            client.registerButton(new GButton({
                customId: regenerateButtonId,
                run: async ({ interaction: btnInteraction }) => {
                    if (btnInteraction.user.id !== message.author.id) {
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

            return disableButton(sentMessage, actionRow);
        }

        if (subcommand === 'gradient') {
            const rawTone = args[1]?.toLowerCase();
            if (rawTone && !(rawTone in TONES)) return message.reply(`${emojis.hmph} El tono especificado no es válido. Tonos disponibles: ${toneNames}`);
            const tone = (rawTone as ToneKey) || undefined;

            const buildEmbed = (generated: ReturnType<typeof generateGradient>) => new EmbedBuilder()
                .setColor(generated[0].hex as ColorResolvable)
                .setTitle(`${emojis.star}Degradado de Colores`)
                .setDescription(generated.map(c => `\`${c.hex}\``).join(' → '))
                .setImage('attachment://gradient.png');

            let generated = generateGradient(tone);
            const regenerateButtonId = `btnRegenerateGradient_${message.id}`;
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(regenerateButtonId)
                    .setLabel('Regenerar')
                    .setEmoji('🎨')
                    .setStyle(1)
            );

            const sentMessage = await message.reply({
                embeds: [buildEmbed(generated)],
                files: [{ attachment: renderGradient(generated.map(c => c.hex)), name: 'gradient.png' }],
                components: [actionRow]
            });

            client.registerButton(new GButton({
                customId: regenerateButtonId,
                run: async ({ interaction: btnInteraction }) => {
                    if (btnInteraction.user.id !== message.author.id) {
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

            return disableButton(sentMessage, actionRow);
        }

        if (subcommand === 'palette') {
            const rawTone = args[1]?.toLowerCase();
            if (rawTone && !(rawTone in TONES)) return message.reply(`${emojis.hmph} El tono especificado no es válido. Tonos disponibles: ${toneNames}`);
            const tone = (rawTone as ToneKey) || undefined;

            const buildEmbed = (generated: ReturnType<typeof generatePalette>) => new EmbedBuilder()
                .setColor(generated[0].hex as ColorResolvable)
                .setTitle(`${emojis.star}Paleta de Colores`)
                .setDescription(generated.map(c => `\`${c.hex}\``).join('\n'))
                .setImage('attachment://palette.png');

            let generated = generatePalette(tone);
            const regenerateButtonId = `btnRegeneratePalette_${message.id}`;
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(regenerateButtonId)
                    .setLabel('Regenerar')
                    .setEmoji('🎨')
                    .setStyle(1)
            );

            const sentMessage = await message.reply({
                embeds: [buildEmbed(generated)],
                files: [{ attachment: renderPalette(generated.map(c => c.hex)), name: 'palette.png' }],
                components: [actionRow]
            });

            client.registerButton(new GButton({
                customId: regenerateButtonId,
                run: async ({ interaction: btnInteraction }) => {
                    if (btnInteraction.user.id !== message.author.id) {
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

            return disableButton(sentMessage, actionRow);
        }

        return message.reply(`${emojis.confused} El subcomando no es válido. Usa \`${prefix}help utility\`.`);
    }
})
