import { GuildTextBasedChannel, TextBasedChannel } from "discord.js";
import { StageChannel } from "discord.js";
import { TextChannel } from "discord.js";
import { BaseChannel, Guild, GuildMember, Message } from "discord.js";

export default interface ExtendedMessage extends Message {
    member: GuildMember;
    guild: Guild;
    channel: Exclude<TextBasedChannel, StageChannel> | Exclude<GuildTextBasedChannel, StageChannel>
}