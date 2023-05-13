import { BaseInteraction, CommandInteraction, Guild, GuildMember } from "discord.js";

export default interface ExtendedInteraction extends BaseInteraction {
    member: GuildMember;
    guild: Guild;
}