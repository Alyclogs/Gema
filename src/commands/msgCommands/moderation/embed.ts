import { ColorResolvable, EmbedBuilder } from 'discord.js';
import { embedModel, EmbedDataType, GEmbed } from '../../../models/gema-models';
import { createEmbedPagination } from '../../../util/pagination';
import { Permissions } from '../../../lib/Permissions';
import { Command } from '../../../structures/Command';
import ExtendedMessage from '../../../typing/ExtendedMessage';

const urlPattern = /^https?:\/\/\S+$/i;
const colorPattern = /^#[0-9a-f]{6}$/i;

function splitValues(args: string[], start: number) {
  return args
    .slice(start)
    .join(' ')
    .split('|')
    .map((value) => value.trim());
}

function hasVisibleContent(embed: EmbedBuilder) {
  return !!(
    embed.data.title ||
    embed.data.description ||
    embed.data.author?.name ||
    embed.data.footer?.text ||
    embed.data.image ||
    embed.data.thumbnail
  );
}

export default new Command({
  name: 'embed',
  description: 'Crea y administra los embeds del servidor',
  aliases: ['embeds'],
  uso: '`gema embed <subcomando>`\n`gema help embed <subcomando>` para obtener más ayuda',
  timeout: 0,
  subcommands: [
    {
      name: 'create',
      description: 'Crea un embed vacío que luego puedes editar',
      uso: '`gema embed create <nombre>`'
    },
    {
      name: 'show',
      description: 'Muestra la vista previa de un embed existente',
      uso: '`gema embed show <nombre>`'
    },
    {
      name: 'list',
      description: 'Lista los embeds existentes en el servidor',
      uso: '`gema embed list`'
    },
    {
      name: 'delete',
      description: 'Elimina un embed',
      uso: '`gema embed delete <nombre>`'
    },
    {
      name: 'delete_all',
      description: 'Elimina todos los embeds del servidor',
      uso: '`gema embed delete_all`'
    },
    {
      name: 'edit',
      description:
        'Edita un campo específico de un embed. Omite el valor para eliminar el campo',
      uso: '`gema embed edit <campo> <nombre> | <valor>`\nUsa `gema help embed edit <campo>` para consultar cada formato',
      options: [
        {
          name: 'author',
          description:
            'Edita el autor y su icono. El icono debe ser una URL o una variable compatible',
          uso: '`gema embed edit author <nombre> | <texto> | <icono>`'
        },
        {
          name: 'title',
          description: 'Edita el título del embed',
          uso: '`gema embed edit title <nombre> | <título>`'
        },
        {
          name: 'description',
          description:
            'Edita la descripción. Puedes usar `\\n` para insertar saltos de línea',
          uso: '`gema embed edit description <nombre> | <descripción>`'
        },
        {
          name: 'color',
          description:
            'Edita el color usando un hexadecimal de seis dígitos o una variable de color',
          uso: '`gema embed edit color <nombre> | <#hex>`'
        },
        {
          name: 'thumbnail',
          description:
            'Edita la miniatura usando una URL o una variable compatible',
          uso: '`gema embed edit thumbnail <nombre> | <url>`'
        },
        {
          name: 'image',
          description:
            'Edita la imagen usando una URL o una variable compatible',
          uso: '`gema embed edit image <nombre> | <url>`'
        },
        {
          name: 'footer',
          description:
            'Edita el pie y su icono. El icono debe ser una URL o una variable compatible',
          uso: '`gema embed edit footer <nombre> | <texto> | <icono>`'
        },
        {
          name: 'timestamp',
          description:
            'Activa o desactiva la marca de tiempo. Valores válidos: `true` y `false`',
          uso: '`gema embed edit timestamp <nombre> | <true|false>`'
        }
      ]
    }
  ],
  memberperms: [Permissions.gestionarServidor],
  botperms: [
    Permissions.verCanal,
    Permissions.enviarMensajes,
    Permissions.insertarEnlaces,
    Permissions.gestionarServidor
  ],

  async run({ message, client, args, color, emojis, prefix }) {
    client.functions.setInput(message as ExtendedMessage);

    const subcommand = args[0]?.toLowerCase();
    if (!subcommand) {
      return message.reply(
        `${emojis.confused} Debes especificar un subcomando. Usa \`${prefix}help embed\`.`
      );
    }

    client.embeds = await embedModel.find({}).exec();
    const guildEmbeds = client.embeds.filter(
      (embed) => embed.guildId === message.guildId
    );

    if (subcommand === 'list') {
      if (!guildEmbeds.length)
        return message.reply(
          `${emojis.error} Aún no hay embeds creados en este servidor ${emojis.sweat}`
        );

      const names = guildEmbeds.map((embed) => `${emojis.dot} ${embed.name}`);
      const pages: EmbedBuilder[] = [];
      for (let index = 0; index < names.length; index += 10) {
        pages.push(
          new EmbedBuilder()
            .setColor(color)
            .setAuthor({
              name: message.guild?.name || '',
              iconURL: message.guild?.iconURL() || undefined
            })
            .setTitle('Lista de embeds')
            .setDescription(names.slice(index, index + 10).join('\n'))
        );
      }
      return createEmbedPagination(message, pages);
    }

    if (subcommand === 'delete_all') {
      if (!guildEmbeds.length)
        return message.reply(
          `${emojis.error} Aún no hay embeds creados en este servidor ${emojis.sweat}`
        );
      await embedModel.deleteMany({ guildId: message.guildId });
      client.embeds = client.embeds.filter(
        (embed) => embed.guildId !== message.guildId
      );
      return message.reply(
        `${emojis.check} Se han eliminado todos los embeds del servidor`
      );
    }

    const isEdit = subcommand === 'edit';
    const field = isEdit ? args[1]?.toLowerCase() : undefined;
    const values = splitValues(args, isEdit ? 2 : 1);
    const embedName = values[0];

    if (!embedName)
      return message.reply(
        `${emojis.confused} Debes especificar el nombre del embed. Usa \`${prefix}help embed ${subcommand}\`.`
      );

    const data = { guildId: message.guildId, name: embedName };
    const embedFound = await embedModel.findOne(data, '-_id -__v').exec();

    if (subcommand === 'create') {
      if (embedFound)
        return message.reply(
          `${emojis.hmph} Ya existe un embed con ese nombre`
        );
      const embed = new GEmbed();
      embed.guildId = message.guildId || '';
      embed.name = embedName;
      await embedModel.create(embed);
      return message.reply(
        `${emojis.check} El embed **${embedName}** fue creado correctamente`
      );
    }

    if (subcommand === 'delete') {
      if (!embedFound)
        return message.reply(
          `${emojis.hmph} No existe un embed con ese nombre`
        );
      await embedModel.deleteOne(data);
      return message.reply(
        `${emojis.check} El embed **${embedName}** fue eliminado correctamente`
      );
    }

    if (!['show', 'edit'].includes(subcommand)) {
      return message.reply(
        `${emojis.confused} El subcomando no es válido. Usa \`${prefix}help embed\`.`
      );
    }
    if (!embedFound)
      return message.reply(`${emojis.hmph} No existe un embed con ese nombre`);

    const embedData = embedFound.data as EmbedDataType;
    const preview = embedData
      ? client.functions.replaceEmbedFields(embedData)
      : new EmbedBuilder().setColor(color);

    if (subcommand === 'show') {
      if (!hasVisibleContent(preview))
        preview.setDescription('`Este embed no tiene contenido todavía`');
      return message.reply({
        embeds: [preview],
        allowedMentions: { repliedUser: false }
      });
    }

    const value = values[1];
    const extra = values[2];
    const replacedValue = value
      ? client.functions.replaceVars(value)
      : undefined;
    const replacedExtra = extra
      ? client.functions.replaceVars(extra)
      : undefined;
    let result = '';

    if (field === 'author' || field === 'footer') {
      if (extra && (!replacedExtra || !urlPattern.test(replacedExtra))) {
        return message.reply(
          `${emojis.hmph} El icono no es una URL válida; utiliza una URL o una variable como {user_avatar}`
        );
      }
      if (field === 'author') {
        preview.setAuthor(
          replacedValue
            ? { name: replacedValue, iconURL: replacedExtra || undefined }
            : null
        );
        await embedModel.updateOne(data, {
          'data.author': { name: value || '', icon_url: extra || '' }
        });
        result = value ? 'Autor actualizado' : 'Autor removido';
      } else {
        preview.setFooter(
          replacedValue
            ? { text: replacedValue, iconURL: replacedExtra || undefined }
            : null
        );
        await embedModel.updateOne(data, {
          'data.footer': { text: value || '', icon_url: extra || '' }
        });
        result = value ? 'Texto de pie actualizado' : 'Texto de pie removido';
      }
    } else if (field === 'title') {
      preview.setTitle(replacedValue || null);
      await embedModel.updateOne(data, { 'data.title': value || '' });
      result = value ? 'Título actualizado' : 'Título removido';
    } else if (field === 'description') {
      const description = value?.replace(/\\n/g, '\n');
      const replacedDescription = description
        ? client.functions.replaceVars(description)
        : undefined;
      preview.setDescription(replacedDescription || null);
      await embedModel.updateOne(data, {
        'data.description': description || ''
      });
      result = value ? 'Descripción actualizada' : 'Descripción removida';
    } else if (field === 'color') {
      const previewColor = replacedValue || client.color;
      if (value && !colorPattern.test(previewColor as string)) {
        return message.reply(
          `${emojis.hmph} El color no es un código HEX válido. Usa seis dígitos, por ejemplo \`#5865F2\``
        );
      }
      preview.setColor(previewColor as ColorResolvable);
      await embedModel.updateOne(data, { 'data.color': value || client.color });
      result = value ? 'Color actualizado' : 'Color restablecido';
    } else if (field === 'thumbnail' || field === 'image') {
      if (value && (!replacedValue || !urlPattern.test(replacedValue))) {
        return message.reply(
          `${emojis.hmph} El enlace no es válido; utiliza una URL o una variable de imagen`
        );
      }
      if (field === 'thumbnail') preview.setThumbnail(replacedValue || null);
      else preview.setImage(replacedValue || null);
      await embedModel.updateOne(data, { [`data.${field}`]: value || '' });
      result = value
        ? `${field === 'thumbnail' ? 'Miniatura' : 'Imagen'} actualizada`
        : `${field === 'thumbnail' ? 'Miniatura' : 'Imagen'} removida`;
    } else if (field === 'timestamp') {
      if (value && !['true', 'false'].includes(value.toLowerCase())) {
        return message.reply(
          `${emojis.hmph} El valor debe ser \`true\` o \`false\``
        );
      }
      const timestamp = value?.toLowerCase() === 'true';
      preview.setTimestamp(timestamp ? new Date() : null);
      await embedModel.updateOne(data, { 'data.timestamp': timestamp });
      result = timestamp
        ? 'Marca de tiempo añadida'
        : 'Marca de tiempo removida';
    } else {
      return message.reply(
        `${emojis.confused} El campo no es válido. Usa \`${prefix}help embed edit\`.`
      );
    }

    if (!hasVisibleContent(preview))
      preview.setDescription('`Este embed no tiene contenido todavía`');
    return message.reply({
      content: `${emojis.check} ${result}`,
      embeds: [preview],
      allowedMentions: { repliedUser: false }
    });
  }
});
