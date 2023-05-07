import { Guild, GuildMember, Message } from "discord.js";

export default interface ExtendedMessage extends Message {
    member: GuildMember;
    guild: Guild
}