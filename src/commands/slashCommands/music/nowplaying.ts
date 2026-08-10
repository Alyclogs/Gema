import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicSlashCommand } from '../../../util/music/slashCommand';

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Muestra la canción que se está reproduciendo'),
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicSlashCommand('nowplaying')
});
