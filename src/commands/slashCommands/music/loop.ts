import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { SlashCommandType } from '../../../typing/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicSlashCommand } from '../../../helpers/music/slashCommand';

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Configura la repetición')
    .addStringOption((option) =>
      option
        .setName('modo')
        .setDescription('Qué debe repetirse')
        .setRequired(true)
        .addChoices(
          { name: 'Desactivada', value: 'off' },
          { name: 'Canción', value: 'track' },
          { name: 'Cola', value: 'queue' },
          { name: 'Automática', value: 'autoplay' }
        )
    ) as unknown as SlashCommandType['data'],
  cooldown: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicSlashCommand('loop')
});
