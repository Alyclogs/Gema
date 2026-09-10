import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicMessageCommand } from '../../../helpers/music/messageCommand';

export default new Command({
  name: 'loop',
  aliases: ['repetir'],
  description: 'Configura la repetición: off, track, queue o autoplay',
  uso: 'gema loop <off|track|queue|autoplay>',
  cooldown: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicMessageCommand('loop')
});
