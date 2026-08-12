import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicMessageCommand } from '../../../helpers/music/messageCommand';

export default new Command({
  name: 'leave',
  aliases: ['disconnect', 'salir'],
  description: 'Desconecta a Gema del canal de voz',
  uso: 'gema leave',
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicMessageCommand('leave')
});
