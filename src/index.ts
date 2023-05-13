import Bot from './structures/Bot';
require('dotenv').config()

export const bot = new Bot()
bot.start()