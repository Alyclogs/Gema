import { ColorResolvable, EmbedBuilder } from "discord.js";
import { embedModel } from "../../models/gema-models";
import { ServerConfigOptions } from "../../models/serverconfig-model";
import { VariableType } from "../../lib/Variables";
import Bot from "../../structures/Bot";

export const getEmbed = async (data?: ServerConfigOptions) => {
    if (!data || !data.welcomerSettings) return null;
    const welcomeMessage = data.welcomerSettings.message || "No se ha establecido un mensaje de bienvenida.";

    if (data.welcomerSettings.embed) {
        const { name, color } = data.welcomerSettings.embed;

        if (name) {
            const found = await embedModel.findOne({ guildId: data.guildId, name: name }).exec();
            if (found) return found.data;
            if (color) return { color: color as ColorResolvable, description: welcomeMessage };
            console.error(`[welcomer] El embed "${name}" referenciado en welcomerSettings del servidor ${data.guildId} ya no existe.`);
            return null;
        }
        if (color) {
            return { color: color as ColorResolvable, description: welcomeMessage };
        }
    }
    return null;
};

export type WelcomeContent = { content?: string; embeds?: EmbedBuilder[] };

export const buildWelcomeMessage = async (client: Bot, data: ServerConfigOptions, vars: VariableType[]): Promise<WelcomeContent | null> => {
    if (!data.welcomerSettings) return null;
    const { message: welcomeMessage, embed } = data.welcomerSettings;
    if (!welcomeMessage && !embed) return null;

    const embedData = await getEmbed(data);
    const content = welcomeMessage ? client.functions.replaceVars(welcomeMessage, vars) : undefined;
    const builtEmbed = embedData ? client.functions.replaceEmbedFields(embedData, vars) : undefined;

    if (!content && !builtEmbed) return null;
    return builtEmbed ? { content, embeds: [builtEmbed] } : { content };
};