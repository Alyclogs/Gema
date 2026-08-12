import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicMessageCommand } from '../../../helpers/music/messageCommand';

export default new Command({
  name: 'queue',
  aliases: ['cola'],
  description: 'Muestra la cola de reproducción',
  uso: 'gema queue',
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicMessageCommand('queue')
});
