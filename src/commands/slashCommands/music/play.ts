import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { SlashCommandType } from '../../../typing/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicSlashCommand } from '../../../helpers/music/slashCommand';

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Busca o reproduce una canción, álbum o playlist')
    .addStringOption((option) =>
      option
        .setName('busqueda')
        .setDescription(
          'Nombre o enlace de YouTube Music, Spotify, Apple Music y más'
        )
        .setRequired(true)
    ) as unknown as SlashCommandType['data'],
  cooldown: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicSlashCommand('play')
});
