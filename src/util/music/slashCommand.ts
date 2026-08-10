import { GuildMember, TextBasedChannel } from 'discord.js';
import { MusicAction, MusicUserError, executeMusicAction } from './index';
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
      if (error instanceof MusicUserError) {
        await interaction.editReply(`${emojis.error} ${error.message}`);
        return;
      }

      await client.functions.sendGemaError(error, {
        origen: 'comando slash de música',
        comando: action,
        servidor: interaction.guildId,
        canal: interaction.channelId,
        usuario: `${interaction.user.tag} (${interaction.user.id})`,
        consulta: args.getString('busqueda') || undefined
      });
      await interaction.editReply(
        `${emojis.error} No pude completar la operación. Por favor, inténtalo más tarde.`
      );
    }
  };
}
