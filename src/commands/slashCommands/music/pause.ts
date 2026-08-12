import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicSlashCommand } from '../../../helpers/music/slashCommand';

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausa la reproducción'),
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicSlashCommand('pause')
});
