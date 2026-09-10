import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicMessageCommand } from '../../../helpers/music/messageCommand';

export default new Command({
  name: 'play',
  aliases: ['reproducir'],
  description: 'Busca o reproduce una canción, álbum o playlist',
  uso: 'gema play <búsqueda o enlace>',
  cooldown: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicMessageCommand('play')
});
