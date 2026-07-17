import { EmbedBuilder } from 'discord.js';
import {
  GMessage,
  buttonModel,
  embedModel,
  messageModel,
  selectmenuModel
} from '../../../models/gema-models';
import { Command } from '../../../structures/Command';
import ExtendedMessage from '../../../typing/ExtendedMessage';
import { createEmbedPagination } from '../../../util/Pagination';
import { Permissions } from '../../../util/Permissions';

const splitValues = (args: string[], start: number) =>
  args
    .slice(start)
    .join(' ')
    .split('|')
    .map((value) => value.trim());

export default new Command({
  name: 'message',
  description:
    'Crea y administra mensajes del servidor con botones y menús de selección',
  aliases: ['msg', 'mensaje'],
  uso: '`gema message <subcomando>`\n`gema help message <subcomando>` para obtener más ayuda',
  timeout: 0,
  subcomands: [
    {
      name: 'create',
      description: 'Crea un mensaje vacío que luego puedes configurar',
      uso: '`gema message create <nombre>`'
    },
    {
      name: 'show',
      description: 'Envía un mensaje guardado',
      uso: '`gema message show <nombre>`'
    },
    {
      name: 'list',
      description: 'Lista los mensajes guardados en el servidor',
      uso: '`gema message list`'
    },
    {
      name: 'edit-content',
      description:
        'Edita el contenido de un mensaje. Puedes utilizar variables y conserva los componentes adjuntos',
      uso: '`gema message edit-content <nombre> | <contenido>`'
    },
    {
      name: 'attach',
      description:
        'Adjunta un botón o menú de selección previamente configurado',
      uso: '`gema message attach <componente> <mensaje> | <nombre>`',
      options: [
        {
          name: 'button',
          description: 'Adjunta un botón existente al mensaje',
          uso: '`gema message attach button <mensaje> | <botón>`'
        },
        {
          name: 'selectmenu',
          description: 'Adjunta un menú de selección existente al mensaje',
          uso: '`gema message attach selectmenu <mensaje> | <menú>`'
        }
      ]
    },
    {
      name: 'delete',
      description: 'Elimina un mensaje guardado',
      uso: '`gema message delete <nombre>`'
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
        `${emojis.confused} Debes especificar un subcomando. Usa \`${prefix}help message\`.`
      );
    }

    await client.syncButtons();
    [client.selectmenus, client.embeds] = await Promise.all([
      selectmenuModel.find({}).exec(),
      embedModel.find({}).exec()
    ]);

    if (subcommand === 'list') {
      const guildMessages = await messageModel
        .find({ guildId: message.guildId })
        .exec();
      if (!guildMessages.length) {
        return message.reply(
          `${emojis.error} Aún no hay mensajes creados en este servidor ${emojis.sweat}`
        );
      }

      const names = guildMessages.map(
        (savedMessage) => `${emojis.dot} ${savedMessage.name}`
      );
      const pages: EmbedBuilder[] = [];
      for (let index = 0; index < names.length; index += 10) {
        pages.push(
          new EmbedBuilder()
            .setColor(color)
            .setAuthor({
              name: message.guild?.name || '',
              iconURL: message.guild?.iconURL() || undefined
            })
            .setTitle('Lista de mensajes')
            .setDescription(names.slice(index, index + 10).join('\n'))
        );
      }
      return createEmbedPagination(message, pages);
    }

    const isAttach = subcommand === 'attach';
    const attachType = isAttach ? args[1]?.toLowerCase() : undefined;
    const values = splitValues(args, isAttach ? 2 : 1);
    const messageName = values[0];

    if (!messageName) {
      return message.reply(
        `${emojis.confused} Debes especificar el nombre del mensaje. Usa \`${prefix}help message ${subcommand}\`.`
      );
    }

    const messageData = { guildId: message.guildId, name: messageName };
    const messageFound = await messageModel.findOne(messageData).exec();

    if (subcommand === 'create') {
      if (messageFound) {
        return message.reply(
          `${emojis.hmph} Ya existe un mensaje con ese nombre. Edítalo con \`${prefix}message edit-content\``
        );
      }

      const savedMessage = new GMessage();
      savedMessage.guildId = message.guildId || '';
      savedMessage.name = messageName;
      await messageModel.create(savedMessage);
      client.messages = await messageModel.find({}).exec();
      return message.reply(
        `${emojis.check} El mensaje **${messageName}** fue creado correctamente`
      );
    }

    if (subcommand === 'delete') {
      if (!messageFound) {
        return message.reply(
          `${emojis.hmph} No existe un mensaje con ese nombre`
        );
      }
      await messageModel.deleteOne(messageData);
      client.messages = await messageModel.find({}).exec();
      return message.reply(
        `${emojis.check} El mensaje **${messageName}** fue eliminado correctamente`
      );
    }

    if (!messageFound) {
      return message.reply(
        `${emojis.hmph} No existe un mensaje con ese nombre. Créalo con \`${prefix}message create\``
      );
    }

    if (subcommand === 'show') {
      if (!messageFound.reply) {
        return message.reply(
          `${emojis.error} El mensaje aún no tiene contenido. Asígnale uno con \`${prefix}message edit-content\``
        );
      }
      const [existingButtons, existingSelectmenus] = await Promise.all([
        buttonModel
          .find({
            guildId: message.guildId,
            customId: {
              $in: (messageFound.reply.buttons ?? []).map(
                (button) => `arbtn_${button}`
              )
            }
          })
          .exec(),
        selectmenuModel
          .find({
            guildId: message.guildId,
            customId: {
              $in: (messageFound.reply.selectmenus ?? []).map(
                (selectmenu) => `arselm#${selectmenu}`
              )
            }
          })
          .exec()
      ]);
      const existingButtonIds = new Set(
        existingButtons.map((button) => button.customId)
      );
      const existingSelectmenuIds = new Set(
        existingSelectmenus.map((selectmenu) => selectmenu.customId)
      );
      const missingComponents = [
        ...(messageFound.reply.buttons ?? [])
          .filter((button) => !existingButtonIds.has(`arbtn_${button}`))
          .map((button) => `botón \`${button}\``),
        ...(messageFound.reply.selectmenus ?? [])
          .filter(
            (selectmenu) => !existingSelectmenuIds.has(`arselm#${selectmenu}`)
          )
          .map((selectmenu) => `menú \`${selectmenu}\``)
      ];
      if (missingComponents.length) {
        return message.reply(
          `${
            emojis.error
          } No se puede mostrar el mensaje porque ya no existe: ${missingComponents.join(
            ', '
          )}. Edita el contenido o vuelve a crear y adjuntar el componente.`
        );
      }
      return client.functions.executeReply(
        messageFound.reply,
        message as ExtendedMessage
      );
    }

    if (subcommand === 'edit-content') {
      let content = values.slice(1).join(' | ').trim();
      if (!content) {
        return message.reply(
          `${emojis.confused} Debes especificar el contenido del mensaje`
        );
      }

      const [attachedButtons, attachedSelectmenus] = await Promise.all([
        buttonModel
          .find({
            guildId: message.guildId,
            customId: {
              $in: (messageFound.reply?.buttons ?? []).map(
                (button) => `arbtn_${button}`
              )
            }
          })
          .exec(),
        selectmenuModel
          .find({
            guildId: message.guildId,
            customId: {
              $in: (messageFound.reply?.selectmenus ?? []).map(
                (selectmenu) => `arselm#${selectmenu}`
              )
            }
          })
          .exec()
      ]);
      for (const button of attachedButtons) {
        content += ` {button:${button.name}}`;
      }
      for (const selectmenu of attachedSelectmenus) {
        content += ` {selectmenu:${selectmenu.name}}`;
      }

      try {
        const autoresponder = await client.functions.createAutoresponder(
          message,
          content
        );
        await messageModel.updateOne(messageData, {
          $set: { reply: autoresponder.arReply }
        });
        client.messages = await messageModel.find({}).exec();
        await message.reply(
          `${emojis.check} Contenido editado, enviando previsualización...`
        );
        return client.functions.executeReply(
          autoresponder.arReply,
          message as ExtendedMessage
        );
      } catch (error) {
        return message.reply(`${emojis.error} ${error}`);
      }
    }

    if (subcommand === 'attach') {
      if (!['button', 'selectmenu'].includes(attachType || '')) {
        return message.reply(
          `${emojis.confused} Debes indicar si quieres adjuntar un \`button\` o un \`selectmenu\``
        );
      }

      const componentName = values[1];
      if (!componentName) {
        return message.reply(
          `${emojis.confused} Debes especificar el nombre del componente que quieres adjuntar`
        );
      }

      if (attachType === 'button') {
        const button = await buttonModel.findOne({
          guildId: message.guildId,
          customId: `arbtn_${componentName}`
        });
        if (!button) {
          return message.reply(
            `${emojis.confused} El botón no existe. Créalo con \`${prefix}button create\``
          );
        }
        if (messageFound.reply?.buttons?.includes(componentName)) {
          return message.reply(
            `${emojis.angry} El mensaje ya tiene adjunto ese botón`
          );
        }
      } else {
        const selectmenu = await selectmenuModel.findOne({
          guildId: message.guildId,
          customId: `arselm#${componentName}`
        });
        if (!selectmenu) {
          return message.reply(
            `${emojis.confused} El menú no existe. Créalo con \`${prefix}selectmenu create\``
          );
        }
        if (messageFound.reply?.selectmenus?.includes(componentName)) {
          return message.reply(
            `${emojis.angry} El mensaje ya tiene adjunto ese menú de selección`
          );
        }
      }

      const componentVariable =
        attachType === 'button'
          ? `{button:${componentName}}`
          : `{selectmenu:${componentName}}`;
      let rawReply = messageFound.reply?.rawreply || '';
      for (const button of messageFound.reply?.buttons ?? []) {
        rawReply += ` {button:${button}}`;
      }
      for (const selectmenu of messageFound.reply?.selectmenus ?? []) {
        rawReply += ` {selectmenu:${selectmenu}}`;
      }
      rawReply = `${rawReply} ${componentVariable}`.trim();

      try {
        const autoresponder = await client.functions.createAutoresponder(
          message,
          rawReply
        );
        await messageModel.updateOne(messageData, {
          $set: { reply: autoresponder.arReply }
        });
        client.messages = await messageModel.find({}).exec();
        await message.reply(
          `${emojis.check} ${
            attachType === 'button'
              ? 'Botón añadido'
              : 'Menú de selección añadido'
          }, enviando previsualización...`
        );
        return client.functions.executeReply(
          autoresponder.arReply,
          message as ExtendedMessage
        );
      } catch (error) {
        return message.reply(`${emojis.error} ${error}`);
      }
    }

    return message.reply(
      `${emojis.confused} El subcomando no es válido. Usa \`${prefix}help message\`.`
    );
  }
});
