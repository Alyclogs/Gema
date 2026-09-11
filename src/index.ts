import Bot from './structures/Bot';
import { startServer } from './server';
require('dotenv').config()

export const bot = new Bot()
startServer(bot)
bot.start().catch((error) => {
    console.error('No se pudo iniciar Gema:', error)
    process.exitCode = 1
})
