import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicMessageCommand } from '../../../util/music/messageCommand';

export default new Command({
  name: 'volume',
  aliases: ['volumen'],
  description: 'Cambia el volumen de reproducción',
  uso: 'gema volume <0-100>',
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicMessageCommand('volume')
});
