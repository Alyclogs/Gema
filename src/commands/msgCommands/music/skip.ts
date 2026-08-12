import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicMessageCommand } from '../../../helpers/music/messageCommand';

export default new Command({
  name: 'skip',
  aliases: ['saltar'],
  description: 'Salta la canción actual',
  uso: 'gema skip',
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicMessageCommand('skip')
});
