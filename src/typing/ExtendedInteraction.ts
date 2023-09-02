import { BaseInteraction, CommandInteraction, DMChannel, Guild, GuildMember, TextChannel } from "discord.js";

export default interface ExtendedInteraction extends BaseInteraction {
    member: GuildMember;
    guild: Guild;
    channel: TextChannel | DMChannel
}