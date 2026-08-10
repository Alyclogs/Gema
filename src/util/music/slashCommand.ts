import { GuildMember, TextBasedChannel } from 'discord.js';
import { MusicAction, executeMusicAction } from './index';
import { SlashCommandRunOptions } from '../../typing/Command';

export function runMusicSlashCommand(action: MusicAction) {
  return async ({
    interaction,
    args,
    client,
    emojis
  }: SlashCommandRunOptions) => {
    await interaction.deferReply();

    try {
      const member = await interaction.guild!.members.fetch(
        interaction.user.id
      );
      const response = await executeMusicAction({
        client,
        member: member as GuildMember,
        user: interaction.user,
        textChannel: interaction.channel as TextBasedChannel,
        action,
        query: args.getString('busqueda') || undefined,
        volume: args.getInteger('nivel') ?? undefined,
        loop: (args.getString('modo') || undefined) as
          | 'off'
          | 'track'
          | 'queue'
          | 'autoplay'
          | undefined
      });

      await interaction.editReply(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await interaction.editReply(`${emojis.error} ${message}`);
    }
  };
}
