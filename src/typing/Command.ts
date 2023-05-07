import { ColorResolvable, CommandInteraction, CommandInteractionOptionResolver, Message, MessageApplicationCommandData, PermissionResolvable, SlashCommandBuilder } from "discord.js";
import Bot from "../lib/Bot";
import emojis from "../util/emojis.json"

interface SlashCommandRunOptions {
  client: Bot;
  interaction: CommandInteraction;
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
  flag: PermissionResolvable
  perm: string
}

type SlashCommandRunFunction = (options: SlashCommandRunOptions) => any;
type CommandRunFunction = (optiions: CommandRunOptions) => any;

export type SlashCommandType = {
  data: SlashCommandBuilder
  aliases?: string[]
  botperms?: CommandPerms[]
  memberperms?: CommandPerms[]
  timeout?: number
  run: SlashCommandRunFunction;
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
  run: CommandRunFunction;
}
