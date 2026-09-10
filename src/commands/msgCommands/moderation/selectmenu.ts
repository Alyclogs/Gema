import {
  ActionRowBuilder,
  ComponentEmojiResolvable,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import {
  Autoresponder,
  GSelectMenu,
  GSelectMenuOption,
  selectmenuModel
} from '../../../models/gema-models';
import { createEmbedPagination } from '../../../util/pagination';
import { Permissions } from '../../../lib/Permissions';
import { Command } from '../../../structures/Command';
import ExtendedMessage from '../../../typing/ExtendedMessage';

const normalizeOptions = (options?: GSelectMenuOption[]) =>
  (options ?? []).map((option) => ({
    label: option.label,
    value: option.value,
    description: option.description,
    emoji: option.emoji as ComponentEmojiResolvable | undefined
  }));

const splitValues = (args: string[], start: number) =>
  args
    .slice(start)
    .join(' ')
    .split('|')
    .map((value) => value.trim());

function buildMenu(selectmenu: GSelectMenu) {
  const builder = new StringSelectMenuBuilder().setCustomId(
    selectmenu.customId
  );
  const options = normalizeOptions(selectmenu.data.options);
  const optionCount = Math.max(options.length, 1);
  const maxValues = Math.min(selectmenu.data.maxValues ?? 1, optionCount);
  const minValues = Math.min(selectmenu.data.minValues ?? 1, maxValues);

  if (selectmenu.data.placeholder)
    builder.setPlaceholder(selectmenu.data.placeholder);
  builder.setMinValues(minValues);
  builder.setMaxValues(maxValues);
  builder.setOptions(
    options.length
      ? options
      : [
        {
          label: 'Opción de ejemplo',
          value: 'ejemplo',
          description: 'Añade opciones para activar este menú'
        }
      ]
  );
  return builder;
}

function validEmoji(emoji: string) {
  try {
    new StringSelectMenuOptionBuilder()
      .setLabel('Opción')
      .setValue('option')
      .setEmoji(emoji)
      .toJSON();
    return true;
  } catch {
    return false;
  }
}

function nextOptionIndex(options: GSelectMenuOption[]) {
  return Math.max(0, ...options.map((option) => option.index ?? 0)) + 1;
}

export default new Command({
  name: 'selectmenu',
  description:
    'Crea y administra menús de selección para mensajes o autoresponders',
  aliases: ['select', 'menu', 'menú'],
  uso: '`gema selectmenu <subcomando>`\n`gema help selectmenu <subcomando>` para obtener más ayuda',
  cooldown: 0,
  subcommands: [
    {
      name: 'create',
      description:
        'Crea un menú de selección. Cada servidor puede tener hasta 6',
      uso: '`gema selectmenu create <nombre>`'
    },
    {
      name: 'show',
      description: 'Muestra la vista previa de un menú de selección',
      uso: '`gema selectmenu show <nombre>`'
    },
    {
      name: 'list',
      description: 'Lista los menús de selección del servidor',
      uso: '`gema selectmenu list`'
    },
    {
      name: 'info',
      description: 'Muestra la configuración y las opciones de un menú',
      uso: '`gema selectmenu info <nombre>`'
    },
    {
      name: 'delete',
      description: 'Elimina un menú de selección',
      uso: '`gema selectmenu delete <nombre>`'
    },
    {
      name: 'edit',
      description: 'Edita la respuesta o los datos generales de un menú',
      uso: '`gema selectmenu edit <opción> ...`\nUsa `gema help selectmenu edit <opción>` para consultar cada formato',
      options: [
        {
          name: 'reply',
          description:
            'Edita la respuesta general. Añade `--ephemeral` para hacerla privada',
          uso: '`gema selectmenu edit reply <nombre> | <respuesta> [--ephemeral]`'
        },
        {
          name: 'data',
          description:
            'Edita mínimo, máximo, placeholder y privacidad. Deja una sección vacía para conservarla y usa `-` para eliminar el placeholder',
          uso: '`gema selectmenu edit data <nombre> | <mínimo> | <máximo> | <placeholder> | <true|false>`'
        }
      ]
    },
    {
      name: 'add-option',
      description:
        'Añade una opción. La descripción, respuesta y emoji son opcionales',
      uso: '`gema selectmenu add-option <menú> | <etiqueta> | <descripción> | <respuesta> | <emoji>`'
    },
    {
      name: 'edit-option',
      description:
        'Edita una opción por etiqueta, valor o índice. Deja un campo vacío para conservarlo o usa `-` para eliminar un campo opcional',
      uso: '`gema selectmenu edit-option <menú> | <opción> | <etiqueta> | <descripción> | <respuesta> | <emoji>`'
    },
    {
      name: 'delete-option',
      description: 'Elimina una opción por etiqueta, valor o índice',
      uso: '`gema selectmenu delete-option <menú> | <opción>`'
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
    const subcommand = args[0]?.toLowerCase();
    if (!subcommand) {
      return message.reply(
        `${emojis.confused} Debes especificar un subcomando. Usa \`${prefix}help selectmenu\`.`
      );
    }

    client.selectmenus = await selectmenuModel.find({}).exec();
    const guildMenus = client.selectmenus.filter(
      (menu) => menu.guildId === message.guildId
    );

    if (subcommand === 'list') {
      if (!guildMenus.length) {
        return message.reply(
          `${emojis.error} Aún no hay menús de selección creados en este servidor ${emojis.sweat}`
        );
      }
      const names = guildMenus.map((menu) => `${emojis.dot} ${menu.name}`);
      const pages: EmbedBuilder[] = [];
      for (let index = 0; index < names.length; index += 10) {
        pages.push(
          new EmbedBuilder()
            .setColor(color)
            .setAuthor({
              name: message.guild?.name || '',
              iconURL: message.guild?.iconURL() || undefined
            })
            .setTitle('Lista de menús de selección')
            .setDescription(names.slice(index, index + 10).join('\n'))
        );
      }
      return createEmbedPagination(message, pages);
    }

    const isEdit = subcommand === 'edit';
    const editOption = isEdit ? args[1]?.toLowerCase() : undefined;
    const values = splitValues(args, isEdit ? 2 : 1);
    const menuName = values[0];
    if (!menuName) {
      return message.reply(
        `${emojis.confused} Debes especificar el nombre del menú. Usa \`${prefix}help selectmenu ${subcommand}\`.`
      );
    }

    const customId = `arselm#${menuName}`;
    const menuData = { guildId: message.guildId, customId };
    const menuFound = await selectmenuModel.findOne(menuData).exec();

    if (subcommand === 'create') {
      if (
        (await selectmenuModel.countDocuments({ guildId: message.guildId })) >=
        6
      ) {
        return message.reply(
          `${emojis.error} Límite de 6 menús de selección alcanzado`
        );
      }
      if (menuFound)
        return message.reply(`${emojis.hmph} Ya existe un menú con ese nombre`);

      const selectmenu = new GSelectMenu();
      selectmenu.guildId = message.guildId || '';
      selectmenu.customId = customId;
      selectmenu.name = menuName;
      await selectmenuModel.create(selectmenu);
      client.selectmenus = await selectmenuModel.find({}).exec();
      return message.reply(
        `${emojis.check} El menú de selección **${menuName}** fue creado correctamente`
      );
    }

    if (subcommand === 'delete') {
      if (!menuFound)
        return message.reply(`${emojis.hmph} No existe un menú con ese nombre`);
      await selectmenuModel.deleteOne(menuData);
      client.selectmenus = await selectmenuModel.find({}).exec();
      return message.reply(
        `${emojis.check} El menú de selección **${menuName}** fue eliminado correctamente`
      );
    }

    if (!menuFound)
      return message.reply(`${emojis.hmph} No existe un menú con ese nombre`);

    if (subcommand === 'show') {
      return message.reply({
        content: `${emojis.check} Menú de selección **${menuName}**`,
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            buildMenu(menuFound)
          )
        ]
      });
    }

    if (subcommand === 'info') {
      const options = menuFound.data.options ?? [];
      const optionList = options.length
        ? options
          .map(
            (option) =>
              `**${option.index ?? '-'} · ${option.label}** — \`${option.value
              }\`${option.description ? `\n${option.description}` : ''}`
          )
          .join('\n')
        : 'Ninguna';
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Información del menú ${menuName}`)
        .setDescription(
          `**ID:** ${menuFound.customId}\n**Opciones:** ${options.length
          }\n**Mínimo:** ${menuFound.data.minValues ?? 1}\n**Máximo:** ${menuFound.data.maxValues ?? 1
          }\n**Placeholder:** ${menuFound.data.placeholder || 'Ninguno'
          }\n**Ephemeral:** ${menuFound.ephemeral ? 'Sí' : 'No'}`
        )
        .addFields({ name: 'Opciones', value: optionList.slice(0, 1024) });
      return message.reply({
        embeds: [embed],
        allowedMentions: { repliedUser: false }
      });
    }

    if (subcommand === 'edit' && editOption === 'reply') {
      let reply = values.slice(1).join(' | ').trim();
      const ephemeral = /(?:^|\s)--ephemeral(?:\s|$)/i.test(reply);
      reply = reply.replace(/(?:^|\s)--ephemeral(?:\s|$)/gi, ' ').trim();
      if (!reply)
        return message.reply(
          `${emojis.confused} Debes especificar una respuesta`
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
      await selectmenuModel.updateOne(menuData, {
        $set: { reply: autoresponder.arReply, ephemeral }
      });
      client.selectmenus = await selectmenuModel.find({}).exec();
      return message.reply(
        `${emojis.check} Respuesta general actualizada${ephemeral ? ' como efímera' : ''
        }`
      );
    }

    if (subcommand === 'edit' && editOption === 'data') {
      const currentMin = menuFound.data.minValues ?? 1;
      const currentMax = menuFound.data.maxValues ?? 1;
      const min = values[1] ? Number(values[1]) : currentMin;
      const max = values[2] ? Number(values[2]) : currentMax;
      const optionCount = Math.max(menuFound.data.options?.length ?? 0, 1);

      if (
        !Number.isInteger(min) ||
        !Number.isInteger(max) ||
        min < 0 ||
        max < 1
      ) {
        return message.reply(
          `${emojis.error} El mínimo y máximo deben ser números enteros válidos`
        );
      }
      if (min > max)
        return message.reply(
          `${emojis.error} El mínimo no puede superar al máximo`
        );
      if (max > optionCount) {
        return message.reply(
          `${emojis.error} El máximo no puede superar las ${optionCount} opciones disponibles`
        );
      }

      const updates: Record<string, unknown> = {
        'data.minValues': min,
        'data.maxValues': max
      };
      const unsets: Record<string, string> = {};
      if (values[3] === '-') unsets['data.placeholder'] = '';
      else if (values[3]) updates['data.placeholder'] = values[3];
      if (values[4]) {
        if (!['true', 'false'].includes(values[4].toLowerCase())) {
          return message.reply(
            `${emojis.error} Ephemeral debe ser \`true\` o \`false\``
          );
        }
        updates.ephemeral = values[4].toLowerCase() === 'true';
      }

      await selectmenuModel.updateOne(menuData, {
        $set: updates,
        ...(Object.keys(unsets).length ? { $unset: unsets } : {})
      });
      const updated = await selectmenuModel.findOne(menuData).exec();
      client.selectmenus = await selectmenuModel.find({}).exec();
      return message.reply({
        content: `${emojis.check} Datos del menú actualizados`,
        components: updated
          ? [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              buildMenu(updated)
            )
          ]
          : []
      });
    }

    const options = [...(menuFound.data.options ?? [])];

    if (subcommand === 'add-option') {
      if (options.length >= 25)
        return message.reply(`${emojis.error} El menú ya tiene 25 opciones`);
      const label = values[1];
      const description = values[2] || undefined;
      const reply = values[3] || undefined;
      const emoji = values[4] || undefined;
      if (!label)
        return message.reply(
          `${emojis.confused} Debes especificar una etiqueta`
        );
      if (label.length > 100 || (description?.length ?? 0) > 100) {
        return message.reply(
          `${emojis.error} La etiqueta y descripción admiten hasta 100 caracteres`
        );
      }
      if (emoji && !validEmoji(emoji))
        return message.reply(`${emojis.error} El emoji no es válido`);

      const index = nextOptionIndex(options);
      const option: GSelectMenuOption = {
        index,
        label,
        value: `option_${index}`,
        description,
        emoji
      };
      if (reply) {
        try {
          option.reply = (
            await client.functions.createAutoresponder(message, reply)
          ).arReply;
        } catch (error) {
          return message.reply(`${emojis.error} ${error}`);
        }
      }
      options.push(option);
      await selectmenuModel.updateOne(menuData, {
        $set: { 'data.options': options }
      });
      client.selectmenus = await selectmenuModel.find({}).exec();
      return message.reply(
        `${emojis.check} Opción **${label}** añadida al menú`
      );
    }

    const target = values[1];
    const optionIndex = options.findIndex(
      (option) =>
        option.label === target ||
        option.value === target ||
        `${option.index ?? ''}` === target
    );
    if (!target || optionIndex === -1) {
      return message.reply(
        `${emojis.hmph} No existe una opción con esa etiqueta, valor o índice`
      );
    }

    if (subcommand === 'delete-option') {
      const [deleted] = options.splice(optionIndex, 1);
      const updates: Record<string, unknown> = { 'data.options': options };
      if ((menuFound.data.maxValues ?? 1) > Math.max(options.length, 1)) {
        updates['data.maxValues'] = Math.max(options.length, 1);
      }
      if ((menuFound.data.minValues ?? 1) > Math.max(options.length, 1)) {
        updates['data.minValues'] = Math.max(options.length, 1);
      }
      await selectmenuModel.updateOne(menuData, { $set: updates });
      client.selectmenus = await selectmenuModel.find({}).exec();
      return message.reply(
        `${emojis.check} Opción **${deleted.label}** eliminada`
      );
    }

    if (subcommand === 'edit-option') {
      const option = { ...options[optionIndex] };
      if (values[2]) option.label = values[2];
      if (values[3] === '-') delete option.description;
      else if (values[3]) option.description = values[3];
      if (values[5] === '-') delete option.emoji;
      else if (values[5]) {
        if (!validEmoji(values[5]))
          return message.reply(`${emojis.error} El emoji no es válido`);
        option.emoji = values[5];
      }
      if (values[4] === '-') delete option.reply;
      else if (values[4]) {
        try {
          option.reply = (
            await client.functions.createAutoresponder(message, values[4])
          ).arReply;
        } catch (error) {
          return message.reply(`${emojis.error} ${error}`);
        }
      }
      if (
        option.label.length > 100 ||
        (option.description?.length ?? 0) > 100
      ) {
        return message.reply(
          `${emojis.error} La etiqueta y descripción admiten hasta 100 caracteres`
        );
      }
      options[optionIndex] = option;
      await selectmenuModel.updateOne(menuData, {
        $set: { 'data.options': options }
      });
      client.selectmenus = await selectmenuModel.find({}).exec();
      return message.reply(
        `${emojis.check} Opción **${option.label}** actualizada`
      );
    }

    return message.reply(
      `${emojis.confused} El subcomando no es válido. Usa \`${prefix}help selectmenu\`.`
    );
  }
});
