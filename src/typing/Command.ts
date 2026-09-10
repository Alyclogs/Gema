import { ApplicationCommandDataResolvable, AutocompleteInteraction, ChatInputCommandInteraction, ColorResolvable, CommandInteractionOptionResolver, Message, MessageComponentInteraction, ModalSubmitInteraction, PermissionResolvable, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder, StringSelectMenuInteraction } from "discord.js";
import Bot from "../structures/Bot";
import emojis from "../lib/emojis.json"

export interface SlashCommandRunOptions {
  client: Bot;
  interaction: ChatInputCommandInteraction;
  args: Omit<CommandInteractionOptionResolver, 'getMessage' | 'getFocused'>;
  color: ColorResolvable
  emojis: typeof emojis;
}

interface SlashCommandAutocompleteOptions {
  client: Bot;
  interaction: AutocompleteInteraction;
  args: CommandInteractionOptionResolver;
  color: ColorResolvable
  emojis: typeof emojis;
}

export interface ComponentRunOptions {
  client: Bot
  interaction: MessageComponentInteraction
  color: ColorResolvable
  emojis: typeof emojis;
  /** Cuando el botón se resolvió por prefijo (`prefix: true`), contiene lo que sigue del customId despues del prefijo */
  params?: string
}

export interface ModalRunOptions {
  client: Bot
  interaction: ModalSubmitInteraction
  color: ColorResolvable
  emojis: typeof emojis;
  /** Cuando el modal se resolvió por prefijo (`prefix: true`), contiene lo que sigue del customId despues del prefijo */
  params?: string
}

export interface CommandRunOptions {
  client: Bot;
  message: Message;
  args: string[];
  color: ColorResolvable
  emojis: typeof emojis
  prefix: string
}

export type CommandPerms = {
  flag: PermissionResolvable | string
  perm: string
}

type SlashCommandRunFunction = (options: SlashCommandRunOptions) => any;
type CommandRunFunction = (options: CommandRunOptions) => any;
type SlashCommandAutocompleteFunction = (options: SlashCommandAutocompleteOptions) => any;

export type SlashCommandType = {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder
  aliases?: string[]
  owner?: boolean
  nsfw?: boolean
  botperms: CommandPerms[]
  memberperms: CommandPerms[]
  cooldown?: number
  run: SlashCommandRunFunction
  autocomplete?: SlashCommandAutocompleteFunction
}

export type CommandType = {
  owner?: boolean;
  nsfw?: boolean;
  name: string,
  description: string,
  aliases?: string[]
  uso?: string
  botperms?: CommandPerms[]
  memberperms?: CommandPerms[]
  cooldown?: number
  subcommands?: SubcommandType[]
  run?: CommandRunFunction;
}

type SubcommandType =
  Omit<CommandType, "botperms" | "memberperms" | "cooldown" | "subcommands" | "run">
  & { options?: Omit<CommandType, "botperms" | "memberperms" | "cooldown" | "subcommands" | "run">[] }


export interface RegisterCommandsOptions {
  guildId?: string;
  commands: ApplicationCommandDataResolvable[];
}
