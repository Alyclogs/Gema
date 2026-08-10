import {
  GuildMember,
  PermissionFlagsBits,
  TextBasedChannel,
  User,
  VoiceBasedChannel
} from 'discord.js';
import { QueryType, QueueRepeatMode } from 'discord-player';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import type Bot from '../../structures/Bot';

export type MusicAction =
  | 'play'
  | 'pause'
  | 'resume'
  | 'skip'
  | 'stop'
  | 'queue'
  | 'nowplaying'
  | 'shuffle'
  | 'loop'
  | 'volume';

export interface MusicRequest {
  client: Bot;
  member: GuildMember;
  user: User;
  textChannel: TextBasedChannel;
  action: MusicAction;
  query?: string;
  volume?: number;
  loop?: 'off' | 'track' | 'queue' | 'autoplay';
}

const youtubeSearchEngine = `ext:${YoutubeiExtractor.identifier}` as const;

function requireVoiceChannel(member: GuildMember): VoiceBasedChannel {
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) throw new Error('Debes entrar a un canal de voz primero.');
  return voiceChannel;
}

function requireSameVoiceChannel(
  client: Bot,
  member: GuildMember
): VoiceBasedChannel {
  const voiceChannel = requireVoiceChannel(member);
  const botChannel = member.guild.members.me?.voice.channel;
  if (botChannel && botChannel.id !== voiceChannel.id) {
    throw new Error(
      'Debes estar en el mismo canal de voz que yo para controlar la música.'
    );
  }
  return voiceChannel;
}

function getQueue(client: Bot, member: GuildMember) {
  const queue = client.player.nodes.get(member.guild.id);
  if (!queue || !queue.currentTrack)
    throw new Error('No hay música reproduciéndose en este servidor.');
  return queue;
}

function formatTrack(title: string, author: string, url?: string) {
  const name = url ? `[${title}](${url})` : `**${title}**`;
  return `${name} — ${author}`;
}

export async function executeMusicAction(
  request: MusicRequest
): Promise<string> {
  const { client, member, user, textChannel, action } = request;

  if (action === 'play') {
    const query = request.query?.trim();
    if (!query)
      throw new Error(
        'Escribe una canción, artista, álbum, playlist o enlace para buscar.'
      );

    const voiceChannel = requireSameVoiceChannel(client, member);
    const me = member.guild.members.me;
    if (
      !me ||
      !voiceChannel.permissionsFor(me)?.has(PermissionFlagsBits.Connect)
    ) {
      throw new Error('No tengo permiso para conectarme a tu canal de voz.');
    }
    if (!voiceChannel.permissionsFor(me)?.has(PermissionFlagsBits.Speak)) {
      throw new Error('No tengo permiso para hablar en tu canal de voz.');
    }

    const isUrl = /^https?:\/\//i.test(query);
    const result = await client.player.play(voiceChannel, query, {
      requestedBy: user,
      searchEngine: isUrl ? QueryType.AUTO : youtubeSearchEngine,
      fallbackSearchEngine: QueryType.AUTO_SEARCH,
      nodeOptions: {
        metadata: { channel: textChannel },
        bufferingTimeout: 15_000,
        leaveOnStop: true,
        leaveOnStopCooldown: 3_000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 15_000,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300_000,
        volume: 80
      }
    });

    result.queue.setMetadata({ channel: textChannel });
    const playlist = result.searchResult.playlist;
    if (playlist) {
      return `✅ Añadí **${playlist.title}** a la cola (${result.searchResult.tracks.length} canciones).`;
    }
    return `✅ Añadí ${formatTrack(
      result.track.cleanTitle,
      result.track.author,
      result.track.url
    )} a la cola.`;
  }

  requireSameVoiceChannel(client, member);
  const queue = getQueue(client, member);
  const currentTrack = queue.currentTrack;
  if (!currentTrack)
    throw new Error('No hay música reproduciéndose en este servidor.');

  switch (action) {
    case 'pause':
      if (queue.node.isPaused()) return '⏸️ La reproducción ya estaba pausada.';
      queue.node.pause();
      return '⏸️ Reproducción pausada.';

    case 'resume':
      if (!queue.node.isPaused()) return '▶️ La reproducción ya estaba activa.';
      queue.node.resume();
      return '▶️ Reproducción reanudada.';

    case 'skip': {
      queue.node.skip();
      return `⏭️ Salté **${currentTrack.cleanTitle}**.`;
    }

    case 'stop':
      queue.delete();
      return '⏹️ Detuve la reproducción y limpié la cola.';

    case 'shuffle':
      if (!queue.tracks.size)
        throw new Error('No hay canciones pendientes para mezclar.');
      queue.tracks.shuffle();
      return `🔀 Mezclé ${queue.tracks.size} canciones de la cola.`;

    case 'loop': {
      const modes = {
        off: QueueRepeatMode.OFF,
        track: QueueRepeatMode.TRACK,
        queue: QueueRepeatMode.QUEUE,
        autoplay: QueueRepeatMode.AUTOPLAY
      };
      const labels = {
        off: 'desactivada',
        track: 'canción',
        queue: 'cola',
        autoplay: 'reproducción automática'
      };
      const mode = request.loop || 'off';
      if (!Object.prototype.hasOwnProperty.call(modes, mode)) {
        throw new Error('El modo debe ser off, track, queue o autoplay.');
      }
      queue.setRepeatMode(modes[mode]);
      return `🔁 Repetición: **${labels[mode]}**.`;
    }

    case 'volume': {
      const volume = request.volume;
      if (
        volume === undefined ||
        !Number.isInteger(volume) ||
        volume < 0 ||
        volume > 100
      ) {
        throw new Error('El volumen debe ser un número entero entre 0 y 100.');
      }
      queue.node.setVolume(volume);
      return `🔊 Volumen ajustado al **${volume}%**.`;
    }

    case 'nowplaying': {
      const progress =
        queue.node.createProgressBar({ length: 16 }) || currentTrack.duration;
      return `🎶 ${formatTrack(
        currentTrack.cleanTitle,
        currentTrack.author,
        currentTrack.url
      )}\n${progress}${queue.node.isPaused() ? ' · pausada' : ''}`;
    }

    case 'queue': {
      const upcoming = queue.tracks.toArray();
      const shown = upcoming.slice(0, 10);
      const lines = shown.map(
        (track, index) => `${index + 1}. ${track.cleanTitle} — ${track.author}`
      );
      const remaining = upcoming.length - shown.length;
      return [
        `🎶 **Ahora:** ${currentTrack.cleanTitle} — ${currentTrack.author}`,
        '',
        upcoming.length
          ? `**Siguientes (${upcoming.length}):**`
          : '**No hay más canciones en la cola.**',
        ...lines,
        remaining > 0 ? `…y ${remaining} más.` : ''
      ]
        .filter(Boolean)
        .join('\n');
    }
  }
}
