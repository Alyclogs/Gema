import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { SlashCommandType } from '../../../typing/Command';
import { Permissions } from '../../../lib/Permissions';
import { runMusicSlashCommand } from '../../../helpers/music/slashCommand';

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Cambia el volumen de reproducción')
    .addIntegerOption((option) =>
      option
        .setName('nivel')
        .setDescription('Volumen entre 0 y 100')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)
    ) as unknown as SlashCommandType['data'],
  timeout: 2,
  memberperms: [],
  botperms: [Permissions.verCanal, Permissions.enviarMensajes],
  run: runMusicSlashCommand('volume')
});
