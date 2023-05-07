import Bot from './lib/Bot';
require('dotenv').config()

export const bot = new Bot()
bot.start()