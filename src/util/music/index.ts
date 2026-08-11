import {
  EmbedBuilder,
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
  | 'leave'
  | 'queue'
  | 'nowplaying'
  | 'shuffle'
  | 'loop'
  | 'volume';

export class MusicUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MusicUserError';
  }
}

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

export interface MusicResponse {
  content?: string;
  embeds?: EmbedBuilder[];
}

const youtubeSearchEngine = `ext:${YoutubeiExtractor.identifier}` as const;

function requireVoiceChannel(member: GuildMember): VoiceBasedChannel {
  const voiceChannel = member.voice.channel;
  if (!voiceChannel)
    throw new MusicUserError('Debes entrar a un canal de voz primero.');
  return voiceChannel;
}

function requireSameVoiceChannel(
  client: Bot,
  member: GuildMember
): VoiceBasedChannel {
  const voiceChannel = requireVoiceChannel(member);
  const botChannel = member.guild.members.me?.voice.channel;
  if (botChannel && botChannel.id !== voiceChannel.id) {
    throw new MusicUserError(
      'Debes estar en el mismo canal de voz que yo para controlar la música.'
    );
  }
  return voiceChannel;
}

function getQueue(client: Bot, member: GuildMember) {
  const queue = client.player.nodes.get(member.guild.id);
  if (!queue || !queue.currentTrack)
    throw new MusicUserError('No hay música reproduciéndose en este servidor.');
  return queue;
}

function formatTrack(title: string, author: string, url?: string) {
  const name = url ? `[${title}](${url})` : `**${title}**`;
  return `${name} — ${author}`;
}

function sourceName(source: string) {
  const names: Record<string, string> = {
    youtube: 'YouTube',
    spotify: 'Spotify',
    apple_music: 'Apple Music',
    soundcloud: 'SoundCloud',
    arbitrary: 'Enlace directo'
  };
  return names[source] || source;
}

