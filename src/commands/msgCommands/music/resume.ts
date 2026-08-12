import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicMessageCommand } from '../../../helpers/music/messageCommand';

export default new Command({
  name: 'resume',
  aliases: ['continuar'],
  description: 'Continúa la reproducción',
  uso: 'gema resume',
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicMessageCommand('resume')
});
