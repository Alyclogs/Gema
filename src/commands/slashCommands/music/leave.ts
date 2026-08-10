import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicSlashCommand } from '../../../util/music/slashCommand';

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Desconecta a Gema del canal de voz'),
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicSlashCommand('leave')
});