export async function executeMusicAction(
  request: MusicRequest
): Promise<MusicResponse> {
  const { client, member, user, textChannel, action } = request;

  if (action === 'play') {
    const query = request.query?.trim();
    if (!query)
      throw new MusicUserError(
        'Escribe una canción, artista, álbum, playlist o enlace para buscar.'
      );

    const voiceChannel = requireSameVoiceChannel(client, member);
    const me = member.guild.members.me;
    if (
      !me ||
      !voiceChannel.permissionsFor(me)?.has(PermissionFlagsBits.Connect)
    ) {
      throw new MusicUserError(
        'No tengo permiso para conectarme a tu canal de voz.'
      );
    }
    if (!voiceChannel.permissionsFor(me)?.has(PermissionFlagsBits.Speak)) {
      throw new MusicUserError(
        'No tengo permiso para hablar en tu canal de voz.'
      );
    }

    const existingQueue = client.player.nodes.get(member.guild.id);
    const hadActiveTrack = Boolean(existingQueue?.currentTrack);
    const metadata = {
      channel: textChannel,
      suppressNextStart: !hadActiveTrack
    };
    if (existingQueue) existingQueue.setMetadata(metadata);
    const isUrl = /^https?:\/\//i.test(query);
    const result = await client.player.play(voiceChannel, query, {
      requestedBy: user,
      searchEngine: isUrl ? QueryType.AUTO : youtubeSearchEngine,
      fallbackSearchEngine: QueryType.AUTO_SEARCH,
      nodeOptions: {
        metadata,
        bufferingTimeout: 15_000,
        leaveOnStop: true,
        leaveOnStopCooldown: 3_000,
        leaveOnEnd: false,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300_000,
        volume: 80
      }
    });

    result.queue.setMetadata({
      ...result.queue.metadata,
      channel: textChannel
    });

    if (!hadActiveTrack) {
      const expectedTrackId = result.track.id;
      const watchdog = setTimeout(() => {
        const activeQueue = client.player.nodes.get(member.guild.id);
        if (!activeQueue) return;
        if (activeQueue.metadata?.lastStartedTrackId === expectedTrackId)
          return;

        const error = new Error(
          `La pista no emitió PlayerStart después de 20 segundos: ${result.track.title}`
        );
        void client.functions.sendGemaError(error, {
          origen: 'watchdog de inicio de música',
          servidor: member.guild.id,
          canal_voz: voiceChannel.id,
          cancion: `${result.track.title} — ${result.track.author}`,
          url: result.track.url,
          reproduciendo: activeQueue.node.isPlaying(),
          buffering: activeQueue.node.isBuffering(),
          pausado: activeQueue.node.isPaused()
        });

        if ('send' in textChannel && typeof textChannel.send === 'function') {
          void textChannel
            .send(
              `${client.emotes.error} La canción no pudo comenzar a reproducirse. El error fue reportado.`
            )
            .catch((notificationError) =>
              client.functions.sendGemaError(notificationError, {
                origen: 'aviso público del watchdog de música',
                servidor: member.guild.id,
                canal: textChannel.id
              })
            );
        }
      }, 20_000);
      watchdog.unref();
    }

    const playlist = result.searchResult.playlist;
    if (playlist) {
      const embed = new EmbedBuilder()
        .setColor(client.color)
        .setAuthor({
          name: hadActiveTrack
            ? 'Playlist añadida a la cola'
            : 'Reproduciendo playlist'
        })
        .setTitle(playlist.title)
        .setURL(playlist.url)
        .setDescription(
          hadActiveTrack
            ? `${client.emotes.check} Se añadieron **${result.searchResult.tracks.length} canciones** a la cola.`
            : `${client.emotes.star} Reproduciendo la selección solicitada.`
        )
        .addFields(
          {
            name: 'Autor',
            value: playlist.author.name || 'Desconocido',
            inline: true
          },
          { name: 'Duración', value: playlist.durationFormatted, inline: true },
          { name: 'Fuente', value: sourceName(playlist.source), inline: true }
        )
        .setFooter({
          text: `Solicitado por ${user.username}`,
          iconURL: user.displayAvatarURL()
        });
      if (playlist.thumbnail) embed.setThumbnail(playlist.thumbnail);
      return { embeds: [embed] };
    }

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setAuthor({
        name: hadActiveTrack
          ? 'Canción añadida a la cola'
          : 'Reproduciendo ahora'
      })
      .setTitle(result.track.cleanTitle)
      .setURL(result.track.url)
      .setDescription(
        hadActiveTrack
          ? `${client.emotes.check} Posición en la cola: **${result.queue.tracks.size}**.`
          : `${client.emotes.star} Reproduciendo la canción solicitada.`
      )
      .addFields(
        {
          name: 'Artista',
          value: result.track.author || 'Desconocido',
          inline: true
        },
        { name: 'Duración', value: result.track.duration, inline: true },
        { name: 'Fuente', value: sourceName(result.track.source), inline: true }
      )
      .setFooter({
        text: `Solicitado por ${user.username}`,
        iconURL: user.displayAvatarURL()
      });
    if (result.track.thumbnail) embed.setThumbnail(result.track.thumbnail);
    return { embeds: [embed] };
  }

  requireSameVoiceChannel(client, member);

  if (action === 'stop' || action === 'leave') {
    const queue = client.player.nodes.get(member.guild.id);
    const botVoice = member.guild.members.me?.voice;
    if (!queue && !botVoice?.channel) {
      throw new MusicUserError('No estoy conectado a un canal de voz.');
    }

    if (queue) queue.delete();
    if (botVoice?.channel) botVoice.disconnect();

    return {
      content:
        action === 'stop'
          ? `${client.emotes.check} Detuve la reproducción, limpié la cola y salí del canal de voz.`
          : `${client.emotes.check} Salí del canal de voz.`
    };
  }

  const queue = getQueue(client, member);
  const currentTrack = queue.currentTrack;
  if (!currentTrack)
    throw new MusicUserError('No hay música reproduciéndose en este servidor.');

  switch (action) {
    case 'pause':
      if (queue.node.isPaused())
        return {
          content: `${client.emotes.warning} La reproducción ya estaba pausada.`
        };
      queue.node.pause();
      return { content: `${client.emotes.check} Reproducción pausada.` };

    case 'resume':
      if (!queue.node.isPaused())
        return {
          content: `${client.emotes.warning} La reproducción ya estaba activa.`
        };
      queue.node.resume();
      return { content: `${client.emotes.check} Reproducción reanudada.` };

    case 'skip': {
      queue.node.skip();
      return {
        content: `${client.emotes.check} Salté **${currentTrack.cleanTitle}**.`
      };
    }

    case 'shuffle':
      if (!queue.tracks.size)
        throw new MusicUserError('No hay canciones pendientes para mezclar.');
      queue.tracks.shuffle();
      return {
        content: `${client.emotes.check} Mezclé **${queue.tracks.size} canciones** de la cola.`
      };

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
        throw new MusicUserError(
          'El modo debe ser off, track, queue o autoplay.'
        );
      }
      queue.setRepeatMode(modes[mode]);
      return {
        content: `${client.emotes.check} Repetición: **${labels[mode]}**.`
      };
    }

    case 'volume': {
      const volume = request.volume;
      if (
        volume === undefined ||
        !Number.isInteger(volume) ||
        volume < 0 ||
        volume > 100
      ) {
        throw new MusicUserError(
          'El volumen debe ser un número entero entre 0 y 100.'
        );
      }
      queue.node.setVolume(volume);
      return {
        content: `${client.emotes.check} Volumen ajustado al **${volume}%**.`
      };
    }

    case 'nowplaying': {
      const progress =
        queue.node.createProgressBar({ length: 16 }) || currentTrack.duration;
      const embed = new EmbedBuilder()
        .setColor(client.color)
        .setAuthor({ name: 'Reproduciendo ahora' })
        .setTitle(currentTrack.cleanTitle)
        .setURL(currentTrack.url)
        .setDescription(
          `${progress}${queue.node.isPaused() ? '\n**Estado:** Pausada' : ''}`
        )
        .addFields(
          {
            name: 'Artista',
            value: currentTrack.author || 'Desconocido',
            inline: true
          },
          { name: 'Duración', value: currentTrack.duration, inline: true },
          { name: 'Volumen', value: `${queue.node.volume}%`, inline: true }
        );
      if (currentTrack.thumbnail) embed.setThumbnail(currentTrack.thumbnail);
      return { embeds: [embed] };
    }

    case 'queue': {
      const upcoming = queue.tracks.toArray();
      const shown = upcoming.slice(0, 10);
      const lines = shown.map(
        (track, index) => `${index + 1}. ${track.cleanTitle} — ${track.author}`
      );
      const remaining = upcoming.length - shown.length;
      const description = upcoming.length
        ? [...lines, remaining > 0 ? `…y ${remaining} más.` : '']
            .filter(Boolean)
            .join('\n')
        : 'No hay más canciones pendientes.';
      const embed = new EmbedBuilder()
        .setColor(client.color)
        .setTitle('Cola de reproducción')
        .setDescription(description)
        .addFields({
          name: 'Reproduciendo ahora',
          value: formatTrack(
            currentTrack.cleanTitle,
            currentTrack.author,
            currentTrack.url
          )
        })
        .setFooter({
          text: `${upcoming.length} canción${
            upcoming.length === 1 ? '' : 'es'
          } pendiente${upcoming.length === 1 ? '' : 's'}`
        });
      if (currentTrack.thumbnail) embed.setThumbnail(currentTrack.thumbnail);
      return { embeds: [embed] };
    }
  }
}
