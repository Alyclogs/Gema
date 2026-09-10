import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import {
  Autoresponder,
  buttonModel,
  GButton
} from '../../../models/gema-models';
import { Permissions } from '../../../lib/Permissions';
import { createEmbedPagination } from '../../../util/pagination';
import { Command } from '../../../structures/Command';
import ExtendedMessage from '../../../typing/ExtendedMessage';

const styles: Record<string, ButtonStyle> = {
  '1': ButtonStyle.Primary,
  primary: ButtonStyle.Primary,
  primario: ButtonStyle.Primary,
  '2': ButtonStyle.Secondary,
  secondary: ButtonStyle.Secondary,
  secundario: ButtonStyle.Secondary,
  '3': ButtonStyle.Success,
  success: ButtonStyle.Success,
  éxito: ButtonStyle.Success,
  exito: ButtonStyle.Success,
  '4': ButtonStyle.Danger,
  danger: ButtonStyle.Danger,
  peligro: ButtonStyle.Danger
};

function splitValues(args: string[], start: number) {
  return args
    .slice(start)
    .join(' ')
    .split('|')
    .map((value) => value.trim());
}

export default new Command({
  name: 'button',
  description: 'Crea y administra botones para mensajes o autoresponders',
  aliases: ['btn', 'botón', 'boton'],
  uso: '`gema button <subcomando>`\n`gema help button <subcomando>` para obtener más ayuda',
  cooldown: 0,
  subcommands: [
    {
      name: 'create',
      description:
        'Crea un botón nuevo. Cada servidor puede tener hasta 6 botones',
      uso: '`gema button create <nombre>`'
    },
    {
      name: 'delete',
      description: 'Elimina un botón existente',
      uso: '`gema button delete <nombre>`'
    },
    {
      name: 'show',
      description: 'Muestra la vista previa de un botón existente',
      uso: '`gema button show <nombre>`'
    },
    {
      name: 'list',
      description: 'Lista los botones existentes en el servidor',
      uso: '`gema button list`'
    },
    {
      name: 'edit',
      description: 'Edita la respuesta o los datos visuales de un botón',
      uso: '`gema button edit <opción> ...`\nUsa `gema help button edit <opción>` para consultar cada formato',
      options: [
        {
          name: 'reply',
          description:
            'Edita la respuesta del botón. Añade `--ephemeral` para que sólo la vea quien pulse el botón',
          uso: '`gema button edit reply <nombre> | <respuesta> [--ephemeral]`'
        },
        {
          name: 'data',
          description:
            'Edita etiqueta, estilo y emoji. Estilos: `primary`, `secondary`, `success`, `danger` (o 1-4). Deja una sección vacía para conservar su valor',
          uso: '`gema button edit data <nombre> | <etiqueta> | <estilo> | <emoji>`'
        }
      ]
    }
  ],
  memberperms: [Permissions.gestionarServidor],
  botperms: [
    Permissions.verCanal,
    Permissions.enviarMensajes,
    Permissions.insertarEnlaces
  ],

  async run({ message, client, args, color, emojis, prefix }) {
    client.functions.setInput(message as ExtendedMessage);
    await client.syncButtons();

    const subcommand = args[0]?.toLowerCase();
    if (!subcommand)
      return message.reply(
        `${emojis.confused} Debes especificar un subcomando. Usa \`${prefix}help button\`.`
      );

    if (subcommand === 'list') {
      const guildButtons = await buttonModel
        .find({ guildId: message.guildId })
        .exec();
      if (!guildButtons.length)
        return message.reply(
          `${emojis.error} Aún no hay botones creados en este servidor ${emojis.sweat}`
        );

      const buttonNames = guildButtons.map(
        (button) => `${emojis.dot} ${button.name}`
      );
      const pages: EmbedBuilder[] = [];
      for (let index = 0; index < buttonNames.length; index += 10) {
        pages.push(
          new EmbedBuilder()
            .setColor(color)
            .setAuthor({
              name: message.guild?.name || '',
              iconURL: message.guild?.iconURL() || undefined
            })
            .setTitle('Lista de botones')
            .setDescription(buttonNames.slice(index, index + 10).join('\n'))
        );
      }
      return createEmbedPagination(message, pages);
    }

    const isEdit = subcommand === 'edit';
    const option = isEdit ? args[1]?.toLowerCase() : undefined;
    const values = splitValues(args, isEdit ? 2 : 1);
    const buttonName = values[0];

    if (!buttonName)
      return message.reply(
        `${emojis.confused} Debes especificar el nombre del botón. Usa \`${prefix}help button ${subcommand}\`.`
      );

    const customId = `arbtn_${buttonName}`;
    const buttonData = { guildId: message.guildId, customId };
    const buttonFound = await buttonModel.findOne(buttonData).exec();

    if (subcommand === 'show') {
      if (!buttonFound)
        return message.reply(
          `${emojis.hmph} No existe un botón con ese nombre`
        );

      const button = new ButtonBuilder()
        .setCustomId(buttonFound.customId)
        .setStyle(buttonFound.data.style || ButtonStyle.Primary);
      if (buttonFound.data.label) button.setLabel(buttonFound.data.label);
      if (buttonFound.data.emoji) button.setEmoji(buttonFound.data.emoji);

      return message.reply({
        content: `${emojis.check} Botón **${buttonName}**`,
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(button)
        ]
      });
    }

    if (subcommand === 'create') {
      const guildButtonCount = await buttonModel.countDocuments({
        guildId: message.guildId
      });
      if (guildButtonCount >= 6)
        return message.reply(
          `${emojis.error} Límite de 6 botones por servidor alcanzado. Elimina alguno con \`${prefix}button delete\``
        );
      if (buttonFound)
        return message.reply(
          `${emojis.hmph} Ya existe un botón con ese nombre, prueba a editarlo con \`${prefix}button edit\``
        );

      const button = new GButton();
      button.guildId = message.guildId || '';
      button.customId = customId;
      button.name = buttonName;
      await buttonModel.create(button);
      await client.syncButtons();
      return message.reply(
        `${emojis.check} El botón **${buttonName}** fue creado correctamente`
      );
    }

    if (subcommand === 'delete') {
      if (!buttonFound)
        return message.reply(
          `${emojis.hmph} No existe un botón con ese nombre`
        );
      await buttonModel.deleteOne(buttonData);
      await client.syncButtons();
      return message.reply(
        `${emojis.check} El botón **${buttonName}** fue eliminado correctamente`
      );
    }

    if (subcommand !== 'edit')
      return message.reply(
        `${emojis.confused} El subcomando no es válido. Usa \`${prefix}help button\`.`
      );
    if (!buttonFound)
      return message.reply(
        `${emojis.hmph} No existe un botón con ese nombre, prueba a crearlo con \`${prefix}button create\``
      );

    const preview = new ButtonBuilder()
      .setCustomId(buttonFound.customId)
      .setStyle(buttonFound.data.style || ButtonStyle.Primary);
    if (buttonFound.data.label) preview.setLabel(buttonFound.data.label);
    if (buttonFound.data.emoji) preview.setEmoji(buttonFound.data.emoji);

    if (option === 'reply') {
      let reply = values.slice(1).join(' | ').trim();
      const ephemeral = /(?:^|\s)--ephemeral(?:\s|$)/i.test(reply);
      reply = reply.replace(/(?:^|\s)--ephemeral(?:\s|$)/gi, ' ').trim();

      if (!reply)
        return message.reply(
          `${emojis.confused} Debes especificar una respuesta para el botón`
        );

      let autoresponder: Autoresponder;
      try {
        autoresponder = await client.functions.createAutoresponder(
          message,
          reply
        );
      } catch (error) {
        return message.reply(`${emojis.error} ${error}`);
      }

      await buttonModel.updateOne(buttonData, {
        reply: autoresponder.arReply,
        ephemeral
      });
      await client.syncButtons();
      return message.reply({
        content: `${emojis.check} Respuesta del botón actualizada${ephemeral ? ' como efímera' : ''
          }`,
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(preview)
        ]
      });
    }

    if (option === 'data') {
      const label = values[1] || undefined;
      const styleInput = values[2]?.toLowerCase() || undefined;
      const emoji = values[3] || undefined;
      const style = styleInput ? styles[styleInput] : undefined;

      if (styleInput && !style)
        return message.reply(
          `${emojis.hmph} Estilo inválido. Usa primary, secondary, success, danger o un número del 1 al 4`
        );

      const newData = {
        label: label ?? buttonFound.data.label,
        style:
          style ??
          ([1, 2, 3, 4].includes(Number(buttonFound.data.style))
            ? Number(buttonFound.data.style)
            : ButtonStyle.Primary),
        emoji: emoji ?? buttonFound.data.emoji
      };

      if (newData.label) preview.setLabel(newData.label);
      if (newData.style) preview.setStyle(newData.style);
      if (newData.emoji) {
        try {
          preview.setEmoji(newData.emoji);
        } catch {
          return message.reply(
            `${emojis.hmph} El emoji especificado no es válido`
          );
        }
      }

      if (!newData.label && !newData.emoji)
        return message.reply(
          `${emojis.hmph} El botón debe tener una etiqueta o un emoji`
        );

      await buttonModel.updateOne(buttonData, { data: newData });
      await client.syncButtons();
      return message.reply({
        content: `${emojis.check} Datos del botón actualizados`,
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(preview)
        ]
      });
    }

    return message.reply(
      `${emojis.confused} La opción no es válida. Usa \`${prefix}help button edit\`.`
    );
  }
});
