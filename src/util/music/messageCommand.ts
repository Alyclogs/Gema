import { GuildMember, TextBasedChannel } from 'discord.js';
import { CommandRunOptions } from '../../typing/Command';
import { executeMusicAction, MusicAction } from './index';

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
      const detail = error instanceof Error ? error.message : String(error);
      await message.reply(`${emojis.error} ${detail}`);
    }
  };
}
