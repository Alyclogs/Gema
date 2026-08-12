import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicMessageCommand } from '../../../helpers/music/messageCommand';

export default new Command({
  name: 'nowplaying',
  aliases: ['np', 'sonando'],
  description: 'Muestra la canción que se está reproduciendo',
  uso: 'gema nowplaying',
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicMessageCommand('nowplaying')
});
