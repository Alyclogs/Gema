import { ButtonStyle } from "discord.js";
import { GButton } from "../../models/gema-models";
import emojis from '../../lib/emojis.json';

const btnCancelar = new GButton();
btnCancelar.customId = 'btnCancelar';
btnCancelar.data = {
    style: ButtonStyle.Secondary,
    label: 'Cancelar',
    emoji: emojis.error
}

btnCancelar.run = async ({ interaction, emojis }) => {
    await interaction.reply({ content: `${emojis['check']} Se ha cancelado la operación`, embeds: [], components: [] })
}

export default btnCancelar;