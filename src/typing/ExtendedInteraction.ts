import { CommandInteraction, GuildMember } from "discord.js";

export default interface ExtendedInteraction extends CommandInteraction {
    member: GuildMember;
}