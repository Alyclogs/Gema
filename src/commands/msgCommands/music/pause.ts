import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicMessageCommand } from '../../../util/music/messageCommand';

export default new Command({
  name: 'pause',
  aliases: ['pausa'],
  description: 'Pausa la reproducción',
  uso: 'gema pause',
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicMessageCommand('pause')
});
