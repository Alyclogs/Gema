import { EmbedBuilder } from 'discord.js';
import type Bot from '../../structures/Bot';

export type ErrorContext = Record<
  string,
  string | number | boolean | null | undefined
>;

const EMBED_DESCRIPTION_LIMIT = 3900;

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
}

function splitText(value: string, size: number): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += size) {
    chunks.push(value.slice(offset, offset + size));
  }
  return chunks.length ? chunks : ['Sin detalles disponibles.'];
}

export async function reportError(
  client: Bot,
  error: unknown,
  context: ErrorContext = {}
) {
  const normalized = normalizeError(error);
  console.error('[Gema error]', context, normalized);

  try {
    const channel = await client.channels.fetch(client.config.errorChannelId);
    if (
      !channel ||
      !('send' in channel) ||
      typeof channel.send !== 'function'
    ) {
      console.error(
        `[Gema error] El canal ${client.config.errorChannelId} no existe o no permite mensajes.`
      );
      return;
    }

    const contextText = Object.entries(context)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
      )
      .map(([key, value]) => `**${key}:** ${String(value).slice(0, 500)}`)
      .join('\n');
    const detail = `${normalized.name}: ${normalized.message}\n${
      normalized.stack || ''
    }`.replace(/```/g, '`\u200b``');
    const chunks = splitText(detail, EMBED_DESCRIPTION_LIMIT);

    for (const [index, chunk] of chunks.entries()) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(
          `Error de Gema${
            chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''
          }`
        )
        .setDescription(`\`\`\`text\n${chunk}\n\`\`\``)
        .setTimestamp();

      if (index === 0 && contextText) {
        embed.addFields({
          name: 'Contexto',
          value: contextText.slice(0, 1024)
        });
      }

      await channel.send({ embeds: [embed] });
    }
  } catch (reportingError) {
    console.error(
      '[Gema error] No se pudo enviar el reporte al canal de errores:',
      reportingError
    );
  }
}
