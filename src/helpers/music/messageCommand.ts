import { GuildMember, TextBasedChannel } from 'discord.js';
import { CommandRunOptions } from '../../typing/Command';
import { executeMusicAction, MusicAction, MusicUserError } from './index';

export function runMusicMessageCommand(action: MusicAction) {
  return async ({ client, message, args, emojis }: CommandRunOptions) => {
    try {
      const response = await executeMusicAction({
        client,
        member: message.member as GuildMember,
        user: message.author,
        textChannel: message.channel as TextBasedChannel,
        action,
        query: action === 'play' ? args.join(' ') : undefined,
        volume: action === 'volume' ? Number(args[0]) : undefined,
        loop:
          action === 'loop'
            ? (args[0]?.toLowerCase() as 'off' | 'track' | 'queue' | 'autoplay')
            : undefined
      });

      await message.reply(response);
    } catch (error) {
      if (error instanceof MusicUserError) {
        await message.reply(`${emojis.error} ${error.message}`);
        return;
      }

      await client.functions.sendGemaError(error, {
        origen: 'comando de mensaje de música',
        comando: action,
        servidor: message.guildId,
        canal: message.channelId,
        usuario: `${message.author.tag} (${message.author.id})`,
        consulta: action === 'play' ? args.join(' ') : undefined
      });
      await message.reply(
        `${emojis.error} No pude completar la operación. Por favor, inténtalo más tarde.`
      );
    }
  };
}
