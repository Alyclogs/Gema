import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicSlashCommand } from '../../../util/music/slashCommand';

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Detiene la música y limpia la cola'),
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicSlashCommand('stop')
});
