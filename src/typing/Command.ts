import { ApplicationCommandDataResolvable, AutocompleteInteraction, ChatInputCommandInteraction, ColorResolvable, CommandInteraction, CommandInteractionOptionResolver, Message, MessageApplicationCommandData, PermissionResolvable, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import Bot from "../structures/Bot";
import emojis from "../botdata/emojis.json"

interface SlashCommandRunOptions {
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

interface CommandRunOptions {
  client: Bot;
  message: Message;
  args: string[];
  color: ColorResolvable
  emojis: typeof emojis;
}

export type CommandPerms = {
  flag: PermissionResolvable | string
  perm: string
}

type SlashCommandRunFunction = (options: SlashCommandRunOptions) => any;
type CommandRunFunction = (optiions: CommandRunOptions) => any;
type SlashCommandAutocompleteFunction = (options: SlashCommandAutocompleteOptions) => any;

export type SlashCommandType = {
  data: Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand"> | SlashCommandSubcommandsOnlyBuilder
  aliases?: string[]
  botperms?: CommandPerms[]
  memberperms?: CommandPerms[]
  timeout?: number
  run: SlashCommandRunFunction
  autocomplete?: SlashCommandAutocompleteFunction
}

export type CommandType = {
  owner?: boolean;
  name: string,
  description: string,
  aliases?: string[]
  uso?: string
  botperms?: CommandPerms[]
  memberperms?: CommandPerms[]
  timeout?: number
  subcomands?: SubcommandType[]
  run?: CommandRunFunction;
}

type SubcommandType =
  Omit<CommandType, "botperms" | "memberperms" | "timeout" | "subcommands" | "run">
  & { options?: Omit<CommandType, "botperms" | "memberperms" | "timeout" | "subcommands" | "run">[] }


export interface RegisterCommandsOptions {
  guildId?: string;
  commands: ApplicationCommandDataResolvable[];
}
