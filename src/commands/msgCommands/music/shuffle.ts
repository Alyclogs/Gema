import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicMessageCommand } from '../../../util/music/messageCommand';

export default new Command({
  name: 'shuffle',
  aliases: ['mezclar'],
  description: 'Mezcla las canciones pendientes',
  uso: 'gema shuffle',
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicMessageCommand('shuffle')
});
