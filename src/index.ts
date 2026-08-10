import Bot from './structures/Bot';
require('dotenv').config()

export const bot = new Bot()
bot.start().catch((error) => {
    console.error('No se pudo iniciar Gema:', error)
    process.exitCode = 1
})
